// Verificación en navegador del panel «Plantillas de WhatsApp» (administrador de ADAMIA, 26/11/2026) con el backend
// simulado (nada sale a internet ni a Zernio): lista con chips de estado y filtros, detalle con motivo de rechazo y vista
// previa tipo burbuja, editar (vuelve a revisión), crear con validación local (no manda lo que Meta rechazaría), error de
// Zernio mostrado tal cual, catálogo del sistema con «Enviar a aprobación las que faltan» (una sola vez), bitácora y borrar
// con confirmación. Escritorio (1440) y teléfono (390): sin scroll horizontal, objetivos táctiles ≥ 44 px y texto ≥ 13 px.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      CAPTURAS=/ruta/capturas PLAYWRIGHT_MODULE_PATH=… node scripts/verify-plantillas-whatsapp.mjs
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
const firmar = () => {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Admin", id_usuario: 1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
};
const admin = { id_usuario: 1, tipo_usuario: "Admin", nombre: "Equipo ADAMIA", correo: "admin@adamia.mx" };

const plantilla = (o) => ({ id: "1", idioma: "es_MX", categoria: "UTILITY", estado: "aprobada", estado_meta: "APPROVED", motivo_rechazo: null, calidad: null, encabezado: null,
  cuerpo: "", ejemplos: [], pie: "", botones: [], variables: 0, soportada: true, editable: true, ...o });
const RESULTADO = "Hola {{1}}, ya está disponible el resultado de tu evaluación «{{2}}» de {{3}}. Entra a ADAMIA para revisarlo junto con tu plan de desarrollo.";
const CUMPLE = "¡Feliz cumpleaños, {{1}}! 🎉 Todo el equipo de {{2}} te desea un gran día. Gracias por ser parte de nuestro equipo.";
const RECORDATORIO = "Hola {{1}}, te recordamos tu entrevista para la vacante {{2}} el {{3}} a las {{4}}. Lugar: {{5}}. ¿Nos confirmas tu asistencia? Responde «Confirmo» o «Necesito cambiar».";
const cat = (o) => ({ encabezado: null, pie: "", botones: [], sugerida: false, version: "2026-11-26.1", doc: "docs/x.md", ...o });
const CATALOGO = [
  cat({ nombre: "adamia_felicitacion_cumpleanos", categoria: "MARKETING", idioma: "es_MX", cuenta: "notificaciones", modulo: "Avisos y felicitaciones", descripcion: "Felicitación automática de cumpleaños", cuerpo: CUMPLE, variables: ["nombre", "empresa"], ejemplos: ["Ana", "Uniline"] }),
  cat({ nombre: "adamia_clima_recordatorio", categoria: "UTILITY", idioma: "es_MX", cuenta: "notificaciones", modulo: "Clima y NOM-035", descripcion: "Recordatorio de la encuesta", cuerpo: "Hola {{1}}, todavía puedes contestar la encuesta «{{2}}» de {{3}}. Cierra el {{4}}. Tu liga personal: {{5}} Es anónima. No respondas en este chat; aquí no se guardan respuestas.", variables: ["nombre", "encuesta", "empresa", "fecha de cierre", "liga personal"], ejemplos: ["Ana", "Pulso de noviembre", "Uniline", "5 de diciembre", "https://adamia.mx/encuesta/AbCd"] }),
  cat({ nombre: "adamia_evaluacion_resultado", categoria: "UTILITY", idioma: "es_MX", cuenta: "notificaciones", modulo: "Evaluación del desempeño", descripcion: "Resultado de la evaluación publicado", cuerpo: RESULTADO, variables: ["nombre", "campaña", "empresa"], ejemplos: ["Ana", "Evaluación anual 2026", "Uniline"] }),
  cat({ nombre: "recordatorio_entrevista", categoria: "UTILITY", idioma: "es_MX", cuenta: "reclutamiento", modulo: "Reclutamiento por WhatsApp", descripcion: "Recordatorio de entrevista (ajuste «plantilla_recordatorio»)", sugerida: true, version: null, cuerpo: RECORDATORIO,
    variables: ["nombre", "vacante", "fecha", "hora", "lugar"], ejemplos: ["Sofía", "Chofer", "miércoles 2 de diciembre", "3:00 p. m.", "Av. Reforma 100, Monterrey"], botones: [{ tipo: "QUICK_REPLY", texto: "Confirmo" }, { tipo: "QUICK_REPLY", texto: "Necesito cambiar" }] }),
];

