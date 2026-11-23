// Verificación en navegador de WhatsApp en ADAMIA (R1): bandeja, control humano/IA, envío, errores, reintento,
// móvil, administración por empresa y enlace de vacante. R2: agente entrevistador (configuración, preguntas por
// vacante, filtros por calificación, evaluación del candidato y «Marcar como atendido»).
// 27/11/2026: bolsa de trabajo opcional (interruptor, PUT, también con WhatsApp apagado), «Copiar enlace de la vacante»,
// paquete de entrevistas (chip, aviso de extras, campos del administrador) y la bolsa pública (/vacantes/filter y la tira
// de empresas con ?bolsa=1).
// Construir con NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx (el enlace de la vacante usa ese dominio).
// Backend simulado: nada sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RECRUITMENT_ENABLED=true npm run build
//      CAPTURAS=/ruta/capturas node scripts/verify-whatsapp.mjs
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
const API_ORIGEN = "https://api.prueba.invalid";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");
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

// ——— Datos simulados ———
const hace = (min) => {
  const d = new Date(Date.now() - 6 * 3600 * 1000 - min * 60000);
  return d.toISOString().slice(0, 19).replace("T", " ");
};
const reclutadora = {
  id_usuario: 7, tipo_usuario: "Recruiter", esAcceso: true, nombre: "Laura Gómez", correo: "laura@uniline.mx", id_empresa: 10, empresas: [10, 11],
  empresas_detalle: [{ id_empresa: 10, nombre: "Uniline" }, { id_empresa: 11, nombre: "Uniline Norte" }], zona_horaria: "America/Mexico_City",
};
const admin = { id_usuario: 1, tipo_usuario: "Admin", nombre: "Soporte ADAMIA" };
const AVISO = "https://dev.adamia.com.mx/aviso-de-privacidad/uniline";
const ENLACE = "https://wa.me/525598765432?text=Hola%2C%20me%20interesa%20la%20vacante%20%5BV-AB12%5D";
const PAGINA_VACANTE = "https://dev.adamia.com.mx/vacante/operador-de-montacargas";

function estadoInicial() {
  const conversaciones = [
    { id: 1, id_empresa: 10, contacto: { id: 501, nombre: "Ana Ruiz", telefono: "5215512345678" }, vacante: { id_vacante: 55, titulo: "Operador de montacargas" },
      modo: "ia", control: null, no_leidos: 2, ultimo_mensaje: { texto: "¿Sigue disponible la vacante?", direccion: "entrante", creado_en: hace(3) }, ultimo_entrante_en: hace(3), ventana_abierta: true },
    { id: 2, id_empresa: 10, contacto: { id: 502, nombre: "", telefono: "5214421234567" }, vacante: null,
      modo: "humano", control: { id_usuario: 7, nombre: "Laura Gómez", correo: "laura@uniline.mx" }, no_leidos: 0, ultimo_mensaje: { texto: "Gracias", direccion: "entrante", creado_en: hace(60 * 30) }, ultimo_entrante_en: hace(60 * 30), ventana_abierta: false },
    { id: 3, id_empresa: 10, contacto: { id: 503, nombre: "Carlos Méndez Ortega con un nombre muy largo para probar", telefono: "5218112345678" }, vacante: { id_vacante: 56, titulo: "Auxiliar de almacén turno nocturno" },
      modo: "humano", control: { id_usuario: 7, nombre: "Pedro", correo: "pedro@uniline.mx" }, no_leidos: 0, ultimo_mensaje: { texto: "Te esperamos el lunes", direccion: "saliente", creado_en: hace(60 * 26) }, ultimo_entrante_en: hace(60 * 27), ventana_abierta: true },
  ];
  const mensajes = {
    1: [
      { id: 101, direccion: "entrante", actor: "candidato", tipo: "texto", texto: "Hola, vi la vacante de operador.", estado: "recibido", error: null, creado_en: hace(60 * 25), usuario: null },
      { id: 102, direccion: "saliente", actor: "ia", tipo: "texto", texto: "¡Hola Ana! Claro, te cuento: el turno es de 7 a 15 h. ¿Tienes licencia vigente?", estado: "leido", error: null, creado_en: hace(60 * 25 - 1), usuario: null },
      { id: 103, direccion: "saliente", actor: "reclutador", tipo: "texto", texto: "Te comparto la dirección de la planta.", estado: "fallido", error: "Número no disponible", creado_en: hace(10), usuario: { nombre: "Laura Gómez" } },
      { id: 104, direccion: "entrante", actor: "candidato", tipo: "texto", texto: "¿Sigue disponible la vacante?", estado: "recibido", error: null, creado_en: hace(3), usuario: null },
    ],
    2: [
      { id: 200, direccion: "entrante", actor: "candidato", tipo: "imagen", texto: "", estado: "recibido", error: null, creado_en: hace(60 * 31), usuario: null },
      { id: 201, direccion: "entrante", actor: "candidato", tipo: "texto", texto: "Gracias", estado: "recibido", error: null, creado_en: hace(60 * 30), usuario: null },
    ],
    3: [
      { id: 301, direccion: "entrante", actor: "candidato", tipo: "texto", texto: "Hola", estado: "recibido", error: null, creado_en: hace(60 * 27), usuario: null },
      { id: 302, direccion: "saliente", actor: "sistema", tipo: "texto", texto: "Pedro tomó la conversación.", estado: "enviado", error: null, creado_en: hace(60 * 26 + 1), usuario: null },
      { id: 303, direccion: "saliente", actor: "reclutador", tipo: "texto", texto: "Te esperamos el lunes", estado: "entregado", error: null, creado_en: hace(60 * 26), usuario: { nombre: "Pedro" } },
    ],
  };
  const empresas = [
    { id_empresa: 10, nombre_empresa: "Uniline", modo: "compartido", zernio_account_id: null, numero_whatsapp: "5215598765432", precio_conversacion: 1.5, precio_mensual: 0, conversaciones_mes: 12,
      entrevistas_incluidas: null, entrevistas_mes: 9, entrevistas_extra: 0, importe_estimado: 0 },
    { id_empresa: 11, nombre_empresa: "Uniline Norte", modo: "apagado", zernio_account_id: null, numero_whatsapp: null, precio_conversacion: null, precio_mensual: null, conversaciones_mes: 0,
      entrevistas_incluidas: null, entrevistas_mes: 0, entrevistas_extra: 0, importe_estimado: null },
    { id_empresa: 12, nombre_empresa: "Transportes Sur", modo: "propio", zernio_account_id: "acc_sur", numero_whatsapp: "5213312345678", precio_conversacion: 1, precio_mensual: 499, conversaciones_mes: 87,
      entrevistas_incluidas: 200, entrevistas_mes: 212, entrevistas_extra: 12, importe_estimado: 511 },
  ];
  // 32 conversaciones viejas de relleno: con limite=30 hay 2 páginas (35 en total).
  for (let i = 1; i <= 32; i++) {
    conversaciones.push({ id: 1000 + i, id_empresa: 10, contacto: { id: 2000 + i, nombre: `Candidato ${i}`, telefono: `52155000000${String(i).padStart(2, "0")}` },
      vacante: { id_vacante: 57, titulo: "Chofer repartidor" }, modo: "ia", control: null, no_leidos: 0,
      ultimo_mensaje: { texto: "Gracias por la información", direccion: "entrante", creado_en: hace(60 * 24 * 10 + i) }, ultimo_entrante_en: hace(60 * 24 * 10 + i), ventana_abierta: false });
  }
  const vacantes = [
    { id_vacante: 55, id_empresa: 10, titulo: "Operador de montacargas", slug: "operador-de-montacargas", tiene_enlace: true },
    { id_vacante: 56, id_empresa: 10, titulo: "Auxiliar de almacén turno nocturno", slug: "auxiliar-de-almacen-turno-nocturno", tiene_enlace: false },
    { id_vacante: 57, id_empresa: 10, titulo: "Chofer repartidor", slug: "chofer-repartidor", tiene_enlace: false },
  ];
  // R2: entrevistas por conversación (detalle completo; la lista recibe el resumen).
  const entrevistas = {
    2: { etapa: "preguntas", consentimiento: true, nombre: null, calificacion: "incompleto", resumen: "", puntajes: null, requiere_atencion: false, motivo_atencion: null, pregunta_actual: "¿Tienes licencia tipo C?", respuestas: [] },
    3: {
      etapa: "humano", consentimiento: true, nombre: "Carlos Méndez Ortega", calificacion: "no_califica",
      resumen: "Tiene experiencia en almacén pero no cuenta con licencia tipo C. Pidió hablar con una persona sobre el horario nocturno.",
      puntajes: { comunicacion: 4, actitud: 5, experiencia: 3, confiabilidad: 2, disponibilidad: 1 },
      requiere_atencion: true, motivo_atencion: "Pidió hablar con una persona",
      respuestas: [
        { texto_pregunta: "¿Cuántos años tienes?", respuesta: "34", severidad: "ok" },
        { texto_pregunta: "¿Puedes trabajar en turno nocturno?", respuesta: "Solo algunos días", severidad: "alerta" },
        { texto_pregunta: "¿Tienes licencia tipo C?", respuesta: "No", severidad: "descarta" },
      ],
    },
  };
  for (let i = 3; i <= 32; i += 3) entrevistas[1000 + i] = { etapa: "cerrada", consentimiento: true, calificacion: "califica", requiere_atencion: false, motivo_atencion: null, respuestas: [] };
  const sinRespuesta = { 3: [{ pregunta: "¿Dan transporte de personal en la noche?", id_vacante: 56, creado_en: hace(60 * 26 + 5) }] };
  const agente = { id_empresa: 10, activo: false, nombre_asistente: "", horario_json: null, mensaje_fuera_horario: "", respuestas_frecuentes: "", palabras_humano: "", aviso_privacidad_url: AVISO };
  const preguntas = { 55: [{ id: 1, orden: 1, texto: "¿Tienes licencia tipo C?", tipo: "si_no", opciones: ["Sí", "No"], descartan: ["No"], alertan: [], activa: true }] };
  // 27/11/2026: paquete por empresa (10 con paquete, 11 sin paquete), bolsa de trabajo y respuestas públicas.
  const paquetes = { 10: { entrevistas_mes: 32, entrevistas_incluidas: 200, entrevistas_extra: 0 }, 11: { entrevistas_mes: 3, entrevistas_incluidas: null, entrevistas_extra: 0 } };
  const publico = {
    empresas: [{ id_empresa: 10, nombre_empresa: "Uniline", url_imagen: null }],
    vacantes: [{ id_vacante: 55, id_empresa: 10, titulo: "Operador de montacargas", slug: "operador-de-montacargas", nombre_empresa: "Uniline", descripcion: "Manejo de montacargas.", horario: "7 a 15 h", salario: "$12,000" }],
  };
  return {
    conversaciones, mensajes, empresas, vacantes, modo: "compartido", envios: [], siguienteId: 900, entrevistas, sinRespuesta, agente, preguntas, siguientePregunta: 100, errores400: [],
    paquetes, bolsa: { 10: false, 11: false }, bolsaFalla: 0, publico,
  };
}
const resumenEntrevista = (e) => (e ? { etapa: e.etapa, calificacion: e.calificacion, requiere_atencion: e.requiere_atencion, motivo_atencion: e.motivo_atencion } : null);

