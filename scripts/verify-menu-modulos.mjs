// Verificación en navegador del menú (23/11/2026): Nómina, Tareas y Checklists son módulos propios; Finiquitos y Aguinaldos
// están en Nómina; las direcciones viejas /panel/tareas?vista=… llevan a la vista nueva. Backend simulado.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-menu-modulos.mjs
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
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png` }) : null);

function token() {
  // Sin id_empresa: el layout de RH no consulta la base de datos (ver panel/layout.jsx).
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}


const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
let exito = false;
const errores = [];
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (data) => route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p === "/checador/tareas/modulo") return json({ activo: false, puede_activar: false });
    return json({});
  });
  const menu = page.locator('[data-sidebar="content"]').first();
  const boton = (t) => menu.getByRole("button", { name: t, exact: true });

  // Dirección vieja → vista nueva del módulo Checklists.
  await page.goto(base + "/panel/tareas?vista=revisar", { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/panel/checklists/revisar", { timeout: 30000 });
  await page.getByRole("heading", { name: "Checklists" }).first().waitFor({ timeout: 30000 });
  await page.goto(base + "/panel/tareas?vista=proyectos", { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/panel/tareas/proyectos", { timeout: 30000 });

  // Menú: tres grupos propios; Finiquitos y Aguinaldos solo una vez (en Nómina).
  for (const g of ["Nómina", "Tareas", "Checklists"]) await boton(g).first().waitFor();
  await boton("Tareas").first().scrollIntoViewIfNeeded();
  await boton("Proyectos").waitFor();
  assert.match(await boton("Proyectos").getAttribute("class"), /text-\[#1d4ed8\]/, "Proyectos resaltado");
  assert.match(await boton("Tareas").first().getAttribute("class"), /text-\[#2563EB\]/, "grupo Tareas activo");
  await page.goto(base + "/panel/aguinaldos", { waitUntil: "domcontentloaded" });
  await boton("Aguinaldos").waitFor({ timeout: 30000 });
  assert.equal(await boton("Aguinaldos").count(), 1);
  assert.equal(await boton("Finiquitos y liquidaciones").count(), 1);
  assert.match(await boton("Nómina").first().getAttribute("class"), /text-\[#2563EB\]/, "Aguinaldos está en el grupo Nómina");
  await captura(page, "menu-nomina");
  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK: menú con Nómina, Tareas y Checklists como módulos; Finiquitos y Aguinaldos en Nómina; direcciones viejas redirigen");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
