// Verificación en navegador real de «Avisos y felicitaciones» con backend simulado, a 1440 y 390 px:
//   - RH: campana junto a «Reloj checador» con contador y etiqueta accesible; popover (escritorio) u hoja desde abajo
//     (celular) con grupos Hoy / Mañana / Esta semana y filtros; contrato «Ver contrato».
//   - Felicitar: WhatsApp con texto FIJO (sin cuadro de texto, «no se puede cambiar»), la plantilla de Meta; «Enviar por WhatsApp»
//     abre wa.me con el texto exacto (se intercepta, no se abre) y anota la felicitación; correo con vista previa y envío.
//   - Plantillas: se edita y se guarda la de correo (revision, variables), la de WhatsApp es solo vista previa.
//   - Jefe (app del empleado): campana solo con su equipo, sin contratos ni «Plantillas», y sin mandar empresa ni jefe;
//     un empleado sin equipo no ve campana.
//   - WhatsApp automático: apagado por omisión, se enciende sin personalizar el correo; sin número de notificaciones, deshabilitado.
//   - Sin desplazamiento lateral, objetivos táctiles ≥ 44 px en celular y sin errores de JavaScript.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-avisos.mjs
// CAPTURAS=<carpeta> guarda capturas (deviceScaleFactor 2).
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const secreto = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  stdio: "ignore", env: { ...process.env, JWT_SECRET: secreto },
});
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const capturas = process.env.CAPTURAS;
const foto = async (page, nombre) => { if (capturas) { await dormir(450); await page.screenshot({ path: `${capturas}/${nombre}.png` }); } };

function token(tipo) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  // Sin id_empresa: el layout del panel no consulta la base (ver panel/layout.jsx).
  const c = `${b({ alg: "HS256", typ: "JWT" })}.${b({ tipo_usuario: tipo, id_usuario: tipo === "Empleado" ? 10 : -1, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${c}.${createHmac("sha256", secreto).update(c).digest("base64url")}`;
}

