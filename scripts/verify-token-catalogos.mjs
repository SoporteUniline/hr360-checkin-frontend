// Verificación en navegador: las pantallas que usan `axios` directo mandan el token al backend
// (los catálogos ya piden sesión). Caso: Festivos › Nuevo › Agregar. Backend simulado, nada sale a internet.
// Uso: npm run build && node scripts/verify-token-catalogos.mjs
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
const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH", id_empleado: 7, empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

const altas = [];
const terceros = [];
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token, url: base }]);
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    // Una petición a otro dominio nunca debe llevar nuestro token.
    if (url.hostname !== "127.0.0.1" && !url.pathname.startsWith("/api/")) terceros.push(req.headers().authorization || "");
    const p = url.pathname;
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/holidays") && req.method() === "POST") { altas.push({ auth: req.headers().authorization || "", cuerpo: JSON.parse(req.postData() || "{}") }); return json({ message: "ok" }); }
    if (p.includes("/checador/holidays/")) return json({ festivos: [], total: 0, page: 1, totalPages: 0 });
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });

  await page.goto(base + "/panel/festivos", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Nuevo/ }).first().click();
  const dialogo = page.getByRole("dialog");
  await dialogo.locator('input[type="date"]').fill("2026-12-25");
  await dialogo.getByPlaceholder("Ej. Natalicio Benito Juárez").fill("Navidad");
  await dialogo.getByRole("button", { name: "Agregar" }).click();
  if (process.env.CAPTURAS) { await dormir(500); await page.screenshot({ path: process.env.CAPTURAS + "/festivo-alta.png" }); }
  for (let i = 0; i < 60 && !altas.length; i++) await dormir(100);
  assert.equal(altas.length, 1, `se envió el alta · diálogo: ${await dialogo.innerText().catch(() => "(cerrado)")}`);
  assert.equal(altas[0].auth, `Bearer ${token}`, "el alta lleva el token de la sesión");
  assert.deepEqual(altas[0].cuerpo, { id_empresa: 10, fecha: "2026-12-25", descripcion: "Navidad" });
  assert.ok(terceros.every((a) => !a), "nada fuera del backend recibe el token");
  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK catálogos con axios directo: el alta de festivo lleva el token de la sesión");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
