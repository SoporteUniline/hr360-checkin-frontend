// Verificación en navegador real de la pestaña «Horas» de Asistencias: semana legal contra el
// límite de la LFT (se excede / va a pasar / dentro), contadores que filtran y detalle por día.
// Todas las respuestas del backend son sintéticas; ninguna petición sale a internet.
// Uso: npm run build && node scripts/verify-asistencias-horas.mjs
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
const sumar = (f, n) => new Date(Date.parse(`${f}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const lunes = sumar(hoy, -((new Date(`${hoy}T00:00:00Z`).getUTCDay() + 6) % 7));
const domingo = sumar(lunes, 6);
const LIM = 2760;
// Días lunes–sábado programados 8 h (48 h); lo trabajado se reparte en los días hasta hoy.
const reporte = (id, nombre, trabajado, extra = {}) => {
  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = sumar(lunes, i);
    const hastaHoy = fecha <= hoy;
    const nDias = Math.max(1, Math.min(6, Math.round((Date.parse(hoy) - Date.parse(lunes)) / 86400000) + 1));
    return { fecha, minutosDia: hastaHoy && i < 6 ? Math.round(trabajado / nDias) : 0, estado: "Presente",
      ley: { programado: i < 6 ? 480 : 0, extraMin: 0, estadoExtra: "sin", alertas: i === 0 && extra.alertaDia ? [extra.alertaDia] : [] } };
  });
  const real = dias.reduce((t, d) => t + d.minutosDia, 0);
  return { empleado: { id_empleado: id, nombre_empleado: nombre, departamento: "Operación" }, periodo: { inicio: lunes, fin: domingo }, dias, resumen: {},
    ley: { semanas: [{ inicio: lunes, fin: domingo, limite: LIM, topeDoble: 540, trabajado: real, programado: 2880, autorizadas: extra.aut ?? 0, dobles: extra.aut ?? 0, triples: 0, porAutorizar: extra.pend ?? 0, alertas: extra.alertas ?? [] }] } };
};
const reportes = [
  reporte(1, "Excede Prueba", 2900, { alertas: ["Horas extra en más de 4 días"], aut: 120 }),
  reporte(2, "Cerca Prueba", 2000, { pend: 45, alertaDia: "Más de 4 h extra" }),
  reporte(3, "Bien Prueba", 600),
  // 187 más para revisar la tabla con una plantilla real (190 trabajadores).
  ...Array.from({ length: 187 }, (_, i) => reporte(100 + i, `Zeta Relleno ${String(i + 1).padStart(3, "0")}`, 300)),
];
let pedidos = [];
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data) => route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/asistencias")) return json({ registros: [], total: 0, page: 1 });
    if (p.endsWith("/checador/reportes/horas-ley")) { pedidos.push(url.search); return json({ ok: true, data: { reglas: [], reportes } }); }
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Horas", exact: true }).click();
  const vista = page.getByRole("region", { name: "Horas de la semana" });
  await vista.getByRole("row", { name: "Excede Prueba", exact: true }).waitFor({ timeout: 30000 });
  // Pide la semana legal completa que contiene hoy (con «Hoy» elegido arriba).
  assert.match(pedidos[0], new RegExp(`fechaInicio=${lunes}&fechaFin=${domingo}`));
  const texto = await vista.innerText();
  assert.match(texto, /límite LFT:\s*46 h/);
  assert.match(texto, /Se están excediendo\s*1/);
  assert.match(texto, /Con extras por autorizar\s*1/);
  // PC: tabla, una fila por empleado.
  const tabla = vista.getByRole("table");
  const fila = (n) => tabla.getByRole("row", { name: n, exact: true });
  assert.equal(await tabla.locator("tbody tr").count(), 190);
  const alto = await fila("Bien Prueba").evaluate((el) => el.getBoundingClientRect().height);
  assert.ok(alto <= 48, `fila compacta (${alto}px)`);
  assert.equal(await tabla.locator("tbody tr").first().getAttribute("aria-label"), "Excede Prueba", "orden por defecto: más horas arriba");
  assert.match(await fila("Excede Prueba").innerText(), /arriba[\s\S]*Excede[\s\S]*Horas extra en más de 4 días/);
  assert.match(await fila("Bien Prueba").innerText(), /le quedan[\s\S]*En límite[\s\S]*Sin alertas/);
  assert.match(await fila("Cerca Prueba").innerText(), /45 min/);
  // Filtros por contador.
  await vista.getByRole("button", { name: /Se están excediendo/ }).click();
  assert.equal(await tabla.locator("tbody tr").count(), 1);
  await vista.getByRole("button", { name: /Se están excediendo/ }).click();
  assert.equal(await tabla.locator("tbody tr").count(), 190);
  // Ordenar por nombre.
  await tabla.getByRole("button", { name: /Empleado/ }).click();
  assert.equal(await tabla.locator("tbody tr").first().getAttribute("aria-label"), "Bien Prueba");
  // Encabezado fijo al bajar en la tabla.
  await tabla.evaluate((t) => { t.parentElement.scrollTop = 4000; });
  const enc = await tabla.locator("thead").evaluate((t) => t.getBoundingClientRect().top - t.closest("div").getBoundingClientRect().top);
  assert.ok(Math.abs(enc) <= 2, `encabezado fijo (${enc})`);
  await tabla.evaluate((t) => { t.parentElement.scrollTop = 0; });
  // Clic en la fila: alertas de la semana y por día.
  await fila("Cerca Prueba").click();
  await tabla.getByRole("row", { name: "Alertas de Cerca Prueba" }).waitFor({ timeout: 5000 });
  assert.match(await tabla.getByRole("row", { name: "Alertas de Cerca Prueba" }).innerText(), /Más de 4 h extra[\s\S]*Lun \d+: Más de 4 h extra/);
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/pestana-horas.png", fullPage: true });
  assert.deepEqual(errores, [], "sin errores de JavaScript");
  exito = true;
  console.log("OK pestaña Horas · semana legal completa · límite 46 h · se excede / va a pasar / dentro · contadores que filtran · detalle por día · tabla de 190 con orden y encabezado fijo");
} finally { await browser.close(); next.kill(); if (!exito) process.exitCode = 1; }
