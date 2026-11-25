// Monitor: tarjetas, grupos (uno por persona), la razón en texto de cada fila, contadores y momentos del día (tablero.mjs)
// y las vistas Tabla (grupos, qué pasa, entrada, jornada) y Línea del día (eje, tramos, ahora, orden y estado).
// Uso: node --test scripts/test-monitor.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { minutosAbsolutos } from "../src/lib/fechaHora.mjs";
import { diaDesdeRegistro, estadoHoy, salidaExtraDe } from "../src/lib/asistencia/hoy.mjs";
import {
  agruparMonitor,
  grupoMonitor,
  pieTarjeta,
  razonMonitor,
  resumenMonitor,
  saldraTarde,
  textoPermisoHoras,
} from "../src/lib/asistencia/monitor.mjs";
import {
  columnasTablero,
  columnaTablero,
  COLUMNAS_CELULAR,
  contadorTablero,
  enHoraExtra,
  resumenTablero,
  tardeConPermiso,
} from "../src/lib/asistencia/tablero.mjs";
import {
  claveVistaMonitor,
  ejeLineaDia,
  entradaTabla,
  estadoVista,
  GRUPOS_TABLA,
  grupoTabla,
  gruposTabla,
  horarioVista,
  jornadaTabla,
  lineaDia,
  ordenUrgencia,
  posicionEnEje,
  quePasaTabla,
  vistaValida,
  VISTAS_MONITOR,
} from "../src/lib/asistencia/vistasMonitor.mjs";

const HOY = "2026-11-23";
const a = (hora) => minutosAbsolutos(HOY, hora);
const t = (hora) => `${HOY} ${hora}:00`;
let n = 0;
// Horario 9:00–18:00 con comida 14:00–15:00 (8 h programadas), tolerancia de entrada 10 min.
const reg = (o = {}) => ({
  id: ++n,
  id_empleado: n,
  fecha: HOY,
  hora_entrada_programada: "09:00:00",
  hora_salida_programada: "18:00:00",
  hora_salida_comida_programada: "14:00:00",
  hora_regreso_comida_programada: "15:00:00",
  tolerancia_entrada_min: 10,
  tolerancia_salida_min: 0,
  tipo_registro_nombre: "Sin checar",
  entrada: null,
  salida: null,
  ...o,
});
const conTramos = (lista, abierta = null) => ({
  tramos_checadas: lista.map(([e, s]) => ({ entrada: t(e), salida: t(s) })),
  tramos_abiertos: abierta ? 1 : 0,
  entrada_tramo_abierto: abierta ? t(abierta) : null,
  entrada: t(lista[0]?.[0] ?? abierta),
  salida: lista.length ? t(lista.at(-1)[1]) : null,
});
const estado = (registro, hora) => ({ ...estadoHoy(diaDesdeRegistro(registro), a(hora)), nombre: registro.nombre });

test("grupos en orden: atención → permiso → saldrán tarde → comida → jornada → por entrar → salieron → no laboran", () => {
  const filas = [
    reg({ nombre: "Faltó" }), // 14:10 > 13:30 → faltó
    reg({ nombre: "No llega", hora_entrada_programada: "12:00:00", hora_salida_programada: "20:00:00" }),
    reg({ nombre: "Trabaja", ...conTramos([], "08:55") }),
    reg({ nombre: "Tarde", ...conTramos([], "09:30") }),
    reg({
      nombre: "Comida pasada",
      ...conTramos([["09:00", "13:00"]]),
      comida_checada: { salida: t("13:00"), regreso: null, minutos_programados: 60 },
    }),
    reg({ nombre: "Comida", ...conTramos([["09:00", "13:50"]]) }),
    reg({ nombre: "Antes", ...conTramos([["07:00", "12:00"]]), hora_salida_comida_programada: null, hora_regreso_comida_programada: null }),
    reg({ nombre: "Salió", hora_entrada_programada: "06:00:00", hora_salida_programada: "14:00:00", ...conTramos([["06:00", "14:00"]]) }),
    reg({ nombre: "Próximo", hora_entrada_programada: "16:00:00", hora_salida_programada: "23:00:00" }),
    reg({ nombre: "Descansa", tipo_registro_nombre: "Día de Descanso" }),
    reg({ nombre: "Vacaciones", tipo_registro_nombre: "Vacaciones" }),
    reg({
      nombre: "Cita",
      ...conTramos([], "08:58"),
      permisos_horas_dia: [{ tipo_horas: "sale_regresa", hora_inicio: "16:00", hora_fin: "17:00" }],
    }),
    reg({ nombre: "Inventario", ...conTramos([], "08:50"), horas_extra_autorizadas_dia: { hasta: "21:00", motivo: "inventario" } }),
  ].map((r) => estado(r, "14:10"));
  const grupos = agruparMonitor(filas, (r) => r.nombre);
  assert.deepEqual(
    grupos.map((g) => [g.clave, g.filas.map((r) => r.nombre)]),
    [
      ["atencion", ["Faltó", "No llega", "Antes", "Comida pasada", "Tarde"]],
      ["permiso", ["Vacaciones", "Cita"]],
      ["saldran_tarde", ["Inventario"]],
      ["comida", ["Comida"]],
      ["jornada", ["Trabaja"]],
      ["proximos", ["Próximo"]],
      ["salieron", ["Salió"]],
      ["no_laboran", ["Descansa"]],
    ]
  );
  assert.equal(grupos.find((g) => g.clave === "no_laboran").plegado, true);
  assert.equal(grupos.find((g) => g.clave === "jornada").limite, 8);

  const s = resumenMonitor(filas);
  assert.deepEqual(s.cuenta, { jornada: 6, tarde: 1, no_han_llegado: 2, permiso: 2, en_comida: 2, saldran_tarde: 1, por_entrar: 1 });
  assert.deepEqual(
    [s.programadosHoy, s.promedioTarde, s.faltaron, s.permisoHoras, s.permisoDia, s.comidaExcedida, s.minutosExtra],
    [11, 30, 1, 1, 1, 1, 180]
  );
  assert.equal(pieTarjeta("jornada", s), "de 11 programados");
  assert.equal(pieTarjeta("tarde", s), "promedio +30 min");
  assert.equal(pieTarjeta("no_han_llegado", s), "1 ya a media jornada");
  assert.equal(pieTarjeta("permiso", s), "1 por horas · 1 todo el día");
  assert.equal(pieTarjeta("en_comida", s), "1 excedida");
  assert.equal(pieTarjeta("saldran_tarde", s), "3 h extra autorizadas");
  assert.equal(pieTarjeta("por_entrar", s), "la próxima a las 4:00 p.m.");
});

