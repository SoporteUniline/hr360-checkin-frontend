import test from "node:test";
import assert from "node:assert/strict";
import { moduleState, resourceHref } from "../src/lib/activos/module.mjs";
import { normalizePhoto } from "../src/lib/activos/server/photos.mjs";
test("menús separan movimientos, saldos y partidas sin modificar resguardos originales", () => {
  const state = {
    products: [
      { id: "1", type: "asset" },
      { id: "2", type: "uniform" },
    ],
    categories: [
      { id: "1", type: "asset" },
      { id: "2", type: "uniform" },
    ],
    balances: [{ productId: "1" }, { productId: "2" }],
    movements: [{ productId: "1" }, { productId: "2" }],
    maintenance: [{ productId: "1" }, { productId: "2" }],
    deliveries: [
      {
        id: "5",
        lines: [
          { productId: "1", snapshot: { type: "asset" } },
          { productId: "2", snapshot: { type: "uniform" } },
        ],
      },
    ],
    kits: [{ id: "9", lines: [{ productId: "1" }, { productId: "2" }] }],
    requests: [
      { kind: "Falla de equipo" },
      { kind: "Cambio de talla" },
      { kind: "Otro" },
    ],
  };
  for (const [type, id] of [
    ["asset", "1"],
    ["uniform", "2"],
  ]) {
    const scoped = moduleState(state, type);
    assert.deepEqual(
      scoped.products.map((p) => p.id),
      [id]
    );
    assert.deepEqual(
      scoped.movements.map((p) => p.productId),
      [id]
    );
    assert.deepEqual(
      scoped.deliveries[0].lines.map((p) => p.productId),
      [id]
    );
    assert.equal(scoped.deliveries[0].mixed, true);
    assert.equal(scoped.kits.length, 0);
    assert.equal(scoped.mixedKits.length, 1);
  }
  assert.equal(state.deliveries[0].lines.length, 2);
  assert.equal(moduleState(state, null), state);
});
test("enlaces del módulo único: tipo en ?tipo=, empresa y autoservicio", () => {
  // (20/11/2026) Un solo módulo /panel/activos; los componentes piden sus rutas de siempre.
  assert.equal(resourceHref("uniform", "/entregas/nueva?empleado=2", "4"), "/panel/activos/entregar?empleado=2&empresa=4");
  assert.equal(resourceHref("asset", "/uniformes/8/editar", "4"), "/panel/activos/inventario/8/editar?tipo=uniformes&empresa=4");
  assert.equal(resourceHref("uniform", "/activos/7", "4"), "/panel/activos/inventario/7?tipo=activos&empresa=4");
  assert.equal(resourceHref(null, "/devoluciones?empleado=3", "4"), "/panel/activos/recibir?empleado=3&empresa=4");
  assert.equal(resourceHref(null, "/empleados/3", "4"), "/panel/activos/personas/3?empresa=4");
  assert.equal(resourceHref("uniform", "/categorias", "4"), "/panel/activos/ajustes/categorias?tipo=uniformes&empresa=4");
  assert.equal(resourceHref(null, "/paquetes", "4"), "/panel/activos/ajustes/paquetes?empresa=4");
  assert.equal(resourceHref(null, "/mantenimiento", "4"), "/panel/activos/revision?empresa=4");
  assert.equal(resourceHref(null, "/movimientos", "4"), "/panel/activos/historial?empresa=4");
  assert.equal(resourceHref(null, "/resguardos/5", "4"), "/panel/activos/resguardos/5?empresa=4");
  assert.equal(resourceHref(null, "", "4"), "/panel/activos?empresa=4");
  assert.equal(resourceHref(null, "/resguardos/5", "4", true), "/empleado/panel/mis-recursos/resguardos/5?empresa=4");
  assert.equal(resourceHref(null, "/resguardos", "4", true), "/empleado/panel/mis-recursos?empresa=4");
});
test("fotografías rechazan contenido activo disfrazado de PNG", async () => {
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
  ).toString("base64");
  await assert.rejects(normalizePhoto(`data:image/png;base64,${svg}`));
});
