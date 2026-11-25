// Verificación en navegador de WhatsApp en ADAMIA (R1): bandeja, control humano/IA, envío, errores, reintento,
// móvil, administración por empresa y enlace de vacante. R2: agente entrevistador (configuración, preguntas por
// vacante, filtros por calificación, evaluación del candidato y «Marcar como atendido»).
// Bolsa de trabajo opcional (interruptor, PUT, también con WhatsApp apagado), «Copiar enlace de la vacante»,
// paquete de entrevistas (chip, aviso de extras, campos del administrador) y la bolsa pública (/vacantes/filter y la tira
// de empresas con ?bolsa=1).
// R3: agenda de entrevistas y recordatorios (pestaña «Agenda y recordatorios», agenda por vacante con vista previa de
// horarios, pantalla «Entrevistas» con calendario y lista, acciones de cita, aprobar para agendar, agendar a mano y
// «Enviar seguimiento» con la ventana cerrada).
// Chat todo-en-uno: archivos en burbujas (imagen con visor, nota de voz con transcripción, documento, ubicación, estados),
// envío multipart (clip, arrastrar, pegar, cancelar, 413), rechazos en el navegador (16 MB+, .exe), grabadora con un
// MediaRecorder simulado, cita fija con sus acciones y líneas de sistema, «Ofrecer horarios» y el selector de horarios
// sin horarios (agenda sin configurar, falta migración, días vacíos).
// Construir con NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx (el enlace de la vacante usa ese dominio).
// Backend simulado: nada sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RECRUITMENT_ENABLED=true npm run build
//      CAPTURAS=/ruta/capturas node scripts/verify-whatsapp.mjs
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { crc32, deflateSync } from "node:zlib";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { hoyMx, inicioSemana, sumarDias } from "../src/lib/whatsapp/agenda.mjs";
import { lineaAhora, rangoAgenda } from "../src/lib/whatsapp/calendario.mjs";
import { LIMITE_ADJUNTO, MENSAJE_ARCHIVO_GRANDE, MENSAJE_MICRO_DENEGADO, MENSAJE_TIPO_NO_PERMITIDO, lineaCita } from "../src/lib/whatsapp/adjuntos.mjs";
import { MENSAJE_SIN_HORARIOS } from "../src/lib/whatsapp/reglas.mjs";

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
// PNG de color liso (para miniaturas visibles) y WAV de silencio de 3 s (el reproductor sí puede sonar).
function png(ancho, alto, [r, g, b]) {
  const trozo = (tipo, datos) => {
    const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
    const td = Buffer.concat([Buffer.from(tipo), datos]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([largo, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(ancho, 0); ihdr.writeUInt32BE(alto, 4); ihdr[8] = 8; ihdr[9] = 2;
  const fila = Buffer.alloc(1 + ancho * 3);
  for (let x = 0; x < ancho; x++) { fila[1 + x * 3] = r; fila[2 + x * 3] = g; fila[3 + x * 3] = b; }
  const crudo = Buffer.concat(Array.from({ length: alto }, () => fila));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo("IHDR", ihdr), trozo("IDAT", deflateSync(crudo)), trozo("IEND", Buffer.alloc(0))]);
}
function wav(segundos = 3, tasa = 8000) {
  const datos = Buffer.alloc(segundos * tasa, 128);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + datos.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(tasa, 24); h.writeUInt32LE(tasa, 28); h.writeUInt16LE(1, 32); h.writeUInt16LE(8, 34); h.write("data", 36); h.writeUInt32LE(datos.length, 40);
  return Buffer.concat([h, datos]);
}
const PNG_INE = png(240, 160, [37, 99, 235]);
const PNG_SUBIR = png(64, 64, [16, 185, 129]);
const WAV = wav();
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
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
  // Paquete por empresa (10 con paquete, 11 sin paquete), bolsa de trabajo y respuestas públicas.
  const paquetes = { 10: { entrevistas_mes: 32, entrevistas_incluidas: 200, entrevistas_extra: 0 }, 11: { entrevistas_mes: 3, entrevistas_incluidas: null, entrevistas_extra: 0 } };
  const publico = {
    empresas: [{ id_empresa: 10, nombre_empresa: "Uniline", url_imagen: null }],
    vacantes: [{ id_vacante: 55, id_empresa: 10, titulo: "Operador de montacargas", slug: "operador-de-montacargas", nombre_empresa: "Uniline", descripcion: "Manejo de montacargas.", horario: "7 a 15 h", salario: "$12,000" }],
  };
  // R3: agenda de la empresa y por vacante, citas de la semana (relativas a hoy en México) y respuestas forzadas.
  const hoy = hoyMx();
  const lunes = inicioSemana(hoy);
  const otroDia = hoy === lunes ? sumarDias(lunes, 1) : lunes;
  const vac55 = { id_vacante: 55, titulo: "Operador de montacargas" };
  const citas = [
    { id: 71, inicio: `${hoy} 10:00`, fin: `${hoy} 10:30`, estado: "confirmada", origen: "agente", modalidad: "presencial", lugar: "Av. Industrial 120, Apodaca", vacante: vac55, candidato: { nombre: "Ana Ruiz", telefono: "5215512345678" }, id_conversacion: 1 },
    { id: 72, inicio: `${hoy} 10:00`, fin: `${hoy} 10:30`, estado: "agendada", origen: "agente", modalidad: "presencial", lugar: "Av. Industrial 120, Apodaca", vacante: vac55, candidato: { nombre: "Luis Pérez", telefono: "5215511112222" }, id_conversacion: 1002 },
    { id: 73, inicio: `${hoy} 16:00`, fin: `${hoy} 16:30`, estado: "cancelada", origen: "manual", modalidad: "video", lugar: "https://meet.google.com/abc-defg-hij", vacante: { id_vacante: 56, titulo: "Auxiliar de almacén turno nocturno" }, candidato: { nombre: "Marta Díaz", telefono: "5215533334444" }, id_conversacion: 1003 },
    { id: 74, inicio: `${otroDia} 12:00`, fin: `${otroDia} 12:30`, estado: "agendada", origen: "agente", modalidad: "presencial", lugar: "Av. Industrial 120, Apodaca", vacante: vac55, candidato: { nombre: "Jorge Salas", telefono: "5215555556666" }, id_conversacion: 1004 },
  ];
  return {
    agendaEmpresa: { quien_agenda: "califica", anticipacion_min_minutos: 120, dias_adelante: 7, horarios_a_ofrecer: 3, recordatorios: [1440], pedir_confirmacion: true, permitir_cambios: true,
      ofrecer_alternas: false, plantilla_recordatorio: null, plantilla_seguimiento: null, plantilla_idioma: "es_MX", textos: {} },
    agendasVacante: {
      55: { activa: true, modalidad: "presencial", direccion: "Av. Industrial 120, Apodaca", referencia: "", enlace_video: "", entrevistador: "Laura Gómez", que_llevar: "INE",
        duracion_minutos: 30, cupo_por_horario: 2, horario: { lun: [{ desde: "09:00", hasta: "13:00" }], mar: [{ desde: "09:00", hasta: "13:00" }], mie: [], jue: [], vie: [{ desde: "09:00", hasta: "13:00" }], sab: [], dom: [] },
        bloqueos: [], quien_agenda: null, anticipacion_min_minutos: null, dias_adelante: null },
    },
    citas, siguienteCita: 80, citasPorConv: {}, respuestasCita: [], respuestasSeguimiento: [], plantillasMes: 4,
    conversaciones, mensajes, empresas, vacantes, modo: "compartido", envios: [], siguienteId: 900, entrevistas, sinRespuesta, agente, preguntas, siguientePregunta: 100, errores400: [],
    paquetes, bolsa: { 10: false, 11: false }, bolsaFalla: 0, publico,
    // Chat todo-en-uno.
    adjuntoResp: [], subidas: [], descargas: [], ofrecerResp: [], horariosModo: "normal", reagendarComoServidor: false,
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
    const multipart = /multipart\/form-data/.test(req.headers()["content-type"] || "");
    if (!multipart) { try { cuerpo = req.postData() ? JSON.parse(req.postData()) : null; } catch { cuerpo = req.postData(); } }
    pedidos.push({ metodo: req.method(), ruta, params: url.search, cuerpo, token: req.headers().authorization || "" });
    const conv = (id) => S.conversaciones.find((c) => String(c.id) === String(id));
    let m;
    if (ruta === "/estado") {
      const paquete = S.paquetes[url.searchParams.get("empresa")] ?? { entrevistas_mes: 0, entrevistas_incluidas: null, entrevistas_extra: 0 };
      return json({ modo: S.modo, numero_whatsapp: S.modo === "apagado" ? null : "5215598765432", conversaciones_mes: 12, puede_usar: S.modo !== "apagado", plantillas_mes: S.plantillasMes, ...paquete });
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
      // wa2: resumen de la franja «requiere atención» (como el servidor: sin importar búsqueda ni filtro; sin las tomadas).
      const pendientes = S.conversaciones.filter((c) => S.entrevistas[c.id]?.requiere_atencion === true && c.modo === "ia")
        .sort((a, b) => String(b.ultimo_mensaje?.creado_en ?? "").localeCompare(String(a.ultimo_mensaje?.creado_en ?? "")));
      const atencionResumen = { total: pendientes.length, primeros: pendientes.slice(0, 3).map((c) => ({ id: c.id, contacto: c.contacto, motivo: S.entrevistas[c.id].motivo_atencion })) };
      return json({ conversaciones: lista.slice((pagina - 1) * limite, pagina * limite), total: lista.length, atencion: atencionResumen });
    }
    if (ruta === "/vacantes") {
      return json({ vacantes: url.searchParams.get("empresa") === "11" ? [] : S.vacantes });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)$/))) {
      const c = conv(m[1]);
      if (!c) return json({ error: "No existe" }, 404);
      c.no_leidos = 0;
      const cita = S.citasPorConv[c.id];
      return json({ conversacion: c, mensajes: S.mensajes[c.id], entrevista: S.entrevistas[c.id] ?? null, preguntas_sin_respuesta: S.sinRespuesta[c.id] ?? [], citas: cita ? [cita] : [] }); // como el servidor: lista «citas»
    }
    // ——— Chat todo-en-uno ———
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/adjuntos\/(\d+)$/)) && req.method() === "GET") {
      S.descargas.push({ id: m[2], params: url.search, token: req.headers().authorization || "" });
      const archivos = { 1: ["image/png", PNG_INE], 2: ["audio/wav", WAV], 3: ["application/pdf", PDF], 9: ["image/png", PNG_SUBIR] };
      const [tipo, bytes] = archivos[m[2]] ?? ["image/png", PNG_SUBIR];
      return route.fulfill({ status: 200, contentType: tipo, headers: cors, body: bytes });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/adjuntos$/)) && req.method() === "POST") {
      const cuerpoCrudo = req.postDataBuffer()?.toString("latin1") ?? "";
      S.subidas.push({ tipo: req.headers()["content-type"] || "", cuerpo: cuerpoCrudo, token: req.headers().authorization || "" });
      const forzada = S.adjuntoResp.shift();
      if (forzada === "413") return json({ codigo: "WA_ARCHIVO_GRANDE", error: "Grande" }, 413);
      await dormir(forzada === "lento" ? 5000 : 900); // deja ver la barra de avance
      const parte = (nombre) => new RegExp(`name="${nombre}"(?:; filename="([^"]*)")?\\r\\n(?:Content-Type: ([^\\r]+)\\r\\n)?\\r\\n([\\s\\S]*?)\\r\\n--`).exec(cuerpoCrudo);
      const archivo = parte("archivo");
      const texto = parte("texto")?.[3] ?? "";
      const mime = archivo?.[2] ?? "application/octet-stream";
      const tipo = mime.startsWith("image/") ? "imagen" : mime.startsWith("audio/") ? "audio" : "documento";
      const idAdj = 9;
      const msg = { id: S.siguienteId++, direccion: "saliente", actor: "reclutador", tipo, texto: Buffer.from(texto, "latin1").toString("utf8"), estado: "enviado", error: null, creado_en: hace(0), usuario: { nombre: "Laura Gómez" },
        adjunto: { id: idAdj, tipo, mime, nombre: archivo?.[1] ?? "archivo", tamano: archivo?.[3]?.length ?? 0, url: `/reclutamiento/whatsapp/conversaciones/${m[1]}/adjuntos/${idAdj}`, transcripcion: null, estado: "listo", lat: null, lng: null, nota_voz: parte("nota_voz")?.[3] === "1" } };
      S.mensajes[m[1]].push(msg);
      return json({ mensaje: msg });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/ofrecer-horarios$/)) && req.method() === "POST") {
      const forzada = S.ofrecerResp.shift();
      if (forzada) return json({ codigo: forzada, error: forzada }, 409);
      const msg = { id: S.siguienteId++, direccion: "saliente", actor: "ia", tipo: "interactivo", texto: "Tengo estos horarios para tu entrevista. Elige uno:", estado: "enviado", error: null, creado_en: hace(0), usuario: null, adjunto: null };
      S.mensajes[m[1]].push(msg);
      return json({ mensaje: msg });
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
    // ——— R3 ———
    if (ruta === "/agenda/empresa") {
      if (req.method() === "PUT") {
        const error = S.errores400.shift();
        if (error) return json({ error }, 400);
        S.agendaEmpresa = { ...S.agendaEmpresa, ...cuerpo };
      }
      return json(S.agendaEmpresa);
    }
    if ((m = ruta.match(/^\/vacantes\/(\d+)\/agenda$/))) {
      if (req.method() === "PUT") {
        const error = S.errores400.shift();
        if (error) return json({ error }, 400);
        S.agendasVacante[m[1]] = cuerpo;
      }
      return json(S.agendasVacante[m[1]] ?? { activa: false, modalidad: "presencial", direccion: "", referencia: "", enlace_video: "", entrevistador: "", que_llevar: "", duracion_minutos: 30,
        cupo_por_horario: 1, horario: { lun: [], mar: [], mie: [], jue: [], vie: [], sab: [], dom: [] }, bloqueos: [], quien_agenda: null, anticipacion_min_minutos: null, dias_adelante: null });
    }
    if ((m = ruta.match(/^\/vacantes\/(\d+)\/agenda\/horarios$/))) {
      if (S.horariosModo === "sin_migracion") return json({ codigo: "SIN_MIGRACION", error: "Falta la migración" }, 503);
      if (S.horariosModo === "vacio") return json({ horarios: [] });
      const desde = url.searchParams.get("desde");
      const cupo = S.agendasVacante[m[1]]?.cupo_por_horario ?? 1;
      const d1 = sumarDias(desde, 1);
      const d2 = sumarDias(desde, 2);
      return json({ horarios: [
        { inicio: `${d1} 09:00`, fin: `${d1} 09:30`, capacidad: cupo, ocupados: 1 },
        { inicio: `${d1} 09:30`, fin: `${d1} 10:00`, capacidad: cupo, ocupados: cupo },
        { inicio: `${d2} 10:00`, fin: `${d2} 10:30`, capacidad: cupo, ocupados: 0 },
      ] });
    }
    if (ruta === "/citas" && req.method() === "GET") {
      const q = url.searchParams;
      const lista = S.citas.filter((c) => c.inicio.slice(0, 10) >= q.get("desde") && c.inicio.slice(0, 10) <= q.get("hasta"))
        .filter((c) => !q.get("id_vacante") || String(c.vacante.id_vacante) === q.get("id_vacante"))
        .filter((c) => !q.get("estado") || c.estado === q.get("estado"));
      return json({ citas: lista });
    }
    if (ruta === "/citas" && req.method() === "POST") {
      const forzada = S.respuestasCita.shift();
      if (forzada) return json(forzada.cuerpo, forzada.status);
      const c = conv(cuerpo.id_conversacion);
      const cita = { id: S.siguienteCita++, inicio: cuerpo.inicio, fin: cuerpo.inicio.replace(/(\d\d):(\d\d)$/, (x, h, mm) => `${h}:${String(Number(mm) + 30).padStart(2, "0")}`), estado: "agendada", origen: "manual",
        modalidad: "presencial", lugar: "Av. Industrial 120, Apodaca", vacante: c.vacante, candidato: { nombre: c.contacto.nombre, telefono: c.contacto.telefono }, id_conversacion: c.id };
      S.citas.push(cita);
      S.citasPorConv[c.id] = cita;
      return json({ cita });
    }
    if ((m = ruta.match(/^\/citas\/(\d+)\/(reagendar|cancelar|asistencia|confirmar)$/)) && req.method() === "POST") {
      const forzada = S.respuestasCita.shift();
      if (forzada) return json(forzada.cuerpo, forzada.status);
      const cita = S.citas.find((c) => String(c.id) === m[1]);
      if (!cita) return json({ error: "No existe" }, 404);
      if (m[2] === "reagendar" && S.reagendarComoServidor) { // como el servidor: crea otra cita y deja la anterior «reagendada»
        const nueva = { ...cita, id: S.siguienteCita++, inicio: cuerpo.inicio, fin: cuerpo.inicio, estado: "agendada" };
        cita.estado = "reagendada";
        S.citas.push(nueva);
        if (cita.id_conversacion) S.citasPorConv[cita.id_conversacion] = nueva;
        return json({ cita: nueva, anterior: cita.id });
      }
      if (m[2] === "reagendar") Object.assign(cita, { inicio: cuerpo.inicio, fin: cuerpo.inicio, estado: "reagendada" });
      if (m[2] === "cancelar") Object.assign(cita, { estado: "cancelada", motivo: cuerpo.motivo });
      if (m[2] === "asistencia") cita.estado = cuerpo.asistio ? "asistio" : "no_asistio";
      if (m[2] === "confirmar") cita.estado = "confirmada";
      return json({ cita });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/aprobar-agenda$/)) && req.method() === "POST") {
      const e = S.entrevistas[m[1]];
      if (e) Object.assign(e, { requiere_atencion: false, motivo_atencion: null, agenda_aprobada: true });
      return json({ ok: true });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/seguimiento$/)) && req.method() === "POST") {
      const forzada = S.respuestasSeguimiento.shift();
      if (forzada) return json({ codigo: forzada, error: forzada }, 409);
      S.plantillasMes += 1;
      return json({ ok: true });
    }
    return json({ error: "Ruta no simulada" }, 404);
  });
}

