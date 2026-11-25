// Verificación en navegador de Lumo fase A (25/11/2026): «Base de conocimiento» de la bandeja (preguntas sin respuesta →
// Responder / Descartar, entradas, importar), «Sugerir con IA» en el editor de la entrevista (se agregan solo las que RH
// elige, sin guardar), «Requisitos» de la vacante (edad con fundamento legal) y requisitos en la ficha del candidato como
// alerta. Escritorio (1440) y teléfono (390): sin scroll horizontal, objetivos táctiles ≥ 44 px y texto ≥ 13 px en las
// piezas nuevas. Backend simulado: nada sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      CAPTURAS=/ruta/capturas node scripts/verify-whatsapp-lumo.mjs
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
const hace = (min) => new Date(Date.now() - 6 * 3600 * 1000 - min * 60000).toISOString().slice(0, 19).replace("T", " ");
const reclutadora = {
  id_usuario: 7, tipo_usuario: "Recruiter", nombre: "Laura Gómez", correo: "laura@uniline.mx", id_empresa: 10, empresas: [10],
  empresas_detalle: [{ id_empresa: 10, nombre: "Uniline" }], zona_horaria: "America/Mexico_City",
};

function estadoInicial() {
  return {
    pedidos: [],
    conversaciones: [{
      id: 1, id_empresa: 10, contacto: { id: 501, nombre: "Ana Ruiz", telefono: "5215512345678" }, vacante: { id_vacante: 55, titulo: "Operador de montacargas" },
      modo: "ia", control: null, no_leidos: 0, ultimo_mensaje: { texto: "¿Dan uniforme?", direccion: "entrante", creado_en: hace(3) }, ultimo_entrante_en: hace(3), ventana_abierta: true,
      entrevista: { etapa: "preguntas", calificacion: "con_alerta", requiere_atencion: false, motivo_atencion: null },
    }],
    sinRespuesta: [
      { id: 31, id_empresa: 10, id_conversacion: 1, id_vacante: 55, vacante: "Operador de montacargas", contacto: { id: 501, nombre: "Ana Ruiz" }, pregunta: "¿Dan seguro de gastos médicos mayores desde el primer día?", creado_en: hace(20), resuelta: false },
      { id: 32, id_empresa: 10, id_conversacion: 1, id_vacante: null, vacante: null, contacto: { id: 501, nombre: "Ana Ruiz" }, pregunta: "¿Puedo llevar a mi perro?", creado_en: hace(60), resuelta: false },
    ],
    entradas: [
      { id: 1, id_empresa: 10, id_vacante: null, vacante: null, pregunta: "¿Dan uniforme?", respuesta: "Sí, dos cambios al año desde el primer mes.", estado: "aprobada", origen: "manual" },
      { id: 2, id_empresa: 10, id_vacante: 55, vacante: "Operador de montacargas", pregunta: "¿Se necesita certificación de montacargas?", respuesta: "No; damos la capacitación y la constancia DC-3 en la primera semana.", estado: "aprobada", origen: "sin_respuesta" },
      { id: 3, id_empresa: 10, id_vacante: null, vacante: null, pregunta: "¿Hay comedor?", respuesta: "Sí, subsidiado al 50 %.", estado: "borrador", origen: "importada" },
    ],
    preguntas: [{ id: 901, orden: 1, texto: "¿Cuántos años de experiencia tienes con montacargas?", tipo: "numero", opciones: null, descartan: { min: 1 }, alertan: null, activa: true }],
    requisitos: [],
    importables: 2,
  };
}
let S = estadoInicial();
const SUGERENCIAS = {
  id_vacante: 55, espacio: 7, descartadas: { total: 2, discriminatorias: 2 },
  sugerencias: [
    { texto: "¿Cuentas con constancia DC-3 de montacargas vigente?", tipo: "si_no", opciones: null, descartan: null, alertan: ["No"], motivo: "La vacante opera montacargas." },
    { texto: "¿Qué turno puedes cubrir?", tipo: "opciones", opciones: ["Matutino", "Vespertino", "Nocturno"], descartan: null, alertan: ["Nocturno"], motivo: "El horario es rotativo." },
    { texto: "¿Puedes cargar cajas de hasta 25 kg?", tipo: "si_no", opciones: null, descartan: ["No"], alertan: null, motivo: "Parte del puesto." },
    { texto: "¿Vives en Monterrey o su zona metropolitana?", tipo: "si_no", opciones: null, descartan: null, alertan: ["No"], motivo: "Trabajo presencial en planta." },
  ],
};
const REQUISITOS_FICHA = {
  resultados: [
    { tipo: "experiencia", etiqueta: "Experiencia", estado: "no_cumple", detalle: "Pide 2 años de experiencia; tiene 1 año.", fuente: "pregunta", valor: "1" },
    { tipo: "turno", etiqueta: "Turno", estado: "cumple", detalle: "Acepta turno matutino, mixto; puede matutino.", fuente: "perfil", valor: "matutino" },
    { tipo: "zona", etiqueta: "Zona", estado: "falta_dato", detalle: "Zona: Monterrey, Apodaca; el candidato aún no lo dice.", fuente: null, valor: null },
  ],
  resumen: { cumple: 1, no_cumple: 1, falta_dato: 1, alerta: true },
};

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
    if (p === "/users/verify/token") return json({ user: reclutadora });
    if (!p.startsWith("/reclutamiento/whatsapp")) return json({});
    const ruta = p.slice("/reclutamiento/whatsapp".length);
    let cuerpo = null;
    try { cuerpo = req.postData() ? JSON.parse(req.postData()) : null; } catch { cuerpo = req.postData(); }
    S.pedidos.push({ metodo: req.method(), ruta, params: url.search, cuerpo });
    let m;
    if (ruta === "/estado") return json({ modo: "compartido", numero_whatsapp: "5215598765432", conversaciones_mes: 12, puede_usar: true, plantillas_mes: 0, entrevistas_mes: 3, entrevistas_incluidas: null, entrevistas_extra: 0 });
    if (ruta === "/agente") return json({ id_empresa: 10, activo: true, nombre_asistente: "Ana", horario_json: null, mensaje_fuera_horario: null, respuestas_frecuentes: "P: ¿Hay comedor?\nR: Sí.", palabras_humano: null });
    if (ruta === "/conversaciones") return json({ conversaciones: S.conversaciones, total: 1, atencion: { total: 0, primeros: [] } });
    if (ruta === "/conversaciones/1") {
      return json({
        conversacion: S.conversaciones[0],
        mensajes: [
          { id: 1, direccion: "entrante", actor: "candidato", tipo: "texto", texto: "¿Dan uniforme?", estado: "recibido", error: null, creado_en: hace(4), usuario: null },
          { id: 2, direccion: "saliente", actor: "ia", tipo: "texto", texto: "Sí, dos cambios al año desde el primer mes.", estado: "leido", error: null, creado_en: hace(3), usuario: null },
        ],
        entrevista: { etapa: "preguntas", consentimiento: "aceptado", nombre: "Ana Ruiz Pérez", pregunta_actual: null, calificacion: "con_alerta", requiere_atencion: false, motivo_atencion: null, resumen: null, puntajes: null,
          respuestas: [{ texto_pregunta: "¿Cuántos años de experiencia tienes con montacargas?", respuesta: "1", severidad: "ok" }] },
        preguntas_sin_respuesta: S.sinRespuesta.filter((x) => x.id_conversacion === 1).map((x) => ({ id: x.id, pregunta: x.pregunta, id_vacante: x.id_vacante, creado_en: x.creado_en, resuelta: x.resuelta })),
        citas: [], proceso: null, puede_iniciar_proceso: false, requisitos: REQUISITOS_FICHA,
      });
    }
    if (ruta === "/vacantes") return json({ vacantes: [{ id_vacante: 55, id_empresa: 10, titulo: "Operador de montacargas", slug: "operador-de-montacargas", tiene_enlace: true }] });
    if (ruta === "/conocimiento" && req.method() === "GET") return json({ id_empresa: 10, entradas: S.entradas, sin_respuesta_pendientes: S.sinRespuesta.filter((x) => !x.resuelta).length, importables: S.importables });
    if (ruta === "/conocimiento" && req.method() === "POST") {
      const e = { id: 50 + S.entradas.length, id_empresa: 10, vacante: null, origen: "manual", ...cuerpo };
      S.entradas.unshift(e);
      return json({ entrada: e }, 201);
    }
    if (ruta === "/sin-respuesta") return json({ id_empresa: 10, preguntas: S.sinRespuesta.filter((x) => !x.resuelta), pendientes: S.sinRespuesta.filter((x) => !x.resuelta).length });
    if ((m = ruta.match(/^\/sin-respuesta\/(\d+)\/responder$/))) {
      const q = S.sinRespuesta.find((x) => String(x.id) === m[1]);
      q.resuelta = true;
      const e = { id: 70, id_empresa: 10, id_vacante: cuerpo.alcance === "vacante" ? q.id_vacante : null, vacante: cuerpo.alcance === "vacante" ? q.vacante : null, pregunta: cuerpo.pregunta, respuesta: cuerpo.respuesta, estado: "aprobada", origen: "sin_respuesta" };
      S.entradas.unshift(e);
      return json({ entrada: e, pregunta: q }, 201);
    }
    if ((m = ruta.match(/^\/sin-respuesta\/(\d+)\/descartar$/))) { S.sinRespuesta.find((x) => String(x.id) === m[1]).resuelta = true; return json({ pregunta: {} }); }
    if (ruta === "/vacantes/55/preguntas" && req.method() === "GET") return json({ id_vacante: 55, preguntas: S.preguntas });
    if (ruta === "/vacantes/55/preguntas/sugerir") { await dormir(600); return json(SUGERENCIAS); }
    if (ruta === "/vacantes/55/requisitos" && req.method() === "GET") return json({ id_vacante: 55, requisitos: S.requisitos });
    if (ruta === "/vacantes/55/requisitos" && req.method() === "PUT") { S.requisitos = cuerpo.requisitos.map((r, i) => ({ id: i + 1, orden: i + 1, ...r })); return json({ id_vacante: 55, requisitos: S.requisitos }); }
    if (ruta === "/vacantes/55/enlace") return json({ token: "abc", enlace: "https://wa.me/525598765432?text=Hola", numero: "5215598765432" });
    if (ruta === "/bolsa") return json({ id_empresa: 10, publicar_bolsa: false });
    return json({});
  });
}

