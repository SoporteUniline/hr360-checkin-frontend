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
