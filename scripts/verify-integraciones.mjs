// Verificación en navegador de Ajustes → Integraciones y /desarrolladores (26/12/2026): lista de llaves (activa, vencida,
// revocada), crear con validación, llave mostrada una vez con «Copiar», revocar con confirmación, bitácora y enlace a la
// documentación; un usuario con acceso ve «Solo para el dueño». Escritorio (1440) y teléfono (390): sin scroll
// horizontal, objetivos táctiles ≥ 44 px (teléfono) y texto ≥ 13 px en las piezas nuevas. Backend simulado.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      CAPTURAS=/ruta/capturas PLAYWRIGHT_MODULE_PATH=… node scripts/verify-integraciones.mjs
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
const API_ORIGEN = "https://api.prueba.invalid";
const require = createRequire(REPO + "/package.json");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, [REPO + "/node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { cwd: REPO, stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const firmar = (tipo) => {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
};
const DUENA = {
  id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Diana Robles", correo: "diana@panaderia.mx", id_empresa: 7, empresas: [7, 9],
  empresas_detalle: [{ id_empresa: 7, nombre: "Panadería La Espiga" }, { id_empresa: 9, nombre: "Espiga Norte" }], zona_horaria: "America/Mexico_City",
};
const LLAVE_NUEVA = `adk_live_Qm9sYXNEZUFubmFfMjAyNl9wcnVlYmFfZGVtb19zZWNyZXRv`;

function estadoInicial() {
  return {
    pedidos: [],
    llaves: [
      { id: 3, nombre: "Nómina externa (Contpaqi)", prefijo: "adk_live_Xk29PqLm", permisos: ["empleados:leer", "asistencias:leer"], estado: "activa", creada_en: "2026-12-02 10:14:00", creada_por: "Diana Robles", expira_en: "2027-03-02 10:14:00", ultimo_uso_en: "2026-12-26 08:58:12", ultimo_uso_ip: "189.203.44.10", revocada_en: null },
      { id: 2, nombre: "Control de acceso torniquetes", prefijo: "adk_live_Hh71ZzWq", permisos: ["empleados:leer", "empleados:escribir"], estado: "expirada", creada_en: "2026-09-01 12:00:00", creada_por: "Diana Robles", expira_en: "2026-12-01 12:00:00", ultimo_uso_en: "2026-11-30 22:10:00", ultimo_uso_ip: "201.141.8.2", revocada_en: null },
      { id: 1, nombre: "Prueba de Luis", prefijo: "adk_live_Aa00Bb11", permisos: ["asistencias:leer"], estado: "revocada", creada_en: "2026-08-15 09:00:00", creada_por: "Diana Robles", expira_en: null, ultimo_uso_en: null, ultimo_uso_ip: null, revocada_en: "2026-08-20 18:30:00" },
    ],
    bitacora: [
      { id: 90, id_llave: 3, llave: "Nómina externa (Contpaqi)", prefijo: "adk_live_Xk29PqLm", metodo: "GET", ruta: "/api/integracion/v1/asistencias", estado: 200, ms: 84, ip: "189.203.44.10", creado_en: "2026-12-26 08:58:12" },
      { id: 89, id_llave: 3, llave: "Nómina externa (Contpaqi)", prefijo: "adk_live_Xk29PqLm", metodo: "GET", ruta: "/api/integracion/v1/empleados", estado: 200, ms: 41, ip: "189.203.44.10", creado_en: "2026-12-26 08:58:10" },
      { id: 88, id_llave: 3, llave: "Nómina externa (Contpaqi)", prefijo: "adk_live_Xk29PqLm", metodo: "POST", ruta: "/api/integracion/v1/empleados", estado: 403, ms: 6, ip: "189.203.44.10", creado_en: "2026-12-25 19:02:44" },
      { id: 87, id_llave: 2, llave: "Control de acceso torniquetes", prefijo: "adk_live_Hh71ZzWq", metodo: "PATCH", ruta: "/api/integracion/v1/empleados/1284", estado: 422, ms: 18, ip: "201.141.8.2", creado_en: "2026-11-30 22:10:00" },
      { id: 86, id_llave: 3, llave: "Nómina externa (Contpaqi)", prefijo: "adk_live_Xk29PqLm", metodo: "GET", ruta: "/api/integracion/v1/asistencias", estado: 429, ms: 2, ip: "189.203.44.10", creado_en: "2026-11-29 07:00:03" },
    ],
  };
}
let S = estadoInicial();
let usuario = DUENA;

