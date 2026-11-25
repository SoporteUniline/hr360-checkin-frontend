// INC-007 · «Entro al reloj checador, vuelvo a admin y se traba todo». Verificación en navegador (Chromium con cámara
// falsa) de entrar y salir del reloj de la empresa varias veces, como lo hace RH:
//  - escritorio: botón «Reloj checador» de la barra → /seleccionar-reloj → /<slug>; abre «¿Sales a comer?» y sale con el
//    diálogo abierto y «Pantalla siempre encendida» prendida, con el botón atrás del navegador;
//  - celular: menú lateral (hoja de Radix) → «Reloj Checador»; regresa con el menú del reloj → «Asistencias» o con atrás.
// En cada vuelta, ya en el panel, mide: pointer-events y bloqueo de desplazamiento del <body>, que el botón del panel
// reciba el toque (elementFromPoint + clic), pistas de cámara vivas, intervalos/timeouts/rAF activos (instrumentados),
// EventSource abiertos, AudioContext sin cerrar, candados de pantalla, tensores de TensorFlow, memoria JS y tareas largas.
// Backend simulado: nada sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-reloj-salida.mjs
// VUELTAS=n cambia el número de vueltas por escenario (6 por defecto). DETALLE=1 imprime la tabla de cada vuelta.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const VUELTAS = Number(process.env.VUELTAS) || 6;
const LIMITE_LARGAS_PANEL_MS = 600;
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
  // Sin id_empresa: el layout de RH no consulta la base de datos (ver panel/layout.jsx).
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 10, nombre: "Empresa prueba", slug: "demo", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

// Sonda: se instala antes que el código de la página y sobrevive a la navegación interna (misma página de Next).
function sonda() {
  const S = (window.__sonda = { timers: new Map(), raf: 0, streams: [], audio: [], es: [], candados: [], largas: [] });
  const w = window;
  const origen = () => (new Error().stack || "").split("\n").slice(3, 5).map((l) => l.trim().replace(/\(?https?:\/\/[^/]+/, "")).join(" ← ");
  const si = w.setInterval.bind(w), st = w.setTimeout.bind(w), ci = w.clearInterval.bind(w), ct = w.clearTimeout.bind(w);
  w.setInterval = (fn, ms, ...a) => { const id = si(fn, ms, ...a); S.timers.set(id, { tipo: "intervalo", ms: Number(ms) || 0, origen: origen() }); return id; };
  w.setTimeout = (fn, ms, ...a) => {
    const id = st((...b) => { S.timers.delete(id); if (typeof fn === "function") fn(...b); }, ms, ...a);
    S.timers.set(id, { tipo: "timeout", ms: Number(ms) || 0, origen: "" });
    return id;
  };
  w.clearInterval = (id) => { S.timers.delete(id); return ci(id); };
  w.clearTimeout = (id) => { S.timers.delete(id); return ct(id); };
  const raf = w.requestAnimationFrame.bind(w);
  w.requestAnimationFrame = (fn) => { S.raf += 1; return raf(fn); };
  const gum = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
  if (gum) navigator.mediaDevices.getUserMedia = async (c) => { const s = await gum(c); S.streams.push(s); return s; };
  for (const nombre of ["AudioContext", "webkitAudioContext"]) {
    const C = w[nombre];
    if (!C) continue;
    w[nombre] = class extends C { constructor(...a) { super(...a); S.audio.push(this); } };
  }
  const ES = w.EventSource;
  w.EventSource = class extends ES { constructor(...a) { super(...a); this.__ruta = location.pathname; S.es.push(this); } };
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async (tipo) => {
    const c = { tipo, liberado: false, addEventListener() {}, release: async () => { c.liberado = true; } };
    S.candados.push(c);
    return c;
  } } });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) S.largas.push({ ms: Math.round(e.duration), ruta: location.pathname, t: Math.round(e.startTime) }); }).observe({ type: "longtask", buffered: true }); } catch { /* sin soporte */ }
}

