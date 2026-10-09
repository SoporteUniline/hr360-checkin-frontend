// Integration tests against an isolated local MySQL socket. Never uses DB_*.
// CAU_TEST_SOCKET=/absolute/test/mysql.sock node scripts/test-activos-api.mjs
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { executeCommand } from "../src/lib/activos/server/commands.mjs";
import { snapshot } from "../src/lib/activos/server/read.mjs";
import { validateCommand } from "../src/lib/activos/server/validation.mjs";
const socketPath = process.env.CAU_TEST_SOCKET;
const testHost = process.env.CAU_TEST_HOST;
assert.ok(
  socketPath?.startsWith("/") ||
    (testHost === "127.0.0.1" && process.env.CAU_TEST_PORT === "33306"),
  "Use an isolated local test socket or CAU_TEST_HOST=127.0.0.1 CAU_TEST_PORT=33306.",
);
const connectionOptions = {
  ...(socketPath ? { socketPath } : { host: testHost, port: 33306 }),
  user: "root",
  password: process.env.CAU_TEST_PASSWORD || "",
};
const database = `cau_test_${randomUUID().replaceAll("-", "")}`;
let admin,
  pool,
  counter = 100;
before(async () => {
  admin = await mysql.createConnection({
    ...connectionOptions,
    multipleStatements: true,
  });
  await admin.query(`CREATE DATABASE ${database}`);
  await admin.query(
    `USE ${database}; CREATE TABLE empresas(id_empresa INT PRIMARY KEY, id_usuario INT NOT NULL, estado VARCHAR(20) NOT NULL) ENGINE=InnoDB;`,
  );
  const schema = await readFile(
    new URL(
      "../docs/015_control_activos_uniformes_adamia_dev.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await admin.query(schema.replace("USE `adamia_dev`;", ""));
  pool = mysql.createPool({
    ...connectionOptions,
    database,
    connectionLimit: 5,
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: true,
    timezone: "Z",
  });
});
after(async () => {
  await pool?.end();
  if (admin) {
    await admin.query(`DROP DATABASE ${database}`);
    await admin.end();
  }
});
async function fixture() {
  const companyId = String(++counter);
  await pool.execute("INSERT INTO empresas VALUES (?,1,'Activo')", [companyId]);
  const s = {
    pool,
    companyId,
    actorId: "1",
    actor: "RH de prueba",
    company: { id: companyId, name: "Empresa de prueba" },
    employees: [
      {
        id: "10",
        name: "Ana",
        role: "Operación",
        department: "Planta",
        active: true,
      },
      {
        id: "11",
        name: "Luis",
        role: "Ventas",
        department: "Comercial",
        active: true,
      },
      { id: "12", name: "Baja", active: false },
    ],
    roles: [{ id: "1", name: "Operación" }],
    branches: [{ id: "1", name: "Centro" }],
  };
  s.command = async (type, payload, key = randomUUID(), revision) =>
    executeCommand(
      s,
      { type, payload },
      key,
      revision ?? (await snapshot(s)).revision,
    );
  s.location = (
    await s.command("location.save", { name: "Principal", branchId: "1" })
  ).id;
  s.second = (await s.command("location.save", { name: "Secundaria" })).id;
  s.product = async (type = "uniform", stock = 10, code = randomUUID()) =>
    (
      await s.command("product.save", {
        type,
        name: "Artículo",
        code,
        category: "Prueba",
        size: "M",
        stock,
        returnable: true,
        locationId: s.location,
      })
    ).id;
  s.delivery = async (productId, qty = 1, employeeId = "10") =>
    (
      await s.command("delivery.create", {
        employeeId,
        mode: "Asignación",
        lines: [{ productId, qty, locationId: s.location }],
      })
    ).id;
  return s;
}
test("validación: cantidades, fechas, IDs y comandos no permitidos", () => {
  assert.throws(() => validateCommand({ type: "drop.tables", payload: {} }));
  assert.throws(() =>
    validateCommand({
      type: "stock.move",
      payload: {
        id: "1",
        operation: "entrada",
        qty: -1,
        note: "x",
        locationId: "1",
      },
    }),
  );
  assert.throws(() =>
    validateCommand({
      type: "delivery.create",
      payload: { employeeId: "demo-1", mode: "Asignación", lines: [] },
    }),
  );
  assert.throws(() =>
    validateCommand({
      type: "maintenance.open",
      payload: { productId: "1", qty: 1, reason: "x", due: "2026-02-31" },
    }),
  );
});
test("inventario, entrega, expediente y snapshots inmutables", async () => {
  const s = await fixture(),
    p = await s.product("asset", 1),
    d = await s.delivery(p);
  let state = await snapshot(s);
  assert.equal(state.products[0].stock, 0);
  assert.equal(state.deliveries[0].employeeId, "10");
  assert.equal(state.deliveries[0].company.name, "Empresa de prueba");
  const product = state.products[0];
  await s.command("product.save", { ...product, name: "Nombre cambiado" });
  state = await snapshot(s);
  assert.equal(state.products[0].name, "Nombre cambiado");
  assert.equal(
    state.deliveries.find((x) => x.id === d).lines[0].snapshot.name,
    "Artículo",
  );
});
test("idempotencia devuelve misma entrega y rechaza payload/actor diferente", async () => {
  const s = await fixture(),
    p = await s.product(),
    key = randomUUID(),
    revision = (await snapshot(s)).revision;
  const command = {
    type: "delivery.create",
    payload: {
      employeeId: "10",
      mode: "Asignación",
      lines: [{ productId: p, qty: 2 }],
    },
  };
  const a = await executeCommand(s, command, key, revision),
    b = await executeCommand(s, command, key, revision);
  assert.deepEqual(a, b);
  assert.equal((await snapshot(s)).deliveries.length, 1);
  await assert.rejects(
    executeCommand(
      s,
      { ...command, payload: { ...command.payload, employeeId: "11" } },
      key,
      revision,
    ),
    (e) => e.status === 409,
  );
  await assert.rejects(
    executeCommand({ ...s, actorId: "2" }, command, key, revision),
    (e) => e.status === 409,
  );
});
test("entregas simultáneas: una unidad nunca se asigna dos veces", async () => {
  const s = await fixture(),
    p = await s.product("asset", 1),
    revision = (await snapshot(s)).revision;
  const outcomes = await Promise.allSettled(
    ["10", "11"].map((employeeId) =>
      s.command(
        "delivery.create",
        { employeeId, mode: "Asignación", lines: [{ productId: p, qty: 1 }] },
        randomUUID(),
        revision,
      ),
    ),
  );
  assert.equal(outcomes.filter((x) => x.status === "fulfilled").length, 1);
  const state = await snapshot(s);
  assert.equal(state.deliveries.length, 1);
  assert.equal(state.products[0].stock, 0);
});
test("devoluciones parciales, revisión, pérdida y rechazo de exceso", async () => {
  const s = await fixture(),
    p = await s.product(),
    d = await s.delivery(p, 5);
  let state = await snapshot(s);
  const lineId = state.deliveries[0].lines[0].id;
  const receive = async (qty, condition) =>
    s.command("delivery.return", {
      employeeId: "10",
      note: "Revisión / pérdida reportada",
      lines: [{ deliveryId: d, lineId, qty, condition }],
    });
  await receive(2, "good");
  await receive(1, "review");
  await receive(1, "lost");
  await assert.rejects(receive(2, "good"), (e) => e.status === 409);
  state = await snapshot(s);
  assert.equal(state.products[0].stock, 7);
  assert.equal(state.products[0].repair, 1);
  assert.equal(state.products[0].retired, 1);
  assert.equal(state.deliveries[0].lines[0].returned, 3);
  assert.equal(state.deliveries[0].lines[0].lost, 1);
  assert.equal(state.maintenance.length, 1);
  await s.command("maintenance.close", {
    id: state.maintenance[0].id,
    outcome: "repaired",
    cost: 20,
    note: "Reparado",
  });
  await assert.rejects(
    s.command("maintenance.close", {
      id: state.maintenance[0].id,
      outcome: "repaired",
      cost: 20,
      note: "Reparado",
    }),
    (e) => e.status === 409,
  );
  assert.equal((await snapshot(s)).products[0].stock, 8);
});
test("cambio de talla atómico: sin stock no registra devolución", async () => {
  const s = await fixture(),
    old = await s.product(),
    replacement = await s.product("uniform", 0),
    d = await s.delivery(old, 2);
  let state = await snapshot(s);
  const lineId = state.deliveries[0].lines[0].id;
  const exchange = {
    deliveryId: d,
    lineId,
    productId: replacement,
    qty: 1,
    condition: "good",
    note: "Cambio de talla",
  };
  await assert.rejects(s.command("uniform.exchange", exchange));
  state = await snapshot(s);
  assert.equal(state.deliveries.length, 1);
  assert.equal(state.deliveries[0].lines[0].returned, 0);
  await s.command("stock.move", {
    id: replacement,
    operation: "entrada",
    qty: 2,
    locationId: s.second,
    note: "Compra",
  });
  await s.command("uniform.exchange", exchange);
  state = await snapshot(s);
  assert.equal(state.deliveries.length, 2);
  assert.equal(state.deliveries.find((x) => x.id === d).lines[0].returned, 1);
});
test("traslado parcial entre ubicaciones y mantenimiento de almacén", async () => {
  const s = await fixture(),
    p = await s.product();
  await s.command("stock.move", {
    id: p,
    operation: "traslado",
    qty: 4,
    locationId: s.location,
    destinationId: s.second,
    note: "Traslado",
  });
  let state = await snapshot(s);
  assert.equal(state.products[0].stock, 10);
  assert.equal(state.balances.find((b) => b.locationId === s.second).stock, 4);
  await s.command("maintenance.open", {
    productId: p,
    locationId: s.second,
    qty: 2,
    reason: "Revisar",
  });
  state = await snapshot(s);
  assert.equal(state.products[0].repair, 2);
  await s.command("maintenance.close", {
    id: state.maintenance[0].id,
    outcome: "retired",
    cost: 0,
    note: "No reparable",
  });
  state = await snapshot(s);
  assert.equal(state.products[0].retired, 2);
  assert.equal(state.products[0].stock, 8);
});
test("reversión conserva historial y restaura stock; acuse solo del receptor", async () => {
  const s = await fixture(),
    p = await s.product(),
    d = await s.delivery(p, 2);
  await s.command("delivery.cancel", { id: d, note: "Error de captura" });
  let state = await snapshot(s);
  assert.equal(state.products[0].stock, 10);
  assert.equal(state.deliveries[0].status, "cancelled");
  const next = await s.delivery(p, 2);
  await assert.rejects(
    s.command("delivery.ack", { id: next, status: "accepted" }),
    (e) => e.status === 403,
  );
  const self = { ...s, self: true, employeeId: "10" };
  await assert.rejects(
    executeCommand(
      { ...self, employeeId: "11" },
      { type: "delivery.ack", payload: { id: next, status: "accepted" } },
      randomUUID(),
      (await snapshot(s)).revision,
    ),
    (e) => e.status === 403,
  );
  await executeCommand(
    self,
    { type: "delivery.ack", payload: { id: next, status: "accepted" } },
    randomUUID(),
    (await snapshot(s)).revision,
  );
  await assert.rejects(
    s.command("delivery.cancel", { id: next, note: "Error" }),
    (e) => e.status === 409,
  );
  state = await snapshot(s);
  assert.equal(
    state.deliveries.find((x) => x.id === next).acknowledgement,
    "accepted",
  );
});
test("aislamiento de empresa, empleado y lectura del autoservicio", async () => {
  const a = await fixture(),
    b = await fixture(),
    p = await a.product();
  await assert.rejects(b.delivery(p), (e) => e.status === 404);
  assert.equal((await snapshot(b)).deliveries.length, 0);
  const d = await a.delivery(p, 1, "10");
  await a.delivery(p, 1, "11");
  const state = await snapshot({
    ...a,
    self: true,
    employeeId: "10",
    employees: a.employees.filter((e) => e.id === "10"),
  });
  assert.equal(state.deliveries.length, 1);
  assert.equal(state.deliveries[0].id, d);
  assert.equal(state.products.length, 0);
  assert.equal(state.movements.length, 0);
  await assert.rejects(
    executeCommand(
      { ...a, self: true, employeeId: "10" },
      {
        type: "stock.move",
        payload: {
          id: p,
          qty: 1,
          operation: "ajuste",
          locationId: a.location,
          note: "x",
        },
      },
      randomUUID(),
      state.revision,
    ),
    (e) => e.status === 403,
  );
  await assert.rejects(a.delivery(p, 1, "12"));
});
test("paquetes, tallas, solicitudes y archivo sin pérdidas de inventario", async () => {
  const s = await fixture(),
    p = await s.product();
  await s.command("kit.save", {
    name: "Operación",
    roleId: "1",
    lines: [{ productId: p, qty: 2 }],
  });
  await s.command("employee.sizes", {
    id: "10",
    size: "L",
    pantsSize: "32",
    shoeSize: "27",
    shoeSystem: "MX",
  });
  const request = await s.command("request.create", {
    employeeId: "10",
    kind: "Reposición",
    note: "Nueva prenda",
  });
  await s.command("request.resolve", {
    id: request.id,
    resolution: "Programada",
  });
  let state = await snapshot(s);
  assert.equal(state.employees.find((e) => e.id === "10").size, "L");
  assert.equal(state.kits[0].role, "Operación");
  assert.equal(state.requests[0].resolution, "Programada");
  assert.equal(state.products[0].stock, 10);
  await assert.rejects(s.command("product.archive", { id: p }));
  await s.command("stock.move", {
    id: p,
    qty: 10,
    operation: "ajuste",
    locationId: s.location,
    note: "Baja por deterioro",
  });
  await s.command("product.archive", { id: p });
  state = await snapshot(s);
  assert.equal(state.products[0].active, false);
});
