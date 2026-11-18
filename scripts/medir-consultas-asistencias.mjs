// Medición en navegador real: qué consultas hace Asistencias al abrirse y mientras está abierta.
// ESPERA=65000 mide un minuto con la vista abierta (la cola del reloj se sincroniza cada 30 s).
// Todas las respuestas del backend son sintéticas; ninguna petición sale a internet.
// Uso: npm run build && [ESPERA=65000] node scripts/medir-consultas-asistencias.mjs
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

// 25 registros: 0 = día normal con comida; 1 = nocturno bien guardado; 2 = nocturno viejo (salida mismo día); resto normales.
const registros = Array.from({ length: 25 }, (_, i) => ({
  id: 1000 + i, id_empleado: 200 + i, nombre: `Empleado${i}`, apellido_paterno: "Prueba", apellido_materno: "",
  nip: String(100 + i), departamento: "Operación", unidad_negocio: "Matriz", zona_horaria: "America/Mexico_City",
  fecha: "2026-11-13", tipo_registro_nombre: "Asistencia", id_tipo_permiso: 14, asistencia: 1, correccion: 0,
  estadoAsistencia: "Presente", hrs_comida: 1,
  hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00",
  entrada: "2026-11-13 08:07:00", salida: "2026-11-13 17:20:00",
}));
Object.assign(registros[1], { nombre: "Nocturno", hrs_comida: 0, hora_entrada_programada: "22:00:00", hora_salida_programada: "05:00:00", entrada: "2026-11-13 22:00:00", salida: "2026-11-14 05:00:00" });
Object.assign(registros[2], { nombre: "NocturnoViejo", hrs_comida: 0, hora_entrada_programada: "22:00:00", hora_salida_programada: "05:00:00", entrada: "2026-11-13 22:00:00", salida: "2026-11-13 05:00:00" });
Object.assign(registros[4], { nombre: "Calendario", fecha: "2026-11-16", entrada: "2026-11-16 08:07:00", salida: "2026-11-16 17:20:00", es_domingo: 1, es_festivo: 0 });
// Horas extra: por autorizar (18:42), autorizada (19:20) y no autorizada (reloj 18:15 → 17:00).
Object.assign(registros[5], { nombre: "Extra", salida: "2026-11-13 18:42:00" });
Object.assign(registros[6], { nombre: "Autorizada", salida: "2026-11-13 19:20:00", hrs_extra: 1, extras_autorizadas_por: 9,
  nombre_extra_autorizador: "Laura", apellido_paterno_extra_autorizador: "Gómez", forma_pago_extras: "Pago de horas extras", notas_hrs_extra: "Inventario" });
Object.assign(registros[7], { nombre: "NoAut", salida: "2026-11-13 17:00:00", correccion: 1, valores_originales: JSON.stringify({ salida: "2026-11-13 18:15:00" }) });
Object.assign(registros[3], { nombre: "Editado", correccion: 1, valores_originales: JSON.stringify({ salida: "2026-11-13 13:19:00", id_tipo_permiso: 2 }) });


// Medición: consultas al backend al ABRIR la vista (sin interactuar), 3 s de espera.
const pedidos = [];
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  await page.addInitScript(() => { const d = window.dispatchEvent.bind(window); window.__eventos = []; window.dispatchEvent = (e) => { if (e.type === "adamia-queue") window.__eventos.push([Math.round(performance.now()), e.detail?.motivo ?? "sin-detalle", (new Error().stack || "").split("\n").slice(2, 5).join(" | ").slice(0, 300)]); return d(e); }; });
  page.on("console", (m) => { if (m.text().startsWith("[medir]")) console.log(m.text()); });
  const t0 = Date.now();
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data) => route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (!p.includes("eventos-checada")) pedidos.push({ t: Date.now() - t0, m: req.method(), p: p.replace(/.*\/api/, "") + (url.search ? url.search.slice(0, 90) : "") });
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/asistencias")) { const limit = Number(url.searchParams.get("limit") || 10); return json({ registros: registros.slice(0, limit), total: registros.length, page: 1, aplicarPaginacion: true }); }
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByText("Empleado0", { exact: false }).first().waitFor({ timeout: 30000 });
  await dormir(Number(process.env.ESPERA || 3000));
  console.log("eventos adamia-queue (ms desde carga):", JSON.stringify(await page.evaluate(() => window.__eventos)));
  console.log("asistencias (ms desde navegación de Playwright, referencia distinta)");
  const conteo = {};
  for (const x of pedidos) { const k = x.m + " " + x.p.split("?")[0]; conteo[k] = (conteo[k] || 0) + 1; }
  console.log(JSON.stringify(conteo, null, 1));
  console.log(pedidos.filter((x) => x.p.startsWith("/checador/asistencias")).map((x) => `${x.t}ms ${x.p}`).join("\n"));
} finally { await browser.close(); next.kill(); }
