// Verificación en navegador real (Chromium + Next compilado) del panel de RH en CELULAR (27/11/2026, queja del dueño:
// «le pico a los botones y no reacciona, le pico a Asistencias y tarda muchísimo»). Backend simulado con 200 personas.
// Falla si:
//   1) al entrar a Asistencias se pide más de una vez el mismo endpoint (antes: /checador/asistencias ×4 y
//      /checador/empleados ×2 por limit «Todos»→500, periodo con conteo y detalle con otra empresa);
//   2) al tocar un módulo del menú lateral el <body> sigue con pointer-events:none más de 150 ms después del toque
//      (antes 700–1,500 ms por la animación de cierre de Radix: los toques en esa ventana se perdían);
//   3) abrir el menú dos veces vuelve a pedir la foto del usuario (/users/imagen);
//   4) la portada del muro no decodifica en asíncrono o no declara tamaño, o la foto del aviso emergente no es perezosa.
// CPU=4 emula un teléfono lento (por defecto 1 en CI). Ninguna petición sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-panel-rapido.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const CPU = Number(process.env.CPU || 1);
const LIMITE_BLOQUEO_MS = 150;
const N = 200;
const CAPTURAS = process.env.CAPTURAS || "";

const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function token() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}

const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const registros = Array.from({ length: N }, (_, i) => ({
  id: 2000 + i, id_empleado: 300 + i, nombre: `Persona${i}`, apellido_paterno: "Prueba", apellido_materno: "Larga", nip: String(500 + i),
  departamento: ["Operación", "Ventas", "Almacén"][i % 3], unidad_negocio: "Matriz", zona_horaria: "America/Mexico_City", fecha: hoy,
  tipo_registro_nombre: "Asistencia", id_tipo_permiso: 14, asistencia: 1, goce_sueldo: 1, correccion: 0,
  estadoAsistencia: ["Presente", "Tardanza", "Ausente"][i % 3], hrs_comida: 1, hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00",
  entrada: `${hoy} 08:0${i % 10}:00`, salida: i % 4 ? `${hoy} 17:1${i % 10}:00` : null,
}));
const empleados = registros.map((r) => ({ id_empleado: r.id_empleado, nombre: r.nombre, apellido_paterno: r.apellido_paterno, estado: "Activo" }));
const ARCHIVOS = "https://archivos.prueba.invalid";
const svg = (texto) => `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="700"><rect width="100%" height="100%" fill="#2563EB"/><text x="50%" y="50%" fill="#fff" font-size="80" text-anchor="middle">${texto}</text></svg>`;
const aviso = { id: 77, titulo: "Aviso con foto", tipo: "aviso", nivel: "normal", cuerpo: "Texto del aviso.", publicado_en: new Date().toISOString(), autor: { nombre: "RH" }, adjuntos: [{ id: 1, tipo: "foto", url: `${ARCHIVOS}/aviso.svg`, nombre: "aviso" }] };
let popup = null;

const red = [];
const fallas = [];
const revisar = (nombre, fn) => { try { fn(); console.log(`✓ ${nombre}`); } catch (e) { fallas.push(`${nombre}: ${e.message.split("\n")[0]}`); console.log(`✗ ${nombre}\n   ${e.message.split("\n").slice(0, 3).join("\n   ")}`); } };
const conteo = (desde) => { const c = {}; for (const x of red.slice(desde)) c[x] = (c[x] || 0) + 1; return c; };

