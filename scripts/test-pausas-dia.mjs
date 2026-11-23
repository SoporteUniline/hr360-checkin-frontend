import test from "node:test";
import assert from "node:assert/strict";
import { pausasDelDia } from "../src/lib/asistencia/pausasDelDia.mjs";

const aMin = (v) => { const m = /(\d{2}):(\d{2})/.exec(v); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const t = (entrada, salida, extra = {}) => ({ entrada: `2026-11-23 ${entrada}:00`, salida: salida ? `2026-11-23 ${salida}:00` : null, ...extra });

test("la pausa marcada con «Salir a comer» es la comida, con minutos y excedente", () => {
  const p = pausasDelDia([t("11:13", "11:34", { tipo_cierre: "comida" }), t("12:24", null)], { minutosComida: 30, aMin });
  assert.equal(p.length, 1);
  assert.deepEqual({ esComida: p[0].esComida, enCurso: p[0].enCurso, minutos: p[0].minutos, programados: p[0].programados, excedente: p[0].excedente },
    { esComida: true, enCurso: false, minutos: 50, programados: 30, excedente: 20 });
});

test("sin tipo_cierre, se reconoce por la comida checada del día; otras pausas quedan como pausa", () => {
  const p = pausasDelDia([t("08:00", "10:00"), t("10:15", "13:00"), t("14:00", "17:00")],
    { comida: { salida: "2026-11-23 13:00:00" }, minutosComida: 60, aMin });
  assert.deepEqual(p.map((x) => [x.esComida, x.minutos]), [[false, 15], [true, 60]]);
  assert.equal(p[1].excedente, 0);
});

test("sigue en comida: pausa abierta que cuenta hasta ahora", () => {
  const p = pausasDelDia([t("09:00", "13:00", { tipo_cierre: "comida" })], { minutosComida: 60, aMin, ahora: 14 * 60 + 12 });
  assert.deepEqual([p[0].enCurso, p[0].minutos, p[0].excedente, p[0].hasta], [true, 72, 12, null]);
});

test("corregidas mandan; un solo tramo sin comida no tiene pausas", () => {
  const p = pausasDelDia([t("09:00", "13:00", { salida_corregida: "2026-11-23 13:30:00", tipo_cierre: "comida" }), t("14:00", "18:00")], { minutosComida: 60, aMin });
  assert.equal(p[0].minutos, 30);
  assert.deepEqual(pausasDelDia([t("09:00", "18:00")], { aMin }), []);
});