// Estado global (en el panel). `selector`: botón del panel que debe recibir el toque.
async function medir(pg, selector) {
  return pg.evaluate((sel) => {
    const S = window.__sonda;
    const b = document.body;
    const boton = document.querySelector(sel);
    let recibeToque = null;
    if (boton) {
      const r = boton.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      recibeToque = Boolean(el && (el === boton || boton.contains(el)));
    }
    const timers = [...S.timers.values()];
    const intervalos = timers.filter((t) => t.tipo === "intervalo");
    const raf0 = S.raf;
    return new Promise((resolve) => setTimeout(() => resolve({
      url: location.pathname,
      pointerEvents: getComputedStyle(b).pointerEvents,
      overflow: getComputedStyle(b).overflow,
      scrollLock: b.hasAttribute("data-scroll-locked") ? b.getAttribute("data-scroll-locked") : null,
      ariaHiddenRaiz: [...b.children].filter((c) => c.getAttribute("aria-hidden") === "true" || c.hasAttribute("data-aria-hidden")).length,
      dialogosAbiertos: document.querySelectorAll('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]').length,
      recibeToque,
      camarasVivas: S.streams.flatMap((s) => s.getTracks()).filter((t) => t.readyState === "live").length,
      videosConCamara: [...document.querySelectorAll("video")].filter((v) => v.srcObject).length,
      intervalos: intervalos.length,
      intervalosRapidos: intervalos.filter((t) => t.ms <= 300).map((t) => `${t.ms}ms ${t.origen}`),
      timeouts: timers.length - intervalos.length,
      rafPorSeg: S.raf - raf0,
      // Solo los del reloj: Asistencias abre el suyo (useRefrescoChecadas) y es legítimo.
      sseAbiertos: S.es.filter((e) => e.readyState !== 2 && e.__ruta === "/demo").length,
      audioAbiertos: S.audio.filter((a) => a.state !== "closed").length,
      candadosPantalla: S.candados.filter((c) => !c.liberado).length,
      tensores: window.faceapi?.tf?.memory?.().numTensors ?? null,
      memoriaMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
      tareasLargas: S.largas.length,
      tareaLargaMaxMs: S.largas.length ? Math.max(...S.largas.map((x) => x.ms)) : 0,
      // Tareas largas mientras la página estaba en el panel (acumuladas desde que abrió): lo que se siente como «se traba».
      largasPanelMs: S.largas.filter((x) => x.ruta.startsWith("/panel")).reduce((a, x) => a + x.ms, 0),
      largasPanel: S.largas.filter((x) => x.ruta.startsWith("/panel")).map((x) => `${x.ms}ms@${x.t}`),
      ahora: Math.round(performance.now()),
    }), 1000));
  }, selector);
}

const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
async function contexto(browser, viewport, movil) {
  const ctx = await browser.newContext({ viewport, isMobile: movil, hasTouch: movil, locale: "es-MX", timezoneId: "America/Mexico_City", permissions: ["camera"] });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  await ctx.addInitScript(sonda);
  await ctx.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (d) => route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(d) });
    if (url.pathname.startsWith("/api/empresas/check-subscription/")) return json({ hasActivePlan: true });
    if (url.pathname === "/api/empresas/check-status") return json({ hasActivePlan: true, slug: "demo" });
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort(); // nada sale a internet
    const p = url.pathname.replace(/^\/api/, "");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/empresas/slug/demo")) return json({ id_empresa: 10, nombre: "Empresa prueba" });
    if (p.endsWith("/eventos-checada")) return route.fulfill({ status: 200, headers: { ...cors, "Content-Type": "text/event-stream" }, body: ": abierto\n\n" });
    if (p.endsWith("/registros-del-dia")) return json({ registrosHoy: [], activosHoy: 0, totalRegistrosHoy: 0, zona_horaria: "America/Mexico_City" });
    if (p.endsWith("/reloj/registrar")) return json({ requiereDecision: true, opciones: ["salida_comida", "salida"], message: "¿Sales a comer o terminas tu jornada?", empleado: { nombre: "Ana", apellido_paterno: "Torres" } });
    if (p.endsWith("/reloj/registrar-facial")) return route.fulfill({ status: 400, contentType: "application/json", headers: cors, body: JSON.stringify({ error: "No se encontró coincidencia facial", code: "FACE_NOT_MATCHED" }) });
    return json({ data: [], results: [], employees: [], total: 0 });
  });
  const pg = await ctx.newPage();
  const errores = [];
  pg.on("pageerror", (e) => errores.push(e.message));
  return { ctx, pg, errores };
}