const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 300) throw new Error("Next no arrancó");
    await dormir(150);
  }
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  // Toque (touchstart) y cada cambio del estilo del <body>, con su hora, para medir cuánto queda bloqueado. Se lee el
  // estilo en línea (el que pone Radix), no getComputedStyle: forzar el cálculo de estilos en pleno commit infla la medida.
  await ctx.addInitScript(() => {
    window.__toque = null; window.__cuerpo = [];
    addEventListener("touchstart", (e) => { window.__toque = e.timeStamp; }, { capture: true, passive: true });
    const mirar = () => new MutationObserver(() => window.__cuerpo.push({ t: performance.now(), pe: document.body.style.pointerEvents || "auto" }))
      .observe(document.body, { attributes: true, attributeFilter: ["style", "data-scroll-locked"] });
    if (document.body) mirar(); else document.addEventListener("DOMContentLoaded", mirar);
  });
  const page = await ctx.newPage();
  if (CPU > 1) await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: CPU });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.origin === base && url.pathname.startsWith("/api/empresas/check-subscription")) return route.fulfill({ json: { hasActivePlan: true } });
    if (url.origin === ARCHIVOS) return route.fulfill({ status: 200, contentType: "image/svg+xml", body: svg(url.pathname.slice(1)) });
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace(/^\/api/, "");
    red.push(`${req.method()} ${p}`);
    if (p.includes("eventos-checada") || p.endsWith("/stream")) return route.abort();
    await dormir(60);
    const json = (data) => route.fulfill({ json: data, headers: cors });
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/asistencias") && req.method() === "GET") return json({ registros, total: N, page: 1, aplicarPaginacion: true, total_presentes: N, total_empleados: N });
    if (p.endsWith("/checador/empleados") && req.method() === "GET") return json({ data: empleados, total: N });
    if (p.endsWith("/checador/tiposPermiso")) return json({ tiposPermiso: [{ id: 14, nombre: "Asistencia" }] });
    if (p.endsWith("/checador/comunicados/muro")) return json({ ok: true, portada: { url: `${ARCHIVOS}/portada.svg`, titulo: "Portada" }, pendientes_confirmar: 0, items: [], siguiente: null });
    if (p.endsWith("/checador/comunicados/popup")) return json({ ok: true, popup });
    if (req.method() === "GET" && /s$|lista|historial/.test(p)) return json([]);
    return json({});
  });

  const trigger = page.locator('[data-sidebar="trigger"]').first();
  const menu = page.locator('[data-mobile="true"]');
  await page.goto(base + "/panel/monitor", { waitUntil: "domcontentloaded" });
  await trigger.waitFor({ timeout: 30000 });
  await dormir(2500);

  // ——— 3) La foto del usuario se pide una vez aunque el menú se abra dos veces ———
  let desde = red.length;
  for (let k = 0; k < 2; k++) {
    await trigger.tap();
    await menu.waitFor({ state: "visible" });
    await dormir(1200);
    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    await dormir(2500); // más que el dedupingInterval de SWR (2 s): si se vuelve a pedir, se cuenta
  }
  const fotos = red.slice(desde).filter((x) => x.startsWith("GET /users/imagen")).length;
  revisar(`abrir el menú 2 veces pide la foto del usuario a lo más una vez (pidió ${fotos})`, () => assert.ok(fotos <= 1));

  // ——— 2) Tocar un módulo: navega y el <body> no se queda bloqueado ———
  const medidas = [];
  for (const [modulo, ruta] of [["Asistencias", /registro-asistencia/], ["Monitor", /\/panel\/monitor/], ["Asistencias", /registro-asistencia/]]) {
    await trigger.tap();
    const item = menu.getByRole("button", { name: modulo, exact: true }).first();
    await item.waitFor({ state: "visible" });
    await dormir(700); // menú ya abierto y quieto
    desde = red.length;
    await page.evaluate(() => { window.__toque = null; window.__cuerpo = []; });
    await item.tap();
    await page.waitForURL(ruta, { timeout: 15000 });
    await dormir(LIMITE_BLOQUEO_MS + 100);
    const m = await page.evaluate(() => {
      const t0 = window.__toque;
      const liberado = window.__cuerpo.find((c) => c.t >= t0 && c.pe !== "none");
      const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      return { liberadoMs: liberado ? Math.round(liberado.t - t0) : null, peAhora: getComputedStyle(document.body).pointerEvents,
        velo: Boolean(e?.closest('[data-state="closed"].fixed.inset-0, [data-state="open"].fixed.inset-0')) };
    });
    medidas.push({ modulo, ...m });
    revisar(`menú → ${modulo}: body libre ≤ ${LIMITE_BLOQUEO_MS} ms tras el toque (${m.liberadoMs} ms; ahora pointer-events=${m.peAhora})`, () => {
      assert.equal(m.peAhora, "auto");
      assert.ok(m.liberadoMs !== null && m.liberadoMs <= LIMITE_BLOQUEO_MS, `liberado a los ${m.liberadoMs} ms`);
      assert.equal(m.velo, false, "el velo del menú sigue encima de la página");
    });
    if (modulo === "Asistencias") {
      // ——— 1) Asistencias: una petición por dato al entrar ———
      await page.getByText(`Persona${N - 1} Prueba Larga`).first().waitFor({ timeout: 20000 });
      await dormir(2500); // que terminen los efectos y las consultas secundarias
      const c = conteo(desde);
      // El canal en vivo (EventSource de eventos-checada) se reconecta solo cuando el simulado lo corta: no es una consulta.
      const repetidos = Object.entries(c).filter(([k, v]) => k.startsWith("GET ") && !k.includes("eventos-checada") && v > 1);
      revisar(`entrar a Asistencias: ningún endpoint se pide más de una vez (asistencias ${c["GET /checador/asistencias"] ?? 0}, empleados ${c["GET /checador/empleados"] ?? 0}${repetidos.length ? `; repetidos ${JSON.stringify(Object.fromEntries(repetidos))}` : ""})`, () => {
        assert.deepEqual(repetidos, []);
        assert.equal(c["GET /checador/asistencias"], 1);
      });
      const tarjetas = await page.locator('button:has-text("Prueba Larga")').count();
      revisar(`la lista móvil muestra las ${N} personas (${tarjetas} tarjetas)`, () => assert.equal(tarjetas, N));
    }
  }
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/asistencias-movil.png` });

  // ——— 4) Muro: portada con tamaño y decodificación asíncrona; foto del aviso emergente perezosa ———
  popup = aviso;
  await page.goto(base + "/panel/muro", { waitUntil: "domcontentloaded" });
  const portada = page.locator("[data-portada] img").first();
  await portada.waitFor({ timeout: 20000 });
  const atrib = await portada.evaluate((i) => ({ loading: i.getAttribute("loading"), decoding: i.getAttribute("decoding"), w: i.getAttribute("width"), h: i.getAttribute("height") }));
  revisar(`portada del muro: decoding=async, width/height declarados y sin lazy (es lo primero visible) ${JSON.stringify(atrib)}`, () => {
    assert.equal(atrib.decoding, "async"); assert.ok(Number(atrib.w) > 0 && Number(atrib.h) > 0); assert.notEqual(atrib.loading, "lazy");
  });
  const fotoAviso = page.locator("[data-aviso-emergente] img").first();
  const hayAviso = await fotoAviso.waitFor({ timeout: 15000 }).then(() => true, () => false);
  revisar("aparece el aviso emergente con foto", () => assert.ok(hayAviso));
  if (hayAviso) {
    const a = await fotoAviso.evaluate((i) => ({ loading: i.getAttribute("loading"), decoding: i.getAttribute("decoding"), w: i.getAttribute("width"), h: i.getAttribute("height"), alto: i.getBoundingClientRect().height }));
    revisar(`foto del aviso emergente: loading=lazy, decoding=async, tamaño declarado y alto ≤ 224 px ${JSON.stringify(a)}`, () => {
      assert.equal(a.loading, "lazy"); assert.equal(a.decoding, "async"); assert.ok(Number(a.w) > 0 && Number(a.h) > 0); assert.ok(a.alto <= 224.5);
    });
  }
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/muro-aviso.png` });
  revisar(`sin errores de página (${errores.length})`, () => assert.deepEqual(errores, []));
  if (CAPTURAS) fs.writeFileSync(`${CAPTURAS}/medidas.json`, JSON.stringify({ cpu: CPU, medidas, fallas }, null, 1));
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
}
if (fallas.length) {
  console.error(`\n${fallas.length} verificación(es) fallaron:\n- ${fallas.join("\n- ")}`);
  process.exit(1);
}
console.log("\nPanel en celular: OK");