const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const dia = (n) => new Date(Date.parse(`${hoy}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const anio = Number(hoy.slice(0, 4));
// Catálogo fijo (las dos plantillas de Meta del dueño), ya llenas como las manda el servidor.
const mensajesCumple = (nombre) => [
  { clave: "cumpleanos", etiqueta: "Cumpleaños", descripcion: "aprobada por WhatsApp", texto: `¡Feliz cumpleaños, ${nombre}! 🎉 Todo el equipo de Uniline te desea un gran día. Gracias por ser parte de nuestro equipo.` },
];
const mensajesAniv = (nombre, anios) => [
  { clave: "aniversario", etiqueta: "Aniversario", descripcion: "aprobada por WhatsApp", texto: `¡Feliz aniversario, ${nombre}! Hoy cumples ${anios} ${anios === 1 ? "año" : "años"} en Uniline. Gracias por tu compromiso y por crecer con nosotros.` },
];
const persona = (o) => ({ correo: { disponible: true, visible: "a•••@x.mx", motivo: null }, felicitado: { whatsapp: false, correo: false, correo_automatico: false }, ...o });
const alondra = persona({ clave: `cumpleanos-11-${anio}`, tipo: "cumpleanos", id_empleado: 11, nombre: "Alondra Munguía", nombre_corto: "Alondra", area: "Ventas", fecha: hoy, dias: 0, grupo: "hoy", anio, edad: 29,
  whatsapp: { telefono: "523312344821", visible: "+52 33 •••• 4821", motivo: null, mensajes: mensajesCumple("Alondra") } });
const carlos = persona({ clave: `aniversario-12-${anio}`, tipo: "aniversario", id_empleado: 12, nombre: "Carlos Terriquez", nombre_corto: "Carlos", area: "Producción", fecha: dia(1), dias: 1, grupo: "manana", anio, anios: 3,
  whatsapp: { telefono: null, visible: null, motivo: "No tiene teléfono registrado en su ficha.", mensajes: mensajesAniv("Carlos", 3) },
  correo: { disponible: false, visible: null, motivo: "No tiene correo de notificaciones en su ficha." } });
const frida = { clave: "contrato-7", tipo: "contrato", id_contrato: 7, id_empleado: 13, nombre: "Frida Serrano", area: "Ventas", fecha: dia(1), dias: 1, grupo: "manana", tipo_contrato: "Determinado" };
const diego = persona({ clave: `cumpleanos-14-${anio}`, tipo: "cumpleanos", id_empleado: 14, nombre: "Diego León", nombre_corto: "Diego", area: "Ventas", fecha: dia(3), dias: 3, grupo: "semana", anio, edad: 34,
  whatsapp: { telefono: "525512345678", visible: "+52 55 •••• 5678", motivo: null, mensajes: mensajesCumple("Diego") } });
const valeria = persona({ clave: `aniversario-15-${anio}`, tipo: "aniversario", id_empleado: 15, nombre: "Valeria Castillo", nombre_corto: "Valeria", area: "Compras", fecha: dia(5), dias: 5, grupo: "semana", anio, anios: 1,
  whatsapp: { telefono: "525512345679", visible: "+52 55 •••• 5679", motivo: null, mensajes: mensajesAniv("Valeria", 1) } });
const auto = { cumpleanos: { correo: true, hora: "9:05" }, aniversario: { correo: false, hora: "9:05" } };
const respuestaRH = { ok: true, visible: true, alcance: "empresa", puede_editar_plantillas: true, empresa: { id: 10, nombre: "Uniline" }, zona_horaria: "America/Mexico_City",
  hoy, migracion: true, auto, total: 5, conteos: { cumpleanos: 2, aniversario: 2, contrato: 1 }, avisos: [alondra, carlos, frida, diego, valeria] };
const respuestaJefe = { ok: true, visible: true, alcance: "equipo", puede_editar_plantillas: false, empresa: { id: 10, nombre: "Uniline" }, zona_horaria: "America/Mexico_City",
  hoy, migracion: true, auto, total: 2, conteos: { cumpleanos: 1, aniversario: 1, contrato: 0 }, avisos: [alondra, carlos] };
const plantillaCumple = { tipo: "cumpleanos", personalizada: false, diseno: "festivo", asunto: "¡Feliz cumpleaños, {nombre}!",
  mensaje: "Todo el equipo de {empresa} te desea un gran día. Gracias por tu entrega en {área}; que este año te traiga mucho de lo que buscas.\n\n¡Disfrútalo!",
  envio_correo_auto: true, aviso_campana: true, envio_whatsapp_auto: false, revision: 0, actualizado_por: null, actualizado_en: null, regla_activa: true };
const plantillaAniv = { ...plantillaCumple, tipo: "aniversario", diseno: "elegante", asunto: "¡Feliz aniversario, {nombre}!", mensaje: "Hoy cumples {años} años con nosotros en {empresa}.", regla_activa: false };
const plantillasCon = (configurado) => ({
  ok: true, migracion: true, empresa: { id: 10, nombre: "Uniline" }, hora_envio: "9:05", variables: ["nombre", "edad", "años", "área", "empresa", "jefe"],
  disenos: ["festivo", "elegante", "sencillo"], limites: { asunto: 150, mensaje: 2000 }, ejemplo: { nombre: "Ana", nombreCompleto: "Ana López", empresa: "Uniline" },
  plantillas: [plantillaCumple, plantillaAniv],
  whatsapp: { version: "2026-11-25.2", nota: "Texto aprobado por WhatsApp; no se puede cambiar.",
    automatico: configurado ? { configurado: true, motivo: null } : { configurado: false, motivo: "Falta configurar el número de notificaciones" },
    plantillas: [...mensajesCumple("Ana").map((m) => ({ ...m, tipo: "cumpleanos" })), ...mensajesAniv("Ana", 3).map((m) => ({ ...m, tipo: "aniversario" }))] },
});
const correoHtml = (asunto) => `<!doctype html><html><body style="margin:0;font-family:sans-serif;background:#f3f4f6"><div style="max-width:600px;margin:24px auto;background:#fff;border-radius:14px;padding:24px"><div style="background:#1D5CF5;color:#fff;border-radius:12px;padding:24px"><p style="margin:0;font-size:12px">UNILINE</p><p style="margin:4px 0 0;font-size:24px;font-weight:800">${asunto}</p><p style="margin:12px 0 0"><span style="background:#3B74F7;border-radius:99px;padding:6px 12px;font-weight:700">29 años</span></p></div><p>Todo el equipo de Uniline te desea un gran día.</p></div></body></html>`;

const usuarios = {
  Recruiter: { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", correo: "rh@x.mx", empresas: [10],
    empresas_detalle: [{ id_empresa: 10, nombre: "Uniline", estado: "Activo", zona_horaria: "America/Mexico_City" }], zona_horaria: "America/Mexico_City" },
  Empleado: { id_usuario: 10, id_empleado: 10, tipo_usuario: "Empleado", nombre: "Jefa Prueba", id_empresa: 10, empresas: [10] },
};

async function contexto(browser, { tipo, ancho, alto, avisos, numeroNotificaciones = true }) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City",
    hasTouch: ancho < 500, isMobile: ancho < 500 });
  await ctx.addCookies([{ name: "token", value: token(tipo), url: base }]);
  const pedidos = [];
  const abiertos = [];
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
  await ctx.route("https://wa.me/**", (route) => { abiertos.push(route.request().url()); return route.fulfill({ status: 200, contentType: "text/html", body: "<p>WhatsApp (simulado)</p>" }); });
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname === "wa.me") return route.fallback();
    if (url.pathname === "/api/empresas/check-status") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ hasActivePlan: true, slug: "uniline" }) });
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const ok = (json, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(json) });
    const p = url.pathname.replace("/api", "");
    let cuerpo = null;
    try { cuerpo = req.postDataJSON(); } catch {}
    pedidos.push({ metodo: req.method(), ruta: p, query: url.search, cuerpo });
    if (p.endsWith("/users/verify/token")) return ok({ user: usuarios[tipo] });
    if (p === "/checador/avisos/proximos") return ok(avisos);
    if (p === "/checador/avisos/felicitaciones") return ok({ ok: true, nuevo: true, felicitado: { whatsapp: true, correo: false, correo_automatico: false } }, 201);
    if (p === "/checador/avisos/felicitaciones/vista-previa") return ok({ ok: true, personalizada: false, subject: "🎂 ¡Feliz cumpleaños, Alondra! - Uniline", html: correoHtml("¡Feliz cumpleaños, Alondra!"), para: "a•••@x.mx", motivo: null });
    if (p === "/checador/avisos/felicitaciones/correo") return ok({ ok: true, para: "a•••@x.mx", felicitado: { whatsapp: true, correo: true, correo_automatico: false } }, 201);
    if (p === "/checador/avisos/plantillas") return ok(plantillasCon(numeroNotificaciones));
    if (p === "/checador/avisos/plantillas/vista-previa") return ok({ ok: true, subject: cuerpo?.sistema ? "🎂 ¡Feliz cumpleaños, Ana! - Uniline" : String(cuerpo?.asunto ?? "").replace("{nombre}", "Ana"), html: correoHtml(cuerpo?.sistema ? "¡Feliz cumpleaños, Ana!" : String(cuerpo?.asunto ?? "").replace("{nombre}", "Ana")) });
    if (/^\/checador\/avisos\/plantillas\/(cumpleanos|aniversario)$/.test(p) && req.method() === "PUT") {
      const base = p.endsWith("aniversario") ? plantillaAniv : plantillaCumple;
      return ok({ ok: true, plantilla: { ...base, ...cuerpo, sistema: undefined, personalizada: !cuerpo?.sistema, revision: 1, actualizado_por: "RH Prueba" } });
    }
    if (p.endsWith("/checador/asistencias")) return ok({ registros: [], total: 0, page: 1, aplicarPaginacion: false });
    if (p.includes("eventos-checada")) return route.abort();
    return ok({});
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  return { ctx, page, pedidos, abiertos, errores };
}

const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
// Botones, enlaces y pestañas visibles dentro de un contenedor con alto menor a 44 px (objetivo táctil).
const pequenos = (loc) => loc.evaluate((raiz) => [...raiz.querySelectorAll("button, a, [role=tab], [role=radio], input[type=checkbox]")]
  .filter((el) => el.offsetParent !== null && !el.disabled)
  .map((el) => { const r = el.getBoundingClientRect(); const objetivo = el.closest("label") ?? el; return { t: (el.innerText || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30), h: Math.round(Math.max(r.height, objetivo.getBoundingClientRect().height)) }; })
  .filter((x) => x.h < 44));

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }

  // ───── 1) RH en escritorio: campana, popover, Felicitar por WhatsApp y por correo ─────
  {
    const { page, pedidos, abiertos, errores } = await contexto(browser, { tipo: "Recruiter", ancho: 1440, alto: 900, avisos: respuestaRH });
    await page.goto(base + "/panel/monitor", { waitUntil: "domcontentloaded" });
    const campana = page.getByRole("button", { name: "Avisos de los próximos 7 días: 5" });
    await campana.waitFor({ timeout: 30000 });
    assert.equal((await campana.locator("[data-contador]").innerText()).trim(), "5");
    // Junto a «Reloj checador», antes que él.
    const orden = await page.evaluate(() => {
      const c = document.querySelector("[data-campana-avisos]");
      const r = [...document.querySelectorAll("header a")].find((a) => /Reloj checador/.test(a.getAttribute("aria-label") || ""));
      return Boolean(c && r && c.parentElement === r.parentElement && c.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    assert.ok(orden, "la campana va junto a «Reloj checador»");
    const caja = await campana.boundingBox();
    assert.ok(caja.width >= 44 && caja.height >= 44, `campana de ${caja.width}×${caja.height}`);
    assert.ok(pedidos.some((x) => x.ruta === "/checador/avisos/proximos" && /empresa=10/.test(x.query)), "RH pide su empresa");

    const antes = pedidos.filter((x) => x.ruta === "/checador/avisos/proximos").length;
    await campana.click();
    const popover = page.getByRole("dialog", { name: "Próximos 7 días" });
    await popover.waitFor();
    await dormir(300);
    assert.ok(pedidos.filter((x) => x.ruta === "/checador/avisos/proximos").length > antes, "al abrir se refresca");
    assert.equal(await campana.getAttribute("aria-expanded"), "true");
    const grupos = await popover.locator("[data-grupo]").evaluateAll((g) => g.map((x) => [x.dataset.grupo, x.querySelector("h3").textContent.trim(), [...x.querySelectorAll("[data-aviso]")].map((li) => li.dataset.aviso)]));
    assert.deepEqual(grupos.map((g) => g[0]), ["hoy", "manana", "semana"]);
    assert.match(grupos[0][1], /^Hoy · \S+ \d+$/);
    assert.match(grupos[1][1], /^Mañana · \S+ \d+$/);
    assert.equal(grupos[2][1], "Esta semana");
    assert.deepEqual(grupos.map((g) => g[2].length), [1, 2, 2]);
    assert.deepEqual(await popover.getByRole("group", { name: "Filtrar avisos" }).getByRole("button").allInnerTexts(), ["Todos · 5", "Cumpleaños · 2", "Aniversarios · 2", "Contratos · 1"]);
    assert.match(await popover.innerText(), /Cumple 29 años · Ventas[\s\S]*3 años en la empresa · Producción[\s\S]*Vence su contrato · decide si renuevas[\s\S]*en 3 días[\s\S]*en 5 días/);
    assert.equal(await popover.getByRole("link", { name: "Ver contrato" }).getAttribute("href"), "/panel/contratos?id=7");
    assert.equal(await popover.getByRole("link", { name: "Plantillas" }).getAttribute("href"), "/panel/plantillas-felicitacion");
    assert.match(await popover.innerText(), /Los cumpleaños se felicitan solos por correo a las 9:05 a\. m\./);
    await foto(page, "1440-campana");
    // Filtro «Contratos».
    await popover.getByRole("button", { name: "Contratos · 1" }).click();
    assert.equal(await popover.locator("[data-aviso]").count(), 1);
    await popover.getByRole("button", { name: "Todos · 5" }).click();

    // Felicitar a Alondra.
    await popover.getByRole("button", { name: "Felicitar a Alondra Munguía" }).click();
    const dialogo = page.getByRole("dialog", { name: "Felicitar a Alondra Munguía" });
    await dialogo.waitFor();
    assert.match(await dialogo.innerText(), /Cumple 29 años hoy · Ventas/);
    assert.equal(await dialogo.locator("textarea, [contenteditable=true], input[type=text]").count(), 0, "WhatsApp no es editable");
    assert.match(await dialogo.innerText(), /Texto aprobado por WhatsApp; no se puede cambiar\./);
    assert.equal(await dialogo.getByRole("radio").count(), 0, "una sola plantilla de Meta por tipo: no hay que elegir");
    assert.equal(await dialogo.locator("[data-mensaje-whatsapp]").innerText(), alondra.whatsapp.mensajes[0].texto);
    assert.match(await dialogo.innerText(), /A: Alondra · \+52 33 •••• 4821/);
    await foto(page, "1440-felicitar");
    // Enviar por WhatsApp: abre wa.me (interceptado) con el texto de la plantilla de Meta y anota la felicitación.
    const [popup] = await Promise.all([page.waitForEvent("popup"), dialogo.getByRole("link", { name: "Enviar por WhatsApp" }).click()]);
    await popup.waitForLoadState("domcontentloaded").catch(() => {});
    await dormir(400);
    assert.equal(abiertos.length, 1, "se abrió wa.me una vez");
    const wa = new URL(abiertos[0]);
    assert.equal(`${wa.origin}${wa.pathname}`, "https://wa.me/523312344821");
    assert.equal(wa.searchParams.get("text"), "¡Feliz cumpleaños, Alondra! 🎉 Todo el equipo de Uniline te desea un gran día. Gracias por ser parte de nuestro equipo.", "el texto fijo exacto de la plantilla de Meta");
    await popup.close();
    const anotado = pedidos.find((x) => x.metodo === "POST" && x.ruta === "/checador/avisos/felicitaciones");
    assert.deepEqual(anotado?.cuerpo, { empresa: 10, id_empleado: 11, tipo: "cumpleanos", anio, canal: "whatsapp", plantilla: "cumpleanos" });
    await dialogo.getByText(/Quedó anotado que ya lo felicitaste/).waitFor();
    // Correo: vista previa y envío.
    await dialogo.getByRole("tab", { name: "Correo" }).click();
    await dialogo.locator("iframe").waitFor();
    assert.match(await dialogo.innerText(), /Asunto: 🎂 ¡Feliz cumpleaños, Alondra! - Uniline/);
    await dialogo.getByRole("button", { name: "Enviar por correo" }).click();
    await dialogo.getByText("Listo: le mandamos la felicitación a a•••@x.mx.").waitFor();
    assert.ok(await dialogo.getByRole("button", { name: "Correo enviado" }).isDisabled(), "no se manda dos veces");
    await foto(page, "1440-felicitar-correo");
    await page.keyboard.press("Escape");

    // Sin teléfono ni correo: botones deshabilitados con su motivo.
    await campana.click();
    await page.getByRole("dialog", { name: "Próximos 7 días" }).getByRole("button", { name: "Felicitar a Carlos Terriquez" }).click();
    const sinDatos = page.getByRole("dialog", { name: "Felicitar a Carlos Terriquez" });
    await sinDatos.waitFor();
    assert.ok(await sinDatos.getByRole("button", { name: "Enviar por WhatsApp" }).isDisabled());
    assert.ok(await sinDatos.getByRole("button", { name: "Enviar por correo" }).isDisabled());
    assert.match(await sinDatos.innerText(), /No tiene teléfono registrado en su ficha\./);
    assert.match(await sinDatos.innerText(), /No tiene correo de notificaciones en su ficha\./);
    await page.keyboard.press("Escape");
    assert.ok(await sinDesborde(page), "sin desborde a 1440");

    // ───── Plantillas de felicitación (escritorio) ─────
    await page.goto(base + "/panel/plantillas-felicitacion", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Plantillas de felicitación" }).waitFor({ timeout: 30000 });
    await page.locator("iframe[data-vista-correo]").waitFor({ timeout: 15000 });
    assert.match(await page.locator("body").innerText(), /Hoy se usa el correo de ADAMIA/);
    const guardar = page.getByRole("button", { name: "Guardar", exact: true });
    assert.ok(await guardar.isDisabled(), "sin cambios no se guarda");
    await foto(page, "1440-plantillas");
    await page.getByRole("radio", { name: /Elegante/ }).click();
    const asunto = page.getByLabel("Asunto del correo");
    await asunto.fill("¡Muchas felicidades, ");
    await page.getByRole("button", { name: "{nombre}" }).click();
    assert.equal(await asunto.inputValue(), "¡Muchas felicidades, {nombre}", "la variable se inserta donde estaba el cursor");
    await asunto.press("End");
    await asunto.type("!");
    await page.getByLabel(/Avisarme en la campana/).uncheck();
    await dormir(600);
    assert.match(await page.locator("body").innerText(), /Asunto: ¡Muchas felicidades, Ana!/, "la vista previa sigue al borrador");
    await guardar.click();
    await page.getByText(/Cambios guardados/).waitFor();
    const put = pedidos.find((x) => x.metodo === "PUT" && x.ruta === "/checador/avisos/plantillas/cumpleanos");
    assert.deepEqual(put?.cuerpo, { empresa: 10, diseno: "elegante", asunto: "¡Muchas felicidades, {nombre}!", mensaje: plantillaCumple.mensaje, envio_correo_auto: true, aviso_campana: false, envio_whatsapp_auto: false, revision: 0 });
    // WhatsApp: solo vista previa, sin cuadro de texto.
    await page.getByRole("tab", { name: "WhatsApp" }).click();
    const panelWa = page.getByRole("tabpanel", { name: "WhatsApp" });
    await panelWa.waitFor();
    assert.equal(await panelWa.locator("textarea, input, [contenteditable=true]").count(), 0, "WhatsApp no editable");
    assert.match(await panelWa.innerText(), /Texto aprobado por WhatsApp; no se puede cambiar\./);
    assert.equal(await panelWa.locator("[data-mensaje-whatsapp]").count(), 1, "la plantilla de Meta del tipo");
    assert.equal(await panelWa.locator("[data-mensaje-whatsapp]").innerText(), mensajesCumple("Ana")[0].texto);
    assert.equal(await page.locator("textarea").count(), 1, "el único cuadro de texto es el mensaje del correo");
    await foto(page, "1440-plantillas-whatsapp");
    // Aniversario: la regla está apagada → se avisa con enlace a Reglas de aviso.
    await page.getByRole("button", { name: "Aniversario laboral" }).click();
    await page.getByText(/la regla «Felicitar aniversario» está apagada/).waitFor();
    assert.equal(await page.getByRole("link", { name: "Ir a Reglas de aviso" }).getAttribute("href"), "/panel/reglas-aviso");
    // Envío automático por WhatsApp (número configurado): apagado por omisión; encenderlo solo guarda el interruptor y
    // el correo sigue siendo el de ADAMIA ({ sistema: true }).
    const waAuto = page.getByLabel(/Enviar automático por WhatsApp/);
    assert.equal(await waAuto.isChecked(), false, "apagado por omisión");
    assert.equal(await waAuto.isDisabled(), false);
    await waAuto.check();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.getByText(/Cambios guardados/).waitFor();
    const putAniv = pedidos.find((x) => x.metodo === "PUT" && x.ruta === "/checador/avisos/plantillas/aniversario");
    assert.deepEqual(putAniv?.cuerpo, { empresa: 10, sistema: true, envio_correo_auto: true, aviso_campana: true, envio_whatsapp_auto: true, revision: 0 });
    assert.ok(await sinDesborde(page));
    // Menú: «Plantillas de felicitación» junto a «Reglas de aviso».
    const menu = await page.evaluate(() => [...document.querySelectorAll("[data-sidebar=menu-button]")].map((b) => b.innerText.trim()));
    const iReglas = menu.indexOf("Reglas de aviso");
    assert.ok(iReglas >= 0 && menu[iReglas + 1] === "Plantillas de felicitación", `en el menú, después de Reglas de aviso (${menu.slice(iReglas, iReglas + 2)})`);
    assert.deepEqual(errores, [], "sin errores de JS (RH escritorio)");
  }

  // ───── 2) RH en celular: hoja desde abajo, Felicitar, Plantillas ─────
  {
    const { page, errores } = await contexto(browser, { tipo: "Recruiter", ancho: 390, alto: 844, avisos: respuestaRH, numeroNotificaciones: false });
    await page.goto(base + "/panel/monitor", { waitUntil: "domcontentloaded" });
    const campana = page.getByRole("button", { name: "Avisos de los próximos 7 días: 5" });
    await campana.waitFor({ timeout: 30000 });
    const caja = await campana.boundingBox();
    assert.ok(caja.width >= 44 && caja.height >= 44);
    assert.ok(await sinDesborde(page), "el encabezado no desborda a 390 con la campana");
    await campana.click();
    const hoja = page.getByRole("dialog", { name: "Próximos 7 días" });
    await hoja.waitFor();
    await dormir(600);
    const h = await hoja.boundingBox();
    assert.ok(Math.abs(h.y + h.height - 844) <= 2 && h.width >= 388, `hoja pegada abajo y a lo ancho (${JSON.stringify(h)})`);
    assert.deepEqual(await hoja.locator("[data-grupo]").evaluateAll((g) => g.map((x) => x.dataset.grupo)), ["hoy", "manana", "semana"]);
    assert.deepEqual(await pequenos(hoja), [], "objetivos táctiles ≥ 44 px en la hoja");
    assert.ok(await sinDesborde(page));
    await foto(page, "390-campana");
    await hoja.getByRole("button", { name: "Felicitar a Alondra Munguía" }).click();
    const dialogo = page.getByRole("dialog", { name: "Felicitar a Alondra Munguía" });
    await dialogo.waitFor();
    await dormir(500);
    assert.equal(await dialogo.locator("textarea").count(), 0);
    assert.deepEqual(await pequenos(dialogo), [], "objetivos táctiles ≥ 44 px en Felicitar");
    assert.ok(await sinDesborde(page));
    await foto(page, "390-felicitar");
    await page.keyboard.press("Escape");
    await page.goto(base + "/panel/plantillas-felicitacion", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Plantillas de felicitación" }).waitFor({ timeout: 30000 });
    await page.locator("iframe[data-vista-correo]").waitFor({ timeout: 15000 });
    assert.ok(await sinDesborde(page), "Plantillas sin desborde a 390");
    // Sin el número de notificaciones: el interruptor de WhatsApp automático está deshabilitado con su motivo.
    assert.ok(await page.getByLabel(/Enviar automático por WhatsApp/).isDisabled());
    await page.getByText("Falta configurar el número de notificaciones: por ahora no se puede encender.").waitFor();
    assert.deepEqual(await pequenos(page.locator("[data-plantillas-felicitacion]")), [], "objetivos ≥ 44 px en Plantillas");
    await foto(page, "390-plantillas");
    assert.deepEqual(errores, [], "sin errores de JS (RH celular)");
  }

  // ───── 3) Jefe en la app del empleado: solo su equipo ─────
  for (const [ancho, alto] of [[390, 844], [1440, 900]]) {
    const { page, pedidos, errores } = await contexto(browser, { tipo: "Empleado", ancho, alto, avisos: respuestaJefe });
    await page.goto(base + "/empleado/panel/mi-espacio", { waitUntil: "domcontentloaded" });
    const campana = page.getByRole("button", { name: "Avisos de los próximos 7 días: 2" });
    await campana.waitFor({ timeout: 30000 });
    await campana.click();
    const panel = page.getByRole("dialog", { name: "Próximos 7 días" });
    await panel.waitFor();
    await dormir(500);
    assert.match(await panel.innerText(), /tu equipo|Tu equipo/);
    assert.deepEqual(await panel.locator("[data-aviso]").evaluateAll((l) => l.map((x) => x.dataset.aviso)), [alondra.clave, carlos.clave]);
    assert.equal(await panel.getByRole("link", { name: "Plantillas" }).count(), 0, "el jefe no edita plantillas");
    assert.equal(await panel.getByRole("link", { name: "Ver contrato" }).count(), 0);
    assert.ok(pedidos.filter((x) => x.ruta.startsWith("/checador/avisos")).every((x) => !/empresa|jefe|empleado/.test(x.query)), "el cliente no manda empresa ni jefe");
    assert.ok(await sinDesborde(page));
    await foto(page, `${ancho}-campana-jefe`);
    await panel.getByRole("button", { name: "Felicitar a Alondra Munguía" }).click();
    const dialogo = page.getByRole("dialog", { name: "Felicitar a Alondra Munguía" });
    await dialogo.waitFor();
    assert.equal(await dialogo.getByRole("link", { name: "Ver plantillas" }).count(), 0);
    await page.keyboard.press("Escape");
    assert.deepEqual(errores, [], `sin errores de JS (jefe ${ancho})`);
  }

  // ───── 4) Empleado sin equipo: no hay campana ─────
  {
    const { page, errores } = await contexto(browser, { tipo: "Empleado", ancho: 390, alto: 844, avisos: { ok: true, visible: false, alcance: "equipo", avisos: [], total: 0 } });
    await page.goto(base + "/empleado/panel/mi-espacio", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Mi espacio" }).waitFor({ timeout: 30000 });
    await dormir(1000);
    assert.equal(await page.locator("[data-campana-avisos]").count(), 0, "sin equipo no hay campana");
    assert.deepEqual(errores, []);
  }

  exito = true;
  console.log("OK · campana con contador junto al reloj · grupos Hoy/Mañana/Esta semana · filtros · wa.me con el texto exacto de la plantilla de Meta (interceptado) y anotado · WhatsApp automático (encender sin personalizar el correo; deshabilitado sin número) · correo con vista previa · WhatsApp no editable · plantilla de correo guardada · jefe solo su equipo · sin equipo sin campana · 1440 y 390 sin desborde · táctiles ≥ 44 px");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
