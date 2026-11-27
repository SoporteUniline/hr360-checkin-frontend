// Verificación en navegador de Lumo fase B (25/11/2026), con el arnés de verify-whatsapp-lumo.mjs:
//   B1 · «Ubicación en el mapa» en Unidades de negocio (Ubicar en mapa por el servidor, corregir a mano, sin Mapbox avisa)
//        y «Sucursales» de la vacante; sucursal elegida en la ficha.
//   B2 · editor de la entrevista con «Filtra / Solo informa», obligatoria, fecha y archivo, «Generar entrevista con IA»;
//        sección «Entrevista» de la ficha con campos, origen, documento y enlace del formulario; formulario público
//        /postular/<token> (prellenado, validación, envío, enlace vencido).
// Escritorio (1440) y teléfono (390): sin scroll horizontal, objetivos táctiles ≥ 44 px y texto ≥ 13 px en las piezas nuevas.
// Backend simulado: nada sale a internet (ni a Mapbox).
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      CAPTURAS=/ruta/capturas PLAYWRIGHT_MODULE_PATH=… node scripts/verify-whatsapp-lumo-b.mjs
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

const TOKEN = "Abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE";
function estadoInicial({ mapbox = true } = {}) {
  return {
    pedidos: [], mapbox,
    sucursales: [
      { id_unidad: 11, id_sucursal: 1, id_empresa: 10, nombre: "San Pedro", razonSocialEmpleador: "Uniline SA", rfcEmpleador: "UNI010101AAA", domicilioEmpleador: "Calzada del Valle 400, Del Valle, San Pedro Garza García, N.L.", empresa_nombre: "Uniline", lat: null, lng: null, ubicacion_origen: null },
      { id_unidad: 12, id_sucursal: 2, id_empresa: 10, nombre: "Apodaca", razonSocialEmpleador: "Uniline SA", rfcEmpleador: "UNI010101AAA", domicilioEmpleador: "Av. Miguel Alemán 10, Apodaca, N.L.", empresa_nombre: "Uniline", lat: 25.7814, lng: -100.1886, ubicacion_origen: "mapbox" },
      { id_unidad: 13, id_sucursal: 3, id_empresa: 10, nombre: "Escobedo", razonSocialEmpleador: "Uniline SA", rfcEmpleador: "UNI010101AAA", domicilioEmpleador: null, empresa_nombre: "Uniline", lat: null, lng: null, ubicacion_origen: null },
    ],
    idsVacante: [],
    preguntas: [
      { id: 901, orden: 1, texto: "¿Tienes experiencia con montacargas?", tipo: "si_no", opciones: ["Sí", "No"], descartan: ["No"], alertan: null, activa: true, uso: "filtro", obligatoria: true },
      { id: 902, orden: 2, texto: "¿Desde qué fecha puedes empezar?", tipo: "fecha", opciones: null, descartan: null, alertan: null, activa: true, uso: "dato", obligatoria: true },
    ],
    campos: [
      { id: 901, texto: "¿Tienes experiencia con montacargas?", tipo: "si_no", uso: "filtro", obligatoria: true, opciones: ["Sí", "No"], valor: "Sí", origen: "boton", severidad: "ok", archivo: null },
      { id: 902, texto: "¿Desde qué fecha puedes empezar?", tipo: "fecha", uso: "dato", obligatoria: true, opciones: null, valor: "2027-01-15", origen: "agente", severidad: "ok", archivo: null },
      { id: 903, texto: "¿Qué turno prefieres?", tipo: "opciones", uso: "dato", obligatoria: false, opciones: ["Matutino", "Vespertino"], valor: null, origen: null, severidad: null, archivo: null },
      { id: 904, texto: "Sube tu CV", tipo: "archivo", uso: "dato", obligatoria: true, opciones: null, valor: "Currículum Ana.pdf", origen: "formulario", severidad: "ok", archivo: { nombre: "Currículum Ana.pdf", mime: "application/pdf", url: "/reclutamiento/whatsapp/conversaciones/1/archivos/904" } },
    ],
    publico: {
      vacante: { titulo: "Operador de montacargas" }, empresa: "Uniline", expira_en: "2026-12-02 10:00:00", enviado_en: null,
      campos: [
        { id: 901, texto: "¿Tienes experiencia con montacargas?", tipo: "si_no", opciones: ["Sí", "No"], obligatoria: true, valor: "Sí", archivo: null },
        { id: 902, texto: "¿Desde qué fecha puedes empezar?", tipo: "fecha", opciones: null, obligatoria: true, valor: null, archivo: null },
        { id: 903, texto: "¿Qué turno prefieres?", tipo: "opciones", opciones: ["Matutino", "Vespertino"], obligatoria: false, valor: null, archivo: null },
        { id: 904, texto: "Sube tu CV", tipo: "archivo", opciones: null, obligatoria: true, valor: null, archivo: null },
      ],
    },
    vencido: false,
  };
}
let S = estadoInicial();
const SUG_ENTREVISTA = {
  id_vacante: 55, modo: "entrevista", espacio: 18, descartadas: { total: 1, discriminatorias: 1 },
  sugerencias: [
    { texto: "¿Qué tipo de montacargas has operado?", tipo: "texto", opciones: null, descartan: null, alertan: null, uso: "dato", obligatoria: true, motivo: "Saber su experiencia real." },
    { texto: "¿Cuántas toneladas has cargado?", tipo: "numero", opciones: null, descartan: null, alertan: null, uso: "dato", obligatoria: false, motivo: "Capacidad de la planta." },
  ],
};
const conversacion = {
  id: 1, id_empresa: 10, contacto: { id: 501, nombre: "Ana Ruiz", telefono: "5215512345678" }, vacante: { id_vacante: 55, titulo: "Operador de montacargas" },
  modo: "ia", control: null, no_leidos: 0, ultimo_mensaje: { texto: "Ya llené el formulario", direccion: "entrante", creado_en: hace(3) }, ultimo_entrante_en: hace(3), ventana_abierta: true,
  entrevista: { etapa: "preguntas", calificacion: "incompleto", requiere_atencion: false, motivo_atencion: null },
};

