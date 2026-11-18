import assert from "node:assert/strict";
import test from "node:test";
import {
  cambiosAutorizar, cambiosNoAutorizar, cambiosQuitar, estadoHorasExtra, minutosDespuesDelHorario,
  resumenHorasExtra, salidaProgramada, valoresPrevios,
} from "../src/lib/asistencia/horasExtra.mjs";

const base = {
  fecha: "2026-11-18T06:00:00.000Z",
  hora_entrada_programada: "08:00:00",
  hora_salida_programada: "17:00:00",
  entrada: "2026-11-18 07:58:00",
  salida: "2026-11-18 18:42:00",
  hrs_extra: 0,
};

test("minutos después del horario; llegar temprano no cuenta", () => {
  assert.equal(minutosDespuesDelHorario(base), 102);
  assert.equal(minutosDespuesDelHorario({ ...base, entrada: "2026-11-18 06:00:00", salida: "2026-11-18 17:00:00" }), 0);
  assert.equal(minutosDespuesDelHorario({ ...base, salida: null }), null);
  assert.equal(minutosDespuesDelHorario({ ...base, hora_salida_programada: null }), null);
});

test("estado: pendiente desde 15 min, sin por debajo, autorizada con hrs_extra", () => {
  assert.deepEqual(estadoHorasExtra(base), { estado: "pendiente", minutos: 102 });
  assert.equal(estadoHorasExtra({ ...base, salida: "2026-11-18 17:14:00" }).estado, "sin");
  assert.equal(estadoHorasExtra({ ...base, salida: "2026-11-18 17:15:00" }).estado, "pendiente");
  assert.deepEqual(estadoHorasExtra({ ...base, hrs_extra: "1" }), { estado: "autorizada", minutos: 102 });
  assert.deepEqual(estadoHorasExtra({ ...base, hrs_extra: 1, salida: "2026-11-18 16:00:00" }), { estado: "autorizada", minutos: null });
});

test("turno nocturno: la salida del horario es al día siguiente", () => {
  const noche = { ...base, hora_entrada_programada: "22:00", hora_salida_programada: "06:00",
    entrada: "2026-11-18 21:55:00", salida: "2026-11-19 07:10:00" };
  assert.equal(salidaProgramada(noche).format("YYYY-MM-DD HH:mm"), "2026-11-19 06:00");
  assert.equal(minutosDespuesDelHorario(noche), 70);
});

test("zona del empleado: 17:00 en Tijuana son 19:00 en la BD", () => {
  const tj = { ...base, salida: "2026-11-18 19:30:00" };
  assert.equal(minutosDespuesDelHorario(tj, "America/Tijuana"), 30);
});

test("no autorizar: salida al horario + constancia; se reconoce y se deshace", () => {
  const cambios = cambiosNoAutorizar(base, { quien: "Laura Gómez" });
  assert.deepEqual(cambios, {
    hrs_extra: 0,
    salida: "2026-11-18 17:00:00",
    notas_hrs_extra: "No autorizadas por Laura Gómez · salida del reloj 2026-11-18 18:42",
  });
  // Con la constancia en notas (sin valores_originales)
  const guardado = { ...base, ...cambios };
  assert.deepEqual(estadoHorasExtra(guardado), { estado: "no_autorizada", minutos: 102, salidaReloj: "2026-11-18 18:42:00" });
  // Con valores_originales del backend (JSON en texto)
  const conOriginal = { ...base, salida: "2026-11-18 17:00:00", valores_originales: JSON.stringify({ salida: "2026-11-18 18:42:00" }) };
  assert.equal(estadoHorasExtra(conOriginal).estado, "no_autorizada");
  assert.deepEqual(cambiosQuitar(guardado), { salida: "2026-11-18 18:42:00", notas_hrs_extra: null });
  assert.equal(cambiosNoAutorizar({ ...base, salida: null }), null);
});

test("una salida corregida a menos sin horas extra originales no es «no autorizada»", () => {
  const r = { ...base, salida: "2026-11-18 17:00:00", valores_originales: { salida: "2026-11-18 17:05:00" } };
  assert.equal(estadoHorasExtra(r).estado, "sin");
});

test("autorizar y quitar: campos que se guardan", () => {
  assert.deepEqual(cambiosAutorizar({ idAutorizador: "12" }), { hrs_extra: 1, forma_pago_extras: "Pago de horas extras", extras_autorizadas_por: 12 });
  assert.deepEqual(cambiosAutorizar({ forma: "Tiempo por tiempo", notas: "Inventario" }), { hrs_extra: 1, forma_pago_extras: "Tiempo por tiempo", notas_hrs_extra: "Inventario" });
  assert.deepEqual(cambiosQuitar({ ...base, hrs_extra: 1 }), { hrs_extra: 0 });
  assert.equal(cambiosQuitar({ ...base, salida: "2026-11-18 16:00:00" }), null);
  assert.deepEqual(valoresPrevios(base, { hrs_extra: 1, forma_pago_extras: "x" }), { hrs_extra: 0, forma_pago_extras: null });
  assert.deepEqual(valoresPrevios({ hrs_extra: null }, { hrs_extra: 1 }), { hrs_extra: 0 });
});

test("resumen del periodo", () => {
  const regs = [base, { ...base, hrs_extra: 1 }, { ...base, salida: "2026-11-18 17:00:00" }, { ...base, ...cambiosNoAutorizar(base) }];
  assert.deepEqual(resumenHorasExtra(regs), { total: 3, pendientes: 1, autorizadas: 1, noAutorizadas: 1 });
});
