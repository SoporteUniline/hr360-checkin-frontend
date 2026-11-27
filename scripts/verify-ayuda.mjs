// Verificación en navegador del Centro de ayuda (27/11/2026), con el backend simulado y datos de demostración.
// 1440 y 390: portada pública (buscador, rutas, temas), una guía con capturas, tabla de contenido y JSON-LD, ruta de
// capacitación con avance local, PDF (hoja de impresión), /ayuda/indice.json, sitemap y /capacitacion → /ayuda.
// Dentro del sistema: botón «?» desde pantallas del panel y de Mi espacio (abre la guía de esa pantalla), «Ayuda» en el
// menú, filtro por rol (RH vs. empleado, «Todas») y por módulos encendidos, y Adamia AI respondiendo «cómo uso…» con
// la guía citada. Sin scroll horizontal en el teléfono.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      CAPTURAS=/ruta/capturas PLAYWRIGHT_MODULE_PATH=… node scripts/verify-ayuda.mjs
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { chromium, contexto, dormir, levantarNext } from "./capturas-ayuda/comun.mjs";

const OUT = process.env.CAPTURAS || null;
const captura = async (page, nombre, completa = false) => { if (OUT) await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: completa }); };
const EMPRESA = [{ id_empresa: 7, nombre: "Uniline", zona_horaria: "America/Mexico_City" }];
const LAURA = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Laura Ríos", correo: "laura@uniline.mx", id_empresa: 7, empresas: [7], empresas_detalle: EMPRESA, zona_horaria: "America/Mexico_City" };
const ANA = { tipo_usuario: "Empleado", id_empleado: 44, id_usuario: 44, nombre: "Ana Torres", id_empresa: 7, empresas: [7], empresas_detalle: EMPRESA, zona_horaria: "America/Mexico_City" };
const TODOS = ["asistencias", "empleados", "nomina", "vacaciones", "permisos", "evaluaciones", "reclutamiento", "tareas", "activos", "documentos", "turnos_extra", "induccion", "comunicados"];
let activos = TODOS;
const pedidosIA = [];

function manejar({ ruta, metodo, cuerpo, json }) {
  if (ruta.startsWith("/checador/comunicados/muro") || ruta === "/checador/comunicados/mi/muro") return json({ ok: true, portada: null, pendientes_confirmar: 0, puede_participar: true, siguiente: null, items: [] });
  if (ruta.endsWith("/popup")) return json({ ok: true, popup: null });
  if (ruta === "/checador/comunicados/1") return json({ ok: true, comunicado: { id: 1, titulo: "Auditoría de Protección Civil", tipo: "auditoria", nivel: "confirmacion", estado: "publicado", cuerpo: "Texto", audiencia_texto: "Sucursal Centro" } });
  if (ruta === "/checador/ia/estado") return json({ ok: true, activo: true, puede_activar: true, tope_mensual_usd: 5, gasto_mes_usd: 0, lft: { reforma: "2026-05-14" }, creditos: { disponible: false } });
  if (ruta === "/checador/ia/ayuda/preguntar" && metodo === "POST") {
    pedidosIA.push(cuerpo);
    return json({ ok: true, id_conversacion: 5, respuesta: "1. Entra a **Muro** y haz clic en «¿Qué quieres comunicar?».\n2. Elige para quién es y haz clic en **Publicar**.\n\nGuía: [Cómo publicar un comunicado](https://adamia.com.mx/ayuda/comunicados/publicar-comunicado)", guias: [{ slug: "comunicados/publicar-comunicado", titulo: "Cómo publicar un comunicado", url: "https://adamia.com.mx/ayuda/comunicados/publicar-comunicado" }] });
  }
  return undefined;
}

async function sinDesborde(page) {
  const r = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, ventana: window.innerWidth }));
  assert.ok(r.doc <= r.ventana + 1, `scroll horizontal (${r.doc} > ${r.ventana}) en ${page.url()}`);
}
async function alto(locator) { return (await locator.boundingBox()).height; }

