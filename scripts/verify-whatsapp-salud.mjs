// Verificación en navegador de «Salud del agente» y «Salud y cobro» (P7): aviso de la bandeja, pestaña de RH (tarjetas,
// gráfica con tooltip y tabla, errores en lenguaje claro, conversaciones afectadas con «Abrir chat», periodo), sin la
// migración del servidor, teléfono (sin desborde, botones ≥ 44 px) y la tabla del administrador con semáforo.
// Backend simulado: nada sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx \
//      NEXT_PUBLIC_RECRUITMENT_ENABLED=true npm run build
//      CAPTURAS=/ruta/capturas node scripts/verify-whatsapp-salud.mjs
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
const API_ORIGEN = "https://api.prueba.invalid";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");
const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, [REPO + "/node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { cwd: REPO, stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const firmar = (tipo) => {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
};
// Fechas en hora de México («AAAA-MM-DD HH:mm:ss»).
const mx = (msAtras = 0) => new Date(Date.now() - 6 * 3600 * 1000 - msAtras).toISOString().slice(0, 19).replace("T", " ");
const dia = (n) => new Date(Date.now() - 6 * 3600 * 1000 - n * 86400000).toISOString().slice(0, 10);

const reclutadora = { id_usuario: 7, tipo_usuario: "Recruiter", esAcceso: true, nombre: "Laura Gómez", correo: "laura@uniline.mx", id_empresa: 10, empresas: [10], empresas_detalle: [{ id_empresa: 10, nombre: "Uniline" }] };
const admin = { id_usuario: 1, tipo_usuario: "Admin", nombre: "Soporte ADAMIA" };
const ERROR_GOOGLE = "El agente no pudo contestar: IA_ERROR: 500 The model is overloaded. Please try again later.";

const S = { salud: "error", sinMigracion: false };
const pedidos = [];
function respuestaSalud(params) {
  const desde = params.get("desde");
  const n = desde ? Math.round((Date.parse(params.get("hasta")) - Date.parse(desde)) / 86400000) + 1 : 7;
  const serie = Array.from({ length: n }, (_, i) => ({ fecha: dia(n - 1 - i), turnos: i % 3 === 0 ? 0 : 6 + i, respondidos: i % 3 === 0 ? 0 : 5 + i, no_contestados: i === n - 1 ? 3 : i % 3 === 0 ? 0 : 1, costo_usd: 0.01 }));
  return {
    desde, hasta: params.get("hasta"),
    resumen: { turnos: 40, respondidos: 33, pasos_persona: 2, fallidos: 3, sin_respuesta: 1, topes: 0, cancelados: 1, pct_respondidos: 89.7, latencia_p50_ms: 2300, latencia_p95_ms: 7800,
      costo_usd: 0.0412, entrevistas_mes: 9, entrevistas_incluidas: 10, entrevistas_extra: 0, costo_mes_usd: 1.37 },
    serie,
    errores: [
      { tipo: "turno_fallido", severidad: "error", total: 3, ultimo_mensaje: ERROR_GOOGLE, ultima_fecha: mx(5 * 60000) },
      { tipo: "envio_fallido", severidad: "error", total: 1, ultimo_mensaje: "Zernio no entregó el mensaje: Zernio respondió 400: número no válido", ultima_fecha: mx(3 * 3600000) },
      { tipo: "herramienta_fallida", severidad: "aviso", total: 2, ultimo_mensaje: "La herramienta agendar_entrevista falló: ER_LOCK_WAIT_TIMEOUT", ultima_fecha: mx(26 * 3600000) },
    ],
    conversaciones: [
      { id_conversacion: 1, id_empresa: 10, contacto: "Ana Ruiz con un nombre larguísimo para probar el recorte en teléfono", telefono: "5215512345678", vacante: "Operador de montacargas turno nocturno", fallas: 2,
        ultimo_error: { tipo: "turno_fallido", mensaje: ERROR_GOOGLE, fecha: mx(5 * 60000) } },
      { id_conversacion: 2, id_empresa: 10, contacto: null, telefono: "5214421234567", vacante: null, fallas: 1, ultimo_error: { tipo: "envio_fallido", mensaje: "Zernio no entregó el mensaje: caído", fecha: mx(3 * 3600000) } },
    ],
  };
}
const adminSalud = {
  empresas: [
    { id_empresa: 10, nombre_empresa: "Uniline", modo: "compartido", estado: "ok", semaforo: "verde", fallas_24h: 0, avisos_24h: 0, ultima_falla: null, costo_mes_usd: 1.37,
      entrevistas_mes: 9, entrevistas_incluidas: 10, entrevistas_extra: 0, precio_mensual: 1000, precio_extra: 50, importe_estimado: 1000 },
    { id_empresa: 12, nombre_empresa: "Transportes Sur de la Península con nombre largo", modo: "propio", estado: "error", semaforo: "rojo", fallas_24h: 5, avisos_24h: 1,
      ultima_falla: { tipo: "turno_fallido", mensaje: ERROR_GOOGLE, fecha: mx(10 * 60000) }, costo_mes_usd: 12.5, entrevistas_mes: 212, entrevistas_incluidas: 200, entrevistas_extra: 12,
      precio_mensual: 499, precio_extra: 1, importe_estimado: 511 },
    { id_empresa: 13, nombre_empresa: "Abarrotes", modo: "compartido", estado: "aviso", semaforo: "ambar", fallas_24h: 1, avisos_24h: 0,
      ultima_falla: { tipo: "envio_fallido", mensaje: "Zernio no entregó el mensaje: x", fecha: mx(2 * 3600000) }, costo_mes_usd: 0.2, entrevistas_mes: 3, entrevistas_incluidas: null, entrevistas_extra: 0,
      precio_mensual: null, precio_extra: null, importe_estimado: null },
  ],
  totales: { costo_mes_usd: 14.07, entrevistas_extra: 12, importe_estimado: 1511, en_rojo: 1 },
  globales: { eventos_24h: 2, ultimo: mx(60000) },
};

