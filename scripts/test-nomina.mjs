import { test } from "node:test";
import assert from "node:assert/strict";
import { periodoSugerido, acciones, dinero, fechaCorta, avancePrestamo } from "../src/lib/nomina/nomina.mjs";

test("fechas sugeridas por periodicidad", () => {
  assert.deepEqual(periodoSugerido("Semanal", "2026-11-21"), { inicio: "2026-11-16", fin: "2026-11-22" });
  assert.deepEqual(periodoSugerido("Catorcenal", "2026-11-21"), { inicio: "2026-11-16", fin: "2026-11-29" });
  assert.deepEqual(periodoSugerido("Quincenal", "2026-11-21"), { inicio: "2026-11-16", fin: "2026-11-30" });
  assert.deepEqual(periodoSugerido("Quincenal", "2026-02-10"), { inicio: "2026-02-01", fin: "2026-02-15" });
  assert.deepEqual(periodoSugerido("Mensual", "2026-02-10"), { inicio: "2026-02-01", fin: "2026-02-28" });
  assert.deepEqual(periodoSugerido("Diario", "2026-11-21"), { inicio: "2026-11-21", fin: "2026-11-21" });
});

test("acciones por estado: solo el dueño autoriza y cancela una autorizada", () => {
  assert.equal(acciones("borrador", false).editar, true);
  assert.equal(acciones("por_autorizar", false).autorizar, false);
  assert.equal(acciones("por_autorizar", true).autorizar, true);
  assert.equal(acciones("autorizado", false).cancelar, false);
  assert.equal(acciones("autorizado", true).cancelar, true);
  assert.equal(acciones("cancelado", true).cancelar, false);
});

test("formatos", () => {
  assert.equal(dinero(1650), "$1,650.00");
  assert.equal(fechaCorta("2026-11-16"), "16/11/2026");
});

test("horas y días cortos", async () => {
  const { horas, diaCorto } = await import("../src/lib/nomina/nomina.mjs");
  assert.equal(horas(510), "8 h 30 min");
  assert.equal(horas(0), "—");
  assert.equal(horas(45), "45 min");
  assert.equal(diaCorto("2026-11-16"), "lun 16");
});

test("avance de un préstamo", () => {
  assert.deepEqual(avancePrestamo({ monto: 3000, abono: 600, saldo: 2400 }), { pagado: 600, porcentaje: 20, pagosRestantes: 4 });
  assert.deepEqual(avancePrestamo({ monto: 3000, abono: 700, saldo: 3000 }), { pagado: 0, porcentaje: 0, pagosRestantes: 5 });
  assert.deepEqual(avancePrestamo({ monto: 100, abono: 100, saldo: 0 }), { pagado: 100, porcentaje: 100, pagosRestantes: 0 });
});

test("préstamos: los pagos restantes del servidor mandan sobre el estimado", () => {
  assert.equal(avancePrestamo({ monto: 5000, abono: 833.33, saldo: 833.35 }).pagosRestantes, 2, "sin plan: estimado con el abono");
  assert.equal(avancePrestamo({ monto: 5000, abono: 833.33, saldo: 833.35 }, { pagos_restantes: 1 }).pagosRestantes, 1);
});

test("préstamos: palabras del periodo, plan y calendario (27/11/2026)", async () => {
  const { palabraPeriodo, palabraSola, abonoPor, textoPeriodo, resumenPlan, textoCalendario } = await import("../src/lib/nomina/nomina.mjs");
  assert.deepEqual([palabraPeriodo("Quincenal", 6), palabraPeriodo("Semanal", 12), palabraPeriodo("Catorcenal", 3), palabraPeriodo("Mensual", 2), palabraPeriodo("Mensual", 1)],
    ["6 quincenas", "12 semanas", "3 catorcenas", "2 meses", "1 mes"]);
  assert.equal(palabraSola(null), "nóminas");
  assert.equal(abonoPor("Quincenal"), "Abono por quincena");
  assert.equal(abonoPor(undefined), "Abono por nómina");
  assert.equal(textoPeriodo({ inicio: "2026-12-16", fin: "2026-12-31" }), "16 al 31 dic 2026");
  assert.equal(textoPeriodo({ inicio: "2026-12-28", fin: "2027-01-03" }), "28 dic 2026 al 3 ene 2027");
  assert.equal(textoPeriodo({ inicio: "2026-11-30", fin: "2026-12-06" }), "30 nov al 6 dic 2026");
  assert.equal(resumenPlan({ num_pagos: 6, abono: 833.33, ultimo: 833.35, periodo_pago: "Quincenal" }), "6 quincenas de $833.33 · la última de $833.35");
  assert.equal(resumenPlan({ num_pagos: 2, abono: 2500, ultimo: 2500, periodo_pago: "Mensual" }), "2 meses de $2,500.00");
  assert.equal(resumenPlan({ num_pagos: 34, abono: 300, ultimo: 100, periodo_pago: "Mensual" }), "34 meses de $300.00 · el último de $100.00");
  assert.equal(resumenPlan(null), "");
  const { cuantos, elUltimo } = await import("../src/lib/nomina/nomina.mjs");
  assert.deepEqual([cuantos("Quincenal"), cuantos("Mensual"), cuantos("Semanal"), elUltimo("Mensual"), elUltimo("Catorcenal")], ["cuántas quincenas", "cuántos meses", "cuántas semanas", "el último", "la última"]);
  assert.deepEqual(textoCalendario({ primero: { inicio: "2026-12-16", fin: "2026-12-31" }, ultimo: { inicio: "2027-03-01", fin: "2027-03-15" }, aproximado: true }),
    { primero: "16 al 31 dic 2026", ultimo: "1 al 15 mar 2027", aproximado: true, mismo: false });
  assert.equal(textoCalendario(null), null);
});