test("razón de cada fila en texto", () => {
  const texto = (r, hora) => razonMonitor(estado(r, hora)).texto;
  assert.equal(texto(reg(conTramos([], "09:18")), "10:42"), "Llegó 18 min tarde");
  assert.equal(razonMonitor(estado(reg(conTramos([], "09:18")), "10:42")).tono, "naranja");
  assert.equal(texto(reg(), "10:42"), "No ha llegado · debía entrar hace 1 h 42 min");
  assert.equal(texto(reg(), "14:00"), "Faltó · sin checadas a media jornada");
  const comida = { ...conTramos([["09:00", "13:00"]]), comida_checada: { salida: t("13:00"), regreso: null, minutos_programados: 30 } };
  assert.equal(texto(reg(comida), "13:52"), "En comida 52 de 30 min");
  assert.equal(texto(reg(comida), "13:20"), "En comida 20 de 30 min");
  assert.equal(texto(reg(conTramos([["09:00", "16:10"]])), "16:30"), "Salió antes · 4:10 p.m. · faltaron 1 h 50 min");
  assert.equal(texto(reg(conTramos([], "08:55")), "10:42"), "A tiempo");
  assert.equal(texto(reg(conTramos([["08:58", "18:02"]])), "18:30"), "Salió 6:02 p.m.");
  assert.equal(
    texto(reg({ hora_entrada_programada: "12:00:00", hora_salida_programada: "20:00:00" }), "10:42"),
    "Entra 12:00 p.m. · en 1 h 18 min"
  );
  assert.equal(texto(reg({ tipo_registro_nombre: "Vacaciones" }), "10:42"), "Vacaciones");
  assert.equal(texto(reg({ tipo_registro_nombre: "Día de Descanso" }), "10:42"), "Día de Descanso");
});

test("permisos por horas: texto con motivo; cuenta en «Con permiso» aunque ya haya salido con él", () => {
  const p = (tipo_horas, hora_inicio, hora_fin, motivo) => ({ tipo_horas, hora_inicio, hora_fin, motivo });
  const cita = reg({
    ...conTramos([["07:58", "10:00"]]),
    hora_entrada_programada: "08:00:00",
    hora_salida_programada: "17:00:00",
    permisos_horas_dia: [p("sale_regresa", "10:00", "12:00", "cita médica")],
  });
  const e = estado(cita, "10:42");
  assert.equal(grupoMonitor(e), "permiso");
  assert.equal(razonMonitor(e).texto, "Permiso 10:00 a.m.–12:00 p.m. · cita médica · salió 10:00 a.m.");
  assert.equal(textoPermisoHoras({ tipo: "llega_tarde", fin: "11:00" }), "Permiso para llegar a las 11:00 a.m.");
  assert.equal(
    textoPermisoHoras({ tipo: "sale_antes", inicio: "16:00", motivo: "trámite" }),
    "Permiso para salir a las 4:00 p.m. · trámite"
  );
  // Sin motivo (el backend aún no lo manda) el texto queda sin «· …».
  const sinMotivo = estado(reg({ ...conTramos([], "08:55"), permisos_horas_dia: [p("sale_antes", "16:00", null)] }), "10:42");
  assert.equal(razonMonitor(sinMotivo).texto, "Permiso para salir a las 4:00 p.m.");
  // Lo urgente gana: con permiso para salir a las 16:00 pero se fue a las 12:00 sin cubrirlo.
  const antes = estado(reg({ ...conTramos([["09:00", "12:00"]]), permisos_horas_dia: [p("sale_antes", "16:00", null)] }), "13:30");
  assert.equal(grupoMonitor(antes), "atencion");
});