function estadoInicial() {
  return {
    pedidos: [],
    notificaciones: [
      plantilla({ id: "11", nombre: "adamia_evaluacion_resultado", cuerpo: RESULTADO, ejemplos: ["Ana", "Evaluación anual 2026", "Uniline"], variables: 3 }),
      plantilla({ id: "12", nombre: "adamia_clima_recordatorio", idioma: "es", cuerpo: "Hola {{1}}, contesta la encuesta.", ejemplos: ["Ana"], variables: 1 }),
      plantilla({ id: "13", nombre: "adamia_promo_buen_fin_con_un_nombre_muy_largo_para_probar_el_corte", categoria: "MARKETING", estado: "rechazada", estado_meta: "REJECTED", motivo_rechazo: "INVALID_FORMAT: el cuerpo tiene demasiadas variables para su longitud",
        cuerpo: "Hola {{1}}, aprovecha {{2}}.", ejemplos: ["Ana", "el Buen Fin"], variables: 2, encabezado: { texto: "Oferta para {{1}}", ejemplo: "Ana" }, pie: "ADAMIA", botones: [{ tipo: "URL", texto: "Ver oferta", url: "https://adamia.com.mx/promo", ejemplo: "" }] }),
      plantilla({ id: "14", nombre: "adamia_aviso_pendiente", estado: "pendiente", estado_meta: "PENDING", editable: false, cuerpo: "Hola {{1}}, tienes un aviso.", ejemplos: ["Ana"], variables: 1 }),
    ],
    reclutamiento: [],
    bitacora: [{ id: 1, accion: "crear", cuenta: "notificaciones", nombre: "adamia_evaluacion_resultado", idioma: "es_MX", resultado: "ok", detalle: "Enviada a aprobación de Meta.", usuario_nombre: "Equipo ADAMIA", creado_en: "2026-11-26 10:15:00" }],
  };
}
let S = estadoInicial();

function catalogo() {
  const filas = CATALOGO.map((c) => {
    const lista = S[c.cuenta];
    const mismas = lista.filter((p) => p.nombre === c.nombre);
    const exacta = mismas.find((p) => p.idioma === c.idioma);
    const fila = { nombre: c.nombre, idioma: c.idioma, categoria: c.categoria, cuenta: c.cuenta, diferencias: [], avisos: [], catalogo: c };
    if (!mismas.length) return { ...fila, situacion: "falta", zernio: null };
    if (!exacta) return { ...fila, situacion: "difiere", zernio: mismas[0], diferencias: [{ campo: "idioma", esperado: c.idioma, en_zernio: mismas[0].idioma, mensaje: `Existe en ${mismas[0].idioma} y el código la manda en ${c.idioma}: Meta no la encuentra.` }] };
    return { ...fila, situacion: "coincide", zernio: exacta, avisos: exacta.categoria !== c.categoria ? [`Meta la tiene como ${exacta.categoria}.`] : [] };
  });
  const n = (s) => filas.filter((f) => f.situacion === s).length;
  return { filas, resumen: { total: filas.length, faltan: n("falta"), difieren: n("difiere"), coinciden: n("coincide"), sin_cuenta: 0, aprobadas: filas.filter((f) => f.situacion === "coincide" && f.zernio.estado === "aprobada").length },
    errores_cuenta: {}, cuentas: [{ clave: "notificaciones", etiqueta: "Número de notificaciones de ADAMIA", configurada: true }, { clave: "reclutamiento", etiqueta: "Número del agente de reclutamiento", configurada: true }] };
}