async function instalarMocks(ctx) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base) return json({});
    if (url.origin !== API_ORIGEN) return route.abort(); // ni Mapbox ni nada externo
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    if (p === "/users/verify/token") return json({ user: reclutadora });
    if (p.startsWith("/checador/sucursales")) return json({ total: S.sucursales.length, sucursales: S.sucursales });
    if (p === `/reclutamiento/formulario/${TOKEN}`) {
      S.pedidos.push({ metodo: req.method(), ruta: p, cuerpo: req.method() === "POST" ? (req.postData() ?? "") : null });
      if (S.vencido) return json({ ok: false, error: "Este enlace ya venció.", codigo: "FORMULARIO_VENCIDO" }, 410);
      if (req.method() === "POST") {
        S.publico = { ...S.publico, enviado_en: hace(0), campos: S.publico.campos.map((c) => (c.id === 902 ? { ...c, valor: "2027-02-01" } : c.id === 904 ? { ...c, archivo: { nombre: "cv.pdf" } } : c)) };
        return json({ ok: true, guardadas: 2, ...S.publico });
      }
      return json(S.publico);
    }
    if (!p.startsWith("/reclutamiento/whatsapp")) return json({});
    const ruta = p.slice("/reclutamiento/whatsapp".length);
    let cuerpo = null;
    try { cuerpo = req.postData() ? JSON.parse(req.postData()) : null; } catch { cuerpo = req.postData(); }
    S.pedidos.push({ metodo: req.method(), ruta, params: url.search, cuerpo });
    const publica = (s) => ({ ...s, direccion: s.domicilioEmpleador, ubicada: s.lat != null });
    if (ruta === "/sucursales") return json({ id_empresa: 10, mapbox_configurado: S.mapbox, sucursales: S.sucursales.map(publica) });
    if (ruta === "/sucursales/geocodificar") {
      if (!S.mapbox) return json({ ok: false, error: "Falta configurar Mapbox", codigo: "MAPBOX_NO_CONFIGURADO" }, 503);
      await dormir(300);
      return json({ lat: 25.6573, lng: -100.4022, etiqueta: "Calzada del Valle 400, Del Valle, San Pedro Garza García, N.L., México" });
    }
    let m;
    if ((m = ruta.match(/^\/sucursales\/(\d+)\/ubicacion$/))) {
      const s = S.sucursales.find((x) => String(x.id_unidad) === m[1]);
      Object.assign(s, { lat: cuerpo.lat, lng: cuerpo.lng, ubicacion_origen: cuerpo.lat == null ? null : cuerpo.origen });
      return json({ sucursal: publica(s) });
    }
    if (ruta === "/vacantes/55/sucursales" && req.method() === "GET") return json({ id_vacante: 55, todas: !S.idsVacante.length, ids: S.idsVacante, mapbox_configurado: S.mapbox, sucursales: S.sucursales.map(publica) });
    if (ruta === "/vacantes/55/sucursales" && req.method() === "PUT") { S.idsVacante = cuerpo.ids; return json({ id_vacante: 55, todas: !S.idsVacante.length, ids: S.idsVacante, mapbox_configurado: S.mapbox, sucursales: S.sucursales.map(publica) }); }
    if (ruta === "/estado") return json({ modo: "compartido", numero_whatsapp: "5215598765432", conversaciones_mes: 12, puede_usar: true, plantillas_mes: 0, entrevistas_mes: 3, entrevistas_incluidas: null, entrevistas_extra: 0 });
    if (ruta === "/agente") return json({ id_empresa: 10, activo: true, nombre_asistente: "Ana", horario_json: null, mensaje_fuera_horario: null, respuestas_frecuentes: "", palabras_humano: null });
    if (ruta === "/conversaciones") return json({ conversaciones: [conversacion], total: 1, atencion: { total: 0, primeros: [] } });
    if (ruta === "/conversaciones/1") {
      return json({
        conversacion,
        mensajes: [
          { id: 1, direccion: "entrante", actor: "candidato", tipo: "texto", texto: "Vivo en la colonia Del Valle", estado: "recibido", error: null, creado_en: hace(6), usuario: null },
          { id: 2, direccion: "saliente", actor: "ia", tipo: "texto", texto: "Te quedan cerca estas sucursales, ¿cuál prefieres?", estado: "leido", error: null, creado_en: hace(5), usuario: null, botones: [{ title: "San Pedro", payload: "suc:11" }, { title: "Apodaca", payload: "suc:12" }] },
          { id: 3, direccion: "entrante", actor: "candidato", tipo: "texto", texto: "Ya llené el formulario", estado: "recibido", error: null, creado_en: hace(3), usuario: null },
        ],
        entrevista: { etapa: "preguntas", consentimiento: "aceptado", nombre: "Ana Ruiz Pérez", pregunta_actual: null, calificacion: "incompleto", requiere_atencion: false, motivo_atencion: null, resumen: null, puntajes: null,
          respuestas: [], sucursal: { id_unidad: 11, nombre: "San Pedro", direccion: "Calzada del Valle 400, San Pedro" }, ubicacion_candidato: "Colonia Del Valle, San Pedro",
          campos: S.campos, formulario: { expira_en: "2026-12-02 10:00:00", vigente: true, creado_por: "agente", creado_en: hace(30), enviado_en: hace(4), envios: 1 } },
        preguntas_sin_respuesta: [], citas: [], proceso: null, puede_iniciar_proceso: false, requisitos: null,
      });
    }
    if (ruta === "/conversaciones/1/formulario") return json({ enlace: `${base}/postular/${TOKEN}`, expira_en: "2026-12-09 10:00:00" }, 201);
    if (ruta === "/vacantes") return json({ vacantes: [{ id_vacante: 55, id_empresa: 10, titulo: "Operador de montacargas", slug: "operador-de-montacargas", tiene_enlace: true }] });
    if (ruta === "/vacantes/55/preguntas" && req.method() === "GET") return json({ id_vacante: 55, preguntas: S.preguntas });
    if (ruta === "/vacantes/55/preguntas" && req.method() === "PUT") return json({ id_vacante: 55, preguntas: cuerpo.preguntas.map((x, i) => ({ id: 950 + i, ...x })) });
    if (ruta === "/vacantes/55/preguntas/sugerir") { await dormir(400); return json(cuerpo?.modo === "entrevista" ? SUG_ENTREVISTA : { id_vacante: 55, sugerencias: [], descartadas: { total: 0, discriminatorias: 0 }, espacio: 7 }); }
    if (ruta === "/vacantes/55/enlace") return json({ token: "abc", enlace: "https://wa.me/525598765432?text=Hola", numero: "5215598765432" });
    if (ruta === "/vacantes/55/requisitos") return json({ id_vacante: 55, requisitos: [] });
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
    // Lumo fase B: nada de lo nuevo se sale por la derecha (aunque un contenedor con overflow oculto lo esconda).
    const fuera = [];
    for (const el of raiz.querySelectorAll("button, a[href], input, select, textarea, [data-enlace-formulario]")) {
      const b = el.getBoundingClientRect();
      if (b.width && b.right > window.innerWidth + 1) fuera.push(`${el.tagName} «${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30)}» ${Math.round(b.right)}px`);
    }
    chicos.push(...fuera.map((f) => `FUERA DE LA PANTALLA ${f}`));
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

  // ——— B1.1 Unidades de negocio → Editar → Ubicación en el mapa ———
  await page.goto(base + "/panel/catalogos/unidades-de-negocio", { waitUntil: "domcontentloaded" });
  await page.locator("button[title='Editar']").first().waitFor({ timeout: 30000 });
  await page.locator("button[title='Editar']").first().click();
  const ubic = page.locator("[data-ubicacion-sucursal]");
  await ubic.waitFor();
  await ubic.scrollIntoViewIfNeeded();
  await ubic.getByRole("button", { name: "Ubicar en mapa" }).click();
  await ubic.getByText("Mapbox encontró:").waitFor();
  assert.equal(await ubic.getByLabel("Latitud").inputValue(), "25.6573");
  const geo = S.pedidos.find((x) => x.ruta === "/sucursales/geocodificar");
  assert.deepEqual(geo.cuerpo, { direccion: "Calzada del Valle 400, Del Valle, San Pedro Garza García, N.L." });
  assert.match(geo.params, /empresa=10/);
  // Corrige a mano y guarda.
  await ubic.getByLabel("Longitud").fill("-100.4031");
  await revisar(page, "[data-ubicacion-sucursal]", { movil });
  await captura(page, `b1-01-ubicar-en-mapa-${sufijo}`);
  await ubic.getByRole("button", { name: "Guardar ubicación" }).click();
  await ubic.getByText("Ubicación guardada.", { exact: false }).waitFor();
  assert.deepEqual(S.pedidos.find((x) => x.ruta === "/sucursales/11/ubicacion").cuerpo, { lat: 25.6573, lng: -100.4031, origen: "manual" });
  await page.keyboard.press("Escape");

  // Sin Mapbox: aviso y botón apagado (la captura a mano sigue).
  S.mapbox = false;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("button[title='Editar']").nth(2).waitFor({ timeout: 30000 });
  await page.locator("button[title='Editar']").nth(2).click();
  await page.locator("[data-ubicacion-sucursal] [data-sin-mapbox]").waitFor();
  assert.equal(await page.locator("[data-ubicacion-sucursal]").getByRole("button", { name: "Ubicar en mapa" }).isDisabled(), true);
  await page.locator("[data-ubicacion-sucursal]").scrollIntoViewIfNeeded();
  await captura(page, `b1-02-sin-mapbox-${sufijo}`);
  await page.keyboard.press("Escape");
  S.mapbox = true;

  // ——— B1.2 y B2.1 Enlaces de vacantes → Sucursales / Entrevista ———
  await page.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Más opciones" }).click();
  await page.getByRole("menuitem", { name: "Enlaces de vacantes" }).click();
  await page.getByRole("button", { name: "Sucursales de Operador de montacargas" }).click();
  const dlgSuc = page.getByRole("dialog", { name: "Sucursales de la vacante" });
  await dlgSuc.waitFor();
  // Con «Todas» se avisa de la que falta ubicar; al quitarla, el aviso se va.
  await dlgSuc.getByText("1 sin ubicar: el agente no las puede proponer.", { exact: false }).waitFor();
  await dlgSuc.getByRole("switch", { name: "Todas las sucursales" }).click();
  await dlgSuc.getByRole("checkbox").nth(2).uncheck();
  assert.doesNotMatch(await dlgSuc.innerText(), /sin ubicar: el agente/);
  await revisar(page, "[data-sucursales-vacante]", { movil });
  await captura(page, `b1-03-sucursales-vacante-${sufijo}`);
  await dlgSuc.getByRole("button", { name: "Guardar" }).click();
  await dlgSuc.getByText("Guardado.", { exact: false }).waitFor();
  assert.deepEqual(S.pedidos.find((x) => x.ruta === "/vacantes/55/sucursales" && x.metodo === "PUT").cuerpo, { ids: [11, 12] });
  await dlgSuc.getByRole("button", { name: "Cerrar" }).first().click();

  await page.getByRole("button", { name: "Entrevista de Operador de montacargas" }).click();
  const editor = page.getByRole("dialog", { name: "Entrevista por WhatsApp" });
  await editor.locator("section[aria-label='Pregunta 2']").waitFor();
  assert.match(await editor.locator("[data-conteo-usos]").innerText(), /1 de 8 filtran · 1 solo informan/);
  // La fecha solo puede informar (radio «Filtra» deshabilitado).
  assert.equal(await editor.locator("section[aria-label='Pregunta 2']").getByRole("radio", { name: "Filtra" }).isDisabled(), true);
  // Generar entrevista con IA → agrega 2 datos (sin guardar).
  await editor.locator("[data-boton-generar-entrevista]").click();
  await editor.locator("[data-sugerencias-entrevista]").waitFor();
  assert.match(await editor.locator("[data-sugerencias-entrevista]").innerText(), /Solo informa · obligatorio[\s\S]*Solo informa · opcional/);
  assert.equal(S.pedidos.find((x) => x.ruta === "/vacantes/55/preguntas/sugerir").cuerpo.modo, "entrevista");
  await editor.locator("[data-sugerencias-entrevista] [data-sugerencia='0']").click();
  await editor.locator("[data-sugerencias-entrevista] [data-sugerencia='1']").click();
  await revisar(page, "[data-sugerencias-entrevista]", { movil });
  await captura(page, `b2-01-generar-entrevista-ia-${sufijo}`);
  await editor.locator("[data-sugerencias-entrevista] [data-agregar-sugerencias]").click();
  assert.equal(await editor.locator("section[aria-label^='Pregunta ']").count(), 4);
  assert.match(await editor.locator("[data-conteo-usos]").innerText(), /1 de 8 filtran · 3 solo informan/);
  const tarjeta = editor.locator("section[aria-label='Pregunta 4']");
  await tarjeta.scrollIntoViewIfNeeded();
  await revisar(page, "section[aria-label='Pregunta 4']", { movil });
  await captura(page, `b2-02-editor-campos-${sufijo}`);
  await editor.getByRole("button", { name: "Guardar entrevista" }).click();
  await editor.waitFor({ state: "detached" });
  const put = S.pedidos.find((x) => x.ruta === "/vacantes/55/preguntas" && x.metodo === "PUT");
  assert.deepEqual(put.cuerpo.preguntas.map((x) => [x.tipo, x.uso ?? "filtro", x.obligatoria ?? true]), [["si_no", "filtro", true], ["fecha", "dato", true], ["texto", "dato", true], ["numero", "dato", false]]);
  await page.keyboard.press("Escape");

  // ——— B1.3 y B2.2 Ficha del candidato: sucursal elegida, campos de la entrevista y enlace del formulario ———
  await page.goto(base + "/panel/whatsapp?c=1", { waitUntil: "domcontentloaded" });
  await page.locator("[data-ver-ficha]").first().click();
  const ficha = page.locator("[data-ficha-candidato='abierta']");
  await ficha.waitFor();
  const campos = ficha.locator("[data-campos-entrevista]");
  await campos.waitFor();
  assert.match(await ficha.locator("[data-sucursal-elegida='11']").innerText(), /Sucursal elegida: San Pedro[\s\S]*Dijo que vive en: Colonia Del Valle/);
  assert.match(await campos.innerText(), /Entrevista · 3 de 4[\s\S]*15\/01\/2027[\s\S]*Lo registró el agente[\s\S]*Pendiente[\s\S]*Currículum Ana\.pdf[\s\S]*Lo llenó en el formulario/);
  await campos.getByRole("button", { name: "Nuevo enlace del formulario" }).click();
  await campos.locator("[data-enlace-formulario]").waitFor();
  assert.match(await campos.locator("[data-enlace-formulario]").innerText(), new RegExp(`/postular/${TOKEN}`));
  await campos.scrollIntoViewIfNeeded();
  await revisar(page, "[data-campos-entrevista]", { movil });
  await captura(page, `b2-03-ficha-entrevista-${sufijo}`);

  // ——— B2.3 Formulario público /postular/<token> ———
  const pub = await ctx.newPage();
  pub.on("pageerror", (e) => errores.push(e.message));
  await pub.goto(`${base}/postular/${TOKEN}`, { waitUntil: "domcontentloaded" });
  const form = pub.locator("[data-formulario-entrevista]");
  await form.waitFor({ timeout: 30000 });
  // (27/11/2026) Sí / No como botones grandes (radios): prellenado = «Sí» marcado.
  assert.equal(await pub.locator("#pregunta-901").getByRole("radio", { name: "Sí" }).isChecked(), true, "prellenado con lo de WhatsApp");
  await pub.getByRole("button", { name: "Enviar respuestas" }).click();
  await pub.getByText("Revisa los campos marcados.").waitFor();
  assert.equal(S.pedidos.filter((x) => x.metodo === "POST" && x.ruta.startsWith("/reclutamiento/formulario")).length, 0, "no manda si falta lo obligatorio");
  await revisar(pub, "[data-formulario-entrevista]", { movil });
  await captura(pub, `b2-04-formulario-faltan-${sufijo}`);
  await pub.locator("#pregunta-902").fill("2027-02-01");
  await pub.locator("#doc-904").setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%prueba\n") });
  await pub.getByRole("button", { name: "Enviar respuestas" }).click();
  await pub.locator("[data-formulario-enviado]").waitFor();
  const envio = S.pedidos.find((x) => x.metodo === "POST" && x.ruta.startsWith("/reclutamiento/formulario"));
  assert.match(envio.cuerpo, /name="respuestas"[\s\S]*"902":"2027-02-01"/);
  assert.match(envio.cuerpo, /name="archivo_904"; filename="cv.pdf"/);
  await revisar(pub, "[data-formulario-entrevista]", { movil });
  await captura(pub, `b2-05-formulario-enviado-${sufijo}`);
  S.vencido = true;
  await pub.reload({ waitUntil: "domcontentloaded" });
  await pub.locator("[data-formulario-error='FORMULARIO_VENCIDO']").waitFor();
  await captura(pub, `b2-06-formulario-vencido-${sufijo}`);

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