test("saldrán tarde: horas extra autorizadas antes de que ocurran", () => {
  const extra = { hasta: "20:00", minutos: 120, motivo: "inventario" };
  const e = estado(reg({ ...conTramos([], "08:51"), horas_extra_autorizadas_dia: extra }), "10:42");
  assert.ok(saldraTarde(e));
  assert.equal(razonMonitor(e).texto, "Saldrá 8:00 p.m. · 2 h extra · inventario");
  // Sin minutos: los calcula contra su salida (18:00 → 21:00).
  const sinMinutos = estado(reg({ ...conTramos([], "08:51"), horas_extra_autorizadas_dia: { hasta: "21:00" } }), "10:42");
  assert.equal(razonMonitor(sinMinutos).texto, "Saldrá 9:00 p.m. · 3 h extra");
  // El aviso «debía salir» cuenta desde la hora autorizada.
  assert.equal(estado(reg({ ...conTramos([], "08:51"), horas_extra_autorizadas_dia: extra }), "19:00").debiaSalirHace, null);
  assert.equal(estado(reg({ ...conTramos([], "08:51"), horas_extra_autorizadas_dia: extra }), "20:30").debiaSalirHace, 30);
  // Ya salió: no «saldrá tarde».
  const salio = estado(reg({ ...conTramos([["08:51", "20:01"]]), horas_extra_autorizadas_dia: extra }), "20:30");
  assert.equal(saldraTarde(salio), false);
  assert.equal(grupoMonitor(salio), "salieron");
  // Turno nocturno: la hora autorizada de madrugada es del día siguiente.
  const noche = estado(
    reg({
      hora_entrada_programada: "22:00:00",
      hora_salida_programada: "06:00:00",
      hora_salida_comida_programada: null,
      hora_regreso_comida_programada: null,
      ...conTramos([], "21:58"),
      horas_extra_autorizadas_dia: { hasta: "08:00" },
    }),
    "23:00"
  );
  assert.equal(razonMonitor(noche).texto, "Saldrá 8:00 a.m. · 2 h extra");
  // Campo ausente o ilegible: sin «Saldrán tarde».
  assert.equal(salidaExtraDe(undefined), null);
  assert.equal(salidaExtraDe({ hasta: "tarde" }), null);
  assert.deepEqual(salidaExtraDe({ hasta: "20:00:00", minutos: "90", motivo: "  " }), { hasta: "20:00", minutos: 90, motivo: null });
});

test("enlaces viejos a «Hoy / En vivo» llevan al Monitor", async () => {
  const { esVistaEnVivo, RUTA_MONITOR } = await import("../src/lib/asistencia/vistasAsistencia.mjs");
  assert.equal(RUTA_MONITOR, "/panel/monitor");
  for (const v of ["envivo", "EnVivo", "en-vivo", "hoy", " hoy "]) assert.equal(esVistaEnVivo(v), true, v);
  for (const v of [null, "", "registros", "horas", "matriz"]) assert.equal(esVistaEnVivo(v), false, String(v));
});

// ——— Tablero (Monitor.dc.html, vista «Tablero») ———
const conAhora = (registro, hora) => ({ ...estado(registro, hora), ahora: a(hora) });
const sinComida = { hora_salida_comida_programada: null, hora_regreso_comida_programada: null };

test("tablero: seis columnas, una por persona; celular en orden de lo urgente", () => {
  const filas = [
    reg({ nombre: "Faltó" }),
    reg({ nombre: "No llega", hora_entrada_programada: "12:00:00", hora_salida_programada: "20:00:00" }),
    reg({ nombre: "Trabaja", ...conTramos([], "08:55") }),
    reg({ nombre: "Comida", ...conTramos([["09:00", "13:50"]]) }),
    reg({ nombre: "Antes", ...conTramos([["07:00", "12:00"]]), ...sinComida }),
    reg({ nombre: "Salió", hora_entrada_programada: "06:00:00", hora_salida_programada: "14:00:00", ...conTramos([["06:00", "14:00"]]) }),
    reg({ nombre: "Próximo", hora_entrada_programada: "16:00:00", hora_salida_programada: "23:00:00" }),
    reg({ nombre: "Descansa", tipo_registro_nombre: "Día de Descanso" }),
    reg({ nombre: "Vacaciones", tipo_registro_nombre: "Vacaciones" }),
  ].map((r) => conAhora(r, "14:10"));
  const cols = columnasTablero(filas, (r) => r.nombre);
  assert.deepEqual(
    cols.map((c) => [c.clave, c.personas.map((r) => r.nombre)]),
    [
      ["por_entrar", ["Próximo"]],
      ["trabajando", ["Trabaja"]],
      ["comida", ["Comida"]],
      ["salio", ["Salió", "Antes"]],
      ["no_ha_llegado", ["Faltó", "No llega"]],
      ["no_laboran", ["Descansa", "Vacaciones"]],
    ]
  );
  assert.deepEqual(
    COLUMNAS_CELULAR.map((c) => c.titulo),
    ["No han llegado", "En comida", "Trabajando", "Por entrar", "Ya salieron", "Descanso / permiso de día"]
  );
  assert.equal(columnaTablero({ estado: "sin_horario" }), "no_laboran");
});