async function instalarMocks(ctx) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base) return json({});
    if (url.origin !== API_ORIGEN) return route.abort();
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    if (p === "/users/verify/token") {
      return json(usuario.esAcceso
        ? { user: usuario, permisos: { plantilla: "administrador", modulos: { empleados: "editar", asistencias: "editar" }, empresas: [] } }
        : { user: usuario });
    }
    if (!p.startsWith("/checador/integraciones")) return json({});
    const ruta = p.slice("/checador/integraciones".length);
    let cuerpo = null;
    try { cuerpo = req.postData() ? JSON.parse(req.postData()) : null; } catch { cuerpo = req.postData(); }
    S.pedidos.push({ metodo: req.method(), ruta, params: url.search, cuerpo });
    let m;
    if (ruta === "/catalogo") return json({ ok: true, configurada: true, limite_por_minuto: 60, max_activas: 25, retencion_bitacora_dias: 90 });
    if (ruta === "/llaves" && req.method() === "GET") return json({ ok: true, data: S.llaves });
    if (ruta === "/llaves" && req.method() === "POST") {
      const nueva = { id: 4, nombre: cuerpo.nombre, prefijo: LLAVE_NUEVA.slice(0, 17), permisos: cuerpo.permisos, estado: "activa", creada_en: "2026-12-26 11:20:00", creada_por: "Diana Robles", expira_en: cuerpo.expira_en_dias ? "2027-12-26 11:20:00" : null, ultimo_uso_en: null, ultimo_uso_ip: null, revocada_en: null };
      S.llaves.unshift(nueva);
      return json({ ok: true, llave: LLAVE_NUEVA, data: nueva, aviso: "Copia la llave ahora: no se vuelve a mostrar." }, 201);
    }
    if ((m = ruta.match(/^\/llaves\/(\d+)\/revocar$/))) {
      const l = S.llaves.find((x) => String(x.id) === m[1]);
      Object.assign(l, { estado: "revocada", revocada_en: "2026-12-26 11:25:00" });
      return json({ ok: true, data: l });
    }
    if (ruta === "/bitacora") return json({ ok: true, data: S.bitacora });
    return json({});
  });
}

async function revisar(page, selector, { movil }) {
  await dormir(450);
  const r = await page.evaluate(({ selector, movil }) => {
    const raiz = document.querySelector(selector);
    if (!raiz) return { falta: selector };
    const anchoDoc = document.documentElement.scrollWidth;
    const chicos = [];
    const letra = [];
    for (const el of raiz.querySelectorAll("button, a[href], input[type=checkbox], input[type=radio], select, input:not([type]), textarea")) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height || getComputedStyle(el).visibility === "hidden") continue;
      if (el.closest("[data-slot='dialog-content'] > button.absolute")) continue; // la X del diálogo (shadcn) tiene su propio estándar
      const objetivo = el.closest("label") ?? el;
      const ob = objetivo.getBoundingClientRect();
      if (movil && ob.height < 43.5 && b.height < 43.5) chicos.push(`${el.tagName} «${(el.innerText || el.getAttribute("aria-label") || el.value || "").trim().slice(0, 30)}» ${Math.round(ob.height)}px`);
    }
    const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    while (caminante.nextNode()) {
      const n = caminante.currentNode;
      if (!n.textContent.trim() || !n.parentElement) continue;
      const estilo = getComputedStyle(n.parentElement);
      if (estilo.display === "none" || n.parentElement.closest(".sr-only, [aria-hidden=true]")) continue;
      if (parseFloat(estilo.fontSize) < 12.99) letra.push(`«${n.textContent.trim().slice(0, 30)}» ${estilo.fontSize}`);
    }
    return { anchoDoc, ventana: window.innerWidth, chicos, letra };
  }, { selector, movil });
  assert.equal(r.falta, undefined, `falta ${r.falta}`);
  assert.ok(r.anchoDoc <= r.ventana, `${selector}: scroll horizontal (${r.anchoDoc} > ${r.ventana})`);
  assert.deepEqual(r.chicos, [], `${selector}: objetivos táctiles < 44 px`);
  assert.deepEqual(r.letra, [], `${selector}: texto < 13 px`);
}

