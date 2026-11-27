// Verificación en navegador real (Chromium + Next compilado) de INC-008: «tengo que recargar para ver los cambios de
// asistencia». Asistencias y el Monitor deben verse al día SIN recargar:
//   1) una sola conexión SSE por pantalla y, con «Todas las empresas», suscrita a las empresas del usuario (no a «all»);
//   2) al guardar en la pantalla se recarga TODO lo que depende de las asistencias (tabla y tarjeta, cuenta de horas,
//      «Horas por reponer»), no solo la tabla, y una sola vez;
//   3) un cambio de otro usuario (evento SSE «asistencia») recarga sin el aviso «Nueva checada»;
//   4) con una edición con cambios sin guardar no se recarga nada; al cerrarla, sí;
//   5) con la pestaña oculta no se pide nada; al volver, se recarga una vez;
//   6) «checada» sigue recargando con su aviso; 7) el Monitor también; 8) en celular, con un periodo que NO cabe en la
//      página de 500, también el periodo completo de las tarjetas y filtros (una petición: 27/11/2026, INC-010).
// Mide cuántas peticiones hace un ciclo de refresco. Backend simulado con page.route; EventSource simulado (se emiten
// los eventos desde la prueba); ninguna petición sale a internet. Junta TODOS los defectos antes de fallar.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-refresco-asistencias.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { elegir } from "./lib/desplegable.mjs";

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
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Méndez", id_empleado: 7, empresas: [10],
  empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

const F = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const NORMAL = { tipo: "normal", nombre: "Día normal", pago: "" };
const fila = (id, nombre, apellido, o = {}) => ({
  id, id_empleado: id, id_empresa: 10, nombre, apellido_paterno: apellido, departamento: "Ventas", fecha: F, zona_horaria: "America/Mexico_City",
  // Sin comida programada: 9:00–16:00 son 7 h exactas (sin extra); salir a las 19:00 deja 3 h extra por autorizar.
  hora_entrada_programada: "09:00:00", hora_salida_programada: "16:00:00", hora_salida_comida_programada: null,
  hora_regreso_comida_programada: null, tipo_registro_nombre: "Asistencia", id_tipo_permiso: 1, asistencia: 1, goce_sueldo: 1,
  entrada: `${F} 09:00:00`, salida: `${F} 16:00:00`, dia: NORMAL, checadas_vivas: 1, minutos_trabajados: 420, minutos_comida: 0,
  minutos_extra: 0, minutos_extra_por_autorizar: 0, motivos_resumen: "", estadoAsistencia: "Presente",
  estado_calculado: { clave: "ok", texto: "Asistió", atencion: false }, ...o,
});
// «version» = cuántos cambios hubo en el servidor; cada cambio le pone horas extra por autorizar a una persona más.
let version = 0;
// (INC-010) Celular con periodo paginado: la tabla (página de 500) reporta más registros de los que trae, como en un
// periodo largo; si cabe en la página ya no se descarga el periodo aparte.
let paginarCelular = false;
const CON_EXTRA = [504, 509, 507, 508, 501];
const extra = (id) => (CON_EXTRA.indexOf(id) !== -1 && CON_EXTRA.indexOf(id) <= version
  ? { salida: `${F} 19:00:00`, minutos_extra_por_autorizar: 180, minutos_trabajados: 600 } : {});
