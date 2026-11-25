// Verificación en navegador de los pop-ups de venta (diseño «Conversemos»), con el backend
// simulado. Página pública: aparece a los segundos indicados (nunca antes de 3), dividido en dos en escritorio y en
// una columna en celular (390 px sin desborde); valida nombre, celular por lada y aviso de privacidad; al enviar
// abre el WhatsApp de ventas, registra la aceptación y el «clic»; Esc/X cierran; foco atrapado; frecuencia; sin
// backend la página no se rompe. Panel: un Admin crea un pop-up con vista previa y se manda como multipart.
// CAPTURAS_POPUPS=<carpeta> guarda capturas de escritorio y teléfono.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx npm run build
//      && node scripts/verify-popups.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const BACKEND = "https://api.prueba.invalid";
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
// El middleware de Next verifica el JWT con JWT_SECRET: se firma uno de prueba con un secreto local.
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwtAdmin = (() => {
  const cuerpo = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ tipo_usuario: "Admin", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${cuerpo}.${crypto.createHmac("sha256", secreto).update(cuerpo).digest("base64url")}`;
})();
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Sin imagen: se ve el collage de marca. Con imagen (id 8): la imagen ocupa el lado derecho.
const popupCollage = {
  id: 7, titulo: "Conoce ADAMIA con una llamada", texto: "Déjanos tus datos y te asesoramos sin costo.", imagen_url: null, boton_texto: "Conversemos",
  boton_url: "/contacto", cupon: "BUENFIN26", disparador: "tiempo", segundos: 3, scroll_pct: 50, frecuencia_dias: 7, dispositivos: "todos", fecha_fin: "2026-11-30 23:59:00",
};
const popupImagen = { ...popupCollage, id: 8, cupon: null, fecha_fin: null, imagen_url: "/checador/popups/publicos/8/imagen?v=1" };
let popup = popupCollage;
const CAPTURAS = process.env.CAPTURAS_POPUPS || "";
const capturar = async (pagina, nombre) => { if (CAPTURAS) await pagina.screenshot({ path: `${CAPTURAS}/${nombre}.png` }); };
const aceptaciones = [];
const whatsapp = [];
const eventos = [];
const creados = [];
const cors = {
  "Access-Control-Allow-Origin": base,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

async function contexto(browser, opciones = {}, { conBackend = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", ...opciones });
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    // WhatsApp de ventas: no se sale a internet, solo se anota a dónde iba.
    if (url.hostname === "wa.me") {
      whatsapp.push(req.url());
      return route.fulfill({ status: 200, contentType: "text/html", body: "<p>WhatsApp</p>" });
    }
    if (url.origin !== BACKEND || !conBackend) return route.abort();
    const responde = (o) => route.fulfill({ ...o, headers: { ...cors, ...(o.headers ?? {}) } });
    if (req.method() === "OPTIONS") return responde({ status: 204 });
    if (url.pathname === "/api/checador/popups/publicos") {
      assert.ok(["inicio", "blog", "articulos"].includes(url.searchParams.get("pagina")));
      return responde({ json: { ok: true, popups: [popup] } });
    }
    if (url.pathname === "/api/checador/legal/aceptaciones" && req.method() === "POST") {
      aceptaciones.push(req.postDataJSON());
      return responde({ status: 201, json: { ok: true, registradas: 1 } });
    }
    // La imagen la entrega el backend (bucket privado): PNG de 1×1.
    if (url.pathname === "/api/checador/popups/publicos/8/imagen") {
      return responde({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") });
    }
    const ev = /^\/api\/checador\/popups\/publicos\/(\d+)\/evento$/.exec(url.pathname);
    if (ev) {
      eventos.push({ id: Number(ev[1]), tipo: req.postDataJSON().tipo });
      return responde({ status: 204, body: "" });
    }
    if (url.pathname.endsWith("/users/verify/token")) {
      return responde({ json: { user: { id_usuario: 1, tipo_usuario: "Admin", nombre: "Equipo ADAMIA", empresas: [], empresas_detalle: [] } } });
    }
    if (url.pathname === "/api/checador/popups" && req.method() === "GET") {
      return responde({ json: { ok: true, popups: creados } });
    }
    if (url.pathname === "/api/checador/popups" && req.method() === "POST") {
      const tipo = req.headers()["content-type"] ?? "";
      assert.match(tipo, /multipart\/form-data/);
      assert.ok(req.headers().authorization?.startsWith("Bearer "));
      const cuerpo = req.postData() ?? "";
      assert.match(cuerpo, /name="titulo"\r\n\r\nPrueba de Navidad/);
      assert.match(cuerpo, /name="paginas"\r\n\r\n\["blog"\]/);
      creados.push({ id: 1, nombre: "Navidad", titulo: "Prueba de Navidad", boton_url: "/cotiza", estado: "pausado", paginas: ["blog"], disparador: "tiempo", segundos: 8, frecuencia_dias: 7, vistas: 0, clics: 0 });
      return responde({ status: 201, json: { ok: true, popup: creados[0] } });
    }
    return responde({ json: [] });
  });
  return ctx;
}

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];

  // 1) Escritorio: aparece a los 3 s (no antes), dividido en dos (formulario azul marino | collage + franja),
  //    con cupón; botón deshabilitado sin datos; foco atrapado; Esc cierra y registra vista y cierre.
  const ctx = await contexto(browser);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await dormir(1500);
  assert.equal(await page.locator(".pv-fondo").count(), 0, "no aparece antes de 3 s");
  const dialogo = page.getByRole("dialog", { name: "Conoce ADAMIA con una llamada" });
  await dialogo.waitFor({ timeout: 5000 });
  await page.evaluate(() => document.fonts.ready);
  await dormir(500);
  assert.ok(await dialogo.getByText("BUENFIN26").isVisible());
  assert.ok(await dialogo.getByText("Checador, nómina y firma en una sola app").isVisible(), "franja con la frase de valor");
  assert.ok(await page.locator(".pv-collage").isVisible(), "collage de marca sin imagen");
  assert.equal(await page.locator(".pv-collage img").count(), 0, "el collage no usa fotos");
  const caja1 = await dialogo.boundingBox();
  assert.ok(caja1.width >= 960, "pop-up ancho en escritorio");
  const lado = await page.locator(".pv-lado").boundingBox();
  const visual = await page.locator(".pv-visual").boundingBox();
  assert.ok(lado.x < visual.x && Math.abs(lado.y - visual.y) < 2, "formulario a la izquierda, collage a la derecha");
  assert.equal(await page.locator(".pv-lado").evaluate((el) => getComputedStyle(el.parentElement).backgroundColor), "rgb(11, 16, 51)", "azul marino #0b1033");
  const cerrarCaja = await dialogo.getByRole("button", { name: "Cerrar" }).boundingBox();
  assert.ok(cerrarCaja.x + cerrarCaja.width > caja1.x + caja1.width - 70 && cerrarCaja.y < caja1.y + 70, "cerrar arriba a la derecha");
  assert.equal(await dialogo.getByRole("button", { name: "Cerrar" }).evaluate((el) => getComputedStyle(el).borderRadius), "50%");
  assert.ok(await dialogo.getByLabel("Nombre", { exact: true }).isVisible());
  assert.ok(await dialogo.getByLabel("Número de celular").isVisible());
  assert.equal(await dialogo.getByLabel("Lada del país").inputValue(), "MX", "México por defecto");
  assert.ok(await dialogo.getByText("+52", { exact: true }).isVisible());
  assert.ok(await dialogo.getByRole("button", { name: "Conversemos" }).isDisabled(), "deshabilitado sin datos");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Cerrar", "el foco va al botón de cerrar");
  // Foco atrapado: Mayús+Tab desde el primero va al último y Tab desde el último vuelve al primero.
  await page.keyboard.press("Shift+Tab");
  assert.ok(await page.evaluate(() => document.querySelector(".pv-dialogo").contains(document.activeElement)), "Mayús+Tab no sale");
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    assert.ok(await page.evaluate(() => document.querySelector(".pv-dialogo").contains(document.activeElement)), "Tab no sale del pop-up");
  }
  assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden", "la página no se desplaza detrás");
  // Sin texto cortado en el título, el botón ni la franja.
  for (const sel of [".pv-lado h2", ".pv-boton", ".pv-franja", ".pv-mini-txt b"]) {
    const cortes = await page.locator(sel).evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    assert.equal(cortes, 0, `sin texto cortado en ${sel}`);
  }
  await page.evaluate(() => document.activeElement?.blur());
  await capturar(page, "escritorio-1440");
  await page.keyboard.press("Escape");
  await dialogo.waitFor({ state: "detached" });
  await dormir(300);
  assert.deepEqual(eventos.map((e) => e.tipo), ["vista", "cierre"]);
  assert.equal(await page.evaluate(() => document.body.style.overflow), "", "se libera el desplazamiento");

  // 2) Dentro de su frecuencia no vuelve a salir (otra visita, mismo navegador).
  await page.reload({ waitUntil: "domcontentloaded" });
  await dormir(4500);
  assert.equal(await page.locator(".pv-fondo").count(), 0, "no se repite en 7 días");
  await ctx.close();

  // 3) Blog, variante con imagen: validación del celular, aceptación del aviso, envío (WhatsApp de ventas,
  //    constancia legal y evento «clic»), gracias y «Continuar» lleva al enlace configurado.
  popup = popupImagen;
  const ctx2 = await contexto(browser);
  const p2 = await ctx2.newPage();
  p2.on("pageerror", (e) => errores.push(e.message));
  await p2.goto(base + "/blog", { waitUntil: "domcontentloaded" });
  const d2 = p2.getByRole("dialog", { name: "Conoce ADAMIA con una llamada" });
  await d2.waitFor({ timeout: 6000 });
  await p2.waitForFunction(() => document.querySelector(".pv-imagen img")?.naturalWidth > 0, null, { timeout: 4000 });
  assert.match(await p2.locator(".pv-imagen img").getAttribute("src"), /^https:\/\/api\.prueba\.invalid\/api\/checador\/popups\/publicos\/8\/imagen\?v=1$/);
  assert.equal(await p2.locator(".pv-collage").count(), 0, "con imagen no se dibuja el collage");
  const boton = d2.getByRole("button", { name: "Conversemos" });
  await d2.getByLabel("Nombre", { exact: true }).fill("Ana López");
  await d2.getByLabel("Número de celular").fill("55 1234 567");
  await d2.getByLabel("Número de celular").blur();
  assert.ok(await d2.getByText("Revisa tu número: en México lleva 10 dígitos.").isVisible(), "aviso de 10 dígitos");
  assert.equal(await d2.getByLabel("Número de celular").getAttribute("aria-invalid"), "true");
  await d2.getByLabel("Número de celular").fill("55 1234 5678");
  assert.ok(await boton.isDisabled(), "falta aceptar el aviso de privacidad");
  await d2.getByLabel("He leído y acepto el Aviso de privacidad.").check();
  assert.ok(await boton.isEnabled(), "datos válidos: se habilita");
  await capturar(p2, "escritorio-imagen-lleno");
  const [wa] = await Promise.all([ctx2.waitForEvent("page"), boton.click()]);
  for (let i = 0; !whatsapp.length && i < 40; i++) await dormir(100);
  assert.match(whatsapp.at(-1) ?? "", /^https:\/\/wa\.me\/523171288029\?text=/);
  const texto = new URL(whatsapp.at(-1)).searchParams.get("text");
  assert.match(texto, /Nombre: Ana López\nCelular: \+52 5512345678 \(México\)/);
  await wa.close();
  await p2.getByRole("dialog", { name: "¡Gracias, Ana!" }).waitFor({ timeout: 3000 });
  await dormir(400);
  assert.deepEqual(aceptaciones.at(-1), { contexto: "contacto", documentos: [{ id: "aviso_privacidad", version: "2026-11-25" }], nombre: "Ana López", telefono: "+525512345678" });
  assert.equal(eventos.at(-1).tipo, "clic");
  assert.equal(eventos.at(-1).id, 8);
  await capturar(p2, "escritorio-gracias");
  await p2.getByRole("link", { name: "Continuar" }).click();
  await p2.waitForURL("**/contacto");
  await ctx2.close();
  popup = popupCollage;

  // 4) Celular 390 px: hoja pegada abajo en una columna (solo la franja de la parte visual), sin desborde
  //    horizontal; la lada cambia la validación (EE. UU.); la X cierra.
  const ctx3 = await contexto(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p3 = await ctx3.newPage();
  p3.on("pageerror", (e) => errores.push(e.message));
  await p3.goto(base + "/blog/registro-electronico-jornada-2027", { waitUntil: "domcontentloaded" });
  const d3 = p3.getByRole("dialog", { name: "Conoce ADAMIA con una llamada" });
  await d3.waitFor({ timeout: 6000 });
  await p3.evaluate(() => document.fonts.ready);
  await dormir(500);
  const caja = await d3.boundingBox();
  assert.ok(Math.abs(caja.y + caja.height - 844) <= 2, "pegada al borde inferior");
  assert.ok(caja.height <= 844 * 0.92 + 2, "deja ver la página arriba");
  assert.equal(await p3.evaluate(() => document.documentElement.scrollWidth), 390, "sin desborde horizontal de la página");
  const desbordes = await p3.locator(".pv-dialogo *").evaluateAll((els) =>
    els.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > 390.5 || r.left < -0.5); }).map((el) => el.className));
  assert.deepEqual(desbordes, [], "nada del pop-up se sale de los 390 px");
  assert.equal(await p3.locator(".pv-collage").isVisible(), false, "el collage se oculta en celular");
  assert.ok(await d3.getByText("Checador, nómina y firma en una sola app").isVisible(), "queda la franja");
  const franja = await p3.locator(".pv-franja").boundingBox();
  const form = await p3.locator(".pv-form").boundingBox();
  assert.ok(franja.y < form.y, "la franja va arriba del formulario");
  for (const sel of [".pv-lado h2", ".pv-boton", ".pv-franja"]) {
    const cortes = await p3.locator(sel).evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    assert.equal(cortes, 0, `sin texto cortado en ${sel} (celular)`);
  }
  const alto = await d3.getByLabel("Número de celular").boundingBox();
  assert.ok(alto.height >= 44, "campo táctil de 44 px o más");
  await capturar(p3, "telefono-390");
  await d3.getByLabel("Lada del país").selectOption("US");
  assert.ok(await d3.getByText("+1", { exact: true }).isVisible());
  await d3.getByLabel("Nombre", { exact: true }).fill("John");
  await d3.getByLabel("Número de celular").fill("212 555 0199");
  await d3.getByLabel("He leído y acepto el Aviso de privacidad.").check();
  assert.ok(await d3.getByRole("button", { name: "Conversemos" }).isEnabled(), "10 dígitos válidos para EE. UU.");
  await d3.getByLabel("Lada del país").selectOption("GT");
  assert.ok(await d3.getByRole("button", { name: "Conversemos" }).isDisabled(), "Guatemala lleva 8 dígitos");
  await d3.getByLabel("Lada del país").selectOption("MX");
  await d3.getByLabel("Número de celular").fill("3312345678");
  await d3.getByLabel("Número de celular").blur();
  await capturar(p3, "telefono-390-lleno");
  await p3.locator(".pv-tarjeta").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await capturar(p3, "telefono-390-abajo");
  await d3.getByRole("button", { name: "Cerrar" }).click();
  await d3.waitFor({ state: "detached" });
  await ctx3.close();

  // 5) Sin backend la página sigue bien y no hay pop-up.
  const ctx4 = await contexto(browser, {}, { conBackend: false });
  const p4 = await ctx4.newPage();
  p4.on("pageerror", (e) => errores.push(e.message));
  await p4.goto(base + "/", { waitUntil: "domcontentloaded" });
  await dormir(4000);
  assert.equal(await p4.locator(".pv-fondo").count(), 0);
  await ctx4.close();

  // 6) Panel: un Admin crea un pop-up para el blog con vista previa en vivo.
  const ctx5 = await contexto(browser);
  await ctx5.addCookies([{ name: "token", value: jwtAdmin, url: base }]);
  const p5 = await ctx5.newPage();
  p5.on("pageerror", (e) => errores.push(e.message));
  await p5.goto(base + "/dashboard/popups", { waitUntil: "domcontentloaded" });
  await p5.getByText("Aún no hay pop-ups.").waitFor({ timeout: 15000 });
  await p5.getByRole("button", { name: "Nuevo pop-up" }).click();
  await p5.getByLabel("Nombre interno").fill("Navidad");
  await p5.getByLabel("Título").fill("Prueba de Navidad");
  assert.ok(await p5.getByRole("dialog").getByText("Prueba de Navidad", { exact: true }).last().isVisible(), "vista previa en vivo");
  // La vista previa no repite ids del formulario de edición (cada etiqueta apunta a un solo campo).
  assert.equal(await p5.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map((e) => e.id); return ids.length - new Set(ids).size; }), 0, "sin ids repetidos");
  // El título grande se ve igual en el panel (sin --font-outfit la regla «font» no debe anularse).
  assert.equal(await p5.locator(".pv-lado h2").evaluate((el) => getComputedStyle(el).fontWeight), "800", "título en negritas en la vista previa");
  await capturar(p5, "panel-vista-previa");
  // Elegir una página concreta quita «Todas las páginas».
  await p5.getByLabel("Lista del blog").check();
  assert.equal(await p5.getByLabel("Todas las páginas").isChecked(), false);
  await p5.getByRole("button", { name: "Guardar" }).click();
  await p5.getByRole("cell", { name: /^Navidad Prueba de Navidad/ }).waitFor({ timeout: 5000 });
  assert.equal(creados.length, 1);
  await ctx5.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK pop-ups: diseño dividido (formulario azul marino | collage + franja), aparece a los 3 s con cupón, botón deshabilitado hasta datos válidos, lada +52 con 10 dígitos (y EE. UU./Guatemala), aviso de privacidad registrado, WhatsApp de ventas, evento clic, gracias y Continuar, foco atrapado, Esc/X cierran, frecuencia, variante con imagen, celular 390 px sin desborde, sin backend no rompe, panel crea con vista previa (multipart)");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