test("tablero: contadores (filtros), pies y alertas en rojo", () => {
  const filas = [
    reg({ nombre: "No llega" }),
    reg({ nombre: "Tarde", ...conTramos([], "09:30") }),
    reg({
      nombre: "Extra",
      hora_entrada_programada: "06:00:00",
      hora_salida_programada: "13:10:00",
      ...sinComida,
      ...conTramos([], "05:55"),
    }),
    reg({
      nombre: "Pasado",
      ...conTramos([["09:00", "12:00"]]),
      comida_checada: { salida: t("12:00"), regreso: null, minutos_programados: 30 },
    }),
    reg({
      nombre: "Comiendo",
      ...conTramos([["09:00", "13:00"]]),
      comida_checada: { salida: t("13:00"), regreso: null, minutos_programados: 60 },
    }),
    reg({ nombre: "Antes", ...conTramos([["07:00", "12:00"]]), ...sinComida }),
    reg({
      nombre: "Con permiso",
      ...conTramos([["08:58", "12:30"]]),
      ...sinComida,
      permisos_horas_dia: [{ tipo_horas: "sale_antes", hora_inicio: "12:30", hora_fin: "18:00" }],
    }),
    reg({
      nombre: "Llega 11",
      ...conTramos([], "10:50"),
      permisos_horas_dia: [{ tipo_horas: "llega_tarde", hora_inicio: "09:00", hora_fin: "11:00" }],
    }),
    reg({ nombre: "Próximo", hora_entrada_programada: "15:00:00", hora_salida_programada: "22:00:00" }),
    reg({ nombre: "Después", hora_entrada_programada: "16:00:00", hora_salida_programada: "23:00:00" }),
    reg({ nombre: "Vacaciones", tipo_registro_nombre: "Vacaciones" }),
  ].map((r) => conAhora(r, "13:20"));
  const s = resumenTablero(filas);
  const visto = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, `${v.n} · ${v.pie}${v.alerta ? " · rojo" : ""}`]));
  assert.deepEqual(visto, {
    trabajando: "3 · 1 en hora extra",
    comida: "2 · 1 ya se pasó · rojo",
    salio: "2 · 2 salió antes",
    por_entrar: "2 · el próximo a las 3:00 p.m.",
    no_ha_llegado: "1 · ya pasó su hora · rojo",
    tarde: "2 · 1 con permiso",
    permiso: "3 · 2 por horas · 1 de día",
  });
  assert.ok(tardeConPermiso(filas[7]), "llegó 10:50 con permiso hasta 11:00: tarde con permiso, no retardo");
  assert.deepEqual(
    filas.filter(contadorTablero("tarde").es).map((r) => r.nombre),
    ["Tarde", "Llega 11"]
  );
  // Sin nadie: textos de calma y sin rojo.
  const vacio = resumenTablero([]);
  assert.deepEqual(
    [vacio.comida.pie, vacio.por_entrar.pie, vacio.no_ha_llegado.pie, vacio.no_ha_llegado.alerta],
    ["nadie se ha pasado", "nadie más hoy", "todos llegaron", false]
  );
  // Todos en su tolerancia: «ya es su hora».
  assert.equal(resumenTablero([conAhora(reg(), "09:05")]).por_entrar.pie, "ya es su hora");
});

// —— Tabla y Línea del día (vistasMonitor.mjs) ——
const ahoraA = (r, hora) => ({ ...estado(r, hora), ahora: a(hora), dia: { ...diaDesdeRegistro(r), registro: r } });

test("vista elegida: por defecto la Tabla, solo valores conocidos, las retiradas abren la Tabla, una clave por usuario", () => {
  assert.deepEqual(
    VISTAS_MONITOR.map((v) => v.titulo),
    ["Tabla", "Línea del día"]
  );
  assert.equal(vistaValida(null), "tabla");
  assert.equal(vistaValida("tabla"), "tabla");
  assert.equal(vistaValida("linea"), "linea");
  // Guardadas antes de retirar el Tablero (kanban) y la Lista: abren la Tabla sin error.
  assert.equal(vistaValida("tablero"), "tabla");
  assert.equal(vistaValida("lista"), "tabla");
  assert.equal(vistaValida("<script>"), "tabla");
  assert.equal(claveVistaMonitor(7), "adamia.monitor.vista.7");
  assert.notEqual(claveVistaMonitor(7), claveVistaMonitor(8));
});

test("orden de urgencia (Línea del día y base de la Tabla)", () => {
  const filas = [
    ahoraA(
      reg({ nombre: "Sale", ...conTramos([["07:00", "10:00"]]), hora_entrada_programada: "07:00:00", hora_salida_programada: "10:00:00" }),
      "10:42"
    ),
    ahoraA(reg({ nombre: "Trabaja", ...conTramos([], "08:55") }), "10:42"),
    ahoraA(reg({ nombre: "Descansa", tipo_registro_nombre: "Día de Descanso" }), "10:42"),
    ahoraA(reg({ nombre: "Llega", hora_entrada_programada: "12:00:00", hora_salida_programada: "20:00:00" }), "10:42"),
    ahoraA(reg({ nombre: "Falta" }), "10:42"),
    ahoraA(
      reg({
        nombre: "Come",
        ...conTramos([["08:00", "10:30"]]),
        comida_checada: { salida: t("10:30"), regreso: null, minutos_programados: 30 },
      }),
      "10:42"
    ),
  ];
  assert.deepEqual(
    ordenUrgencia(filas, (r) => r.nombre).map((r) => r.nombre),
    ["Falta", "Come", "Trabaja", "Llega", "Sale", "Descansa"]
  );
});