const filas = () => [
  fila(501, "Alondra", "Munguía", extra(501)),
  fila(502, "Armando", "González", { id_tipo_permiso: 2, tipo_registro_nombre: "Inasistencia", asistencia: 0, entrada: null, salida: null,
    checadas_vivas: 0, minutos_trabajados: null, estado_calculado: { clave: "falta", texto: "Falta injustificada", atencion: true }, estadoAsistencia: "Ausente" }),
  fila(504, "Mario", "Gómez", extra(504)),
  fila(507, "Diego", "León", extra(507)),
  fila(508, "Rosa", "Díaz", extra(508)),
  fila(509, "Tomás", "Ruiz", extra(509)),
];
const tiposPermiso = [
  { id: 1, nombre: "Asistencia", cuenta_como_asistencia: 1, rol: "asistencia", captura: 1 },
  { id: 2, nombre: "Inasistencia", cuenta_como_asistencia: 0, rol: "inasistencia", captura: 1 },
  { id: 5, nombre: "Día de descanso", cuenta_como_asistencia: 0, goce_sueldo: 1, fijo_ley: 1 },
];
const motivos = { permisos: [], correccion: [{ clave: "olvido", nombre: "Olvidó checar" }, { clave: "reloj", nombre: "Falla del reloj" }] };
const chec = (id, e, s, o = {}) => ({ id, entrada: e, salida: s, entrada_reloj: e, salida_reloj: s, concepto: "jornada", motivo: null,
  origen: "reloj", anulado: false, id_autoriza: null, autoriza_no: false, ...o });

// Peticiones GET al backend, por tipo.
const pedidos = [];
const tipoDe = (p, q) => {
  if (/\/checador\/asistencias$/.test(p)) {
    if (q.get("limit") === "1") return "periodo-conteo"; // Exportar (cargarPeriodoCompleto)
    // (INC-010) El periodo completo de la pantalla va en una petición sin orden (parametrosPeriodo); la tabla siempre
    // lleva sortBy (su página o «Todos» en el Monitor).
    return q.has("sortBy") ? "tabla" : "periodo-completo";
  }
  if (/\/asistencias\/\d+\/reloj$/.test(p)) return "reloj-dia";
  if (/\/asistencias\/\d+\/cambios$/.test(p)) return "historial";
  if (p.endsWith("/cuenta-horas/por-reponer")) return "por-reponer";
  if (p.endsWith("/cuenta-horas")) return "cuenta-horas";
  if (p.includes("/reportes/horas-ley")) return "horas-ley";
  if (p.includes("/horas-extra/")) return "horas-extra";
  if (p.includes("/reloj/asistencia")) return "checadas-dia";
  return null;
};
const desde = (n) => pedidos.slice(n).reduce((c, x) => ({ ...c, [x]: (c[x] ?? 0) + 1 }), {});
const escrituras = [];

const fallas = [];
async function revisar(nombre, fn) {
  try { await fn(); console.log(`  ✔ ${nombre}`); } catch (e) { fallas.push(`${nombre}: ${e.message.split("\n")[0]}`); console.log(`  ✘ ${nombre}: ${e.message.split("\n")[0]}`); }
}
async function esperar(cond, texto, ms = 6000) {
  for (let i = 0; i < ms / 100; i++) { if (await cond()) return; await dormir(100); }
  throw new Error(`No llegó: ${texto}`);
}

const errores = [];
let exito = false;
const browser = await chromium.launch();

async function simular(page) {
  page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base,
      "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (req.method() === "GET") { const t = tipoDe(p, url.searchParams); if (t) pedidos.push(t); }
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/tiposPermiso")) return json({ tiposPermiso });
    if (p.endsWith("/checador/motivos-permiso")) return json({ ok: true, motivos: [] });
    if (p.endsWith("/checador/empleados")) return json({ data: [{ id_empleado: 7, nombre: "Laura", apellido_paterno: "Méndez" }], total: 1 });
    if (p.endsWith("/checador/asistencias") && req.method() === "GET") {
      const regs = filas();
      const limite = Number(url.searchParams.get("limit"));
      const total = paginarCelular && limite === 500 ? regs.length + 1000 : regs.length;
      return json({ registros: limite === 1 ? regs.slice(0, 1) : regs, total, page: 1, aplicarPaginacion: true });
    }
    if (p.endsWith("/cuenta-horas/por-reponer")) return json({ ok: true, data: { filas: [], totales: {} } });
    if (p.endsWith("/checador/cuenta-horas")) return json({ ok: true, data: {} });
    let m = /\/checador\/asistencias\/(\d+)\/reloj$/.exec(p);
    if (m && req.method() === "GET") {
      const f = filas().find((x) => x.id === Number(m[1]));
      return json({ ok: true, asistencia: { id: f.id, id_empleado: f.id, nombre: `${f.nombre} ${f.apellido_paterno}`, departamento: f.departamento, fecha: F },
        horario: { entrada: "09:00", salida: "16:00", salida_comida: null, regreso_comida: null }, dia: NORMAL, motivos, autorizadores: [],
        registros: [chec(7001, `${F} 09:00:00`, `${F} 16:00:00`)],
        resumen: { minutos_trabajados: 420, minutos_comida: 0, minutos_extra: 0, minutos_extra_por_autorizar: 0, checadas_vivas: 1, abierto: false,
          estado: f.estado_calculado, estado_calculado: f.estado_calculado }, migracion: true });
    }
    m = /\/checador\/asistencias\/(\d+)\/estado-dia$/.exec(p);
    if (m && req.method() === "PUT") {
      version += 1;
      escrituras.push(p);
      return json({ ok: true, asistencia: filas().find((x) => x.id === Number(m[1])) });
    }
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
}

