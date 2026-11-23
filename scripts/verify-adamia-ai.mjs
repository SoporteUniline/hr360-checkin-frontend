// Verificación DE PUNTA A PUNTA de Adamia AI (23/11/2026): navegador → panel → backend real (/api/checador/ia con la LFT
// oficial en MariaDB de prueba) → IA real (Gemini). Solo la sesión es simulada (ver backend scripts/servidor-prueba-ia.cjs).
// Revisa: RH no la puede encender, el dueño sí; la respuesta cita artículos y se pueden leer; historial; un empleado no
// ve el botón; en teléfono el panel cabe.
// Uso:
//   NEXT_PUBLIC_RUTA_BACKEND=http://127.0.0.1:4011/api npm run build
//   BACKEND_DIR=../hr360-checkin-backend IA_TEST_DB=ia_e2e NOMINA_TEST_USER=u NOMINA_TEST_PASSWORD=p [IA_SIMULADA=1 | GEMINI_API_KEY=…] node scripts/verify-adamia-ai.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const BACKEND_DIR = path.resolve(process.env.BACKEND_DIR || "../hr360-checkin-backend");
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png` }) : null);

const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (payload) => { const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 })}`; return `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`; };
const EMPRESA = [{ id_empresa: 7, nombre: "Restaurante Prueba" }];
const DUENO = { tipo_usuario: "Recruiter", id_usuario: 1, nombre: "Dueño Prueba", empresas: [7], empresas_detalle: EMPRESA };
const RH = { tipo_usuario: "Recruiter", esAcceso: true, id_usuario: 1, nombre: "Rosa RH", empresas: [7], empresas_detalle: EMPRESA };
const ANA = { tipo_usuario: "Empleado", id_empleado: 15, id_usuario: 15, nombre: "Ana Torres", id_empresa: 7, empresas: [7] };

const backend = spawn(process.execPath, ["scripts/servidor-prueba-ia.cjs"], { cwd: BACKEND_DIR, env: { ...process.env, PUERTO: "4011", ORIGEN: base, DISABLE_CRONS: "true" }, stdio: ["ignore", "pipe", "pipe"] });
let salidaBackend = "";
backend.stdout.on("data", (d) => { salidaBackend += d; });
backend.stderr.on("data", (d) => { salidaBackend += d; });
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });

let exito = false;
const errores = [];
const browser = await chromium.launch();
const sesion = async (usuario, viewport = { width: 1440, height: 950 }) => {
  const ctx = await browser.newContext({ viewport, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: jwt(usuario), url: base }]);
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));
  return pg;
};
try {
  for (let i = 0; !salidaBackend.includes("LISTO"); i++) { if (i > 300) throw new Error(`El backend de prueba no arrancó:\n${salidaBackend}`); await dormir(100); }
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  // 1) RH abre Adamia AI: no está activa y no la puede encender.
  const rh = await sesion(RH);
  await rh.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  await rh.getByRole("button", { name: "Adamia AI" }).click({ timeout: 30000 });
  const panel = rh.getByRole("dialog", { name: "Adamia AI" });
  await panel.getByText("Adamia AI no está activa en esta empresa").waitFor({ timeout: 20000 });
  await panel.getByText("Pídele al dueño de la cuenta que la active.").waitFor();

  // 2) El dueño la activa y pregunta.
  const dueno = await sesion(DUENO);
  await dueno.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  await dueno.getByRole("button", { name: "Adamia AI" }).click({ timeout: 30000 });
  const p2 = dueno.getByRole("dialog", { name: "Adamia AI" });
  await p2.getByRole("button", { name: "Activar Adamia AI" }).click();
  await p2.getByRole("button", { name: /vacaciones le tocan a alguien con 3 años/ }).click({ timeout: 15000 });
  await p2.getByText("Consultando la ley…").waitFor();
  const cita = p2.locator("summary", { hasText: "Art. 76 LFT" });
  await cita.waitFor({ timeout: 60000 });
  const respuesta = await p2.locator(".rounded-bl-sm").first().innerText();
  assert.match(respuesta, /16/, `la respuesta da 16 días: ${respuesta}`);
  await cita.click();
  await p2.getByText(/doce días laborables/).waitFor();
  await p2.getByText(/Uso este mes: \$0\.\d\d de \$5\.00 USD/).waitFor();
  await captura(dueno, "adamia-ai-respuesta");

  // Seguimiento en la misma conversación.
  await p2.getByLabel("Tu pregunta").fill("¿Y cuánto le pagan de prima vacacional?");
  await p2.getByLabel("Tu pregunta").press("Enter");
  await p2.locator("summary", { hasText: "Art. 80 LFT" }).waitFor({ timeout: 60000 });
  await p2.getByRole("button", { name: "Historial" }).click();
  await p2.getByRole("button", { name: /vacaciones le tocan/ }).waitFor();
  await captura(dueno, "adamia-ai-historial");

  // 3) Un empleado no ve el botón.
  const ana = await sesion(ANA, { width: 390, height: 844 });
  await ana.goto(base + "/empleado/panel/inicio", { waitUntil: "domcontentloaded" });
  await dormir(3000);
  assert.equal(await ana.getByRole("button", { name: "Adamia AI" }).count(), 0, "un empleado no la ve");

  // 4) Teléfono: el panel cabe sin desbordar.
  const movil = await sesion(DUENO, { width: 390, height: 844 });
  await movil.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  await movil.getByRole("button", { name: "Adamia AI" }).click({ timeout: 30000 });
  const p3 = movil.getByRole("dialog", { name: "Adamia AI" });
  await p3.getByLabel("Tu pregunta").waitFor({ timeout: 20000 });
  await dormir(800); // termina la animación del panel
  const caja = await p3.boundingBox();
  assert.ok(Math.round(caja.x) === 0 && Math.round(caja.width) === 390, `ocupa todo el ancho del teléfono: ${JSON.stringify(caja)}`);
  assert.ok(await movil.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "sin desborde horizontal");
  assert.ok(caja.width <= 390 && caja.x >= 0, `cabe en el teléfono: ${JSON.stringify(caja)}`);
  await captura(movil, "adamia-ai-movil");

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK Adamia AI de punta a punta: RH no la enciende, el dueño sí; respuesta citando Art. 76 (16 días) y Art. 80; historial; empleado sin botón; cabe en teléfono");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  backend.kill();
  if (!exito) { process.exitCode = 1; console.error(salidaBackend.split("\n").filter((l) => !l.includes("QUERY")).slice(-15).join("\n")); }
}