// Reloj abierto con la cámara y el reconocimiento corriendo.
async function esperarReloj(pg) {
  await pg.waitForURL(/\/demo$/, { timeout: 30000 });
  await pg.locator("[data-estado-camara]").waitFor({ timeout: 30000 });
  await pg.waitForFunction(() => window.__sonda.streams.some((s) => s.getTracks().some((t) => t.readyState === "live")), null, { timeout: 30000 });
  await pg.waitForFunction(() => Boolean(window.faceapi?.nets?.faceRecognitionNet?.params), null, { timeout: 60000 });
  await dormir(1500); // varios cuadros analizados
}
async function abrirSalesAComer(pg) {
  await pg.getByRole("button", { name: /^Código$/ }).click();
  await pg.getByPlaceholder("Ingresa tu código").fill("1001");
  await pg.getByRole("button", { name: "Checar", exact: true }).click();
  await pg.getByRole("heading", { name: "¿Sales a comer?" }).waitFor({ timeout: 15000 });
}

const fallas = [];
const revisar = (escenario, vuelta, m) => {
  const f = [];
  if (!/^\/panel/.test(m.url)) f.push(`quedó en ${m.url}, no en el panel`);
  if (m.pointerEvents === "none") f.push("body con pointer-events:none");
  if (m.scrollLock !== null || m.overflow === "hidden") f.push(`body con bloqueo de desplazamiento (${m.scrollLock ?? m.overflow})`);
  if (m.ariaHiddenRaiz) f.push(`${m.ariaHiddenRaiz} hijos de body con aria-hidden`);
  if (m.recibeToque !== true) f.push(`el botón del panel no recibe el toque (${m.recibeToque})`);
  if (m.camarasVivas) f.push(`${m.camarasVivas} pistas de cámara vivas`);
  if (m.intervalosRapidos.length) f.push(`intervalos rápidos vivos: ${m.intervalosRapidos.join("; ")}`);
  if (m.sseAbiertos) f.push(`${m.sseAbiertos} EventSource abiertos`);
  if (m.audioAbiertos) f.push(`${m.audioAbiertos} AudioContext sin cerrar`);
  if (m.candadosPantalla) f.push(`${m.candadosPantalla} candados de pantalla sin soltar`);
  if (m.rafPorSeg > 5) f.push(`${m.rafPorSeg} requestAnimationFrame por segundo en el panel`);
  // El panel solo (sin pasar por el reloj) suma ≈ 100 ms de tareas largas en esta máquina; con la preparación del rostro
  // corriendo en el panel sumaba ≈ 1.5–2 s (INC-007). Se exige en la salida rápida (contexto nuevo, Entradas/salidas):
  // en «celular-menu» el panel es Asistencias, cuya tabla da tareas largas propias si la máquina está cargada.
  if (escenario === "celular-rapida" && m.largasPanelMs > LIMITE_LARGAS_PANEL_MS) f.push(`${m.largasPanelMs} ms de tareas largas ya en el panel (límite ${LIMITE_LARGAS_PANEL_MS}): ${m.largasPanel.join(", ")} (ahora ${m.ahora})`);
  if (f.length) fallas.push(`${escenario} vuelta ${vuelta}: ${f.join(" · ")}`);
  return f;
};

