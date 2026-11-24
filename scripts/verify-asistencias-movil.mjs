// Verificación en navegador real (Chromium + Next compilado) de Asistencias en CELULAR:
// pestaña «H. extra», aviso en la tarjeta y, desde el detalle, el reloj del día para autorizar la extra.
// (24/11/2026) Los botones Autorizar / No autorizar / Quitar con forma de pago se quitaron: la extra se autoriza en el
// reloj con «¿Quién autoriza?» y lo demás lo decide la ley por semana (detalle en verify-reloj-dia.mjs).
// Todas las respuestas del backend son sintéticas; ninguna petición sale a internet.
// Uso: npm run build && node scripts/verify-asistencias-movil.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { elegir, textosOpciones, valorDe } from "./lib/desplegable.mjs";

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
  reg(1, { nombre: "Pendiente", salida: `${hoy} 18:42:00`, checadas_vivas: 1, minutos_extra: 102, minutos_extra_por_autorizar: 102 }),
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
    if (/\/checador\/asistencias\/\d+\/reloj$/.test(p)) {
      return json({ ok: true, asistencia: { id: 1, nombre: "Pendiente Prueba", departamento: "Operación", fecha: hoy },
        horario: { entrada: "09:00", salida: "17:00", salida_comida: null, regreso_comida: null }, dia: { tipo: "normal", nombre: "Día normal", pago: "" },
        registros: [{ id: 1, entrada: `${hoy} 09:00:00`, salida: `${hoy} 18:42:00`, entrada_reloj: `${hoy} 09:00:00`, salida_reloj: `${hoy} 18:42:00`,
          concepto: "jornada", motivo: null, origen: "reloj", anulado: false, id_autoriza: null, autoriza_no: false }],
        motivos: { permisos: [], correccion: [{ clave: "olvido", nombre: "Olvidó checar" }] }, autorizadores: [{ id: 7, nombre: "RH Prueba" }] });
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
  // En celular Asistencias también abre en «Hoy»: la vista móvil de registros está en la pestaña «Registros».
  await page.getByRole("tab", { name: "Registros" }).click();
  await page.getByText("SinExtra Prueba").first().waitFor({ timeout: 30000 });

  // Tarjeta: aviso de horas por autorizar; pestaña «H. extra» con las 3 que tienen tiempo extra.
  await page.getByText("1 h 42 min extra por autorizar").waitFor({ timeout: 10000 });
  const tab = page.getByRole("button", { name: /^H\. extra/ });
  assert.match(await tab.innerText(), /3/);
  await tab.click();
  await page.getByText("SinExtra Prueba").waitFor({ state: "detached", timeout: 10000 });
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/movil-lista.png" });

  // Detalle de la pendiente: sin forma de pago; el botón morado abre el reloj (hoja a pantalla completa) para separar y autorizar.
  await page.getByText("Pendiente Prueba").first().click();
  const porAutorizar = page.getByRole("button", { name: "1 h 42 min por autorizar: autorizar en el reloj" });
  await porAutorizar.waitFor({ timeout: 10000 });
  assert.equal(await page.getByLabel("Forma de pago").count(), 0, "sin forma de pago");
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/movil-detalle.png" });
  await porAutorizar.click();
  const hoja = page.getByRole("dialog", { name: /Pendiente Prueba/ });
  await hoja.getByRole("button", { name: "Separar 1 h 42 min después de las 5:00 p.m. como hora extra" }).click();
  await elegir(hoja.getByLabel("Quién autoriza"), "7");
  await hoja.getByRole("button", { name: "Guardar" }).waitFor();
  assert.equal(await hoja.getByRole("button", { name: "Guardar" }).isDisabled(), false);
  assert.equal(puts.length, 0, "nada se guarda con el PUT viejo de la asistencia");

  assert.deepEqual(errores, [], "sin errores de JavaScript en la página");
  exito = true;
  console.log("OK celular · pestaña H. extra (3) · aviso en tarjeta · detalle sin forma de pago · «por autorizar» abre el reloj · separar y quién autoriza");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