// EventSource simulado: guarda cada conexión; la prueba emite los eventos del servidor.
const sseFalso = () => {
  window.__sse = [];
  window.EventSource = class {
    constructor(url) { this.url = String(url); this.oyentes = {}; this.readyState = 1; this.cerrado = false; window.__sse.push(this); }
    addEventListener(nombre, fn) { (this.oyentes[nombre] ??= []).push(fn); }
    removeEventListener() {}
    close() { this.cerrado = true; this.readyState = 2; }
    emitir(nombre) { for (const fn of this.oyentes[nombre] ?? []) fn(new MessageEvent(nombre, { data: "{}" })); }
  };
};
const abiertas = (page) => page.evaluate(() => window.__sse.filter((e) => !e.cerrado).map((e) => e.url));
const emitir = (page, nombre) => page.evaluate((n) => { for (const e of window.__sse.filter((x) => !x.cerrado)) e.emitir(n); }, nombre);
const ocultar = (page, oculta) => page.evaluate((o) => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (o ? "hidden" : "visible") });
  Object.defineProperty(document, "hidden", { configurable: true, get: () => o });
  document.dispatchEvent(new Event("visibilitychange"));
}, oculta);

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  await ctx.addInitScript(sseFalso);
  const page = await ctx.newPage();
  await simular(page);

  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Registros" }).click();
  const filaDe = (n) => page.locator("tr", { hasText: n }).first();
  await filaDe("Armando González").waitFor({ timeout: 30000 });
  // Botón de la franja de resumen («Horas extra N · M por autorizar»), no el encabezado de la columna.
  const botonExtra = page.getByRole("button", { name: /^Horas extra\s*(\d|—)/ }).first();
  const totalExtra = async () => Number(/Horas extra\s*(\d+)/.exec(await botonExtra.innerText())?.[1] ?? NaN);
  await esperar(async () => (await totalExtra()) === 1, "tarjeta «Horas extra 1» al abrir")
    .catch(async (e) => { console.log("Tarjeta:", await botonExtra.innerText().catch(() => "(no está)")); throw e; });
  await dormir(1500);

  console.log("Asistencias:");
  await revisar("1) una sola conexión SSE, a las empresas del usuario (no a «all»)", async () => {
    const urls = await abiertas(page);
    assert.equal(urls.length, 1, `conexiones abiertas: ${urls.length}`);
    assert.match(urls[0], /eventos-checada\?id_empresa=10$/, urls[0]);
  });

  // 2) Guardar en la pantalla: «Día de descanso» a Armando (PUT estado-dia). El servidor ya cuenta 2 con horas extra.
  let n = pedidos.length;
  await elegir(page.getByLabel("Qué pasó de Armando González"), "5");
  // (27/11/2026) Cambiar qué pasó pide «Motivo de la corrección».
  await filaDe("Armando González").getByLabel(/Motivo de la corrección/).fill("Error de captura");
  await filaDe("Armando González").getByRole("button", { name: "OK" }).click();
  await esperar(() => escrituras.length === 1, "PUT estado-dia");
  await dormir(2500);
  const cicloGuardado = desde(n);
  await revisar("2) al guardar se recarga la tabla y su tarjeta de horas extra", async () => {
    assert.ok(cicloGuardado.tabla >= 1, `tabla no recargada: ${JSON.stringify(cicloGuardado)}`);
    assert.equal(await totalExtra(), 2, "la tarjeta sigue con el dato de antes");
  });
  await revisar("2b) al guardar se recargan la cuenta de horas y «Horas por reponer»", async () => {
    assert.ok(cicloGuardado["cuenta-horas"] >= 1, `cuenta de horas: ${JSON.stringify(cicloGuardado)}`);
    assert.ok(cicloGuardado["por-reponer"] >= 1, `por reponer: ${JSON.stringify(cicloGuardado)}`);
  });
  await revisar("2c) un guardado = una vuelta (sin peticiones repetidas)", async () => {
    for (const [k, v] of Object.entries(cicloGuardado)) assert.equal(v, 1, `${k} ×${v}`);
  });

  // 3) Otro usuario cambia algo: el servidor ahora cuenta 3 y llega «asistencia» por el SSE.
  version += 1;
  n = pedidos.length;
  await emitir(page, "asistencia");
  await dormir(2500);
  const cicloSse = desde(n);
  await revisar("3) evento SSE «asistencia» recarga la tabla, la cuenta de horas y «Horas por reponer»", async () => {
    assert.ok(cicloSse.tabla >= 1, `tabla: ${JSON.stringify(cicloSse)}`);
    assert.ok(cicloSse["cuenta-horas"] >= 1 && cicloSse["por-reponer"] >= 1, JSON.stringify(cicloSse));
    assert.equal(await totalExtra(), 3);
  });
  await revisar("3b) sin el aviso «Nueva checada» por un cambio de asistencia", async () => {
    assert.equal(await page.getByText(/Nueva checada recibida/).count(), 0);
  });

  // 4) Edición abierta con cambios sin guardar: no se recarga; al cerrarla sin guardar, sí.
  await page.getByRole("button", { name: "Abrir el reloj de Alondra Munguía" }).click();
  const dlg = page.getByRole("dialog", { name: /Alondra Munguía/ });
  await dlg.locator('[data-renglon="1"]').waitFor({ timeout: 10000 });
  await dlg.locator('[data-renglon="1"]').getByLabel("Entrada").fill("09:10");
  await dormir(500);
  version += 1;
  n = pedidos.length;
  await emitir(page, "asistencia");
  await dormir(2500);
  await revisar("4) con cambios sin guardar no se recarga nada", async () => {
    assert.deepEqual(desde(n), {});
  });
  await page.keyboard.press("Escape");
  const pregunta = page.locator("[data-dialogo-cambios]");
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await dlg.waitFor({ state: "detached", timeout: 10000 });
  await dormir(2500);
  await revisar("4b) al cerrar la edición se hace la recarga pendiente", async () => {
    const c = desde(n);
    assert.ok(c.tabla >= 1, JSON.stringify(c));
    assert.equal(await totalExtra(), 4);
  });

  // 5) Pestaña oculta: nada; al volver, una recarga.
  await ocultar(page, true);
  version += 1;
  n = pedidos.length;
  await emitir(page, "asistencia");
  await emitir(page, "checada");
  await dormir(2500);
  await revisar("5) con la pestaña oculta no se pide nada", async () => { assert.deepEqual(desde(n), {}); });
  await ocultar(page, false);
  await dormir(2500);
  await revisar("5b) al volver a la pestaña se recarga una vez", async () => {
    const c = desde(n);
    assert.equal(c.tabla, 1, JSON.stringify(c));
    assert.equal(await totalExtra(), 5);
  });

  // 6) Checada: recarga y su aviso.
  n = pedidos.length;
  await emitir(page, "checada");
  await dormir(2500);
  const cicloChecada = desde(n);
  await revisar("6) «checada» recarga y avisa «Nueva checada»", async () => {
    assert.ok(cicloChecada.tabla >= 1, JSON.stringify(cicloChecada));
    await page.getByText(/Nueva checada recibida/).first().waitFor({ timeout: 3000 });
  });
  await revisar("6b) sigue habiendo UNA conexión SSE", async () => { assert.equal((await abiertas(page)).length, 1); });

  // 7) Monitor: misma conexión única y recarga por «asistencia».
  console.log("Monitor:");
  await page.goto(base + "/panel/monitor", { waitUntil: "domcontentloaded" });
  await esperar(() => pedidos.slice(-5).includes("tabla") || pedidos.slice(-5).includes("periodo-completo"), "Monitor cargado", 30000);
  await dormir(2000);
  await revisar("7) Monitor: una conexión SSE a la empresa del usuario", async () => {
    const urls = await abiertas(page);
    assert.equal(urls.length, 1, `conexiones: ${urls.length}`);
    assert.match(urls[0], /id_empresa=10$/, urls[0]);
  });
  n = pedidos.length;
  await emitir(page, "asistencia");
  await dormir(2500);
  const cicloMonitor = desde(n);
  await revisar("7b) Monitor: «asistencia» recarga sus registros", async () => {
    assert.ok((cicloMonitor.tabla ?? 0) + (cicloMonitor["periodo-completo"] ?? 0) >= 1, JSON.stringify(cicloMonitor));
  });

  // 8) Celular (página de 500): el periodo completo (tarjetas y filtros) también se recarga con el evento.
  console.log("Asistencias en celular (periodo paginado):");
  const movil = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", timezoneId: "America/Mexico_City", isMobile: true, hasTouch: true });
  await movil.addCookies([{ name: "token", value: token(), url: base }]);
  await movil.addInitScript(sseFalso);
  const cel = await movil.newPage();
  await simular(cel);
  paginarCelular = true;
  const nEntrada = pedidos.length;
  await cel.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await esperar(() => pedidos.slice(-6).includes("periodo-completo"), "periodo completo en celular", 30000);
  await dormir(2000);
  const entradaMovil = desde(nEntrada);
  await revisar("8a) celular: al entrar, una tabla y UN periodo completo (sin conteo aparte)", async () => {
    assert.equal(entradaMovil.tabla, 1, JSON.stringify(entradaMovil));
    assert.equal(entradaMovil["periodo-completo"], 1, JSON.stringify(entradaMovil));
    assert.equal(entradaMovil["periodo-conteo"] ?? 0, 0, JSON.stringify(entradaMovil));
  });
  version += 1;
  n = pedidos.length;
  await emitir(cel, "asistencia");
  await dormir(2500);
  const cicloMovil = desde(n);
  await revisar("8) celular: «asistencia» recarga tabla y periodo completo, una vez cada uno", async () => {
    assert.equal(cicloMovil.tabla, 1, JSON.stringify(cicloMovil));
    assert.equal(cicloMovil["periodo-conteo"] ?? 0, 0, JSON.stringify(cicloMovil));
    assert.equal(cicloMovil["periodo-completo"], 1, JSON.stringify(cicloMovil));
  });
  await revisar("8b) celular: una conexión SSE", async () => { assert.equal((await abiertas(cel)).length, 1); });
  await movil.close();
  paginarCelular = false;

  console.log(`Peticiones por ciclo — guardado: ${JSON.stringify(cicloGuardado)} · SSE asistencia: ${JSON.stringify(cicloSse)} · checada: ${JSON.stringify(cicloChecada)} · Monitor: ${JSON.stringify(cicloMonitor)} · celular: ${JSON.stringify(cicloMovil)}`);
  await revisar("sin errores de JavaScript", async () => { assert.deepEqual(errores, []); });
  if (fallas.length) throw new Error(`${fallas.length} defecto(s):\n - ${fallas.join("\n - ")}`);
  exito = true;
  console.log("OK refresco sin recargar · SSE único a las empresas del usuario · guardado recarga periodo, cuenta y por reponer · evento «asistencia» · no pisa ediciones · pestaña oculta · checada · Monitor");
} finally { await browser.close(); next.kill(); if (!exito) process.exitCode = 1; }