const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const tamano = async (loc) => { const b = await loc.boundingBox(); return b ? Math.min(b.width, b.height) : 0; };
const cuenta = (filtro) => pedidos.filter(filtro).length;
// Bandeja estilo WhatsApp Web: «Enlaces de vacantes», «Configurar agente» y «Salud del agente» van en el menú ⋮ de la
// columna de chats; las acciones del chat, en el menú «Acciones»; el agente es el chip «Agente encendido/apagado».
const masOpciones = async (p, opcion) => {
  await p.getByRole("region", { name: "Chats" }).getByRole("button", { name: "Más opciones" }).click();
  await p.getByRole("menuitem", { name: opcion }).click();
  await p.getByRole("menu").waitFor({ state: "detached" });
};
const accionChat = async (p, hilo, opcion) => {
  await hilo.getByRole("button", { name: "Acciones", exact: true }).click();
  await p.getByRole("menuitem", { name: opcion }).click();
  await p.getByRole("menu").waitFor({ state: "detached" }); // el menú termina de cerrarse (su animación atrapa Escape)
};
const chipAgente = (p) => p.locator("[data-chip-agente]");
const verFicha = async (p, hilo) => {
  await hilo.locator("[data-ver-ficha]").click();
  const f = p.getByRole("complementary", { name: "Ficha del candidato" });
  await f.waitFor();
  return f;
};

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch { /* aún no arranca */ } if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];
  // SOLO_CHAT=1: corre solo el bloque del chat todo-en-uno (para iterar rápido).
  if (process.env.SOLO_AGENDA) { await agendaCalendario(browser, errores); assert.deepEqual(errores, []); exito = true; console.log("OK agenda"); throw new Error("__solo__"); }
  if (process.env.SOLO_BANDEJA) { await bandejaWhatsappWeb(browser, errores); await franjaAtencionWeb(browser, errores); assert.deepEqual(errores, []); exito = true; throw new Error("__solo__"); }
  if (process.env.SOLO_FRANJA) { await franjaAtencionWeb(browser, errores); assert.deepEqual(errores, []); exito = true; console.log("OK franja de atención"); throw new Error("__solo__"); }
  if (process.env.SOLO_CHAT) { await chatTodoEnUno(browser, errores); assert.deepEqual(errores, []); exito = true; console.log("OK chat todo-en-uno"); throw new Error("__solo__"); }

  // ——— 1. Bandeja en escritorio ———
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City", permissions: ["clipboard-read", "clipboard-write"] });
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctx, reclutadora);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  const lista = page.getByRole("list", { name: "Conversaciones" });
  await lista.waitFor({ timeout: 30000 });
  assert.equal(await page.getByRole("heading", { level: 1, name: "Chats" }).count(), 1);
  assert.match(await page.locator('[data-estado-wa="compartido"]').innerText(), /Activo · número compartido de ADAMIA[\s\S]*\+52 55 9876 5432[\s\S]*12 conversaciones este mes[\s\S]*32 de 200 entrevistas este mes/);
  assert.equal(await page.locator("[data-aviso-extras]").count(), 0, "sin extras no hay aviso");
  assert.equal(await page.getByLabel("Empresa").filter({ visible: true }).count(), 1, "selector de empresa con 2 empresas");
  const items = lista.getByRole("listitem");
  assert.equal(await items.count(), 30, "primera página de 30");
  const anaItem = page.getByRole("button", { name: "Ana Ruiz, 2 sin leer" });
  assert.match(await anaItem.innerText(), /Ana Ruiz[\s\S]*hace 3 min[\s\S]*Operador de montacargas[\s\S]*IA[\s\S]*¿Sigue disponible la vacante\?[\s\S]*2/);
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
  // Menú lateral (riel de iconos en la bandeja; la entrada real fuera del demo se revisa en el bloque 24 con el menú abierto).
  assert.equal(await page.locator('[data-slot="sidebar"][data-state="collapsed"]').count(), 1, "menú de ADAMIA plegado en la bandeja");
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
  assert.equal(await composer.count(), 0, "con IA no se escribe (en lugar del cuadro, el aviso y «Tomar control»)");
  assert.match(await hilo.innerText(), /La IA está atendiendo esta conversación/);
  // Sondeo del hilo cada 3 s.
  const getsAntes = cuenta((x) => x.ruta === "/conversaciones/1");
  await dormir(3600);
  assert.ok(cuenta((x) => x.ruta === "/conversaciones/1") > getsAntes, "el hilo se refresca solo");

  // ——— 3. Tomar control → escribir y enviar ———
  await hilo.getByRole("button", { name: "Tomar control", exact: true }).click();
  await hilo.getByRole("button", { name: "Devolver a la IA" }).waitFor();
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

  // ——— 6. Enlace de la vacante: copiar (menú «Acciones») ———
  await accionChat(page, hilo, "Copiar enlace de WhatsApp de la vacante");
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
  await hilo.getByRole("button", { name: "Devolver a la IA" }).click();
  await hilo.getByRole("button", { name: "Tomar control", exact: true }).waitFor();
  assert.equal(cuenta((x) => x.metodo === "POST" && x.ruta === "/conversaciones/1/devolver"), 1);
  assert.equal(await composer.count(), 0);

  // ——— 8. Ventana de 24 h cerrada y control de otra persona ———
  await page.getByRole("button", { name: "+52 442 123 4567" }).click();
  await hilo.getByText("Gracias").first().waitFor();
  assert.match(await hilo.locator('[data-mensaje="200"]').innerText(), /\[Archivo: imagen\] \(no disponible\)/);
  assert.match(await hilo.innerText(), /Pasaron más de 24 h desde el último mensaje del candidato: WhatsApp no permite escribirle libremente\. Usa «Enviar seguimiento» para mandarle una plantilla aprobada; cuando conteste, el chat se reabre\./);
  assert.equal(await hilo.getByRole("textbox", { name: "Mensaje" }).count(), 0);
  await page.getByRole("button", { name: /^Carlos Méndez/ }).click();
  await hilo.getByText("Te esperamos el lunes").first().waitFor();
  assert.match(await hilo.innerText(), /Pedro tiene el control de esta conversación\./);
  assert.match(await hilo.locator('[data-mensaje="302"]').innerText(), /Sistema/);
  assert.equal(await hilo.getByRole("textbox", { name: "Mensaje" }).count(), 0);
  assert.equal(await hilo.getByRole("button", { name: "Devolver a la IA" }).count(), 0, "invitado con el mismo id pero otro correo: no controla ni devuelve");
  // Vacante con WhatsApp apagado → 409 WA_APAGADO.
  // Vacante con WhatsApp apagado → 409 WA_APAGADO.
  await accionChat(page, hilo, "Copiar enlace de WhatsApp de la vacante");
  await page.getByRole("dialog").getByText("WhatsApp no está activado para tu empresa. Pídele a ADAMIA que lo active.").waitFor();
  await page.keyboard.press("Escape");
  // Búsqueda: manda q al API.
  await page.getByRole("searchbox", { name: "Buscar conversación" }).fill("montacargas");
  await page.waitForFunction(() => document.querySelectorAll('[aria-label="Conversaciones"] li').length === 1);
  assert.ok(pedidos.some((x) => x.ruta === "/conversaciones" && /q=montacargas/.test(x.params)));
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  // «Enlaces de vacantes» desde el menú ⋮ de la columna de chats: lista, búsqueda, copiar y errores por vacante.
  await masOpciones(page, "Enlaces de vacantes");
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
  // «Copiar enlace de la vacante» copia la página pública con su formulario, sin pedir nada al API.
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
  await masOpciones(tel, "Enlaces de vacantes");
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
  assert.ok(await tamano(hiloTel.getByRole("button", { name: "Volver a la lista" })) >= 44 && await tamano(hiloTel.getByRole("button", { name: "Tomar control" })) >= 44);
  assert.ok(await sinScrollHorizontal(tel), "chat sin scroll horizontal");
  await hiloTel.getByRole("button", { name: "Tomar control" }).tap();
  await hiloTel.getByRole("textbox", { name: "Mensaje" }).waitFor();
  const enviarBtn = hiloTel.getByRole("button", { name: "Enviar mensaje" });
  const cajaEnviar = await enviarBtn.boundingBox();
  assert.ok(cajaEnviar.y + cajaEnviar.height <= 844 && cajaEnviar.y > 700, "el cuadro para escribir queda abajo");
  assert.ok(await tamano(enviarBtn) >= 44);
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
  // Con WhatsApp apagado «Enlaces de vacantes» sigue: bolsa y página de la vacante funcionan; WhatsApp avisa.
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
  assert.match(await (await verFicha(r2, hiloR2)).innerText(), /aún no entrevista a este candidato/);

  // ——— 12. Configurar agente: validación, 400 del API y PUT ———
  assert.equal(await chipAgente(r2).innerText(), "Agente apagado");
  await chipAgente(r2).click();
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
  await chipAgente(r2).click();
  assert.equal(await dlgAg.getByLabel("Nombre del asistente").inputValue(), "Sofía", "se recarga lo guardado");
  await dlgAg.getByLabel("Nombre del asistente").fill("Sofía de Uniline");
  await r2.keyboard.press("Escape");
  await dlgAg.getByRole("alertdialog", { name: "Cambios sin guardar" }).waitFor();
  await dlgAg.getByRole("button", { name: "Descartar cambios" }).click();
  await dlgAg.waitFor({ state: "detached" });
  assert.equal(cuenta((x) => x.ruta === "/agente" && x.metodo === "PUT"), 2);
  if (OUT) await r2.screenshot({ path: OUT + "/r2-01-chat-agente-sofia.png" });

  // ——— 13. Preguntas de la entrevista por vacante ———
  await masOpciones(r2, "Enlaces de vacantes");
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
  assert.deepEqual(await filtros.getByRole("button").allInnerTexts(), ["Todos", "Atención", "Califica", "Con alerta", "No califica", "Incompleto"]);
  await filtros.getByRole("button", { name: "Atención" }).click();
  await r2.waitForFunction(() => document.querySelectorAll('[aria-label="Conversaciones"] li').length === 1);
  assert.equal(await filtros.getByRole("button", { name: "Atención" }).getAttribute("aria-pressed"), "true");
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
  // Ficha cerrada: la atención pendiente se ve como aviso sobre el chat; el nombre abre la ficha.
  const panelC = r2.getByRole("complementary", { name: "Ficha del candidato" });
  assert.equal(await panelC.count(), 0, "la ficha empieza cerrada al cambiar de chat");
  assert.match(await hiloR2.locator("[data-banner-atencion]").innerText(), /Pidió hablar con una persona/);
  await verFicha(r2, hiloR2);
  await panelC.getByRole("list", { name: "Respuestas del candidato" }).waitFor();
  assert.equal(await hiloR2.locator("[data-banner-atencion]").count(), 0, "con la ficha abierta, el aviso está en la ficha");
  const textoPanel = await panelC.innerText();
  assert.match(textoPanel, /No califica[\s\S]*pasó a una persona[\s\S]*Carlos Méndez Ortega[\s\S]*Aceptó el aviso de privacidad/i);
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
  await r2.locator("[data-ver-ficha]").filter({ hasText: "+52 442 123 4567" }).waitFor();
  await verFicha(r2, hiloR2);
  await panelC.locator("[data-pregunta-actual]").getByText("¿Tienes licencia tipo C?").waitFor();
  assert.match(await panelC.innerText(), /Incompleto[\s\S]*respondiendo preguntas[\s\S]*Pregunta en curso: ¿Tienes licencia tipo C\?/i);
  await carlos.click();
  await hiloR2.getByText("Te esperamos el lunes").first().waitFor();
  // Bajo 1280 px la ficha se sobrepone al chat (sin encogerlo) y Escape la cierra.
  await r2.setViewportSize({ width: 1100, height: 900 });
  assert.equal(await panelC.count(), 0);
  const anchoChat = (await hiloR2.boundingBox()).width;
  await verFicha(r2, hiloR2);
  await panelC.getByRole("list", { name: "Respuestas del candidato" }).waitFor();
  const cajaSobre = await panelC.boundingBox();
  assert.ok(Math.round(cajaSobre.width) === 380 && (await hiloR2.boundingBox()).width === anchoChat, `ficha sobrepuesta: ${JSON.stringify(cajaSobre)}`);
  await r2.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Cerrar ficha");
  await r2.keyboard.press("Escape");
  await panelC.waitFor({ state: "hidden" });
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
  for (const nombre of ["Todos", "Atención", "Incompleto"]) assert.ok(await tamano(filtrosT.getByRole("button", { name: nombre, exact: true })) >= 44, `chip ${nombre} ≥44 px`);
  assert.ok(await tamano(chipAgente(t2)) >= 44);
  assert.ok(await sinScrollHorizontal(t2), "lista con filtros sin scroll horizontal");
  if (OUT) await t2.screenshot({ path: OUT + "/r2-04-movil-lista-filtros.png" });
  // Agente a pantalla completa.
  await chipAgente(t2).tap();
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
  await masOpciones(t2, "Enlaces de vacantes");
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
  assert.ok(await tamano(hiloT.locator("[data-ver-ficha]")) >= 44);
  await hiloT.locator("[data-ver-ficha]").tap();
  const evT = t2.getByRole("complementary", { name: "Ficha del candidato" });
  await evT.getByRole("list", { name: "Respuestas del candidato" }).waitFor();
  await dormir(300); // termina la animación de entrada (zoom 95 %)
  const cajaEv = await evT.boundingBox();
  assert.ok(cajaEv.x === 0 && cajaEv.width === 390 && cajaEv.height >= 840, `evaluación a pantalla completa: ${JSON.stringify(cajaEv)}`);
  assert.ok(await tamano(evT.getByRole("button", { name: "Marcar como atendido" })) >= 44);
  assert.ok(await evT.evaluate((el) => [...el.querySelectorAll("*")].every((n) => n.getBoundingClientRect().right <= 391)), "evaluación sin desborde horizontal");
  if (OUT) await t2.screenshot({ path: OUT + "/r2-07-movil-evaluacion.png" });
  await evT.getByRole("button", { name: "Cerrar ficha" }).tap();
  await evT.waitFor({ state: "hidden" });
  assert.ok(await sinScrollHorizontal(t2));
  await movR2.close();

  // ═══════════ Paquete con extras y bolsa de trabajo pública ═══════════
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

  // ═══════════ R3 · Agenda de entrevistas y recordatorios ═══════════
  const hoyR3 = hoyMx();
  const lunesR3 = inicioSemana(hoyR3);
  const ctxR3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctxR3.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctxR3, reclutadora);
  const r3 = await ctxR3.newPage();
  r3.on("pageerror", (e) => errores.push(e.message));
  await r3.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await r3.getByRole("list", { name: "Conversaciones" }).waitFor({ timeout: 30000 });
  assert.equal(await r3.locator("[data-plantillas-mes]").innerText(), "4 plantillas enviadas este mes");
  const linkEntrevistas = (p) => p.getByRole("region", { name: "Chats" }).getByRole("link", { name: "Entrevistas" });
  assert.equal(await linkEntrevistas(r3).getAttribute("aria-current"), null, "en la bandeja, «Entrevistas» no está activa");

  // ——— 17. Agenda de la empresa (pestaña del agente) ———
  await chipAgente(r3).click();
  const dlgR3 = r3.getByRole("dialog", { name: "Configurar agente" });
  await dlgR3.getByRole("tab", { name: "Agenda y recordatorios" }).click();
  const pan = dlgR3.getByRole("tabpanel", { name: "Agenda y recordatorios" });
  await pan.getByRole("radiogroup", { name: "Quién recibe horarios" }).waitFor();
  assert.ok(pedidos.some((x) => x.ruta === "/agenda/empresa" && x.metodo === "GET" && /empresa=10/.test(x.params)), "GET /agenda/empresa?empresa=10");
  assert.equal(await pan.getByRole("radio").count(), 3);
  assert.equal(await pan.getByRole("radio", { name: "Solo a quien califica" }).isChecked(), true);
  assert.match(await pan.locator('[data-modo="aprobacion"]').innerText(), /Nadie recibe horarios hasta que presionas «Aprobar para agendar»/);
  await pan.getByRole("radio", { name: "Tú apruebas cada cita" }).check();
  await pan.getByLabel("Anticipación mínima (horas)").fill("3");
  await pan.getByLabel("Días hacia adelante").fill("10");
  await pan.getByLabel("Horarios a ofrecer").fill("4");
  const recs = pan.getByRole("list", { name: "Recordatorios" });
  assert.deepEqual(await recs.getByRole("listitem").allInnerTexts(), ["24 h antes"]);
  await pan.getByLabel("Tiempo antes de la cita").fill("2");
  await pan.getByRole("button", { name: "Agregar recordatorio" }).click();
  await pan.getByLabel("Tiempo antes de la cita").fill("30");
  await pan.getByLabel("Unidad").selectOption("minutos");
  await pan.getByLabel("Tiempo antes de la cita").press("Enter");
  assert.deepEqual(await recs.getByRole("listitem").allInnerTexts(), ["24 h antes", "2 h antes", "30 min antes"]);
  await pan.getByRole("button", { name: "Quitar recordatorio 30 min antes" }).click();
  await pan.getByLabel("Unidad").selectOption("horas");
  await pan.getByLabel("Tiempo antes de la cita").fill("24");
  await pan.getByRole("button", { name: "Agregar recordatorio" }).click();
  await pan.getByRole("alert").filter({ hasText: "Ya tienes un recordatorio 24 h antes." }).waitFor();
  assert.match(await pan.locator("[data-plantillas-sugeridas]").innerText(), /recordatorio_entrevista, seguimiento_candidato, confirmacion_entrevista/);
  assert.match(await pan.innerText(), /Sin plantilla de recordatorio, WhatsApp solo deja enviar recordatorios si el candidato escribió en las últimas 24 h\./);
  await pan.getByRole("switch", { name: "Ofrecer otras vacantes si no califica" }).click();
  await pan.getByLabel("Plantilla de recordatorio").fill("Recordatorio Entrevista");
  await pan.getByLabel("Plantilla de seguimiento").fill("seguimiento_candidato");
  // Mensajes: marcador en el cursor, vista previa, marcador desconocido y restaurar.
  await pan.getByLabel("Mensaje", { exact: true }).selectOption("confirmacion_cita");
  const areaMsg = pan.getByLabel("Texto de «Cita agendada»");
  await areaMsg.fill("Hola , tu cita es el {fecha}.");
  await areaMsg.evaluate((el) => el.setSelectionRange(5, 5));
  await pan.getByRole("button", { name: "Insertar {nombre} (Nombre del candidato)" }).click();
  assert.equal(await areaMsg.inputValue(), "Hola {nombre}, tu cita es el {fecha}.");
  assert.equal(await areaMsg.evaluate((el) => [el === document.activeElement, el.selectionStart]).then(JSON.stringify), JSON.stringify([true, 13]), "foco y cursor después del marcador");
  assert.equal(await pan.locator("[data-vista-previa]").innerText(), "Hola Ana Ruiz, tu cita es el lunes 30 de noviembre.");
  await pan.getByLabel("Mensaje", { exact: true }).selectOption("saludo");
  assert.match(await pan.locator("[data-vista-previa]").innerText(), /^¡Hola Ana Ruiz! Gracias por tu interés en la vacante de Operador de montacargas en Uniline\./, "vacío = texto original con la empresa");
  await pan.getByLabel("Texto de «Saludo»").fill("Hola {nombr}");
  await pan.getByText("El agente no conoce {nombr}. Usa los botones de marcadores.").waitFor();
  await pan.getByRole("button", { name: "Restaurar texto original" }).click();
  assert.equal(await pan.getByLabel("Texto de «Saludo»").inputValue(), "");
  await pan.getByRole("button", { name: "Guardar agenda" }).click();
  await pan.getByText("Usa el nombre exacto de la plantilla: minúsculas, números y guion bajo (_), sin espacios.").waitFor();
  await r3.waitForFunction(() => document.activeElement?.getAttribute("aria-invalid") === "true");
  assert.equal(cuenta((x) => x.ruta === "/agenda/empresa" && x.metodo === "PUT"), 0, "no manda con errores");
  await pan.getByLabel("Plantilla de recordatorio").fill("recordatorio_entrevista");
  S.errores400.push("La plantilla de recordatorio no existe en Zernio.");
  await pan.getByRole("button", { name: "Guardar agenda" }).click();
  await pan.getByRole("alert").filter({ hasText: "La plantilla de recordatorio no existe en Zernio." }).waitFor();
  if (OUT) await r3.screenshot({ path: OUT + "/r3-01-agenda-empresa.png" });
  await pan.getByRole("button", { name: "Guardar agenda" }).click();
  await dlgR3.waitFor({ state: "detached" });
  const putsAgenda = pedidos.filter((x) => x.ruta === "/agenda/empresa" && x.metodo === "PUT");
  assert.equal(putsAgenda.length, 2);
  assert.match(putsAgenda[1].params, /empresa=10/);
  assert.deepEqual(putsAgenda[1].cuerpo, {
    quien_agenda: "aprobacion", anticipacion_min_minutos: 180, dias_adelante: 10, horarios_a_ofrecer: 4, recordatorios: [1440, 120],
    pedir_confirmacion: true, permitir_cambios: true, ofrecer_alternas: true, plantilla_recordatorio: "recordatorio_entrevista", plantilla_seguimiento: "seguimiento_candidato",
    plantilla_idioma: "es_MX", textos: { confirmacion_cita: "Hola {nombre}, tu cita es el {fecha}." },
  });
  // Cambios en ambas pestañas: guardar una deja el diálogo abierto y avisa; cerrar con cambios pide confirmación.
  await chipAgente(r3).click();
  await dlgR3.getByRole("tab", { name: "Agenda y recordatorios" }).click();
  await pan.getByLabel("Días hacia adelante").fill("12");
  await dormir(200); // «cambios sin guardar» se avisa al diálogo en un efecto: Escape inmediato podía ganarle (prueba intermitente)
  await r3.keyboard.press("Escape");
  await pan.getByRole("alertdialog", { name: "Cambios sin guardar" }).waitFor();
  await pan.getByRole("button", { name: "Descartar cambios" }).click();
  await dlgR3.waitFor({ state: "detached" });

  // ——— 18. Agenda de la vacante ———
  await masOpciones(r3, "Enlaces de vacantes");
  await r3.getByRole("button", { name: "Agenda de Operador de montacargas" }).click();
  const dlgAv = r3.getByRole("dialog", { name: "Agenda de entrevistas" });
  await dlgAv.locator("[data-vista-horarios] [data-horario]").first().waitFor();
  const horariosAntes = cuenta((x) => /^\/vacantes\/55\/agenda\/horarios$/.test(x.ruta));
  const pedidoHorarios = pedidos.find((x) => x.ruta === "/vacantes/55/agenda/horarios");
  assert.equal(pedidoHorarios.params, `?desde=${hoyR3}&dias=7`);
  assert.equal(await dlgAv.locator("[data-vista-horarios] [data-horario]").count(), 3);
  assert.match(await dlgAv.locator("[data-vista-horarios]").innerText(), /9:00 a\.m\.[\s\S]*Queda 1 lugar[\s\S]*9:30 a\.m\.[\s\S]*Lleno[\s\S]*10:00 a\.m\.[\s\S]*Quedan 2 lugares/);
  assert.equal(await dlgAv.getByRole("switch", { name: "Agenda activa" }).getAttribute("aria-checked"), "true");
  assert.equal(await dlgAv.getByLabel("Dirección").inputValue(), "Av. Industrial 120, Apodaca");
  assert.match(await dlgAv.getByRole("combobox").filter({ hasText: "Usar el de la empresa" }).locator("option").first().innerText(), /^Usar el de la empresa \(Tú apruebas cada cita\)$/);
  await dlgAv.getByLabel("Personas por horario").fill("3");
  await dlgAv.getByRole("button", { name: "Agregar horario al lunes" }).click();
  assert.equal(await dlgAv.getByLabel("Lunes, horario 2: desde").inputValue(), "13:00", "el rango nuevo empieza donde termina el anterior");
  await dlgAv.getByLabel("Lunes, horario 2: desde").fill("12:00");
  await dlgAv.getByLabel("Lunes, horario 2: hasta").fill("18:00");
  await dlgAv.getByRole("button", { name: "Agregar bloqueo" }).click();
  await dlgAv.getByLabel("Bloqueo 1: desde").fill("2026-12-25T10:00");
  await dlgAv.getByLabel("Bloqueo 1: hasta").fill("2026-12-25T09:00");
  await dlgAv.getByRole("button", { name: "Guardar agenda" }).click();
  await dlgAv.getByText("Lunes: los horarios 09:00–13:00 y 12:00–18:00 se empalman.").waitFor();
  await dlgAv.getByText("El fin del bloqueo debe ser después del inicio.").waitFor();
  await r3.waitForFunction(() => document.activeElement?.getAttribute("aria-invalid") === "true");
  assert.equal(cuenta((x) => x.ruta === "/vacantes/55/agenda" && x.metodo === "PUT"), 0, "no manda con errores");
  await dlgAv.getByLabel("Lunes, horario 2: desde").fill("15:00");
  await dlgAv.getByRole("button", { name: "Copiar horario del lunes a todos los días" }).click();
  await dlgAv.getByRole("button", { name: "Quitar horario 2 del domingo" }).click();
  await dlgAv.getByRole("button", { name: "Quitar horario 1 del domingo" }).click();
  assert.match(await dlgAv.locator('[data-dia="dom"]').innerText(), /Sin entrevistas/);
  await dlgAv.getByLabel("Bloqueo 1: desde").fill("2026-12-24T00:00");
  await dlgAv.getByLabel("Bloqueo 1: hasta").fill("2026-12-25T23:59");
  await dlgAv.getByLabel("Bloqueo 1: motivo").fill("Navidad");
  await dlgAv.getByRole("combobox").filter({ hasText: "Usar el de la empresa" }).selectOption("califica");
  await dlgAv.getByRole("switch", { name: "Usar el de la empresa (anticipación mínima)" }).click();
  await dlgAv.getByLabel("Anticipación mínima", { exact: true }).fill("48");
  assert.match(await dlgAv.innerText(), /Tienes cambios sin guardar: guarda para ver su efecto aquí\./);
  await dlgAv.getByRole("button", { name: "Guardar agenda" }).click();
  await dlgAv.getByRole("status").filter({ hasText: "Agenda guardada. La vista previa ya muestra los horarios nuevos." }).waitFor();
  const putAv = pedidos.filter((x) => x.ruta === "/vacantes/55/agenda" && x.metodo === "PUT");
  assert.equal(putAv.length, 1);
  const dosRangos = [{ desde: "09:00", hasta: "13:00" }, { desde: "15:00", hasta: "18:00" }];
  assert.deepEqual(putAv[0].cuerpo, {
    activa: true, modalidad: "presencial", direccion: "Av. Industrial 120, Apodaca", referencia: "", enlace_video: "", entrevistador: "Laura Gómez", que_llevar: "INE",
    duracion_minutos: 30, cupo_por_horario: 3,
    horario: { lun: dosRangos, mar: dosRangos, mie: dosRangos, jue: dosRangos, vie: dosRangos, sab: dosRangos, dom: [] },
    bloqueos: [{ desde: "2026-12-24 00:00", hasta: "2026-12-25 23:59", motivo: "Navidad" }],
    quien_agenda: "califica", anticipacion_min_minutos: 2880, dias_adelante: null,
  });
  await r3.waitForFunction(() => document.querySelector('[data-vista-horarios] [data-horario][data-capacidad="3"]'));
  assert.ok(cuenta((x) => x.ruta === "/vacantes/55/agenda/horarios") > horariosAntes, "la vista previa se vuelve a pedir tras guardar");
  if (OUT) await r3.screenshot({ path: OUT + "/r3-02-agenda-vacante.png" });
  assert.equal(await dlgAv.evaluate((el) => el.scrollTop), 0, "el encabezado del diálogo no se recorta al enfocar campos con error (radios sr-only contenidos en la zona con scroll)");
  await dlgAv.getByRole("button", { name: "Cerrar" }).click();
  await dlgAv.waitFor({ state: "detached" });
  await r3.getByRole("dialog", { name: "Enlaces de vacantes" }).getByRole("button", { name: "Close" }).click();

  // ——— 19. Entrevistas: calendario, filtros, lista y acciones ———
  await linkEntrevistas(r3).click();
  await r3.waitForURL(/\/panel\/whatsapp\?vista=entrevistas$/);
  const cal = r3.locator("[data-calendario-semana]");
  await cal.locator("[data-bloque-cita]").first().waitFor({ timeout: 10000 });
  const pedidoCitas = pedidos.find((x) => x.ruta === "/citas");
  assert.equal(pedidoCitas.params, `?empresa=10&desde=${lunesR3}&hasta=${sumarDias(lunesR3, 6)}`);
  assert.equal(await cal.locator("[data-bloque-cita]").count(), 4);
  assert.equal(await r3.locator("[data-lista-citas]").isVisible(), false, "en escritorio se ve el calendario");
  const anchoA = (await cal.locator('[data-bloque-cita="71"]').boundingBox()).width;
  const anchoD = (await cal.locator('[data-bloque-cita="74"]').boundingBox()).width;
  assert.ok(anchoA < anchoD * 0.6, `citas empalmadas lado a lado: ${anchoA} vs ${anchoD}`);
  assert.match(await r3.locator("[data-resumen-semana]").innerText(), /3 entrevistas esta semana · 1 cancelada/);
  if (OUT) await r3.screenshot({ path: OUT + "/r3-03-entrevistas-calendario.png" });
  await cal.locator('[data-bloque-cita="71"]').click();
  const dlgCita = r3.getByRole("dialog", { name: "Entrevista" });
  await dlgCita.getByRole("button", { name: "Asistió", exact: true }).click();
  await dlgCita.locator('[data-estado-cita="asistio"]').waitFor();
  assert.deepEqual(pedidos.find((x) => x.ruta === "/citas/71/asistencia").cuerpo, { asistio: true });
  assert.equal(await dlgCita.getByRole("button", { name: "Reagendar" }).count(), 0, "ya asistió: sin acciones");
  await r3.keyboard.press("Escape");
  await r3.getByLabel("Estado").selectOption("cancelada");
  await r3.waitForFunction(() => document.querySelectorAll("[data-calendario-semana] [data-bloque-cita]").length === 1);
  assert.ok(pedidos.some((x) => x.ruta === "/citas" && /estado=cancelada/.test(x.params)));
  await r3.getByLabel("Estado").selectOption("");
  await r3.getByLabel("Vacante", { exact: true }).selectOption("56");
  await r3.waitForFunction(() => document.querySelectorAll("[data-calendario-semana] [data-bloque-cita]").length === 1);
  assert.ok(pedidos.some((x) => x.ruta === "/citas" && /id_vacante=56/.test(x.params)));
  await r3.getByLabel("Vacante", { exact: true }).selectOption("");
  await r3.getByRole("button", { name: "Lista", exact: true }).click();
  const listaCitas = r3.locator("[data-lista-citas]");
  await listaCitas.waitFor();
  // Reagendar con 409 WA_SIN_CUPO y luego con éxito.
  const citaB = listaCitas.locator('[data-cita="72"]');
  await citaB.getByRole("button", { name: "Reagendar" }).click();
  const dlgRe = r3.getByRole("dialog", { name: "Reagendar entrevista" });
  const diaSlot = sumarDias(hoyR3, 2);
  await dlgRe.locator(`[data-dia-horarios="${diaSlot}"]`).waitFor();
  assert.equal(await dlgRe.getByRole("radio", { name: /9:30 a\.m\., Lleno/ }).isDisabled(), true, "horario lleno no se elige");
  S.respuestasCita.push({ status: 409, cuerpo: { codigo: "WA_SIN_CUPO", error: "Sin cupo" } });
  await dlgRe.locator(`[data-dia-horarios="${diaSlot}"]`).getByText("10:00 a.m.").click();
  await dlgRe.getByRole("button", { name: "Reagendar", exact: true }).click();
  await dlgRe.getByRole("alert").filter({ hasText: "Ese horario ya se llenó. Elige otro de la lista." }).waitFor();
  await dlgRe.locator(`[data-dia-horarios="${diaSlot}"]`).getByText("10:00 a.m.").click();
  await dlgRe.getByRole("button", { name: "Reagendar", exact: true }).click();
  await dlgRe.waitFor({ state: "detached" });
  const reag = pedidos.filter((x) => x.ruta === "/citas/72/reagendar");
  assert.equal(reag.length, 2);
  assert.deepEqual(reag[1].cuerpo, { inicio: `${diaSlot} 10:00` });
  // Confirmar la reagendada (si cae en esta semana) y cancelar con motivo.
  const citaD = listaCitas.locator('[data-cita="74"]');
  await citaD.getByRole("button", { name: "Cancelar" }).click();
  const dlgCan = r3.getByRole("dialog", { name: "Cancelar entrevista" });
  await dlgCan.getByRole("button", { name: "Cancelar entrevista" }).click();
  await dlgCan.getByText("Escribe el motivo; se guarda en el historial de la cita.").waitFor();
  assert.equal(cuenta((x) => x.ruta === "/citas/74/cancelar"), 0);
  await dlgCan.getByLabel("Motivo").fill("El candidato avisó que ya no puede asistir.");
  await dlgCan.getByRole("button", { name: "Cancelar entrevista" }).click();
  await dlgCan.waitFor({ state: "detached" });
  assert.deepEqual(pedidos.find((x) => x.ruta === "/citas/74/cancelar").cuerpo, { motivo: "El candidato avisó que ya no puede asistir." });
  await citaD.locator('[data-estado-cita="cancelada"]').waitFor();
  S.citas.find((c) => c.id === 72).inicio = `${hoyR3} 11:00`;
  S.citas.find((c) => c.id === 72).fin = `${hoyR3} 11:30`;
  await r3.getByRole("button", { name: "Semana siguiente" }).click();
  await r3.getByRole("button", { name: "Hoy", exact: true }).click();
  await citaB.getByRole("button", { name: "Confirmar" }).click();
  await citaB.locator('[data-estado-cita="confirmada"]').waitFor();
  assert.equal(cuenta((x) => x.ruta === "/citas/72/confirmar" && x.metodo === "POST"), 1);
  assert.equal(await listaCitas.locator('[data-cita="71"]').getByRole("link", { name: "Abrir chat" }).getAttribute("href"), "/panel/whatsapp?c=1");
  if (OUT) await r3.screenshot({ path: OUT + "/r3-04-entrevistas-lista.png" });

  // ——— 20. Bandeja: seguimiento con ventana cerrada, aprobar para agendar y agendar a mano ———
  await listaCitas.locator('[data-cita="71"]').getByRole("link", { name: "Abrir chat" }).click();
  await r3.waitForURL(/\/panel\/whatsapp\?c=1$/);
  const hiloR3 = r3.getByRole("region", { name: "Conversación" });
  await hiloR3.locator('[data-mensaje="101"]').waitFor();
  // «Agendar» del encabezado del chat abre el selector de horarios (la ficha sigue cerrada).
  const asideR3 = r3.getByRole("complementary", { name: "Ficha del candidato" });
  await hiloR3.getByRole("button", { name: "Agendar entrevista", exact: true }).click();
  const dlgAgendar = r3.getByRole("dialog", { name: "Agendar entrevista" });
  await dlgAgendar.locator(`[data-dia-horarios="${sumarDias(hoyR3, 1)}"]`).getByText("9:00 a.m.").click();
  await dlgAgendar.getByRole("button", { name: "Agendar", exact: true }).click();
  await dlgAgendar.waitFor({ state: "detached" });
  assert.deepEqual(pedidos.find((x) => x.ruta === "/citas" && x.metodo === "POST").cuerpo, { id_conversacion: 1, id_vacante: 55, inicio: `${sumarDias(hoyR3, 1)} 09:00` });
  // Con la cita, el chat la muestra fija arriba y «Agendar» pasa a «Ver entrevista agendada» (abre la ficha en la cita).
  await hiloR3.locator('[data-cita-fijada="agendada"]').waitFor();
  await hiloR3.getByRole("button", { name: "Ver entrevista agendada" }).click();
  const citaR3 = asideR3.getByRole("region", { name: "Cita de entrevista" });
  await citaR3.locator('[data-estado-cita="agendada"]').waitFor();
  assert.equal(await citaR3.getByRole("button", { name: "Agendar", exact: true }).count(), 0, "con cita activa no se ofrece agendar otra");
  assert.equal(await hiloR3.locator("[data-cita-fijada]").count(), 0, "con la ficha abierta la cita no se repite sobre el chat");
  if (OUT) await r3.screenshot({ path: OUT + "/r3-05-chat-cita.png" });
  // Aprobar para agendar: motivo de agenda (modo «aprobación» guardado arriba).
  Object.assign(S.entrevistas[3], { calificacion: "con_alerta", requiere_atencion: true, motivo_atencion: "Espera tu aprobación para agendar" });
  await r3.getByRole("button", { name: /^Carlos Méndez/ }).click();
  await hiloR3.locator("[data-banner-atencion]").filter({ hasText: "Espera tu aprobación para agendar" }).waitFor();
  await verFicha(r3, hiloR3);
  const aprobarBox = asideR3.locator("[data-aprobar-agenda]");
  await aprobarBox.waitFor();
  await aprobarBox.getByRole("button", { name: "Aprobar para agendar" }).click();
  await aprobarBox.waitFor({ state: "detached" });
  assert.equal(cuenta((x) => x.ruta === "/conversaciones/3/aprobar-agenda" && x.metodo === "POST"), 1);
  // Seguimiento con la ventana cerrada: 409 sin plantilla, 409 ventana abierta y luego enviado.
  await r3.getByRole("button", { name: "+52 442 123 4567" }).click();
  const seg = hiloR3.locator("[data-seguimiento]");
  await seg.waitFor();
  assert.match(await seg.innerText(), /Usa «Enviar seguimiento» para mandarle una plantilla aprobada/);
  S.respuestasSeguimiento.push("WA_SIN_PLANTILLA", "WA_VENTANA_ABIERTA");
  await seg.getByRole("button", { name: "Enviar seguimiento" }).click();
  assert.match(await seg.innerText(), /Se envía la plantilla de seguimiento y cuenta en las plantillas del mes\./);
  assert.equal(cuenta((x) => /\/seguimiento$/.test(x.ruta)), 0, "pide confirmación antes de gastar una plantilla");
  await seg.getByRole("button", { name: "Enviar plantilla" }).click();
  await seg.getByRole("alert").filter({ hasText: "No hay plantilla de seguimiento configurada. Escribe su nombre en «Agente → Agenda y recordatorios»; debe estar aprobada en Zernio/Meta." }).waitFor();
  await seg.getByRole("button", { name: "Enviar seguimiento" }).click();
  await seg.getByRole("button", { name: "Enviar plantilla" }).click();
  await seg.getByRole("alert").filter({ hasText: "El chat sigue abierto (el candidato escribió en las últimas 24 h): escríbele directamente, no hace falta plantilla." }).waitFor();
  await seg.getByRole("button", { name: "Enviar seguimiento" }).click();
  await seg.getByRole("button", { name: "Enviar plantilla" }).click();
  await seg.getByText("Seguimiento enviado. Cuando el candidato conteste, podrás escribirle.").waitFor();
  assert.equal(cuenta((x) => x.ruta === "/conversaciones/2/seguimiento" && x.metodo === "POST"), 3);
  assert.deepEqual(pedidos.filter((x) => x.ruta === "/conversaciones/2/seguimiento").at(-1).cuerpo, {});
  await r3.locator("[data-plantillas-mes]").getByText("5 plantillas enviadas este mes").waitFor();
  if (OUT) await r3.screenshot({ path: OUT + "/r3-06-seguimiento.png" });
  await ctxR3.close();

  // ——— 21. R3 en teléfono 390 px ———
  const movR3 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await movR3.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(movR3, reclutadora);
  const t3 = await movR3.newPage();
  t3.on("pageerror", (e) => errores.push(e.message));
  await t3.goto(base + "/panel/whatsapp?vista=entrevistas", { waitUntil: "domcontentloaded" });
  const listaT = t3.locator("[data-lista-citas]");
  await listaT.waitFor({ timeout: 30000 });
  assert.equal(await t3.locator("[data-calendario-semana]").isVisible(), false, "en teléfono no se ve el calendario");
  assert.ok(await listaT.locator("[data-cita]").count() >= 3);
  for (const b of [t3.getByRole("link", { name: "Volver a chats" }), t3.getByRole("button", { name: "Semana anterior" }),
    t3.getByRole("button", { name: "Semana siguiente" }), t3.getByLabel("Vacante", { exact: true }), t3.getByLabel("Estado"),
    listaT.getByRole("button", { name: "Reagendar" }).first(), listaT.getByRole("button", { name: "Cancelar" }).first(), listaT.getByRole("link", { name: "Abrir chat" }).first()]) {
    assert.ok(await tamano(b) >= 44, "objetivo táctil ≥44 px en Entrevistas");
  }
  assert.ok(await sinScrollHorizontal(t3), "Entrevistas sin scroll horizontal en teléfono");
  if (OUT) await t3.screenshot({ path: OUT + "/r3-07-movil-entrevistas.png", fullPage: true });
  // Reagendar a pantalla completa.
  await listaT.getByRole("button", { name: "Reagendar" }).first().tap();
  const reT = t3.getByRole("dialog", { name: "Reagendar entrevista" });
  await reT.locator("[data-horario]").first().waitFor();
  await dormir(300);
  const cajaRe = await reT.boundingBox();
  assert.ok(cajaRe.x === 0 && cajaRe.width === 390 && cajaRe.height >= 840, `reagendar a pantalla completa: ${JSON.stringify(cajaRe)}`);
  assert.ok(await tamano(reT.locator("label[data-horario]").first()) >= 44 && await tamano(reT.getByRole("button", { name: "Reagendar", exact: true })) >= 44);
  assert.ok(await reT.evaluate((el) => [...el.querySelectorAll("*")].every((n) => n.getBoundingClientRect().right <= 391)), "reagendar sin desborde horizontal");
  if (OUT) await t3.screenshot({ path: OUT + "/r3-08-movil-reagendar.png" });
  await reT.getByRole("button", { name: "Cancelar" }).tap();
  await reT.waitFor({ state: "detached" });
  // Agenda de la empresa en teléfono.
  await t3.getByRole("link", { name: "Volver a chats" }).tap();
  await t3.getByRole("list", { name: "Conversaciones" }).waitFor();
  await chipAgente(t3).tap();
  const agT3 = t3.getByRole("dialog", { name: "Configurar agente" });
  await agT3.getByRole("tab", { name: "Agenda y recordatorios" }).tap();
  const panT = agT3.getByRole("tabpanel", { name: "Agenda y recordatorios" });
  await panT.getByRole("radiogroup").waitFor();
  await dormir(300);
  for (const b of [agT3.getByRole("tab", { name: "Agenda y recordatorios" }), panT.getByRole("button", { name: "Quitar recordatorio 24 h antes" }),
    panT.getByRole("button", { name: "Insertar {nombre} (Nombre del candidato)" }), panT.getByRole("switch", { name: "Pedir que confirme su asistencia" }),
    panT.getByRole("button", { name: "Guardar agenda" })]) assert.ok(await tamano(b) >= 44, "objetivo táctil ≥44 px en la agenda de la empresa");
  assert.ok(await agT3.evaluate((el) => [...el.querySelectorAll("*")].every((n) => n.getBoundingClientRect().right <= 391)), "agenda de la empresa sin desborde horizontal");
  if (OUT) await t3.screenshot({ path: OUT + "/r3-09-movil-agenda-empresa.png" });
  await panT.getByRole("button", { name: "Cancelar" }).tap();
  await agT3.waitFor({ state: "detached" });
  // Agenda de la vacante en teléfono.
  await masOpciones(t3, "Enlaces de vacantes");
  await t3.getByRole("button", { name: "Agenda de Operador de montacargas" }).tap();
  const avT = t3.getByRole("dialog", { name: "Agenda de entrevistas" });
  await avT.locator("[data-vista-horarios] [data-horario]").first().waitFor();
  await dormir(300);
  const cajaAv = await avT.boundingBox();
  assert.ok(cajaAv.x === 0 && cajaAv.width === 390 && cajaAv.height >= 840, `agenda de vacante a pantalla completa: ${JSON.stringify(cajaAv)}`);
  for (const b of [avT.getByRole("switch", { name: "Agenda activa" }), avT.getByRole("button", { name: "Agregar horario al lunes" }), avT.getByRole("button", { name: "Quitar horario 1 del lunes" }),
    avT.getByLabel("Lunes, horario 1: desde"), avT.getByRole("button", { name: "Agregar bloqueo" }), avT.getByRole("button", { name: "Guardar agenda" })]) {
    assert.ok(await tamano(b) >= 44, "objetivo táctil ≥44 px en la agenda de la vacante");
  }
  assert.ok(await avT.evaluate((el) => [...el.querySelectorAll("*")].every((n) => n.getBoundingClientRect().right <= 391)), "agenda de la vacante sin desborde horizontal");
  if (OUT) await t3.screenshot({ path: OUT + "/r3-10-movil-agenda-vacante.png" });
  await avT.getByRole("button", { name: "Cerrar" }).tap();
  await avT.waitFor({ state: "detached" });
  // Chat con la ventana cerrada en teléfono: «Enviar seguimiento» ≥44 px.
  await t3.getByRole("dialog", { name: "Enlaces de vacantes" }).getByRole("button", { name: "Close" }).tap();
  await t3.getByRole("button", { name: "+52 442 123 4567" }).tap();
  const segT = t3.locator("[data-seguimiento]");
  await segT.waitFor();
  assert.ok(await tamano(segT.getByRole("button", { name: "Enviar seguimiento" })) >= 44);
  assert.ok(await sinScrollHorizontal(t3));
  if (OUT) await t3.screenshot({ path: OUT + "/r3-11-movil-seguimiento.png" });
  await movR3.close();

  await chatTodoEnUno(browser, errores);
  await agendaCalendario(browser, errores);
  await bandejaWhatsappWeb(browser, errores);
  await franjaAtencionWeb(browser, errores);

  assert.deepEqual(errores, [], "sin errores de JavaScript");
  exito = true;
  console.log("OK whatsapp · agenda tipo Google Calendar: menú «Entrevistas» a la vista real (sin maqueta, redirección del enlace viejo), semana/día, minicalendario, línea de ahora, horarios libres de la vacante, agendar aquí (POST /citas), arrastrar a un horario (confirmar, POST reagendar), 409 regresa la cita, selector del chat con la misma rejilla, teléfono con tira de días · chat todo-en-uno: imagen con visor (zoom, teclado, Bearer sin token en URL), nota de voz (transcripción, reproducir, velocidad), documento (descargar ?descargar=1, abrir), ubicación (Google Maps), estados descargando/fallido, subida PNG con comentario y PDF arrastrado (multipart archivo/texto, avance), pegar imagen, rechazo 16 MB+ y .exe, 413, cancelar envío, grabadora (webm/opus, cancelar, nota_voz=1, micrófono negado), cita fija (confirmar, no asistió, agendar, mover, cancelar con líneas de sistema), ofrecer horarios (tarjeta y «+», 409 WA_SIN_HORARIOS), selector sin horarios (migración, días vacíos, agenda sin configurar → Configurar agenda), teléfono ≥44 px sin desborde · lista con no leídos y control · abrir chat lo marca leído (GET) · sondeo 3 s · tomar control habilita y envía {texto} con «Enviando…» · Shift+Enter · 403/409 con texto conservado · envío rechazado (200 «fallido») y reintentos · archivos como «[Archivo: tipo]» · invitado con mismo id y otro correo no controla · devolver a IA · ventana 24 h y control ajeno · enlace de vacante copiado y 409 apagado · paginación real (pagina=2, sondeo solo página 1, sin duplicados) · enlaces de vacantes (lista, búsqueda, copiar, 409/503, vacío, hoja en teléfono) · búsqueda q · móvil a pantalla completa con volver · apagado · admin valida, muestra 409 y manda PUT · R2: agente (validación, horario, copiar lunes, palabras, 400, PUT, nombre en burbujas, cambios sin guardar) · entrevista por vacante (conteo perezoso, validación, rango número, opciones descarta/alerta excluyentes, reordenar con foco, máx. 8, 400, PUT) · filtros atencion=1 / calificacion · evaluación (puntajes, respuestas con severidad, sin respuesta) · marcar atendido · hoja <1280 · teléfono ≥44 px sin desborde · 27/11: interruptor de la bolsa (GET, PUT {publicar_bolsa}, falla y regresa, también con WhatsApp apagado) · copiar enlace de la vacante (/vacante/<slug>) · WhatsApp apagado avisa · chip de entrevistas con y sin paquete y aviso de extras · admin: paquete, extras, importe y PUT con entrevistas_incluidas · bolsa pública: /vacantes/filter y tira con ?bolsa=1 (vacía se oculta) · R3: agenda de la empresa (quién agenda, anticipación, días, horarios, recordatorios en minutos, plantillas, mensajes con marcadores en el cursor, vista previa, marcador desconocido, restaurar, 400, PUT) · agenda de la vacante (cupo, varios rangos con empalme, copiar a todos, bloqueo, override null vs valor, vista previa /horarios antes y después de guardar) · Entrevistas (calendario semanal con empalmes, filtros estado/vacante, lista, asistió, reagendar con 409 WA_SIN_CUPO, cancelar con motivo, confirmar, abrir chat) · agendar a mano y cita en el panel · aprobar para agendar · seguimiento con confirmación y 409 WA_SIN_PLANTILLA / WA_VENTANA_ABIERTA · plantillas del mes · teléfono: lista, hojas a pantalla completa, ≥44 px, sin desborde");
} catch (e) { if (e?.message !== "__solo__") throw e; } finally { await browser.close(); next.kill(); if (!exito) process.exitCode = 1; }

