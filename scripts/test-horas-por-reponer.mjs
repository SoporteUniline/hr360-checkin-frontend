// Asistencias → «Horas por reponer» (25/11/2026): lógica pura de src/lib/asistencia/horasPorReponer.mjs.
import assert from "node:assert/strict";
import test from "node:test";
import {
  areasDe, COLUMNAS_EXCEL, cuerpoCierre, cuerpoReposicion, fechaLarga, filasExcel, filtrarFilas, minutosReposicion, movimientosFila,
  tarjetasResumen, textoDesde, textoPorQue, textoUltimo, validarCierre, validarReposicion,
} from "../src/lib/asistencia/horasPorReponer.mjs";

const carlos = { id_empleado: 15, nombre: "Carlos Terriquez", area: "Marketing", debe: 360, desde: "2026-10-21", dias: 34, viejo: true, permisos: 2,
  motivos: ["Visita al médico", "Trámite"], ultima_reposicion: { fecha: "2026-11-12", minutos: 60 } };
const alondra = { id_empleado: 16, nombre: "Alondra Munguía", area: "Ventas", debe: 420, desde: "2026-11-10", dias: 14, viejo: false, permisos: 3,
  motivos: ["Permiso personal"], ultima_reposicion: null };
const frida = { id_empleado: 17, nombre: "Frida Serrano", area: "Ventas", debe: 270, desde: "2026-11-17", dias: 30, permisos: 1, motivos: [],
  ultima_reposicion: { fecha: "2026-11-20", minutos: 30 } };

test("textos de la fila: desde con «hace N días» (rojo desde 30), por qué y lo último", () => {
  assert.deepEqual(textoDesde(carlos), { fecha: "21 oct 2026", hace: "hace 34 días", rojo: true });
  assert.deepEqual(textoDesde(alondra), { fecha: "10 nov 2026", hace: "hace 14 días", rojo: false });
  assert.equal(textoDesde(frida).rojo, true, "a partir de 30");
  assert.equal(textoDesde({ desde: "2026-11-24", dias: 0 }).hace, "hoy");
  assert.equal(textoDesde({ desde: "2026-11-23", dias: 1 }).hace, "hace 1 día");
  assert.equal(textoPorQue(carlos), "2 permisos · Visita al médico, Trámite");
  assert.equal(textoPorQue(frida), "1 permiso");
  assert.equal(textoUltimo(carlos), "Repuso 1 h · 12 nov");
  assert.equal(textoUltimo(frida), "Repuso 30 min · 20 nov");
  assert.equal(textoUltimo(alondra), "Sin reposiciones");
  assert.equal(fechaLarga(null), "—");
});

test("filtros: búsqueda sin acentos (nombre o área), área y solo más de 30 días", () => {
  const filas = [carlos, alondra, frida];
  assert.deepEqual(areasDe(filas), ["Marketing", "Ventas"]);
  assert.deepEqual(filtrarFilas(filas, { busca: "munguia" }).map((f) => f.id_empleado), [16]);
  assert.deepEqual(filtrarFilas(filas, { busca: "VENTAS" }).map((f) => f.id_empleado), [16, 17]);
  assert.deepEqual(filtrarFilas(filas, { area: "Ventas" }).map((f) => f.id_empleado), [16, 17]);
  assert.deepEqual(filtrarFilas(filas, { soloViejos: true }).map((f) => f.id_empleado), [15, 17]);
  assert.deepEqual(filtrarFilas(filas, { area: "Marketing", soloViejos: true }).map((f) => f.id_empleado), [15]);
});

test("resumen: total con personas, más de 30 días en rojo solo si hay alguien, repuesto y rebajado / condonado del mes", () => {
  const t = tarjetasResumen({ debe: 1110, personas: 4, mas_de_30: { personas: 1, minutos: 360, desde: "2026-10-21" },
    mes: { repuesto: 375, reposiciones: 5, rebajado: 120, condonado: 60, otro: 0 } });
  assert.deepEqual(t.map((x) => [x.clave, x.valor, x.detalle, x.tono]), [
    ["total", "18 h 30 min", "entre 4 personas", "normal"],
    ["viejos", "1 persona", "6 h desde el 21 oct", "rojo"],
    ["repuesto", "6 h 15 min", "en 5 reposiciones", "verde"],
    ["cerrado", "2 h · 1 h", "este mes", "normal"],
  ]);
  const vacio = tarjetasResumen(undefined);
  assert.deepEqual(vacio.map((x) => [x.valor, x.tono]), [["0 min", "normal"], ["0 personas", "normal"], ["0 min", "normal"], ["0 min · 0 min", "normal"]]);
});

