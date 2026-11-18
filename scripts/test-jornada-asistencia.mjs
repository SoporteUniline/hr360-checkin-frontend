import assert from "node:assert/strict";
import test from "node:test";
import {
  formatearMinutos, horaAMinutos, minutosProgramados, minutosTrabajados,
  resumenJornada, salidaEsDiaSiguiente, sumarDias,
} from "../src/lib/asistencia/jornada.mjs";

const reg = (o) => ({
  hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00",
  entrada: "2026-11-13 08:00:00", salida: "2026-11-13 17:00:00", hrs_comida: 1, ...o,
});

test("jornada completa con comida no pagada: diferencia 0 (antes daba −1 h)", () => {
  const r = resumenJornada(reg({}));
  assert.equal(r.minutosProgramados, 480);
  assert.equal(r.minutosTrabajados, 480);
  assert.equal(r.minutosDiferencia, 0);
  assert.equal(r.jornada, "8 h / 8 h");
});

test("minutos exactos: 08:07 a 17:20 son 9 h 13 min menos 1 h de comida", () => {
  const r = resumenJornada(reg({ entrada: "2026-11-13 08:07:00", salida: "2026-11-13 17:20:00" }));
  assert.equal(r.minutosTrabajados, 493);
  assert.equal(r.minutosDiferencia, 13);
  assert.equal(formatearMinutos(r.minutosTrabajados), "8 h 13 min");
  assert.equal(formatearMinutos(r.minutosDiferencia, { signo: true }), "+13 min");
});

test("turno nocturno 22:00 → 05:00 da 7 h, nunca negativo", () => {
  const base = { hora_entrada_programada: "22:00", hora_salida_programada: "05:00", hrs_comida: 0 };
  assert.equal(minutosProgramados(base), 420);
  assert.equal(minutosTrabajados({ ...base, entrada: "2026-11-13 22:00:00", salida: "2026-11-14 05:00:00" }), 420);
});

test("registro viejo con la salida nocturna guardada en el mismo día se interpreta como día siguiente", () => {
  assert.equal(minutosTrabajados({ entrada: "2026-11-13 22:00:00", salida: "2026-11-13 05:00:00", hrs_comida: 0 }), 420);
});

test("sin salida o sin entrada no se inventan horas ni diferencia", () => {
  for (const o of [{ salida: null }, { entrada: null }, { salida: "" }]) {
    const r = resumenJornada(reg(o));
    assert.equal(r.minutosTrabajados, null);
    assert.equal(r.minutosDiferencia, null);
  }
});

test("sin horario programado: se muestran trabajadas, no diferencia", () => {
  const r = resumenJornada(reg({ hora_entrada_programada: null }));
  assert.equal(r.minutosProgramados, null);
  assert.equal(r.minutosTrabajados, 480);
  assert.equal(r.minutosDiferencia, null);
  assert.equal(r.jornada, "-");
});

test("sin comida capturada no se descuenta nada", () => {
  const r = resumenJornada(reg({ hrs_comida: 0 }));
  assert.equal(r.minutosProgramados, 540);
  assert.equal(r.minutosTrabajados, 540);
});

test("la comida nunca deja horas negativas", () => {
  assert.equal(minutosTrabajados(reg({ entrada: "2026-11-13 08:00:00", salida: "2026-11-13 08:30:00" })), 0);
});

test("acepta fechas ISO con zona (como las serializa MySQL)", () => {
  assert.equal(minutosTrabajados({ entrada: "2026-11-13T14:00:00.000Z", salida: "2026-11-13T23:30:00.000Z", hrs_comida: 0.5 }), 540);
});

test("formato legible en horas y minutos, sin decimales", () => {
  assert.equal(formatearMinutos(510), "8 h 30 min");
  assert.equal(formatearMinutos(480), "8 h");
  assert.equal(formatearMinutos(45), "45 min");
  assert.equal(formatearMinutos(0), "0 min");
  assert.equal(formatearMinutos(-10), "−10 min");
  assert.equal(formatearMinutos(-95, { signo: true }), "−1 h 35 min");
  assert.equal(formatearMinutos(0, { signo: true }), "0 min");
  assert.equal(formatearMinutos(null), "—");
});

test("captura nocturna: salida menor o igual a la entrada cae al día siguiente", () => {
  assert.equal(salidaEsDiaSiguiente("22:00", "05:00"), true);
  assert.equal(salidaEsDiaSiguiente("08:00", "17:00"), false);
  assert.equal(salidaEsDiaSiguiente("08:00", "08:00"), true);
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(sumarDias("2026-11-13T00:00:00", 1), "2026-11-14");
  assert.equal(horaAMinutos("25:00"), null);
});
