// Verificación en navegador (celular 390 px) de «Debes X» en el Inicio del empleado (22/11/2026), backend simulado:
// con deuda muestra cuánto y el detalle; al corriente lo dice; sin permisos que se reponen no aparece; pide solo su cuenta.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-tiempo-reponer.mjs
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


const cuentas = {
  debe: { id_empleado: 15, debe: 90, total_cargos: 150, total_repuesto: 30, total_cerrado: 30,
    cargos: [{ id_solicitud: 1, fecha: "2026-11-18", tipo_horas: "llega_tarde", hora_inicio: "09:00:00", hora_fin: "10:00:00", minutos: 60, estado: "calculado" },
      { id_solicitud: 2, fecha: "2026-11-20", tipo_horas: "sale_antes", hora_inicio: "16:30:00", hora_fin: "18:00:00", minutos: 90, estado: "calculado" }],
    reposiciones: [{ id_asistencia: 7, fecha: "2026-11-21", minutos: 30 }],
    cierres: [{ id: 3, tipo: "condonacion", minutos: 30, creado_en: "2026-11-21 20:00:00", creado_por_nombre: "RH Prueba", nota: null, borrado_en: null }] },
  corriente: { id_empleado: 15, debe: 0, total_cargos: 60, total_repuesto: 60, total_cerrado: 0, cargos: [{ id_solicitud: 1, fecha: "2026-11-18", tipo_horas: "llega_tarde", hora_inicio: "09:00:00", hora_fin: "10:00:00", minutos: 60, estado: "calculado" }], reposiciones: [{ id_asistencia: 7, fecha: "2026-11-19", minutos: 60 }], cierres: [] },
  nada: { id_empleado: 15, debe: 0, total_cargos: 0, total_repuesto: 0, total_cerrado: 0, cargos: [], reposiciones: [], cierres: [] },
};
let caso = "debe";
const pedidas = [];
let exito = false;
const errores = [];
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: jwt("Empleado"), url: base }]);
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    const ok = (json) => route.fulfill({ status: 200, json, headers: cors });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return ok({ user: { id_usuario: 15, id_empleado: 15, tipo_usuario: "Empleado", nombre: "Ana Torres", id_empresa: 7, empresas: [7] } });
    if (p.startsWith("/checador/cuenta-horas")) { pedidas.push(p); return ok({ ok: true, data: cuentas[caso] }); }
    return ok({});
  });
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));

  await pg.goto(base + "/empleado/panel/inicio", { waitUntil: "domcontentloaded" });
  const tarjeta = pg.getByRole("region", { name: "Tiempo por reponer" });
  await tarjeta.getByRole("heading", { name: "Debes 1 h 30 min" }).waitFor({ timeout: 20000 });
  await tarjeta.getByText("Ver de dónde sale").click();
  const texto = (await tarjeta.innerText()).replace(/\s+/g, " ");
  for (const t of ["Llega tarde", "Reposición", "Condonado", "+1 h", "−30 min"]) assert.ok(texto.toLowerCase().includes(t.toLowerCase()), `falta «${t}» en: ${texto}`);
  assert.ok(pedidas.every((p) => p === "/checador/cuenta-horas/15"), `solo su cuenta: ${pedidas}`);
  assert.ok(await pg.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde");
  await captura(pg, "inicio-debe-tiempo");

  caso = "corriente";
  await pg.reload({ waitUntil: "domcontentloaded" });
  await tarjeta.getByRole("heading", { name: "No debes tiempo" }).waitFor({ timeout: 20000 });

  caso = "nada";
  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { name: /Hola, Ana/ }).waitFor({ timeout: 20000 });
  await dormir(1500);
  assert.equal(await tarjeta.count(), 0, "sin permisos que se reponen no aparece");

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK Inicio: «Debes 1 h 30 min» con detalle (permisos, reposición, condonado), al corriente, oculto sin permisos, solo pide su cuenta");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