// ——— 24. Bandeja estilo WhatsApp Web (maqueta aprobada 25/11/2026): pantalla completa, menú «Acciones», ficha y teléfono ———
// ——— wa2: franja «requiere atención» arriba de la lista (1440 y 390) ———
// Contraste WCAG de dos colores rgb(a) calculados por el navegador.
function contrasteRgb(a, b) {
  const lum = (c) => {
    const [r, g, bl] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
function estadoFranja() {
  S = estadoInicial();
  S.agente.activo = true;
  // Ana (IA) pidió hablar con una persona; Candidato 6 (IA) espera aprobar agenda; Carlos (tomado por Pedro) no cuenta.
  S.entrevistas[1] = { etapa: "preguntas", consentimiento: true, nombre: "Ana Ruiz", calificacion: "con_alerta", resumen: "", puntajes: null,
    requiere_atencion: true, motivo_atencion: "pidió hablar con una persona", pregunta_actual: null, respuestas: [{ texto_pregunta: "¿Cuántos años tienes?", respuesta: "55", severidad: "alerta" }] };
  S.entrevistas[1006] = { ...S.entrevistas[1006], requiere_atencion: true, motivo_atencion: "aprobar agenda" };
}
async function franjaAtencionWeb(browser, errores) {
  estadoFranja();
  const OUTF = process.env.CAPTURAS_FRANJA || OUT;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctx, reclutadora);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  const franja = page.locator("[data-franja-atencion]");
  await franja.waitFor({ timeout: 30000 });
  const columna = page.getByRole("region", { name: "Chats" });
  assert.equal(await columna.locator("[data-franja-atencion]").count(), 1, "la franja va en la columna de chats");
  assert.equal(await franja.getAttribute("role"), "status");
  assert.equal(await franja.getAttribute("data-franja-atencion"), "2", "Carlos (tomado por Pedro) no cuenta");
  const textoFranja = async () => (await franja.innerText()).replace(/\n+/g, "\n").replace(/\n ·/g, " ·");
  assert.match(await textoFranja(), /^2 candidatos necesitan atención\nAna Ruiz pidió hablar con una persona · y 1 más\nVer$/);
  assert.doesNotMatch(await franja.innerText(), /\p{Extended_Pictographic}/u, "sin emoji en la interfaz (ícono lucide)");
  assert.equal(await franja.locator("svg.lucide").count(), 1);
  // Arriba de la lista: antes del buscador y de la primera fila.
  const yFranja = (await franja.boundingBox()).y;
  assert.ok(yFranja < (await page.getByRole("searchbox", { name: "Buscar conversación" }).boundingBox()).y, "arriba de la lista");
  const ver = franja.getByRole("button");
  assert.ok(await tamano(ver) >= 44, "«Ver» de 44 px");
  // Tailwind 4 da los colores en oklch: el navegador los pasa a sRGB pintándolos en un canvas.
  const colores = await franja.evaluate((el) => {
    const lienzo = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const rgb = (c) => { lienzo.clearRect(0, 0, 1, 1); lienzo.fillStyle = c; lienzo.fillRect(0, 0, 1, 1); const [r, g, b] = lienzo.getImageData(0, 0, 1, 1).data; return `rgb(${r}, ${g}, ${b})`; };
    const b = el.querySelector("button");
    return { texto: rgb(getComputedStyle(el).color), fondo: rgb(getComputedStyle(el).backgroundColor), boton: rgb(getComputedStyle(b).color) };
  });
  assert.ok(contrasteRgb(colores.texto, colores.fondo) >= 4.5, `contraste del texto: ${JSON.stringify(colores)}`);
  assert.ok(contrasteRgb(colores.boton, colores.fondo) >= 4.5, "contraste del botón");
  console.log(`Franja de atención: contraste ${contrasteRgb(colores.texto, colores.fondo).toFixed(2)}:1 (${colores.texto} sobre ${colores.fondo})`);
  const caja = await franja.boundingBox();
  assert.ok(caja.height <= 64, `compacta: ${caja.height}px`);
  if (OUTF) await page.screenshot({ path: OUTF + "/franja-01-escritorio.png" });

  // «Ver» con varios → filtra «Atención» (la lista pide atencion=1); con el filtro puesto, «Abrir chat» abre el primero.
  await ver.click();
  await page.getByRole("button", { name: "Atención", pressed: true }).waitFor();
  for (let i = 0; i < 50 && !pedidos.some((x) => x.ruta === "/conversaciones" && /atencion=1/.test(x.params)); i++) await dormir(100);
  assert.ok(pedidos.some((x) => x.ruta === "/conversaciones" && /atencion=1/.test(x.params)));
  await franja.getByRole("button", { name: /^Abrir el chat: Ana Ruiz pidió hablar con una persona$/ }).click();
  await page.waitForURL(/\?c=1$/);
  const hilo = page.getByRole("region", { name: /Conversación con Ana Ruiz/ });
  await hilo.locator("[data-banner-atencion]").waitFor();
  if (OUTF) await page.screenshot({ path: OUTF + "/franja-02-abierto.png" });
  // «Marcar como atendido» → la franja baja a 1 al momento (sin esperar al sondeo).
  await hilo.getByRole("button", { name: "Marcar como atendido" }).click();
  await page.locator('[data-franja-atencion="1"]').waitFor({ timeout: 3000 });
  assert.match(await textoFranja(), /^1 candidato necesita atención\nCandidato 6 espera que apruebes su entrevista\nAbrir chat$/);
  await franja.getByRole("button").click();
  await page.waitForURL(/\?c=1006$/);
  // Tomar el control también la quita: ya la atiende alguien.
  await page.getByRole("region", { name: /Conversación con Candidato 6/ }).getByRole("button", { name: "Tomar control", exact: true }).first().click();
  await franja.waitFor({ state: "detached", timeout: 3000 });
  if (OUTF) await page.screenshot({ path: OUTF + "/franja-03-sin-pendientes.png" });
  await ctx.close();

  // Teléfono (390): visible arriba de la lista, sin scroll horizontal, «Ver» de 44 px y texto recortado sin desbordar.
  estadoFranja();
  S.conversaciones[0].contacto = { ...S.conversaciones[0].contacto, nombre: "Ana Guadalupe Ruiz de la Garza Montemayor" };
  const movil = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await movil.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(movil, reclutadora);
  const tel = await movil.newPage();
  tel.on("pageerror", (e) => errores.push(e.message));
  await tel.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  const franjaT = tel.locator("[data-franja-atencion]");
  await franjaT.waitFor({ timeout: 30000 });
  assert.ok(await sinScrollHorizontal(tel), "sin scroll horizontal a 390");
  const cajaT = await franjaT.boundingBox();
  assert.ok(cajaT.x >= 12 && cajaT.x + cajaT.width <= 390 - 12, `margen de 12 px: ${JSON.stringify(cajaT)}`);
  assert.ok(await tamano(franjaT.getByRole("button")) >= 44);
  assert.ok(await franjaT.locator("[data-franja-detalle]").evaluate((el) => el.scrollWidth > el.clientWidth), "el detalle largo se recorta con «…»");
  assert.match(await franjaT.innerText(), /y 1 más/, "«y 1 más» siempre se ve");
  if (OUTF) await tel.screenshot({ path: OUTF + "/franja-04-movil.png" });
  await franjaT.getByRole("button").tap();
  await tel.getByRole("button", { name: "Atención", pressed: true }).waitFor();
  if (OUTF) await tel.screenshot({ path: OUTF + "/franja-05-movil-filtro.png" });
  await movil.close();
}

async function bandejaWhatsappWeb(browser, errores) {
  S = estadoInicial();
  S.agente.activo = true; // como en la maqueta: «Agente encendido»
  const OUTB = process.env.CAPTURAS_BANDEJA || OUT;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City", permissions: ["clipboard-read", "clipboard-write"] });
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctx, reclutadora);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  const lista = page.getByRole("list", { name: "Conversaciones" });
  await lista.waitFor({ timeout: 30000 });
  // Sin encabezado grande ni pestañas: «Chats» es el título; el menú de ADAMIA queda como riel de iconos.
  assert.equal(await page.getByRole("heading", { name: "Conversaciones de WhatsApp" }).count(), 0, "sin encabezado grande");
  assert.equal(await page.getByRole("navigation", { name: "Secciones de WhatsApp" }).count(), 0, "sin franja de pestañas");
  assert.equal(await page.getByRole("heading", { level: 1, name: "Chats" }).count(), 1);
  await page.locator('[data-slot="sidebar"][data-state="collapsed"]').waitFor({ timeout: 5000 });
  // Alto completo a 1440×900: la página no se desplaza; cada columna tiene su propio scroll.
  const altoCompleto = async () => page.evaluate(() => {
    const raiz = document.querySelector("[data-bandeja-completa]").getBoundingClientRect();
    return { pagina: document.scrollingElement.scrollHeight - window.innerHeight, abajo: Math.round(raiz.bottom), alto: Math.round(raiz.height) };
  });
  let medida = await altoCompleto();
  assert.ok(medida.pagina <= 1 && medida.abajo >= 880 && medida.abajo <= 900 && medida.alto >= 800, `bandeja a todo el alto sin scroll de página: ${JSON.stringify(medida)}`);
  const columna = page.getByRole("region", { name: "Chats" });
  const anchoColumna = (await columna.boundingBox()).width;
  assert.ok(anchoColumna >= 395 && anchoColumna <= 405, `columna de chats de ~400 px: ${anchoColumna}`);
  assert.ok(await lista.evaluate((ul) => ul.parentElement.scrollHeight > ul.parentElement.clientHeight), "la lista se desplaza por dentro");
  // Columna: agente, Entrevistas, ⋮ con salud, enlaces y configurar agente; pastillas; pie con número y conteos.
  await page.locator('[data-chip-agente="encendido"]').filter({ hasText: "Agente encendido" }).waitFor();
  assert.equal(await columna.getByRole("link", { name: "Entrevistas" }).getAttribute("href"), "/panel/whatsapp?vista=entrevistas");
  await columna.getByRole("button", { name: "Más opciones" }).click();
  assert.deepEqual(await page.getByRole("menu", { name: "Más opciones" }).getByRole("menuitem").allInnerTexts(), ["Salud del agente", "Base de conocimiento", "Enlaces de vacantes", "Configurar agente"]);
  await page.keyboard.press("Escape");
  assert.deepEqual(await columna.getByRole("group", { name: "Filtrar conversaciones" }).getByRole("button").allInnerTexts(), ["Todos", "Atención", "Califica", "Con alerta", "No califica", "Incompleto"]);
  assert.equal(await columna.getByRole("combobox", { name: "Etapa" }).count(), 1, "etapa como filtro compacto");
  assert.match(await columna.locator("footer").innerText(), /número compartido de ADAMIA · \+52 55 9876 5432 · 12 conversaciones este mes/);
  if (OUTB) await page.screenshot({ path: OUTB + "/bandeja-01-lista.png" });

  // Conversación: encabezado compacto, la IA atiende, ficha cerrada por defecto.
  await page.getByRole("button", { name: /^Ana Ruiz/ }).click();
  const hilo = page.getByRole("region", { name: "Conversación con Ana Ruiz" });
  await hilo.locator('[data-mensaje="102"]').waitFor();
  assert.equal(await hilo.locator("[data-quien-atiende]").innerText(), "La IA atiende");
  assert.match(await hilo.locator("[data-subtitulo-chat]").innerText(), /^Operador de montacargas · \+52 55 1234 5678/);
  for (const nombre of ["Tomar control", "Agendar entrevista", "Acciones"]) assert.equal(await hilo.getByRole("button", { name: nombre, exact: true }).isVisible(), true, `botón ${nombre} en el encabezado`);
  assert.equal(await hilo.getByRole("button", { name: "Tomar control para escribir" }).isVisible(), true, "con la IA atendiendo, aviso + Tomar control abajo");
  assert.equal(await hilo.getByRole("textbox", { name: "Mensaje" }).count(), 0);
  assert.equal(await page.getByRole("complementary", { name: "Ficha del candidato" }).count(), 0, "ficha cerrada por defecto");
  const colores = await hilo.evaluate((el) => {
    const fondo = getComputedStyle(el.querySelector("[data-hilo-scroll]")).backgroundColor || getComputedStyle(el).backgroundColor;
    const globo = (id) => getComputedStyle(el.querySelector(`[data-mensaje="${id}"] > div`)).backgroundColor;
    return { fondo: getComputedStyle(el).backgroundColor, entrante: globo(101), saliente: globo(102), firma: el.querySelector('[data-mensaje="102"] p').textContent, fondoScroll: fondo };
  });
  assert.deepEqual([colores.fondo, colores.entrante, colores.saliente, colores.firma], ["rgb(239, 234, 226)", "rgb(255, 255, 255)", "rgb(217, 253, 211)", "Asistente IA"], `globos estilo WhatsApp: ${JSON.stringify(colores)}`);
  medida = await altoCompleto();
  assert.ok(medida.pagina <= 1 && medida.abajo >= 880, `con el chat abierto tampoco hay scroll de página: ${JSON.stringify(medida)}`);
  // Menú «Acciones» con sus opciones (no hay acción de «no califica» en el API: no se inventa).
  await hilo.getByRole("button", { name: "Acciones", exact: true }).click();
  const menu = page.getByRole("menu", { name: "Acciones de la conversación" });
  await menu.waitFor();
  assert.deepEqual((await menu.getByRole("menuitem").allInnerTexts()).map((t) => t.trim()),
    ["Ver ficha del candidato", "Agendar entrevista", "Ofrecer horarios", "Mover etapa del proceso", "Copiar enlace de WhatsApp de la vacante"]);
  await dormir(300); // termina la animación de entrada
  if (OUTB) await page.screenshot({ path: OUTB + "/bandeja-02-escritorio-menu.png" });
  await menu.getByRole("menuitem", { name: "Copiar enlace de WhatsApp de la vacante" }).click();
  const dlgEnlace = page.getByRole("dialog", { name: "Enlace de WhatsApp" });
  await dlgEnlace.getByRole("textbox", { name: "Enlace de WhatsApp de la vacante" }).waitFor();
  assert.equal(await dlgEnlace.getByRole("textbox").inputValue(), ENLACE);
  await dlgEnlace.getByRole("button", { name: "Copiar enlace" }).click();
  await dlgEnlace.getByRole("button", { name: "Copiado" }).waitFor();
  await page.keyboard.press("Escape");
  await dlgEnlace.waitFor({ state: "detached" });
  // «Agendar» del encabezado: abre el selector de horarios aunque la ficha esté cerrada.
  await hilo.getByRole("button", { name: "Agendar entrevista", exact: true }).click();
  const dlgAg = page.getByRole("dialog", { name: "Agendar entrevista" });
  await dlgAg.waitFor();
  await dlgAg.getByRole("button", { name: "Cancelar" }).click();
  await dlgAg.waitFor({ state: "detached" });
  // La ficha se abre al tocar el nombre, a la derecha (380 px), y se cierra con «Cerrar ficha» o Escape.
  await hilo.getByRole("button", { name: "Ver ficha de Ana Ruiz" }).click();
  const ficha = page.getByRole("complementary", { name: "Ficha del candidato" });
  await ficha.waitFor();
  const cajaFicha = await ficha.boundingBox();
  assert.ok(Math.round(cajaFicha.width) === 380 && Math.round(cajaFicha.x + cajaFicha.width) === 1440 - 8, `ficha a la derecha de 380 px: ${JSON.stringify(cajaFicha)}`);
  assert.match(await ficha.innerText(), /Ana Ruiz[\s\S]*\+52 55 1234 5678[\s\S]*Vacante[\s\S]*Operador de montacargas[\s\S]*Proceso de selección[\s\S]*Entrevista[\s\S]*Sin entrevista agendada/i);
  assert.equal(await hilo.getByRole("button", { name: "Ver ficha de Ana Ruiz" }).getAttribute("aria-expanded"), "true");
  medida = await altoCompleto();
  assert.ok(medida.pagina <= 1, `con la ficha abierta tampoco hay scroll de página: ${JSON.stringify(medida)}`);
  if (OUTB) await page.screenshot({ path: OUTB + "/bandeja-03-ficha.png" });
  await ficha.getByRole("button", { name: "Cerrar ficha" }).click();
  await ficha.waitFor({ state: "hidden" });
  // «Mover etapa del proceso» abre la ficha en el proceso.
  await hilo.getByRole("button", { name: "Acciones", exact: true }).click();
  await page.getByRole("menuitem", { name: "Mover etapa del proceso" }).click();
  await ficha.getByRole("region", { name: "Proceso de selección" }).waitFor();
  // El foco pasa a la ficha (botón «Cerrar ficha»); Escape la cierra.
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Cerrar ficha");
  await page.getByRole("menu").waitFor({ state: "detached" });
  await page.keyboard.press("Escape");
  await ficha.waitFor({ state: "hidden" });
  // Tomar control: el cuadro aparece; «Devolver a la IA» en el encabezado.
  await hilo.getByRole("button", { name: "Tomar control", exact: true }).click();
  await hilo.getByRole("button", { name: "Devolver a la IA" }).waitFor();
  assert.equal(await hilo.locator("[data-quien-atiende]").innerText(), "Tú tienes el control");
  await hilo.getByRole("textbox", { name: "Mensaje" }).waitFor();
  if (OUTB) await page.screenshot({ path: OUTB + "/bandeja-04-control.png" });
  await hilo.getByRole("button", { name: "Devolver a la IA" }).click();
  await hilo.getByRole("button", { name: "Tomar control", exact: true }).waitFor();
  // Entrevistas y Salud del agente ocupan el lugar de la conversación; «Cerrar» vuelve a la bandeja.
  await columna.getByRole("link", { name: "Entrevistas" }).click();
  await page.waitForURL(/\?vista=entrevistas$/);
  await page.locator("[data-vista-entrevistas]").waitFor();
  assert.equal(await columna.isVisible(), true, "la lista sigue a la vista");
  assert.equal(await columna.getByRole("link", { name: "Entrevistas" }).getAttribute("aria-current"), "page");
  medida = await altoCompleto();
  assert.ok(medida.pagina <= 1, `Entrevistas sin scroll de página: ${JSON.stringify(medida)}`);
  if (OUTB) await page.screenshot({ path: OUTB + "/bandeja-05-entrevistas.png" });
  await columna.getByRole("button", { name: "Más opciones" }).click();
  await page.getByRole("menuitem", { name: "Salud del agente" }).click();
  await page.waitForURL(/\?vista=salud$/);
  await page.locator("[data-vista-salud]").waitFor();
  if (OUTB) await page.screenshot({ path: OUTB + "/bandeja-06-salud.png" });
  await page.getByRole("link", { name: "Cerrar salud del agente" }).click();
  await page.waitForURL(/\/panel\/whatsapp$/);
  await page.getByText("Elige una conversación").waitFor();
  // El riel del menú se puede abrir: la preferencia sigue siendo del usuario.
  await page.getByRole("button", { name: "Toggle Sidebar" }).first().click();
  await page.locator('[data-slot="sidebar"][data-state="expanded"]').waitFor();
  assert.equal(await page.getByRole("button", { name: "Conversaciones (WhatsApp)" }).count(), 1, "entrada en el menú de reclutamiento");
  await page.getByRole("button", { name: "Toggle Sidebar" }).first().click();
  await page.locator('[data-slot="sidebar"][data-state="collapsed"]').waitFor();
  await ctx.close();

  // Teléfono 390 px: lista → chat a pantalla completa → ficha a pantalla completa → volver.
  const movil = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await movil.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(movil, reclutadora);
  const tel = await movil.newPage();
  tel.on("pageerror", (e) => errores.push(e.message));
  await tel.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await tel.getByRole("list", { name: "Conversaciones" }).waitFor({ timeout: 30000 });
  assert.ok(await sinScrollHorizontal(tel), "lista sin scroll horizontal a 390");
  for (const b of [tel.getByRole("button", { name: "Más opciones" }), tel.getByRole("link", { name: "Entrevistas" }), tel.locator("[data-chip-agente]"), tel.getByRole("button", { name: /^Ana Ruiz/ })]) {
    assert.ok(await tamano(b) >= 44, "objetivo táctil ≥44 px en la lista");
  }
  if (OUTB) await tel.screenshot({ path: OUTB + "/bandeja-07-movil-lista.png" });
  await tel.getByRole("button", { name: /^Ana Ruiz/ }).tap();
  await tel.waitForURL(/\?c=1$/);
  const hiloT = tel.getByRole("region", { name: "Conversación con Ana Ruiz" });
  await hiloT.locator('[data-mensaje="102"]').waitFor();
  const cajaHilo = await hiloT.boundingBox();
  assert.ok(cajaHilo.x === 0 && cajaHilo.width === 390 && cajaHilo.height >= 840, `chat a pantalla completa: ${JSON.stringify(cajaHilo)}`);
  assert.equal(await tel.getByRole("list", { name: "Conversaciones" }).isVisible(), false);
  assert.match(await hiloT.locator("[data-quien-atiende-movil]").innerText(), /^La IA atiende · Operador de montacargas$/);
  for (const b of [hiloT.getByRole("button", { name: "Volver a la lista" }), hiloT.getByRole("button", { name: "Acciones", exact: true }), hiloT.getByRole("button", { name: "Tomar control para escribir" }), hiloT.getByRole("button", { name: "Ver ficha de Ana Ruiz" })]) {
    assert.ok(await tamano(b) >= 44, `objetivo táctil ≥44 px en el chat: ${await b.getAttribute("aria-label")}`);
  }
  assert.ok(await sinScrollHorizontal(tel), "chat sin scroll horizontal a 390");
  if (OUTB) await tel.screenshot({ path: OUTB + "/bandeja-08-movil-chat.png" });
  await hiloT.getByRole("button", { name: "Acciones", exact: true }).tap();
  const menuT = tel.getByRole("menu", { name: "Acciones de la conversación" });
  await menuT.waitFor();
  await dormir(300); // termina la animación de entrada (zoom 95 %)
  const cajaMenu = await menuT.boundingBox();
  assert.ok(cajaMenu.x >= 0 && cajaMenu.x + cajaMenu.width <= 390, `menú dentro de la pantalla: ${JSON.stringify(cajaMenu)}`);
  for (const item of await menuT.getByRole("menuitem").all()) assert.ok(await tamano(item) >= 44, "opción del menú ≥44 px");
  if (OUTB) await tel.screenshot({ path: OUTB + "/bandeja-09-movil-acciones.png" });
  await menuT.getByRole("menuitem", { name: "Ver ficha del candidato" }).tap();
  const fichaT = tel.getByRole("complementary", { name: "Ficha del candidato" });
  await fichaT.waitFor();
  await tel.getByRole("menu").waitFor({ state: "detached" });
  const cajaF = await fichaT.boundingBox();
  assert.ok(cajaF.x === 0 && cajaF.width === 390 && cajaF.height >= 840, `ficha a pantalla completa: ${JSON.stringify(cajaF)}`);
  assert.ok(await tamano(fichaT.getByRole("button", { name: "Cerrar ficha" })) >= 44);
  assert.ok(await fichaT.evaluate((el) => [...el.querySelectorAll("*")].every((n) => n.getBoundingClientRect().right <= 391)), "ficha sin desborde horizontal");
  if (OUTB) await tel.screenshot({ path: OUTB + "/bandeja-10-movil-ficha.png" });
  await fichaT.getByRole("button", { name: "Cerrar ficha" }).tap();
  await fichaT.waitFor({ state: "hidden" });
  // Con el control, el cuadro para escribir queda abajo; al encogerse la ventana (teclado) sigue a la vista.
  await hiloT.getByRole("button", { name: "Tomar control para escribir" }).tap();
  const cuadro = hiloT.getByRole("textbox", { name: "Mensaje" });
  await cuadro.waitFor();
  const enviarT = hiloT.getByRole("button", { name: "Enviar mensaje" });
  let cajaEnviar = await enviarT.boundingBox();
  assert.ok(cajaEnviar.y + cajaEnviar.height <= 844 && cajaEnviar.y > 760, `cuadro abajo: ${JSON.stringify(cajaEnviar)}`);
  await tel.setViewportSize({ width: 390, height: 480 });
  await cuadro.tap();
  await dormir(200);
  cajaEnviar = await enviarT.boundingBox();
  const cajaCuadro = await cuadro.boundingBox();
  assert.ok(cajaEnviar.y + cajaEnviar.height <= 480 && cajaCuadro.y + cajaCuadro.height <= 480, `con el teclado el cuadro sigue a la vista: ${JSON.stringify(cajaCuadro)}`);
  if (OUTB) await tel.screenshot({ path: OUTB + "/bandeja-11-movil-teclado.png" });
  await tel.setViewportSize({ width: 390, height: 844 });
  if (OUTB) await tel.screenshot({ path: OUTB + "/bandeja-12-movil-control.png" });
  await hiloT.getByRole("button", { name: "Acciones", exact: true }).tap();
  await tel.getByRole("menuitem", { name: "Devolver a la IA" }).tap();
  await hiloT.getByRole("button", { name: "Tomar control para escribir" }).waitFor();
  await hiloT.getByRole("button", { name: "Volver a la lista" }).tap();
  await tel.waitForURL(/\/panel\/whatsapp$/);
  await tel.getByRole("list", { name: "Conversaciones" }).waitFor({ state: "visible" });
  assert.equal(await tel.getByRole("region", { name: /^Conversación/ }).count(), 0);
  // Entrevistas a pantalla completa con «‹».
  await tel.getByRole("link", { name: "Entrevistas" }).tap();
  await tel.locator("[data-lista-citas], [data-sin-citas]").first().waitFor();
  assert.ok(await tamano(tel.getByRole("link", { name: "Volver a chats" })) >= 44);
  assert.ok(await sinScrollHorizontal(tel), "Entrevistas sin scroll horizontal a 390");
  await tel.getByRole("link", { name: "Volver a chats" }).tap();
  await tel.getByRole("list", { name: "Conversaciones" }).waitFor({ state: "visible" });
  await movil.close();
  console.log("OK bandeja estilo WhatsApp Web");
}

