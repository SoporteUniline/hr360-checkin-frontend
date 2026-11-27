// Verificación en navegador de «Respuestas de WhatsApp sin aplicar» (panel de Permisos, 29/12/2026) a 1440 y 390.
// Backend simulado: nada sale a internet. La tarjeta solo aparece con respuestas; «Aplicar aprobación / rechazo» piden
// confirmación y mandan el PATCH normal de la tabla; sin número de notificaciones no se muestra.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-aprobacion-whatsapp.mjs
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
const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
const token = `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

const ev = (fecha, texto, de = "Jefa Soto") => ({ fecha, texto, de, telefono: "•••• 5678", sugerencia: "Aprobado", confianza: "alta", motivo: "" });
const inicial = () => [
  { id: 101, id_empresa: 10, empleado: "Beto Paz", tipo: "Permiso con goce", es_vacaciones: false, fecha_inicio: "2026-12-08", fecha_fin: "2026-12-09",
    sugerencia: "Aprobado", confianza: "alta", contradictoria: false, evidencia: [ev("2026-12-07T16:15:00.000Z", "Aprobar")] },
  { id: 102, id_empresa: 10, empleado: "Ana María de los Ángeles Ruiz Covarrubias", tipo: null, es_vacaciones: true, fecha_inicio: "2026-12-14", fecha_fin: "2026-12-18",
    sugerencia: "Rechazado", confianza: "media", contradictoria: false, evidencia: [{ ...ev("2026-12-07T18:00:00.000Z", "No"), sugerencia: "Rechazado", confianza: "media" }] },
  { id: 103, id_empresa: 10, empleado: "Diego León", tipo: "Falta justificada", es_vacaciones: false, fecha_inicio: "2026-12-10", fecha_fin: "2026-12-10",
    sugerencia: "Aprobado", confianza: "baja", contradictoria: true,
    evidencia: [ev("2026-12-08T15:00:00.000Z", "sí, nada más que avise a su compañero de turno para que lo cubra en la caja dos durante la tarde"), ev("2026-12-08T14:00:00.000Z", "no")] },
  { id: 104, id_empresa: 10, empleado: "Carla Mora", tipo: "Permiso sin goce", es_vacaciones: false, fecha_inicio: "2026-12-11", fecha_fin: "2026-12-11",
    sugerencia: "Aprobado", confianza: "media", contradictoria: false, evidencia: [ev("2026-12-08T17:30:00.000Z", "Aprobar")] },
];
let respuestas = inicial();
let disponible = true;
const consultas = [];
const patches = [];
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const abrir = async (viewport) => {
    const ctx = await browser.newContext({ viewport, locale: "es-MX", timezoneId: "America/Mexico_City" });
    await ctx.addCookies([{ name: "token", value: token, url: base }]);
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.route("**/*", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
      const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" }, body: JSON.stringify(data) });
      if (req.method() === "OPTIONS") return json({});
      const p = url.pathname;
      if (p.endsWith("/users/verify/token")) return json({ user: usuario });
      if (p.endsWith("/checador/solicitudes-permiso/whatsapp/sin-aplicar")) {
        consultas.push(Object.fromEntries(url.searchParams));
        if (!disponible) return json({ ok: true, disponible: false, motivo: "Falta configurar el número de notificaciones", total: 0, solicitudes: [] });
        return json({ ok: true, disponible: true, dias: 30, total: respuestas.length, solicitudes: respuestas, revisadas: { conversaciones: 4, mensajes: 40 }, limitado: false });
      }
      const estado = p.match(/\/checador\/solicitudes-permiso\/(\d+)\/estado$/);
      if (estado && req.method() === "PATCH") {
        const cuerpo = JSON.parse(req.postData() || "{}");
        patches.push({ id: Number(estado[1]), cuerpo });
        respuestas = respuestas.filter((r) => r.id !== Number(estado[1]));
        return json({ message: "Estado actualizado" });
      }
      if (p.endsWith("/checador/tiposPermiso")) return json({ tiposPermiso: [{ id: 47, nombre: "Permiso con goce" }] });
      if (p.endsWith("/checador/solicitudes-permiso")) return json({ data: [], total: 0, estadisticas: { total: 4, pendientes: 4, aprobados: 0, rechazados: 0, cancelados: 0 } });
      if (p.includes("eventos-checada")) return route.abort();
      return json({});
    });
    return { ctx, page, errores };
  };

  // ── Escritorio 1440 ──
  {
    const { ctx, page, errores } = await abrir({ width: 1440, height: 900 });
    await page.goto(base + "/panel/permisos", { waitUntil: "domcontentloaded" });
    const tarjeta = page.getByRole("region", { name: /Respuestas de WhatsApp sin aplicar/ });
    await tarjeta.waitFor({ timeout: 30000 });
    assert.equal(await tarjeta.getByRole("heading").innerText(), "Respuestas de WhatsApp sin aplicar (4)");
    assert.deepEqual(consultas[0], { dias: "30" }, "todas las unidades: sin empresa en la consulta");
    assert.equal(await tarjeta.locator("li[data-solicitud]").count(), 3, "se ven 3 y el resto con «Ver las 4»");
    await tarjeta.getByRole("button", { name: "Ver las 4" }).click();
    assert.equal(await tarjeta.locator("li[data-solicitud]").count(), 4);
    const beto = tarjeta.locator('li[data-solicitud="101"]');
    assert.match(await beto.innerText(), /Beto Paz[\s\S]*Permiso con goce · 8 – 9 dic[\s\S]*Parece que la aprobó[\s\S]*Confianza alta[\s\S]*7 dic, 10:15\s?a[\s\S]*Jefa Soto:[\s\S]*Aprobar/);
    assert.match(await tarjeta.locator('li[data-solicitud="102"]').innerText(), /Vacaciones · 14 – 18 dic[\s\S]*Parece que la rechazó[\s\S]*Confianza media/);
    assert.match(await tarjeta.locator('li[data-solicitud="103"]').innerText(), /Confianza baja[\s\S]*Hay respuestas distintas/);
    if (process.env.CAPTURAS) await tarjeta.screenshot({ path: `${process.env.CAPTURAS}/respuestas-whatsapp-1440.png` });

    // Cancelar no manda nada.
    await beto.getByRole("button", { name: "Aplicar aprobación" }).click();
    const dialogo = page.getByRole("alertdialog");
    await dialogo.waitFor();
    assert.equal(await dialogo.getByRole("heading").innerText(), "¿Aplicar la aprobación?");
    assert.match(await dialogo.innerText(), /Vas a aprobar el permiso «Permiso con goce» de Beto Paz \(8 – 9 dic\)/);
    if (process.env.CAPTURAS) await page.screenshot({ path: `${process.env.CAPTURAS}/respuestas-whatsapp-confirmar-1440.png` });
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await dialogo.waitFor({ state: "hidden" });
    assert.equal(patches.length, 0);

    // Confirmar → la acción normal de la tabla.
    await beto.getByRole("button", { name: "Aplicar aprobación" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Sí, aprobar" }).click();
    for (let i = 0; i < 60 && !patches.length; i++) await dormir(100);
    assert.deepEqual(patches[0], { id: 101, cuerpo: { estado: "Aprobado", actualizado_por: -1 } });
    await page.getByText("Permiso aprobado").waitFor({ timeout: 10000 });
    await tarjeta.getByRole("heading", { name: "Respuestas de WhatsApp sin aplicar (3)" }).waitFor({ timeout: 10000 });

    await tarjeta.locator('li[data-solicitud="102"]').getByRole("button", { name: "Aplicar rechazo" }).click();
    const d2 = page.getByRole("alertdialog");
    assert.match(await d2.innerText(), /Vas a rechazar las vacaciones de Ana María/);
    await d2.getByRole("button", { name: "Sí, rechazar" }).click();
    for (let i = 0; i < 60 && patches.length < 2; i++) await dormir(100);
    assert.deepEqual(patches[1], { id: 102, cuerpo: { estado: "Rechazado", actualizado_por: -1 } });
    await tarjeta.getByRole("heading", { name: "Respuestas de WhatsApp sin aplicar (2)" }).waitFor({ timeout: 10000 });
    assert.deepEqual(errores, []);
    await ctx.close();
  }

  // ── Teléfono 390 ──
  {
    respuestas = inicial();
    const { ctx, page, errores } = await abrir({ width: 390, height: 844 });
    await page.goto(base + "/panel/permisos", { waitUntil: "domcontentloaded" });
    const tarjeta = page.getByRole("region", { name: /Respuestas de WhatsApp sin aplicar/ });
    await tarjeta.waitFor({ timeout: 30000 });
    await tarjeta.getByRole("button", { name: "Ver las 4" }).click();
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(desborde <= 0, `sin scroll horizontal (sobran ${desborde}px)`);
    const caja = await tarjeta.boundingBox();
    assert.ok(caja.x >= 0 && caja.x + caja.width <= 390, "la tarjeta cabe en el ancho");
    for (const b of await tarjeta.getByRole("button", { name: /Aplicar (aprobación|rechazo)/ }).all()) {
      const r = await b.boundingBox();
      assert.ok(r.height >= 40, `botón táctil de al menos 40px (${r.height})`);
      assert.ok(r.x >= 0 && r.x + r.width <= 390, "el botón cabe en el ancho");
    }
    // El nombre largo y el texto largo no se cortan ni desbordan: se ajustan en varias líneas.
    const ana = tarjeta.locator('li[data-solicitud="102"]');
    assert.match(await ana.innerText(), /Ana María de los Ángeles Ruiz Covarrubias/);
    const largo = await tarjeta.locator('li[data-solicitud="103"] q').boundingBox();
    assert.ok(largo.x + largo.width <= 390);
    if (process.env.CAPTURAS) await page.screenshot({ path: `${process.env.CAPTURAS}/respuestas-whatsapp-390.png`, fullPage: true });
    // Confirmación usable en el teléfono.
    await tarjeta.locator('li[data-solicitud="104"]').getByRole("button", { name: "Aplicar aprobación" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Sí, aprobar" }).click();
    for (let i = 0; i < 60 && patches.length < 3; i++) await dormir(100);
    assert.deepEqual(patches[2], { id: 104, cuerpo: { estado: "Aprobado", actualizado_por: -1 } });
    assert.deepEqual(errores, []);
    await ctx.close();
  }

  // ── Sin número de notificaciones: no se muestra nada ──
  {
    disponible = false;
    const { ctx, page, errores } = await abrir({ width: 1440, height: 900 });
    const n = consultas.length;
    await page.goto(base + "/panel/permisos", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Permisos" }).first().waitFor({ timeout: 30000 });
    for (let i = 0; i < 60 && consultas.length === n; i++) await dormir(100);
    await dormir(300);
    assert.equal(await page.locator("[data-respuestas-whatsapp]").count(), 0);
    assert.deepEqual(errores, []);
    await ctx.close();
  }

  exito = true;
  console.log("OK respuestas de WhatsApp sin aplicar · tarjeta con N, evidencia y confianza · confirmar antes de aplicar (PATCH normal de la tabla) · 1440 y 390 sin desborde · oculta sin número de notificaciones");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
