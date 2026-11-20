// Verificación en navegador del módulo único «Activos y uniformes» (20/11/2026): una entrada en el menú,
// pestañas Inicio · Inventario · Personas, Ajustes, filtro Activos | Uniformes y redirección de las rutas
// viejas. Backend simulado (nada sale a internet). Uso: npm run build && node scripts/verify-activos.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
const token = `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
const empresa = { id_empresa: 10, nombre: "Planta Uno", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: 5, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

const producto = (id, type, name, o = {}) => ({
  id, type, name, code: `C-${id}`, category: type === "asset" ? "Cómputo" : "Camisas", categoryId: type === "asset" ? "1" : "2",
  serial: type === "asset" ? `S-${id}` : "", variant: "", size: type === "uniform" ? "M" : "", color: "", returnable: true,
  minimum: 2, cost: 100, renewalMonths: 12, active: true, version: 1, stock: 5, repair: 0, retired: 0, locationId: "1", location: "Almacén", ...o,
});
const estado = {
  version: 1, companyId: "10", revision: "7", company: { id: "10", name: "Planta Uno" },
  employees: [
    { id: "31", name: "Ana Ruiz", role: "Operadora", roleId: "3", department: "Producción", branch: "Matriz", active: true, size: "M", pantsSize: "", shoeSize: "", shoeSystem: "", notes: "" },
    { id: "32", name: "Luis Pérez", role: "Supervisor", roleId: "4", department: "Producción", branch: "Matriz", active: true, size: "L", pantsSize: "", shoeSize: "", shoeSystem: "", notes: "" },
  ],
  roles: [], branches: [], locations: [{ id: "1", name: "Almacén", active: true }],
  balances: [], catalogReady: true,
  products: [producto("101", "asset", "Laptop Dell 5420"), producto("201", "uniform", "Camisa polo", { stock: 1 })],
  categories: [{ id: "1", type: "asset", name: "Cómputo", active: true }, { id: "2", type: "uniform", name: "Camisas", active: true }],
  deliveries: [{
    id: "501", folio: "E-501", employeeId: "31", employee: { name: "Ana Ruiz" }, date: "2026-11-10", due: "", mode: "Asignación", note: "",
    actor: "RH", status: "confirmed", acknowledgement: "pending", ackNote: "", ackDate: "", cancelReason: "", version: 1,
    lines: [{ id: "9001", productId: "201", locationId: "1", qty: 2, returned: 0, lost: 0, snapshot: { type: "uniform", name: "Camisa polo", code: "C-201", size: "M", returnable: true } }],
  }],
  movements: [], maintenance: [], kits: [], requests: [], employeeId: null,
};

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token, url: base }]);
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  const lecturas = [];
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" }, body: JSON.stringify(data) });
    if (url.origin === base && url.pathname.startsWith("/internal/control-activos")) { lecturas.push(url.pathname); return json({ state: estado }); }
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (req.method() === "OPTIONS") return json({});
    if (url.pathname.endsWith("/users/verify/token")) return json({ user: usuario });
    if (url.pathname.includes("eventos-checada")) return route.abort();
    return json({});
  });

  // Inicio
  await page.goto(`${base}/panel/activos?empresa=10`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Activos y uniformes" }).waitFor({ timeout: 30000 });
  const nav = page.getByRole("navigation", { name: "Activos y uniformes" });
  assert.deepEqual(await nav.getByRole("link").allInnerTexts(), ["Inicio", "Inventario", "Personas", "Ajustes"]);
  assert.equal(await nav.getByRole("link", { name: "Inicio" }).getAttribute("aria-current"), "page");
  // Menú lateral: una sola entrada (antes 24).
  assert.equal(await page.getByRole("link", { name: "Inventario de activos" }).count(), 0);
  assert.equal(await page.getByRole("link", { name: "Prendas y existencias" }).count(), 0);
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/activos-inicio.png" });

  // Inventario: activos por defecto; el filtro cambia a uniformes sin volver a descargar todo.
  await nav.getByRole("link", { name: "Inventario" }).click();
  await page.getByText("Laptop Dell 5420").first().waitFor({ timeout: 15000 });
  assert.equal(await page.getByText("Camisa polo").count(), 0);
  const antes = lecturas.length;
  await page.getByRole("group", { name: "Tipo de artículo" }).getByRole("link", { name: "Uniformes" }).click();
  await page.getByText("Camisa polo").first().waitFor({ timeout: 15000 });
  assert.match(page.url(), /\/panel\/activos\/inventario\?.*tipo=uniformes/);
  assert.equal(lecturas.length, antes, "cambiar de tipo no vuelve a descargar el inventario");
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/activos-inventario.png" });

  // Personas → Ana → Entregar
  await nav.getByRole("link", { name: "Personas" }).click();
  await page.getByRole("heading", { name: "Personas" }).waitFor({ timeout: 15000 });
  await page.locator("tr", { hasText: "Ana Ruiz" }).getByRole("link", { name: "Abrir" }).click();
  await page.getByRole("heading", { name: "Ana Ruiz" }).waitFor({ timeout: 15000 });
  assert.equal(await nav.getByRole("link", { name: "Personas" }).getAttribute("aria-current"), "page");
  await page.getByRole("link", { name: "Recibir devolución" }).waitFor();
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/activos-persona.png" });
  await page.getByRole("link", { name: "Entregar", exact: true }).click();
  await page.getByRole("heading", { name: "Nueva entrega" }).waitFor({ timeout: 15000 });
  assert.match(page.url(), /\/panel\/activos\/entregar\?.*empleado=31/);

  // Ajustes: categorías por tipo, ubicaciones y paquetes.
  await nav.getByRole("link", { name: "Ajustes" }).click();
  await page.getByRole("heading", { name: "Categorías de activos" }).waitFor({ timeout: 15000 });
  await page.getByRole("navigation", { name: "Ajustes" }).getByRole("link", { name: "Ubicaciones" }).click();
  await page.waitForURL(/\/ajustes\/ubicaciones/);
  await page.getByRole("navigation", { name: "Ajustes" }).getByRole("link", { name: "Paquetes y dotaciones" }).click();
  await page.waitForURL(/\/ajustes\/paquetes/);

  // Rutas viejas redirigen a su equivalente, con la empresa.
  for (const [vieja, nueva] of [
    ["/panel/control-uniformes/prendas?empresa=10", /\/panel\/activos\/inventario\?.*tipo=uniformes.*empresa=10|\/panel\/activos\/inventario\?.*empresa=10.*tipo=uniformes/],
    ["/panel/control-activos/empleados/31?empresa=10", /\/panel\/activos\/personas\/31\?empresa=10/],
    ["/panel/control-activos/entregas/nueva?empresa=10", /\/panel\/activos\/entregar\?empresa=10/],
    ["/panel/control-uniformes?empresa=10", /\/panel\/activos\?empresa=10/],
  ]) {
    await page.goto(base + vieja, { waitUntil: "domcontentloaded" });
    assert.match(page.url(), nueva, vieja);
  }
  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK activos y uniformes: una entrada, pestañas Inicio · Inventario · Personas, filtro sin recargar, entregar desde la persona, Ajustes y rutas viejas redirigidas");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
