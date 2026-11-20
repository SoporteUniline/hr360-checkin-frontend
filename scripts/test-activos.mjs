// Cálculos de pantalla del módulo de activos y uniformes (src/lib/activos/model.mjs).
// (20/11/2026) Antes este archivo probaba el modelo de demostración, que ya no existe; las reglas de
// inventario reales se prueban contra MySQL en scripts/test-activos-api.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { assigned, companiesFor, employeeLines, kitLines, outstanding, today } from "../src/lib/activos/model.mjs";

const linea = (productId, qty, o = {}) => ({ productId, qty, returned: 0, lost: 0, snapshot: { type: o.type ?? "uniform" }, ...o });
const state = {
  products: [
    { id: "camisa", active: true, stock: 5 },
    { id: "botas", active: true, stock: 0 },
    { id: "laptop", active: false, stock: 3 },
  ],
  deliveries: [
    { employeeId: "ana", status: "confirmed", lines: [linea("camisa", 3, { returned: 1 }), linea("laptop", 1, { type: "asset" })] },
    { employeeId: "ana", status: "cancelled", lines: [linea("camisa", 5)] },
    { employeeId: "luis", status: "confirmed", lines: [linea("camisa", 2, { lost: 1 })] },
  ],
  kits: [{ id: "dotacion", lines: [{ productId: "camisa", qty: 4 }, { productId: "botas", qty: 1 }, { productId: "laptop", qty: 1 }] }],
};

test("pendiente por partida y asignado por artículo (solo entregas confirmadas)", () => {
  assert.equal(outstanding(linea("x", 3, { returned: 1, lost: 1 })), 1);
  assert.equal(assigned(state, "camisa"), 3, "2 de Ana + 1 de Luis; la cancelada no cuenta");
  assert.equal(assigned(state, "laptop"), 1);
});

test("lo que tiene un empleado, con filtro por tipo", () => {
  const ana = employeeLines(state, "ana");
  assert.deepEqual(ana.map((l) => [l.productId, l.pending]), [["camisa", 2], ["laptop", 1]]);
  assert.deepEqual(employeeLines(state, "ana", "asset").map((l) => l.productId), ["laptop"]);
});

test("paquete: descuenta lo que ya tiene y no pasa de las existencias", () => {
  // Camisa: el paquete pide 4, Ana ya tiene 2 → faltan 2 (hay 5). Botas sin existencias; laptop inactiva.
  assert.deepEqual(kitLines(state, "dotacion", "ana"), [{ productId: "camisa", qty: 2 }]);
  assert.throws(() => kitLines(state, "no-existe", "ana"), /Selecciona un paquete/);
});

test("empresas de la sesión sin repetir y con nombre", () => {
  const user = { id_empresa: 1, empresas: [1, 2], empresas_detalle: [{ id_empresa: 1, nombre: "Planta Uno" }] };
  assert.deepEqual(companiesFor(user), [{ id: "1", name: "Planta Uno" }, { id: "2", name: "Empresa 2" }]);
  assert.deepEqual(companiesFor(null), []);
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});