const { base, firmar, cerrar } = await levantarNext();
const browser = await chromium.launch({ args: ["--lang=es-MX"] });
let ok = false;
try {
  // ——— Archivos estáticos: índice, sitemap y redirección ———
  const indice = await (await fetch(`${base}/ayuda/indice.json`)).json();
  assert.ok(indice.guias.length >= 10 && indice.rutas.length >= 3, "índice con guías y rutas");
  const publicar = indice.guias.find((g) => g.slug === "comunicados/publicar-comunicado");
  assert.ok(publicar && publicar.texto.length > 500 && publicar.secciones.length > 4 && publicar.pantallas.includes("/panel/muro"));
  assert.ok(!JSON.stringify(indice).includes("src/components"), "el índice no lleva las fuentes internas");
  const contenido = await (await fetch(`${base}/ayuda/comunicados/publicar-comunicado/contenido.json`)).json();
  assert.ok(contenido.bloques.some((b) => b.t === "imagen" && b.ancho > 0 && b.alto > 0), "las capturas llevan su ancho y alto");
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  assert.match(sitemap, /\/ayuda\/comunicados\/publicar-comunicado<\/loc>/);
  assert.match(sitemap, /\/ayuda\/rutas\/primer-dia-rh<\/loc>/);
  const vieja = await fetch(`${base}/capacitacion`, { redirect: "manual" });
  assert.ok([301, 307, 308].includes(vieja.status) && new URL(vieja.headers.get("location"), base).pathname === "/ayuda", `/capacitacion → /ayuda (${vieja.status})`);
  console.log("✔ índice, contenido.json, sitemap y /capacitacion");

  for (const [ancho, altoV, sufijo] of [[1440, 900, "1440"], [390, 844, "390"]]) {
    const movil = ancho < 1024;
    // ——— Público ———
    const { ctx, page } = await contexto(browser, { base, ancho, alto: altoV, usuario: () => null, manejar });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.goto(base + "/ayuda", { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1, name: "¿En qué te ayudamos?" }).waitFor({ timeout: 60000 });
    assert.ok(await page.locator("[data-ruta='primer-dia-rh']").count(), "rutas de capacitación en la portada");
    assert.ok(await page.locator("[data-modulo-ayuda='comunicados']").count(), "temas en la portada");
    assert.equal(await page.locator("footer.pie").getByRole("link", { name: "Centro de ayuda" }).count(), 1, "«Centro de ayuda» en el pie");
    await sinDesborde(page);
    await captura(page, `ayuda-portada-${sufijo}`);
    // Búsqueda tolerante a acentos y mayúsculas, con ?q= para compartirla.
    const buscador = page.getByLabel("Busca en el Centro de ayuda");
    await buscador.fill("CONFIRMACION de leido");
    await page.locator("[data-resultado='comunicados/confirmacion-y-seguimiento']").waitFor({ timeout: 20000 });
    await page.waitForURL(/\/ayuda\?q=CONFIRMACION/, { timeout: 10000 });
    await sinDesborde(page);
    await captura(page, `ayuda-busqueda-${sufijo}`);
    await page.locator("[data-resultado='comunicados/confirmacion-y-seguimiento']").click();
    await page.waitForURL(/\/ayuda\/comunicados\/confirmacion-y-seguimiento/, { timeout: 30000 });
    // Guía con capturas, tabla de contenido, JSON-LD y «¿Te sirvió?».
    await page.getByRole("heading", { level: 1, name: "Confirmación de lectura y seguimiento" }).waitFor({ timeout: 30000 });
    const imgs = page.locator(".ay-md img");
    assert.ok(await imgs.count() >= 2, "la guía tiene capturas");
    await imgs.first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll(".ay-md img")].slice(0, 1).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 });
    assert.ok(await imgs.first().getAttribute("width"), "con ancho y alto (sin saltos al cargar)");
    if (movil) assert.equal(await page.locator(".ay-toc-movil").isVisible(), true);
    else assert.equal(await page.locator("aside [data-toc]").isVisible(), true);
    const tipos = await page.$$eval("script[type='application/ld+json']", (s) => s.map((x) => JSON.parse(x.textContent)["@type"]));
    for (const t of ["TechArticle", "BreadcrumbList", "HowTo", "FAQPage"]) assert.ok(tipos.includes(t), `JSON-LD ${t}: ${tipos}`);
    assert.equal(await page.locator("link[rel='canonical']").getAttribute("href"), "https://adamia.com.mx/ayuda/comunicados/confirmacion-y-seguimiento");
    assert.equal(await page.locator(".ay-md script, .ay-md iframe, .ay-md [onerror]").count(), 0, "el texto de la guía no lleva HTML");
    await page.locator("[data-util]").getByRole("button", { name: "Sí" }).click();
    await page.locator("[data-util]").getByText("¡Gracias!").waitFor();
    await sinDesborde(page);
    await captura(page, `ayuda-guia-${sufijo}`);
    // PDF: la hoja de impresión oculta el sitio y deja la guía.
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator(".sitio-fijo").evaluate((e) => getComputedStyle(e).display), "none", "sin el encabezado del sitio al imprimir");
    assert.equal(await page.locator(".ay-impresion-cabeza").evaluate((e) => getComputedStyle(e).display), "flex", "con el logo al imprimir");
    if (!movil) {
      const pdf = await page.pdf({ format: "Letter", printBackground: true });
      assert.ok(pdf.length > 20000, `PDF de ${pdf.length} bytes`);
      if (OUT) writeFileSync(`${OUT}/ayuda-guia.pdf`, pdf);
    }
    await page.emulateMedia({ media: "screen" });
    // Tabla de 3 columnas: en el teléfono se desliza dentro de su caja (la página no) y la primera columna no parte
    // palabras letra por letra.
    await page.goto(base + "/ayuda/nomina/como-se-calcula-la-nomina", { waitUntil: "networkidle" });
    const tabla = page.locator(".ay-md .ay-tabla").filter({ has: page.locator("thead th:nth-child(3)") }).first();
    await tabla.scrollIntoViewIfNeeded();
    await sinDesborde(page);
    const partidas = await tabla.evaluate((caja) => {
      const malas = [];
      for (const celda of caja.querySelectorAll("tr > :first-child")) {
        const texto = celda.textContent;
        for (const m of texto.matchAll(/\S+/g)) {
          const nodo = [...celda.querySelectorAll("*"), celda].flatMap((e) => [...e.childNodes]).find((n) => n.nodeType === 3 && n.textContent.includes(m[0]));
          if (!nodo) continue;
          const r = document.createRange();
          const i = nodo.textContent.indexOf(m[0]);
          r.setStart(nodo, i); r.setEnd(nodo, i + m[0].length);
          const lineas = new Set([...r.getClientRects()].map((x) => Math.round(x.top)));
          if (lineas.size > 1) malas.push(m[0]);
        }
      }
      return malas;
    });
    assert.deepEqual(partidas, [], "palabras partidas en la primera columna");
    if (movil) assert.ok(await tabla.evaluate((e) => e.scrollWidth >= e.clientWidth), "la tabla vive en su caja con desplazamiento");
    await captura(page, `ayuda-tabla-${sufijo}`);
    // Ruta de capacitación con avance (localStorage).
    await page.goto(base + "/ayuda/rutas/empleado-nuevo", { waitUntil: "networkidle" });
    await page.locator("[data-avance-ruta='0']").waitFor({ timeout: 30000 });
    await page.locator("[data-paso='primeros-pasos/iniciar-sesion'] input[type=checkbox]").check();
    await page.locator("[data-avance-ruta='1']").waitFor({ timeout: 10000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("[data-avance-ruta='1']").waitFor({ timeout: 30000 });
    if (movil) assert.ok(await alto(page.locator("[data-paso='primeros-pasos/iniciar-sesion'] label")) >= 44, "casilla ≥ 44 px");
    await sinDesborde(page);
    await captura(page, `ayuda-ruta-${sufijo}`);
    await page.goto(base + "/ayuda/manual/rh", { waitUntil: "domcontentloaded" });
    await page.locator("[data-manual='rh'] .ay-manual-guia").first().waitFor({ timeout: 30000 });
    assert.equal(await page.locator("meta[name='robots']").getAttribute("content"), "noindex, follow");
    await sinDesborde(page);
    assert.deepEqual(errores, [], `errores en lo público: ${errores.join(" | ")}`);
    await ctx.close();

    // ——— Panel de RH: «?», menú, filtro por rol y Adamia AI ———
    activos = TODOS;
    const rh = await contexto(browser, { base, ancho, alto: altoV, cookie: firmar("Recruiter"), usuario: () => LAURA, modulos: () => ({ todos: false, modulos: { 7: activos } }), manejar });
    const p = rh.page;
    const erroresRh = [];
    p.on("pageerror", (e) => erroresRh.push(`${p.url()}: ${e.message} ${(e.stack ?? "").split("\n").slice(1, 3).join(" ")}`));
    await p.goto(base + "/panel/muro", { waitUntil: "domcontentloaded" });
    await p.locator("[data-pantalla='muro-panel']").waitFor({ timeout: 60000 });
    if (!movil) assert.equal(await p.locator('[data-sidebar="content"]').getByRole("button", { name: "Centro de ayuda", exact: true }).count(), 1, "«Ayuda › Centro de ayuda» en el menú");
    await p.locator("[data-boton-ayuda]").click();
    await p.locator("[data-panel-ayuda] [data-guia-abierta='comunicados/publicar-comunicado']").waitFor({ timeout: 30000 });
    await p.locator("[data-panel-ayuda] .ay-md img").first().waitFor();
    assert.match(await p.locator("[data-panel-ayuda]").innerText(), /También en esta pantalla:[\s\S]*Portada y publicaciones fijadas/);
    assert.equal(await p.locator("[data-panel-ayuda] [data-abrir-pestana]").getAttribute("href"), "/ayuda/comunicados/publicar-comunicado");
    await captura(p, `ayuda-boton-panel-${sufijo}`);
    // Un enlace a otra guía se abre en el mismo panel; «Volver» regresa.
    await p.locator("[data-panel-ayuda] .ay-md a[href='/ayuda/comunicados/confirmacion-y-seguimiento']").first().click();
    await p.locator("[data-panel-ayuda] [data-guia-abierta='comunicados/confirmacion-y-seguimiento']").waitFor({ timeout: 20000 });
    await p.getByRole("button", { name: "Volver" }).click();
    await p.locator("[data-panel-ayuda] [data-guia-abierta='comunicados/publicar-comunicado']").waitFor();
    await p.keyboard.press("Escape");
    // Otra pantalla, otra guía (ruta con id).
    await p.goto(base + "/panel/comunicados/1", { waitUntil: "domcontentloaded" });
    await p.locator("[data-pantalla='seguimiento']").waitFor({ timeout: 60000 });
    await p.locator("[data-boton-ayuda]").click();
    await p.locator("[data-panel-ayuda]").waitFor({ timeout: 20000 });
    await p.locator("[data-panel-ayuda] [data-guia-abierta='comunicados/confirmacion-y-seguimiento']").waitFor({ timeout: 30000 });
    await p.keyboard.press("Escape");
    // Pantalla sin guía (desde la cobertura estricta todas las de trabajo tienen; esta es una exclusión de test-ayuda):
    // abre el buscador.
    await p.goto(base + "/panel/catalogos/cuentas-bancarias", { waitUntil: "networkidle" });
    await p.locator("[data-boton-ayuda]").click();
    // Se escribe cuando el índice ya cargó (antes, el buscador se vuelve a pintar y se pierde lo escrito).
    await p.locator("[data-panel-ayuda]").getByText("Esta pantalla aún no tiene una guía propia").waitFor({ timeout: 30000 });
    await p.locator("[data-panel-ayuda] [data-buscar-ayuda]").fill("portada");
    await p.locator("[data-panel-ayuda] [data-resultado-ayuda='comunicados/portada-y-fijadas']").click();
    await p.locator("[data-panel-ayuda] [data-guia-abierta='comunicados/portada-y-fijadas']").waitFor({ timeout: 20000 });
    await p.keyboard.press("Escape");
    // «Ayuda» del panel: solo guías de RH/dueño; «Todas» agrega las de empleados.
    await p.goto(base + "/panel/ayuda", { waitUntil: "domcontentloaded" });
    const app = p.locator("[data-pantalla='ayuda-app']");
    await app.locator("[data-guia-app='comunicados/publicar-comunicado']").waitFor({ timeout: 60000 });
    assert.equal(await app.getAttribute("data-audiencias"), "rh,dueno");
    assert.equal(await app.locator("[data-guia-app='comunicados/muro-empleado']").count(), 0, "RH no ve primero las guías de empleado");
    assert.ok(await app.locator("[data-ruta-app='primer-dia-rh']").count(), "ruta de RH");
    assert.equal(await app.locator("[data-ruta-app='empleado-nuevo']").count(), 0);
    await sinDesborde(p);
    await captura(p, `ayuda-app-panel-${sufijo}`, true);
    await app.locator("[data-filtro-ayuda='todas']").click();
    await app.locator("[data-guia-app='comunicados/muro-empleado']").waitFor();
    await app.locator("[data-guia-app='comunicados/automaticos']").click();
    await p.locator("[data-panel-ayuda] [data-guia-abierta='comunicados/automaticos']").waitFor({ timeout: 20000 });
    await p.keyboard.press("Escape");
    // Adamia AI: «¿cómo uso…?» responde con la guía citada.
    await p.getByRole("button", { name: "Adamia AI", exact: true }).click();
    await p.getByRole("tab", { name: "Cómo usar ADAMIA" }).click();
    await p.getByLabel("Tu pregunta").fill("¿Cómo publico un comunicado?");
    await p.getByRole("button", { name: "Enviar pregunta" }).click();
    const cita = p.locator("[data-guia-citada='comunicados/publicar-comunicado']").first();
    await cita.waitFor({ timeout: 20000 });
    assert.equal(await cita.getAttribute("target"), "_blank");
    assert.deepEqual(pedidosIA.at(-1), { empresa: 7, pregunta: "¿Cómo publico un comunicado?", id_conversacion: null });
    await captura(p, `ayuda-adamia-ai-${sufijo}`);
    await p.keyboard.press("Escape");
    // Módulos: sin Comunicados, sus guías no aparecen (ni con «Todas»).
    activos = ["asistencias", "empleados", "nomina"];
    await p.goto(base + "/panel/ayuda", { waitUntil: "domcontentloaded" });
    await app.locator("[data-guia-app='primeros-pasos/conoce-el-panel']").waitFor({ timeout: 60000 });
    await app.locator("[data-filtro-ayuda='todas']").click();
    assert.equal(await app.locator("[data-guia-app^='comunicados/']").count(), 0, "módulo apagado: sin sus guías");
    assert.deepEqual(erroresRh.filter((e) => !/ResizeObserver/.test(e)), [], `errores en el panel: ${erroresRh.join(" | ")}`);
    await rh.ctx.close();

    // ——— Mi espacio: «?» y «Ayuda» del empleado ———
    activos = TODOS;
    const emp = await contexto(browser, { base, ancho, alto: altoV, cookie: firmar("Empleado"), usuario: () => ANA, modulos: () => ({ todos: false, modulos: { 7: activos } }), manejar });
    const e = emp.page;
    const erroresE = [];
    e.on("pageerror", (x) => erroresE.push(x.message));
    await e.goto(base + "/empleado/panel/muro", { waitUntil: "domcontentloaded" });
    await e.locator("[data-pantalla='muro']").waitFor({ timeout: 60000 });
    if (movil) assert.ok(await alto(e.locator("[data-boton-ayuda]")) >= 44, "«?» ≥ 44 px en el teléfono");
    await e.locator("[data-boton-ayuda]").click();
    await e.locator("[data-panel-ayuda] [data-guia-abierta='comunicados/muro-empleado']").waitFor({ timeout: 30000 });
    await sinDesborde(e);
    await captura(e, `ayuda-boton-empleado-${sufijo}`);
    await e.keyboard.press("Escape");
    await e.goto(base + "/empleado/panel/mi-espacio", { waitUntil: "domcontentloaded" });
    await e.getByRole("link", { name: /Ayuda/ }).last().click();
    await e.waitForURL("**/empleado/panel/ayuda", { timeout: 30000 });
    const appE = e.locator("[data-pantalla='ayuda-app']");
    await appE.locator("[data-guia-app='comunicados/muro-empleado']").waitFor({ timeout: 60000 });
    assert.equal(await appE.getAttribute("data-audiencias"), "empleado");
    assert.equal(await appE.locator("[data-guia-app='comunicados/publicar-comunicado']").count(), 0, "el empleado no ve guías de RH");
    assert.ok(await appE.locator("[data-ruta-app='empleado-nuevo']").count());
    if (movil) for (const b of await appE.locator("[data-filtro-ayuda]").all()) assert.ok(await alto(b) >= 44, "filtro ≥ 44 px");
    await sinDesborde(e);
    await captura(e, `ayuda-app-empleado-${sufijo}`, true);
    assert.deepEqual(erroresE.filter((x) => !/ResizeObserver/.test(x)), [], `errores en Mi espacio: ${erroresE.join(" | ")}`);
    await emp.ctx.close();
    console.log(`✔ ${sufijo}: público, panel y Mi espacio`);
  }
  ok = true;
  console.log("verify-ayuda: todo bien");
} finally {
  await browser.close();
  cerrar();
  await dormir(100);
  if (!ok) process.exitCode = 1;
}