// ——— 22. Chat todo-en-uno: archivos, envío multipart, grabadora, cita fija, «Ofrecer horarios» y selector sin horarios ———
// MediaRecorder simulado (solo «graba» webm/opus, para probar la segunda opción) y micrófono que se puede negar.
function GRABADORA_FALSA() {
  class GrabadoraFalsa {
    static isTypeSupported(t) { return t === "audio/webm;codecs=opus"; }
    constructor(stream, opciones) { this.stream = stream; this.mimeType = opciones?.mimeType || "audio/webm"; this.state = "inactive"; window.__grabadora = this; }
    start() { this.state = "recording"; }
    stop() {
      this.state = "inactive";
      setTimeout(() => {
        this.ondataavailable?.({ data: new Blob([new Uint8Array(2048).fill(7)], { type: this.mimeType }) });
        this.onstop?.();
      }, 10);
    }
  }
  window.MediaRecorder = GrabadoraFalsa;
  window.__pistasDetenidas = 0;
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
    getUserMedia: async () => {
      if (window.__negarMicro) throw new DOMException("Permiso negado", "NotAllowedError");
      return { getTracks: () => [{ stop: () => { window.__pistasDetenidas += 1; } }] };
    },
  } });
}

async function chatTodoEnUno(browser, errores) {
  S = estadoInicial();
  const hoy = hoyMx();
  const manana = sumarDias(hoy, 1);
  const vac55 = { id_vacante: 55, titulo: "Operador de montacargas" };
  const adj = (id, extra) => ({ id, url: `/reclutamiento/whatsapp/conversaciones/4/adjuntos/${id}`, estado: "listo", transcripcion: null, lat: null, lng: null, nota_voz: false, ...extra });
  S.conversaciones.unshift({ id: 4, id_empresa: 10, contacto: { id: 504, nombre: "Rosa Torres", telefono: "5215566667777" }, vacante: vac55,
    modo: "humano", control: { id_usuario: 7, nombre: "Laura Gómez", correo: "laura@uniline.mx" }, no_leidos: 1,
    ultimo_mensaje: { texto: "", direccion: "entrante", creado_en: hace(1), adjunto: { tipo: "audio", nota_voz: true } }, ultimo_entrante_en: hace(1), ventana_abierta: true });
  const ent = (id, tipo, adjunto, texto = "") => ({ id, direccion: "entrante", actor: "candidato", tipo, texto, estado: "recibido", error: null, creado_en: hace(10 - id + 400), usuario: null, adjunto });
  S.mensajes[4] = [
    ent(401, "imagen", adj(1, { tipo: "imagen", mime: "image/png", nombre: "ine.png", tamano: 120000 }), "Mi INE"),
    ent(402, "audio", adj(2, { tipo: "audio", mime: "audio/ogg", nombre: "nota.ogg", tamano: 24044, nota_voz: true, transcripcion: "Hola, sí puedo ir el martes a la entrevista." })),
    ent(403, "documento", adj(3, { tipo: "documento", mime: "application/pdf", nombre: "cv.pdf", tamano: Math.round(2.3 * 1024 * 1024) })),
    ent(404, "ubicacion", adj(4, { tipo: "ubicacion", mime: null, nombre: null, tamano: null, url: null, lat: 25.6866, lng: -100.3161 }), "Aquí vivo"),
    ent(405, "video", adj(5, { tipo: "video", mime: "video/mp4", nombre: "video.mp4", tamano: 900000, estado: "descargando" })),
    ent(406, "imagen", adj(6, { tipo: "imagen", mime: "image/jpeg", nombre: "foto.jpg", tamano: 50000, estado: "fallido" })),
  ];
  const cita = { id: 90, inicio: `${hoy} 12:00`, fin: `${hoy} 12:30`, estado: "agendada", origen: "agente", modalidad: "presencial", lugar: "Av. Industrial 120, Apodaca", vacante: vac55,
    candidato: { nombre: "Rosa Torres", telefono: "5215566667777" }, id_conversacion: 4 };
  S.citas.push(cita);
  S.citasPorConv[4] = cita;
  S.reagendarComoServidor = true;

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City", acceptDownloads: true });
  await ctx.addInitScript(GRABADORA_FALSA);
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctx, reclutadora);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  if (process.env.DEPURAR) { page.on("console", (m) => console.log("consola:", m.text())); page.on("requestfailed", (r) => console.log("falló:", r.method(), r.url(), r.failure()?.errorText)); }
  await page.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  const lista = page.getByRole("list", { name: "Conversaciones" });
  await lista.waitFor({ timeout: 30000 });
  assert.match(await page.getByRole("button", { name: /^Rosa Torres/ }).innerText(), /Nota de voz/, "la lista dice «Nota de voz» en lugar de [Archivo]");
  await page.getByRole("button", { name: /^Rosa Torres/ }).click();
  const hilo = page.getByRole("region", { name: "Conversación" });
  await hilo.locator('[data-mensaje="401"]').waitFor();

  // Imagen: miniatura con el token en el encabezado (nunca en la URL), visor con zoom y teclado.
  const mini = hilo.locator('[data-mensaje="401"] img[data-miniatura]');
  await hilo.locator('[data-mensaje="401"]').scrollIntoViewIfNeeded(); // las miniaturas se piden al acercarse a la vista
  await mini.waitFor();
  await page.waitForFunction(() => document.querySelector('[data-mensaje="401"] img[data-miniatura]')?.naturalWidth === 240);
  assert.match(await hilo.locator('[data-mensaje="401"]').innerText(), /Mi INE/, "el comentario va bajo la imagen");
  const dImg = S.descargas.find((d) => d.id === "1");
  assert.ok(dImg && /^Bearer .+/.test(dImg.token) && !/token/i.test(dImg.params), "blob con Bearer y sin token en la URL");
  assert.ok(await mini.evaluate((el) => el.src.startsWith("blob:")), "la miniatura usa una URL local");
  await hilo.getByRole("button", { name: "Ver imagen ine.png" }).focus();
  await page.keyboard.press("Enter");
  const visor = page.getByRole("dialog", { name: "ine.png" });
  await visor.waitFor();
  assert.equal(await visor.getByText("100%").count(), 1);
  await visor.getByRole("button", { name: "Acercar" }).click();
  await visor.getByText("150%").waitFor();
  await page.keyboard.press("+");
  await visor.getByText("200%").waitFor();
  await page.keyboard.press("-");
  await visor.getByText("150%").waitFor();
  assert.equal(await visor.getByRole("button", { name: "Descargar ine.png" }).count(), 1, "el visor ofrece descargar");
  if (OUT) await page.screenshot({ path: OUT + "/chat-02-visor-imagen.png" });
  await page.keyboard.press("Escape");
  await visor.waitFor({ state: "detached" });

  // Nota de voz: etiqueta, transcripción plegable, reproducir (blob simulado) y velocidad.
  const audio = hilo.locator('[data-mensaje="402"] [data-audio]');
  assert.match(await audio.innerText(), /Nota de voz/);
  assert.equal(await audio.locator("[data-transcripcion]").isVisible(), false, "la transcripción empieza plegada");
  await audio.getByRole("button", { name: "Transcripción" }).click();
  assert.equal(await audio.getByRole("button", { name: "Ocultar transcripción" }).getAttribute("aria-expanded"), "true");
  assert.equal(await audio.locator("[data-transcripcion]").innerText(), "Hola, sí puedo ir el martes a la entrevista.");
  assert.equal(S.descargas.filter((d) => d.id === "2").length, 0, "el audio no se descarga hasta reproducirlo");
  await audio.getByRole("button", { name: "Reproducir nota de voz" }).click();
  await page.waitForFunction(() => (document.querySelector('[data-mensaje="402"] audio')?.currentTime ?? 0) > 0.2, null, { timeout: 15000 });
  assert.equal(await audio.getByRole("button", { name: "Pausar nota de voz" }).count(), 1);
  await audio.getByRole("button", { name: "Velocidad 1x" }).click();
  await audio.getByRole("button", { name: "Velocidad 1.5x" }).waitFor();
  assert.equal(await audio.locator("audio").evaluate((el) => el.playbackRate), 1.5);
  await audio.getByRole("button", { name: "Velocidad 1.5x" }).click();
  await audio.getByRole("button", { name: "Velocidad 2x" }).waitFor();
  await audio.getByRole("button", { name: "Pausar nota de voz" }).click();
  await audio.getByRole("button", { name: "Reproducir nota de voz" }).waitFor();
  assert.match(await audio.locator("[data-tiempo-audio]").innerText(), /^0:0\d \/ 0:03$/);

  // Documento: tarjeta con tipo y tamaño; «Descargar» pide ?descargar=1 y guarda con su nombre.
  const doc = hilo.locator('[data-mensaje="403"] [data-documento]');
  assert.match(await doc.innerText(), /cv\.pdf[\s\S]*PDF · 2\.3 MB[\s\S]*Abrir[\s\S]*Descargar/);
  const [descarga] = await Promise.all([page.waitForEvent("download"), doc.getByRole("button", { name: "Descargar cv.pdf" }).click()]);
  assert.equal(descarga.suggestedFilename(), "cv.pdf");
  assert.ok(S.descargas.some((d) => d.id === "3" && d.params === "?descargar=1"), "descarga como adjunto");
  const [ventana] = await Promise.all([ctx.waitForEvent("page"), doc.getByRole("button", { name: "Abrir cv.pdf" }).click()]);
  // «Abrir» abre una ventana en el clic y la lleva al archivo local (en headless no hay visor de PDF: se queda en blanco y descarga).
  for (let i = 0; i < 50 && !S.descargas.some((d) => d.id === "3" && d.params === ""); i++) await dormir(100);
  assert.ok(S.descargas.some((d) => d.id === "3" && d.params === ""), "«Abrir» pide el archivo (sin ?descargar=1)");
  await ventana.close().catch(() => {});

  // Ubicación con enlace a Google Maps (sin mapa incrustado) y estados del archivo.
  const ubi = hilo.locator('[data-mensaje="404"] [data-ubicacion]');
  const maps = ubi.getByRole("link", { name: "Abrir en Google Maps" });
  assert.equal(await maps.getAttribute("href"), "https://www.google.com/maps?q=25.6866,-100.3161");
  assert.equal(await maps.getAttribute("target"), "_blank");
  assert.match(await ubi.innerText(), /25\.68660, -100\.31610/);
  assert.match(await hilo.locator('[data-mensaje="404"]').innerText(), /Aquí vivo/);
  assert.match(await hilo.locator('[data-mensaje="405"]').innerText(), /Descargando…/);
  assert.match(await hilo.locator('[data-mensaje="406"]').innerText(), /No se pudo descargar el archivo/);
  assert.equal(S.descargas.filter((d) => ["5", "6"].includes(d.id)).length, 0, "sin pedir archivos que aún no están listos");
  if (OUT) await page.screenshot({ path: OUT + "/chat-01-burbujas-escritorio.png" });

  // Subir una PNG con comentario: multipart con «archivo» y «texto», barra de avance, burbuja nueva.
  const selector = hilo.locator("[data-selector-archivo]");
  assert.match(await selector.getAttribute("accept"), /image\/png.*application\/pdf.*\.docx/);
  await selector.setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG_SUBIR });
  await hilo.locator('[data-adjunto-pendiente="imagen"] img').waitFor();
  assert.match(await hilo.locator('[data-adjunto-pendiente="imagen"]').innerText(), /foto\.png[\s\S]*KB|B/);
  const caja = hilo.getByRole("textbox", { name: "Comentario del archivo" });
  await caja.fill("Mi comprobante de domicilio");
  if (OUT) await page.screenshot({ path: OUT + "/chat-03-adjunto-pendiente.png" });
  const subidasAntes = S.subidas.length;
  await hilo.getByRole("button", { name: "Enviar archivo" }).click();
  await hilo.locator("[data-subiendo]").waitFor({ timeout: 3000 });
  assert.equal(await hilo.getByRole("progressbar", { name: "Avance del envío" }).count(), 1);
  if (OUT) await page.screenshot({ path: OUT + "/chat-04-subiendo.png" });
  await hilo.locator("[data-subiendo]").waitFor({ state: "detached", timeout: 8000 });
  const sub1 = S.subidas[subidasAntes];
  assert.match(sub1.tipo, /^multipart\/form-data; boundary=/);
  assert.match(sub1.token, /^Bearer .+/);
  assert.match(sub1.cuerpo, /name="archivo"; filename="foto\.png"\r\nContent-Type: image\/png/);
  assert.ok(sub1.cuerpo.includes(`name="texto"\r\n\r\n${Buffer.from("Mi comprobante de domicilio").toString("latin1")}\r\n`));
  assert.ok(!sub1.cuerpo.includes('name="nota_voz"'), "un archivo elegido no es nota de voz");
  const nuevo = hilo.locator('[data-mensaje="900"]');
  await nuevo.locator('[data-adjunto="imagen"] img[data-miniatura]').waitFor();
  assert.match(await nuevo.innerText(), /Mi comprobante de domicilio/);
  assert.equal(await hilo.locator("[data-adjunto-pendiente]").count(), 0, "se limpia tras enviar");
  assert.equal(await hilo.getByRole("textbox", { name: "Mensaje" }).inputValue(), "");

  // PDF arrastrado sobre el hilo, sin comentario (no manda «texto»).
  const dt = await page.evaluateHandle(() => {
    const d = new DataTransfer();
    d.items.add(new File(["%PDF-1.4 propuesta"], "propuesta.pdf", { type: "application/pdf" }));
    return d;
  });
  await hilo.dispatchEvent("dragenter", { dataTransfer: dt });
  await hilo.locator("[data-soltar-archivo]").waitFor();
  if (OUT) await page.screenshot({ path: OUT + "/chat-05-soltar-archivo.png" });
  await hilo.dispatchEvent("drop", { dataTransfer: dt });
  await hilo.locator('[data-adjunto-pendiente="documento"]').waitFor();
  assert.equal(await hilo.locator("[data-soltar-archivo]").count(), 0);
  await hilo.getByRole("textbox", { name: "Comentario del archivo" }).press("Enter");
  await hilo.locator('[data-mensaje="901"] [data-documento]').waitFor({ timeout: 8000 });
  const sub2 = S.subidas.at(-1);
  assert.match(sub2.cuerpo, /name="archivo"; filename="propuesta\.pdf"\r\nContent-Type: application\/pdf/);
  assert.ok(!sub2.cuerpo.includes('name="texto"'), "sin comentario no se manda «texto»");

  // Pegar una imagen del portapapeles y quitarla.
  await hilo.getByRole("textbox", { name: "Mensaje" }).evaluate((el) => {
    const d = new DataTransfer();
    d.items.add(new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], "image.png", { type: "image/png" }));
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: d, bubbles: true, cancelable: true }));
  });
  await hilo.locator('[data-adjunto-pendiente="imagen"]').waitFor();
  await hilo.getByRole("button", { name: "Quitar archivo" }).click();
  assert.equal(await hilo.locator("[data-adjunto-pendiente]").count(), 0);

  // Rechazos en el navegador: más de 16 MB y .exe (no se sube nada).
  const subidasRechazo = S.subidas.length;
  await selector.setInputFiles({ name: "grande.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(LIMITE_ADJUNTO + 1) });
  await hilo.locator("[data-error-adjunto]").filter({ hasText: MENSAJE_ARCHIVO_GRANDE }).waitFor();
  assert.equal(await hilo.locator("[data-adjunto-pendiente]").count(), 0);
  await selector.setInputFiles({ name: "setup.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") });
  await hilo.locator("[data-error-adjunto]").filter({ hasText: MENSAJE_TIPO_NO_PERMITIDO }).waitFor();
  assert.equal(await hilo.locator("[data-adjunto-pendiente]").count(), 0);
  assert.equal(S.subidas.length, subidasRechazo, "nada rechazado llega al API");
  if (OUT) await page.screenshot({ path: OUT + "/chat-06-rechazo-tipo.png" });
  await hilo.getByRole("button", { name: "Cerrar aviso" }).click();

  // 413 del API: aviso con el texto y el archivo se conserva. Luego cancelar a media subida.
  S.adjuntoResp.push("413");
  await selector.setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG_SUBIR });
  await hilo.getByRole("button", { name: "Enviar archivo" }).click();
  await hilo.getByRole("alert").filter({ hasText: MENSAJE_ARCHIVO_GRANDE }).waitFor();
  assert.equal(await hilo.locator('[data-adjunto-pendiente="imagen"]').count(), 1, "tras el 413 el archivo sigue ahí");
  S.adjuntoResp.push("lento");
  const mensajesAntes = S.mensajes[4].length;
  await hilo.getByRole("button", { name: "Enviar archivo" }).click();
  await hilo.locator("[data-subiendo]").waitFor();
  await hilo.getByRole("button", { name: "Cancelar envío" }).click();
  await hilo.locator("[data-subiendo]").waitFor({ state: "detached" });
  assert.equal(await hilo.locator('[data-adjunto-pendiente="imagen"]').count(), 1, "al cancelar se conserva el archivo");
  await dormir(300);
  assert.equal(await hilo.locator(`[data-mensaje="${S.siguienteId}"]`).count(), 0, "sin burbuja del envío cancelado");
  assert.ok(S.mensajes[4].length >= mensajesAntes);
  await hilo.getByRole("button", { name: "Quitar archivo" }).click();

  // Grabadora (MediaRecorder simulado): tiempo, cancelar sin enviar y «Detener y enviar» con nota_voz=1 en webm/opus.
  const subidasVoz = S.subidas.length;
  await hilo.getByRole("button", { name: "Grabar nota de voz" }).click();
  const barra = hilo.locator("[data-grabando]");
  await barra.waitFor();
  await barra.locator("[data-tiempo-grabacion]").filter({ hasText: "0:01" }).waitFor({ timeout: 4000 });
  if (OUT) await page.screenshot({ path: OUT + "/chat-07-grabando.png" });
  await barra.getByRole("button", { name: "Cancelar grabación" }).click();
  await barra.waitFor({ state: "detached" });
  await dormir(200);
  assert.equal(S.subidas.length, subidasVoz, "cancelar no envía");
  assert.ok(await page.evaluate(() => window.__pistasDetenidas) >= 1, "cancelar suelta el micrófono");
  await hilo.getByRole("button", { name: "Grabar nota de voz" }).click();
  await barra.waitFor();
  assert.equal(await page.evaluate(() => window.__grabadora.mimeType), "audio/webm;codecs=opus", "sin ogg se usa webm/opus");
  await barra.getByRole("button", { name: "Detener y enviar" }).click();
  await hilo.locator("[data-subiendo]").waitFor();
  await hilo.locator("[data-subiendo]").waitFor({ state: "detached", timeout: 8000 });
  const voz = S.subidas.at(-1);
  assert.match(voz.cuerpo, /name="archivo"; filename="nota-de-voz-\d{14}\.webm"\r\nContent-Type: audio\/webm\r\n/);
  assert.match(voz.cuerpo, /name="nota_voz"\r\n\r\n1\r\n/);
  await hilo.locator('[data-adjunto="audio"]').last().getByText("Nota de voz").waitFor();
  // Micrófono negado.
  await page.evaluate(() => { window.__negarMicro = true; });
  await hilo.getByRole("button", { name: "Grabar nota de voz" }).click();
  await hilo.locator("[data-error-adjunto]").filter({ hasText: MENSAJE_MICRO_DENEGADO }).waitFor();
  await hilo.getByRole("button", { name: "Cerrar aviso" }).click();

  // Cita (tarjeta «Entrevista» de la ficha; fija arriba del chat con la ficha cerrada): confirmar, no asistió, agendar,
  // mover y cancelar, cada una con su línea de sistema en el chat.
  assert.match(await hilo.locator('[data-cita-fijada="agendada"]').innerText(), /Entrevista: [\s\S]*12:00 p\.m\.[\s\S]*Agendada[\s\S]*Ver/);
  await hilo.locator("[data-cita-fijada]").click();
  const fichaChat = page.getByRole("complementary", { name: "Ficha del candidato" });
  const tarjeta = fichaChat.getByRole("region", { name: "Cita de entrevista" });
  await tarjeta.locator('[data-estado-cita="agendada"]').waitFor();
  assert.match(await tarjeta.innerText(), /12:00 p\.m\.[\s\S]*Agendada[\s\S]*Av\. Industrial 120, Apodaca/);
  const linea = (texto) => hilo.locator("[data-linea-sistema]").filter({ hasText: texto }).waitFor();
  await tarjeta.getByRole("button", { name: "Confirmar" }).click();
  await linea(lineaCita("confirmar", cita));
  await tarjeta.locator('[data-estado-cita="confirmada"]').waitFor();
  assert.equal(cuenta((x) => x.ruta === "/citas/90/confirmar" && x.metodo === "POST"), 1);
  await tarjeta.getByRole("button", { name: "No asistió" }).click();
  await linea(lineaCita("no_asistio"));
  assert.deepEqual(pedidos.find((x) => x.ruta === "/citas/90/asistencia").cuerpo, { asistio: false });
  await tarjeta.getByText("Sin entrevista agendada").waitFor();
  assert.match(await tarjeta.innerText(), /Última: No asistió/);
  await tarjeta.getByRole("button", { name: "Agendar", exact: true }).click();
  const dlgAg = page.getByRole("dialog", { name: "Agendar entrevista" });
  await dlgAg.locator(`[data-dia-horarios="${manana}"]`).waitFor();
  // Con horarios: «Agendar» sin elegir sí avisa (y solo entonces).
  assert.equal(await dlgAg.getByText("Elige un horario.").count(), 0, "sin aviso antes de intentar");
  await dlgAg.getByRole("button", { name: "Agendar", exact: true }).click();
  await dlgAg.getByRole("alert").filter({ hasText: "Elige un horario." }).waitFor();
  await dlgAg.locator(`[data-dia-horarios="${manana}"]`).getByText("9:00 a.m.").click();
  await dlgAg.getByRole("button", { name: "Agendar", exact: true }).click();
  await dlgAg.waitFor({ state: "detached" });
  assert.deepEqual(pedidos.filter((x) => x.ruta === "/citas" && x.metodo === "POST").at(-1).cuerpo, { id_conversacion: 4, id_vacante: 55, inicio: `${manana} 09:00` });
  await linea(lineaCita("agendar", { inicio: `${manana} 09:00` }));
  await tarjeta.locator('[data-estado-cita="agendada"]').waitFor();
  const idNueva = S.citasPorConv[4].id;
  await tarjeta.getByRole("button", { name: "Mover" }).click();
  const dlgMo = page.getByRole("dialog", { name: "Mover entrevista" });
  const pasado = sumarDias(hoy, 2);
  await dlgMo.locator(`[data-dia-horarios="${pasado}"]`).getByText("10:00 a.m.").click();
  await dlgMo.getByRole("button", { name: "Mover", exact: true }).click();
  await dlgMo.waitFor({ state: "detached" });
  assert.deepEqual(pedidos.find((x) => x.ruta === `/citas/${idNueva}/reagendar`).cuerpo, { inicio: `${pasado} 10:00` });
  await linea(lineaCita("mover", { inicio: `${pasado} 10:00` }));
  await tarjeta.locator("[data-cita-cuando]").filter({ hasText: "10:00 a.m." }).waitFor();
  if (OUT) await page.screenshot({ path: OUT + "/chat-08-cita-fija.png" });
  const idMovida = S.citasPorConv[4].id;
  await tarjeta.getByRole("button", { name: "Cancelar" }).click();
  const dlgCa = page.getByRole("dialog", { name: "Cancelar entrevista" });
  await dlgCa.getByLabel("Motivo").fill("Encontró otro empleo.");
  await dlgCa.getByRole("button", { name: "Cancelar entrevista" }).click();
  await dlgCa.waitFor({ state: "detached" });
  assert.deepEqual(pedidos.find((x) => x.ruta === `/citas/${idMovida}/cancelar`).cuerpo, { motivo: "Encontró otro empleo." });
  await linea(lineaCita("cancelar", { inicio: `${pasado} 10:00` }));
  await tarjeta.getByText("Sin entrevista agendada").waitFor();

  // «Ofrecer horarios» desde la tarjeta (manda los botones de horario) y desde «+» con 409 WA_SIN_HORARIOS.
  await tarjeta.getByRole("button", { name: "Ofrecer horarios" }).click();
  await linea(lineaCita("ofrecer"));
  assert.equal(cuenta((x) => x.ruta === "/conversaciones/4/ofrecer-horarios" && x.metodo === "POST"), 1);
  assert.deepEqual(pedidos.find((x) => x.ruta === "/conversaciones/4/ofrecer-horarios").cuerpo, {});
  await hilo.getByText("Tengo estos horarios para tu entrevista. Elige uno:").waitFor();
  S.ofrecerResp.push("WA_SIN_HORARIOS");
  await hilo.getByRole("button", { name: "Más acciones" }).click();
  await page.getByRole("menuitem", { name: "Ofrecer horarios" }).click();
  await hilo.getByRole("alert").filter({ hasText: MENSAJE_SIN_HORARIOS }).waitFor();
  assert.equal(cuenta((x) => x.ruta === "/conversaciones/4/ofrecer-horarios"), 2);
  await hilo.getByRole("button", { name: "Más acciones" }).click();
  assert.equal(await page.getByRole("menuitem", { name: "Adjuntar archivo" }).isDisabled(), false);
  await page.keyboard.press("Escape");
  if (OUT) await page.screenshot({ path: OUT + "/chat-09-lineas-sistema.png" });

  // Selector sin horarios: falta migración, días vacíos y agenda sin configurar.
  // Vacante 57 (nunca consultada): la caché sin conexión de la app responde con lo último guardado ante un 5xx.
  const abrirAgendar = async (t = tarjeta) => {
    await t.getByRole("button", { name: "Agendar", exact: true }).click();
    const d = page.getByRole("dialog", { name: "Agendar entrevista" });
    await d.waitFor();
    return d;
  };
  await page.getByRole("button", { name: "Candidato 1", exact: true }).click();
  await page.locator("[data-ver-ficha]").filter({ hasText: "Candidato 1" }).waitFor();
  await verFicha(page, hilo);
  await tarjeta.getByText("Sin entrevista agendada").waitFor();
  S.horariosModo = "sin_migracion";
  let dlg = await abrirAgendar();
  await dlg.locator('[data-sin-horarios="sin_migracion"]').filter({ hasText: "Falta correr la migración de la agenda (R3)" }).waitFor();
  assert.equal(await dlg.getByRole("button", { name: "Agendar", exact: true }).isDisabled(), true, "sin horarios no se puede agendar");
  assert.equal(await dlg.getByText("Elige un horario.").count(), 0);
  await dlg.getByRole("button", { name: "Cancelar" }).click();
  await dlg.waitFor({ state: "detached" });
  S.horariosModo = "vacio";
  S.agendasVacante[57] = { ...S.agendasVacante[55], activa: true };
  await dormir(2200); // fuera de la ventana de deduplicación de SWR
  dlg = await abrirAgendar();
  await dlg.locator('[data-sin-horarios="vacio"]').filter({ hasText: "No hay horarios en estos días" }).waitFor();
  assert.equal(await dlg.getByRole("button", { name: "Agendar", exact: true }).isDisabled(), true);
  assert.equal(await dlg.getByRole("button", { name: "Siguientes" }).isDisabled(), false, "se pueden ver los siguientes días");
  assert.equal(await dlg.getByText("Elige un horario.").count(), 0);
  await dlg.getByRole("button", { name: "Cancelar" }).click();
  await dlg.waitFor({ state: "detached" });
  await page.getByRole("button", { name: /^Rosa Torres/ }).click();
  await page.locator("[data-ver-ficha]").filter({ hasText: "Rosa Torres" }).waitFor();
  await verFicha(page, hilo);
  await tarjeta.getByText("Sin entrevista agendada").waitFor();
  S.horariosModo = "normal";
  S.agendasVacante[55] = { ...S.agendasVacante[55], activa: false };
  dlg = await abrirAgendar();
  const sinAgenda = dlg.locator('[data-sin-horarios="sin_agenda"]');
  await sinAgenda.filter({ hasText: "La agenda de esta vacante no está configurada" }).waitFor();
  assert.equal(await dlg.getByRole("button", { name: "Agendar", exact: true }).isDisabled(), true);
  assert.equal(await dlg.getByText("Elige un horario.").count(), 0);
  if (OUT) await page.screenshot({ path: OUT + "/chat-10-agenda-sin-configurar.png" });
  await sinAgenda.getByRole("button", { name: "Configurar agenda" }).click();
  const editor = page.getByRole("dialog", { name: "Agenda de entrevistas" });
  await editor.getByRole("switch", { name: "Agenda activa" }).waitFor();
  assert.match(await editor.innerText(), /Vacante «Operador de montacargas»/);
  await editor.getByRole("switch", { name: "Agenda activa" }).click();
  await editor.getByRole("button", { name: "Guardar agenda" }).click();
  await editor.waitFor({ state: "detached" });
  assert.equal(pedidos.filter((x) => x.ruta === "/vacantes/55/agenda" && x.metodo === "PUT").at(-1).cuerpo.activa, true);
  await dlg.locator(`[data-dia-horarios="${manana}"]`).waitFor({ timeout: 8000 });
  assert.equal(await dlg.getByRole("button", { name: "Agendar", exact: true }).isDisabled(), false, "con la agenda activa ya hay horarios");
  await dlg.getByRole("button", { name: "Cancelar" }).click();
  await dlg.waitFor({ state: "detached" });
  await page.close();

  // Teléfono 390 px: sin desborde, objetivos ≥44 px, acciones de la cita plegadas y visor a pantalla completa.
  const movil = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await movil.addInitScript(GRABADORA_FALSA);
  await movil.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(movil, reclutadora);
  S.citasPorConv[4] = { ...cita, id: 95, inicio: `${hoy} 18:00`, fin: `${hoy} 18:30`, estado: "agendada" };
  S.citas.push(S.citasPorConv[4]);
  const tel = await movil.newPage();
  tel.on("pageerror", (e) => errores.push(e.message));
  await tel.goto(base + "/panel/whatsapp?c=4", { waitUntil: "domcontentloaded" });
  const hiloT = tel.getByRole("region", { name: "Conversación" });
  await hiloT.locator('[data-mensaje="401"]').waitFor({ timeout: 30000 });
  await hiloT.locator('[data-mensaje="401"]').scrollIntoViewIfNeeded();
  await hiloT.locator('[data-mensaje="401"] img[data-miniatura]').waitFor();
  // En teléfono la cita se ve fija arriba del chat; «Ver» abre la ficha a pantalla completa con sus acciones a la vista.
  assert.ok(await tamano(hiloT.locator("[data-cita-fijada]")) >= 44, "cita fija ≥44 px");
  await hiloT.locator("[data-cita-fijada]").tap();
  const fichaT = tel.getByRole("complementary", { name: "Ficha del candidato" });
  const tarjetaT = fichaT.getByRole("region", { name: "Cita de entrevista" });
  await tarjetaT.getByRole("button", { name: "Mover" }).waitFor();
  for (const b of [tarjetaT.getByRole("button", { name: "Mover" }), tarjetaT.getByRole("button", { name: "Cancelar" }),
    tarjetaT.getByRole("button", { name: "Asistió", exact: true }), tarjetaT.getByRole("button", { name: "Confirmar" }), fichaT.getByRole("button", { name: "Cerrar ficha" })]) {
    assert.ok(await tamano(b) >= 44, `objetivo táctil ≥44 px en la ficha: ${await b.getAttribute("aria-label") || await b.innerText()}`);
  }
  assert.ok(await fichaT.evaluate((el) => [...el.querySelectorAll("*")].every((n) => n.getBoundingClientRect().right <= 391)), "ficha sin desborde horizontal");
  if (OUT) await tel.screenshot({ path: OUT + "/chat-11b-movil-ficha-cita.png" });
  await fichaT.getByRole("button", { name: "Cerrar ficha" }).tap();
  await fichaT.waitFor({ state: "hidden" });
  for (const b of [hiloT.getByRole("button", { name: "Más acciones" }), hiloT.getByRole("button", { name: "Grabar nota de voz" }), hiloT.getByRole("button", { name: "Enviar mensaje" }),
    hiloT.locator('[data-mensaje="402"]').getByRole("button", { name: "Reproducir nota de voz" }), hiloT.locator('[data-mensaje="402"]').getByRole("button", { name: "Velocidad 1x" }),
    hiloT.locator('[data-mensaje="402"]').getByRole("button", { name: "Transcripción" }),
    hiloT.getByRole("button", { name: "Abrir cv.pdf" }), hiloT.getByRole("button", { name: "Descargar cv.pdf" }), hiloT.getByRole("link", { name: "Abrir en Google Maps" }),
    hiloT.getByRole("button", { name: "Ver imagen ine.png" })]) {
    await b.scrollIntoViewIfNeeded();
    assert.ok(await tamano(b) >= 44, `objetivo táctil ≥44 px en el chat: ${await b.getAttribute("aria-label") || await b.innerText()}`);
  }
  assert.ok(await sinScrollHorizontal(tel), "chat con archivos sin scroll horizontal");
  assert.ok(await hiloT.evaluate((el) => [...el.querySelectorAll("*")].every((n) => n.getBoundingClientRect().right <= 391)), "nada se sale a la derecha");
  await hiloT.locator('[data-mensaje="403"]').scrollIntoViewIfNeeded();
  if (OUT) await tel.screenshot({ path: OUT + "/chat-11-movil-burbujas.png" });
  await hiloT.locator("[data-selector-archivo]").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG_SUBIR });
  await hiloT.locator('[data-adjunto-pendiente="imagen"]').waitFor();
  assert.ok(await tamano(hiloT.getByRole("button", { name: "Quitar archivo" })) >= 44 && await tamano(hiloT.getByRole("button", { name: "Enviar archivo" })) >= 44);
  assert.ok(await sinScrollHorizontal(tel));
  if (OUT) await tel.screenshot({ path: OUT + "/chat-12-movil-adjunto.png" });
  await hiloT.getByRole("button", { name: "Quitar archivo" }).tap();
  await hiloT.getByRole("button", { name: "Grabar nota de voz" }).tap();
  const barraT = hiloT.locator("[data-grabando]");
  await barraT.waitFor();
  assert.ok(await tamano(barraT.getByRole("button", { name: "Cancelar grabación" })) >= 44 && await tamano(barraT.getByRole("button", { name: "Detener y enviar" })) >= 44);
  assert.ok(await sinScrollHorizontal(tel));
  if (OUT) await tel.screenshot({ path: OUT + "/chat-13-movil-grabando.png" });
  await barraT.getByRole("button", { name: "Cancelar grabación" }).tap();
  await hiloT.getByRole("button", { name: "Ver imagen ine.png" }).tap();
  const visorT = tel.getByRole("dialog", { name: "ine.png" });
  await visorT.waitFor();
  await dormir(300);
  const cajaV = await visorT.boundingBox();
  assert.ok(cajaV.x === 0 && cajaV.width === 390 && cajaV.height >= 840, `visor a pantalla completa: ${JSON.stringify(cajaV)}`);
  for (const b of [visorT.getByRole("button", { name: "Acercar" }), visorT.getByRole("button", { name: "Alejar" }), visorT.getByRole("button", { name: "Descargar ine.png" })]) {
    assert.ok(await tamano(b) >= 44, "objetivo táctil ≥44 px en el visor");
  }
  if (OUT) await tel.screenshot({ path: OUT + "/chat-14-movil-visor.png" });
  await movil.close();
  await ctx.close();
}

