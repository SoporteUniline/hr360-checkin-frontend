// Verificación en navegador de Asistencias → En vivo (22/11/2026) con hora fija (10:00 CDMX) y backend simulado.
// Uso: npm run build && node scripts/verify-en-vivo.mjs   (CAPTURAS=carpeta para guardar captura)
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

function token() {
  // Sin id_empresa: el layout de RH no consulta la base de datos (ver panel/layout.jsx).
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}

const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
// Hora fija del navegador: hoy a las 10:00 en Ciudad de México (16:00 UTC, sin horario de verano).
const AHORA = new Date(`${hoy}T16:00:00Z`);
let id = 0;
const reg = (nombre, entra, sale, entrada = null, salida = null, extra = {}) => ({
  id: ++id, id_empleado: id, nombre, apellido_paterno: "Prueba", puesto: "Operador", departamento: "Planta", fecha: hoy, zona_horaria: "America/Mexico_City",
  hora_entrada_programada: entra && `${entra}:00`, hora_salida_programada: sale && `${sale}:00`,
  entrada: entrada && `${hoy} ${entrada}:00`, salida: salida && `${hoy} ${salida}:00`, tipo_registro_nombre: "Asistencia", asistencia: entrada ? 1 : 0, ...extra,
});
const registros = [
  reg("Ana", "09:00", "17:00", "08:58"), // en jornada
  reg("Beto", "10:30", "18:30"), // entra en 30 min
  reg("Carla", "09:00", "17:00"), // va tarde 1 h
  reg("Dani", "06:00", "10:30", "06:00"), // sale en 30 min
  reg("Eva", "06:00", "09:30", "06:00"), // no ha checado salida
  reg("Fer", "07:00", "09:00", "07:00", "09:00"), // ya salió
  reg("Gil", null, null, null, null, { tipo_registro_nombre: "Día de Descanso" }), // descanso
];
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(AHORA);
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  const pedidos = [];
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data) => route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type" } });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/asistencias")) { pedidos.push(url.search); return json({ registros, total: registros.length, page: 1, aplicarPaginacion: false }); }
    if (p.endsWith("/checador/cuenta-horas")) return json({ ok: true, data: { 1: 90 } });
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Hoy" }).click();
  const vivo = page.getByRole("region", { name: "Asistencia en vivo" });
  await vivo.getByText("Ahora 10:00 a.m.").waitFor({ timeout: 30000 });
  // Carga ayer y hoy (turnos nocturnos que siguen abiertos).
  const ayer = new Date(Date.parse(`${hoy}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
  assert.ok(pedidos.some((q) => q.includes(`fechaInicio=${ayer}`) && q.includes(`fechaFin=${hoy}`)), `pide ayer y hoy: ${pedidos.join(" | ")}`);
  const col = (t) => vivo.getByRole("region", { name: t });
  const textoDe = async (t) => (await col(t).innerText()).replace(/\s+/g, " ");
  const entrar = await textoDe("Por entrar");
  assert.match(entrar, /Carla Prueba.*Va tarde · 1 h.*Entra 9:00 a\.m\./);
  assert.match(entrar, /Beto Prueba.*en 30 min.*Entra 10:30 a\.m\./);
  assert.match(await textoDe("En jornada"), /Ana Prueba.*Sale en 7 h.*Entró 8:58 a\.m\./);
  const salir = await textoDe("Por salir");
  assert.match(salir, /Eva Prueba.*No ha checado salida · hace 30 min/);
  assert.match(salir, /Dani Prueba.*Sale en 30 min/);
  assert.match(await textoDe("Debe tiempo"), /Ana Prueba.*1 h 30 min/);
  assert.match((await vivo.innerText()).replace(/\s+/g, " "), /Ya salieron \(1\)/);
  assert.match((await vivo.innerText()).replace(/\s+/g, " "), /Descanso o sin horario hoy \(1\)/);
  if (process.env.CAPTURAS) await page.screenshot({ path: `${process.env.CAPTURAS}/en-vivo.png` });
  // Clic en el renglón: la ventana de edición de ese día, sin salir de En vivo.
  await col("Por entrar").getByRole("button", { name: /Beto Prueba/ }).click();
  await page.getByRole("dialog", { name: /Beto Prueba/ }).getByLabel("Entrada").waitFor({ timeout: 15000 });
  await page.keyboard.press("Escape");
  // Al pasar a «Registros» el rango regresa a «Hoy».
  await page.getByRole("tab", { name: "Registros" }).click();
  await page.getByRole("button", { name: /^Hoy/ }).first().waitFor();
  // Celular: columnas una debajo de otra, sin desborde.
  await page.setViewportSize({ width: 390, height: 844 });
  await dormir(400);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390 + 1), "sin desborde en celular");
  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK en vivo: ayer y hoy, por entrar / va tarde, en jornada, por salir / no checó salida, ya salieron, descanso, debe tiempo, clic → ventana del día, regreso a Hoy, celular");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
