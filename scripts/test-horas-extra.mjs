import assert from "node:assert/strict";
import test from "node:test";
import {
  cambiosAutorizar, cambiosNoAutorizar, cambiosQuitar, estadoHorasExtra, minutosDespuesDelHorario,
  ordenarPorHorasExtra, resumenHorasExtra, salidaProgramada, valoresPrevios,
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

test("estado: lo trabajado de más (llegó 07:58, salió 18:42 = 1 h 44 min); desde 30 min (antes 15); autorizada con hrs_extra", () => {
  assert.deepEqual(estadoHorasExtra(base), { estado: "pendiente", minutos: 104 });
  const exacto = { ...base, entrada: "2026-11-18 08:00:00" };
  assert.equal(estadoHorasExtra({ ...exacto, salida: "2026-11-18 17:29:00" }).estado, "sin");
  assert.equal(estadoHorasExtra({ ...exacto, salida: "2026-11-18 17:20:00" }).estado, "sin", "20 min: debajo del umbral único de 30");
  assert.equal(estadoHorasExtra({ ...exacto, salida: "2026-11-18 17:30:00" }).estado, "pendiente");
  assert.deepEqual(estadoHorasExtra({ ...base, hrs_extra: "1" }), { estado: "autorizada", minutos: 104 });
  assert.deepEqual(estadoHorasExtra({ ...base, hrs_extra: 1, salida: "2026-11-18 16:00:00" }), { estado: "autorizada", minutos: null });
});

test("llegar antes cuenta; no checar comida cuenta; salir antes lo compensa", () => {
  // Llegó 07:30 y salió a su hora: 30 min de más.
  assert.deepEqual(estadoHorasExtra({ ...base, entrada: "2026-11-18 07:30:00", salida: "2026-11-18 17:00:00" }), { estado: "pendiente", minutos: 30 });
  // Horario 09:00–16:00 con comida 13:00–14:00 (6 h); checó 09:00–16:00 en un solo tramo: 1 h de más.
  const sinComida = { ...base, hora_entrada_programada: "09:00", hora_salida_programada: "16:00",
    hora_salida_comida_programada: "13:00", hora_regreso_comida_programada: "14:00",
    entrada: "2026-11-18 09:00:00", salida: "2026-11-18 16:00:00",
    tramos_checadas: [{ entrada: "2026-11-18 09:00:00", salida: "2026-11-18 16:00:00" }], minutos_trabajados_checadas: 420 };
  assert.deepEqual(estadoHorasExtra(sinComida), { estado: "pendiente", minutos: 60 });
  // Llegó 1 h antes pero se fue 1 h antes: no hay tiempo de más.
  assert.equal(estadoHorasExtra({ ...base, entrada: "2026-11-18 07:00:00", salida: "2026-11-18 16:00:00" }).estado, "sin");
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

test("no autorizar: solo la constancia, la salida NO se mueve (26/11/2026); los recortes de antes se reconocen y se deshacen", () => {
  const cambios = cambiosNoAutorizar(base, { quien: "Laura Gómez" });
  assert.deepEqual(cambios, {
    hrs_extra: 0,
    notas_hrs_extra: "No autorizadas por Laura Gómez · salida del reloj 2026-11-18 18:42",
  });
  const guardado = { ...base, ...cambios };
  assert.deepEqual(estadoHorasExtra(guardado), { estado: "no_autorizada", minutos: 104, salidaReloj: "2026-11-18 18:42:00" });
  assert.deepEqual(cambiosQuitar(guardado), { notas_hrs_extra: null }, "no hay salida que regresar");
  // Registro de antes: «No autorizar» recortaba la salida a la del horario (constancia + salida 17:00).
  const recortado = { ...guardado, salida: "2026-11-18 17:00:00" };
  assert.deepEqual(estadoHorasExtra(recortado), { estado: "no_autorizada", minutos: 104, salidaReloj: "2026-11-18 18:42:00" });
  assert.deepEqual(cambiosQuitar(recortado), { salida: "2026-11-18 18:42:00", notas_hrs_extra: null });
  // Con valores_originales del backend (JSON en texto), registro anterior sin constancia
  const conOriginal = { ...base, salida: "2026-11-18 17:00:00", valores_originales: JSON.stringify({ salida: "2026-11-18 18:42:00" }) };
  assert.equal(estadoHorasExtra({ ...conOriginal, entrada: "2026-11-18 08:00:00" }).estado, "no_autorizada");
  assert.equal(cambiosNoAutorizar({ ...base, salida: null }), null);
});

test("no autorizar a quien salió a su hora (llegó antes / no checó comida): no mueve la salida", () => {
  const temprano = { ...base, entrada: "2026-11-18 07:30:00", salida: "2026-11-18 17:00:00" };
  const cambios = cambiosNoAutorizar(temprano, { quien: "Laura Gómez" });
  assert.deepEqual(cambios, { hrs_extra: 0, notas_hrs_extra: "No autorizadas por Laura Gómez · salida del reloj 2026-11-18 17:00" });
  const guardado = { ...temprano, ...cambios };
  assert.deepEqual(estadoHorasExtra(guardado), { estado: "no_autorizada", minutos: 30, salidaReloj: "2026-11-18 17:00:00" });
  assert.deepEqual(cambiosQuitar(guardado), { notas_hrs_extra: null });
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
  assert.deepEqual(resumenHorasExtra(regs), { total: 3, pendientes: 1, autorizadas: 1, noAutorizadas: 1, reposiciones: 0 });
});

test("orden: por autorizar (más minutos primero) → autorizadas → no autorizadas → sin", () => {
  const regs = [
    { ...base, id: "sin", salida: "2026-11-18 17:00:00" },
    { ...base, id: "aut", hrs_extra: 1 },
    { ...base, id: "p20", salida: "2026-11-18 17:30:00" },
    { ...base, id: "no", ...cambiosNoAutorizar(base) },
    { ...base, id: "p102" },
  ];
  assert.deepEqual(ordenarPorHorasExtra(regs).map((r) => r.id), ["p102", "p20", "aut", "no", "sin"]);
  assert.deepEqual(ordenarPorHorasExtra(regs, { orden: "asc" }).map((r) => r.id), ["sin", "no", "aut", "p20", "p102"]);
});