test("chip de estado de la Línea y horario de la Tabla", () => {
  const e = (r, h) => estadoVista(ahoraA(reg(r), h));
  assert.deepEqual(e(conTramos([], "08:55"), "10:42"), { texto: "Trabajando", tono: "azul" });
  assert.deepEqual(e(conTramos([], "08:55"), "18:10"), { texto: "Hora extra", tono: "violeta" });
  assert.deepEqual(e(conTramos([], "08:55"), "18:30"), { texto: "Sin checar salida", tono: "rojo" });
  assert.deepEqual(e({}, "10:42"), { texto: "No ha llegado", tono: "rojo" });
  assert.deepEqual(e({}, "14:00"), { texto: "Faltó", tono: "rojo" });
  assert.deepEqual(e(conTramos([["09:00", "12:00"]]), "12:30"), { texto: "Salió antes", tono: "rojo" });
  assert.deepEqual(e({ tipo_registro_nombre: "Vacaciones" }, "10:42"), { texto: "Vacaciones", tono: "violeta" });
  assert.equal(horarioVista(ahoraA(reg(), "10:42")), "9:00 a.m.–6:00 p.m.");
  assert.equal(horarioVista(ahoraA(reg({ tipo_registro_nombre: "Vacaciones" }), "10:42")), "Sin horario hoy");
});

test("tabla: seis grupos del más urgente al menos, una vez cada persona", () => {
  const filas = [
    reg({ nombre: "Faltó" }), // 14:10 > 13:30 → faltó
    reg({ nombre: "No llega", hora_entrada_programada: "12:00:00", hora_salida_programada: "20:00:00" }),
    reg({ nombre: "Trabaja", ...conTramos([], "08:55") }),
    reg({ nombre: "Tarde", ...conTramos([], "09:30") }),
    reg({
      nombre: "Comida pasada",
      ...conTramos([["09:00", "13:00"]]),
      comida_checada: { salida: t("13:00"), regreso: null, minutos_programados: 60 },
    }),
    reg({ nombre: "Comida", ...conTramos([["09:00", "13:50"]]) }),
    reg({ nombre: "Antes", ...conTramos([["07:00", "12:00"]]), ...sinComida }),
    reg({ nombre: "Salió", hora_entrada_programada: "06:00:00", hora_salida_programada: "14:00:00", ...conTramos([["06:00", "14:00"]]) }),
    reg({ nombre: "Próximo", hora_entrada_programada: "16:00:00", hora_salida_programada: "23:00:00" }),
    reg({ nombre: "Descansa", tipo_registro_nombre: "Día de Descanso" }),
    reg({ nombre: "Vacaciones", tipo_registro_nombre: "Vacaciones" }),
    reg({
      nombre: "Cita",
      ...conTramos([], "08:58"),
      permisos_horas_dia: [{ tipo_horas: "sale_regresa", hora_inicio: "16:00", hora_fin: "17:00" }],
    }),
    reg({ nombre: "Inventario", ...conTramos([], "08:50"), horas_extra_autorizadas_dia: { hasta: "21:00", motivo: "inventario" } }),
    // Hora extra sin autorizar (salió 14:00 programado, sigue a las 14:10).
    reg({ nombre: "Extra", hora_entrada_programada: "06:00:00", hora_salida_programada: "14:00:00", ...sinComida, ...conTramos([], "05:58") }),
    // Pasó el aviso de 15 min sin checar salida: atención, no hora extra.
    reg({ nombre: "Sin salida", hora_entrada_programada: "05:00:00", hora_salida_programada: "13:00:00", ...sinComida, ...conTramos([], "04:59") }),
  ].map((r) => conAhora(r, "14:10"));
  const grupos = gruposTabla(filas, (r) => r.nombre);
  assert.deepEqual(
    grupos.map((g) => [g.titulo, g.filas.map((r) => r.nombre)]),
    [
      ["Requiere atención", ["Faltó", "No llega", "Antes", "Comida pasada", "Sin salida", "Tarde"]],
      ["Con permiso / descanso", ["Cita", "Descansa", "Vacaciones"]],
      ["Saldrán tarde / hora extra", ["Extra", "Inventario"]],
      ["En jornada", ["Comida", "Trabaja"]],
      ["Por entrar", ["Próximo"]],
      ["Ya salieron", ["Salió"]],
    ]
  );
  // Cada persona en un solo grupo; los títulos en el orden fijo.
  assert.equal(grupos.flatMap((g) => g.filas).length, filas.length);
  assert.deepEqual(
    GRUPOS_TABLA.map((g) => g.clave),
    ["atencion", "permiso", "saldran_tarde", "jornada", "proximos", "salieron"]
  );
  // Grupos vacíos no se muestran; sin nadie, ninguno.
  assert.deepEqual(
    gruposTabla(filas.filter((r) => r.nombre === "Próximo")).map((g) => g.clave),
    ["proximos"]
  );
  assert.deepEqual(gruposTabla([]), []);
  assert.equal(grupoTabla(filas.find((r) => r.nombre === "Extra")), "saldran_tarde");
  assert.ok(enHoraExtra(conAhora(reg(conTramos([], "09:00")), "18:10")));
});