const pedidos = [];
const publicos = []; // llamadas al API fuera de WhatsApp (bolsa de trabajo pública)
let S = estadoInicial();

async function instalarMocks(ctx, usuario) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base) return json({});
    if (url.origin !== API_ORIGEN) return route.abort();
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    if (p === "/users/verify/token") return json({ user: usuario });
    if (!p.startsWith("/reclutamiento/whatsapp")) {
      publicos.push({ ruta: p, params: url.search });
      if (p === "/empresas/activas") return json({ total: S.publico.empresas.length, page: 1, limit: 4, data: S.publico.empresas });
      if (p === "/vacantes/filter") return json({ total: S.publico.vacantes.length, page: 1, limit: 10, data: S.publico.vacantes });
      if (p === "/vacantes/entidades") return json({ entidades: ["Nuevo León"], ciudades: ["Monterrey"], paises: ["México"] });
      if (p === "/empresas/giros") return json({ giros: ["Logística"] });
      return json({});
    }
    const ruta = p.slice("/reclutamiento/whatsapp".length);
    let cuerpo = null;
    try { cuerpo = req.postData() ? JSON.parse(req.postData()) : null; } catch { cuerpo = req.postData(); }
    pedidos.push({ metodo: req.method(), ruta, params: url.search, cuerpo, token: req.headers().authorization || "" });
    const conv = (id) => S.conversaciones.find((c) => String(c.id) === String(id));
    let m;
    if (ruta === "/estado") {
      const paquete = S.paquetes[url.searchParams.get("empresa")] ?? { entrevistas_mes: 0, entrevistas_incluidas: null, entrevistas_extra: 0 };
      return json({ modo: S.modo, numero_whatsapp: S.modo === "apagado" ? null : "5215598765432", conversaciones_mes: 12, puede_usar: S.modo !== "apagado", ...paquete });
    }
    if (ruta === "/bolsa") {
      const empresa = url.searchParams.get("empresa");
      if (req.method() === "PUT") {
        if (S.bolsaFalla > 0) { S.bolsaFalla -= 1; return json({ error: "No se pudo guardar la bolsa." }, 500); }
        if (typeof cuerpo?.publicar_bolsa !== "boolean") return json({ error: "publicar_bolsa debe ser true o false." }, 400);
        S.bolsa[empresa] = cuerpo.publicar_bolsa;
      }
      return json({ id_empresa: Number(empresa), publicar_bolsa: S.bolsa[empresa] === true });
    }
    if (ruta === "/conversaciones") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      if (url.searchParams.get("empresa") === "11") return json({ conversaciones: [], total: 0 });
      const calificacion = url.searchParams.get("calificacion");
      if (calificacion && !["califica", "no_califica", "con_alerta", "incompleto"].includes(calificacion)) return json({ error: "Calificación no válida" }, 400);
      const atencion = url.searchParams.get("atencion") === "1";
      const lista = S.conversaciones
        .map((c) => ({ ...c, entrevista: resumenEntrevista(S.entrevistas[c.id]) }))
        .filter((c) => !q || `${c.contacto.nombre} ${c.contacto.telefono} ${c.vacante?.titulo ?? ""}`.toLowerCase().includes(q))
        .filter((c) => !calificacion || c.entrevista?.calificacion === calificacion)
        .filter((c) => !atencion || c.entrevista?.requiere_atencion === true);
      const pagina = Number(url.searchParams.get("pagina") || 1);
      const limite = Number(url.searchParams.get("limite") || 30);
      return json({ conversaciones: lista.slice((pagina - 1) * limite, pagina * limite), total: lista.length });
    }
    if (ruta === "/vacantes") {
      return json({ vacantes: url.searchParams.get("empresa") === "11" ? [] : S.vacantes });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)$/))) {
      const c = conv(m[1]);
      if (!c) return json({ error: "No existe" }, 404);
      c.no_leidos = 0;
      return json({ conversacion: c, mensajes: S.mensajes[c.id], entrevista: S.entrevistas[c.id] ?? null, preguntas_sin_respuesta: S.sinRespuesta[c.id] ?? [] });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/tomar$/))) {
      const c = conv(m[1]); c.modo = "humano"; c.control = { id_usuario: 7, nombre: "Laura Gómez", correo: "laura@uniline.mx" };
      return json({ conversacion: c });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/devolver$/))) {
      const c = conv(m[1]); c.modo = "ia"; c.control = null;
      return json({ conversacion: c });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/mensajes\/(\d+)\/reintentar$/))) {
      const msg = S.mensajes[m[1]].find((x) => String(x.id) === m[2]);
      if (msg.direccion !== "saliente" || msg.estado !== "fallido") return json({ codigo: "WA_NO_REINTENTABLE", error: "No reintentable" }, 409);
      Object.assign(msg, { estado: "enviado", error: null });
      return json({ mensaje: msg });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/mensajes$/))) {
      const resp = S.envios.shift() ?? "ok";
      if (resp === "403") return json({ codigo: "WA_SIN_CONTROL", error: "Sin control" }, 403);
      if (resp === "409") return json({ codigo: "WA_VENTANA_CERRADA", error: "Ventana cerrada" }, 409);
      if (resp === "fallido") {
        const msg = { id: S.siguienteId++, direccion: "saliente", actor: "reclutador", tipo: "texto", texto: cuerpo.texto, estado: "fallido", error: "Zernio rechazó el envío", creado_en: hace(0), usuario: { nombre: "Laura Gómez" } };
        S.mensajes[m[1]].push(msg);
        return json({ mensaje: msg });
      }
      await dormir(700); // deja ver el «Enviando…»
      const msg = { id: S.siguienteId++, direccion: "saliente", actor: "reclutador", tipo: "texto", texto: cuerpo.texto, estado: "enviado", error: null, creado_en: hace(0), usuario: { nombre: "Laura Gómez" } };
      S.mensajes[m[1]].push(msg);
      return json({ mensaje: msg });
    }
    if ((m = ruta.match(/^\/vacantes\/(\d+)\/enlace$/))) {
      if (S.modo === "apagado") return json({ codigo: "WA_APAGADO", error: "Apagado" }, 409);
      if (m[1] === "56") return json({ codigo: "WA_APAGADO", error: "Apagado" }, 409);
      if (m[1] === "57") return json({ codigo: "WA_SIN_NUMERO", error: "Sin número" }, 503);
      return json({ token: "V-AB12", numero: "5215598765432", enlace: ENLACE });
    }
    if (ruta === "/admin/empresas" && req.method() === "GET") return json(S.empresas);
    if ((m = ruta.match(/^\/admin\/empresas\/(\d+)$/)) && req.method() === "PUT") {
      if (cuerpo.zernio_account_id === "acc_sur") return json({ codigo: "WA_CUENTA_DUPLICADA", error: "duplicada" }, 409);
      const e = S.empresas.find((x) => String(x.id_empresa) === m[1]);
      Object.assign(e, cuerpo);
      return json(e);
    }
    // ——— R2 ———
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/atendido$/)) && req.method() === "POST") {
      const e = S.entrevistas[m[1]];
      if (e) Object.assign(e, { requiere_atencion: false, motivo_atencion: null });
      return json({ conversacion: { ...conv(m[1]), entrevista: resumenEntrevista(e) } });
    }
    if (ruta === "/agente") {
      if (req.method() === "PUT") {
        const error = S.errores400.shift();
        if (error) return json({ error }, 400);
        S.agente = { ...S.agente, ...cuerpo };
      }
      return json(S.agente);
    }
    if ((m = ruta.match(/^\/vacantes\/(\d+)\/preguntas$/))) {
      if (req.method() === "PUT") {
        const error = S.errores400.shift();
        if (error) return json({ error }, 400);
        if (!Array.isArray(cuerpo?.preguntas) || cuerpo.preguntas.length > 8) return json({ error: "Máximo 8 preguntas." }, 400);
        S.preguntas[m[1]] = cuerpo.preguntas.map((p) => ({ ...p, id: p.id ?? S.siguientePregunta++ }));
      }
      return json({ preguntas: S.preguntas[m[1]] ?? [] });
    }
    return json({ error: "Ruta no simulada" }, 404);
  });
}

