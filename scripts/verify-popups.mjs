// Verificación en navegador de los pop-ups de venta (21/11/2026), con el backend simulado.
// Página pública: aparece a los segundos indicados (nunca antes de 3), se cierra con Esc y con la X, registra
// vista/cierre/clic, no vuelve a salir dentro de su frecuencia, en celular sube desde abajo y sin backend la
// página no se rompe. Panel: un Admin crea un pop-up con vista previa y se manda como multipart.
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

const popup = {
  id: 7, titulo: "30 % en tu primer año", texto: "Solo en el Buen Fin.", imagen_url: null, boton_texto: "Cotizar ahora",
  boton_url: "/contacto", cupon: "BUENFIN26", disparador: "tiempo", segundos: 3, scroll_pct: 50, frecuencia_dias: 7, dispositivos: "todos",
};
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
    if (url.origin !== BACKEND || !conBackend) return route.abort();
    const responde = (o) => route.fulfill({ ...o, headers: { ...cors, ...(o.headers ?? {}) } });
    if (req.method() === "OPTIONS") return responde({ status: 204 });
    if (url.pathname === "/api/checador/popups/publicos") {
      assert.ok(["inicio", "blog", "articulos"].includes(url.searchParams.get("pagina")));
      return responde({ json: { ok: true, popups: [popup] } });
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

  // 1) Aparece a los 3 s (no antes), con cupón; Esc lo cierra y registra vista y cierre.
  const ctx = await contexto(browser);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await dormir(1500);
  assert.equal(await page.locator(".pv-fondo").count(), 0, "no aparece antes de 3 s");
  const dialogo = page.getByRole("dialog", { name: "30 % en tu primer año" });
  await dialogo.waitFor({ timeout: 5000 });
  assert.ok(await dialogo.getByText("BUENFIN26").isVisible());
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Cerrar", "el foco va al botón de cerrar");
  await page.keyboard.press("Escape");
  await dialogo.waitFor({ state: "detached" });
  await dormir(300);
  assert.deepEqual(eventos.map((e) => e.tipo), ["vista", "cierre"]);

  // 2) Dentro de su frecuencia no vuelve a salir (otra visita, mismo navegador).
  await page.reload({ waitUntil: "domcontentloaded" });
  await dormir(4500);
  assert.equal(await page.locator(".pv-fondo").count(), 0, "no se repite en 7 días");
  await ctx.close();

  // 3) En el blog: clic en el botón registra el clic y lleva al enlace.
  const ctx2 = await contexto(browser);
  const p2 = await ctx2.newPage();
  p2.on("pageerror", (e) => errores.push(e.message));
  await p2.goto(base + "/blog", { waitUntil: "domcontentloaded" });
  await p2.getByRole("dialog", { name: "30 % en tu primer año" }).getByRole("link", { name: "Cotizar ahora" }).click({ timeout: 6000 });
  await p2.waitForURL("**/contacto");
  await dormir(300);
  assert.equal(eventos.at(-1).tipo, "clic");
  await ctx2.close();

  // 4) Celular: tarjeta pegada abajo, sin desborde; la X cierra.
  const ctx3 = await contexto(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p3 = await ctx3.newPage();
  p3.on("pageerror", (e) => errores.push(e.message));
  await p3.goto(base + "/blog/registro-electronico-jornada-2027", { waitUntil: "domcontentloaded" });
  const d3 = p3.getByRole("dialog", { name: "30 % en tu primer año" });
  await d3.waitFor({ timeout: 6000 });
  const caja = await d3.boundingBox();
  assert.ok(Math.abs(caja.y + caja.height - 844) <= 2, "pegada al borde inferior");
  assert.equal(await p3.evaluate(() => document.documentElement.scrollWidth), 390);
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
  // Elegir una página concreta quita «Todas las páginas».
  await p5.getByLabel("Lista del blog").check();
  assert.equal(await p5.getByLabel("Todas las páginas").isChecked(), false);
  await p5.getByRole("button", { name: "Guardar" }).click();
  await p5.getByRole("cell", { name: /^Navidad Prueba de Navidad/ }).waitFor({ timeout: 5000 });
  assert.equal(creados.length, 1);
  await ctx5.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK pop-ups: aparece a los 3 s con cupón, Esc/X cierran, foco accesible, frecuencia, clic al enlace, celular abajo, sin backend no rompe, panel crea con vista previa (multipart)");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