test("tabla: «Qué pasa» es una frase y, a lo más, un chip que aporte", () => {
  const q = (r, hora, debe) => {
    const x = quePasaTabla(conAhora(r, hora), { debe });
    return [x.texto, x.tono, x.extra ? `${x.extra.texto} (${x.extra.tono})` : null];
  };
  assert.deepEqual(q(reg(conTramos([], "09:18")), "11:12"), ["Llegó 18 min tarde", "naranja", null]);
  assert.deepEqual(q(reg(), "10:42", 90), ["No ha llegado · debía entrar hace 1 h 42 min", "naranja", "Debe 1 h 30 min (ambar)"]);
  assert.deepEqual(q(reg(), "14:00"), ["Faltó · sin checadas a media jornada", "rojo", null]);
  const comida = { ...conTramos([["09:00", "13:00"]]), comida_checada: { salida: t("13:00"), regreso: null, minutos_programados: 30 } };
  assert.deepEqual(q(reg(comida), "13:52"), ["En comida 52 de 30 min", "rojo", null]);
  assert.deepEqual(q(reg(comida), "13:20"), ["En comida 20 de 30 min", "amarillo", null]);
  assert.deepEqual(q(reg(conTramos([], "08:55")), "10:42"), ["A tiempo", "verde", null]);
  // Sin checar salida (el criterio del Tablero): rojo, no «hora extra» ni «a tiempo».
  assert.deepEqual(q(reg(conTramos([], "09:00")), "18:30"), ["Sin checar salida · debía salir hace 30 min", "rojo", null]);
  assert.deepEqual(q(reg(conTramos([], "09:00")), "18:10"), ["En hora extra desde 6:00 p.m.", "violeta", null]);
  assert.deepEqual(q(reg({ ...conTramos([], "08:51"), horas_extra_autorizadas_dia: { hasta: "20:00", minutos: 120, motivo: "inventario" } }), "10:42"), [
    "Saldrá 8:00 p.m. · 2 h extra · inventario",
    "azul",
    null,
  ]);
  // Permiso: violeta, con su motivo; si además llegó tarde, el retardo va como chip.
  assert.deepEqual(
    q(
      reg({
        ...conTramos([["07:58", "10:00"]]),
        permisos_horas_dia: [{ tipo_horas: "sale_regresa", hora_inicio: "10:00", hora_fin: "12:00", motivo: "cita médica" }],
      }),
      "10:42"
    ),
    ["Permiso 10:00 a.m.–12:00 p.m. · cita médica · salió 10:00 a.m.", "violeta", null]
  );
  assert.deepEqual(
    q(
      reg({
        ...conTramos([["09:25", "16:00"]]),
        ...sinComida,
        permisos_horas_dia: [{ tipo_horas: "sale_antes", hora_inicio: "16:00", hora_fin: "18:00" }],
      }),
      "16:30"
    ),
    ["Permiso para salir a las 4:00 p.m. · salió 4:00 p.m.", "violeta", "Llegó tarde +25 min (naranja)"]
  );
  // Un permiso por horas fuera del grupo de permisos (lo urgente gana) va como chip.
  assert.deepEqual(
    q(reg({ ...conTramos([["09:00", "12:00"]]), ...sinComida, permisos_horas_dia: [{ tipo_horas: "sale_antes", hora_inicio: "16:00" }] }), "13:30"),
    ["Salió antes · 12:00 p.m. · faltaron 6 h", "rosa", "Permiso para salir a las 4:00 p.m. (violeta)"]
  );
  // Solo un chip: el retardo gana a «Debe».
  assert.deepEqual(q(reg(conTramos([["09:30", "18:05"]])), "18:30", 60), ["Salió 6:05 p.m.", "gris", "Llegó tarde +30 min (naranja)"]);
  assert.deepEqual(q(reg({ tipo_registro_nombre: "Vacaciones" }), "10:42"), ["Vacaciones", "violeta", null]);
  assert.deepEqual(q(reg({ tipo_registro_nombre: "Día de Descanso" }), "10:42"), ["Día de Descanso", "violeta", null]);
  assert.deepEqual(q(reg({ hora_entrada_programada: "12:00:00", hora_salida_programada: "20:00:00" }), "10:42"), [
    "Entra 12:00 p.m. · en 1 h 18 min",
    "neutro",
    null,
  ]);
});