const captura = async (page, nombre, completa = false) => { if (OUT) await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: completa }); };

async function recorrido(browser, { ancho, alto, sufijo }) {
  S = estadoInicial();
  usuario = DUENA;
  const movil = ancho < 1024;
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-MX", timezoneId: "America/Mexico_City", deviceScaleFactor: movil ? 2 : 1, hasTouch: movil, isMobile: movil, permissions: ["clipboard-read", "clipboard-write"] });
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctx);
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));

  // ——— 1. Lista de llaves y bitácora ———
  await page.goto(base + "/panel/integraciones", { waitUntil: "domcontentloaded" });
  await page.locator("[data-llave='adk_live_Xk29PqLm']").waitFor({ timeout: 30000 });
  assert.equal(await page.locator("li[data-llave]").count(), 3);
  assert.match(await page.locator("[data-llave='adk_live_Xk29PqLm']").innerText(), /Activa[\s\S]*adk_live_Xk29PqLm…[\s\S]*Consultar empleados[\s\S]*26 dic 2026, 08:58 · 189\.203\.44\.10/);
  assert.match(await page.locator("[data-llave='adk_live_Hh71ZzWq']").innerText(), /Vencida/);
  assert.equal(await page.locator("[data-llave='adk_live_Aa00Bb11']").getByRole("button", { name: "Revocar" }).count(), 0, "una revocada no se revoca otra vez");
  assert.match(await page.locator("#int-llaves").innerText(), /\(1 activa\)/);
  assert.equal(await page.locator("[aria-label='Uso reciente de la API'] li").count(), 5);
  assert.equal(await page.getByRole("link", { name: "Ver documentación" }).getAttribute("href"), "/desarrolladores");
  assert.ok(S.pedidos.some((x) => x.ruta === "/llaves" && x.params === "?empresa=7"), "pide las llaves de la empresa elegida");
  for (const sel of ["section[aria-labelledby='int-como']", "section[aria-labelledby='int-llaves']", "section[aria-labelledby='int-bitacora']"]) await revisar(page, sel, { movil });
  await captura(page, `01-integraciones-lista-${sufijo}`);
  await captura(page, `01b-integraciones-completa-${sufijo}`, true);

  // ——— 2. Crear: validación, luego la llave se muestra una vez ———
  await page.getByRole("button", { name: "Crear llave" }).click();
  const dlg = page.getByRole("dialog", { name: "Nueva llave de API" });
  await dlg.waitFor();
  await dlg.getByRole("button", { name: "Crear llave" }).click();
  assert.match(await dlg.innerText(), /Escribe un nombre de 3 a 80 caracteres/);
  assert.equal(S.pedidos.filter((x) => x.metodo === "POST" && x.ruta === "/llaves").length, 0, "no se manda inválida");
  await dlg.getByLabel("Nombre").fill("ERP Odoo");
  assert.doesNotMatch(await dlg.innerText(), /Escribe un nombre de 3 a 80/, "el error se quita al corregir");
  await dlg.getByLabel(/Crear y actualizar empleados/).check();
  await dlg.getByLabel("1 año").check();
  await revisar(page, "[role='dialog']", { movil });
  await captura(page, `02-nueva-llave-${sufijo}`);
  await dlg.getByRole("button", { name: "Crear llave" }).click();
  const post = S.pedidos.find((x) => x.metodo === "POST" && x.ruta === "/llaves");
  assert.deepEqual(post.cuerpo, { empresa: 7, nombre: "ERP Odoo", permisos: ["empleados:leer", "empleados:escribir", "asistencias:leer"], expira_en_dias: 365 });
  const lista = page.getByRole("dialog", { name: "Copia tu llave ahora" });
  await lista.waitFor();
  assert.equal(await lista.locator("[data-llave-creada]").innerText(), LLAVE_NUEVA);
  await lista.getByRole("button", { name: "Copiar llave" }).click();
  await lista.getByRole("button", { name: "Copiada" }).waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), LLAVE_NUEVA);
  await revisar(page, "[role='dialog']", { movil });
  await captura(page, `03-llave-creada-${sufijo}`);
  await lista.getByRole("button", { name: "Ya la guardé" }).click();
  await lista.waitFor({ state: "detached" });
  assert.equal(await page.getByText(LLAVE_NUEVA).count(), 0, "la llave completa ya no está en la página");
  await page.locator("[data-llave='adk_live_Qm9sYXNE']").waitFor();
  assert.ok(!(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage) + document.cookie)).includes(LLAVE_NUEVA.slice(17)), "no se guarda en el navegador");

  // ——— 3. Revocar con confirmación ———
  await page.locator("[data-llave='adk_live_Xk29PqLm']").getByRole("button", { name: "Revocar" }).click();
  const conf = page.getByRole("alertdialog");
  await conf.waitFor();
  assert.match(await conf.innerText(), /dejarán de funcionar de inmediato/);
  await captura(page, `04-revocar-confirmar-${sufijo}`);
  await conf.getByRole("button", { name: "Revocar llave" }).click();
  await page.getByText("quedó revocada").waitFor();
  assert.ok(S.pedidos.some((x) => x.ruta === "/llaves/3/revocar" && x.cuerpo?.empresa === 7));
  assert.match(await page.locator("[data-llave='adk_live_Xk29PqLm']").innerText(), /Revocada/);

  // ——— 4. Documentación pública ———
  await page.goto(base + "/desarrolladores", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "API para desarrolladores" }).waitFor({ timeout: 30000 });
  const texto = await page.locator("article").innerText();
  assert.match(texto, /Authorization: Bearer \$ADAMIA_LLAVE/);
  assert.match(texto, /https:\/\/api\.prueba\.invalid\/api\/integracion\/v1\/asistencias\?fecha=2026-12-15/);
  assert.match(texto, /LIMITE_EXCEDIDO[\s\S]*Retry-After/);
  assert.match(texto, /Idempotency-Key/);
  assert.doesNotMatch(texto, /apiKey=\w/);
  await revisar(page, "article", { movil });
  await revisar(page, "nav[aria-label='Contenido']", { movil });
  await captura(page, `05-docs-inicio-${sufijo}`);
  await page.locator("#errores").scrollIntoViewIfNeeded();
  await captura(page, `06-docs-errores-${sufijo}`);
  await captura(page, `06b-docs-completa-${sufijo}`, true);

  // ——— 5. Un usuario con acceso (aunque sea Administrador) no entra ———
  usuario = { ...DUENA, esAcceso: true, nombre: "RH Espiga" };
  await page.goto(base + "/panel/integraciones", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Solo para el dueño de la cuenta" }).waitFor({ timeout: 30000 });
  await captura(page, `07-acceso-solo-dueno-${sufijo}`);

  assert.deepEqual(errores, [], `errores de la página: ${errores.join(" | ")}`);
  await ctx.close();
}

let browser;
try {
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(base + "/login")).status < 500) break; } catch { /* aún no levanta */ }
    await dormir(500);
  }
  browser = await chromium.launch();
  await recorrido(browser, { ancho: 1440, alto: 900, sufijo: "1440" });
  console.log("✔ escritorio 1440");
  await recorrido(browser, { ancho: 390, alto: 844, sufijo: "390" });
  console.log("✔ teléfono 390");
  console.log("Integraciones: todo bien.");
} finally {
  await browser?.close();
  next.kill();
}