// ——— 23. Agenda tipo Google Calendar: menú real, semana/día, minicalendario, horarios libres, agendar aquí, arrastrar ———
async function agendaCalendario(browser, errores) {
  S = estadoInicial();
  S.reagendarComoServidor = true;
  const hoy = hoyMx();
  const lunes = inicioSemana(hoy);
  const d1 = sumarDias(lunes, 1);
  const d2 = sumarDias(lunes, 2);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctx, reclutadora);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  // Menú «Reclutamiento → Entrevistas» abre la agenda real (no la maqueta) y se resalta solo esa entrada.
  await page.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await page.getByRole("list", { name: "Conversaciones" }).waitFor({ timeout: 30000 });
  // La bandeja pliega el menú a iconos; se abre para usar sus entradas (y se vuelve a plegar abajo).
  await page.locator('[data-slot="sidebar"][data-state="collapsed"]').waitFor();
  await page.getByRole("button", { name: "Toggle Sidebar" }).first().click();
  await page.locator('[data-slot="sidebar"][data-state="expanded"]').waitFor();
  const entradaEntrevistas = page.getByRole("button", { name: "Entrevistas", exact: true });
  await entradaEntrevistas.click();
  await page.waitForURL(/\/panel\/whatsapp\?vista=entrevistas$/);
  const cal = page.locator("[data-calendario-semana]");
  await cal.locator("[data-bloque-cita]").first().waitFor({ timeout: 15000 });
  assert.equal(await page.getByText("Vista de diseño").count(), 0, "sin la maqueta");
  assert.equal(await page.getByText("Ana García").count(), 0, "sin datos de ejemplo");
  assert.match(await entradaEntrevistas.getAttribute("class"), /bg-|text-/);
  const claseEnt = await entradaEntrevistas.getAttribute("class");
  const claseConv = await page.getByRole("button", { name: "Conversaciones (WhatsApp)" }).getAttribute("class");
  assert.notEqual(claseEnt, claseConv, "en Entrevistas se resalta «Entrevistas» y no «Conversaciones»");
  await page.getByRole("button", { name: "Toggle Sidebar" }).first().click();
  await page.locator('[data-slot="sidebar"][data-state="collapsed"]').waitFor();
  // Enlace viejo a la maqueta → agenda real.
  const vieja = await ctx.newPage();
  await vieja.goto(base + "/panel/reclutamiento/entrevistas", { waitUntil: "domcontentloaded" });
  await vieja.waitForURL(/\/panel\/whatsapp\?vista=entrevistas$/, { waitUntil: "commit" });
  await vieja.close();

  // Semana: 7 columnas, hoy resaltado, línea de ahora (si la hora cae en el rango), bloques de citas y leyenda.
  assert.equal(await cal.locator("[data-dia-calendario]").count(), 7);
  assert.equal(await cal.locator(`[data-dia-calendario="${hoy}"][data-hoy]`).count(), 1);
  const rango = rangoAgenda(S.citas, []);
  const conLinea = lineaAhora(new Date(), hoy, rango.desde, rango.hasta, 80) !== null;
  assert.equal(await cal.locator("[data-linea-ahora]").count(), conLinea ? 1 : 0, "línea roja de ahora");
  assert.equal(await cal.locator("[data-bloque-cita]").count(), 4);
  assert.match(await cal.locator('[data-bloque-cita="71"]').getAttribute("aria-label"), /Ana Ruiz, 10:00 a\.m\., Operador de montacargas, Confirmada/);
  assert.match(await page.locator("[data-leyenda]").innerText(), /Agendada[\s\S]*Confirmada[\s\S]*Asistió[\s\S]*No asistió[\s\S]*Cancelada/);
  assert.equal(await cal.locator("[data-horario-libre]").count(), 0, "sin vacante elegida no hay horarios libres");
  // Minicalendario: saltar a la semana siguiente y volver con «Hoy».
  const sigLunes = sumarDias(lunes, 7);
  await page.locator(`[data-mini-mes] [data-mini-dia="${sigLunes}"]`).click();
  for (let i = 0; i < 50 && !pedidos.some((x) => x.ruta === "/citas" && x.params.includes(`desde=${sigLunes}`)); i++) await dormir(100);
  assert.ok(pedidos.some((x) => x.ruta === "/citas" && x.params.includes(`desde=${sigLunes}&hasta=${sumarDias(sigLunes, 6)}`)), "el minicalendario cambia la semana");
  await page.getByRole("button", { name: "Hoy", exact: true }).click();
  await cal.locator('[data-bloque-cita="71"]').waitFor();
  // Vista de día.
  await page.getByRole("group", { name: "Vista" }).getByRole("button", { name: "Día" }).click();
  await page.waitForFunction(() => document.querySelectorAll("[data-calendario-semana] [data-dia-calendario]").length === 1);
  await page.getByRole("button", { name: "Día siguiente" }).waitFor();
  assert.equal(await cal.locator("[data-bloque-cita]").count(), 3, "el día de hoy tiene 3 citas");
  if (OUT) await page.screenshot({ path: OUT + "/agenda-02-dia.png" });
  await page.getByRole("group", { name: "Vista" }).getByRole("button", { name: "Semana" }).click();
  await page.waitForFunction(() => document.querySelectorAll("[data-calendario-semana] [data-dia-calendario]").length === 7);

  // Vacante elegida: horarios libres «disponible · N lugares» (los llenos no se eligen).
  await page.getByLabel("Vacante", { exact: true }).selectOption("55");
  await cal.locator(`button[data-horario-libre="${d1} 09:00"]`).waitFor();
  assert.ok(pedidos.some((x) => x.ruta === "/vacantes/55/agenda/horarios" && x.params === `?desde=${lunes}&dias=7`), "horarios de la semana visible");
  assert.match(await cal.locator(`[data-horario-libre="${d2} 10:00"]`).innerText(), /10:00 a\.m\.[\s\S]*Disponible · Quedan 2 lugares/);
  assert.match(await cal.locator(`[data-horario-lleno="${d1} 09:30"]`).innerText(), /Lleno/);
  assert.equal(await cal.locator("button[data-horario-lleno]").count(), 0, "un horario lleno no es botón");
  if (OUT) await page.screenshot({ path: OUT + "/agenda-01-semana.png" });
  // Clic en un horario libre → «Agendar aquí» con la conversación del candidato → POST /citas.
  await cal.locator(`button[data-horario-libre="${d2} 10:00"]`).click();
  const aqui = page.getByRole("dialog", { name: "Agendar entrevista aquí" });
  await aqui.locator("[data-candidatos]").waitFor();
  assert.equal(await aqui.getByRole("radio").count(), 1, "solo conversaciones de la vacante");
  await aqui.getByRole("button", { name: "Agendar aquí" }).click();
  await aqui.getByRole("alert").filter({ hasText: "Elige al candidato." }).waitFor();
  await aqui.getByRole("radio", { name: /Ana Ruiz/ }).check();
  if (OUT) await page.screenshot({ path: OUT + "/agenda-03-agendar-aqui.png" });
  await aqui.getByRole("button", { name: "Agendar aquí" }).click();
  await aqui.waitFor({ state: "detached" });
  assert.deepEqual(pedidos.filter((x) => x.ruta === "/citas" && x.metodo === "POST").at(-1).cuerpo, { id_conversacion: 1, id_vacante: 55, inicio: `${d2} 10:00` });
  const nuevaId = S.siguienteCita - 1;
  await cal.locator(`[data-bloque-cita="${nuevaId}"]`).waitFor();

  // Arrastrar la cita 71 a un horario libre → confirmar → POST /citas/71/reagendar.
  const arrastrar = async (origen, destino) => {
    await destino.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" })); // la app usa scroll suave
    const a = await origen.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + Math.min(10, a.height / 2));
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 15, a.y + 20, { steps: 3 }); // empieza el arrastre
    await page.locator("[data-fantasma]").waitFor();
    const b = await destino.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.locator("[data-fantasma]").filter({ hasText: /→ \d/ }).waitFor();
    await page.mouse.up();
  };
  await arrastrar(cal.locator('[data-bloque-cita="71"]'), cal.locator(`[data-horario-libre="${d1} 09:00"]`));
  const conf = page.getByRole("dialog", { name: "Mover entrevista" });
  await conf.waitFor();
  assert.match(await conf.innerText(), /¿Mover la entrevista de Ana Ruiz del .* 10:00 a\.m\. al .* 9:00 a\.m\.\?/);
  assert.equal(cuenta((x) => x.ruta === "/citas/71/reagendar"), 0, "pide confirmación antes de guardar");
  if (OUT) await page.screenshot({ path: OUT + "/agenda-04-confirmar-mover.png" });
  await conf.getByRole("button", { name: "Mover", exact: true }).click();
  await conf.waitFor({ state: "detached" });
  for (let i = 0; i < 50 && !cuenta((x) => x.ruta === "/citas/71/reagendar"); i++) await dormir(100);
  assert.deepEqual(pedidos.find((x) => x.ruta === "/citas/71/reagendar").cuerpo, { inicio: `${d1} 09:00` });
  const movidaId = S.citasPorConv[1]?.id ?? S.citas.at(-1).id;
  await cal.locator(`[data-bloque-cita][data-inicio="${d1} 09:00"]`).first().waitFor();
  assert.ok(movidaId);
  // 409 WA_SIN_CUPO: aviso y la cita regresa a su lugar.
  S.respuestasCita.push({ status: 409, cuerpo: { codigo: "WA_SIN_CUPO", error: "Sin cupo" } });
  await arrastrar(cal.locator('[data-bloque-cita="72"]'), cal.locator(`[data-horario-libre="${d2} 10:00"]`));
  await conf.waitFor();
  await conf.getByRole("button", { name: "Mover", exact: true }).click();
  await page.locator("[data-aviso-agenda]").filter({ hasText: "Ese horario ya se llenó. Elige otro de la lista." }).waitFor();
  assert.equal(await cal.locator('[data-bloque-cita="72"]').getAttribute("data-inicio"), `${hoy} 10:00`, "la cita regresa a su lugar");
  if (OUT) await page.screenshot({ path: OUT + "/agenda-05-409.png" });
  // Alternativa sin arrastrar: abrir la cita → «Reagendar» → la misma rejilla con horarios libres.
  await cal.locator('[data-bloque-cita="72"]').click();
  const dlgCita = page.getByRole("dialog", { name: "Entrevista" });
  await dlgCita.getByRole("button", { name: "Reagendar" }).click();
  const re = page.getByRole("dialog", { name: "Reagendar entrevista" });
  await re.locator("[data-calendario-horarios]").waitFor();
  assert.ok(await re.locator("[data-calendario-horarios] input[type=radio]").count() >= 3, "el selector usa la rejilla de la agenda");
  await re.locator(`[data-dia-horarios="${sumarDias(hoy, 2)}"]`).getByText("10:00 a.m.").click();
  assert.equal(await re.getByRole("radio", { name: /10:00 a\.m\., Quedan 2 lugares/ }).isChecked(), true);
  if (OUT) await page.screenshot({ path: OUT + "/agenda-06-selector-rejilla.png" });
  await re.getByRole("button", { name: "Cancelar" }).click();
  await re.waitFor({ state: "detached" });
  await page.keyboard.press("Escape");
  await page.close();

  // Teléfono: tira de días, lista del día con horarios libres para tocar y «Agendar aquí» a pantalla completa.
  const movil = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await movil.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(movil, reclutadora);
  const tel = await movil.newPage();
  tel.on("pageerror", (e) => errores.push(e.message));
  await tel.goto(base + "/panel/whatsapp?vista=entrevistas", { waitUntil: "domcontentloaded" });
  const tira = tel.locator("[data-tira-dias]");
  await tira.waitFor({ timeout: 30000 });
  assert.equal(await tel.locator("[data-calendario-semana]").count(), 0, "en teléfono no hay rejilla de semana");
  assert.equal(await tira.locator("[data-chip-dia]").count(), 7);
  assert.equal(await tira.locator(`[data-chip-dia="${hoy}"]`).getAttribute("aria-pressed"), "true");
  for (const chip of await tira.locator("[data-chip-dia]").all()) assert.ok(await tamano(chip) >= 44, "chip de día ≥44 px");
  await tel.getByLabel("Vacante", { exact: true }).selectOption("55");
  await tira.locator(`[data-chip-dia="${d2}"]`).tap();
  const slotT = tel.locator(`[data-libres-dia] [data-horario-libre="${d2} 10:00"]`);
  await slotT.waitFor();
  assert.ok(await tamano(slotT) >= 44);
  assert.ok(await sinScrollHorizontal(tel), "agenda en teléfono sin scroll horizontal");
  if (OUT) await tel.screenshot({ path: OUT + "/agenda-07-movil-dia.png", fullPage: true });
  await slotT.tap();
  const aquiT = tel.getByRole("dialog", { name: "Agendar entrevista aquí" });
  await aquiT.locator("[data-candidatos]").waitFor();
  await dormir(300);
  const cajaA = await aquiT.boundingBox();
  assert.ok(cajaA.x === 0 && cajaA.width === 390, `agendar aquí a pantalla completa: ${JSON.stringify(cajaA)}`);
  assert.ok(await tamano(aquiT.getByRole("button", { name: "Agendar aquí" })) >= 44);
  if (OUT) await tel.screenshot({ path: OUT + "/agenda-08-movil-agendar-aqui.png" });
  await aquiT.getByRole("button", { name: "Cancelar" }).tap();
  await aquiT.waitFor({ state: "detached" });
  await movil.close();
  await ctx.close();
}
