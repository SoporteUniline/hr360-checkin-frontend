// Verificación en navegador de los prospectos (docs/prospectos.md del backend) con el backend simulado, 1440 y 390:
//  1) Pop-up: «Correo (opcional)», casilla de noticias aparte y desmarcada; marcarla sin correo pide el correo en ese
//     momento (foco + aviso); correo mal escrito avisa; con el guardado del prospecto LENTO o CON ERROR, WhatsApp se abre
//     igual dentro del clic y aparece «¡Gracias!»; el cuerpo del prospecto (origen, aviso, noticias y su versión). Sin
//     correo ni casilla se guarda igual. Ya no promete timbrado (tarjeta de vacaciones, frase con contratos).
//  2) /contacto: guarda el prospecto con origen «contacto», celular internacional y la casilla de noticias.
//  3) /baja?token=: botón «Sí, darme de baja», «ya estabas», enlace inválido o sin token, y error con reintento.
//  4) /dashboard/prospectos (Admin): menú, tabla / tarjetas, buscador, filtros, CSV (por omisión solo con noticias; con
//     la casilla, todos), paginación; un usuario de una empresa no entra.
// En las tres pantallas: letra ≥ 16 px (≥ 17 en celular en /baja), títulos en 700, botones ≥ 48 px, sin degradados ni
// desborde horizontal. CAPTURAS=<carpeta> guarda capturas.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-prospectos.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const BACKEND = "https://api.prueba.invalid";
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (tipo) => {
  const cuerpo = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ tipo_usuario: tipo, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${cuerpo}.${crypto.createHmac("sha256", secreto).update(cuerpo).digest("base64url")}`;
};
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const CAPTURAS = process.env.CAPTURAS || "";
// El pop-up se captura en la pantalla visible; las páginas, completas.
const capturar = async (pagina, nombre) => { if (CAPTURAS) await pagina.screenshot({ path: `${CAPTURAS}/${nombre}.png`, fullPage: !nombre.startsWith("popup") }); };

const popup = {
  id: 7, titulo: "Conoce ADAMIA con una llamada", texto: "Déjanos tus datos y te asesoramos sin costo.", imagen_url: null, boton_texto: "Conversemos",
  boton_url: "/contacto", cupon: null, disparador: "tiempo", segundos: 3, scroll_pct: 50, frecuencia_dias: 0, dispositivos: "todos", fecha_fin: null,
};
const TOKEN = "T".repeat(43);
const filasPanel = [
  { id: 2, nombre: "Ana María López Hernández", celular: "+525512345678", correo: "ana.maria.lopez.hernandez@empresa-con-nombre-largo.com.mx", origen_tipo: "popup", origen_id: 7, origen_titulo: "Buen Fin: 30 % de descuento", acepta_noticias: true, creado_en: "2026-11-27 10:15:00" },
  { id: 1, nombre: "Carmen Díaz", celular: null, correo: "carmen@contacto.mx", origen_tipo: "contacto", origen_id: null, origen_titulo: "Página de contacto", acepta_noticias: false, creado_en: "2026-11-26 18:02:00" },
];
const estado = { prospectos: [], aceptaciones: [], whatsapp: [], bajas: [], listados: [], csv: [], modoProspecto: "lento", modoBaja: "ok" };
const cors = {
  "Access-Control-Allow-Origin": base,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Expose-Headers": "content-disposition",
};

async function contexto(browser, opciones = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", acceptDownloads: true, ...opciones });
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname === "wa.me") {
      estado.whatsapp.push(req.url());
      return route.fulfill({ status: 200, contentType: "text/html", body: "<p>WhatsApp</p>" });
    }
    if (url.origin !== BACKEND) return route.abort();
    const responde = (o) => route.fulfill({ ...o, headers: { ...cors, ...(o.headers ?? {}) } });
    if (req.method() === "OPTIONS") return responde({ status: 204 });
    const p = url.pathname;
    if (p === "/api/checador/popups/publicos") return responde({ json: { ok: true, popups: [popup] } });
    if (/^\/api\/checador\/popups\/publicos\/\d+\/evento$/.test(p)) return responde({ status: 204, body: "" });
    if (p === "/api/checador/legal/aceptaciones") { estado.aceptaciones.push(req.postDataJSON()); return responde({ status: 201, json: { ok: true } }); }
    if (p === "/api/checador/prospectos/publico") {
      estado.prospectos.push({ cuerpo: req.postDataJSON(), en: Date.now() });
      // «lento»: el backend tarda 6 s; «error»: 500. En ninguno debe esperar WhatsApp.
      if (estado.modoProspecto === "lento") { await dormir(6000); return responde({ status: 202, json: { ok: true } }).catch(() => {}); }
      if (estado.modoProspecto === "error") return responde({ status: 500, json: { ok: false, error: "x" } });
      return responde({ status: 202, json: { ok: true } });
    }
    if (p === "/api/checador/prospectos/publico/baja") {
      estado.bajas.push(req.postDataJSON());
      if (estado.modoBaja === "error") return responde({ status: 503, json: { ok: false } });
      if (estado.modoBaja === "ya") return responde({ json: { ok: true, ya_estaba: true } });
      return responde({ json: { ok: true, ya_estaba: false } });
    }
    if (p.endsWith("/users/verify/token")) {
      return responde({ json: { user: { id_usuario: 1, tipo_usuario: "Admin", nombre: "Equipo ADAMIA", empresas: [], empresas_detalle: [] } } });
    }
    if (p === "/api/checador/prospectos" && req.method() === "GET") {
      assert.ok(req.headers().authorization?.startsWith("Bearer "));
      estado.listados.push(url.search);
      const q = url.searchParams;
      let filas = filasPanel;
      if (q.get("noticias") === "1") filas = filas.filter((f) => f.acepta_noticias);
      if (q.get("origen") === "contacto") filas = filas.filter((f) => f.origen_tipo === "contacto");
      if (q.get("buscar")) filas = filas.filter((f) => f.nombre.toLowerCase().includes(q.get("buscar").toLowerCase()));
      const total = q.get("buscar") === "muchos" ? 120 : filas.length;
      return responde({ json: {
        ok: true, prospectos: q.get("buscar") === "muchos" ? filasPanel : filas, total, pagina: Number(q.get("pagina") || 1), por_pagina: 50,
        origenes: [{ origen_tipo: "popup", origen_id: 7, origen_titulo: "Buen Fin: 30 % de descuento", total: 1 }, { origen_tipo: "contacto", origen_id: null, origen_titulo: "Página de contacto", total: 1 }],
        resumen: { total: 2, con_noticias: 1 },
      } });
    }
    if (p === "/api/checador/prospectos/csv") {
      estado.csv.push(url.search);
      return responde({ status: 200, headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="prospectos-2026-11-27.csv"' }, body: "\uFEFF\"Nombre\"\r\n\"Ana\"\r\n" });
    }
    return responde({ json: [] });
  });
  return ctx;
}

// Revisiones de legibilidad comunes (letra, títulos, botones, degradados y desborde) dentro de `raiz`.
async function legible(pagina, raiz, { ancho, minLetra = 16, nombre }) {
  const r = await pagina.evaluate(({ raiz, minLetra }) => {
    const el = document.querySelector(raiz);
    const visibles = [...el.querySelectorAll("*")].filter((n) => n.getClientRects().length && getComputedStyle(n).visibility !== "hidden");
    const textos = visibles.filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && !n.closest("[data-chico]"));
    return {
      chicos: textos.filter((n) => parseFloat(getComputedStyle(n).fontSize) < minLetra - 0.01).map((n) => `${n.tagName}:${n.textContent.trim().slice(0, 30)}:${getComputedStyle(n).fontSize}`),
      titulos: [...el.querySelectorAll("h1,h2")].map((h) => getComputedStyle(h).fontWeight),
      botones: [...el.querySelectorAll("button, a[class*='min-h']")].filter((b) => b.getClientRects().length).map((b) => [b.textContent.trim().slice(0, 30), Math.round(b.getBoundingClientRect().height)]).filter(([, h]) => h < 48),
      degradados: visibles.filter((n) => getComputedStyle(n).backgroundImage.includes("gradient")).length,
      ancho: document.documentElement.scrollWidth,
    };
  }, { raiz, minLetra });
  assert.deepEqual(r.chicos, [], `${nombre}: letra de ${minLetra} px o más`);
  assert.ok(r.titulos.length && r.titulos.every((w) => w === "700"), `${nombre}: títulos en 700 (${r.titulos})`);
  assert.deepEqual(r.botones, [], `${nombre}: botones de 48 px o más`);
  assert.equal(r.degradados, 0, `${nombre}: sin degradados`);
  assert.ok(r.ancho <= ancho, `${nombre}: sin desborde horizontal (${r.ancho} > ${ancho})`);
}

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];
  const vigilar = (p) => p.on("pageerror", (e) => errores.push(e.message));

  // ── 1) Pop-up en escritorio: noticias con correo; el guardado del prospecto es LENTO (6 s) ──────────────────────
  const ctx = await contexto(browser);
  const page = await ctx.newPage();
  vigilar(page);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const d = page.getByRole("dialog", { name: "Conoce ADAMIA con una llamada" });
  await d.waitFor({ timeout: 8000 });
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await d.getByText("Checador, contratos y firma en una sola app").isVisible(), "frase sin nómina");
  assert.ok(await d.getByText("Vacaciones aprobadas").isVisible(), "tarjeta de vacaciones");
  assert.equal(await d.getByText(/Timbrado|CFDI/).count(), 0, "ya no promete timbrado");
  const correo = d.getByLabel("Correo (opcional)");
  assert.ok(await correo.isVisible(), "campo Correo (opcional)");
  assert.equal(await correo.getAttribute("type"), "email");
  const casilla = d.getByLabel("Quiero recibir noticias sobre reformas laborales, novedades de ADAMIA y consejos de RH");
  assert.equal(await casilla.isChecked(), false, "la casilla de noticias viene desmarcada");
  const aviso = d.getByLabel("He leído y acepto el Aviso de privacidad.");
  assert.notEqual(await casilla.getAttribute("id"), await aviso.getAttribute("id"), "casilla aparte del aviso");
  const boton = d.getByRole("button", { name: "Conversemos" });
  await d.getByLabel("Nombre", { exact: true }).fill("Ana López");
  await d.getByLabel("Número de celular").fill("55 1234 5678");
  await aviso.check();
  assert.ok(await boton.isEnabled(), "sin correo ni casilla se puede enviar");
  // Marca la casilla sin correo: se pide en ese momento (aviso + foco en el campo) y el botón espera.
  await casilla.check();
  await d.getByText("Para recibir noticias escribe tu correo.").waitFor({ timeout: 2000 });
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("name")), "correo", "el foco va al correo");
  assert.equal(await correo.getAttribute("aria-invalid"), "true");
  assert.ok(await boton.isDisabled(), "con la casilla falta el correo");
  await capturar(page, "popup-1440-falta-correo");
  await correo.fill("ana@empresa");
  await correo.blur();
  assert.ok(await d.getByText("Revisa tu correo (ejemplo: nombre@empresa.com) o déjalo vacío.").isVisible(), "formato del correo");
  assert.ok(await boton.isDisabled());
  await correo.fill("Ana@Empresa.mx");
  assert.ok(await boton.isEnabled(), "correo válido: se habilita");
  await capturar(page, "popup-1440-lleno");
  const t0 = Date.now();
  const [wa] = await Promise.all([ctx.waitForEvent("page", { timeout: 3000 }), boton.click()]);
  assert.ok(Date.now() - t0 < 2500, "WhatsApp se abre sin esperar al guardado (que tarda 6 s)");
  await d.getByText("¡Gracias, Ana!").waitFor({ timeout: 2000 }).catch(async () => { await page.getByRole("dialog", { name: "¡Gracias, Ana!" }).waitFor({ timeout: 2000 }); });
  await wa.close();
  for (let i = 0; !estado.prospectos.length && i < 30; i++) await dormir(100);
  const texto = new URL(estado.whatsapp.at(-1)).searchParams.get("text");
  assert.match(texto, /Celular: \+52 5512345678 \(México\)\nCorreo: ana@empresa\.mx/);
  assert.deepEqual(estado.prospectos.at(-1).cuerpo, {
    nombre: "Ana López", celular: "+525512345678", correo: "ana@empresa.mx", origen: { tipo: "popup", id: 7, titulo: "Conoce ADAMIA con una llamada" },
    aviso_version: "2026-11-25", acepta_noticias: true, noticias_version: "2026-11-27",
  });
  assert.equal(estado.aceptaciones.at(-1).correo, "ana@empresa.mx", "la constancia del aviso lleva el correo");
  assert.ok(await page.getByText("Te enviaremos noticias a").isVisible(), "gracias confirma el correo de las noticias");
  await capturar(page, "popup-1440-gracias");
  await ctx.close();

  // ── 1b) Pop-up en celular (390): sin correo ni casilla; el guardado FALLA y WhatsApp se abre igual ───────────────
  estado.modoProspecto = "error";
  const ctxM = await contexto(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pm = await ctxM.newPage();
  vigilar(pm);
  await pm.goto(base + "/blog", { waitUntil: "domcontentloaded" });
  const dm = pm.getByRole("dialog", { name: "Conoce ADAMIA con una llamada" });
  await dm.waitFor({ timeout: 8000 });
  await pm.evaluate(() => document.fonts.ready);
  assert.ok(await dm.getByLabel("Correo (opcional)").isVisible());
  assert.equal(await pm.evaluate(() => document.documentElement.scrollWidth), 390, "sin desborde horizontal");
  const fuera = await pm.locator(".pv-dialogo *").evaluateAll((els) => els.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > 390.5 || r.left < -0.5); }).length);
  assert.equal(fuera, 0, "nada del pop-up se sale de los 390 px");
  const altoCorreo = await dm.getByLabel("Correo (opcional)").boundingBox();
  assert.ok(altoCorreo.height >= 44, "campo táctil");
  await dm.getByLabel("Nombre", { exact: true }).fill("Luis");
  await dm.getByLabel("Número de celular").fill("3312345678");
  await dm.getByLabel("He leído y acepto el Aviso de privacidad.").check();
  await dm.getByLabel("Quiero recibir noticias sobre reformas laborales, novedades de ADAMIA y consejos de RH").check();
  await dm.getByText("Para recibir noticias escribe tu correo.").waitFor({ timeout: 2000 });
  await capturar(pm, "popup-390-falta-correo");
  await dm.getByLabel("Quiero recibir noticias sobre reformas laborales, novedades de ADAMIA y consejos de RH").uncheck();
  assert.equal(await dm.getByText("Para recibir noticias escribe tu correo.").count(), 0, "al desmarcar ya no se pide");
  const antes = estado.prospectos.length;
  const [wa2] = await Promise.all([ctxM.waitForEvent("page", { timeout: 3000 }), dm.getByRole("button", { name: "Conversemos" }).click()]);
  await wa2.close();
  await pm.getByRole("dialog", { name: "¡Gracias, Luis!" }).waitFor({ timeout: 3000 });
  for (let i = 0; estado.prospectos.length === antes && i < 30; i++) await dormir(100);
  const cuerpoM = estado.prospectos.at(-1).cuerpo;
  assert.deepEqual([cuerpoM.correo, cuerpoM.acepta_noticias, "noticias_version" in cuerpoM, cuerpoM.origen.tipo], [null, false, false, "popup"]);
  assert.equal(await pm.getByText("Te enviaremos noticias a").count(), 0);
  await capturar(pm, "popup-390-gracias");
  await ctxM.close();
  estado.modoProspecto = "ok";

  // ── 2) /contacto ─────────────────────────────────────────────────────────────────────────────────────────────
  const ctxC = await contexto(browser);
  const pc = await ctxC.newPage();
  vigilar(pc);
  const alertas = [];
  pc.on("dialog", (dlg) => { alertas.push(dlg.message()); dlg.dismiss().catch(() => {}); });
  // Se espera a que React tome la página (si se llena antes, el estado de la casilla del aviso se pierde).
  await pc.goto(base + "/contacto", { waitUntil: "load" });
  await pc.waitForFunction(() => [...document.querySelectorAll("form input")].some((el) => Object.keys(el).some((k) => k.startsWith("__reactProps"))));
  const nContacto = pc.getByLabel("Quiero recibir noticias sobre reformas laborales, novedades de ADAMIA y consejos de RH");
  assert.equal(await nContacto.isChecked(), false, "/contacto: casilla desmarcada");
  await pc.getByLabel("Nombre completo").fill("Carmen Díaz");
  await pc.getByLabel("Correo electrónico").fill("Carmen@Contacto.mx");
  await pc.getByLabel("Teléfono").fill("33 1234 5678");
  await pc.getByLabel("Mensaje").fill("Quiero una demostración.");
  await pc.getByLabel("He leído y acepto el Aviso de privacidad.").check();
  await nContacto.check();
  const antesC = estado.prospectos.length;
  const [wa3] = await Promise.all([ctxC.waitForEvent("page", { timeout: 3000 }), pc.getByRole("button", { name: /Enviar por WhatsApp/ }).click()]).catch((e) => { throw new Error(`/contacto no abrió WhatsApp (alertas: ${alertas.join(" | ") || "ninguna"}): ${e.message}`); });
  await wa3.close();
  for (let i = 0; estado.prospectos.length === antesC && i < 30; i++) await dormir(100);
  assert.deepEqual(estado.prospectos.at(-1).cuerpo, {
    nombre: "Carmen Díaz", celular: "+523312345678", correo: "carmen@contacto.mx", origen: { tipo: "contacto" }, aviso_version: "2026-11-25", acepta_noticias: true, noticias_version: "2026-11-27",
  });
  await capturar(pc, "contacto-1440");
  await ctxC.close();

  // ── 3) /baja ─────────────────────────────────────────────────────────────────────────────────────────────────
  for (const [ancho, alto, nombre] of [[1440, 900, "1440"], [390, 844, "390"]]) {
    const ctxB = await contexto(browser, { viewport: { width: ancho, height: alto }, ...(ancho < 500 ? { isMobile: true, hasTouch: true } : {}) });
    const pb = await ctxB.newPage();
    vigilar(pb);
    estado.modoBaja = "ok";
    const previas = estado.bajas.length;
    await pb.goto(`${base}/baja?token=${TOKEN}`, { waitUntil: "domcontentloaded" });
    await pb.getByRole("heading", { name: "¿Ya no quieres recibir noticias de ADAMIA?" }).waitFor({ timeout: 8000 });
    await dormir(500);
    assert.equal(estado.bajas.length, previas, "abrir la página no da de baja (los revisores de enlaces la abren solos)");
    assert.equal(await pb.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
    await pb.evaluate(() => document.fonts.ready);
    await legible(pb, "main section", { ancho, minLetra: ancho < 500 ? 17 : 16, nombre: `/baja ${nombre}` });
    await capturar(pb, `baja-${nombre}-pregunta`);
    await pb.getByRole("button", { name: "Sí, darme de baja" }).click();
    await pb.getByRole("heading", { name: "Listo, ya no te enviaremos noticias" }).waitFor({ timeout: 3000 });
    assert.deepEqual(estado.bajas.at(-1), { token: TOKEN });
    await legible(pb, "main section", { ancho, minLetra: ancho < 500 ? 17 : 16, nombre: `/baja ${nombre} listo` });
    await capturar(pb, `baja-${nombre}-listo`);
    // Otra vez (idempotente): mensaje amable.
    estado.modoBaja = "ya";
    await pb.reload({ waitUntil: "domcontentloaded" });
    await pb.getByRole("button", { name: "Sí, darme de baja" }).click();
    await pb.getByRole("heading", { name: "Ya estabas dado de baja" }).waitFor({ timeout: 3000 });
    // Error del servidor: «Intentar de nuevo» vuelve a mandar.
    estado.modoBaja = "error";
    await pb.reload({ waitUntil: "domcontentloaded" });
    await pb.getByRole("button", { name: "Sí, darme de baja" }).click();
    await pb.getByRole("heading", { name: "No pudimos darte de baja en este momento" }).waitFor({ timeout: 3000 });
    estado.modoBaja = "ok";
    await pb.getByRole("button", { name: "Intentar de nuevo" }).click();
    await pb.getByRole("heading", { name: "Listo, ya no te enviaremos noticias" }).waitFor({ timeout: 3000 });
    // Sin token: no llama al servidor y explica qué hacer.
    const n = estado.bajas.length;
    await pb.goto(`${base}/baja`, { waitUntil: "domcontentloaded" });
    await pb.getByRole("heading", { name: "No encontramos este enlace" }).waitFor({ timeout: 8000 });
    assert.ok(await pb.getByRole("link", { name: "sistema@adamia.mx" }).isVisible());
    assert.equal(estado.bajas.length, n);
    await legible(pb, "main section", { ancho, minLetra: ancho < 500 ? 17 : 16, nombre: `/baja ${nombre} sin token` });
    await capturar(pb, `baja-${nombre}-sin-token`);
    await ctxB.close();
  }

  // ── 4) /dashboard/prospectos ─────────────────────────────────────────────────────────────────────────────────
  // Un usuario de una empresa (Recruiter) no entra al panel de ADAMIA.
  const ctxR = await contexto(browser);
  await ctxR.addCookies([{ name: "token", value: jwt("Recruiter"), url: base }]);
  const pr = await ctxR.newPage();
  await pr.goto(base + "/dashboard/prospectos", { waitUntil: "domcontentloaded" });
  assert.doesNotMatch(new URL(pr.url()).pathname, /^\/dashboard/, "un Recruiter no entra a /dashboard/prospectos");
  await ctxR.close();

  for (const [ancho, alto, nombre] of [[1440, 900, "1440"], [390, 844, "390"]]) {
    const ctxP = await contexto(browser, { viewport: { width: ancho, height: alto }, ...(ancho < 500 ? { isMobile: true, hasTouch: true } : {}) });
    await ctxP.addCookies([{ name: "token", value: jwt("Admin"), url: base }]);
    const pp = await ctxP.newPage();
    vigilar(pp);
    estado.listados.length = 0;
    estado.csv.length = 0;
    await pp.goto(base + "/dashboard/prospectos", { waitUntil: "domcontentloaded" });
    await pp.getByRole("heading", { name: "Prospectos", exact: true }).waitFor({ timeout: 15000 });
    await pp.getByText("Ana María López Hernández").filter({ visible: true }).first().waitFor({ timeout: 8000 });
    await pp.evaluate(() => document.fonts.ready);
    if (ancho > 1000) {
      // En el menú del dashboard, junto a «Pop-ups de la página» (los elementos del menú son botones).
      const menuPopups = pp.getByRole("button", { name: "Pop-ups de la página" }).first();
      await menuPopups.waitFor({ timeout: 8000 });
      const menuProspectos = pp.getByRole("button", { name: "Prospectos", exact: true }).first();
      assert.ok(await menuProspectos.isVisible(), "en el menú del dashboard");
      assert.ok((await menuProspectos.boundingBox()).y > (await menuPopups.boundingBox()).y, "debajo de los pop-ups");
      const encabezados = await pp.locator("table th").allTextContents();
      assert.deepEqual(encabezados, ["Nombre", "Celular", "Correo", "Origen", "Fecha", "Noticias"]);
      assert.ok(await pp.getByRole("cell", { name: "+52 55 1234 5678" }).isVisible());
      assert.ok(await pp.getByRole("cell", { name: "Pop-up: Buen Fin: 30 % de descuento" }).isVisible());
      assert.ok(await pp.getByRole("cell", { name: "27 nov 2026, 10:15" }).isVisible());
    } else {
      assert.equal(await pp.locator("table").isVisible(), false, "en celular, tarjetas en lugar de tabla");
      assert.equal(await pp.getByRole("list", { name: "Prospectos" }).getByRole("listitem").count(), 2);
    }
    await legible(pp, "[data-pagina=prospectos]", { ancho, nombre: `/dashboard/prospectos ${nombre}` });
    await capturar(pp, `panel-${nombre}`);
    // Buscador (espera a que dejes de escribir) y filtros.
    await pp.getByRole("searchbox", { name: "Buscar" }).fill("carmen");
    // Carmen ya estaba en la lista: se espera a que la respuesta filtrada quite a Ana (tabla y tarjetas).
    for (let i = 0; !estado.listados.includes("?buscar=carmen") && i < 30; i++) await dormir(100);
    await pp.getByText("Ana María López Hernández").first().waitFor({ state: "detached", timeout: 3000 });
    assert.ok(await pp.getByText("Carmen Díaz").filter({ visible: true }).first().isVisible());
    assert.ok(estado.listados.includes("?buscar=carmen"), `buscar llega al API (${estado.listados})`);
    await pp.getByRole("searchbox", { name: "Buscar" }).fill("");
    await pp.getByLabel("Aceptó noticias").selectOption("1");
    await pp.getByLabel("Origen").selectOption("popup:7");
    for (let i = 0; !estado.listados.includes("?noticias=1&origen=popup%3A7") && i < 30; i++) await dormir(100);
    assert.ok(estado.listados.includes("?noticias=1&origen=popup%3A7"), `filtros llegan al API (${estado.listados})`);
    // CSV: por omisión solo quienes aceptan noticias (el servidor filtra); con la casilla, todos.
    const [descarga] = await Promise.all([pp.waitForEvent("download"), pp.getByRole("button", { name: "Descargar CSV (aceptan noticias)" }).click()]);
    assert.equal(descarga.suggestedFilename(), "prospectos-2026-11-27.csv");
    assert.equal(estado.csv.at(-1), "?noticias=1&origen=popup%3A7");
    assert.ok(readFileSync(await descarga.path(), "utf8").includes("Ana"));
    await pp.getByLabel("Aceptó noticias").selectOption("");
    await pp.getByLabel("Origen").selectOption("");
    await pp.getByLabel("Incluir en el archivo a quienes no aceptaron noticias").check();
    await Promise.all([pp.waitForEvent("download"), pp.getByRole("button", { name: "Descargar CSV (todos)" }).click()]);
    assert.equal(estado.csv.at(-1), "?todos=1");
    // Paginación.
    await pp.getByRole("searchbox", { name: "Buscar" }).fill("muchos");
    await pp.getByText("120 en total · página 1 de 3").waitFor({ timeout: 3000 });
    assert.ok(await pp.getByRole("button", { name: "Anterior" }).isDisabled());
    await pp.getByRole("button", { name: "Siguiente" }).click();
    await pp.getByText("página 2 de 3").waitFor({ timeout: 3000 });
    // La página puede pintarse antes de que la petición quede anotada (con la máquina cargada falló 1 de 3 veces).
    for (let i = 0; i < 30 && !estado.listados.includes("?buscar=muchos&pagina=2"); i++) await pp.waitForTimeout(100);
    assert.ok(estado.listados.includes("?buscar=muchos&pagina=2"), `listados: ${estado.listados.join(" | ")}`);
    await legible(pp, "[data-pagina=prospectos]", { ancho, nombre: `/dashboard/prospectos ${nombre} (paginado)` });
    await ctxP.close();
  }

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK prospectos: pop-up con correo opcional y casilla de noticias aparte (pide el correo al marcarla, valida formato), WhatsApp se abre aunque el guardado tarde 6 s o falle, cuerpo con origen/aviso/noticias, ya no promete timbrado; /contacto guarda con origen contacto; /baja con botón (abrir no da de baja), ya estabas, error y reintento, sin token; panel solo Admin con menú, tabla/tarjetas, buscador, filtros, CSV (aceptan noticias / todos) y páginas; 1440 y 390 legibles, sin degradados ni desborde");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