// Revisión móvil/escritorio de las piezas nuevas: sin scroll horizontal, botones ≥ 44 px (teléfono) y texto ≥ 13 px.
async function revisar(page, selector, { movil }) {
  await dormir(450); // los diálogos entran con una animación de escala (95 % → 100 %): medir ya quietos
  const r = await page.evaluate(({ selector, movil }) => {
    const raiz = document.querySelector(selector);
    if (!raiz) return { falta: selector };
    const anchoDoc = document.documentElement.scrollWidth;
    const chicos = [];
    const letra = [];
    for (const el of raiz.querySelectorAll("button, a[href], input[type=checkbox], input[type=radio], select, input:not([type]), input[type=search], textarea")) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height || getComputedStyle(el).visibility === "hidden") continue;
      const objetivo = el.closest("label") ?? el;
      const ob = objetivo.getBoundingClientRect();
      if (movil && ob.height < 43.5 && b.height < 43.5) chicos.push(`${el.tagName} «${(el.innerText || el.getAttribute("aria-label") || el.value || "").trim().slice(0, 30)}» ${Math.round(ob.height)}px`);
    }
    const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    while (caminante.nextNode()) {
      const n = caminante.currentNode;
      if (!n.textContent.trim() || !n.parentElement) continue;
      const estilo = getComputedStyle(n.parentElement);
      if (estilo.display === "none" || n.parentElement.closest(".sr-only, [aria-hidden=true]")) continue; // decorativos fuera
      if (parseFloat(estilo.fontSize) < 12.99) letra.push(`«${n.textContent.trim().slice(0, 30)}» ${estilo.fontSize}`);
    }
    return { anchoDoc, ventana: window.innerWidth, chicos, letra };
  }, { selector, movil });
  assert.equal(r.falta, undefined, `falta ${r.falta}`);
  assert.ok(r.anchoDoc <= r.ventana, `${selector}: scroll horizontal (${r.anchoDoc} > ${r.ventana})`);
  assert.deepEqual(r.chicos, [], `${selector}: objetivos táctiles < 44 px`);
  assert.deepEqual(r.letra, [], `${selector}: texto < 13 px`);
}

