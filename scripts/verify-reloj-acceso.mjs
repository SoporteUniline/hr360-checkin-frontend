// Verificación en navegador del acceso al reloj por slug: la primera vez valida antes de abrir; si este aparato
// lo validó activo en los últimos 7 días abre sin «Validando acceso» y revalida en segundo plano; si en segundo plano
// resulta inactiva, se bloquea. Backend simulado (las respuestas tardan 3 s para ver que no se espera).
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-reloj-acceso.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (tipo) => { const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ tipo_usuario: tipo, exp: Math.floor(Date.now() / 1000) + 3600 })}`; return `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`; };
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true }) : null);



let activa = true;
const consultas = [];
let exito = false;
const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["camera"] });
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
  await ctx.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.pathname.startsWith("/api/empresas/check-subscription/")) { consultas.push("suscripcion"); await dormir(3000); return route.fulfill({ json: { hasActivePlan: activa } }); }
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    if (url.pathname.endsWith("/empresas/slug/demo")) { consultas.push("slug"); return route.fulfill({ json: { id_empresa: 7, nombre: "Demo" }, headers: cors }); }
    return route.fulfill({ json: {}, headers: cors });
  });
  const pg = await ctx.newPage();
  const validando = () => pg.evaluate(() => document.body.innerText.includes("Validando acceso"));

  // 1) Primera vez en este aparato: espera la validación.
  await pg.goto(base + "/demo", { waitUntil: "domcontentloaded" });
  await pg.getByText("Validando acceso").waitFor({ timeout: 20000 });
  await pg.waitForFunction(() => !document.body.innerText.includes("Validando acceso"), null, { timeout: 20000 });
  assert.deepEqual(consultas, ["slug", "suscripcion"]);
  const guardado = await pg.evaluate(() => localStorage.getItem("adamia-reloj-suscripcion:slug:demo"));
  assert.ok(guardado?.includes('"activa":true'), "guarda la validación");

  // 2) Validada hace 3 días: abre de inmediato (sin «Validando») y revalida en segundo plano.
  await pg.evaluate(() => {
    const k = "adamia-reloj-suscripcion:slug:demo";
    const d = JSON.parse(localStorage.getItem(k));
    const f = new Date(Date.now() - 3 * 86400000);
    d.fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(f);
    localStorage.setItem(k, JSON.stringify(d));
  });
  consultas.length = 0;
  const t0 = Date.now();
  await pg.reload({ waitUntil: "load" });
  // «Validando acceso» viene en el HTML y se ve solo mientras carga la página; ya no espera a la red (que aquí tarda 3 s).
  await pg.waitForFunction(() => !document.body.innerText.includes("Validando acceso"), null, { timeout: 2500 });
  const abrio = Date.now() - t0;
  assert.ok(consultas.length < 2 || abrio < 3000, `abrió en ${abrio} ms sin esperar la validación`);
  for (let i = 0; i < 10; i++) { assert.equal(await validando(), false, "no regresa a «Validando acceso»"); await dormir(100); }
  await pg.waitForFunction(() => JSON.parse(localStorage.getItem("adamia-reloj-suscripcion:slug:demo")).fecha === new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date()), null, { timeout: 20000 });
  assert.deepEqual(consultas, ["slug", "suscripcion"], "revalida en segundo plano");

  // 3) Validada hace 3 días pero ya inactiva: abre y al confirmar se bloquea.
  await pg.evaluate(() => {
    const k = "adamia-reloj-suscripcion:slug:demo";
    const d = JSON.parse(localStorage.getItem(k));
    d.fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date(Date.now() - 3 * 86400000));
    localStorage.setItem(k, JSON.stringify(d));
  });
  activa = false;
  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.getByText("no cuenta con una suscripción activa").waitFor({ timeout: 20000 });
  assert.equal(await pg.evaluate(() => localStorage.getItem("adamia-reloj-suscripcion:slug:demo")), null, "olvida la validación");

  exito = true;
  console.log("OK reloj: primera vez valida; validado en 7 días abre sin esperar y revalida; inactiva en segundo plano bloquea");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
