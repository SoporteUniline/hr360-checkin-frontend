// Verificación en navegador real (Chromium + Next compilado) de Asistencias en CELULAR:
// pestaña «H. extra», aviso en la tarjeta y autorizar / no autorizar / quitar desde el detalle.
// Todas las respuestas del backend son sintéticas; ninguna petición sale a internet.
// Uso: npm run build && node scripts/verify-asistencias-movil.mjs
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
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", id_empleado: 7, empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const reg = (i, extra) => ({
  id: 2000 + i, id_empleado: 300 + i, nombre: `Movil${i}`, apellido_paterno: "Prueba", nip: String(500 + i),
  departamento: "Operación", unidad_negocio: "Matriz", zona_horaria: "America/Mexico_City", fecha: hoy,
  tipo_registro_nombre: "Asistencia", id_tipo_permiso: 14, asistencia: 1, goce_sueldo: 1, correccion: 0, estadoAsistencia: "Presente",
  hrs_comida: 0, hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00",
  entrada: `${hoy} 08:00:00`, salida: `${hoy} 17:00:00`, ...extra,
});
const registros = [
  reg(0, { nombre: "SinExtra" }),
  reg(1, { nombre: "Pendiente", salida: `${hoy} 18:42:00` }),
  reg(2, { nombre: "Autorizada", salida: `${hoy} 19:20:00`, hrs_extra: 1, nombre_extra_autorizador: "Laura", apellido_paterno_extra_autorizador: "Gómez", forma_pago_extras: "Tiempo por tiempo" }),
  reg(3, { nombre: "NoAut", correccion: 1, valores_originales: JSON.stringify({ salida: `${hoy} 18:15:00` }) }),
];
const puts = [];
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/tiposPermiso")) return json({ tiposPermiso: [{ id: 14, nombre: "Asistencia" }] });
    if (p.endsWith("/checador/asistencias") && req.method() === "GET") {
      return json({ registros, total: registros.length, page: 1, aplicarPaginacion: true, total_presentes: 4, total_empleados: 4 });
    }
    if (/\/checador\/asistencias\/\d+$/.test(p) && req.method() === "PUT") {
      puts.push(JSON.parse(req.postData() || "{}"));
      return json({ asistencia: {} });
    }
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
  const esperarPuts = async (n) => { for (let i = 0; i < 60 && puts.length < n; i++) await dormir(100); assert.equal(puts.length, n, JSON.stringify(puts)); };

  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  // (23/11/2026) En celular Asistencias también abre en «Hoy»: la vista móvil de registros está en la pestaña «Registros».
  await page.getByRole("tab", { name: "Registros" }).click();
  await page.getByText("SinExtra Prueba").first().waitFor({ timeout: 30000 });

  // Tarjeta: aviso de horas por autorizar; pestaña «H. extra» con las 3 que tienen tiempo extra.
  await page.getByText("1 h 42 min extra por autorizar").waitFor({ timeout: 10000 });
  const tab = page.getByRole("button", { name: /^H\. extra/ });
  assert.match(await tab.innerText(), /3/);
  await tab.click();
  await page.getByText("SinExtra Prueba").waitFor({ state: "detached", timeout: 10000 });
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/movil-lista.png" });

  // Detalle de la pendiente: forma de pago, nota y Autorizar.
  await page.getByText("Pendiente Prueba").first().click();
  const tarjeta = page.getByRole("region", { name: "Horas extra" });
  await tarjeta.waitFor({ timeout: 10000 });
  assert.match(await tarjeta.innerText(), /Por autorizar[\s\S]*1 h 42 min/);
  await tarjeta.getByLabel("Forma de pago").selectOption("Tiempo por tiempo");
  await tarjeta.getByLabel("Nota de horas extra").fill("Inventario");
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/movil-detalle.png" });
  await tarjeta.getByRole("button", { name: "Autorizar", exact: true }).click();
  await esperarPuts(1);
  assert.deepEqual(puts[0], { hrs_extra: 1, forma_pago_extras: "Tiempo por tiempo", notas_hrs_extra: "Inventario", extras_autorizadas_por: 7 });
  // El detalle se actualiza sin cerrarse.
  await tarjeta.getByText("Autorizadas", { exact: true }).waitFor({ timeout: 10000 });
  await tarjeta.getByRole("button", { name: "Quitar autorización" }).click();
  await esperarPuts(2);
  assert.deepEqual(puts[1], { hrs_extra: 0 });
  await tarjeta.getByRole("button", { name: "No autorizar", exact: true }).click();
  await esperarPuts(3);
  assert.equal(puts[2].salida, `${hoy} 17:00:00`);
  assert.match(puts[2].notas_hrs_extra, /^No autorizadas por RH Prueba · salida del reloj .* 18:42$/);
  await tarjeta.getByText("No autorizadas", { exact: true }).waitFor({ timeout: 10000 });
  await page.getByText("6:42 p.m. reloj").waitFor({ timeout: 10000 });
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/movil-noaut.png" });

  assert.deepEqual(errores, [], "sin errores de JavaScript en la página");
  exito = true;
  console.log("OK celular · pestaña H. extra (3) · aviso en tarjeta · autorizar con forma y nota · quitar · no autorizar (salida 17:00, reloj tachado)");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
