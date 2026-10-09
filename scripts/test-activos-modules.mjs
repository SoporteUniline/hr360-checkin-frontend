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
test("enlaces conservan módulo, empresa y autoservicio", () => {
  assert.equal(
    resourceHref("uniform", "/entregas/nueva?empleado=2", "4"),
    "/panel/control-uniformes/entregas/nueva?empleado=2&empresa=4"
  );
  assert.equal(
    resourceHref("asset", "/uniformes/8/editar", "4"),
    "/panel/control-uniformes/prendas/8/editar?empresa=4"
  );
  assert.equal(
    resourceHref("uniform", "/activos/7", "4"),
    "/panel/control-activos/activos/7?empresa=4"
  );
  assert.equal(
    resourceHref(null, "/resguardos/5", "4", true),
    "/empleado/panel/mis-recursos/resguardos/5?empresa=4"
  );
});
test("fotografías rechazan contenido activo disfrazado de PNG", async () => {
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
  ).toString("base64");
  await assert.rejects(normalizePhoto(`data:image/png;base64,${svg}`));
});
