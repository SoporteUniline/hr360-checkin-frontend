// Verificación en navegador real (Chromium + Next compilado) del MODO EMPLEADO en celular (28/11/2026, INC-011, queja del
// dueño: «entro en modo empleado y sigue súper trabada, no reacciona cuando le pico a otra vista… ya funcionó después de
// 1 minuto»). Perfil iPhone 13, CPU lenta (CPU=4 por defecto) y backend simulado con respuestas de 1–3 s, una que
// cuelga 45 s y otra que falla. Falla si:
//   1) en el panel del empleado se ejecuta el reconocimiento facial (script de face-api, modelos en memoria y
//      calentamiento de la GPU): antes bloqueaba el hilo principal 3.5 + 1.1 + 2.2 s al abrir la app, y con red lenta
//      a los 55–65 s, cuando el modelo de 6.4 MB terminaba de bajar;
//   2) cambiar de vista con la barra de abajo tarda más de 300 ms desde el toque; el primer toque, recién abierta la app
//      (Next aún no precarga esa pantalla y la pide al tocar), hasta 800 ms. Antes: 4.4–5.8 s el primer toque;
//   3) hay tareas largas de más de 200 ms mientras se navega;
//   4) el reloj checador deja de preparar el reconocimiento al abrirse (los archivos ya descargados se usan ahí).
// Ninguna petición sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-empleado-rapido.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const CPU = Number(process.env.CPU || 4);
const LIMITE_VISTA_MS = 300;
const LIMITE_PRIMER_TOQUE_MS = 800;
const LIMITE_TAREA_MS = 200;
const VUELTAS = Number(process.env.VUELTAS || 2);
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
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Empleado", id_usuario: 15, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 7, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: 15, id_empleado: 15, esEmpleado: true, tipo_usuario: "Empleado", id_empresa: 7, nombre: "Ana Torres", correo: "ana@prueba.invalid", empresas: [7], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const fallas = [];
const revisar = (nombre, fn) => { try { fn(); console.log(`✓ ${nombre}`); } catch (e) { fallas.push(`${nombre}: ${e.message.split("\n")[0]}`); console.log(`✗ ${nombre}\n   ${e.message.split("\n").slice(0, 3).join("\n   ")}`); } };