async function instalarMocks(ctx) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/empresas/check-status") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ hasActivePlan: true, slug: "adamia" }) });
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base) return json({});
    if (url.origin !== API_ORIGEN) return route.abort();
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    let cuerpo = null;
    try { cuerpo = req.postDataJSON(); } catch { /* sin cuerpo */ }
    S.pedidos.push({ metodo: req.method(), ruta: p, query: Object.fromEntries(url.searchParams), cuerpo });
    if (p === "/users/verify/token") return json({ user: admin });
    const B = "/checador/whatsapp-plantillas";
    if (!p.startsWith(B)) return json({});
    const r = p.slice(B.length);
    const cuenta = url.searchParams.get("cuenta") || "notificaciones";
    if (r === "/cuentas") return json({ cuentas: catalogo().cuentas });
    if (r === "/catalogo") return json(catalogo());
    if (r === "/bitacora") return json({ disponible: true, registros: S.bitacora });
    if (r === "/catalogo/enviar-faltantes") {
      await dormir(300);
      const creadas = [];
      for (const f of catalogo().filas.filter((x) => x.situacion === "falta")) {
        S[f.cuenta].push(plantilla({ id: String(100 + creadas.length), nombre: f.nombre, categoria: f.categoria, estado: "pendiente", estado_meta: "PENDING", editable: false, cuerpo: f.catalogo.cuerpo, ejemplos: f.catalogo.ejemplos, variables: f.catalogo.variables.length, botones: f.catalogo.botones }));
        creadas.push({ nombre: f.nombre, idioma: f.idioma, cuenta: f.cuenta, estado: "pendiente" });
      }
      return json({ creadas, ya_existian: [{ nombre: "adamia_evaluacion_resultado" }], difieren: [{ nombre: "adamia_clima_recordatorio" }], errores: [], sin_cuenta: [] });
    }
    if (r === "" && req.method() === "GET") return json({ cuenta, plantillas: S[cuenta] });
    if (r === "" && req.method() === "POST") {
      if (cuerpo.nombre === "adamia_error_meta") return json({ ok: false, codigo: "platform_api_error", error: "Zernio/Meta rechazó la plantilla: El cuerpo tiene demasiadas variables para su longitud" }, 400);
      const nueva = plantilla({ id: "200", ...cuerpo, estado: "pendiente", estado_meta: "PENDING", editable: false, variables: cuerpo.ejemplos.length });
      S[cuenta].push(nueva);
      return json({ plantilla: nueva, bitacora: true }, 201);
    }
    const nombre = decodeURIComponent(r.slice(1));
    const t = S[cuenta].find((x) => x.nombre === nombre && (!url.searchParams.get("idioma") || x.idioma === url.searchParams.get("idioma")));
    if (req.method() === "GET") return t ? json({ cuenta, plantilla: t, catalogo: CATALOGO.find((c) => c.nombre === nombre) ?? null }) : json({ ok: false, error: "Zernio no encontró la plantilla o la cuenta." }, 404);
    if (req.method() === "PUT") { Object.assign(t, cuerpo, { estado: "pendiente", estado_meta: "PENDING", editable: false }); return json({ plantilla: t, bitacora: true }); }
    if (req.method() === "DELETE") { S[cuenta] = S[cuenta].filter((x) => x !== t); return json({ borrada: true, en_catalogo: false, bitacora: true }); }
    return json({});
  });
}

// Sin scroll horizontal, botones ≥ 44 px (teléfono) y texto ≥ 13 px dentro de `selector`.
async function revisar(page, selector, { movil }) {
  await dormir(450);
  const r = await page.evaluate(({ selector, movil }) => {
    const raiz = document.querySelector(selector);
    if (!raiz) return { falta: selector };
    const chicos = [];
    const letra = [];
    for (const el of raiz.querySelectorAll("button, a[href], summary, select, input, textarea")) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height || getComputedStyle(el).visibility === "hidden") continue;
      const ob = (el.closest("label") ?? el).getBoundingClientRect();
      if (movil && ob.height < 43.5 && b.height < 43.5) chicos.push(`${el.tagName} «${(el.innerText || el.getAttribute("aria-label") || el.value || "").trim().slice(0, 30)}» ${Math.round(b.height)}px`);
    }
    const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    while (caminante.nextNode()) {
      const n = caminante.currentNode;
      if (!n.textContent.trim() || !n.parentElement) continue;
      const estilo = getComputedStyle(n.parentElement);
      if (estilo.display === "none" || n.parentElement.closest(".sr-only, [aria-hidden=true]")) continue;
      if (parseFloat(estilo.fontSize) < 12.99) letra.push(`«${n.textContent.trim().slice(0, 30)}» ${estilo.fontSize}`);
    }
    // Algo de la raíz que se salga de la ventana a lo ancho.
    const fuera = [...raiz.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > window.innerWidth + 1; }).slice(0, 3).map((e) => `${e.tagName}.${String(e.className).slice(0, 40)}`);
    return { anchoDoc: document.documentElement.scrollWidth, ventana: window.innerWidth, chicos, letra, fuera };
  }, { selector, movil });
  assert.equal(r.falta, undefined, `falta ${r.falta}`);
  assert.ok(r.anchoDoc <= r.ventana, `${selector}: scroll horizontal (${r.anchoDoc} > ${r.ventana})`);
  assert.deepEqual(r.fuera, [], `${selector}: elementos fuera de la ventana`);
  assert.deepEqual(r.chicos, [], `${selector}: objetivos táctiles < 44 px`);
  assert.deepEqual(r.letra, [], `${selector}: texto < 13 px`);
}
const captura = async (page, nombre, fullPage = false) => { if (OUT) await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage }); };