test("tabla: entrada (y salida si ya salió) y jornada", () => {
  const e = (r, hora) => entradaTabla(conAhora(r, hora));
  assert.deepEqual(e(reg(conTramos([], "09:18")), "11:12"), { entrada: "9:18 a.m.", salida: null, tarde: true });
  assert.deepEqual(e(reg(conTramos([], "08:55")), "11:12"), { entrada: "8:55 a.m.", salida: null, tarde: false });
  assert.deepEqual(e(reg(conTramos([["07:55", "18:10"]])), "18:30"), { entrada: "7:55 a.m.", salida: "6:10 p.m.", tarde: false });
  assert.equal(e(reg(), "10:42"), null);
  const comida = { ...conTramos([["09:00", "13:00"]]), comida_checada: { salida: t("13:00"), regreso: null, minutos_programados: 30 } };
  assert.deepEqual(e(reg(comida), "13:20"), { entrada: "9:00 a.m.", salida: null, tarde: false }, "en comida: solo la entrada");

  const j = (r, hora) => jornadaTabla(conAhora(r, hora));
  assert.deepEqual(j(reg(conTramos([], "09:00")), "13:00"), { texto: "4 h de 8 h", avance: 0.5, tono: "azul" });
  assert.equal(j(reg(conTramos([], "09:00")), "18:10").tono, "violeta");
  // Ya salió: sin la diferencia (la frase dice si salió antes).
  assert.deepEqual(j(reg(conTramos([["09:00", "16:10"]])), "16:30").texto, "7 h 10 de 8 h");
  assert.equal(j(reg(conTramos([["09:00", "16:10"]])), "16:30").tono, "gris");
  assert.equal(j(reg(), "10:42"), null);
  assert.equal(j(reg({ tipo_registro_nombre: "Vacaciones" }), "10:42"), null);
});

test("eje: de la entrada más temprana a la salida más tardía o ahora, con margen y a la hora", () => {
  const filas = [ahoraA(reg(), "10:42"), ahoraA(reg({ hora_entrada_programada: "07:00:00", hora_salida_programada: "15:00:00" }), "10:42")];
  const eje = ejeLineaDia(filas, a("10:42"));
  assert.deepEqual([eje.desde, eje.hasta, eje.paso], [a("06:00"), a("19:00"), 120]);
  assert.deepEqual(
    eje.horas.map((h) => h.texto),
    ["6 a.m.", "8 a.m.", "10 a.m.", "12 p.m.", "2 p.m.", "4 p.m.", "6 p.m."]
  );
  assert.deepEqual([eje.horas[0].pos, posicionEnEje(a("12:30"), eje), posicionEnEje(a("23:00"), eje)], [0, 50, 100]);
  // Ahora después de todas las salidas: el eje llega hasta ahora (+ margen). Una entrada real antes de su horario cuenta.
  const tarde = ejeLineaDia([ahoraA(reg(conTramos([["08:20", "18:00"]])), "21:10")], a("21:10"));
  assert.deepEqual([tarde.desde, tarde.hasta], [a("07:00"), a("22:00")]);
  // Día corto: 1 h entre marcas; sin nadie con horario, al menos 4 h alrededor de ahora.
  assert.equal(ejeLineaDia([ahoraA(reg({ hora_salida_programada: "14:00:00" }), "10:00")], a("10:00")).paso, 60);
  const vacio = ejeLineaDia([ahoraA(reg({ tipo_registro_nombre: "Vacaciones" }), "10:00")], a("10:00"));
  assert.equal(vacio.hasta - vacio.desde, 240);
  assert.equal(ejeLineaDia([], null), null);
  // Turno nocturno de ayer (22:00–06:00, sigue abierto): el eje empieza ayer a las 9 p.m. y marca cada 3 h si pasa de 24 h.
  const AYER = "2026-11-22";
  const noche = reg({
    fecha: AYER,
    hora_entrada_programada: "22:00:00",
    hora_salida_programada: "06:00:00",
    tramos_checadas: [],
    tramos_abiertos: 1,
    entrada_tramo_abierto: `${AYER} 22:05:00`,
    entrada: `${AYER} 22:05:00`,
  });
  const ejeNoche = ejeLineaDia(
    [ahoraA(noche, "03:00"), ahoraA(reg({ hora_entrada_programada: "14:00:00", hora_salida_programada: "23:00:00" }), "03:00")],
    a("03:00")
  );
  assert.deepEqual([ejeNoche.desde, ejeNoche.hasta, ejeNoche.paso], [minutosAbsolutos(AYER, "21:00"), a("23:59") + 1, 3 * 60]);
  assert.equal(ejeNoche.horas[0].texto, "9 p.m.");
});