const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 300) throw new Error("Next no arrancó");
    await dormir(150);
  }
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  // Tareas largas, hora del toque y pasos de la preparación facial (marcas del modo diagnóstico, sin encenderlo).
  await ctx.addInitScript(() => {
    window.__largas = []; window.__pasos = []; window.__toque = 0;
    window.__adamiaDiag = { marca: (n) => window.__pasos.push(n) };
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__largas.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }); })
        .observe({ type: "longtask", buffered: true });
    } catch {}
    addEventListener("touchstart", (e) => { window.__toque = e.timeStamp; }, { capture: true, passive: true });
  });
  const page = await ctx.newPage();
  if (CPU > 1) await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: CPU });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  const estaticos = [];
  page.on("request", (r) => { const u = new URL(r.url()); if (u.origin === base && /^\/(models|vendor\/face-api)\//.test(u.pathname)) estaticos.push(u.pathname); });
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.origin === base && url.pathname.startsWith("/api/empresas/check-subscription")) return route.fulfill({ json: { hasActivePlan: true } });
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace(/^\/api/, "");
    if (p.includes("eventos-checada") || p.endsWith("/stream")) return route.abort();
    const json = (data, status = 200) => route.fulfill({ status, json: data, headers: cors }).catch(() => {});
    // Backend realista: 1–3 s por respuesta (fija por ruta), una que cuelga y otra que falla.
    await dormir(p.endsWith("/users/verify/token") ? 300 : 1000 + (p.length * 37) % 2000);
    if (p.includes("resumen-semanal")) { await dormir(45000); return json({ error: "Tiempo agotado" }, 504); }
    if (p.includes("cuenta-horas")) return json({ error: "Falla simulada" }, 500);
    if (p.endsWith("/users/verify/token")) return json({ user: usuario, modulos: null });
    if (p.includes("registros-del-dia-empleado")) return json({ registrosHoy: [{ id: 1, entrada: `${hoy} 08:02:00`, salida: null, tipo_registro_nombre: "Asistencia" }], zona_horaria: "America/Mexico_City", comida: null });
    if (p.includes("/comunicados/")) return json({ ok: true, portada: null, pendientes_confirmar: 0, items: [], siguiente: null, popup: null });
    if (req.method() === "GET" && /s$|lista|historial/.test(p)) return json([]);
    return json({});
  });

  // ——— Abrir la app y navegar de inmediato por la barra de abajo ———
  await page.goto(base + "/empleado/panel/inicio", { waitUntil: "domcontentloaded" });
  const nav = page.locator('nav[aria-label="Navegación del colaborador"]');
  await nav.waitFor({ timeout: 60000 });
  await page.getByRole("heading", { name: /^Hola/ }).waitFor({ timeout: 30000 });
  const desdeShell = await page.evaluate(() => performance.now());
  const medidas = [];
  const destinos = ["Asistencia", "Solicitudes", "Mi espacio", "Muro", "Inicio"];
  for (let v = 0; v < VUELTAS; v++) {
    for (const nombre of destinos) {
      const link = nav.getByRole("link", { name: new RegExp(`^${nombre}`) }).first();
      const href = await link.getAttribute("href");
      const t0 = Date.now();
      await link.tap();
      await page.waitForFunction((h) => location.pathname === h && document.querySelector(`nav a[href="${h}"][aria-current="page"]`), href, { timeout: 30000, polling: 16 });
      const ms = Date.now() - t0;
      const limite = medidas.length ? LIMITE_VISTA_MS : LIMITE_PRIMER_TOQUE_MS;
      medidas.push({ nombre, ms });
      revisar(`toque en «${nombre}»${limite === LIMITE_PRIMER_TOQUE_MS ? " (primero, recién abierta)" : ""} → cambia la vista en ≤ ${limite} ms (${ms} ms)`, () => assert.ok(ms <= limite));
      await dormir(1200);
    }
  }
  // Que la descarga en segundo plano termine (empieza 10 s después de abrir): si volviera a preparar el rostro, aquí se notaría.
  const finDescarga = Date.now() + 30000;
  while (Date.now() < finDescarga && !estaticos.some((p) => p.includes("face_recognition_model-shard2"))) await dormir(500);
  await dormir(3000);
  const panel = await page.evaluate((desde) => ({
    largas: window.__largas.filter((x) => x.t >= desde), pasos: window.__pasos.slice(), faceapi: typeof window.faceapi,
  }), desdeShell);
  revisar(`sin tareas largas > ${LIMITE_TAREA_MS} ms al navegar (${JSON.stringify(panel.largas.filter((x) => x.d > LIMITE_TAREA_MS))})`, () =>
    assert.deepEqual(panel.largas.filter((x) => x.d > LIMITE_TAREA_MS), []));
  revisar(`el panel no prepara el reconocimiento facial (pasos ${JSON.stringify(panel.pasos)}, window.faceapi ${panel.faceapi})`, () => {
    assert.equal(panel.faceapi, "undefined", "se ejecutó el script de face-api en el panel");
    assert.ok(!panel.pasos.includes("faceapi_warmup_inicio"), "se calentó la GPU en el panel");
  });
  const bajados = new Set(estaticos);
  revisar(`el panel deja descargados los archivos del rostro para el reloj (${bajados.size} archivos)`, () => {
    assert.ok(bajados.has("/vendor/face-api/face-api-0.22.2.min.js"), "no se descargó el script");
    assert.ok([...bajados].some((p) => p.includes("face_recognition_model-shard")), "no se descargó el modelo de huella");
  });

  // ——— El reloj sí prepara el reconocimiento al abrirse ———
  await page.goto(base + "/empleado/reloj-checador", { waitUntil: "domcontentloaded" });
  const listo = await page.waitForFunction(() => window.__pasos.includes("faceapi_listo"), null, { timeout: 120000 }).then(() => true, () => false);
  revisar("al abrir el reloj checador el reconocimiento facial queda listo", () => assert.ok(listo));
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/reloj-empleado.png` });
  revisar(`sin errores de página (${errores.length}${errores.length ? `: ${errores[0]}` : ""})`, () => assert.deepEqual(errores, []));
  if (CAPTURAS) fs.writeFileSync(`${CAPTURAS}/medidas.json`, JSON.stringify({ cpu: CPU, medidas, panel, fallas }, null, 1));
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
}
if (fallas.length) {
  console.error(`\n${fallas.length} verificación(es) fallaron:\n- ${fallas.join("\n- ")}`);
  process.exit(1);
}
console.log("\nModo empleado en celular: OK");
