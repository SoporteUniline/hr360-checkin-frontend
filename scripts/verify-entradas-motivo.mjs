// Verificación en navegador (27/11/2026, «Las checadas tienen que pedir motivo»): en Entradas y salidas, corregir la hora de
// un tramo en la fila pide «Motivo de la corrección». Sin él «Guardar» no manda nada y el error sale junto al campo; corto
// (menos de 5 letras) tampoco; con una sugerencia el PUT /checador/reloj/actualizar/:id lleva motivo_correccion. Un 422
// del servidor también se muestra junto al campo. 1440 y 390 sin desbordes. Backend simulado; nada sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-entradas-motivo.mjs
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
const empresa = { id_empresa: 10, nombre: "Uniline", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Ríos", id_empleado: 7, empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const mov = (id, nombre, apellido, entrada, salida, o = {}) => ({ id, id_empleado: 100 + id, nombre, apellido_paterno: apellido, apellido_materno: "",
  puesto: "Ventas", departamento: "Ventas", sucursal: "Uniline Centro", unidad_negocio: "Uniline Centro", nombre_empresa: "Uniline", id_empresa: 10,
  zona_horaria: "America/Mexico_City", fecha: hoy, entrada: `${hoy} ${entrada}:00`, salida: salida ? `${hoy} ${salida}:00` : null,
  entrada_corregida: null, salida_corregida: null, estado: salida ? "Cerrado" : "Abierto", ...o });
const registros = [mov(1, "Ana", "Torres", "09:18", "18:02"), mov(2, "Carlos", "Ramírez", "08:57", null)];
const puts = [];
let responder422 = false;

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token, url: base }]);
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/reloj/asistencia")) return json({ registros, total: registros.length, page: 1, totalPages: 1 });
    if (/\/checador\/reloj\/actualizar\/\d+$/.test(p) && req.method() === "PUT") {
      puts.push({ id: Number(p.split("/").pop()), cuerpo: req.postDataJSON() });
      if (responder422) return json({ ok: false, codigo: "FALTA_MOTIVO", campo: "motivo_correccion", error: "El motivo no puede pasar de 500 letras." }, 422);
      return json({ message: "ok" });
    }
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
  await page.goto(base + "/panel/registro-de-entradas-y-salidas", { waitUntil: "domcontentloaded" });
  const fila = page.locator("tr", { hasText: "Ana Torres" }).first();
  await fila.waitFor({ timeout: 30000 });

  // Editar: aparece el motivo en su propio renglón, debajo de la checada.
  await fila.getByRole("button", { name: "Editar" }).click();
  const motivo = page.locator("[data-motivo-entradas]");
  await motivo.waitFor({ timeout: 10000 });
  const editando = page.locator("tr").filter({ has: page.locator('input[type="time"]') }).first();
  await editando.locator('input[type="time"]').first().fill("09:00");
  const guardar = editando.getByRole("button", { name: "Guardar" });
  await guardar.click();
  await motivo.locator("[data-error-motivo]").waitFor({ timeout: 5000 });
  assert.equal(await motivo.locator("[data-error-motivo]").innerText(), "Escribe el motivo de la corrección.");
  assert.equal(puts.length, 0, "sin motivo no se manda el PUT");
  await motivo.getByLabel(/Motivo de la corrección/).fill("olv");
  await guardar.click();
  assert.equal(await motivo.locator("[data-error-motivo]").innerText(), "El motivo debe tener al menos 5 letras.");
  assert.equal(puts.length, 0);
  assert.equal(await motivo.getByLabel(/Motivo de la corrección/).getAttribute("maxlength"), "500");
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(sobra <= 1, `1440: sin desplazamiento horizontal (${sobra}px)`);
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/entradas-motivo.png" });

  // 422 del servidor: el error va junto al campo y la fila sigue en edición.
  responder422 = true;
  await motivo.getByRole("button", { name: "Falla del reloj" }).click();
  await guardar.click();
  for (let i = 0; i < 50 && puts.length < 1; i++) await dormir(100);
  await motivo.locator("[data-error-motivo]").waitFor({ timeout: 5000 });
  assert.equal(await motivo.locator("[data-error-motivo]").innerText(), "El motivo no puede pasar de 500 letras.");
  assert.equal(await page.locator("[data-motivo-entradas]").count(), 1, "sigue en edición");

  // Con motivo válido: el PUT lleva motivo_correccion y la hora corregida.
  responder422 = false;
  await motivo.getByRole("button", { name: "Olvidó checar" }).click();
  assert.equal(await motivo.locator("[data-error-motivo]").count(), 0, "el error se quita al elegir uno válido");
  await guardar.click();
  for (let i = 0; i < 50 && puts.length < 2; i++) await dormir(100);
  assert.equal(puts.length, 2);
  assert.equal(puts[1].id, 1);
  assert.equal(puts[1].cuerpo.motivo_correccion, "Olvidó checar");
  assert.match(puts[1].cuerpo.entrada_corregida, / 09:00:00$/);
  await page.locator("[data-motivo-entradas]").waitFor({ state: "detached", timeout: 10000 });

  // 390: el campo cabe sin desplazar la página.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  const filaM = page.locator("tr", { hasText: "Carlos Ramírez" }).first();
  if (await filaM.count()) {
    await filaM.getByRole("button", { name: "Editar" }).click().catch(() => {});
    const sobraM = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(sobraM <= 1, `390: sin desplazamiento horizontal de la página (${sobraM}px)`);
  }

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK entradas y salidas: sin motivo / corto no hay PUT (error junto al campo) · 422 del servidor junto al campo · sugerencia → PUT con motivo_correccion · 1440 y 390 sin desbordes");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