const captura = async (page, nombre) => { if (OUT) await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: false }); };

async function recorrido(browser, { ancho, alto, sufijo }) {
  S = estadoInicial();
  const movil = ancho < 1024;
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-MX", timezoneId: "America/Mexico_City", deviceScaleFactor: movil ? 2 : 1, hasTouch: movil, isMobile: movil });
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctx);
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));

  // ——— 1. Base de conocimiento ———
  await page.goto(base + "/panel/whatsapp?vista=conocimiento", { waitUntil: "domcontentloaded" });
  await page.locator("[data-base-conocimiento]").waitFor({ timeout: 30000 });
  assert.match(await page.locator("[data-vista-lateral='Base de conocimiento'] h2").innerText(), /Base de conocimiento/);
  assert.match(await page.locator("#k-pendientes").innerText(), /2 preguntas sin respuesta/);
  assert.equal(await page.locator("[data-entrada]").count(), 3);
  assert.match(await page.locator("[data-entrada='3']").innerText(), /Borrador[\s\S]*Importada/);
  await revisar(page, "[data-base-conocimiento]", { movil });
  await captura(page, `01-conocimiento-${sufijo}`);
  // Filtro por estado.
  await page.getByRole("button", { name: "Borradores" }).click();
  assert.equal(await page.locator("[data-entrada]").count(), 1);
  await page.getByRole("button", { name: "Todas" }).click();

  // Responder → entrada aprobada de la vacante; la pregunta sale de pendientes.
  await page.locator("[data-sin-respuesta='31']").getByRole("button", { name: "Responder" }).click();
  const dlg = page.getByRole("dialog", { name: "Responder pregunta" });
  await dlg.waitFor();
  await dlg.getByLabel("Respuesta del agente").fill("Sí, desde el primer día con la aseguradora de la empresa.");
  await revisar(page, "[data-dialogo-entrada]", { movil });
  await captura(page, `02-responder-${sufijo}`);
  await dlg.getByRole("button", { name: "Guardar respuesta" }).click();
  await page.locator("[data-sin-respuesta='31']").waitFor({ state: "detached" });
  const resp = S.pedidos.find((x) => x.ruta === "/sin-respuesta/31/responder");
  assert.deepEqual(resp.cuerpo, { pregunta: "¿Dan seguro de gastos médicos mayores desde el primer día?", respuesta: "Sí, desde el primer día con la aseguradora de la empresa.", alcance: "vacante" });
  assert.match(await page.locator("#k-pendientes").innerText(), /1 pregunta sin respuesta/);
  await page.getByText("Respuesta guardada: el agente ya la usa.").waitFor();
  // Validación de una entrada nueva vacía.
  await page.getByRole("button", { name: "Nueva entrada" }).click();
  const nueva = page.getByRole("dialog", { name: "Nueva entrada" });
  await nueva.getByRole("button", { name: "Guardar" }).click();
  assert.match(await nueva.innerText(), /Escribe la pregunta[\s\S]*Escribe la respuesta/);
  assert.equal(S.pedidos.filter((x) => x.ruta === "/conocimiento" && x.metodo === "POST").length, 0, "no se manda inválida");
  await nueva.getByRole("button", { name: "Cancelar" }).click();

  // ——— 2. Ficha del candidato con requisitos (alerta) ———
  await page.goto(base + "/panel/whatsapp?c=1", { waitUntil: "domcontentloaded" });
  await page.locator("[data-ver-ficha]").first().click();
  const ficha = page.locator("[data-ficha-candidato='abierta']");
  await ficha.waitFor();
  const req = ficha.locator("[data-requisitos]");
  await req.waitFor();
  assert.equal(await req.getAttribute("data-requisitos"), "rojo");
  assert.match(await req.innerText(), /No cumple 1 de 3 requisitos[\s\S]*no se rechaza solo/);
  assert.deepEqual(await ficha.locator("li[data-requisito]").evaluateAll((els) => els.map((e) => e.dataset.estado)), ["no_cumple", "cumple", "falta_dato"]);
  await req.scrollIntoViewIfNeeded();
  await revisar(page, "[data-seccion-ficha='evaluacion']", { movil });
  await captura(page, `03-ficha-requisitos-${sufijo}`);

  // ——— 3. Sugerir con IA (editor de la entrevista, desde «Enlaces de vacantes») ———
  await page.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Más opciones" }).click();
  await page.getByRole("menuitem", { name: "Enlaces de vacantes" }).click();
  await page.getByRole("button", { name: "Entrevista de Operador de montacargas" }).click();
  const editor = page.getByRole("dialog", { name: "Entrevista por WhatsApp" });
  await editor.locator("[data-boton-sugerir]").click();
  await editor.locator("[data-sugerencias-ia]").waitFor();
  assert.match(await editor.locator("[data-sugerencias-ia]").innerText(), /Se quitaron 2 sugerencias que podían discriminar/);
  assert.equal(await editor.locator("[data-sugerencia]").count(), 4);
  await editor.locator("[data-sugerencia='0']").click();
  await editor.locator("[data-sugerencia='1']").click();
  await revisar(page, "[data-sugerencias-ia]", { movil });
  await captura(page, `04-sugerencias-ia-${sufijo}`);
  await editor.locator("[data-agregar-sugerencias]").click();
  assert.equal(await editor.locator("section[aria-label^='Pregunta ']").count(), 3, "1 existente + 2 elegidas");
  assert.equal(S.pedidos.filter((x) => x.ruta === "/vacantes/55/preguntas" && x.metodo === "PUT").length, 0, "nada se guarda solo");
  await editor.getByRole("button", { name: "Guardar entrevista" }).scrollIntoViewIfNeeded();
  await captura(page, `05-sugerencias-agregadas-${sufijo}`);
  await page.keyboard.press("Escape");
  await editor.getByRole("button", { name: "Descartar cambios" }).click();

  // ——— 4. Requisitos de la vacante ———
  await page.getByRole("button", { name: "Requisitos de Operador de montacargas" }).click();
  const reqs = page.getByRole("dialog", { name: "Requisitos de la vacante" });
  await reqs.waitFor();
  await reqs.getByRole("button", { name: "Edad" }).click();
  await reqs.getByLabel("a", { exact: true }).fill("40");
  await reqs.getByRole("button", { name: "Experiencia mínima" }).click();
  await reqs.getByLabel("Mínimo").fill("2");
  await reqs.getByLabel("De dónde se toma el dato").nth(1).selectOption("901");
  await reqs.getByRole("button", { name: "Guardar requisitos" }).click();
  assert.match(await reqs.innerText(), /Escribe el fundamento legal/);
  assert.equal(S.pedidos.filter((x) => x.ruta === "/vacantes/55/requisitos" && x.metodo === "PUT").length, 0, "sin fundamento no se manda");
  await revisar(page, "[data-editor-requisitos]", { movil });
  await captura(page, `06-requisitos-${sufijo}`);
  await reqs.getByLabel("Fundamento legal (obligatorio)").fill("Póliza del seguro de la flotilla: operadores de 18 a 40 años");
  await reqs.getByRole("button", { name: "Guardar requisitos" }).click();
  await reqs.waitFor({ state: "detached" });
  const put = S.pedidos.find((x) => x.ruta === "/vacantes/55/requisitos" && x.metodo === "PUT");
  assert.deepEqual(put.cuerpo.requisitos, [
    { tipo: "edad", activo: true, regla: { min: 18, max: 40, fundamento: "Póliza del seguro de la flotilla: operadores de 18 a 40 años", id_pregunta: null } },
    { tipo: "experiencia", activo: true, regla: { min_anios: 2, id_pregunta: 901 } },
  ]);

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
