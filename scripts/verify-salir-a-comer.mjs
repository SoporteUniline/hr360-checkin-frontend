// Verificación en navegador del botón «Salir a comer» (23/11/2026). Backend simulado.
// 1) Reloj del empleado por código: el servidor pide decisión → «¿Sales a comer?» con «Salir a comer» / «Registrar salida»;
//    al elegir comida se manda action=salida_comida y se ve «Salida a comer registrada».
// 2) Inicio de la app: si está en comida, anillo con el contador, hora de regreso y «Regresé de comer».
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-salir-a-comer.mjs
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
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, n) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${n}.png` }) : null);
const usuario = { tipo_usuario: "Empleado", esEmpleado: true, id_usuario: 101, id_empleado: 101, id_empresa: 10, empresas: [10], nombre: "Ana Torres", zona_horaria: "America/Mexico_City" };
function token() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ ...usuario, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
// Hace 20 minutos, en hora del centro de México.
const hace20 = new Date(Date.now() - 20 * 60000 - 6 * 3600000).toISOString().slice(0, 19).replace("T", " ");
const acciones = [];
let exito = false;
const errores = [];
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));
  if (process.env.DEPURAR) pg.on("request", (r) => { if (["script", "document"].includes(r.resourceType())) console.log("REQ", r.resourceType(), r.url().slice(0, 150)); });
  if (process.env.DEPURAR) pg.on("pageerror", (e) => console.log("PAGEERROR", e.message, (e.stack || "").split("\n").slice(0, 3).join(" | ")));
  if (process.env.DEPURAR) pg.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 200)); });
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  await pg.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.origin !== base && url.hostname !== "api.prueba.invalid") return route.abort(); // nada sale a internet (p. ej. Google Maps)
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (d) => route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(d) });
    const p = url.pathname.replace(/^\/api/, "");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.includes("/check-subscription/") || p.endsWith("/check-status")) return json({ hasActivePlan: true, slug: "prueba" });
    if (p.endsWith("/offline/perfil")) return json({ id_empleado: 101, id_empresa: 10, nombre: "Ana Torres", metodo: "codigo", metodo_chequeo: "Código", cierre_turno: "Automático", checar_gps: false, prepared_at: new Date().toISOString() });
    if (p.endsWith("/slug")) return json({ slug: "prueba" });
    if (p.endsWith("/offline/empresa/perfil")) return json({ scope: "company", id_empresa: 10, slug: "prueba", nombre: "Empresa prueba", grant: "concesion-prueba", prepared_at: new Date().toISOString() });
    if (p.endsWith("/sincronizar")) {
      const ev = req.postDataJSON();
      acciones.push(ev.action);
      if (ev.action === "auto") return json({ requiereDecision: true, opciones: ["salida_comida", "salida"], message: "¿Sales a comer o terminas tu jornada?", empleado: { nombre: "Ana", apellido_paterno: "Torres" } });
      return json({ id: ev.id, status: "synced", action: ev.action, message: "Salida a comer registrada. ¡Buen provecho!", employee: { id: 101, nombre: "Ana Torres" } });
    }
    if (p.endsWith("/registros-del-dia-empleado")) return json({ registrosHoy: [{ id: 1, entrada: "2026-11-23 08:02:00", salida: hace20, tipo_cierre: "comida", estado: "Abierto" }], activosHoy: 0, totalRegistrosHoy: 1, zona_horaria: "America/Mexico_City", comida: { salida: hace20, regreso: null, minutos: null, minutos_programados: 60, excedente: null, en_comida: true } });
    return json({ data: [], results: [], total: 0 });
  });

  // 1) Reloj por código.
  await pg.goto(base + "/empleado/reloj-checador", { waitUntil: "domcontentloaded" });
  const codigoTab = pg.getByRole("button", { name: /^Código$/ }).first();
  await codigoTab.waitFor({ timeout: 30000 });
  if (await codigoTab.isEnabled()) await codigoTab.click();
  // Hay dos formularios de código (escritorio y teléfono): se usa el visible.
  const codigo = pg.getByPlaceholder("Ingresa tu código").filter({ visible: true }).first();
  await dormir(2500); // la pantalla del reloj termina de prepararse (perfil sin conexión) y se vuelve a pintar
  await codigo.fill("123");
  assert.equal(await codigo.inputValue(), "123");
  await codigo.press("Enter");
  await pg.getByRole("heading", { name: "¿Sales a comer?" }).waitFor({ timeout: 20000 });
  await pg.getByRole("button", { name: "Registrar salida" }).waitFor();
  await captura(pg, "reloj-pregunta");
  await pg.getByRole("button", { name: "Salir a comer" }).click();
  await pg.getByText(/Salida a comer registrada/).first().waitFor({ timeout: 20000 });
  assert.deepEqual(acciones.slice(0, 2), ["auto", "salida_comida"]);
  await captura(pg, "reloj-registrada");

  // 2) Inicio de la app con el contador.
  await pg.goto(base + "/empleado/panel/inicio", { waitUntil: "domcontentloaded" });
  const tarjeta = pg.getByRole("region", { name: "Estás en comida" });
  await tarjeta.waitFor({ timeout: 30000 });
  const t1 = await tarjeta.getByRole("timer").innerText();
  assert.match(t1, /^00:(19|20|21):\d\d$/, `contador: ${t1}`);
  await pg.waitForFunction((anterior) => document.querySelector('[role="timer"]')?.textContent !== anterior, t1, { timeout: 5000 });
  await tarjeta.getByText(/regresa a las/).waitFor();
  await tarjeta.getByRole("link", { name: "Regresé de comer" }).waitFor();
  assert.equal(await pg.getByRole("link", { name: "Checar entrada o salida" }).count(), 0, "en comida no se ofrece «Checar entrada o salida»");
  assert.ok(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sin desborde");
  await captura(pg, "inicio-comida");
  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK salir a comer: el reloj pregunta y manda salida_comida; la app muestra el contador de comida con hora de regreso");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