test("movimientos de la fila: del más viejo al más nuevo; Cancelar en permisos con solicitud y Deshacer en cierres vigentes", () => {
  const m = movimientosFila({
    debe: 360,
    cargos: [
      { id_solicitud: 1, fecha: "2026-10-21", tipo_horas: "sale_antes", hora_inicio: "13:00", minutos: 240, estado: "calculado", motivo: "Visita al médico" },
      { id_solicitud: null, id_asistencia: 9, fecha: "2026-11-05", minutos: 180, estado: "calculado", origen: "reloj", motivo: "Trámite" },
    ],
    reposiciones: [{ id_asistencia: null, id_horas_extra: 4, fecha: "2026-11-12", minutos: 60, registrado: 60, desde: "17:00", hasta: "18:00",
      motivo: "Se quedó", origen: "registro" }],
    cierres: [{ id: 3, tipo: "condonacion", minutos: 30, creado_en: "2026-11-20 10:00:00" },
      { id: 4, tipo: "rebaja", minutos: 30, creado_en: "2026-11-21 10:00:00", borrado_en: "2026-11-21 11:00:00" }],
  });
  assert.deepEqual(m.map((x) => [x.fecha, x.texto, x.minutos, x.accion]), [
    ["2026-10-21", "Sale antes · desde 1:00 p.m. · Visita al médico", 240, "cancelar"],
    ["2026-11-05", "Permiso del reloj · Trámite", 180, null],
    ["2026-11-12", "Reposición · se quedó 5:00 p.m. a 6:00 p.m.", -60, null],
    ["2026-11-20", "Condonado", -30, "deshacer"],
    ["2026-11-21", "Rebajado", -30, null],
  ]);
  // (26/11/2026) Un «Rebajar» que ya va en una nómina por autorizar o autorizada no ofrece Deshacer; en borrador sí.
  const conNomina = (estado, bloqueado) => movimientosFila({ cierres: [{ id: 5, tipo: "rebaja", minutos: 60, creado_en: "2026-11-18 10:00:00",
    nomina: { id_periodo: 1, fecha_inicio: "2026-11-16", fecha_fin: "2026-11-22", estado, importe: 37.5, bloqueado } }] })[0];
  assert.equal(conNomina("autorizado", true).accion, null);
  assert.equal(conNomina("por_autorizar", true).accion, null);
  assert.equal(conNomina("borrador", false).accion, "deshacer");
  assert.match(conNomina("autorizado", true).nomina, /^Descontado en la nómina del 16 al 22 nov 2026/);
  const parcial = movimientosFila({ cargos: [{ id_solicitud: 1, fecha: "2026-11-05", minutos: 60 }],
    reposiciones: [{ id_horas_extra: 5, fecha: "2026-11-05", minutos: 0, registrado: 60, desde: "17:00", hasta: "18:00", origen: "registro" }] });
  assert.match(parcial.find((x) => x.clave === "h5").nota, /Registró 1 h; cuenta 0 min/);
});

test("registrar reposición: validación y cuerpo exacto del PUT de horas extra (forma «Reposición»)", () => {
  const ok = { fecha: "2026-11-12", desde: "17:00", hasta: "18:30", motivo: " Se quedó ", autoriza: "18" };
  assert.equal(validarReposicion({ ...ok, minimo: "2026-10-21", hoy: "2026-11-24" }), "");
  assert.match(validarReposicion({ ...ok, fecha: "2026-10-01", minimo: "2026-10-21" }), /Solo cuenta desde el 21 oct 2026/);
  assert.match(validarReposicion({ ...ok, fecha: "2026-11-30", hoy: "2026-11-24" }), /aún no pasa/);
  assert.match(validarReposicion({ ...ok, hasta: "16:00" }), /después/);
  assert.match(validarReposicion({ ...ok, desde: "" }), /qué hora/);
  assert.match(validarReposicion({ ...ok, motivo: " " }), /motivo/);
  assert.match(validarReposicion({ ...ok, autoriza: "" }), /autoriza/);
  assert.equal(minutosReposicion("17:00", "18:30"), 90);
  assert.deepEqual(cuerpoReposicion(ok), {
    registros: [{ fecha: "2026-11-12", desde: "2026-11-12 17:00", hasta: "2026-11-12 18:30", motivo: "Se quedó", origen: "manual_rh" }],
    quitar: [], id_autoriza: 18, forma_pago: "Reposición de tiempo por tiempo",
  });
});

test("rebajar / condonar: misma regla que el backend y cuerpo exacto", () => {
  assert.equal(validarCierre({ tipo: "rebaja", minutos: 60, debe: 360 }), "");
  assert.match(validarCierre({ tipo: "rebaja", minutos: 0, debe: 360 }), /tiempo/);
  assert.match(validarCierre({ tipo: "condonacion", minutos: 400, debe: 360 }), /No puede pasar de 6 h/);
  assert.match(validarCierre({ tipo: "otro", minutos: 30, debe: 360, nota: "" }), /motivo/);
  assert.deepEqual(cuerpoCierre({ tipo: "condonacion", minutos: 360, nota: " Buen trabajo " }), { tipo: "condonacion", minutos: 360, nota: "Buen trabajo" });
  assert.deepEqual(cuerpoCierre({ tipo: "rebaja", minutos: 60, nota: "" }), { tipo: "rebaja", minutos: 60 });
});

test("Excel: una fila por persona con lo que se ve en pantalla", () => {
  assert.deepEqual(COLUMNAS_EXCEL.map((c) => c.key), ["persona", "area", "debe", "minutos", "desde", "dias", "permisos", "motivos", "ultima"]);
  assert.deepEqual(filasExcel([carlos, alondra]), [
    { persona: "Carlos Terriquez", area: "Marketing", debe: "6:00", minutos: 360, desde: "2026-10-21", dias: 34, permisos: 2,
      motivos: "Visita al médico, Trámite", ultima: "1 h · 2026-11-12" },
    { persona: "Alondra Munguía", area: "Ventas", debe: "7:00", minutos: 420, desde: "2026-11-10", dias: 14, permisos: 3,
      motivos: "Permiso personal", ultima: "Sin reposiciones" },
  ]);
});