async function instalarMocks(ctx, usuario) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base) return json({});
    if (url.origin !== API_ORIGEN) return route.abort();
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    if (p === "/users/verify/token") return json({ user: usuario });
    if (!p.startsWith("/reclutamiento/whatsapp")) return json({});
    const ruta = p.slice("/reclutamiento/whatsapp".length);
    pedidos.push({ ruta, params: url.search });
    const sinMig = () => json({ ok: false, error: "Falta preparar la base de datos de WhatsApp.", codigo: "SIN_MIGRACION" }, 503);
    if (ruta === "/estado") {
      const salud = S.salud === "ok" ? { fallas_24h: 0, ultima_falla: null, estado: "ok" } : { fallas_24h: 3, ultima_falla: { fecha: mx(5 * 60000), tipo: "turno_fallido", mensaje: ERROR_GOOGLE }, estado: S.salud };
      return json({ modo: "compartido", numero_whatsapp: "5215598765432", conversaciones_mes: 12, puede_usar: true, entrevistas_mes: 9, entrevistas_incluidas: 10, entrevistas_extra: 0, plantillas_mes: 0, salud });
    }
    if (ruta === "/conversaciones") return json({ conversaciones: [], total: 0 });
    if (ruta === "/agente") return json({ id_empresa: 10, activo: true, nombre_asistente: "Ana" });
    if (ruta === "/agenda/empresa") return json({ id_empresa: 10, quien_agenda: "califica" });
    if (ruta === "/salud") return S.sinMigracion ? sinMig() : json(respuestaSalud(url.searchParams));
    if (ruta === "/admin/salud") return S.sinMigracion ? sinMig() : json(adminSalud);
    if (ruta === "/admin/empresas") return json([]);
    if (ruta.startsWith("/conversaciones/")) return json({ conversacion: { id: 1, id_empresa: 10, contacto: { nombre: "Ana Ruiz", telefono: "5215512345678" }, modo: "ia", ventana_abierta: true }, mensajes: [] });
    return json({ error: "Ruta no simulada" }, 404);
  });
}

