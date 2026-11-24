// Comida checada en Asistencias y reporte de horas.
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

// Comida abierta: cuánto lleva y alerta cuando ya pasó su tiempo.
test("comida abierta: lleva X de Y min y, si ya se pasó, ⚠ se pasó N min", async () => {
  const { comidaEnCurso, comidaExcedida, ahoraBase } = await import("../src/lib/reporte/comida.mjs");
  const abierta = { salida: "2026-11-23 11:34:00", regreso: null, minutos: null, minutos_programados: 60, excedente: 0 };
  const a = (hhmm) => ahoraBase(new Date(`2026-11-23T${hhmm}:00-06:00`));
  assert.deepEqual(comidaEnCurso(abierta, a("12:00")), { lleva: 26, programados: 60, excedente: 0 });
  assert.equal(textoComida(abierta, undefined, a("12:00")), "11:34 a.m.–… · en comida · lleva 26 de 60 min");
  assert.equal(comidaExcedida(abierta, a("12:00")), false);
  assert.equal(textoComida(abierta, undefined, a("12:46")), "11:34 a.m.–… · en comida · ⚠ se pasó 12 min");
  assert.equal(comidaExcedida(abierta, a("12:46")), true);
  // Sin «ahora» (PDF/Excel viejos) queda como antes; cerrada no cambia.
  assert.equal(textoComida(abierta), "11:34 a.m.–… · en comida");
  assert.equal(comidaEnCurso({ ...abierta, regreso: "2026-11-23 12:30:00", minutos: 56 }, a("13:00")), null);
  // Sin tiempo de comida en su horario: dice cuánto lleva, sin alerta.
  assert.equal(textoComida({ ...abierta, minutos_programados: null }, undefined, a("12:40")), "11:34 a.m.–… · en comida · lleva 66 min");
});

test("celda de comida: solo el tiempo y si se pasó", async () => {
  const { celdaComida, ahoraBase } = await import("../src/lib/reporte/comida.mjs");
  const a = (hhmm) => ahoraBase(new Date(`2026-11-23T${hhmm}:00-06:00`));
  const abierta = { salida: "2026-11-23 11:34:00", regreso: null, minutos: null, minutos_programados: 30, excedente: 0 };
  assert.deepEqual(celdaComida(abierta, undefined, a("11:50")), { texto: "16 min", excedida: false, enCurso: true, detalle: "11:34 a.m.–… · de 30 min" });
  assert.deepEqual([celdaComida(abierta, undefined, a("12:24")).texto, celdaComida(abierta, undefined, a("12:24")).excedida], ["50 min", true]);
  const cerrada = { ...abierta, regreso: "2026-11-23 12:24:00", minutos: 50, excedente: 20 };
  assert.deepEqual(celdaComida(cerrada), { texto: "50 min", excedida: true, enCurso: false, detalle: "11:34 a.m.–12:24 p.m. · de 30 min" });
  assert.equal(celdaComida(null), null);
});
