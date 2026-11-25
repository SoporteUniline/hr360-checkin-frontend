// Verificación en navegador del interruptor «Voy a comer» (26/11/2026) en el reloj de la empresa (kiosco /<slug>) y en el
// reloj de la app del empleado, a 1440 y 390. Backend simulado con la MISMA regla del servidor (services/comidaReloj.js):
// la checada con «Voy a comer» lleva accion = salida_comida; la primera vez registra la comida y si ya comió responde
// «Ya registraste tu comida hoy. Registramos tu salida.» (cierre automático) o pregunta sus opciones (cierre manual).
// Revisa: el interruptor está junto al código y el QR (kiosco) o en la barra de métodos (app), apagado no cambia nada,
// prendido muestra el aviso sobre la cámara y su cuenta, se apaga al usarse y solo a los 30 s; sin desplazamiento en el
// kiosco ni teclas más chicas; sin errores de JavaScript. Nada sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-voy-a-comer.mjs
// Capturas: CAPTURAS=/ruta/carpeta node scripts/verify-voy-a-comer.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (process.env.CAPTURAS) await mkdir(process.env.CAPTURAS, { recursive: true });
const captura = (pg, nombre, loc = null) => (process.env.CAPTURAS ? (loc ?? pg).screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png` }) : null);
const hace = (min) => new Date(Date.now() - min * 60000 - 6 * 3600000).toISOString().slice(0, 19).replace("T", " ");
const empleadoApp = { tipo_usuario: "Empleado", esEmpleado: true, id_usuario: 101, id_empleado: 101, id_empresa: 7, empresas: [7], nombre: "Ana Torres", zona_horaria: "America/Mexico_City" };
function token(u) {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ ...u, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}

// Backend simulado: «Ana» (1001, cierre automático) y «Mara» (1002, cierre manual); las dos ya tienen un tramo abierto.
function backend() {
  const estado = { envios: [], comio: new Set() };
  const persona = { 1001: { nombre: "Ana", apellido_paterno: "Torres", manual: false }, 1002: { nombre: "Mara", apellido_paterno: "Ruiz", manual: true } };
  async function manejar(route) {
    const req = route.request(); const url = new URL(req.url());
    const cors = { "Access-Control-Allow-Origin": url.origin === base ? base : "*", "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
    const json = (d) => route.fulfill({ status: 200, contentType: "application/json", headers: { ...cors, "Access-Control-Allow-Origin": base }, body: JSON.stringify(d) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...cors, "Access-Control-Allow-Origin": base } });
    if (url.pathname.startsWith("/api/empresas/check-subscription/")) return json({ hasActivePlan: true });
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort(); // nada sale a internet
    const p = url.pathname.replace(/^\/api/, "");
    if (p.endsWith("/users/verify/token")) return json({ user: empleadoApp });
    if (p.endsWith("/empresas/slug/demo")) return json({ id_empresa: 7, nombre: "Demo" });
    if (p.endsWith("/eventos-checada")) return route.abort();
    if (p.endsWith("/registros-del-dia") || p.endsWith("/registros-del-dia-empleado")) {
      return json({ registrosHoy: [{ nip: "1001", nombre: "Ana Torres", entrada: hace(240), salida: null, estado: "Abierto" }], activosHoy: 1, totalRegistrosHoy: 1, zona_horaria: "America/Mexico_City" });
    }
    if (p.endsWith("/reloj/registrar") || p.endsWith("/reloj/registrar-facial")) {
      const ev = req.postDataJSON();
      estado.envios.push(ev);
      const quien = persona[ev.codigo] ?? persona[1001];
      const empleado = { nombre: quien.nombre, apellido_paterno: quien.apellido_paterno };
      // Misma regla que el servidor: salida_comida vale si aún no come; si ya comió, salida normal o pregunta (manual).
      if (ev.accion === "salida_comida") {
        if (!estado.comio.has(ev.codigo)) { estado.comio.add(ev.codigo); return json({ message: "Salida a comer registrada. ¡Buen provecho!", empleado }); }
        if (quien.manual) {
          return json({ requiereDecision: true, opciones: ["salida_temporal", "cerrar_turno"], aviso: "comida_ya_registrada",
            message: "Ya registraste tu comida hoy. ¿Salida temporal o cierras tu turno?", empleado });
        }
        return json({ message: "Ya registraste tu comida hoy. Registramos tu salida.", empleado });
      }
      if (ev.accion === "cerrar_turno") return json({ message: "Turno cerrado", empleado });
      return json({ message: "Entrada registrada", empleado });
    }
    return json({ data: [], results: [], employees: [], total: 0 });
  }
  return { estado, manejar };
}

const TAMANOS = [
  { nombre: "1440", width: 1440, height: 900 },
  { nombre: "390", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];
const dentro = async (loc, t, que) => {
  const b = await loc.boundingBox();
  assert.ok(b, `${t.nombre}: ${que} visible`);
  assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= t.width + 0.5 && b.y + b.height <= t.height + 0.5, `${t.nombre}: ${que} dentro de la pantalla ${JSON.stringify(b)}`);
  return b;
};

let exito = false;
const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  // ——— 1) Reloj de la empresa (kiosco) ———
  for (const t of TAMANOS) {
    const ctx = await browser.newContext({ viewport: { width: t.width, height: t.height }, isMobile: !!t.isMobile, hasTouch: !!t.hasTouch, deviceScaleFactor: t.deviceScaleFactor || 1, locale: "es-MX", timezoneId: "America/Mexico_City", permissions: ["camera"] });
    const { estado, manejar } = backend();
    await ctx.route("**/*", manejar);
    const pg = await ctx.newPage();
    const errores = [];
    pg.on("pageerror", (e) => errores.push(e.message));
    await pg.goto(base + "/demo", { waitUntil: "domcontentloaded" });
    const codigo = pg.getByPlaceholder("Ingresa tu código");
    await codigo.waitFor({ state: "visible", timeout: 30000 });
    await dormir(2500);
    const boton = pg.getByRole("switch", { name: "Voy a comer" });
    const registrar = pg.getByRole("button", { name: "Registrar Entrada / Salida" });
    const teclear = async (c) => { await codigo.fill(c); await registrar.click(); };
    const resultado = pg.locator(".animate-bounce-in");
    const esperarResultado = async (texto) => {
      await resultado.filter({ hasText: texto }).waitFor({ state: "visible", timeout: 20000 });
      await resultado.waitFor({ state: "hidden", timeout: 10000 });
    };

    // Junto al código y el QR, del mismo alto, sin desplazar la pantalla ni achicar las teclas.
    const bBoton = await dentro(boton, t, "«Voy a comer»");
    const bQr = await dentro(pg.getByRole("button", { name: /^QR$/ }), t, "QR");
    const bCodigo = await dentro(codigo, t, "código");
    assert.ok(Math.abs(bBoton.y - bQr.y) <= 1 && Math.abs(bBoton.height - bQr.height) <= 1, `${t.nombre}: en la fila del código y del QR`);
    assert.ok(bBoton.x > bCodigo.x + bCodigo.width - 1 && bBoton.x < bQr.x, `${t.nombre}: entre el código y el QR`);
    assert.equal(await boton.getAttribute("aria-checked"), "false");
    assert.equal(await pg.locator("[data-aviso-voy-a-comer]").count(), 0, "apagado: sin aviso");
    const minimo = t.width < 768 ? 48 : 56;
    const tecla = await dentro(pg.getByRole("button", { name: "5", exact: true }), t, "tecla 5");
    assert.ok(tecla.height >= minimo - 0.5, `${t.nombre}: teclas de ${minimo} px (${Math.round(tecla.height)})`);
    const sinScroll = () => pg.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight && document.scrollingElement.scrollWidth <= innerWidth);
    assert.ok(await sinScroll(), `${t.nombre}: una sola pantalla`);
    await captura(pg, `kiosco-${t.nombre}-apagado`);

    // Apagado: la checada va sin acción (el que solo checa no nota nada).
    await teclear("1001");
    await esperarResultado("Entrada registrada");
    assert.equal(estado.envios.at(-1).accion, undefined);

    // Prendido: aviso sobre la cámara con su cuenta; la siguiente checada lleva salida_comida y se apaga solo.
    await boton.click();
    assert.equal(await boton.getAttribute("aria-checked"), "true");
    const aviso = pg.locator("[data-aviso-voy-a-comer]");
    await aviso.waitFor({ timeout: 5000 });
    assert.match(await aviso.innerText(), t.width < 640 ? /^Salida a comer\s*· (30|29) s$/ : /^Siguiente checada: salida a comer\s*· (30|29) s$/);
    const alto = await aviso.evaluate((e) => e.getBoundingClientRect().height);
    assert.ok(alto < 40, `${t.nombre}: el aviso cabe en una línea (${alto} px)`);
    // No tapa los botones de la cámara (fijar, girar, apagar).
    const choca = await aviso.evaluate((el) => {
      const a = el.getBoundingClientRect();
      return [...el.closest("section").querySelectorAll("button")].filter((b) => b.offsetParent).some((b) => {
        const r = b.getBoundingClientRect();
        return r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top;
      });
    });
    assert.equal(choca, false, `${t.nombre}: el aviso no tapa los botones de la cámara`);
    await dormir(300);
    await dentro(aviso, t, "aviso sobre la cámara");
    assert.ok(await sinScroll(), `${t.nombre}: prendido sigue en una sola pantalla`);
    await captura(pg, `kiosco-${t.nombre}-prendido`);
    await teclear("1001");
    await resultado.filter({ hasText: "Salida a comer registrada" }).waitFor({ state: "visible", timeout: 20000 });
    await dormir(500); // animación de entrada
    await captura(pg, `kiosco-${t.nombre}-salida-a-comer`);
    await resultado.waitFor({ state: "hidden", timeout: 10000 });
    assert.equal(estado.envios.at(-1).accion, "salida_comida");
    assert.equal(estado.envios.at(-1).codigo, "1001");
    assert.equal(await boton.getAttribute("aria-checked"), "false", "se apaga al usarse");
    assert.equal(await aviso.count(), 0);

    // Ya comió: mensaje claro, no un error.
    await boton.click();
    await teclear("1001");
    await resultado.filter({ hasText: "Ya registraste tu comida hoy" }).waitFor({ state: "visible", timeout: 20000 });
    await dormir(500);
    await captura(pg, `kiosco-${t.nombre}-ya-comio`);
    await resultado.waitFor({ state: "hidden", timeout: 10000 });

    // Cierre manual que ya comió: pregunta sus opciones con el aviso.
    estado.comio.add("1002");
    await boton.click();
    await teclear("1002");
    await pg.getByRole("heading", { name: "Turno abierto" }).waitFor({ timeout: 20000 });
    await pg.locator("[data-aviso-comida]", { hasText: "Ya registraste tu comida hoy." }).waitFor();
    await pg.getByRole("button", { name: "Salida temporal" }).waitFor();
    await dormir(400);
    await captura(pg, `kiosco-${t.nombre}-manual-ya-comio`);
    await pg.getByRole("button", { name: "Cerrar turno" }).click();
    await esperarResultado("Turno cerrado");
    assert.deepEqual(estado.envios.slice(-2).map((e) => [e.codigo, e.accion]), [["1002", "salida_comida"], ["1002", "cerrar_turno"]]);
    assert.equal(await boton.getAttribute("aria-checked"), "false");

    // Prendido y sin usarse: se apaga solo a los 30 s.
    if (t.nombre === "1440") {
      await boton.click();
      await aviso.waitFor();
      await dormir(31500);
      assert.equal(await boton.getAttribute("aria-checked"), "false", "se apaga a los 30 s");
      assert.equal(await aviso.count(), 0);
      await teclear("1001");
      await esperarResultado("Entrada registrada");
      assert.equal(estado.envios.at(-1).accion, undefined, "después de apagarse, la checada va sin acción");
    }
    assert.deepEqual(errores, [], `${t.nombre}: sin errores de JavaScript`);
    console.log(`ok kiosco ${t.nombre}: junto al código y el QR, aviso sobre la cámara, salida_comida una vez, «ya comiste» claro, manual pregunta`);
    await ctx.close();
  }

  // ——— 2) Reloj de la app del empleado (por código) ———
  for (const t of TAMANOS) {
    const ctx = await browser.newContext({ viewport: { width: t.width, height: t.height }, isMobile: !!t.isMobile, hasTouch: !!t.hasTouch, deviceScaleFactor: t.deviceScaleFactor || 1, locale: "es-MX", timezoneId: "America/Mexico_City", permissions: ["camera"] });
    await ctx.addCookies([{ name: "token", value: token(empleadoApp), url: base }]);
    const { estado, manejar } = backend();
    await ctx.route("**/*", manejar);
    const pg = await ctx.newPage();
    const errores = [];
    pg.on("pageerror", (e) => errores.push(e.message));
    await pg.goto(base + "/empleado/reloj-checador", { waitUntil: "domcontentloaded" });
    const tabCodigo = pg.getByRole("button", { name: /^Código$/ });
    if (t.width < 768) { await tabCodigo.waitFor({ timeout: 30000 }); await tabCodigo.click(); }
    const codigo = pg.getByPlaceholder("Ingresa tu código").filter({ visible: true }).first();
    await codigo.waitFor({ timeout: 30000 });
    await dormir(2500);
    const boton = pg.getByRole("switch", { name: "Voy a comer" }).filter({ visible: true });
    assert.equal(await boton.count(), 1, `${t.nombre}: un solo «Voy a comer» visible`);
    await dentro(boton, t, "«Voy a comer»");
    if (t.width < 768) {
      const barra = await pg.locator("#reloj-barra-movil").boundingBox();
      const b = await boton.boundingBox();
      assert.ok(b.y >= barra.y && b.height >= 43.5, "app 390: en la barra de métodos, 44 px");
    }
    assert.ok(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${t.nombre}: sin desborde horizontal`);
    await boton.click();
    await pg.locator("[data-aviso-voy-a-comer]").filter({ visible: true }).first().waitFor({ timeout: 5000 });
    assert.equal(await boton.getAttribute("aria-checked"), "true");
    const avisoApp = pg.locator("[data-aviso-voy-a-comer]").filter({ visible: true }).first();
    const tapa = await avisoApp.evaluate((el) => {
      const a = el.getBoundingClientRect();
      return [...document.querySelectorAll("button")].filter((b) => b.offsetParent).some((b) => {
        const r = b.getBoundingClientRect();
        return r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top;
      });
    });
    assert.equal(tapa, false, `app ${t.nombre}: el aviso no tapa botones`);
    await dormir(300); // termina la transición de color
    await captura(pg, `app-${t.nombre}-prendido`);
    await codigo.fill("1001");
    await codigo.press("Enter");
    await pg.getByText(/Salida a comer registrada/).filter({ visible: true }).first().waitFor({ timeout: 20000 });
    assert.equal(estado.envios.at(-1).accion, "salida_comida");
    await captura(pg, `app-${t.nombre}-salida-a-comer`);
    assert.deepEqual(errores, [], `${t.nombre}: sin errores de JavaScript`);
    console.log(`ok app ${t.nombre}: «Voy a comer» manda salida_comida con la misma regla del servidor`);
    await ctx.close();
  }
  exito = true;
  console.log("OK «Voy a comer»: kiosco y app a 1440 y 390");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