const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const tamano = async (loc) => { const b = await loc.boundingBox(); return b ? Math.min(b.width, b.height) : 0; };
const MOVIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" };
const ESCRITORIO = { viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" };

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch { /* aún no arranca */ } if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];

  // ——— 1. Bandeja con fallas: aviso discreto → «Ver detalle» ———
  const ctx = await browser.newContext(ESCRITORIO);
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctx, reclutadora);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  const aviso = page.locator("[data-aviso-salud]");
  await aviso.waitFor({ timeout: 30000 });
  assert.equal(await aviso.getAttribute("data-aviso-salud"), "rojo");
  assert.match(await aviso.innerText(), /El agente falló 3 veces en las últimas 24 h\s*·\s*Ver detalle/);
  if (OUT) await page.screenshot({ path: OUT + "/salud-01-aviso-bandeja.png" });
  await aviso.getByRole("link", { name: "Ver detalle" }).click();
  await page.waitForURL(/\?vista=salud$/);
  const vistaSalud = page.locator("[data-vista-salud]");
  await vistaSalud.locator("[data-grafica-salud]").waitFor();
  assert.equal(await page.locator("[data-aviso-salud]").count(), 0, "en la pestaña de salud no se repite el aviso");
  assert.equal(await page.getByRole("navigation", { name: "Secciones de WhatsApp" }).getByRole("link", { name: "Salud del agente" }).getAttribute("aria-current"), "page");
  const primeraSalud = pedidos.find((x) => x.ruta === "/salud");
  assert.match(primeraSalud.params, /empresa=10&desde=\d{4}-\d{2}-\d{2}&hasta=\d{4}-\d{2}-\d{2}/);
  // Tarjetas
  const tarjetas = vistaSalud.locator("[data-tarjeta-salud]");
  assert.equal(await tarjetas.count(), 5);
  assert.match(await vistaSalud.locator('[data-tarjeta-salud="respondidos"]').innerText(), /Respondidos[\s\S]*89\.7 %[\s\S]*35 de 39 turnos/);
  assert.match(await vistaSalud.locator('[data-tarjeta-salud="fallas"]').innerText(), /Fallas[\s\S]*4/);
  assert.match(await vistaSalud.locator('[data-tarjeta-salud="tiempo"]').innerText(), /2\.3 s[\s\S]*9 de cada 10 en menos de 7\.8 s/);
  assert.match(await vistaSalud.locator('[data-tarjeta-salud="costo"]').innerText(), /Costo de IA del mes[\s\S]*1\.37 USD/);
  // Gráfica: 7 días, tooltip al pasar, tabla
  const zonas = vistaSalud.locator("[data-grafica-salud] rect[data-dia]");
  assert.equal(await zonas.count(), 7);
  await zonas.nth(6).hover();
  const tip = vistaSalud.locator("[data-tooltip-salud]");
  await tip.waitFor();
  assert.match(await tip.innerText(), /Contestados: \d+[\s\S]*Sin contestar: 3/);
  await vistaSalud.getByText("Ver como tabla").click();
  assert.equal(await vistaSalud.locator("[data-grafica-salud] tbody tr").count(), 7);
  // Errores en lenguaje claro
  const errs = vistaSalud.locator("[data-errores-salud] li");
  assert.equal(await errs.count(), 3);
  assert.match(await errs.nth(0).innerText(), /Falla[\s\S]*La IA no respondió \(Google devolvió: The model is overloaded\. Please try again later\.\)[\s\S]*3 veces · la última hace 5 min/);
  assert.match(await errs.nth(1).innerText(), /WhatsApp no entregó un mensaje \(respuesta: Zernio respondió 400: número no válido\)/);
  assert.match(await errs.nth(2).innerText(), /Aviso[\s\S]*El agente no pudo agendar la entrevista/);
  assert.doesNotMatch(await vistaSalud.innerText(), /IA_ERROR|ER_LOCK|turno_fallido|envio_fallido/, "nada de códigos crudos");
  // Conversaciones afectadas → abrir chat
  const afectadas = vistaSalud.locator("[data-afectadas] li");
  assert.equal(await afectadas.count(), 2);
  assert.match(await afectadas.nth(1).innerText(), /\+52 442 123 4567[\s\S]*Sin vacante/);
  assert.equal(await afectadas.nth(0).getByRole("link", { name: /Abrir chat/ }).getAttribute("href"), "/panel/whatsapp?c=1");
  if (OUT) await page.screenshot({ path: OUT + "/salud-02-rh-escritorio.png", fullPage: true });
  // Periodo de 30 días
  await vistaSalud.getByRole("button", { name: "30 días" }).click();
  await page.waitForFunction(() => document.querySelectorAll("[data-grafica-salud] rect[data-dia]").length === 30);
  assert.equal(await vistaSalud.getByRole("button", { name: "30 días" }).getAttribute("aria-pressed"), "true");
  await afectadas.nth(0).getByRole("link", { name: /Abrir chat/ }).click();
  await page.waitForURL(/\?c=1$/);
  assert.equal(await page.locator("[data-vista-salud]").count(), 0, "abrir el chat sale de la pestaña de salud");

  // ——— 2. Estado ok: sin aviso. Sin migración: mensaje claro ———
  S.salud = "ok";
  await page.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await page.locator("[data-estado-wa]").first().waitFor({ timeout: 30000 });
  await dormir(300);
  assert.equal(await page.locator("[data-aviso-salud]").count(), 0, "estado ok: sin aviso");
  await ctx.close();
  // Contexto nuevo: la caché sin conexión de ADAMIA devolvería la respuesta buena anterior ante un 5xx de la misma URL.
  S.sinMigracion = true;
  const ctxSin = await browser.newContext(ESCRITORIO);
  await ctxSin.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctxSin, reclutadora);
  const pSin = await ctxSin.newPage();
  pSin.on("pageerror", (e) => errores.push(e.message));
  await pSin.goto(base + "/panel/whatsapp?vista=salud", { waitUntil: "domcontentloaded" });
  const alerta = pSin.locator("[data-vista-salud] [role=alert]");
  await alerta.waitFor({ timeout: 30000 });
  assert.match(await alerta.innerText(), /El monitoreo del agente aún no está preparado en el servidor/);
  assert.ok(await pSin.getByRole("button", { name: "Reintentar" }).isVisible());
  S.sinMigracion = false;
  S.salud = "error";
  await ctxSin.close();

  // ——— 3. Teléfono (RH): sin desborde y botones ≥ 44 px ———
  const movil = await browser.newContext(MOVIL);
  await movil.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(movil, reclutadora);
  const tel = await movil.newPage();
  tel.on("pageerror", (e) => errores.push(e.message));
  await tel.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await tel.locator("[data-aviso-salud]").waitFor({ timeout: 30000 });
  assert.ok(await tamano(tel.locator("[data-aviso-salud]").getByRole("link", { name: "Ver detalle" })) >= 44, "«Ver detalle» ≥ 44 px");
  assert.ok(await sinScrollHorizontal(tel), "bandeja con aviso sin scroll horizontal");
  if (OUT) await tel.screenshot({ path: OUT + "/salud-03-movil-aviso.png" });
  await tel.goto(base + "/panel/whatsapp?vista=salud", { waitUntil: "domcontentloaded" });
  await tel.locator("[data-grafica-salud]").waitFor({ timeout: 30000 });
  const nav = tel.getByRole("navigation", { name: "Secciones de WhatsApp" });
  for (const nombre of ["Conversaciones", "Entrevistas", "Salud"]) assert.ok(await tamano(nav.getByRole("link", { name: nombre })) >= 44, `pestaña ${nombre} ≥ 44 px`);
  for (const b of await tel.getByRole("group", { name: "Periodo" }).getByRole("button").all()) assert.ok(await tamano(b) >= 44, "periodo ≥ 44 px");
  for (const l of await tel.locator("[data-afectadas]").getByRole("link").all()) assert.ok(await tamano(l) >= 44, "«Abrir chat» ≥ 44 px");
  assert.ok(await tamano(tel.getByText("Ver como tabla")) >= 44, "«Ver como tabla» ≥ 44 px");
  await tel.locator("[data-grafica-salud] rect[data-dia]").nth(6).tap();
  await tel.locator("[data-tooltip-salud]").waitFor();
  assert.ok(await sinScrollHorizontal(tel), "salud en teléfono sin scroll horizontal");
  const caja = await tel.locator("[data-tooltip-salud]").boundingBox();
  assert.ok(caja.x >= 0 && caja.x + caja.width <= 390, `tooltip dentro de la pantalla: ${JSON.stringify(caja)}`);
  if (OUT) await tel.screenshot({ path: OUT + "/salud-04-movil-rh.png", fullPage: true });
  await movil.close();

  // ——— 4. Administrador: salud y cobro ———
  const ctxA = await browser.newContext(ESCRITORIO);
  await ctxA.addCookies([{ name: "token", value: firmar("Admin"), url: base }]);
  await instalarMocks(ctxA, admin);
  const pa = await ctxA.newPage();
  pa.on("pageerror", (e) => errores.push(e.message));
  await pa.goto(base + "/dashboard/whatsapp", { waitUntil: "domcontentloaded" });
  await pa.getByRole("navigation", { name: "Secciones de WhatsApp" }).waitFor({ timeout: 30000 });
  await pa.getByRole("link", { name: "Salud y cobro" }).click();
  await pa.waitForURL(/\?vista=salud$/);
  const filas = pa.locator("[data-fila-salud]");
  await filas.first().waitFor();
  assert.deepEqual(await filas.evaluateAll((f) => f.map((x) => x.getAttribute("data-fila-salud"))), ["12", "13", "10"], "rojo, ámbar, verde");
  assert.match(await filas.nth(0).innerText(), /Transportes Sur[\s\S]*Fallando[\s\S]*La IA no respondió \(Google devolvió: The model is overloaded[\s\S]*hace 10 min[\s\S]*12\.50 USD[\s\S]*212 \/ 200[\s\S]*12[\s\S]*511/);
  assert.match(await filas.nth(2).innerText(), /Uniline[\s\S]*Bien[\s\S]*Sin fallas[\s\S]*1\.37 USD[\s\S]*9 \/ 10/);
  assert.match(await pa.locator("[data-salud-admin]").innerText(), /Empresas fallando\s*1[\s\S]*Costo de IA del mes\s*14\.07 USD[\s\S]*Entrevistas extra a cobrar\s*12/);
  assert.match(await pa.locator("[data-globales]").innerText(), /2 avisos de WhatsApp con firma inválida/);
  assert.doesNotMatch(await pa.locator("[data-salud-admin]").innerText(), /IA_ERROR|turno_fallido/);
  if (OUT) await pa.screenshot({ path: OUT + "/salud-05-admin-escritorio.png", fullPage: true });
  await ctxA.close();

  const movA = await browser.newContext(MOVIL);
  await movA.addCookies([{ name: "token", value: firmar("Admin"), url: base }]);
  await instalarMocks(movA, admin);
  const ta = await movA.newPage();
  ta.on("pageerror", (e) => errores.push(e.message));
  await ta.goto(base + "/dashboard/whatsapp?vista=salud", { waitUntil: "domcontentloaded" });
  await ta.locator("[data-tarjeta-empresa]").first().waitFor({ timeout: 30000 });
  assert.equal(await ta.locator("[data-tarjeta-empresa]").count(), 3);
  for (const nombre of ["Empresas", "Salud y cobro"]) assert.ok(await tamano(ta.getByRole("link", { name: nombre })) >= 44, `pestaña ${nombre} ≥ 44 px`);
  assert.ok(await sinScrollHorizontal(ta), "admin en teléfono sin scroll horizontal");
  if (OUT) await ta.screenshot({ path: OUT + "/salud-06-admin-movil.png", fullPage: true });
  await movA.close();

  assert.deepEqual(errores, [], "sin errores de página");
  exito = true;
  console.log("OK verify-whatsapp-salud");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
