// Verificación en navegador: en el Centro de incidencias las columnas del detalle quedan alineadas
// en todas las filas (mismo inicio de Horario, Entrada, Salida, Nota y Acciones), sin importar
// cuántos botones tenga cada fila. (27/11/2026) Corregir la entrada o la salida pide «Motivo de la corrección»: sin él
// «Guardar» no manda nada y el error sale junto al campo; con él, el PUT lleva motivo_correccion y la pantalla.
// Backend simulado; nada sale a internet.
// Uso: npm run build && node scripts/verify-incidencias-columnas.mjs   (CAPTURAS=carpeta)
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
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Gómez", id_empleado: 7, empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const dia = (n) => new Date(Date.parse(`${hoy}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
const reg = (id, n, o) => ({
  id, id_empleado: 300, nombre: "Diego Alonso", apellido_paterno: "León", apellido_materno: "De Dios", departamento: "Administración",
  unidad_negocio: "Uniline", zona_horaria: "America/Mexico_City", fecha: dia(n), tipo_registro_nombre: "Asistencia",
  hora_entrada_programada: "09:00:00", hora_salida_programada: "18:00:00", hrs_extra: 0, correccion: 0, ...o,
});
const registros = [
  reg(1, 0, { estadoAsistencia: "Ausente", entrada: null, salida: null }),
  reg(2, 1, { estadoAsistencia: "Tardanza", entrada: `${dia(1)} 10:59:00`, salida: `${dia(1)} 16:00:00` }),
  reg(3, 2, { estadoAsistencia: "Tardanza", entrada: `${dia(2)} 09:30:00`, salida: `${dia(2)} 20:44:00` }),
];

const puts = [];
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token, url: base }]);
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data) => route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/asistencias")) return json({ registros, total: registros.length, page: 1, totalPages: 1 });
    if (p.endsWith("/checador/sucursales")) return json({ sucursales: [{ id_sucursal: 1, nombre: "Uniline", id_empresa: 10 }] });
    if (/\/checador\/asistencias\/\d+$/.test(p) && req.method() === "PUT") { puts.push({ id: Number(p.split("/").pop()), cuerpo: req.postDataJSON() }); return json({ asistencia: {} }); }
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
  await page.goto(base + "/panel/incidencias", { waitUntil: "domcontentloaded" });
  await page.getByText("Diego Alonso León De Dios").first().waitFor({ timeout: 30000 });
  await page.getByText("Diego Alonso León De Dios").first().click();
  await page.getByText(/Incidencias de Diego/).waitFor({ timeout: 10000 });
  await dormir(400);

  // Cada fila de incidencia: posición izquierda de cada columna.
  const columnas = await page.evaluate(() => {
    const filas = [...document.querySelectorAll('[class*="xl:grid-cols-[112px_96px"]')].filter((f) => !f.hasAttribute("aria-hidden"));
    return filas.map((f) => [...f.children].map((c) => Math.round(c.getBoundingClientRect().left)));
  });
  assert.ok(columnas.length >= 4, `filas: ${columnas.length}`);
  const titulos = await page.evaluate(() => {
    const t = document.querySelector('[aria-hidden][class*="xl:grid-cols-[112px_96px"]');
    return [...t.children].map((c) => Math.round(c.getBoundingClientRect().left));
  });
  for (const fila of columnas) assert.deepEqual(fila, titulos, "todas las filas alinean con los títulos");
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/incidencias-columnas.png", fullPage: true });

  // Corregir la entrada: aparece el motivo (fuera de la cuadrícula: las columnas siguen alineadas).
  const fila = page.locator('[class*="xl:grid-cols-[112px_96px"]').filter({ has: page.getByRole("button", { name: "Guardar" }) }).first();
  assert.equal(await page.locator("[data-motivo-incidencia]").count(), 0, "sin cambio de horas no se pide motivo");
  await fila.locator('input[type="time"]').first().fill("09:05");
  const campo = page.locator("[data-motivo-incidencia]");
  await campo.waitFor({ timeout: 5000 });
  const columnas2 = await page.evaluate(() => [...document.querySelectorAll('[class*="xl:grid-cols-[112px_96px"]')].filter((f) => !f.hasAttribute("aria-hidden"))
    .map((f) => [...f.children].map((c) => Math.round(c.getBoundingClientRect().left))));
  for (const f of columnas2) assert.deepEqual(f, titulos, "con el motivo abierto las columnas siguen alineadas");
  await fila.getByRole("button", { name: "Guardar" }).click();
  await campo.locator("[data-error-motivo]").waitFor({ timeout: 5000 });
  assert.equal(await campo.locator("[data-error-motivo]").innerText(), "Escribe el motivo de la corrección.");
  assert.equal(puts.length, 0, "sin motivo no se manda el PUT");
  await campo.getByLabel(/Motivo de la corrección/).fill("Olv");
  await fila.getByRole("button", { name: "Guardar" }).click();
  assert.equal(await campo.locator("[data-error-motivo]").innerText(), "El motivo debe tener al menos 5 letras.");
  assert.equal(puts.length, 0);
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/incidencias-motivo.png", fullPage: true });
  await campo.getByRole("button", { name: "Olvidó checar" }).click();
  await fila.getByRole("button", { name: "Guardar" }).click();
  for (let i = 0; i < 50 && !puts.length; i++) await dormir(100);
  assert.equal(puts.length, 1, "con motivo se guarda");
  assert.equal(puts[0].cuerpo.motivo_correccion, "Olvidó checar");
  assert.equal(puts[0].cuerpo.pantalla, "incidencias");
  assert.match(puts[0].cuerpo.entrada, / \d{2}:05:00$/);

  assert.deepEqual(errores, []);
  exito = true;
  console.log(`OK centro de incidencias: ${columnas.length} filas con las 7 columnas alineadas a los títulos · corregir horas pide motivo (sin él no hay PUT)`);
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