const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const tamano = async (loc) => { const b = await loc.boundingBox(); return b ? Math.min(b.width, b.height) : 0; };
const cuenta = (filtro) => pedidos.filter(filtro).length;

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch { /* aún no arranca */ } if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];

  // ——— 1. Bandeja en escritorio ———
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City", permissions: ["clipboard-read", "clipboard-write"] });
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctx, reclutadora);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  const lista = page.getByRole("list", { name: "Conversaciones" });
  await lista.waitFor({ timeout: 30000 });
  assert.equal(await page.getByRole("heading", { name: "Conversaciones de WhatsApp" }).count(), 1);
  assert.match(await page.locator('[data-estado-wa="compartido"]').innerText(), /Activo · número compartido de ADAMIA[\s\S]*\+52 55 9876 5432[\s\S]*12 conversaciones este mes[\s\S]*32 de 200 entrevistas este mes/);
  assert.equal(await page.locator("[data-aviso-extras]").count(), 0, "sin extras no hay aviso");
  assert.equal(await page.getByLabel("Empresa").filter({ visible: true }).count(), 1, "selector de empresa con 2 empresas");
  const items = lista.getByRole("listitem");
  assert.equal(await items.count(), 30, "primera página de 30");
  const anaItem = page.getByRole("button", { name: "Ana Ruiz, 2 sin leer" });
  assert.match(await anaItem.innerText(), /Ana Ruiz[\s\S]*hace 3 min[\s\S]*Operador de montacargas[\s\S]*¿Sigue disponible la vacante\?[\s\S]*2[\s\S]*IA/);
  assert.match(await items.nth(1).innerText(), /\+52 442 123 4567[\s\S]*Sin vacante[\s\S]*Tú tienes el control/);
  assert.match(await items.nth(2).innerText(), /Atiende Pedro/);
  const listaInicial = pedidos.find((x) => x.ruta === "/conversaciones");
  assert.match(listaInicial.params, /empresa=10/);
  assert.match(listaInicial.token, /^Bearer .+/);
  assert.match(listaInicial.params, /pagina=1&limite=30/);
  // Paginación real: «Ver más» pide pagina=2 y la agrega; el sondeo solo refresca la página 1.
  await page.getByRole("button", { name: "Ver más conversaciones" }).click();
  await page.waitForFunction(() => document.querySelectorAll('[aria-label="Conversaciones"] li').length === 35);
  assert.equal(cuenta((x) => x.ruta === "/conversaciones" && /pagina=2&limite=30/.test(x.params)), 1);
  assert.equal(await page.getByRole("button", { name: "Ver más conversaciones" }).count(), 0, "sin más páginas");
  const paginasUno = cuenta((x) => x.ruta === "/conversaciones" && /pagina=1&/.test(x.params));
  await dormir(5600);
  assert.ok(cuenta((x) => x.ruta === "/conversaciones" && /pagina=1&/.test(x.params)) > paginasUno, "el sondeo refresca la página 1");
  assert.equal(cuenta((x) => x.ruta === "/conversaciones" && /pagina=2&/.test(x.params)), 1, "el sondeo no vuelve a pedir la página 2");
  assert.equal(await items.count(), 35, "las páginas agregadas se conservan tras el sondeo");
  assert.equal(new Set(await items.evaluateAll((li) => li.map((x) => x.textContent))).size, 35, "sin duplicados");
  // Menú lateral: entrada real fuera del demo.
  const entradaMenu = page.getByRole("button", { name: "Conversaciones (WhatsApp)" });
  assert.equal(await entradaMenu.count(), 1, "entrada en el menú de reclutamiento");
  assert.equal(await page.getByText("Usa datos ficticios.").count(), 0, "no usa el layout demo");
  if (OUT) await page.screenshot({ path: OUT + "/01-bandeja-escritorio.png" });

  // ——— 2. Abrir conversación: GET la marca leída ———
  await anaItem.click();
  await page.waitForURL(/\/panel\/whatsapp\?c=1$/);
  const hilo = page.getByRole("region", { name: "Conversación" });
  await hilo.getByText("Hola, vi la vacante de operador.").waitFor();
  assert.ok(cuenta((x) => x.metodo === "GET" && x.ruta === "/conversaciones/1") >= 1, "GET del hilo");
  await page.getByRole("button", { name: "Ana Ruiz", exact: true }).waitFor({ timeout: 5000 }); // sin «2 sin leer»
  assert.match(await hilo.locator('[data-mensaje="102"]').innerText(), /Asistente IA[\s\S]*Leído/);
  assert.match(await hilo.locator('[data-mensaje="103"]').innerText(), /Laura Gómez[\s\S]*No enviado: Número no disponible[\s\S]*Reintentar/);
  const composer = hilo.getByRole("textbox", { name: "Mensaje" });
  assert.equal(await composer.isDisabled(), true, "con IA no se escribe");
  assert.match(await hilo.innerText(), /La IA está atendiendo esta conversación/);
  // Sondeo del hilo cada 3 s.
  const getsAntes = cuenta((x) => x.ruta === "/conversaciones/1");
  await dormir(3600);
  assert.ok(cuenta((x) => x.ruta === "/conversaciones/1") > getsAntes, "el hilo se refresca solo");

  // ——— 3. Tomar control → escribir y enviar ———
  await hilo.getByRole("button", { name: "Tomar control" }).click();
  await hilo.getByRole("button", { name: "Devolver a IA" }).waitFor();
  assert.equal(cuenta((x) => x.metodo === "POST" && x.ruta === "/conversaciones/1/tomar"), 1);
  assert.equal(await composer.isDisabled(), false, "con el control sí se escribe");
  assert.match(await hilo.innerText(), /Tú tienes el control/);
  // Shift+Enter hace salto de línea y no envía.
  await composer.fill("Línea uno");
  await composer.press("Shift+Enter");
  await composer.pressSequentially("Línea dos");
  assert.equal(await composer.inputValue(), "Línea uno\nLínea dos");
  assert.equal(cuenta((x) => x.ruta === "/conversaciones/1/mensajes"), 0);
  await composer.fill("Hola Ana, ¿puedes venir mañana a las 10?");
  await composer.press("Enter");
  await hilo.getByText("Enviando…").first().waitFor({ timeout: 2000 });
  assert.equal(await composer.inputValue(), "", "el cuadro se limpia al enviar");
  await hilo.getByText("Enviando…").first().waitFor({ state: "detached", timeout: 5000 });
  const envio = pedidos.find((x) => x.metodo === "POST" && x.ruta === "/conversaciones/1/mensajes");
  assert.deepEqual(envio.cuerpo, { texto: "Hola Ana, ¿puedes venir mañana a las 10?" });
  assert.match(await hilo.locator('[data-mensaje="900"]').innerText(), /Hola Ana, ¿puedes venir mañana a las 10\?[\s\S]*Enviado/);
  assert.equal(await hilo.locator('[data-mensaje="900"]').count(), 1, "sin duplicados tras el sondeo");

  // ——— 4. Errores 403 y 409 ———
  S.envios.push("403");
  await composer.fill("Mensaje sin control");
  await hilo.getByRole("button", { name: "Enviar mensaje" }).click();
  await hilo.getByRole("alert").filter({ hasText: "Otra persona tiene el control" }).waitFor();
  assert.equal(await composer.inputValue(), "Mensaje sin control", "el texto no se pierde");
  S.envios.push("409");
  await composer.press("Enter");
  await hilo.getByRole("alert").filter({ hasText: "Pasaron más de 24 h" }).waitFor();
  assert.equal(await composer.inputValue(), "Mensaje sin control");
  // Zernio rechaza: el API responde 200 con estado «fallido» → «No enviado» + Reintentar.
  S.envios.push("fallido");
  await composer.fill("Mensaje que Zernio rechaza");
  await composer.press("Enter");
  await hilo.locator('[data-mensaje="901"]').getByText("No enviado: Zernio rechazó el envío").waitFor();
  await hilo.locator('[data-mensaje="901"]').getByRole("button", { name: "Reintentar" }).click();
  await hilo.locator('[data-mensaje="901"]').getByRole("button", { name: "Reintentar" }).waitFor({ state: "detached" });
  await composer.fill("");

  // ——— 5. Mensaje fallido → Reintentar ———
  await hilo.locator('[data-mensaje="103"]').getByRole("button", { name: "Reintentar" }).click();
  await hilo.locator('[data-mensaje="103"]').getByRole("button", { name: "Reintentar" }).waitFor({ state: "detached" });
  assert.equal(cuenta((x) => x.metodo === "POST" && x.ruta === "/conversaciones/1/mensajes/103/reintentar"), 1);
  assert.match(await hilo.locator('[data-mensaje="103"]').innerText(), /Enviado/);
  if (OUT) await page.screenshot({ path: OUT + "/02-hilo-escritorio.png" });

  // ——— 6. Enlace de la vacante: copiar ———
  await hilo.getByRole("button", { name: "Enlace de WhatsApp" }).click();
  const dialogo = page.getByRole("dialog", { name: "Enlace de WhatsApp" });
  await dialogo.getByRole("textbox", { name: "Enlace de WhatsApp de la vacante" }).waitFor();
  assert.equal(await dialogo.getByRole("textbox").inputValue(), ENLACE);
  assert.equal(await dialogo.getByRole("link", { name: "Abrir" }).getAttribute("href"), ENLACE);
  assert.equal(await dialogo.getByRole("link", { name: "Abrir" }).getAttribute("target"), "_blank");
  await dialogo.getByRole("button", { name: "Copiar enlace" }).click();
  await dialogo.getByRole("button", { name: "Copiado" }).waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), ENLACE);
  assert.equal(cuenta((x) => x.ruta === "/vacantes/55/enlace"), 1);
  if (OUT) await page.screenshot({ path: OUT + "/03-enlace-vacante.png" });
  await page.keyboard.press("Escape");

  // ——— 7. Devolver a IA ———
  await hilo.getByRole("button", { name: "Devolver a IA" }).click();
  await hilo.getByRole("button", { name: "Tomar control" }).waitFor();
  assert.equal(cuenta((x) => x.metodo === "POST" && x.ruta === "/conversaciones/1/devolver"), 1);
  assert.equal(await composer.isDisabled(), true);

  // ——— 8. Ventana de 24 h cerrada y control de otra persona ———
  await page.getByRole("button", { name: "+52 442 123 4567" }).click();
  await hilo.getByText("Gracias").first().waitFor();
  assert.match(await hilo.locator('[data-mensaje="200"]').innerText(), /\[Archivo: imagen\] \(se mostrará en una siguiente etapa\)/);
  assert.match(await hilo.innerText(), /Pasaron más de 24 h desde el último mensaje del candidato: WhatsApp no permite escribirle libremente\. Las plantillas para reabrir el chat llegan en una siguiente etapa\./);
  assert.equal(await hilo.getByRole("textbox", { name: "Mensaje" }).isDisabled(), true);
  await page.getByRole("button", { name: /^Carlos Méndez/ }).click();
  await hilo.getByText("Te esperamos el lunes").first().waitFor();
  assert.match(await hilo.innerText(), /Pedro tiene el control de esta conversación\./);
  assert.match(await hilo.locator('[data-mensaje="302"]').innerText(), /Sistema/);
  assert.equal(await hilo.getByRole("textbox", { name: "Mensaje" }).isDisabled(), true);
  assert.equal(await hilo.getByRole("button", { name: "Devolver a IA" }).count(), 0, "invitado con el mismo id pero otro correo: no controla ni devuelve");
  // Vacante con WhatsApp apagado → 409 WA_APAGADO.
  await hilo.getByRole("button", { name: "Enlace de WhatsApp" }).click();
  await page.getByRole("dialog").getByText("WhatsApp no está activado para tu empresa. Pídele a ADAMIA que lo active.").waitFor();
  await page.keyboard.press("Escape");
  // Búsqueda: manda q al API.
  await page.getByRole("searchbox", { name: "Buscar conversación" }).fill("montacargas");
  await page.waitForFunction(() => document.querySelectorAll('[aria-label="Conversaciones"] li').length === 1);
  assert.ok(pedidos.some((x) => x.ruta === "/conversaciones" && /q=montacargas/.test(x.params)));
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  // «Enlaces de vacantes» desde el encabezado: lista, búsqueda, copiar y errores por vacante.
  await page.getByRole("button", { name: "Enlaces de vacantes" }).click();
  const dlgVac = page.getByRole("dialog", { name: "Enlaces de vacantes" });
  const listaVac = dlgVac.getByRole("list", { name: "Vacantes abiertas" });
  await listaVac.waitFor();
  assert.equal(await listaVac.getByRole("listitem").count(), 3);
  assert.ok(pedidos.some((x) => x.ruta === "/vacantes" && /empresa=10/.test(x.params)), "GET /vacantes?empresa=10");
  await dlgVac.getByRole("searchbox", { name: "Buscar vacante" }).fill("chofer");
  assert.equal(await listaVac.getByRole("listitem").count(), 1);
  await dlgVac.getByRole("searchbox", { name: "Buscar vacante" }).fill("");
  const enlacesAntes = cuenta((x) => x.ruta === "/vacantes/55/enlace");
  await dlgVac.getByRole("button", { name: "Copiar enlace de WhatsApp de Operador de montacargas" }).click();
  await dlgVac.getByRole("button", { name: "Copiar enlace de WhatsApp de Operador de montacargas" }).filter({ hasText: "Copiado" }).waitFor();
  assert.equal(cuenta((x) => x.ruta === "/vacantes/55/enlace"), enlacesAntes + 1);
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), ENLACE);
  assert.equal(await dlgVac.getByRole("link", { name: "Abrir enlace de WhatsApp de Operador de montacargas" }).getAttribute("href"), ENLACE);
  // 27/11/2026: «Copiar enlace de la vacante» copia la página pública con su formulario, sin pedir nada al API.
  const enlacesAntesPagina = pedidos.length;
  await dlgVac.getByRole("button", { name: "Copiar enlace de la vacante Operador de montacargas" }).click();
  await dlgVac.getByRole("button", { name: "Copiar enlace de la vacante Operador de montacargas" }).filter({ hasText: "Copiado" }).waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), PAGINA_VACANTE);
  assert.equal(pedidos.slice(enlacesAntesPagina).filter((x) => /enlace/.test(x.ruta)).length, 0, "la página de la vacante no depende del API de WhatsApp");
  // Interruptor de la bolsa: GET al abrir; PUT {publicar_bolsa}; si el PUT falla, vuelve al valor anterior.
  const bolsa = dlgVac.getByRole("switch", { name: "Publicar mis vacantes en la bolsa de trabajo de ADAMIA" });
  await dlgVac.locator('[data-bolsa="no"]').waitFor();
  assert.ok(pedidos.some((x) => x.ruta === "/bolsa" && x.metodo === "GET" && /empresa=10/.test(x.params)), "GET /bolsa?empresa=10");
  assert.equal(await bolsa.getAttribute("aria-checked"), "false");
  assert.match(await dlgVac.innerText(), /Si está apagado, tus vacantes no aparecen en la bolsa, pero puedes compartir sus enlaces donde quieras\./);
  await bolsa.click();
  await dlgVac.getByRole("status").filter({ hasText: "Tus vacantes abiertas ya aparecen en la bolsa de trabajo." }).waitFor();
  assert.equal(await bolsa.getAttribute("aria-checked"), "true");
  const putBolsa = pedidos.filter((x) => x.ruta === "/bolsa" && x.metodo === "PUT");
  assert.deepEqual([putBolsa.length, putBolsa[0].cuerpo, /empresa=10/.test(putBolsa[0].params)], [1, { publicar_bolsa: true }, true]);
  S.bolsaFalla = 1;
  await bolsa.click();
  await dlgVac.getByRole("status").filter({ hasText: "No se pudo guardar la bolsa." }).waitFor();
  assert.equal(await bolsa.getAttribute("aria-checked"), "true", "si falla, vuelve a como estaba");
  assert.equal(S.bolsa[10], true);
  await dlgVac.getByRole("button", { name: "Copiar enlace de WhatsApp de Auxiliar de almacén turno nocturno" }).click();
  await dlgVac.getByRole("alert").filter({ hasText: "WhatsApp no está activado para tu empresa. Pídele a ADAMIA que lo active." }).waitFor();
  await dlgVac.getByRole("button", { name: "Copiar enlace de WhatsApp de Chofer repartidor" }).click();
  await dlgVac.getByRole("alert").filter({ hasText: "todavía no tiene un número de WhatsApp listo" }).waitFor();
  if (OUT) await page.screenshot({ path: OUT + "/10-enlaces-vacantes.png" });
  await page.keyboard.press("Escape");
  await dlgVac.waitFor({ state: "detached" });
  // Cambiar de empresa consulta el estado y la lista de esa empresa y cierra el chat abierto.
  await page.getByLabel("Empresa").filter({ visible: true }).selectOption("11");
  await page.waitForURL(/\/panel\/whatsapp$/);
  for (let i = 0; i < 50 && !pedidos.some((x) => x.ruta === "/conversaciones" && /empresa=11/.test(x.params)); i++) await dormir(100);
  assert.ok(pedidos.some((x) => x.ruta === "/estado" && /empresa=11/.test(x.params)), "estado de la otra empresa");
  await page.locator("[data-entrevistas-mes]").filter({ hasText: /^3 entrevistas este mes$/ }).waitFor();
  assert.ok(pedidos.some((x) => x.ruta === "/conversaciones" && /empresa=11/.test(x.params)), "lista de la otra empresa");
  // Bandeja vacía: invita a compartir el enlace de una vacante.
  await page.getByText("Comparte el enlace de una vacante para recibir mensajes.").waitFor();
  await page.getByRole("button", { name: "Ver enlaces de vacantes" }).click();
  await page.getByRole("dialog", { name: "Enlaces de vacantes" }).getByText("No hay vacantes abiertas.").waitFor();
  assert.ok(pedidos.some((x) => x.ruta === "/vacantes" && /empresa=11/.test(x.params)), "GET /vacantes?empresa=11");
  await page.keyboard.press("Escape");
  await page.close();

  // ——— 9. Teléfono 390 px ———
  const movil = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await movil.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(movil, reclutadora);
  const tel = await movil.newPage();
  tel.on("pageerror", (e) => errores.push(e.message));
  await tel.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await tel.getByRole("list", { name: "Conversaciones" }).waitFor({ timeout: 30000 });
  assert.ok(await sinScrollHorizontal(tel), "lista sin scroll horizontal");
  assert.equal(await tel.getByLabel("Empresa").filter({ visible: true }).count(), 1, "selector de empresa visible en teléfono");
  assert.ok(await tamano(tel.getByRole("button", { name: "Ana Ruiz" })) >= 44);
  if (OUT) await tel.screenshot({ path: OUT + "/04-movil-lista.png" });
  // En teléfono «Enlaces de vacantes» se abre como hoja pegada abajo.
  await tel.getByRole("button", { name: "Enlaces de vacantes" }).tap();
  const hoja = tel.getByRole("dialog", { name: "Enlaces de vacantes" });
  await hoja.getByRole("list", { name: "Vacantes abiertas" }).waitFor();
  await dormir(300);
  const cajaHoja = await hoja.boundingBox();
  assert.ok(Math.abs(cajaHoja.y + cajaHoja.height - 844) <= 2 && cajaHoja.width === 390, `hoja abajo: ${JSON.stringify(cajaHoja)}`);
  assert.ok(await tamano(hoja.getByRole("button", { name: "Copiar enlace de WhatsApp de Chofer repartidor" })) >= 44);
  assert.ok(await tamano(hoja.getByRole("button", { name: "Copiar enlace de la vacante Chofer repartidor" })) >= 44);
  assert.ok(await tamano(hoja.getByRole("switch", { name: "Publicar mis vacantes en la bolsa de trabajo de ADAMIA" })) >= 44);
  assert.ok(await sinScrollHorizontal(tel), "hoja de enlaces sin scroll horizontal");
  if (OUT) await tel.screenshot({ path: OUT + "/11-movil-enlaces-vacantes.png" });
  await hoja.getByRole("button", { name: "Close" }).tap();
  await hoja.waitFor({ state: "detached" });
  await tel.getByRole("button", { name: "Ana Ruiz" }).tap();
  await tel.waitForURL(/\?c=1$/);
  const hiloTel = tel.getByRole("region", { name: "Conversación" });
  await hiloTel.getByText("Hola, vi la vacante de operador.").waitFor();
  assert.equal(await tel.getByRole("list", { name: "Conversaciones" }).isVisible(), false, "el chat ocupa la pantalla");
  const caja = await hiloTel.boundingBox();
  assert.ok(caja.x === 0 && caja.width === 390 && caja.height >= 840, `chat a pantalla completa: ${JSON.stringify(caja)}`);
  const enviarBtn = hiloTel.getByRole("button", { name: "Enviar mensaje" });
  const cajaEnviar = await enviarBtn.boundingBox();
  assert.ok(cajaEnviar.y + cajaEnviar.height <= 844 && cajaEnviar.y > 700, "el cuadro para escribir queda abajo");
  assert.ok(await tamano(enviarBtn) >= 44 && await tamano(hiloTel.getByRole("button", { name: "Volver a la lista" })) >= 44 && await tamano(hiloTel.getByRole("button", { name: "Tomar control" })) >= 40);
  assert.ok(await sinScrollHorizontal(tel), "chat sin scroll horizontal");
  await hiloTel.getByRole("button", { name: "Tomar control" }).tap();
  await hiloTel.getByRole("button", { name: "Devolver a IA" }).waitFor();
  await hiloTel.getByRole("textbox", { name: "Mensaje" }).fill("Desde el teléfono");
  if (OUT) await tel.screenshot({ path: OUT + "/05-movil-chat.png" });
  await hiloTel.getByRole("button", { name: "Volver a la lista" }).tap();
  await tel.waitForURL(/\/panel\/whatsapp$/);
  await tel.getByRole("list", { name: "Conversaciones" }).waitFor({ state: "visible" });
  assert.equal(await tel.getByRole("region", { name: "Conversación" }).count(), 0);

  // ——— 10. WhatsApp apagado para la empresa ———
  S.modo = "apagado";
  await tel.reload({ waitUntil: "domcontentloaded" });
  await tel.getByRole("heading", { name: "WhatsApp aún no está activo para tu empresa" }).waitFor({ timeout: 30000 });
  assert.match(await tel.locator('[data-estado-wa="apagado"]').innerText(), /Pídele a ADAMIA que lo active/);
  assert.equal(await tel.getByRole("list", { name: "Conversaciones" }).count(), 0);
  if (OUT) await tel.screenshot({ path: OUT + "/06-movil-apagado.png" });
  // 27/11/2026: con WhatsApp apagado «Enlaces de vacantes» sigue: bolsa y página de la vacante funcionan; WhatsApp avisa.
  await tel.getByRole("button", { name: "Enlaces de vacantes" }).tap();
  const hojaApagada = tel.getByRole("dialog", { name: "Enlaces de vacantes" });
  await hojaApagada.getByRole("list", { name: "Vacantes abiertas" }).waitFor();
  assert.match(await hojaApagada.innerText(), /Los enlaces de WhatsApp funcionan cuando ADAMIA active WhatsApp para tu empresa\./);
  const bolsaApagada = hojaApagada.getByRole("switch", { name: "Publicar mis vacantes en la bolsa de trabajo de ADAMIA" });
  await hojaApagada.locator('[data-bolsa="si"]').waitFor();
  await bolsaApagada.tap();
  await hojaApagada.getByRole("status").filter({ hasText: "Tus vacantes ya no aparecen en la bolsa de trabajo." }).waitFor();
  assert.deepEqual(pedidos.filter((x) => x.ruta === "/bolsa" && x.metodo === "PUT").at(-1).cuerpo, { publicar_bolsa: false });
  assert.equal(S.bolsa[10], false);
  await hojaApagada.getByRole("button", { name: "Copiar enlace de WhatsApp de Chofer repartidor" }).tap();
  await hojaApagada.getByRole("alert").filter({ hasText: "WhatsApp no está activado para tu empresa. Pídele a ADAMIA que lo active." }).waitFor();
  await movil.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  await hojaApagada.getByRole("button", { name: "Copiar enlace de la vacante Chofer repartidor" }).tap();
  await hojaApagada.getByRole("button", { name: "Copiar enlace de la vacante Chofer repartidor" }).filter({ hasText: "Copiado" }).waitFor();
  assert.equal(await tel.evaluate(() => navigator.clipboard.readText()), "https://dev.adamia.com.mx/vacante/chofer-repartidor");
  assert.ok(await sinScrollHorizontal(tel), "hoja con WhatsApp apagado sin scroll horizontal");
  if (OUT) await tel.screenshot({ path: OUT + "/12-movil-apagado-enlaces.png" });
  await hojaApagada.getByRole("button", { name: "Close" }).tap();
  S.modo = "compartido";
  await movil.close();

  // ——— 11. Administración por empresa ———
  const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctxAdmin.addCookies([{ name: "token", value: firmar("Admin"), url: base }]);
  await instalarMocks(ctxAdmin, admin);
  const adm = await ctxAdmin.newPage();
  adm.on("pageerror", (e) => errores.push(e.message));
  await adm.goto(base + "/dashboard/whatsapp", { waitUntil: "domcontentloaded" });
  await adm.getByRole("heading", { name: "WhatsApp (reclutamiento)" }).waitFor({ timeout: 30000 });
  await adm.getByRole("cell", { name: "Transportes Sur", exact: true }).waitFor();
  assert.equal(await adm.getByRole("button", { name: "WhatsApp (reclutamiento)" }).count(), 1, "entrada en el menú de administración");
  assert.match(await adm.getByRole("row").filter({ hasText: "Transportes Sur" }).innerText(), /Número propio[\s\S]*\+52 33 1234 5678[\s\S]*acc_sur[\s\S]*\$499\.00[\s\S]*\$1\.00[\s\S]*212 \/ 200[\s\S]*12[\s\S]*\$511\.00[\s\S]*87/);
  assert.match(await adm.getByRole("row").filter({ hasText: "Uniline Norte" }).innerText(), /0 \/ sin paquete/);
  assert.ok(await sinScrollHorizontal(adm), "administración sin scroll horizontal de la página en escritorio");
  const cajaEditar = await adm.getByRole("button", { name: "Editar WhatsApp de Uniline Norte" }).boundingBox();
  assert.ok(cajaEditar && cajaEditar.x + cajaEditar.width <= 1440, `la tabla cabe en 1440 px (Editar visible): ${JSON.stringify(cajaEditar)}`);
  for (const t of ["Paquete mensual", "Por entrevista extra", "Entrevistas este mes / incluidas", "Extra", "Importe estimado del mes"]) {
    assert.equal(await adm.getByRole("columnheader", { name: t, exact: true }).count(), 1, `columna «${t}»`);
  }
  assert.match(await adm.getByRole("region", { name: "Resumen" }).innerText(), /Entrevistas este mes[\s\S]*221[\s\S]*Importe estimado del mes[\s\S]*\$511\.00/);
  await adm.getByRole("searchbox", { name: "Buscar empresa" }).fill("norte");
  assert.equal(await adm.getByRole("row").count(), 2, "encabezado + 1 empresa");
  if (OUT) await adm.screenshot({ path: OUT + "/07-admin-escritorio.png" });
  await adm.getByRole("button", { name: "Editar WhatsApp de Uniline Norte" }).click();
  const dlg = adm.getByRole("dialog", { name: "WhatsApp de Uniline Norte" });
  await dlg.getByLabel("Modo").selectOption("propio");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await dlg.getByText("Con número propio, escribe el ID de la cuenta de Zernio.").waitFor();
  assert.match(await dlg.innerText(), /Con número propio, escribe el número de WhatsApp\./);
  assert.equal(cuenta((x) => x.metodo === "PUT" && x.ruta.startsWith("/admin/")), 0, "no manda si falta lo obligatorio");
  await dlg.getByLabel("ID de cuenta de Zernio").fill("acc_sur");
  await dlg.getByLabel("Número de WhatsApp").fill("+52 81 5555 0000");
  await dlg.getByLabel("Precio por entrevista extra (MXN)").fill("1.25");
  await dlg.getByLabel("Precio del paquete (mensual, MXN)").fill("$1,200");
  await dlg.getByLabel("Entrevistas incluidas al mes").fill("2.5");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await dlg.getByText("Escribe un número entero de 0 a 100,000, o déjalo vacío si no tiene paquete.").waitFor();
  assert.equal(cuenta((x) => x.metodo === "PUT" && x.ruta.startsWith("/admin/")), 0, "entrevistas incluidas inválidas: no manda");
  await dlg.getByLabel("Entrevistas incluidas al mes").fill("200");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await dlg.getByRole("alert").filter({ hasText: "Esa cuenta de Zernio ya la usa otra empresa." }).waitFor();
  if (OUT) await adm.screenshot({ path: OUT + "/08-admin-dialogo.png" });
  await dlg.getByLabel("ID de cuenta de Zernio").fill("acc_norte");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await dlg.waitFor({ state: "detached" });
  const puts = pedidos.filter((x) => x.metodo === "PUT" && x.ruta.startsWith("/admin/"));
  assert.equal(puts.length, 2);
  assert.equal(puts[1].ruta, "/admin/empresas/11");
  assert.deepEqual(puts[1].cuerpo, { modo: "propio", zernio_account_id: "acc_norte", numero_whatsapp: "528155550000", precio_conversacion: 1.25, precio_mensual: 1200, entrevistas_incluidas: 200 });
  await adm.getByRole("row").filter({ hasText: "Uniline Norte" }).getByText("acc_norte").waitFor();
  await adm.setViewportSize({ width: 390, height: 844 });
  await adm.getByRole("searchbox", { name: "Buscar empresa" }).fill("");
  assert.ok(await sinScrollHorizontal(adm), "administración sin scroll horizontal en teléfono");
  if (OUT) await adm.screenshot({ path: OUT + "/09-admin-movil.png", fullPage: true });
  await ctxAdmin.close();

  // ═══════════ R2 · Agente entrevistador ═══════════
  const ctxR2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctxR2.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctxR2, reclutadora);
  const r2 = await ctxR2.newPage();
  r2.on("pageerror", (e) => errores.push(e.message));
  await r2.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await r2.getByRole("list", { name: "Conversaciones" }).waitFor({ timeout: 30000 });
  await r2.getByRole("button", { name: "Ana Ruiz" }).click();
  const hiloR2 = r2.getByRole("region", { name: "Conversación" });
  await hiloR2.locator('[data-mensaje="102"]').waitFor();
  assert.match(await hiloR2.locator('[data-mensaje="102"]').innerText(), /^Asistente IA/, "sin nombre configurado: «Asistente IA»");
  assert.ok(pedidos.some((x) => x.ruta === "/agente" && x.metodo === "GET" && /empresa=10/.test(x.params)), "GET /agente?empresa=10");
  assert.match(await r2.getByRole("complementary", { name: "Candidato" }).innerText(), /aún no entrevista a este candidato/);

  // ——— 12. Configurar agente: validación, 400 del API y PUT ———
  await r2.getByRole("button", { name: "Agente", exact: true }).click();
  const dlgAg = r2.getByRole("dialog", { name: "Configurar agente" });
  await dlgAg.getByRole("switch", { name: "Agente encendido" }).waitFor();
  assert.match(await dlgAg.innerText(), /El agente usa tu aviso de privacidad de ADAMIA y nunca pide CURP, datos bancarios ni dinero\./);
  assert.match(await dlgAg.innerText(), /Escribe lo que el agente puede contestar: horarios, prestaciones, dirección…/);
  await dlgAg.getByRole("switch", { name: "Agente encendido" }).click();
  assert.equal(await dlgAg.getByRole("switch", { name: "Agente encendido" }).getAttribute("aria-checked"), "true");
  assert.equal(await dlgAg.getByRole("switch", { name: "Siempre disponible" }).getAttribute("aria-checked"), "true", "horario_json null = siempre disponible");
  assert.equal(await dlgAg.getByLabel("Lunes: desde").count(), 0);
  const avisoLink = dlgAg.locator("[data-aviso-privacidad]");
  assert.match(await avisoLink.innerText(), /El agente enlaza tu aviso de privacidad: https:\/\/dev\.adamia\.com\.mx\/aviso-de-privacidad\/uniline/);
  assert.equal(await avisoLink.getByRole("link").getAttribute("href"), AVISO);
  await dlgAg.getByRole("switch", { name: "Siempre disponible" }).click();
  await dlgAg.getByRole("button", { name: "Guardar" }).click();
  await dlgAg.getByText("Escribe cómo se presenta el asistente").waitFor();
  await r2.waitForFunction(() => document.activeElement?.getAttribute("aria-invalid") === "true");
  assert.equal(await dlgAg.getByLabel("Nombre del asistente").evaluate((el) => el === document.activeElement), true, "el foco va al primer campo con error");
  assert.match(await dlgAg.innerText(), /Escribe lo que contesta el agente fuera de horario\./);
  assert.equal(cuenta((x) => x.ruta === "/agente" && x.metodo === "PUT"), 0, "no manda con errores");
  await dlgAg.getByLabel("Nombre del asistente").fill("Sofía");
  await dlgAg.getByLabel("Lunes: desde").fill("08:00");
  await dlgAg.getByLabel("Lunes: hasta").fill("14:00");
  await dlgAg.getByRole("button", { name: "Copiar lunes a todos" }).click();
  assert.equal(await dlgAg.getByLabel("Sábado: desde").inputValue(), "08:00", "copiar lunes enciende y copia el sábado");
  await dlgAg.getByRole("switch", { name: "Domingo" }).click();
  assert.equal(await dlgAg.getByLabel("Domingo: desde").count(), 0);
  await dlgAg.getByLabel("Viernes: hasta").fill("07:00");
  await dlgAg.getByLabel("Mensaje fuera de horario").fill("¡Gracias por escribir! Te respondemos mañana a partir de las 8:00.");
  await dlgAg.getByRole("button", { name: "Guardar" }).click();
  await dlgAg.getByText("Viernes: la hora de fin debe ser después de la de inicio.").waitFor();
  await r2.waitForFunction(() => document.activeElement?.getAttribute("aria-invalid") === "true");
  await dlgAg.getByLabel("Viernes: hasta").fill("14:00");
  await dlgAg.getByLabel("Respuestas frecuentes").fill("Pagamos $9,500 a la quincena.\nLa planta está en Av. Industrial 120, Apodaca.");
  const palabras = dlgAg.getByLabel("Palabras para pasar a una persona");
  await palabras.fill("humano, asesor");
  await palabras.press("Enter");
  await palabras.fill("Humano");
  await palabras.press("Enter");
  await palabras.fill("hablar con alguien");
  await dlgAg.getByRole("button", { name: "Agregar", exact: true }).click();
  await dlgAg.getByRole("button", { name: "Quitar «asesor»" }).click();
  assert.deepEqual(await dlgAg.getByRole("list", { name: "Palabras agregadas" }).getByRole("listitem").allInnerTexts(), ["humano", "hablar con alguien"]);
  S.errores400.push("El nombre del asistente no puede llevar enlaces.");
  await dlgAg.getByRole("button", { name: "Guardar" }).click();
  await dlgAg.getByRole("alert").filter({ hasText: "El nombre del asistente no puede llevar enlaces." }).waitFor();
  await dlgAg.getByRole("button", { name: "Guardar" }).click();
  await dlgAg.waitFor({ state: "detached" });
  const putsAgente = pedidos.filter((x) => x.ruta === "/agente" && x.metodo === "PUT");
  assert.equal(putsAgente.length, 2);
  assert.match(putsAgente[1].params, /empresa=10/);
  const franja = { desde: "08:00", hasta: "14:00" };
  assert.deepEqual(putsAgente[1].cuerpo, {
    activo: true, nombre_asistente: "Sofía",
    horario_json: { lun: franja, mar: franja, mie: franja, jue: franja, vie: franja, sab: franja, dom: null },
    mensaje_fuera_horario: "¡Gracias por escribir! Te respondemos mañana a partir de las 8:00.",
    respuestas_frecuentes: "Pagamos $9,500 a la quincena.\nLa planta está en Av. Industrial 120, Apodaca.",
    palabras_humano: "humano, hablar con alguien",
  });
  await hiloR2.locator('[data-mensaje="102"]').getByText("Sofía", { exact: true }).waitFor();
  // Cambios sin guardar: cerrar pide confirmación y no se pierden por un toque accidental.
  await r2.getByRole("button", { name: "Agente", exact: true }).click();
  assert.equal(await dlgAg.getByLabel("Nombre del asistente").inputValue(), "Sofía", "se recarga lo guardado");
  await dlgAg.getByLabel("Nombre del asistente").fill("Sofía de Uniline");
  await r2.keyboard.press("Escape");
  await dlgAg.getByRole("alertdialog", { name: "Cambios sin guardar" }).waitFor();
  await dlgAg.getByRole("button", { name: "Descartar cambios" }).click();
  await dlgAg.waitFor({ state: "detached" });
  assert.equal(cuenta((x) => x.ruta === "/agente" && x.metodo === "PUT"), 2);
  if (OUT) await r2.screenshot({ path: OUT + "/r2-01-chat-agente-sofia.png" });

  // ——— 13. Preguntas de la entrevista por vacante ———
  await r2.getByRole("button", { name: "Enlaces de vacantes" }).click();
  const dlgV = r2.getByRole("dialog", { name: "Enlaces de vacantes" });
  await dlgV.locator('[data-conteo-preguntas="55"]').getByText("1 pregunta").waitFor();
  await dlgV.locator('[data-conteo-preguntas="56"]').getByText("Sin entrevista").waitFor();
  assert.ok(pedidos.some((x) => x.ruta === "/vacantes/55/preguntas" && x.metodo === "GET"), "conteo perezoso con GET de preguntas");
  await dlgV.getByRole("button", { name: "Entrevista de Operador de montacargas" }).click();
  const ed = r2.getByRole("dialog", { name: "Entrevista por WhatsApp" });
  await ed.getByRole("region", { name: "Pregunta 1" }).waitFor();
  assert.equal(await ed.locator("[data-vista-previa]").first().innerText(), "Ej.: ¿Tienes licencia tipo C? → No descarta");
  await ed.getByRole("button", { name: "Agregar pregunta (1/8)" }).click();
  await ed.getByRole("button", { name: "Guardar entrevista" }).click();
  await ed.getByRole("region", { name: "Pregunta 2" }).getByText("Escribe la pregunta.").waitFor();
  await r2.waitForFunction(() => document.activeElement?.getAttribute("aria-invalid") === "true");
  assert.equal(await ed.getByRole("textbox", { name: "Texto de la pregunta 2" }).evaluate((el) => el === document.activeElement), true, "el foco va al primer error");
  assert.equal(cuenta((x) => x.ruta === "/vacantes/55/preguntas" && x.metodo === "PUT"), 0);
  const p2 = ed.getByRole("region", { name: "Pregunta 2" });
  await p2.getByRole("textbox", { name: "Texto de la pregunta 2" }).fill("¿Cuántos años tienes?");
  await p2.getByRole("combobox", { name: "Tipo de respuesta de la pregunta 2" }).selectOption("numero");
  // «numero»: rango ACEPTADO; fuera de él descarta o alerta.
  assert.match(await p2.getByRole("group", { name: "Respuestas que descartan" }).innerText(), /Rango aceptado:\s*de[\s\S]*a[\s\S]*Fuera de este rango descarta/);
  await p2.getByRole("group", { name: "Respuestas que descartan" }).getByRole("textbox", { name: "Mínimo" }).fill("18");
  await p2.getByRole("group", { name: "Respuestas que descartan" }).getByRole("textbox", { name: "Máximo" }).fill("17");
  await p2.getByRole("group", { name: "Respuestas que alertan" }).getByRole("textbox", { name: "Máximo" }).fill("55");
  await ed.getByRole("button", { name: "Guardar entrevista" }).click();
  await p2.getByText("el mínimo no puede ser mayor que el máximo").waitFor();
  const minDesc = p2.getByRole("group", { name: "Respuestas que descartan" }).getByRole("textbox", { name: "Mínimo" });
  await r2.waitForFunction(() => document.activeElement?.getAttribute("aria-invalid") === "true");
  assert.equal(await minDesc.evaluate((el) => el === document.activeElement), true, "el foco va al primer campo con error");
  await p2.getByRole("group", { name: "Respuestas que descartan" }).getByRole("textbox", { name: "Máximo" }).fill("");
  await p2.locator("[data-vista-previa]").getByText("Ej.: ¿Cuántos años tienes? → menos de 18 descarta · más de 55 alerta", { exact: true }).waitFor({ timeout: 3000 });
  // Pregunta de opciones: una respuesta no puede descartar y alertar a la vez.
  await ed.getByRole("button", { name: "Agregar pregunta (2/8)" }).click();
  const p3 = ed.getByRole("region", { name: "Pregunta 3" });
  await p3.getByRole("textbox", { name: "Texto de la pregunta 3" }).fill("¿Qué turno prefieres?");
  await p3.getByRole("combobox", { name: "Tipo de respuesta de la pregunta 3" }).selectOption("opciones");
  await p3.getByRole("textbox", { name: "Opción 1" }).fill("Matutino");
  await p3.getByRole("textbox", { name: "Opción 2" }).fill("Nocturno");
  await p3.getByRole("button", { name: "Agregar opción" }).click();
  await p3.getByRole("textbox", { name: "Opción 3" }).fill("Mixto");
  await p3.getByRole("group", { name: "Respuestas que alertan" }).getByRole("checkbox", { name: "Nocturno" }).check();
  await p3.getByRole("group", { name: "Respuestas que descartan" }).getByRole("checkbox", { name: "Nocturno" }).check();
  assert.equal(await p3.getByRole("group", { name: "Respuestas que alertan" }).getByRole("checkbox", { name: "Nocturno" }).isChecked(), false, "descartar quita la alerta");
  await p3.getByRole("group", { name: "Respuestas que alertan" }).getByRole("checkbox", { name: "Mixto" }).check();
  assert.equal(await p3.locator("[data-vista-previa]").innerText(), "Ej.: ¿Qué turno prefieres? → Nocturno descarta · Mixto alerta");
  // Reordenar con botones: la edad sube al primer lugar y el foco sigue al botón.
  await ed.getByRole("button", { name: "Subir pregunta 2" }).click();
  assert.equal(await ed.getByRole("textbox", { name: "Texto de la pregunta 1" }).inputValue(), "¿Cuántos años tienes?");
  assert.equal(await ed.getByRole("button", { name: "Bajar pregunta 1" }).evaluate((el) => el === document.activeElement), true, "foco en el botón que sigue disponible");
  assert.equal(await ed.getByRole("button", { name: "Subir pregunta 1" }).isDisabled(), true);
  await ed.getByRole("button", { name: "Guardar entrevista" }).click();
  await ed.waitFor({ state: "detached" });
  const putP = pedidos.filter((x) => x.ruta === "/vacantes/55/preguntas" && x.metodo === "PUT");
  assert.equal(putP.length, 1);
  assert.deepEqual(putP[0].cuerpo, { preguntas: [
    { orden: 1, texto: "¿Cuántos años tienes?", tipo: "numero", opciones: null, descartan: { min: 18 }, alertan: { max: 55 }, activa: true },
    { id: 1, orden: 2, texto: "¿Tienes licencia tipo C?", tipo: "si_no", opciones: ["Sí", "No"], descartan: ["No"], alertan: [], activa: true },
    { orden: 3, texto: "¿Qué turno prefieres?", tipo: "opciones", opciones: ["Matutino", "Nocturno", "Mixto"], descartan: ["Nocturno"], alertan: ["Mixto"], activa: true },
  ] });
  await dlgV.locator('[data-conteo-preguntas="55"]').getByText("3 preguntas").waitFor();
  // Máximo 8, error 400 del API y salida con cambios sin guardar.
  await dlgV.getByRole("button", { name: "Entrevista de Auxiliar de almacén turno nocturno" }).click();
  await ed.getByText("Esta vacante aún no tiene entrevista").waitFor();
  for (let i = 0; i < 8; i++) await ed.getByRole("button", { name: `Agregar pregunta (${i}/8)` }).click();
  assert.equal(await ed.getByRole("button", { name: "Agregar pregunta (8/8)" }).isDisabled(), true, "máximo 8 preguntas");
  for (let i = 8; i >= 2; i--) await ed.getByRole("button", { name: `Quitar pregunta ${i}` }).click();
  await ed.getByRole("textbox", { name: "Texto de la pregunta 1" }).fill("¿Vives cerca de Apodaca?");
  if (OUT) await r2.screenshot({ path: OUT + "/r2-02-editor-entrevista.png" });
  S.errores400.push("La vacante ya no está abierta.");
  await ed.getByRole("button", { name: "Guardar entrevista" }).click();
  await ed.getByRole("alert").filter({ hasText: "La vacante ya no está abierta." }).waitFor();
  await ed.getByRole("button", { name: "Cancelar" }).click();
  await ed.getByRole("button", { name: "Descartar cambios" }).click();
  await ed.waitFor({ state: "detached" });
  assert.equal(await dlgV.isVisible(), true, "vuelve a la lista de vacantes");
  await dlgV.locator('[data-conteo-preguntas="56"]').getByText("Sin entrevista").waitFor();
  await r2.keyboard.press("Escape");
  await dlgV.waitFor({ state: "detached" });

  // ——— 14. Filtros por calificación y atención ———
  const listaR2 = r2.getByRole("list", { name: "Conversaciones" });
  const carlos = r2.getByRole("button", { name: /^Carlos Méndez/ });
  assert.match(await carlos.getAttribute("aria-label"), /No califica, requiere atención: Pidió hablar con una persona$/);
  assert.equal(await carlos.locator('[data-atencion="3"]').getAttribute("title"), "Pidió hablar con una persona");
  assert.equal(await carlos.locator('[data-calificacion="no_califica"]').innerText(), "No califica");
  const filtros = r2.getByRole("group", { name: "Filtrar conversaciones" });
  assert.deepEqual(await filtros.getByRole("button").allInnerTexts(), ["Todos", "Requiere atención", "Califica", "Con alerta", "No califica", "Incompleto"]);
  await filtros.getByRole("button", { name: "Requiere atención" }).click();
  await r2.waitForFunction(() => document.querySelectorAll('[aria-label="Conversaciones"] li').length === 1);
  assert.equal(await filtros.getByRole("button", { name: "Requiere atención" }).getAttribute("aria-pressed"), "true");
  assert.ok(pedidos.some((x) => x.ruta === "/conversaciones" && /pagina=1&limite=30&atencion=1/.test(x.params)), "atencion=1 desde la página 1");
  await filtros.getByRole("button", { name: "Califica", exact: true }).click();
  await r2.waitForFunction(() => document.querySelectorAll('[aria-label="Conversaciones"] li').length === 10);
  assert.equal(await r2.getByRole("button", { name: "Ver más conversaciones" }).count(), 0, "10 resultados: sin «Ver más»");
  await filtros.getByRole("button", { name: "No califica" }).click();
  await r2.waitForFunction(() => document.querySelectorAll('[aria-label="Conversaciones"] li').length === 1);
  assert.ok(pedidos.some((x) => x.ruta === "/conversaciones" && /pagina=1&limite=30&calificacion=no_califica/.test(x.params)));
  await filtros.getByRole("button", { name: "Con alerta" }).click();
  await listaR2.waitFor({ state: "detached" });
  await r2.getByText("No hay conversaciones en «Con alerta».").waitFor();
  await r2.getByRole("button", { name: "Ver todas" }).click();
  await r2.waitForFunction(() => document.querySelectorAll('[aria-label="Conversaciones"] li').length === 30);
  assert.equal(await filtros.getByRole("button", { name: "Todos" }).getAttribute("aria-pressed"), "true");

  // ——— 15. Evaluación del candidato y «Marcar como atendido» ———
  await carlos.click();
  await hiloR2.getByText("Te esperamos el lunes").first().waitFor();
  const panelC = r2.getByRole("complementary", { name: "Candidato" });
  await panelC.getByRole("list", { name: "Respuestas del candidato" }).waitFor();
  assert.equal(await hiloR2.getByRole("button", { name: "Ver evaluación" }).isVisible(), false, "≥1280: columna fija, sin botón");
  const textoPanel = await panelC.innerText();
  assert.match(textoPanel, /No califica[\s\S]*Pasó a una persona[\s\S]*Carlos Méndez Ortega[\s\S]*Aceptó el aviso de privacidad/);
  assert.match(textoPanel, /Requiere atención[\s\S]*Pidió hablar con una persona[\s\S]*no cuenta con licencia tipo C/);
  assert.deepEqual(await panelC.getByRole("list", { name: "Puntajes" }).getByRole("img").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label"))),
    ["Comunicación: 4 de 5", "Actitud: 5 de 5", "Experiencia: 3 de 5", "Confiabilidad: 2 de 5", "Disponibilidad: 1 de 5"]);
  assert.deepEqual(await panelC.locator("[data-severidad]").evaluateAll((els) => els.map((e) => `${e.dataset.severidad}:${e.textContent}`)), [
    "ok:✓¿Cuántos años tienes?34Sin problema",
    "alerta:⚠¿Puedes trabajar en turno nocturno?Solo algunos díasAlerta",
    "descarta:✕¿Tienes licencia tipo C?NoDescarta",
  ]);
  assert.match(await panelC.getByRole("list", { name: "Preguntas sin respuesta" }).innerText(), /¿Dan transporte de personal en la noche\?/);
  if (OUT) await r2.screenshot({ path: OUT + "/r2-03-evaluacion-escritorio.png" });
  await panelC.getByRole("button", { name: "Marcar como atendido" }).click();
  await panelC.getByRole("button", { name: "Marcar como atendido" }).waitFor({ state: "detached" });
  assert.equal(cuenta((x) => x.metodo === "POST" && x.ruta === "/conversaciones/3/atendido"), 1);
  await r2.locator('[data-atencion="3"]').waitFor({ state: "detached", timeout: 7000 });
  assert.ok(!pedidos.some((x) => x.ruta === "/conversaciones" && /calificacion=(?!califica|no_califica|con_alerta|incompleto)/.test(x.params)), "solo calificaciones válidas");
  await r2.getByRole("button", { name: /^\+52 442 123 4567/ }).click();
  await panelC.locator("[data-pregunta-actual]").getByText("¿Tienes licencia tipo C?").waitFor();
  assert.match(await panelC.innerText(), /Incompleto[\s\S]*Respondiendo preguntas[\s\S]*Pregunta en curso: ¿Tienes licencia tipo C\?/);
  await carlos.click();
  await hiloR2.getByText("Te esperamos el lunes").first().waitFor();
  // Bajo 1280 px: «Ver evaluación» abre la hoja.
  await r2.setViewportSize({ width: 1100, height: 900 });
  assert.equal(await panelC.isVisible(), false);
  await hiloR2.getByRole("button", { name: "Ver evaluación" }).click();
  const hojaEv = r2.getByRole("dialog", { name: "Evaluación del candidato" });
  await hojaEv.getByRole("list", { name: "Respuestas del candidato" }).waitFor();
  await r2.keyboard.press("Escape");
  await hojaEv.waitFor({ state: "detached" });
  await ctxR2.close();

  // ——— 16. R2 en teléfono 390 px ———
  S.entrevistas[3].requiere_atencion = true;
  S.entrevistas[3].motivo_atencion = "Pidió hablar con una persona";
  const movR2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await movR2.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(movR2, reclutadora);
  const t2 = await movR2.newPage();
  t2.on("pageerror", (e) => errores.push(e.message));
  await t2.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await t2.getByRole("list", { name: "Conversaciones" }).waitFor({ timeout: 30000 });
  const filtrosT = t2.getByRole("group", { name: "Filtrar conversaciones" });
  for (const nombre of ["Todos", "Requiere atención", "Incompleto"]) assert.ok(await tamano(filtrosT.getByRole("button", { name: nombre, exact: true })) >= 44, `chip ${nombre} ≥44 px`);
  assert.ok(await tamano(t2.getByRole("button", { name: "Agente", exact: true })) >= 44);
  assert.ok(await sinScrollHorizontal(t2), "lista con filtros sin scroll horizontal");
  if (OUT) await t2.screenshot({ path: OUT + "/r2-04-movil-lista-filtros.png" });
  // Agente a pantalla completa.
  await t2.getByRole("button", { name: "Agente", exact: true }).tap();
  const agT = t2.getByRole("dialog", { name: "Configurar agente" });
  await agT.getByRole("switch", { name: "Agente encendido" }).waitFor();
  await dormir(300);
  const cajaAg = await agT.boundingBox();
  assert.ok(cajaAg.x === 0 && cajaAg.width === 390 && cajaAg.height >= 840, `agente a pantalla completa: ${JSON.stringify(cajaAg)}`);
  for (const sw of ["Agente encendido", "Siempre disponible", "Lunes", "Domingo"]) assert.ok(await tamano(agT.getByRole("switch", { name: sw })) >= 44, `switch ${sw} ≥44 px`);
  assert.ok(await tamano(agT.getByRole("button", { name: "Guardar" })) >= 44 && await tamano(agT.getByRole("button", { name: "Close" })) >= 44);
  assert.ok(await tamano(agT.getByRole("button", { name: "Quitar «humano»" })) >= 44);
  assert.ok(await sinScrollHorizontal(t2) && await agT.evaluate((el) => [...el.querySelectorAll("*")].every((n) => n.getBoundingClientRect().right <= 391)), "agente sin desborde horizontal");
  if (OUT) await t2.screenshot({ path: OUT + "/r2-05-movil-agente.png" });
  await agT.getByRole("button", { name: "Cancelar" }).tap();
  await agT.waitFor({ state: "detached" });
  // Editor de entrevista a pantalla completa.
  await t2.getByRole("button", { name: "Enlaces de vacantes" }).tap();
  await t2.getByRole("button", { name: "Entrevista de Operador de montacargas" }).tap();
  const edT = t2.getByRole("dialog", { name: "Entrevista por WhatsApp" });
  await edT.getByRole("region", { name: "Pregunta 3" }).waitFor();
  await dormir(300);
  const cajaEd = await edT.boundingBox();
  assert.ok(cajaEd.x === 0 && cajaEd.width === 390 && cajaEd.height >= 840, `editor a pantalla completa: ${JSON.stringify(cajaEd)}`);
  const p3T = edT.getByRole("region", { name: "Pregunta 3" });
  for (const b of [edT.getByRole("button", { name: "Subir pregunta 2" }), edT.getByRole("button", { name: "Quitar pregunta 2" }), p3T.getByRole("button", { name: "Quitar opción 1" }),
    p3T.getByRole("group", { name: "Respuestas que descartan" }).locator("label").first(), edT.getByRole("button", { name: "Guardar entrevista" })]) assert.ok(await tamano(b) >= 44, "objetivo táctil ≥44 px en el editor");
  assert.ok(await edT.evaluate((el) => [...el.querySelectorAll("*")].every((n) => n.getBoundingClientRect().right <= 391)), "editor sin desborde horizontal");
  if (OUT) await t2.screenshot({ path: OUT + "/r2-06-movil-editor.png" });
  await edT.getByRole("button", { name: "Cancelar" }).tap();
  await edT.waitFor({ state: "detached" });
  await t2.getByRole("dialog", { name: "Enlaces de vacantes" }).getByRole("button", { name: "Close" }).tap();
  // Chat y evaluación en hoja.
  await t2.getByRole("button", { name: /^Carlos Méndez/ }).tap();
  const hiloT = t2.getByRole("region", { name: "Conversación" });
  await hiloT.getByText("Te esperamos el lunes").first().waitFor();
  assert.ok(await tamano(hiloT.getByRole("button", { name: /Ver evaluación/ })) >= 40);
  await hiloT.getByRole("button", { name: /Ver evaluación/ }).tap();
  const evT = t2.getByRole("dialog", { name: "Evaluación del candidato" });
  await evT.getByRole("list", { name: "Respuestas del candidato" }).waitFor();
  await dormir(300); // termina la animación de entrada (zoom 95 %)
  const cajaEv = await evT.boundingBox();
  assert.ok(cajaEv.x === 0 && cajaEv.width === 390 && cajaEv.height >= 840, `evaluación a pantalla completa: ${JSON.stringify(cajaEv)}`);
  assert.ok(await tamano(evT.getByRole("button", { name: "Marcar como atendido" })) >= 44);
  assert.ok(await evT.evaluate((el) => [...el.querySelectorAll("*")].every((n) => n.getBoundingClientRect().right <= 391)), "evaluación sin desborde horizontal");
  if (OUT) await t2.screenshot({ path: OUT + "/r2-07-movil-evaluacion.png" });
  await evT.getByRole("button", { name: "Close" }).tap();
  await evT.waitFor({ state: "detached" });
  assert.ok(await sinScrollHorizontal(t2));
  await movR2.close();

  // ═══════════ 27/11/2026 · Paquete con extras y bolsa de trabajo pública ═══════════
  S.paquetes[10] = { entrevistas_mes: 212, entrevistas_incluidas: 200, entrevistas_extra: 12 };
  const ctxP = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctxP.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctxP, reclutadora);
  const pq = await ctxP.newPage();
  pq.on("pageerror", (e) => errores.push(e.message));
  await pq.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await pq.locator("[data-aviso-extras]").waitFor({ timeout: 30000 });
  assert.equal(await pq.locator("[data-aviso-extras]").innerText(), "Llevas 12 entrevistas extra este mes. Cada una se cobra aparte.");
  assert.equal(await pq.locator("[data-entrevistas-mes]").innerText(), "212 de 200 entrevistas este mes");
  if (OUT) await pq.screenshot({ path: OUT + "/13-paquete-extras.png" });
  await pq.close();

  // Bolsa pública: /vacantes/filter igual que siempre; la tira de empresas pide ?bolsa=1 (nunca la lista global).
  const pub = await ctxP.newPage();
  pub.on("pageerror", (e) => errores.push(e.message));
  await pub.goto(base + "/bolsa-de-trabajo", { waitUntil: "domcontentloaded" });
  await pub.getByRole("heading", { name: /Empresas que están contratando/ }).waitFor({ timeout: 30000 });
  await pub.getByText("Operador de montacargas").first().waitFor();
  assert.ok(publicos.some((x) => x.ruta === "/vacantes/filter" && /page=1&limit=10/.test(x.params)), "GET /vacantes/filter sin cambios");
  assert.ok(publicos.some((x) => x.ruta === "/empresas/activas" && x.params === "?bolsa=1&limit=4&page=1"), "la tira pide ?bolsa=1");
  assert.equal(publicos.filter((x) => x.ruta === "/empresas/activas" && !/bolsa=1/.test(x.params)).length, 0, "la bolsa no pide la lista global");
  if (OUT) await pub.screenshot({ path: OUT + "/14-bolsa-publica.png" });
  // Sin empresas publicadas no se muestra una tira vacía.
  S.publico.empresas = [];
  const tirasAntes = publicos.filter((x) => x.ruta === "/empresas/activas").length;
  await pub.reload({ waitUntil: "domcontentloaded" });
  for (let i = 0; i < 100 && publicos.filter((x) => x.ruta === "/empresas/activas").length === tirasAntes; i++) await dormir(100);
  await pub.getByText("Operador de montacargas").first().waitFor();
  await dormir(500);
  assert.equal(await pub.getByRole("heading", { name: /Empresas que están contratando/ }).count(), 0, "sin empresas, sin tira");
  await ctxP.close();

  assert.deepEqual(errores, [], "sin errores de JavaScript");
  exito = true;
  console.log("OK whatsapp · lista con no leídos y control · abrir chat lo marca leído (GET) · sondeo 3 s · tomar control habilita y envía {texto} con «Enviando…» · Shift+Enter · 403/409 con texto conservado · envío rechazado (200 «fallido») y reintentos · archivos como «[Archivo: tipo]» · invitado con mismo id y otro correo no controla · devolver a IA · ventana 24 h y control ajeno · enlace de vacante copiado y 409 apagado · paginación real (pagina=2, sondeo solo página 1, sin duplicados) · enlaces de vacantes (lista, búsqueda, copiar, 409/503, vacío, hoja en teléfono) · búsqueda q · móvil a pantalla completa con volver · apagado · admin valida, muestra 409 y manda PUT · R2: agente (validación, horario, copiar lunes, palabras, 400, PUT, nombre en burbujas, cambios sin guardar) · entrevista por vacante (conteo perezoso, validación, rango número, opciones descarta/alerta excluyentes, reordenar con foco, máx. 8, 400, PUT) · filtros atencion=1 / calificacion · evaluación (puntajes, respuestas con severidad, sin respuesta) · marcar atendido · hoja <1280 · teléfono ≥44 px sin desborde · 27/11: interruptor de la bolsa (GET, PUT {publicar_bolsa}, falla y regresa, también con WhatsApp apagado) · copiar enlace de la vacante (/vacante/<slug>) · WhatsApp apagado avisa · chip de entrevistas con y sin paquete y aviso de extras · admin: paquete, extras, importe y PUT con entrevistas_incluidas · bolsa pública: /vacantes/filter y tira con ?bolsa=1 (vacía se oculta)");
} finally { await browser.close(); next.kill(); if (!exito) process.exitCode = 1; }
