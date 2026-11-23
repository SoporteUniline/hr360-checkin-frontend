// Verificación en navegador del Reporte de horas con la LFT (backend simulado, nada sale a internet).
// Uso: npm run build && node scripts/verify-reporte-horas.mjs
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
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
const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
const token = `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;

const empresa = { id_empresa: 10, nombre: "Uniline", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Gómez", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const empleados = [{ id_empleado: 200, nombre: "Ana", apellido_paterno: "Torres", puesto: "Operador", unidad_negocio: "Uniline", nombre_empresa: "Uniline" },
  { id_empleado: 201, nombre: "Iván", apellido_paterno: "Delgado", puesto: "Operador", unidad_negocio: "Uniline", nombre_empresa: "Uniline" }];
const semana = { inicio: "2027-01-18", fin: "2027-01-24", limite: 2760, topeDoble: 540, trabajado: 3180, programado: 2880, autorizadas: 660, porAutorizar: 0,
  diasConExtra: 5, dobles: 540, triples: 120, alertas: ["Su horario (48 h) pasa el límite legal (46 h)", "Más de 9 h extra: 2 h al triple"] };
const dia = (fecha, min, ley) => ({ fecha, entrada: `${fecha} 08:00:00`, salida: `${fecha} 17:00:00`, horasHM: `${Math.floor(min / 60)}:00`, minutosDia: min,
  hrsExtra: ley.estadoExtra === "autorizada", estado: min ? "Presente" : "Descanso", motivo: null, notas: null, movimientos: [], ley: { programado: 480, alertas: [], ...ley } });
const reporte = (e, conExtra) => ({ empleado: { ...e, nombre_empleado: `${e.nombre} ${e.apellido_paterno}` }, periodo: { inicio: "2027-01-18", fin: "2027-01-24" },
  dias: [{ ...dia("2027-01-18", 600, conExtra ? { extraMin: 120, estadoExtra: "autorizada" } : { extraMin: 0, estadoExtra: "sin" }),
    comida: { salida: "2027-01-18 14:00:00", regreso: "2027-01-18 15:10:00", minutos: 70, minutos_programados: 60, excedente: 10 } },
    dia("2027-01-19", 660, conExtra ? { extraMin: 300, estadoExtra: "autorizada", alertas: ["Más de 4 h extra"] } : { extraMin: 60, estadoExtra: "pendiente" })],
  resumen: { totalHoras: "53:00", horasExtrasLaboradas: "11:00", diasTrabajados: 6, promedioHoras: "8:50", comida: { minutos: 70, dias: 1, veces_excedio: 1, minutos_excedidos: 10 } },
  ley: conExtra ? { dias_sin_historial: 2, trabajado: 3180, programado: 2880, autorizadas: 660, dobles: 540, triples: 120, porAutorizar: 0, alertas: [...semana.alertas, "Más de 4 h extra"], semanas: [semana] }
    : { trabajado: 2460, programado: 2400, autorizadas: 0, dobles: 0, triples: 0, porAutorizar: 60, alertas: [], semanas: [{ ...semana, trabajado: 2460, programado: 2400, autorizadas: 0, dobles: 0, triples: 0, porAutorizar: 60, alertas: [] }] } });

const pedidos = [];
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, locale: "es-MX", timezoneId: "America/Mexico_City", acceptDownloads: true });
  await ctx.addCookies([{ name: "token", value: token, url: base }]);
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data) => route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (p.includes("/checador/reportes/")) pedidos.push({ ruta: p, params: url.search, token: req.headers().authorization || "" });
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/empleados")) return json({ data: empleados, total: empleados.length });
    if (p.endsWith("/checador/empleados/puestos")) return json([{ nombre_puesto: "Operador" }]);
    if (p.endsWith("/checador/sucursales")) return json({ sucursales: [{ id_sucursal: 1, nombre: "Uniline", id_empresa: 10 }] });
    if (p.endsWith("/checador/reportes/horas-ley")) return json({ ok: true, data: { reglas: [], reportes: [reporte(empleados[0], true), reporte(empleados[1], false)] } });
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
  await page.goto(base + "/panel/reporte-horas", { waitUntil: "domcontentloaded" });
  // En tiempo real: aparece sin pulsar «Generar reporte».
  const resumen = page.getByRole("region", { name: "Resumen de la LFT" });
  await resumen.waitFor({ timeout: 30000 });
  assert.ok(pedidos.length >= 1 && pedidos.every((x) => x.ruta.endsWith("/horas-ley")), JSON.stringify(pedidos));
  assert.match(pedidos[0].params, /empleados=200%2C201|empleados=200,201/);
  assert.match(pedidos[0].token, /^Bearer .+/);
  const textoResumen = await resumen.innerText();
  assert.match(textoResumen, /ordinaria máx\.\s*46 h/);
  assert.match(textoResumen, /9 h\s*dobles\/semana/);
  assert.match(textoResumen, /Extra dobles\s*9 h/i);
  assert.match(textoResumen, /Extra triples\s*2 h/i);
  assert.match(textoResumen, /Empleados con alertas de ley\s*1 de 2/i);
  assert.match(textoResumen, /Ana Torres[\s\S]*Su horario \(48 h\) pasa el límite legal \(46 h\)/);
  assert.match(textoResumen, /Iván Delgado[\s\S]*Sin alertas/);
  // Hoja de Ana: KPIs de ley, columna «Extra / ley» y semana.
  const hoja = page.locator('[data-report-block="true"]').first();
  assert.match(await hoja.locator('[data-summary-section="true"]').innerText(), /EXTRA DOBLES\s*9 h[\s\S]*EXTRA TRIPLES\s*2 h/i);
  assert.match(await hoja.innerText(), /\+5 h[\s\S]*Más de 4 h extra/);
  assert.match(await hoja.innerText(), /extra autorizadas\s*11 h\s*\(9 h dobles, 2 h triples\)/);
  // (23/11/2026) Columna y resumen de comida checada con «Salir a comer».
  assert.match(await hoja.locator("thead").innerText(), /HORAS\s*COMIDA\s*ESTADO/i);
  assert.match(await hoja.innerText(), /2:00 p\.m\.–3:10 p\.m\. · 70 de 60 min · \+10 min/);
  assert.match(await hoja.locator('[data-summary-section="true"]').innerText(), /COMIDA\s*1:10 h/i);
  // (23/11/2026, opción A) Aviso de días medidos con el horario actual (sin historial).
  assert.match(await hoja.locator('[data-sin-historial="true"]').innerText(), /2 días se midieron con el horario actual/);
  const hojaIvan = page.locator('[data-report-block="true"]').nth(1);
  assert.match(await hojaIvan.innerText(), /\+1 h por autorizar/);
  if (OUT) await page.screenshot({ path: OUT + "/reporte-ley.png", fullPage: true });
  // Exportar Excel sigue funcionando.
  const [descarga] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), page.getByRole("button", { name: /Exportar Excel/ }).click()]);
  const excel = (await import("node:fs")).readFileSync(await descarga.path(), "utf8");
  assert.match(excel, /<th>Comida<\/th>/);
  assert.match(excel, /70 de 60 min · \+10 min/);
  assert.deepEqual(errores, [], "sin errores de JavaScript");
  exito = true;
  console.log("OK reporte de horas · una sola llamada /horas-ley con sesión · en tiempo real · banda LFT 2027 · totales · alertas · KPIs y columna «Extra / ley» · semana · columna y resumen de comida · Excel con comida · aviso sin historial");
} finally { await browser.close(); next.kill(); if (!exito) process.exitCode = 1; }
