import assert from "node:assert/strict";
import test from "node:test";
import {
  cuerpoGuardar, diasDeLaSemana, etiquetaDia, filaDesdePropuesta, filaNueva, filasDesdeServidor, hayCambiosFilas, minutosFila,
  repetirEnDias, resumenSemana, validarFilas,
} from "../src/lib/asistencia/horasExtraDia.mjs";
import { estadoHorasExtra } from "../src/lib/asistencia/horasExtra.mjs";

// Lunes a viernes 09:00–16:00; sábado 09:00–14:00.
const jornadaDe = (f) => (new Date(`${f}T00:00:00Z`).getUTCDay() === 6 ? { entrada: "09:00", salida: "14:00" } : { entrada: "09:00", salida: "16:00" });
const fila = (o) => ({ clave: o.clave ?? o.fecha, id: null, motivo: "Inventario de fin de mes", origen: "manual_rh", ...o });

test("semana lunes–domingo y etiquetas", () => {
  assert.deepEqual(diasDeLaSemana("2026-11-26"), ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"]);
  assert.equal(etiquetaDia("2026-11-24"), "Mar 24");
});

test("horas calculadas; fila nueva empieza en su salida", () => {
  assert.equal(minutosFila({ desde: "16:00", hasta: "19:00" }), 180);
  assert.equal(minutosFila({ desde: "16:00", hasta: "16:00" }), null);
  const nueva = filaNueva("2026-11-23", "16:00:00");
  assert.deepEqual([nueva.desde, nueva.hasta, nueva.origen], ["16:00", "17:00", "manual_rh"]);
  assert.deepEqual([filaNueva("2026-11-29").desde, filaNueva("2026-11-29").hasta], ["", ""]);
});

test("validaciones: hasta > desde, sin encimarse con la jornada ni entre filas, motivo", () => {
  const filas = [
    fila({ fecha: "2026-11-23", desde: "16:00", hasta: "19:00" }),
    fila({ clave: "b", fecha: "2026-11-24", desde: "18:00", hasta: "17:00" }),
    fila({ clave: "c", fecha: "2026-11-25", desde: "15:00", hasta: "17:00" }),
    fila({ clave: "d", fecha: "2026-11-23", desde: "18:00", hasta: "20:00" }),
    fila({ clave: "e", fecha: "2026-11-28", desde: "14:00", hasta: "17:00", motivo: " " }),
    fila({ clave: "f", fecha: "2026-11-26", desde: "07:00", hasta: "09:00" }),
  ];
  const errores = validarFilas(filas, { jornadaDe });
  assert.equal(errores["2026-11-23"], undefined);
  assert.match(errores.b, /mayor que «desde»/);
  assert.match(errores.c, /jornada/);
  assert.match(errores.d, /otra fila/);
  assert.match(errores.e, /motivo/);
  assert.equal(errores.f, undefined, "antes de su entrada sí");
});

test("total de la semana contra el tope de 9 h; avisa más de 3 h por día", () => {
  const filas = [fila({ fecha: "2026-11-23", desde: "16:00", hasta: "19:00" }), fila({ fecha: "2026-11-26", desde: "16:00", hasta: "18:00" }),
    fila({ fecha: "2026-11-28", desde: "14:00", hasta: "17:00" })];
  const r = resumenSemana(filas);
  assert.deepEqual([r.total, r.quedan, r.avisos], [480, 60, []]);
  const mas = resumenSemana([...filas, fila({ fecha: "2026-11-24", desde: "16:00", hasta: "20:00" })]);
  assert.equal(mas.total, 720);
  assert.equal(mas.quedan, 0);
  assert.match(mas.avisos[0], /^Mar 24: 4 h extra; la ley permite 3 h por día/);
  assert.match(mas.avisos[1], /semana suma 12 h; la ley permite 9 h/);
  assert.equal(resumenSemana([], [{ fecha: "2026-11-27", minutos: 120 }]).total, 120, "cuenta otros días ya guardados");
});

test("repetir en otros días copia desde, hasta y motivo sin duplicar", () => {
  const base = fila({ fecha: "2026-11-23", desde: "16:00", hasta: "19:00", id: 5, origen: "reloj" });
  const copias = repetirEnDias(base, ["2026-11-23", "2026-11-24", "2026-11-25"], [fila({ fecha: "2026-11-25", desde: "16:00", hasta: "19:00" })]);
  assert.deepEqual(copias.map((c) => [c.fecha, c.desde, c.hasta, c.motivo, c.id, c.origen]),
    [["2026-11-24", "16:00", "19:00", "Inventario de fin de mes", null, "manual_rh"]]);
});

test("servidor ↔ filas: cambios, cuerpo del guardado y quitar", () => {
  const registros = [{ id: 7, fecha: "2026-11-23", desde: "2026-11-23 16:00:00", hasta: "2026-11-23 19:00:00", motivo: "Inventario", origen: "manual_rh" }];
  const originales = filasDesdeServidor(registros);
  assert.deepEqual([originales[0].desde, originales[0].hasta], ["16:00", "19:00"]);
  const opciones = { autoriza: "16", forma: "Pago de horas extras", autorizaOriginal: "16", formaOriginal: "Pago de horas extras" };
  assert.equal(hayCambiosFilas(originales, originales, opciones), false);
  assert.equal(hayCambiosFilas(originales, originales, { ...opciones, forma: "Tiempo por tiempo" }), true);
  const propuesta = filaDesdePropuesta({ fecha: "2026-11-24", desde: "2026-11-24 16:00:00", hasta: "2026-11-24 18:40:00" });
  const filas = [{ ...propuesta, motivo: "Cierre" }];
  assert.equal(hayCambiosFilas(filas, originales, opciones), true);
  const aBase = (f, h) => `${f} ${h}:00`;
  assert.deepEqual(cuerpoGuardar(filas, originales, { autoriza: "16", forma: "Pago de horas extras", aBase }), {
    registros: [{ fecha: "2026-11-24", desde: "2026-11-24 16:00:00", hasta: "2026-11-24 18:40:00", motivo: "Cierre", origen: "reloj" }],
    quitar: [7], id_autoriza: 16, forma_pago: "Pago de horas extras",
  });
});

test("Asistencias: las horas registradas con horario mandan sobre el cálculo", () => {
  const r = { fecha: "2026-11-23", hora_entrada_programada: "09:00:00", hora_salida_programada: "16:00:00",
    entrada: "2026-11-23 09:00:00", salida: "2026-11-23 16:00:00",
    horas_extra_registradas: [{ minutos: 180, forma_pago: "Pago de horas extras" }, { minutos: 60, forma_pago: "Pago de horas extras" }] };
  assert.deepEqual(estadoHorasExtra(r), { estado: "autorizada", minutos: 240, registradas: true });
  const repo = { ...r, horas_extra_registradas: [{ minutos: 60, forma_pago: "Reposición de tiempo por tiempo" }] };
  assert.equal(estadoHorasExtra(repo).estado, "reposicion");
  assert.equal(estadoHorasExtra({ ...r, horas_extra_registradas: [] }).estado, "sin");
});

test("reporte de ley: horas extra con su horario y total del día", async () => {
  const { lineasHorasExtra, totalDelDia } = await import("../src/lib/asistencia/horasExtraReporte.mjs");
  const dia = { horasHM: "10:00", ley: { horasExtra: [{ desde: "2026-11-23 16:00:00", hasta: "2026-11-23 19:00:00", minutos: 180,
    motivo: "Inventario", forma_pago: "Pago de horas extras", origen: "manual_rh" }] } };
  assert.deepEqual(lineasHorasExtra(dia), ["Horas extra 4:00 p.m.–7:00 p.m. · 3 h · Inventario · Pago de horas extras · capturadas por RH"]);
  assert.equal(totalDelDia(dia, "7:00"), "10:00");
  assert.equal(totalDelDia({ horasHM: "7:00", ley: {} }, "6:58"), "6:58");
});