test("línea del día: programado tenue, tramos reales (trabajo, comida, se pasó, hora extra, sin salida) y ahora", () => {
  const eje = { desde: a("06:00"), hasta: a("22:00") }; // 16 h: 1 h = 6.25 %
  const tramos = (r, h) => lineaDia(ahoraA(reg(r), h), eje).tramos.map((x) => [x.tipo, x.tono, x.titulo]);
  // Trabajando desde 9:18: azul hasta ahora; el horario 9–18 detrás; ahora a las 10:42.
  const l = lineaDia(ahoraA(reg(conTramos([], "09:18")), "10:42"), eje);
  assert.deepEqual([l.programada.izq, l.programada.ancho, l.ahora], [18.75, 56.25, 29.38]);
  assert.deepEqual(
    l.tramos.map((x) => [x.tipo, x.tono, x.izq, x.titulo]),
    [["trabajo", "azul", 20.63, "Trabajando 9:18 a.m.–ahora · 1 h 24 min"]]
  );
  // Comida tomada (botón): ámbar entre los tramos; si duró más de lo que le toca, lo de más en rojo.
  const comida = {
    ...conTramos([["09:00", "14:00"]], "14:50"),
    comida_checada: { salida: t("14:00"), regreso: t("14:50"), minutos: 50, minutos_programados: 30 },
  };
  assert.deepEqual(tramos(comida, "16:00"), [
    ["trabajo", "azul", "Trabajó 9:00 a.m.–2:00 p.m. · 5 h"],
    ["comida", "ambar", "Comida 2:00 p.m.–2:30 p.m. · 30 min"],
    ["comida_excedida", "rojo", "Se pasó de comida 2:30 p.m.–2:50 p.m. · 20 min"],
    ["trabajo", "azul", "Trabajando 2:50 p.m.–ahora · 1 h 10 min"],
  ]);
  // Salida dentro de la comida del horario (sin botón) también es comida; en comida ahora: hasta ahora.
  assert.deepEqual(
    tramos(conTramos([["09:00", "13:50"]]), "14:10").map(([tipo]) => tipo),
    ["trabajo", "comida"]
  );
  assert.equal(tramos(conTramos([["09:00", "13:50"]]), "14:10")[1][2], "Comida 1:50 p.m.–ahora · 20 min");
  // Un hueco que no es comida (sale y regresa) no se pinta.
  assert.deepEqual(
    tramos(
      conTramos([
        ["09:00", "10:00"],
        ["11:00", "12:00"],
      ]),
      "12:30"
    ).map(([tipo]) => tipo),
    ["trabajo", "trabajo"]
  );
  // Hora extra después de su salida (violeta); si ya pasó el aviso sin checar, lo de después es «sin salida».
  assert.deepEqual(
    tramos(conTramos([], "08:55"), "18:10").map(([tipo, tono]) => [tipo, tono]),
    [
      ["trabajo", "azul"],
      ["extra", "violeta"],
    ]
  );
  assert.deepEqual(
    tramos(conTramos([], "08:55"), "18:30").map(([tipo, tono]) => [tipo, tono]),
    [
      ["trabajo", "azul"],
      ["sin_salida", "rojo"],
    ]
  );
  // Con extra autorizada hasta las 20:00: extra hasta ahí, tenue de 18 a 20 detrás, y «sin salida» después del aviso.
  const autorizada = { ...conTramos([], "08:55"), horas_extra_autorizadas_dia: { hasta: "20:00" } };
  assert.deepEqual(
    tramos(autorizada, "20:30").map(([tipo]) => tipo),
    ["trabajo", "extra", "sin_salida"]
  );
  assert.deepEqual(lineaDia(ahoraA(reg(autorizada), "19:00"), eje).extraAutorizada, {
    desde: a("18:00"),
    hasta: a("20:00"),
    izq: 75,
    ancho: 12.5,
  });
  // Ya salió: su trabajo en gris; salió tarde: lo de después de las 18:00 en violeta.
  assert.deepEqual(
    tramos(conTramos([["08:58", "18:40"]]), "19:00").map(([tipo, tono]) => [tipo, tono]),
    [
      ["trabajo", "gris"],
      ["extra", "violeta"],
    ]
  );
  // Vacaciones / sin checadas: sin barra programada ni tramos.
  const vac = lineaDia(ahoraA(reg({ tipo_registro_nombre: "Vacaciones" }), "10:42"), eje);
  assert.deepEqual([vac.programada, vac.tramos.length], [null, 0]);
  assert.deepEqual(tramos({}, "10:42"), []);
  // Fuera del eje se recorta a los bordes.
  assert.deepEqual([posicionEnEje(a("05:00"), eje), posicionEnEje(a("23:00"), eje), posicionEnEje(null, eje)], [0, 100, null]);
});

test("línea del día: turno nocturno (de ayer a hoy, comida de madrugada)", () => {
  const AYER = "2026-11-22";
  const ta = (f, h) => `${f} ${h}:00`;
  const noche = reg({
    fecha: AYER,
    hora_entrada_programada: "22:00:00",
    hora_salida_programada: "06:00:00",
    hora_salida_comida_programada: "02:00:00",
    hora_regreso_comida_programada: "02:30:00",
    tramos_checadas: [{ entrada: ta(AYER, "21:58"), salida: ta(HOY, "02:01") }],
    tramos_abiertos: 1,
    entrada_tramo_abierto: ta(HOY, "02:29"),
    entrada: ta(AYER, "21:58"),
  });
  const r = ahoraA(noche, "05:00");
  const eje = ejeLineaDia([r], a("05:00"));
  assert.deepEqual([eje.desde, eje.hasta], [minutosAbsolutos(AYER, "21:00"), a("07:00")]);
  const l = lineaDia(r, eje);
  assert.deepEqual([l.programada.desde, l.programada.hasta], [minutosAbsolutos(AYER, "22:00"), a("06:00")]);
  assert.deepEqual(
    l.tramos.map((x) => [x.tipo, x.titulo]),
    [
      ["trabajo", "Trabajó 9:58 p.m.–2:01 a.m. · 4 h 3 min"],
      ["comida", "Comida 2:01 a.m.–2:29 a.m. · 28 min"],
      ["trabajo", "Trabajando 2:29 a.m.–ahora · 2 h 31 min"],
    ]
  );
});
