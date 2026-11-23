// Horario contra el límite legal de la semana (23/11/2026).
import test from "node:test";
import assert from "node:assert/strict";
import { minutosSemanaHorario, avisoLimiteLegal, hoyMexico } from "../src/lib/asistencia/limiteLegal.mjs";

const dia = (entrada, salida, extra = {}) => ({ entrada, salida, salida_comida: "", regreso_comida: "", ...extra });

test("minutos de la semana: comida descontada, nocturno y días inactivos", () => {
  // 6 días de 8:00 a 17:00 con 1 h de comida = 48 h.
  assert.equal(minutosSemanaHorario(Array(6).fill(dia("08:00", "17:00", { salida_comida: "13:00", regreso_comida: "14:00" }))), 2880);
  assert.equal(minutosSemanaHorario([dia("22:00", "06:00")]), 480, "cruza medianoche");
  assert.equal(minutosSemanaHorario([dia("08:00", "16:00", { activo: false }), dia("", "16:00")]), 0);
});

test("aviso solo cuando pasa del límite del año", () => {
  const r2027 = { vigencia_desde: "2027-01-01", minutos_ordinarios_semanales: 2760 };
  assert.equal(avisoLimiteLegal(2880, r2027), "Este horario suma 48 h a la semana y el límite legal de 2027 es 46 h. Las horas de más se cuentan como extra.");
  assert.equal(avisoLimiteLegal(2760, r2027), null, "igual al límite: sin aviso");
  assert.equal(avisoLimiteLegal(3000, null), null, "sin regla: sin aviso");
});

test("hoy en la Ciudad de México", () => {
  assert.equal(hoyMexico(new Date("2027-01-01T05:30:00Z")), "2026-12-31");
});