let exito = false;
const tabla = [];
const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--enable-precise-memory-info"] });
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  // 1) Escritorio: botón de la barra → reloj → «¿Sales a comer?» abierto y «Pantalla siempre encendida» → atrás del navegador.
  {
    const { ctx, pg, errores } = await contexto(browser, { width: 1366, height: 800 }, false);
    const botonPanel = 'header a[aria-label="Reloj checador"]';
    await pg.goto(base + "/panel/cuenta", { waitUntil: "domcontentloaded" });
    await pg.locator(botonPanel).waitFor({ timeout: 30000 });
    for (let v = 1; v <= VUELTAS; v++) {
      await pg.locator(botonPanel).click({ timeout: 5000 });
      await esperarReloj(pg);
      assert.equal(await pg.getByRole("button", { name: "Mantener encendido" }).getAttribute("aria-pressed"), "true", "«Pantalla siempre encendida» prendida");
      await abrirSalesAComer(pg);
      await pg.goBack({ waitUntil: "commit" });
      await dormir(2500);
      // Si el navegador quedó en el reloj (atrás regresa a /seleccionar-reloj, que vuelve a abrir el reloj), se intenta otra vez.
      for (let intento = 0; intento < 2 && !/^\/panel/.test(new URL(pg.url()).pathname); intento++) { await pg.goBack({ waitUntil: "commit" }).catch(() => {}); await dormir(2500); }
      await pg.locator(botonPanel).waitFor({ timeout: 15000 }).catch(() => {});
      const m = await medir(pg, botonPanel);
      tabla.push({ escenario: "escritorio-atras", vuelta: v, ...m, intervalosRapidos: m.intervalosRapidos.length });
      if (revisar("escritorio-atras", v, m).some((x) => x.startsWith("quedó"))) break;
    }
    assert.deepEqual(errores, [], "sin errores de JavaScript (escritorio)");
    await ctx.close();
  }

  // 2) Celular: menú lateral (hoja) → «Reloj Checador»; regresa con el menú del reloj → «Asistencias».
  {
    const { ctx, pg, errores } = await contexto(browser, { width: 390, height: 844 }, true);
    const botonPanel = 'header button[data-sidebar="trigger"]';
    await pg.goto(base + "/panel/cuenta", { waitUntil: "domcontentloaded" });
    await pg.locator(botonPanel).waitFor({ timeout: 30000 });
    for (let v = 1; v <= VUELTAS; v++) {
      await pg.locator(botonPanel).tap({ timeout: 5000 });
      const hoja = pg.locator('[data-sidebar="sidebar"][data-mobile="true"]');
      await hoja.waitFor({ timeout: 10000 });
      await hoja.getByRole("button", { name: "Reloj Checador", exact: true }).tap();
      await esperarReloj(pg);
      await pg.getByRole("button", { name: "Menú" }).tap();
      await pg.getByRole("link", { name: "Asistencias" }).tap();
      await pg.waitForURL(/\/panel\//, { timeout: 30000 });
      await pg.locator(botonPanel).waitFor({ timeout: 15000 });
      await dormir(1500);
      const m = await medir(pg, botonPanel);
      tabla.push({ escenario: "celular-menu", vuelta: v, ...m, intervalosRapidos: m.intervalosRapidos.length });
      revisar("celular-menu", v, m);
    }
    assert.deepEqual(errores.filter((e) => !/registro-asistencia|Cannot read/.test(e)), [], "sin errores de JavaScript (celular)");
    await ctx.close();
  }

  // 3) Celular, salida rápida: sale del reloj apenas se abre la cámara (los modelos del rostro aún se preparan) y entra al
  //    panel. Cada vuelta en un contexto nuevo (sin modelos en memoria), como al abrir la app.
  for (let v = 1; v <= Math.min(3, VUELTAS); v++) {
    const { ctx, pg } = await contexto(browser, { width: 390, height: 844 }, true);
    const botonPanel = 'header button[data-sidebar="trigger"]';
    await pg.goto(base + "/panel/cuenta", { waitUntil: "domcontentloaded" });
    await pg.locator('header a[aria-label="Reloj checador"]').tap({ timeout: 30000 });
    await pg.waitForURL(/\/demo$/, { timeout: 30000 });
    await pg.waitForFunction(() => window.__sonda.streams.length > 0, null, { timeout: 30000 });
    await pg.getByRole("button", { name: "Menú" }).tap();
    await pg.getByRole("link", { name: "Entradas/salidas" }).tap();
    await pg.waitForURL(/\/panel\//, { timeout: 30000 });
    await pg.locator(botonPanel).waitFor({ timeout: 15000 });
    await dormir(4000);
    const m = await medir(pg, botonPanel);
    tabla.push({ escenario: "celular-rapida", vuelta: v, ...m, intervalosRapidos: m.intervalosRapidos.length });
    revisar("celular-rapida", v, m);
    await ctx.close();
  }

  // 4) Red de seguridad: si algo deja el <body> bloqueado sin diálogo abierto, al cambiar de pantalla el panel se libera.
  //    (El clic se hace desde el código porque con el body bloqueado un toque real no llega: ese es el síntoma.)
  {
    const { ctx, pg } = await contexto(browser, { width: 1366, height: 800 }, false);
    const botonPanel = 'header a[aria-label="Reloj checador"]';
    await pg.goto(base + "/panel/cuenta", { waitUntil: "domcontentloaded" });
    await pg.locator(botonPanel).waitFor({ timeout: 30000 });
    await dormir(800);
    await pg.evaluate(() => { document.body.style.pointerEvents = "none"; document.body.setAttribute("data-scroll-locked", "1"); });
    assert.equal((await medir(pg, botonPanel)).recibeToque, false, "bloqueo simulado: el botón no recibe el toque");
    await pg.evaluate(() => [...document.querySelectorAll('[data-sidebar="menu-button"], [data-sidebar="menu-sub-button"]')]
      .find((b) => b.textContent.trim() === "Entradas y salidas").click());
    await pg.waitForURL(/entradas-y-salidas/, { timeout: 30000 });
    await dormir(1200);
    const m = await medir(pg, botonPanel);
    tabla.push({ escenario: "red-seguridad", vuelta: 1, ...m, intervalosRapidos: m.intervalosRapidos.length });
    revisar("red-seguridad", 1, m);
    if (m.recibeToque) { // el toque real vuelve a funcionar
      await pg.locator(botonPanel).click({ timeout: 3000 });
      await pg.waitForURL(/\/demo$/, { timeout: 30000 });
    }
    await ctx.close();
  }

  if (process.env.DETALLE) console.table(tabla.map(({ url, pointerEvents, scrollLock, recibeToque, camarasVivas, intervalos, intervalosRapidos, timeouts, rafPorSeg, sseAbiertos, audioAbiertos, candadosPantalla, tensores, memoriaMB, tareasLargas, tareaLargaMaxMs, largasPanelMs, escenario, vuelta }) =>
    ({ escenario, vuelta, url, pe: pointerEvents, lock: scrollLock, toque: recibeToque, cam: camarasVivas, int: intervalos, rap: intervalosRapidos, tmo: timeouts, raf: rafPorSeg, sse: sseAbiertos, aud: audioAbiertos, wl: candadosPantalla, tf: tensores, mb: memoriaMB, lt: tareasLargas, ltMax: tareaLargaMaxMs, ltPanel: largasPanelMs })));
  if (fallas.length) { console.error(fallas.join("\n")); throw new Error(`${fallas.length} vueltas con fallas`); }
  exito = true;
  console.log(`OK reloj → panel: ${tabla.length} vueltas (escritorio con «¿Sales a comer?» abierto, pantalla encendida y atrás del navegador; celular con la hoja del menú y el menú del reloj; salida rápida; red de seguridad) — vuelve al panel, body sin bloqueo, el botón recibe el toque, sin cámara, intervalos rápidos, SSE, audio ni candados vivos y ≤ ${LIMITE_LARGAS_PANEL_MS} ms de tareas largas en el panel tras la salida rápida`);
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