async function recorrido(browser, { ancho, alto, sufijo }) {
  S = estadoInicial();
  const movil = ancho < 1024;
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-MX", timezoneId: "America/Mexico_City", deviceScaleFactor: movil ? 2 : 1, hasTouch: movil, isMobile: movil });
  await ctx.addCookies([{ name: "token", value: firmar(), url: base }]);
  await instalarMocks(ctx);
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));

  // ——— 1. Lista con estado y filtros ———
  await page.goto(base + "/dashboard/plantillas-whatsapp", { waitUntil: "domcontentloaded" });
  await page.locator("[data-plantilla]").first().waitFor({ timeout: 30000 });
  assert.equal(await page.locator("[data-plantilla]").count(), 4);
  assert.match(await page.locator("[data-plantilla='adamia_aviso_pendiente']").innerText(), /En revisión/);
  assert.match(await page.locator("[data-plantilla^='adamia_promo']").innerText(), /Rechazada[\s\S]*Motivo: INVALID_FORMAT/);
  await revisar(page, "[data-panel-plantillas]", { movil });
  await captura(page, `01-lista-${sufijo}`, true);
  await page.getByRole("button", { name: /^Rechazada/ }).click();
  assert.equal(await page.locator("[data-plantilla]").count(), 1);
  await page.getByRole("button", { name: /^Todas/ }).click();
  await page.getByLabel("Categoría").selectOption("MARKETING");
  assert.equal(await page.locator("[data-plantilla]").count(), 1);
  await page.getByLabel("Categoría").selectOption("");
  await page.getByLabel("Buscar").fill("evaluacion");
  assert.equal(await page.locator("[data-plantilla]").count(), 1);
  await page.getByLabel("Buscar").fill("");

  // ——— 2. Detalle de la rechazada y editar ———
  await page.locator("[data-plantilla^='adamia_promo'] button").click();
  const det = page.locator("[data-detalle-plantilla]");
  await det.waitFor();
  assert.match(await det.innerText(), /Meta la rechazó: INVALID_FORMAT/);
  const burbuja = await det.locator("[data-burbuja]").innerText();
  assert.match(burbuja, /Oferta para Ana[\s\S]*Hola Ana, aprovecha el Buen Fin\.[\s\S]*ADAMIA[\s\S]*Ver oferta/);
  await revisar(page, "[role=dialog]", { movil });
  await captura(page, `02-detalle-rechazada-${sufijo}`);
  await det.getByRole("button", { name: "Editar" }).click();
  const form = page.locator("[data-formulario-plantilla]");
  await form.waitFor();
  assert.equal(await form.getByLabel("Nombre").isDisabled(), true, "el nombre no se cambia al editar");
  assert.equal(await form.getByLabel("Categoría").isDisabled(), true);
  await form.getByLabel("Cuerpo").fill("Hola {{1}}, en ADAMIA tenemos {{2}} para tu empresa este mes.");
  await form.getByRole("button", { name: "Guardar y mandar a revisión" }).click();
  await form.waitFor({ state: "detached" });
  const put = S.pedidos.find((x) => x.metodo === "PUT");
  assert.equal(put.ruta, "/checador/whatsapp-plantillas/adamia_promo_buen_fin_con_un_nombre_muy_largo_para_probar_el_corte");
  assert.deepEqual(put.cuerpo, { nombre: "adamia_promo_buen_fin_con_un_nombre_muy_largo_para_probar_el_corte", categoria: "MARKETING", idioma: "es_MX", cuerpo: "Hola {{1}}, en ADAMIA tenemos {{2}} para tu empresa este mes.", ejemplos: ["Ana", "el Buen Fin"], pie: "ADAMIA", encabezado: { texto: "Oferta para {{1}}", ejemplo: "Ana" }, botones: [{ tipo: "URL", texto: "Ver oferta", url: "https://adamia.com.mx/promo", ejemplo: "" }] });
  await page.getByText("Plantilla editada: volvió a revisión de Meta.").waitFor();

  // ——— 3. Crear: validación local, error de Zernio, éxito ———
  await page.getByRole("button", { name: "Nueva plantilla" }).click();
  await form.waitFor();
  await form.getByLabel("Nombre").fill("Aviso Nuevo");
  await form.getByLabel("Cuerpo").fill("Tu trámite está listo, ");
  await form.getByRole("button", { name: "Agregar variable" }).click();
  assert.equal(await form.getByLabel("Cuerpo").inputValue(), "Tu trámite está listo, {{1}}");
  await form.getByRole("button", { name: "Crear y enviar a aprobación" }).click();
  const texto = await form.innerText();
  assert.match(texto, /solo admite minúsculas/);
  assert.match(texto, /termine con una variable/);
  assert.match(texto, /Ejemplo de \{\{1\}\}: falta el ejemplo/);
  assert.equal(S.pedidos.filter((x) => x.metodo === "POST" && x.ruta === "/checador/whatsapp-plantillas").length, 0, "inválida no se manda");
  await revisar(page, "[role=dialog]", { movil });
  await captura(page, `03-crear-errores-${sufijo}`);
  await form.getByLabel("Nombre").fill("adamia_error_meta");
  await form.getByLabel("Cuerpo").fill("Hola {{1}}, tu trámite en {{2}} está listo. Entra a ADAMIA.");
  await form.getByLabel("Ejemplo de {{1}}", { exact: true }).fill("Ana");
  await form.getByLabel("Ejemplo de {{2}}", { exact: true }).fill("Uniline");
  await form.getByRole("button", { name: "Agregar botón" }).click();
  await form.getByLabel("Texto del botón 1").fill("Enterado");
  assert.match(await form.locator("[data-burbuja]").innerText(), /Hola Ana, tu trámite en Uniline está listo\. Entra a ADAMIA\.[\s\S]*Enterado/);
  await form.getByRole("button", { name: "Crear y enviar a aprobación" }).click();
  await form.locator("[data-error-servidor]").waitFor();
  assert.equal(await form.locator("[data-error-servidor]").innerText(), "Zernio/Meta rechazó la plantilla: El cuerpo tiene demasiadas variables para su longitud");
  await revisar(page, "[role=dialog]", { movil });
  await captura(page, `04-crear-error-zernio-${sufijo}`);
  await form.getByLabel("Nombre").fill("adamia_aviso_nuevo");
  await form.getByRole("button", { name: "Crear y enviar a aprobación" }).click();
  await form.waitFor({ state: "detached" });
  const post = S.pedidos.filter((x) => x.metodo === "POST" && x.ruta === "/checador/whatsapp-plantillas").at(-1);
  assert.deepEqual(post.cuerpo, { nombre: "adamia_aviso_nuevo", categoria: "UTILITY", idioma: "es_MX", cuerpo: "Hola {{1}}, tu trámite en {{2}} está listo. Entra a ADAMIA.", ejemplos: ["Ana", "Uniline"], pie: "", encabezado: null, botones: [{ tipo: "QUICK_REPLY", texto: "Enterado" }] });
  assert.equal(post.query.cuenta, "notificaciones");
  await page.locator("[data-plantilla='adamia_aviso_nuevo']").waitFor();

  // ——— 4. Catálogo del sistema y envío de faltantes ———
  await page.getByRole("tab", { name: "Catálogo del sistema" }).click();
  const catal = page.locator("[data-catalogo-sistema]");
  await catal.waitFor();
  assert.deepEqual(await page.locator("[data-fila-catalogo]").evaluateAll((els) => els.map((e) => [e.dataset.filaCatalogo, e.dataset.situacion])), [
    ["adamia_felicitacion_cumpleanos", "falta"], ["adamia_clima_recordatorio", "difiere"], ["adamia_evaluacion_resultado", "coincide"], ["recordatorio_entrevista", "falta"],
  ]);
  assert.match(await page.locator("[data-fila-catalogo='adamia_clima_recordatorio']").innerText(), /Existe en es y el código la manda en es_MX/);
  await page.locator("[data-fila-catalogo='recordatorio_entrevista']").getByRole("button", { name: "Ver texto y variables" }).click();
  assert.match(await page.locator("[data-fila-catalogo='recordatorio_entrevista'] [data-burbuja]").innerText(), /Hola Sofía, te recordamos tu entrevista para la vacante Chofer[\s\S]*Confirmo[\s\S]*Necesito cambiar/);
  await revisar(page, "[data-catalogo-sistema]", { movil });
  await captura(page, `05-catalogo-${sufijo}`, true);
  const enviar = page.locator("[data-enviar-faltantes]");
  assert.match(await enviar.innerText(), /\(2\)/);
  await enviar.click();
  await page.locator("[data-resultado-envio]").waitFor();
  assert.match(await page.locator("[data-resultado-envio]").innerText(), /2 enviada\(s\) a aprobación de Meta · 1 ya existía\(n\) · 1 difiere\(n\)/);
  assert.equal(S.pedidos.filter((x) => x.ruta === "/checador/whatsapp-plantillas/catalogo/enviar-faltantes").length, 1);
  await page.waitForFunction(() => document.querySelector("[data-enviar-faltantes]")?.textContent.includes("(0)"));
  assert.equal(await enviar.isDisabled(), true, "sin faltantes el botón se apaga (no se manda dos veces)");
  await revisar(page, "[data-catalogo-sistema]", { movil });
  await captura(page, `06-catalogo-enviadas-${sufijo}`);

  // ——— 5. Bitácora ———
  await page.getByRole("tab", { name: "Bitácora" }).click();
  await page.getByText("Creó adamia_evaluacion_resultado").waitFor();
  await revisar(page, "[data-panel-plantillas]", { movil });
  await captura(page, `07-bitacora-${sufijo}`);

  // ——— 6. Borrar con confirmación ———
  await page.getByRole("tab", { name: "En Zernio" }).click();
  await page.locator("[data-plantilla='adamia_aviso_pendiente'] button").click();
  await det.waitFor();
  assert.match(await det.innerText(), /Meta la está revisando/);
  assert.equal(await det.getByRole("button", { name: "Editar" }).count(), 0, "en revisión no se edita");
  await det.getByText("Borrar esta plantilla").click();
  const borrar = det.getByRole("button", { name: "Borrar definitivamente" });
  assert.equal(await borrar.isDisabled(), true);
  await det.getByLabel("Escribe el nombre para confirmar").fill("adamia_aviso_pendiente");
  await revisar(page, "[role=dialog]", { movil });
  await captura(page, `08-borrar-${sufijo}`);
  await borrar.click();
  await det.waitFor({ state: "detached" });
  const del = S.pedidos.find((x) => x.metodo === "DELETE");
  assert.deepEqual(del.query, { cuenta: "notificaciones", idioma: "es_MX", confirmar: "adamia_aviso_pendiente" });
  await page.locator("[data-plantilla='adamia_aviso_pendiente']").waitFor({ state: "detached" });

  // La llave nunca pasa por el navegador: ninguna petición va a Zernio.
  assert.equal(S.pedidos.some((x) => /zernio/i.test(x.ruta)), false);
  assert.deepEqual(errores, [], "sin errores en la página");
  await ctx.close();
}

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch { /* aún no arranca */ } if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  await recorrido(browser, { ancho: 1440, alto: 900, sufijo: "1440" });
  console.log("OK escritorio 1440");
  await recorrido(browser, { ancho: 390, alto: 844, sufijo: "390" });
  console.log("OK teléfono 390");
  exito = true;
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
