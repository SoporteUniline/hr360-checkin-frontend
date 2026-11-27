// Verificación en navegador de lo legal, con el backend simulado:
// documentos publicados con responsable y versión (sin CURP), el Pixel de Meta solo tras aceptar cookies,
// y la casilla obligatoria de Contacto que deja constancia (contexto, documentos y versión) antes de abrir WhatsApp.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx npm run build
//      && node scripts/verify-legal.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const aceptaciones = [];
const pixel = [];

async function contexto(browser, opciones = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", ...opciones });
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname === "connect.facebook.net") { pixel.push(url.href); return route.abort(); }
    if (url.hostname === "api.prueba.invalid") {
      const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      if (url.pathname === "/api/checador/legal/aceptaciones") { aceptaciones.push(req.postDataJSON()); return route.fulfill({ status: 201, json: { ok: true }, headers: cors }); }
      return route.fulfill({ json: { ok: true, popups: [] }, headers: cors });
    }
    return route.abort();
  });
  return ctx;
}

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];

  // 1) Documentos: responsable, domicilio, versión; RFC solo en términos; nunca la CURP; aviso de borrador por pendientes.
  // (25/11/2026) Los dos avisos de privacidad cambiaron de versión: agregan la línea de Face ID / huella (passkeys).
  for (const [ruta, titulo, version] of [["/aviso-privacidad", "Aviso de privacidad integral", "2026-11-28"], ["/terminos-condiciones", "Términos y condiciones del servicio", "2026-11-21"], ["/aviso-empleados", "Aviso de privacidad para empleados (plantilla)", "2026-11-25"]]) {
    const html = await (await fetch(base + ruta)).text();
    assert.ok(html.includes(titulo), `${ruta}: título`);
    assert.match(html, new RegExp(`Versión (<!-- -->)?${version}`), `${ruta}: versión`);
    if (ruta !== "/terminos-condiciones") assert.ok(html.includes("Tu cara o tu huella nunca salen de tu teléfono"), `${ruta}: línea de passkeys`);
    assert.ok(!html.includes("LEDD900608HJCNSG07"), `${ruta}: nunca la CURP`);
  }
  const aviso = await (await fetch(base + "/aviso-privacidad")).text();
  assert.ok(aviso.includes("Diego Alonso León de Dios") && aviso.includes("Autlán de Navarro"));
  assert.ok(aviso.includes("Documento en revisión"), "aviso de borrador mientras haya pendientes");
  assert.ok(!aviso.includes("LEDD900608JE9"), "el RFC no va en el aviso");
  // (28/11/2026) Versión 2026-11-28: párrafo de la casilla de noticias y la baja, en «Para qué usamos tus datos».
  const textoAviso = aviso.replace(/<!-- -->/g, "").replace(/&quot;/g, '"');
  const finalidades = textoAviso.slice(textoAviso.indexOf('id="finalidades"'), textoAviso.indexOf('id="transferencias"'));
  assert.ok(finalidades.includes('Si marcas la casilla "Quiero recibir noticias sobre reformas laborales, novedades de ADAMIA y consejos de RH", usaremos tu nombre y correo'), "párrafo de noticias en las finalidades");
  assert.ok(finalidades.includes('con el enlace "Darme de baja" que incluye cada correo, o escribiendo a [Pendiente: correo de privacidad]. Guardamos la fecha'), "baja con el correo de privacidad del aviso");
  assert.match(textoAviso, /Última actualización: 28 de noviembre de 2026/);
  assert.ok((await (await fetch(base + "/terminos-condiciones")).text()).includes("LEDD900608JE9"), "el RFC sí va en términos");

  // 2) Cookies: sin decidir, no se carga el Pixel; con «Solo necesarias», tampoco; con «Aceptar todas», sí.
  const ctx = await contexto(browser);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const avisoCookies = page.getByRole("region", { name: "Aviso de cookies" });
  await avisoCookies.waitFor();
  await dormir(1500);
  assert.equal(pixel.length, 0, "sin decidir no hay Pixel");
  await avisoCookies.getByRole("button", { name: "Solo necesarias" }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await dormir(1500);
  assert.equal(await avisoCookies.count(), 0, "la decisión se recuerda");
  assert.equal(pixel.length, 0, "rechazadas: no hay Pixel");
  await page.evaluate(() => localStorage.removeItem("adamia_cookies_publicidad"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await avisoCookies.getByRole("button", { name: "Aceptar todas" }).click();
  await page.waitForFunction(() => typeof window.fbq === "function", null, { timeout: 4000 });
  await dormir(500);
  assert.ok(pixel.length > 0, "aceptadas: se carga el Pixel");
  await ctx.close();

  // 3) Contacto: sin la casilla no se envía; con ella, deja constancia y abre WhatsApp.
  const ctx2 = await contexto(browser);
  const p2 = await ctx2.newPage();
  p2.on("pageerror", (e) => errores.push(e.message));
  await p2.goto(base + "/contacto", { waitUntil: "domcontentloaded" });
  await p2.getByRole("region", { name: "Aviso de cookies" }).getByRole("button", { name: "Solo necesarias" }).click();
  const campos = p2.locator("form input:not([type=checkbox]), form textarea");
  const n = await campos.count();
  for (let i = 0; i < n; i++) {
    const c = campos.nth(i);
    const tipo = await c.getAttribute("type");
    await c.fill(tipo === "email" ? "ana@empresa.mx" : tipo === "tel" ? "3171234567" : "Ana Prueba");
  }
  await p2.getByRole("button", { name: /Enviar por WhatsApp/ }).click();
  await dormir(500);
  assert.equal(aceptaciones.length, 0, "sin aceptar no se registra ni se envía");
  assert.equal(await p2.locator("#contacto-acepto:invalid").count(), 1, "la casilla es obligatoria");
  await p2.getByLabel(/He leído y acepto el/).check();
  const aWhatsApp = ctx2.waitForEvent("request", (r) => /wa\.me|whatsapp/.test(r.url()));
  await p2.getByRole("button", { name: /Enviar por WhatsApp/ }).click();
  assert.match((await aWhatsApp).url(), /text=Hola%20ADAMIA/, "abre WhatsApp con el mensaje");
  await dormir(300);
  assert.equal(aceptaciones.length, 1);
  assert.equal(aceptaciones[0].contexto, "contacto");
  assert.deepEqual(aceptaciones[0].documentos, [{ id: "aviso_privacidad", version: "2026-11-28" }]);
  assert.equal(aceptaciones[0].correo, "ana@empresa.mx");
  await ctx2.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK legal: documentos con responsable y versión (sin CURP), Pixel solo con cookies aceptadas, casilla obligatoria en Contacto con constancia antes de WhatsApp");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
