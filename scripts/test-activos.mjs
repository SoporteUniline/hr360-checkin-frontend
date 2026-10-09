import test from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  applyCommand,
  assigned,
  employeeLines,
  scopeKey,
  validateState,
  kitLines,
} from "../src/lib/activos/model.mjs";
const run = (s, type, payload) =>
  applyCommand(s, { type, payload }, "RH de prueba");
const delivery = (s, lines) =>
  run(s, "delivery.create", {
    employeeId: "demo-luis",
    mode: "Asignación",
    lines,
  });
test("separa empresa/usuario y rechaza almacenamiento de otra empresa", () => {
  assert.notEqual(scopeKey(1, 10), scopeKey(1, 11));
  assert.notEqual(scopeKey(1, 10), scopeKey(2, 10));
  assert.throws(() => scopeKey(1, "all"));
  assert.throws(() => validateState(seed(10), 11));
});
test("una entrega actualiza stock, expediente, resguardo e historial juntos", () => {
  const s = seed(10);
  const r = delivery(s, [
    { productId: "demo-laptop", qty: 1 },
    { productId: "demo-polo-l", qty: 2 },
  ]);
  assert.equal(s.products[0].stock, 1);
  assert.equal(r.state.products[0].stock, 0);
  assert.equal(assigned(r.state, "demo-laptop"), 1);
  assert.equal(employeeLines(r.state, "demo-luis").length, 2);
  assert.equal(r.state.deliveries[0].id, r.id);
  assert.equal(r.state.movements[0].actor, "RH de prueba");
  assert.throws(() =>
    delivery(r.state, [{ productId: "demo-laptop", qty: 1 }])
  );
});
test("rechaza insuficiencia, cantidades inválidas y duplicados sin mutar parcialmente", () => {
  const s = seed(10),
    before = JSON.stringify(s);
  assert.throws(() =>
    delivery(s, [
      { productId: "demo-laptop", qty: 1 },
      { productId: "demo-polo-l", qty: 100 },
    ])
  );
  for (const qty of [0, -1, 1.5, NaN])
    assert.throws(() => delivery(s, [{ productId: "demo-polo-l", qty }]));
  assert.throws(() =>
    delivery(s, [
      { productId: "demo-polo-l", qty: 1 },
      { productId: "demo-polo-l", qty: 1 },
    ])
  );
  assert.equal(JSON.stringify(s), before);
});
test("devolución parcial conserva el saldo y evita recibir más de lo asignado", () => {
  let s = seed(10);
  s = run(s, "delivery.return", {
    employeeId: "demo-ana",
    lines: [
      {
        deliveryId: "demo-delivery",
        lineId: "demo-line-2",
        qty: 1,
        condition: "good",
      },
    ],
  }).state;
  assert.equal(s.products.find((p) => p.id === "demo-polo-m").stock, 13);
  assert.equal(employeeLines(s, "demo-ana", "uniform")[0].pending, 1);
  assert.throws(() =>
    run(s, "delivery.return", {
      employeeId: "demo-luis",
      lines: [
        {
          deliveryId: "demo-delivery",
          lineId: "demo-line-2",
          qty: 1,
          condition: "good",
        },
      ],
    })
  );
  assert.throws(() =>
    run(s, "delivery.return", {
      employeeId: "demo-ana",
      lines: [
        {
          deliveryId: "demo-delivery",
          lineId: "demo-line-2",
          qty: 2,
          condition: "good",
        },
      ],
    })
  );
});
test("daño va a revisión y pérdida a baja, sin devolver a disponible", () => {
  const s = seed(10);
  const line = {
    deliveryId: "demo-delivery",
    lineId: "demo-line-1",
    qty: 1,
    condition: "review",
  };
  assert.throws(() =>
    run(s, "delivery.return", { employeeId: "demo-ana", lines: [line] })
  );
  const r = run(s, "delivery.return", {
    employeeId: "demo-ana",
    lines: [line],
    note: "Pantalla rota",
  });
  assert.equal(r.state.products.find((p) => p.id === "demo-phone").stock, 0);
  assert.equal(r.state.products.find((p) => p.id === "demo-phone").repair, 1);
  const lost = run(s, "delivery.return", {
    employeeId: "demo-ana",
    lines: [{ ...line, condition: "lost" }],
    note: "Pérdida revisada",
  });
  assert.equal(
    lost.state.products.find((p) => p.id === "demo-phone").retired,
    1
  );
  assert.equal(employeeLines(lost.state, "demo-ana", "asset")[0].pending, 0);
});
test("cambio de talla es atómico incluso si la nueva talla no tiene stock", () => {
  const s = seed(10),
    p = {
      deliveryId: "demo-delivery",
      lineId: "demo-line-2",
      productId: "demo-polo-l",
      qty: 1,
      note: "Cambio de M a L",
    };
  const r = run(s, "uniform.exchange", p);
  assert.equal(r.state.products.find((i) => i.id === "demo-polo-m").stock, 13);
  assert.equal(r.state.products.find((i) => i.id === "demo-polo-l").stock, 2);
  assert.equal(r.state.revision, 1);
  const empty = structuredClone(s);
  empty.products.find((i) => i.id === "demo-polo-l").stock = 0;
  const before = JSON.stringify(empty);
  assert.throws(() => run(empty, "uniform.exchange", p));
  assert.equal(JSON.stringify(empty), before);
});
test("resguardos conservan snapshots y acuses bloquean reversión", () => {
  const s = seed(10),
    p = s.products.find((p) => p.id === "demo-phone");
  const edited = run(s, "product.save", { ...p, name: "Nuevo nombre" }).state;
  assert.equal(
    edited.deliveries[0].lines[0].snapshot.name,
    "Samsung Galaxy A55"
  );
  const accepted = run(s, "delivery.ack", {
    id: "demo-delivery",
    status: "accepted",
  }).state;
  assert.throws(() =>
    run(accepted, "delivery.cancel", { id: "demo-delivery", note: "Error" })
  );
  assert.throws(() =>
    run(accepted, "delivery.ack", { id: "demo-delivery", status: "accepted" })
  );
  const cancelled = run(s, "delivery.cancel", {
    id: "demo-delivery",
    note: "Error de captura",
  }).state;
  assert.equal(cancelled.products.find((p) => p.id === "demo-phone").stock, 1);
  assert.equal(assigned(cancelled, "demo-phone"), 0);
  assert.throws(() =>
    run(cancelled, "delivery.cancel", { id: "demo-delivery", note: "Otra vez" })
  );
});
test("mantenimiento cierra una vez y actualiza existencias", () => {
  const s = seed(10);
  const r = run(s, "maintenance.close", {
    id: "demo-maint",
    outcome: "repaired",
    cost: 500,
    note: "Batería sustituida",
  });
  const p = r.state.products.find((p) => p.id === "demo-dell");
  assert.equal(p.stock, 1);
  assert.equal(p.repair, 0);
  assert.throws(() =>
    run(r.state, "maintenance.close", {
      id: "demo-maint",
      outcome: "repaired",
      cost: 500,
      note: "Repetido",
    })
  );
});
test("paquete descuenta dotación existente y entrada/ajuste validan stock", () => {
  const s = seed(10);
  assert.deepEqual(
    kitLines(s, "demo-kit", "demo-ana").map((l) => l.productId),
    ["demo-laptop", "demo-charger"]
  );
  assert.throws(() =>
    run(s, "stock.move", {
      id: "demo-laptop",
      operation: "entrada",
      qty: 2,
      note: "Compra",
    })
  );
  assert.throws(() =>
    run(s, "stock.move", {
      id: "demo-polo-l",
      operation: "ajuste",
      qty: 4,
      note: "Merma",
    })
  );
  const r = run(s, "stock.move", {
    id: "demo-polo-l",
    operation: "entrada",
    qty: 4,
    note: "Compra",
  });
  assert.equal(r.state.products.find((p) => p.id === "demo-polo-l").stock, 7);
});
test("códigos/series no se duplican; no se archivan recursos pendientes", () => {
  const s = seed(10);
  assert.throws(() =>
    run(s, "product.save", { ...s.products[0], id: undefined })
  );
  assert.throws(() => run(s, "product.archive", { id: "demo-phone" }));
  assert.throws(() =>
    run(s, "product.save", { ...s.products[1], serial: s.products[0].serial })
  );
});
test("solicitudes no modifican inventario y se resuelven una sola vez", () => {
  const s = seed(10),
    r = run(s, "request.create", {
      employeeId: "demo-ana",
      kind: "Cambio de talla",
      note: "Necesito L",
    });
  assert.deepEqual(r.state.products, s.products);
  const id = r.state.requests[0].id;
  const resolved = run(r.state, "request.resolve", { id, note: "Acudir a RH" });
  assert.equal(resolved.state.requests[0].status, "resolved");
  assert.throws(() =>
    run(resolved.state, "request.resolve", { id, note: "Repetida" })
  );
});
