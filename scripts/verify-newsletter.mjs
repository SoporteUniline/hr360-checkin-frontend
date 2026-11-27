// Verificación en navegador del newsletter semanal y del ajuste «Avisar por WhatsApp a» (docs/newsletter.md del backend),
// con el backend simulado, a 1440 y 390:
//  1) /dashboard/newsletter (Admin): «Falta configurar Resend», ajustes («Requerir mi aprobación» y «Avisar por correo a»),
//     boletín programado con sus secciones, fuente oficial/periodística, notas descartadas y vista previa; editar el
//     asunto y quitar una nota (PUT solo con lo que cambió); «Aprobar y enviar ahora» y «Cancelar este envío» con
//     confirmación EN LÍNEA (sin ventanas); historial; Guía 2027 con «por confirmar» y corregir un punto (PUT).
//  2) /dashboard/prospectos: «Avisar por WhatsApp a» (celular inválido avisa; guardar manda +52…) y enlace al newsletter.
//  3) Un usuario de una empresa no entra al panel.
// Letra ≥ 16 px, títulos en 700, botones ≥ 48 px, sin degradados ni desborde horizontal. CAPTURAS=<carpeta> guarda capturas.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-newsletter.mjs
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
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (tipo) => {
  const cuerpo = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ tipo_usuario: tipo, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${cuerpo}.${crypto.createHmac("sha256", secreto).update(cuerpo).digest("base64url")}`;
};
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const CAPTURAS = process.env.CAPTURAS || "";
const capturar = async (pagina, nombre) => { if (CAPTURAS) await pagina.screenshot({ path: `${CAPTURAS}/${nombre}.png`, fullPage: true }); };

const contenido = {
  asunto: "Novedades laborales de la semana", introduccion: "Lo más importante de la semana para Recursos Humanos.", total_notas: 2, sin_novedades: false,
  secciones: {
    vigente: [{ id: "n1", titulo: "La STPS publica los lineamientos del registro de jornada", resumen: "Se publicaron los lineamientos que aterrizan la obligación del registro electrónico.", fuente_url: "https://www.gob.mx/stps/prensa/lineamientos", fuente_nombre: "STPS", tipo_fuente: "oficial", fecha_fuente: "2026-11-28", estado: "vigente" }],
    en_discusion: [{ id: "n2", titulo: "Iniciativa para ampliar las vacaciones a quienes trabajan por turnos rotativos en la industria", resumen: "La propuesta se discute en comisiones de la Cámara de Diputados.", fuente_url: "https://www.eleconomista.com.mx/capital-humano/nota-con-un-enlace-bastante-largo-que-no-debe-desbordar", fuente_nombre: "El Economista", tipo_fuente: "periodistica", fecha_fuente: "2026-11-27", estado: "en_discusion" }],
  },
};
const boletinBase = {
  id: 1, semana: "2026-W49", lunes: "2026-11-30", estado: "programado", asunto: contenido.asunto, error: null, programado_para: "2026-12-01 09:00:00", generado_en: "2026-11-30 08:01:00",
  aprobado_en: null, enviados: 0, fallidos: 0, destinatarios: 0, contenido,
  html: "<!doctype html><html><body style=\"font-family:sans-serif\"><h1>Novedades laborales de la semana</h1><p>Vista previa</p></body></html>",
  descartadas: [{ seccion: "en_discusion", titulo: "Nota sin fuente", motivo: "Sin URL de fuente (https)." }],
  guia_propuesta: [{ accion: "agregar", clave: "lineamientos_registro", titulo: "Lineamientos del registro de jornada", detalle: "La STPS publicó cómo registrar la jornada.", estado: "vigente", fuente: { url: "https://www.gob.mx/stps/prensa/lineamientos", titulo: "STPS" } }],
};
const anterior = { id: 0, semana: "2026-W48", lunes: "2026-11-23", estado: "enviado", asunto: "Boletín de la semana pasada", enviados: 228, destinatarios: 228, fallidos: 0, enviado_en: "2026-11-24 09:02:00", contenido: { secciones: {} } };
const guia = {
  version: 1, revisada_en: "2026-11-27", disponible: true,
  puntos: [
    { clave: "jornada_46_horas", titulo: "Jornada máxima de 46 horas por semana en 2027", estado: "aprobado_con_fecha", fecha_entrada: "2027-01-01", detalle: "La jornada baja de forma gradual hasta 40 horas en 2030.", fuente: { titulo: "Decreto DOF 01/05/2026", url: "https://sidof.segob.gob.mx/notas/docFuente/5786537" }, fecha_fuente: "2026-05-01", revisado_en: "2026-11-27", nota: "", por_confirmar: false },
    { clave: "ley_silla", titulo: "Ley silla: asientos para descansar", estado: "vigente", detalle: "Asientos con respaldo para quienes trabajan de pie.", fuente: { titulo: "", url: "" }, fecha_fuente: null, revisado_en: "2026-11-27", nota: "POR CONFIRMAR: no está en el repositorio.", por_confirmar: true },
  ],
};
const estado = { resend: false, boletin: structuredClone(boletinBase), puts: [], aprobar: 0, cancelar: 0, ajustes: [], puntos: [], avisos: [], whatsapp: [] };
const cors = {
  "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

async function contexto(browser, opciones = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", ...opciones });
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.origin !== BACKEND) return route.abort();
    const responde = (o) => route.fulfill({ ...o, headers: { ...cors, ...(o.headers ?? {}) } });
    if (req.method() === "OPTIONS") return responde({ status: 204 });
    const p = url.pathname;
    const m = req.method();
    if (p.endsWith("/users/verify/token")) return responde({ json: { user: { id_usuario: 1, tipo_usuario: "Admin", nombre: "Equipo ADAMIA", empresas: [], empresas_detalle: [] } } });
    if (p === "/api/checador/newsletter" && m === "GET") {
      return responde({ json: {
        ok: true, configuracion: { resend: estado.resend ? { configurado: true, motivo: null } : { configurado: false, motivo: "Falta configurar Resend (RESEND_API_KEY y NEWSLETTER_REMITENTE)." }, correo_bienvenida: "gmail", ia: true, cron: true },
        ajustes: { disponible: true, requerir_aprobacion: false, correos_aviso: ["dueno@adamia.mx"] }, suscriptores: 230,
        boletines: [{ ...estado.boletin, contenido: undefined, html: undefined }, anterior],
      } });
    }
    if (p === "/api/checador/newsletter/1" && m === "GET") return responde({ json: { ok: true, boletin: estado.boletin } });
    if (p === "/api/checador/newsletter/0" && m === "GET") return responde({ json: { ok: true, boletin: { ...anterior, html: "<p>x</p>", descartadas: [], guia_propuesta: [] } } });
    if (p === "/api/checador/newsletter/1" && m === "PUT") {
      const cuerpo = req.postDataJSON();
      estado.puts.push(cuerpo);
      if (cuerpo.asunto) estado.boletin.asunto = estado.boletin.contenido.asunto = cuerpo.asunto;
      for (const n of cuerpo.notas ?? []) if (n.quitar) for (const k of Object.keys(estado.boletin.contenido.secciones)) estado.boletin.contenido.secciones[k] = estado.boletin.contenido.secciones[k].filter((x) => x.id !== n.id);
      return responde({ json: { ok: true, boletin: estado.boletin } });
    }
    if (p === "/api/checador/newsletter/1/aprobar") {
      estado.aprobar++;
      if (!estado.resend) return responde({ status: 503, json: { ok: false, error: "Falta configurar Resend (RESEND_API_KEY y NEWSLETTER_REMITENTE).", codigo: "NL_SIN_RESEND" } });
      estado.boletin = { ...estado.boletin, estado: "enviado", enviado_en: "2026-11-30 10:00:00", enviados: 230, destinatarios: 230, aprobado_en: "2026-11-30 10:00:00" };
      return responde({ status: 202, json: { ok: true, boletin: estado.boletin } });
    }
    if (p === "/api/checador/newsletter/1/cancelar") {
      estado.cancelar++;
      estado.boletin = { ...estado.boletin, estado: "cancelado", cancelado_en: "2026-11-30 10:05:00", cancelado_por: "equipo@adamia.mx" };
      return responde({ json: { ok: true, boletin: estado.boletin } });
    }
    if (p === "/api/checador/newsletter/ajustes") { estado.ajustes.push(req.postDataJSON()); return responde({ json: { ok: true, ajustes: req.postDataJSON() } }); }
    if (p === "/api/checador/newsletter/guia") return responde({ json: { ok: true, titulo: "Guía 2027: lo que tu empresa necesita para cumplir la ley", guia, historial: [] } });
    if (p.startsWith("/api/checador/newsletter/guia/puntos/")) { estado.puntos.push({ clave: decodeURIComponent(p.split("/").pop()), cuerpo: req.postDataJSON() }); return responde({ json: { ok: true, version: 2, guia } }); }
    if (p === "/api/checador/prospectos/ajustes/avisos" && m === "GET") return responde({ json: { ok: true, disponible: true, whatsapp: estado.whatsapp, maximo: 5 } });
    if (p === "/api/checador/prospectos/ajustes/avisos" && m === "PUT") { const c = req.postDataJSON(); estado.avisos.push(c); estado.whatsapp = c.whatsapp; return responde({ json: { ok: true, whatsapp: c.whatsapp } }); }
    if (p === "/api/checador/prospectos" && m === "GET") return responde({ json: { ok: true, prospectos: [], total: 0, pagina: 1, por_pagina: 50, origenes: [], resumen: { total: 0, con_noticias: 0 } } });
    return responde({ json: [] });
  });
  return ctx;
}

// Letra, títulos, botones, degradados y desborde dentro de `raiz` (igual que verify-prospectos).
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
      dialogos: document.querySelectorAll("[role=dialog],[role=alertdialog]").length,
      // El contenedor del panel recorta lo que se sale (scrollWidth no lo ve): se revisa cada texto y control visible.
      fuera: [...textos, ...visibles.filter((n) => /^(INPUT|TEXTAREA|SELECT|BUTTON|IFRAME)$/.test(n.tagName))]
        .filter((n) => n.getBoundingClientRect().right > window.innerWidth + 1)
        .map((n) => `${n.tagName}:${(n.textContent || n.getAttribute("aria-label") || "").trim().slice(0, 30)}:${Math.round(n.getBoundingClientRect().right)}`),
    };
  }, { raiz, minLetra });
  assert.deepEqual(r.chicos, [], `${nombre}: letra de ${minLetra} px o más`);
  assert.ok(r.titulos.length && r.titulos.every((w) => w === "700"), `${nombre}: títulos en 700 (${r.titulos})`);
  assert.deepEqual(r.botones, [], `${nombre}: botones de 48 px o más`);
  assert.equal(r.degradados, 0, `${nombre}: sin degradados`);
  assert.ok(r.ancho <= ancho, `${nombre}: sin desborde horizontal (${r.ancho} > ${ancho})`);
  assert.equal(r.dialogos, 0, `${nombre}: en página, sin ventanas flotantes`);
  assert.deepEqual(r.fuera, [], `${nombre}: nada se sale de la pantalla`);
}

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];
  const vigilar = (p) => p.on("pageerror", (e) => errores.push(e.message));

  // ── 3) Un usuario de una empresa no entra ─────────────────────────────────────────────────────────────────────
  const ctxR = await contexto(browser);
  await ctxR.addCookies([{ name: "token", value: jwt("Recruiter"), url: base }]);
  const pr = await ctxR.newPage();
  await pr.goto(base + "/dashboard/newsletter", { waitUntil: "domcontentloaded" });
  assert.doesNotMatch(new URL(pr.url()).pathname, /^\/dashboard/, "un Recruiter no entra a /dashboard/newsletter");
  await ctxR.close();

  for (const [ancho, alto, nombre] of [[1440, 900, "1440"], [390, 844, "390"]]) {
    estado.resend = false;
    estado.boletin = structuredClone(boletinBase);
    estado.puts.length = 0;
    estado.ajustes.length = 0;
    estado.puntos.length = 0;
    estado.aprobar = 0;
    estado.cancelar = 0;
    const ctx = await contexto(browser, { viewport: { width: ancho, height: alto }, ...(ancho < 500 ? { isMobile: true, hasTouch: true } : {}) });
    await ctx.addCookies([{ name: "token", value: jwt("Admin"), url: base }]);
    const page = await ctx.newPage();
    vigilar(page);

    // ── 1) Panel del newsletter ──────────────────────────────────────────────────────────────────────────────
    await page.goto(base + "/dashboard/newsletter", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Newsletter semanal", exact: true }).waitFor({ timeout: 15000 });
    await page.getByRole("heading", { name: "Novedades laborales de la semana" }).waitFor({ timeout: 8000 });
    await page.getByText("La STPS publica los lineamientos del registro de jornada").first().waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.getByText("Falta configurar Resend", { exact: true }).isVisible(), "avisa que falta Resend");
    assert.ok(await page.getByText("Se enviará solo el martes 1 de diciembre de 2026, 9:00 si no lo cancelas.").first().isVisible());
    assert.ok(await page.getByText("Programado", { exact: true }).first().isVisible());
    for (const t of ["Aprobado y vigente", "En discusión", "Cambios propuestos a la Guía 2027", "Vista previa del correo", "Historial"]) assert.ok(await page.getByText(t, { exact: true }).first().isVisible(), t);
    assert.ok(await page.getByText(/Fuente periodística/).first().isVisible(), "marca la fuente periodística");
    assert.ok(await page.getByText(/Fuente oficial/).first().isVisible());
    assert.ok(await page.getByText("1 nota descartada (sin fuente o con fuente que no abre)").isVisible());
    assert.equal(await page.locator("iframe[title='Vista previa del boletín']").getAttribute("sandbox"), "", "vista previa sin scripts");
    assert.ok(await page.getByText("Ley silla: asientos para descansar", { exact: true }).isVisible());
    assert.ok(await page.getByText("1 punto por confirmar").isVisible(), "avisa lo que está por confirmar");
    await legible(page, "[data-pagina=newsletter]", { ancho, nombre: `/dashboard/newsletter ${nombre}` });
    await capturar(page, `newsletter-${nombre}`);

    // Editar el asunto y quitar una nota: el PUT lleva solo lo que cambió.
    const guardarCambios = page.getByRole("button", { name: "Guardar cambios" });
    assert.ok(await guardarCambios.isDisabled(), "sin cambios no se guarda");
    await page.getByLabel("Asunto del correo").fill("Lo nuevo de la reforma laboral");
    await page.locator("[data-nota=n2]").getByLabel("Quitar esta nota del boletín").check();
    await guardarCambios.click();
    await page.getByText("Cambios guardados.").waitFor({ timeout: 5000 });
    assert.deepEqual(estado.puts.at(-1), { asunto: "Lo nuevo de la reforma laboral", notas: [{ id: "n2", quitar: true }] });
    await page.getByRole("heading", { name: "Lo nuevo de la reforma laboral" }).waitFor({ timeout: 5000 });

    // «Aprobar y enviar ahora»: pide confirmar en línea; sin Resend el servidor responde 503 y se ve el motivo.
    await page.getByRole("button", { name: "Aprobar y enviar ahora" }).click();
    const confirmar = page.getByRole("group", { name: "Confirmar envío" });
    await confirmar.waitFor({ timeout: 3000 });
    assert.ok(await confirmar.getByText("¿Enviar ahora a 230 personas que aceptaron noticias?").isVisible());
    await legible(page, "[data-pagina=newsletter]", { ancho, nombre: `/dashboard/newsletter ${nombre} (confirmar)` });
    await confirmar.getByRole("button", { name: "No, volver" }).click();
    assert.equal(estado.aprobar, 0, "«No, volver» no manda nada");
    await page.getByRole("button", { name: "Aprobar y enviar ahora" }).click();
    await page.getByRole("button", { name: "Sí, enviar ahora" }).click();
    await page.getByText(/Falta configurar Resend \(RESEND_API_KEY/).last().waitFor({ timeout: 5000 });
    assert.equal(estado.aprobar, 1);
    assert.equal(estado.boletin.estado, "programado", "sin Resend no se envió");

    // «Cancelar este envío» con confirmación.
    await page.getByRole("button", { name: "No, volver" }).click().catch(() => {});
    await page.getByRole("button", { name: "Cancelar este envío" }).click();
    await page.getByRole("button", { name: "Sí, cancelar el envío" }).click();
    await page.getByText("Envío cancelado.").waitFor({ timeout: 5000 });
    assert.equal(estado.cancelar, 1);
    await page.getByText(/Cancelado el lunes 30 de noviembre de 2026, 10:05/).first().waitFor({ timeout: 5000 });
    assert.equal(await page.getByRole("button", { name: "Aprobar y enviar ahora" }).count(), 0, "cancelado: ya no se aprueba");

    // Con Resend configurado, aprobar envía.
    estado.resend = true;
    estado.boletin = structuredClone(boletinBase);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Aprobar y enviar ahora" }).waitFor({ timeout: 10000 });
    assert.equal(await page.getByText("Falta configurar Resend", { exact: true }).count(), 0);
    await page.getByRole("button", { name: "Aprobar y enviar ahora" }).click();
    await page.getByRole("button", { name: "Sí, enviar ahora" }).click();
    await page.getByText("Aprobado. Se está enviando.").waitFor({ timeout: 5000 });
    await page.getByText(/Enviado el lunes 30 de noviembre de 2026, 10:00 a 230 de 230 personas/).first().waitFor({ timeout: 5000 });

    // Ajustes del envío.
    await page.getByLabel("Requerir mi aprobación").check();
    await page.getByLabel("Correo 1").fill("no-es-correo");
    await page.getByRole("button", { name: "Guardar ajustes" }).click();
    await page.getByText("«no-es-correo» no es un correo válido.").waitFor({ timeout: 3000 });
    assert.equal(estado.ajustes.length, 0);
    await page.getByLabel("Correo 1").fill("Dueno@Adamia.mx");
    await page.getByRole("button", { name: "Agregar otro correo" }).click();
    await page.getByLabel("Correo 2").fill("luis@adamia.mx");
    await page.getByRole("button", { name: "Guardar ajustes" }).click();
    await page.getByText("Ajustes guardados.").waitFor({ timeout: 5000 });
    assert.deepEqual(estado.ajustes.at(-1), { requerir_aprobacion: true, correos_aviso: ["dueno@adamia.mx", "luis@adamia.mx"] });

    // Guía 2027: confirmar la ley silla con su fuente.
    const silla = page.locator("[data-punto=ley_silla]");
    await silla.getByRole("button", { name: "Confirmar o corregir" }).click();
    await silla.getByLabel("Todavía por confirmar").uncheck();
    await silla.getByRole("button", { name: "Guardar punto" }).click();
    await silla.getByText("Sin fuente el punto queda «por confirmar» y no sale en los correos.").waitFor({ timeout: 3000 });
    assert.equal(estado.puntos.length, 0);
    await silla.getByLabel("Enlace de la fuente (https://…)").fill("https://www.dof.gob.mx/nota_detalle.php?codigo=1");
    await silla.getByLabel("Nombre de la fuente").fill("DOF");
    await legible(page, "[data-pagina=newsletter]", { ancho, nombre: `/dashboard/newsletter ${nombre} (editar punto)` });
    await silla.getByRole("button", { name: "Guardar punto" }).click();
    await page.getByText("Guía actualizada (versión 2).").waitFor({ timeout: 5000 });
    assert.equal(estado.puntos.at(-1).clave, "ley_silla");
    assert.deepEqual([estado.puntos.at(-1).cuerpo.por_confirmar, estado.puntos.at(-1).cuerpo.fuente], [false, { titulo: "DOF", url: "https://www.dof.gob.mx/nota_detalle.php?codigo=1" }]);
    await capturar(page, `newsletter-${nombre}-final`);

    // ── 2) Prospectos: «Avisar por WhatsApp a» ──────────────────────────────────────────────────────────────
    estado.whatsapp = [];
    await page.goto(base + "/dashboard/prospectos", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Avisar por WhatsApp a" }).waitFor({ timeout: 15000 });
    assert.ok(await page.getByRole("link", { name: "Newsletter semanal y Guía 2027" }).isVisible());
    await page.getByLabel("Celular 1").fill("123");
    await page.getByRole("button", { name: "Guardar celulares" }).click();
    await page.getByText(/«123» no es un celular válido/).waitFor({ timeout: 3000 });
    assert.equal(estado.avisos.length, 0);
    await page.getByLabel("Celular 1").fill("55 1234 5678");
    await page.getByRole("button", { name: "Agregar otro celular" }).click();
    await page.getByLabel("Celular 2").fill("+52 81 2222 3333");
    await page.getByRole("button", { name: "Guardar celulares" }).click();
    await page.getByText("Listo: se avisará a esos celulares.").waitFor({ timeout: 5000 });
    assert.deepEqual(estado.avisos.at(-1), { whatsapp: ["+525512345678", "+528122223333"] });
    await page.getByLabel("Celular 1").and(page.locator("[value='+52 55 1234 5678']")).waitFor({ timeout: 5000 });
    await legible(page, "[data-pagina=prospectos]", { ancho, nombre: `/dashboard/prospectos ${nombre} (avisos)` });
    await capturar(page, `prospectos-avisos-${nombre}`);
    estado.avisos.length = 0;
    await ctx.close();
  }

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK newsletter: panel solo Admin con «Falta configurar Resend», boletín programado con secciones, fuente oficial/periodística, descartadas y vista previa sin scripts; editar asunto y quitar nota (PUT con lo que cambió); aprobar y cancelar con confirmación en línea; ajustes con validación; Guía 2027 por confirmar → confirmada; «Avisar por WhatsApp a» en prospectos con validación y +52; 1440 y 390 legibles, sin degradados, sin desborde ni ventanas");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
