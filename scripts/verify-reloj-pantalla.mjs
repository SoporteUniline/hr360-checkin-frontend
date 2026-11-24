// Verificación en navegador del reloj checador de la empresa (/<slug>) como kiosco: en 1440×900, 1280×720, 1024×768,
// tablet vertical 768×1024 y celular 390×844 todo cabe en una pantalla (sin desplazar el documento), sin la barra del
// sitio público ni el encabezado «Reloj checador / Registro de entradas… / Reconocimiento offline preparado…», con la
// hora, el código, el teclado (teclas ≥ 56 px; ≥ 48 px en celular) y «Registrar» dentro de la pantalla, y los avisos
// «¿Registrar otra vez?» y el resultado centrados. Sin errores de JavaScript. Backend simulado: nada sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-reloj-pantalla.mjs
// Capturas opcionales: CAPTURAS=/ruta/carpeta node scripts/verify-reloj-pantalla.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: crypto.randomBytes(24).toString("hex") } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (process.env.CAPTURAS) await mkdir(process.env.CAPTURAS, { recursive: true });
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png` }) : null);

const TAMANOS = [
  { nombre: "1440x900", width: 1440, height: 900 },
  { nombre: "1280x720", width: 1280, height: 720 },
  { nombre: "1024x768", width: 1024, height: 768 },
  { nombre: "tablet-768x1024", width: 768, height: 1024, isMobile: true, hasTouch: true },
  { nombre: "celular-390x844", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];
const hace = (min) => new Date(Date.now() - min * 60000 - 6 * 3600000).toISOString().slice(0, 19).replace("T", " ");
const registros = [
  { nip: "1001", nombre: "Ana Torres", entrada: hace(180), salida: null, estado: "Abierto" },
  { nip: "1002", nombre: "Luis Pérez", entrada: hace(240), salida: hace(30), estado: "Cerrado" },
];

let exito = false;
const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  for (const t of TAMANOS) {
    const ctx = await browser.newContext({ viewport: { width: t.width, height: t.height }, isMobile: !!t.isMobile, hasTouch: !!t.hasTouch, deviceScaleFactor: t.deviceScaleFactor || 1, locale: "es-MX", timezoneId: "America/Mexico_City", permissions: ["camera"] });
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
    let envios = 0;
    await ctx.route("**/*", async (route) => {
      const req = route.request(); const url = new URL(req.url());
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const json = (d) => route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(d) });
      if (url.pathname.startsWith("/api/empresas/check-subscription/")) return json({ hasActivePlan: true });
      if (url.origin === base) return route.continue();
      if (url.hostname !== "api.prueba.invalid") return route.abort(); // nada sale a internet
      const p = url.pathname.replace(/^\/api/, "");
      if (p.endsWith("/empresas/slug/demo")) return json({ id_empresa: 7, nombre: "Demo" });
      if (p.endsWith("/eventos-checada")) return route.abort();
      if (p.endsWith("/registros-del-dia")) return json({ registrosHoy: registros, activosHoy: 1, totalRegistrosHoy: 2, zona_horaria: "America/Mexico_City" });
      if (p.endsWith("/reloj/registrar")) {
        const ev = req.postDataJSON();
        envios++;
        // Primero el candado de 5 minutos («¿Registrar otra vez?»); al confirmar, se registra.
        if (!ev.repetir) return json({ ignorada: true, rebote: { tipo: "entrada", hora: hace(2).slice(11) }, empleado: { nombre: "Ana", apellido_paterno: "Torres" } });
        return json({ message: "Entrada registrada", empleado: { nombre: "Ana", apellido_paterno: "Torres" } });
      }
      return json({ data: [], results: [], employees: [], total: 0 });
    });
    const pg = await ctx.newPage();
    const errores = [];
    pg.on("pageerror", (e) => errores.push(e.message));

    await pg.goto(base + "/demo", { waitUntil: "domcontentloaded" });
    const codigo = pg.getByPlaceholder("Ingresa tu código");
    await codigo.waitFor({ state: "visible", timeout: 30000 });
    await pg.getByText(/^\d{1,2}:\d{2}:\d{2}$/).waitFor({ timeout: 10000 });
    await dormir(2500); // cámara falsa, perfil sin conexión y registros terminan de pintarse

    // 1) Una sola pantalla: el documento no se desplaza.
    const medidas = await pg.evaluate(() => ({ alto: document.scrollingElement.scrollHeight, ancho: document.scrollingElement.scrollWidth, vh: innerHeight, vw: innerWidth }));
    assert.ok(medidas.alto <= medidas.vh, `${t.nombre}: sin desplazamiento vertical (${medidas.alto} > ${medidas.vh})`);
    assert.ok(medidas.ancho <= medidas.vw, `${t.nombre}: sin desplazamiento horizontal (${medidas.ancho} > ${medidas.vw})`);

    // 2) Sin la barra del sitio público ni el encabezado eliminado (el estado queda solo en title/aria del punto).
    const visibles = await pg.evaluate((textos) => textos.filter((txt) => [...document.querySelectorAll("body *")].some((el) => {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.includes(txt))) return false;
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return r.width > 2 && r.height > 2 && cs.visibility !== "hidden" && cs.display !== "none";
    })), ["Funcionalidades", "Cotiza", "Contratar Plan", "Sobre Nosotros", "Reloj checador", "Registro de entradas y salidas con validación", "Reconocimiento offline preparado", "Los rostros de la empresa se descargan", "Cámara siempre encendida"]);
    assert.deepEqual(visibles, [], `${t.nombre}: textos que ya no deben verse`);
    assert.equal(await pg.locator("nav a[href='/']").count(), 0, `${t.nombre}: sin enlaces de la barra pública`);
    const punto = await pg.locator("[title*='Reconocimiento'], [title*='rostros'], [title*='Sin conexión']").count();
    assert.ok(punto >= 1, `${t.nombre}: indicador discreto de conexión con su texto en title`);

    // 3) Hora, código, teclado y «Registrar» dentro de la pantalla.
    const dentro = async (loc, que) => {
      const b = await loc.boundingBox();
      assert.ok(b, `${t.nombre}: ${que} visible`);
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= t.width + 0.5 && b.y + b.height <= t.height + 0.5, `${t.nombre}: ${que} dentro de la pantalla ${JSON.stringify(b)}`);
      return b;
    };
    await dentro(pg.getByText(/^\d{1,2}:\d{2}:\d{2}$/), "hora");
    await dentro(codigo, "campo de código");
    await dentro(pg.getByRole("button", { name: /^QR$/ }), "botón QR");
    const minimo = t.width < 768 || t.height < 512 ? 48 : 56; // celular (también acostado): 48 px
    for (const tecla of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) {
      const b = await dentro(pg.getByRole("button", { name: tecla, exact: true }), `tecla ${tecla}`);
      assert.ok(b.height >= minimo - 0.5 && b.width >= minimo - 0.5, `${t.nombre}: tecla ${tecla} de ${Math.round(b.width)}×${Math.round(b.height)} (mínimo ${minimo})`);
    }
    await dentro(pg.getByRole("button", { name: "Limpiar" }), "Limpiar");
    await dentro(pg.getByRole("button", { name: "Borrar último dígito" }), "borrar");
    const registrar = pg.getByRole("button", { name: "Registrar Entrada / Salida" });
    await dentro(registrar, "Registrar");
    const camara = await dentro(pg.locator("video").first(), "cámara");
    assert.ok(camara.height >= 150, `${t.nombre}: la cámara conserva un alto útil (${Math.round(camara.height)} px)`);
    await captura(pg, `reloj-${t.nombre}`);

    // 4) Teclado → «¿Registrar otra vez?» centrado → «Sí, registrar» → resultado centrado.
    for (const tecla of ["1", "2", "3"]) await pg.getByRole("button", { name: tecla, exact: true }).click();
    assert.equal(await codigo.inputValue(), "123");
    await registrar.click();
    const dialogo = pg.getByRole("alertdialog");
    await dialogo.waitFor({ timeout: 20000 });
    await pg.getByText(/¿Registrar otra vez\?/).waitFor();
    const centrado = async (loc, que) => {
      const b = await dentro(loc, que);
      const dx = Math.abs(b.x + b.width / 2 - t.width / 2); const dy = Math.abs(b.y + b.height / 2 - t.height / 2);
      assert.ok(dx <= 2 && dy <= t.height * 0.1, `${t.nombre}: ${que} centrado (dx ${Math.round(dx)}, dy ${Math.round(dy)})`);
    };
    await dormir(400); // animación de entrada
    await centrado(dialogo, "«¿Registrar otra vez?»");
    await captura(pg, `reloj-${t.nombre}-registrar-otra-vez`);
    await pg.getByRole("button", { name: "Sí, registrar" }).click();
    const resultado = pg.locator(".animate-bounce-in").filter({ hasText: "Ana Torres" });
    await resultado.waitFor({ state: "visible", timeout: 20000 });
    await dormir(500);
    await centrado(resultado, "resultado de la checada");
    await captura(pg, `reloj-${t.nombre}-resultado`);
    assert.ok(envios >= 2, `${t.nombre}: se envió la checada y su confirmación`);
    await resultado.waitFor({ state: "hidden", timeout: 10000 });
    const final = await pg.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight);
    assert.ok(final, `${t.nombre}: sigue sin desplazamiento después de checar`);

    assert.deepEqual(errores, [], `${t.nombre}: sin errores de JavaScript`);
    console.log(`ok ${t.nombre}: ${medidas.alto}/${medidas.vh} px, cámara ${Math.round(camara.width)}×${Math.round(camara.height)}`);
    await ctx.close();
  }
  exito = true;
  console.log("OK reloj kiosco: una sola pantalla en 5 tamaños, sin barra pública ni encabezado, hora/código/teclado visibles y avisos centrados");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
