// Verificación en navegador: catálogo de jornadas legales del backend conectado. Backend simulado.
// 1) Turnos: un turno de Lun–Sáb 8:00–17:00 con 1 h de comida (48 h) avisa que en 2027 el límite es 46 h; 46 h no avisa.
// 2) App del empleado: tarjeta «Mi semana» con el resumen semanal (programadas null → «Por revisar»).
// Uso: npm run build && node scripts/verify-limite-legal.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, n) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${n}.png` }) : null);
const firmar = (u) => {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ ...u, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
};
const empresa = { id_empresa: 10, nombre: "Uniline", nombre_empresa: "Uniline", estado: "Activo", zona_horaria: "America/Mexico_City" };
const rh = { tipo_usuario: "Recruiter", id_usuario: 5, id_empresa: 10, nombre: "Laura Gómez", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const empleado = { tipo_usuario: "Empleado", esEmpleado: true, id_usuario: 101, id_empleado: 101, id_empresa: 10, empresas: [10], nombre: "Ana Torres", zona_horaria: "America/Mexico_City" };
const regla2027 = { id: 2, vigencia_desde: "2027-01-01", vigencia_hasta: "2027-12-31", minutos_ordinarios_semanales: 2760, minutos_extra_transitorios_semanales: 540 };
const pedidos = [];
let exito = false;
const errores = [];
const browser = await chromium.launch();

async function contexto(usuario, opciones) {
  const ctx = await browser.newContext({ locale: "es-MX", timezoneId: "America/Mexico_City", ...opciones });
  // Como en las otras verificaciones del panel: el token firmado no lleva la empresa (la revisión de suscripción
  // del servidor de Next no se puede simular); el perfil completo llega por /users/verify/token.
  const sesion = usuario.tipo_usuario === "Empleado" ? usuario : { tipo_usuario: usuario.tipo_usuario, id_usuario: usuario.id_usuario };
  await ctx.addCookies([{ name: "token", value: firmar(sesion), url: base }]);
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  await pg.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.origin !== base && url.hostname !== "api.prueba.invalid") return route.abort();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (d) => route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(d) });
    const p = url.pathname;
    if (p.includes("/jornadas-legales")) pedidos.push(p + url.search);
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.includes("/check-subscription/") || p.endsWith("/check-status")) return json({ hasActivePlan: true, slug: "prueba" });
    if (p.endsWith("/jornadas-legales/vigente")) return json({ ok: true, fecha: url.searchParams.get("fecha"), data: regla2027 });
    if (p.endsWith("/jornadas-legales/resumen-semanal")) return json({ ok: true, data: { resumen: { trabajadas_minutos: 1500, programadas_minutos: null, diferencia_minutos: null, progreso_porcentaje: null, posibles_extra_minutos: null, extras_autorizadas_minutos: null, regla_legal: regla2027 }, dias: [], alertas: ["HISTORIAL_HORARIO_NO_DISPONIBLE"] } });
    if (p.endsWith("/checador/turnos")) return json({ data: [], total: 0 });
    if (p.endsWith("/registros-del-dia-empleado")) return json({ registrosHoy: [], activosHoy: 0, totalRegistrosHoy: 0, zona_horaria: "America/Mexico_City", comida: null });
    return json({ data: [], results: [], total: 0 });
  });
  return pg;
}

try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  // 1) Turnos.
  const pg = await contexto(rh, { viewport: { width: 1440, height: 950 } });
  await pg.goto(base + "/panel/turnos", { waitUntil: "domcontentloaded" });
  // Con una sola empresa la página ya la tiene elegida (no muestra selector).
  const nuevo = pg.getByRole("button", { name: "Nuevo turno" });
  await nuevo.waitFor({ timeout: 30000 });
  await pg.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Nuevo turno") && !b.disabled), null, { timeout: 15000 });
  await nuevo.click();
  const dialogo = pg.getByRole("dialog");
  await dialogo.getByRole("button", { name: "Lun–Sáb" }).click();
  const horas = dialogo.locator('input[type="time"]');
  await horas.nth(0).fill("08:00"); await horas.nth(1).fill("13:00"); await horas.nth(2).fill("14:00"); await horas.nth(3).fill("17:00");
  await dialogo.getByRole("button", { name: "Aplicar horario" }).click();
  const aviso = dialogo.locator('[data-aviso-limite-legal="true"]');
  await aviso.waitFor({ timeout: 15000 });
  assert.equal(await aviso.innerText(), "Este horario suma 48 h a la semana y el límite legal de 2027 es 46 h. Las horas de más se cuentan como extra.");
  assert.ok(pedidos.some((x) => /\/jornadas-legales\/vigente\?fecha=\d{4}-\d{2}-\d{2}$/.test(x)), JSON.stringify(pedidos));
  await captura(pg, "turno-aviso-ley");
  // Bajar la salida a 16:40 (Lun–Sáb 7 h 40 min = 46 h) quita el aviso.
  await horas.nth(3).fill("16:40");
  await dialogo.getByRole("button", { name: "Aplicar horario" }).click();
  await aviso.waitFor({ state: "detached", timeout: 10000 });

  // 2) App del empleado.
  const app = await contexto(empleado, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await app.goto(base + "/empleado/panel/inicio", { waitUntil: "domcontentloaded" });
  const semana = app.getByRole("region", { name: "Mi semana" });
  await semana.waitFor({ timeout: 30000 });
  const texto = await semana.innerText();
  assert.match(texto, /Límite legal 2027: 46 h/);
  assert.match(texto, /Trabajadas\s*25 h/);
  assert.match(texto, /Programadas\s*Por revisar/);
  assert.match(texto, /Posibles extra\s*Por revisar/);
  assert.ok(pedidos.some((x) => /resumen-semanal\?fecha=\d{4}-\d{2}-\d{2}$/.test(x)), "el empleado no manda empleadoId: el servidor usa su sesión");
  assert.ok(await app.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sin desborde en teléfono");
  await captura(app, "mi-semana");
  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK límite legal · aviso en Turnos con la regla vigente (48 h vs 46 h en 2027) y sin aviso en 46 h · «Mi semana» con resumen semanal y «Por revisar»");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
