// Comida checada en Asistencias y reporte de horas (23/11/2026).
import test from "node:test";
import assert from "node:assert/strict";
import { textoComida, resumenComida } from "../src/lib/reporte/comida.mjs";

test("texto de la comida del día", () => {
  assert.equal(textoComida(null), "");
  assert.equal(textoComida({ salida: "2026-11-23 14:00:00", regreso: "2026-11-23 15:05:00", minutos: 65, minutos_programados: 60, excedente: 5 }), "2:00 p.m.–3:05 p.m. · 65 de 60 min · +5 min");
  assert.equal(textoComida({ salida: "2026-11-23 14:00:00", regreso: null, minutos: null }), "2:00 p.m.–… · en comida");
  assert.equal(textoComida({ salida: "2026-11-23 13:00:00", regreso: "2026-11-23 13:40:00", minutos: 40, minutos_programados: null, excedente: null }), "1:00 p.m.–1:40 p.m. · 40 min");
});

test("resumen de comidas del periodo", () => {
  assert.deepEqual(resumenComida({ minutos: 195, dias: 3, veces_excedio: 2, minutos_excedidos: 12 }), { valor: "3:15 h", detalle: "se pasó 2 veces (+12 min)", excedio: true });
  assert.deepEqual(resumenComida({ minutos: 50, dias: 1, veces_excedio: 0 }), { valor: "50 min", detalle: "a tiempo", excedio: false });
  assert.deepEqual(resumenComida(undefined), { valor: "0 min", detalle: "sin comida checada", excedio: false });
});
