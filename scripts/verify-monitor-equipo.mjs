// Verificación en navegador real del «Monitor de mi equipo» (app del empleado) con backend simulado: el jefe ve el menú,
// el estado de hoy de su equipo y el día de una persona en modo lectura; quien no es jefe no ve el menú.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-monitor-equipo.mjs
// CAPTURAS=<carpeta> guarda capturas a 390 y 1440.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = () => { const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ tipo_usuario: "Empleado", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`; };
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { stdio: "ignore", env: { ...process.env, JWT_SECRET: secreto } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const capturas = process.env.CAPTURAS;

// Hoy en CDMX; horario de todo el día para que el estado no dependa de la hora en que corre.
const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const reg = (o) => ({ fecha: hoy, zona_horaria: "America/Mexico_City", tipo_registro_nombre: "Asistencia", asistencia: 1, departamento: "Ventas",
  hora_entrada_programada: "00:00:00", hora_salida_programada: "23:59:00", tramos_checadas: [], tramos_abiertos: 0, permisos_horas_dia: [],
  horas_extra_registradas: [], ...o });
const equipo = [
  reg({ id: 1, id_empleado: 11, nombre: "Ana", apellido_paterno: "Prueba", entrada: `${hoy} 00:01:00`, tramos_abiertos: 1, entrada_tramo_abierto: `${hoy} 00:01:00`,
    permisos_horas_dia: [{ tipo_horas: "sale_antes", hora_inicio: "23:00", hora_fin: "23:59", motivo: "Cita" }],
    horas_extra_registradas: [{ desde: `${hoy} 16:00:00`, hasta: `${hoy} 19:00:00`, minutos: 180, motivo: "Inventario" }] }),
  reg({ id: 2, id_empleado: 12, nombre: "Beto", apellido_paterno: "Ruiz", tipo_registro_nombre: "Vacaciones", asistencia: 0 }),
];

async function rutas(ctx, { esJefe }) {
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  const pedidos = [];
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    const ok = (json, status = 200) => route.fulfill({ status, json, headers: cors });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return ok({ user: { id_usuario: 10, id_empleado: 10, tipo_usuario: "Empleado", nombre: "Jefa Prueba", id_empresa: 7, empresas: [7] } });
    if (p === "/checador/mi-equipo/hoy") {
      pedidos.push(url.search);
      return ok(esJefe ? { es_jefe: true, fecha: hoy, zona_horaria: "America/Mexico_City", total_equipo: 2, registros: equipo } : { es_jefe: false, registros: [] });
    }
    return ok({});
  });
  return pedidos;
}

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }
  const errores = [];

  // 1) Jefe en celular: «Monitor de mi equipo» en Mi espacio; estados de hoy; el día en modo lectura.
  const cj = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await cj.addCookies([{ name: "token", value: jwt(), url: base }]);
  const pedidos = await rutas(cj, { esJefe: true });
  const pj = await cj.newPage();
  pj.on("pageerror", (e) => errores.push(e.message));
  await pj.goto(base + "/empleado/panel/mi-espacio", { waitUntil: "domcontentloaded" });
  await pj.getByRole("link", { name: /Monitor de mi equipo/ }).click();
  await pj.getByRole("heading", { name: "Monitor de mi equipo" }).waitFor({ timeout: 20000 });
  const ana = pj.getByRole("button", { name: "Ver día de Ana Prueba" });
  await ana.waitFor({ timeout: 10000 });
  assert.equal(await ana.getAttribute("data-estado"), "trabajando");
  // Mismos grupos y tarjetas que el Monitor de RH (lib/asistencia/monitor.mjs).
  assert.match(await pj.getByRole("region", { name: /Con permiso/ }).innerText(), /Beto Ruiz[\s\S]*Vacaciones/);
  assert.match(await pj.getByRole("group", { name: "Resumen de hoy" }).innerText(), /En jornada\s*1[\s\S]*Con permiso\s*2/);
  assert.ok(pedidos.every((q) => !/jefe|empresa|empleado/.test(q)), "el cliente no manda el jefe ni la empresa");
  assert.ok(await pj.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde en celular");
  if (capturas) { await dormir(400); await pj.screenshot({ path: `${capturas}/390-monitor-equipo.png` }); }
  await ana.click();
  const dia = pj.getByRole("dialog", { name: "Ana Prueba" });
  await dia.waitFor({ timeout: 10000 });
  const texto = await dia.innerText();
  assert.match(texto, /Tramo 1\s*12:01 a\.m\. → sigue trabajando/);
  assert.match(texto, /Sale antes 11:00 p\.m\.–11:59 p\.m\./);
  assert.match(texto, /Inventario\s*4:00 p\.m\. – 7:00 p\.m\. · 3 h/);
  assert.match(texto, /Solo lectura/);
  assert.equal(await dia.getByRole("button", { name: /Guardar|Editar|Quitar/ }).count(), 0, "modo lectura");
  if (capturas) { await dormir(300); await pj.screenshot({ path: `${capturas}/390-monitor-equipo-dia.png` }); }

  // 2) Jefe en escritorio: el menú lateral muestra el monitor.
  await pj.setViewportSize({ width: 1440, height: 900 });
  await pj.keyboard.press("Escape");
  await pj.goto(base + "/empleado/panel/monitor-equipo", { waitUntil: "domcontentloaded" });
  await pj.getByRole("button", { name: "Ver día de Ana Prueba" }).waitFor({ timeout: 20000 });
  if (capturas) { await dormir(400); await pj.screenshot({ path: `${capturas}/1440-monitor-equipo.png` }); }

  // 3) Quien no es jefe: sin menú y, si entra por la dirección, el aviso.
  const cn = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await cn.addCookies([{ name: "token", value: jwt(), url: base }]);
  await rutas(cn, { esJefe: false });
  const pn = await cn.newPage();
  pn.on("pageerror", (e) => errores.push(e.message));
  await pn.goto(base + "/empleado/panel/mi-espacio", { waitUntil: "domcontentloaded" });
  await pn.getByRole("heading", { name: "Mi espacio" }).waitFor({ timeout: 20000 });
  await dormir(800);
  assert.equal(await pn.getByRole("link", { name: /Monitor de mi equipo/ }).count(), 0, "sin equipo no hay menú");
  await pn.goto(base + "/empleado/panel/monitor-equipo", { waitUntil: "domcontentloaded" });
  await pn.getByText("No tienes personas a tu cargo").waitFor({ timeout: 20000 });

  assert.deepEqual(errores, [], "sin errores de JavaScript");
  exito = true;
  console.log("OK · menú solo para jefes · estados de hoy con hoy.mjs · día en modo lectura (checadas, permisos, horas extra) · sin desborde en 390");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
