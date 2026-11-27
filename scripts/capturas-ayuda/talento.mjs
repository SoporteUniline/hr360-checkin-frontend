// Capturas del Centro de ayuda · bloque Talento (Clima y NOM-035, Evaluación de desempeño, Reclutamiento, Adamia AI y
// Mi espacio). Todo con API simulada y datos de demostración: nada sale a internet ni usa datos reales.
//
// 1) Corre los scripts/verify-*.mjs que ya toman capturas con su API simulada (CAPTURAS=carpeta temporal). Si alguno
//    falla a la mitad se conservan las capturas que alcanzó a tomar.
// 2) Toma las pantallas que esos scripts no cubren con su propia API simulada (Reclutamiento, Configurar agente, Agenda de
//    la vacante, Adamia AI y Seguridad del empleado).
// 3) Recorta y convierte a webp (calidad ~80, máx. ~200 KB) en public/ayuda/capturas/<modulo>/ con Chromium.
//
// Uso (desde la raíz del repo, después del build):
//   NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx npx next build
//   PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/capturas-ayuda/talento.mjs
// Variables opcionales: TMP_CAPTURAS=<carpeta> (dónde quedan las PNG intermedias), SIN_VERIFY=1 (reusa las PNG ya
// tomadas en TMP_CAPTURAS y no vuelve a correr los verify), SOLO_CONVERTIR=1 (solo el paso 3).
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const REPO = process.cwd();
const require = createRequire(path.join(REPO, "package.json"));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const TMP = process.env.TMP_CAPTURAS || path.join(tmpdir(), "adamia-capturas-talento");
const SALIDA = path.join(REPO, "public/ayuda/capturas");
const API_ORIGEN = "https://api.prueba.invalid";
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(TMP, { recursive: true });

// ───────── 1) verify-* con capturas ─────────
const VERIFY = [
  ["clima", "scripts/verify-clima.mjs"],
  ["clima-dash", "scripts/verify-clima-dashboard.mjs"],
  ["clima-canales", "scripts/verify-clima-canales.mjs"],
  ["clima-insp", "scripts/verify-clima-inspeccion.mjs"],
  ["clima-aviso", "scripts/verify-clima-aviso.mjs"],
    ["eval-tablero", "scripts/verify-evaluaciones-tablero.cjs"],
  ["bolsa", "scripts/verify-bolsa.mjs"],
  ["wavac", "scripts/verify-whatsapp-vacante.mjs"],
  ["lumo", "scripts/verify-whatsapp-lumo.mjs"],
  ["lumob", "scripts/verify-whatsapp-lumo-b.mjs"],
  ["whatsapp", "scripts/verify-whatsapp.mjs"],
];

function correr(carpeta, script) {
  const destino = path.join(TMP, carpeta);
  mkdirSync(destino, { recursive: true });
  return new Promise((resolve) => {
    const hijo = spawn(process.execPath, [script], { cwd: REPO, stdio: "ignore", env: { ...process.env, CAPTURAS: destino } });
    const limite = setTimeout(() => hijo.kill("SIGTERM"), 10 * 60 * 1000);
    hijo.on("exit", (codigo) => {
      clearTimeout(limite);
      console.log(`${codigo === 0 ? "OK   " : "FALLÓ"} ${script} (las capturas tomadas se conservan)`);
      resolve();
    });
  });
}

// ───────── 2) capturas propias con API simulada ─────────
const EMPRESA = { id_empresa: 10, nombre: "Uniline", estado: "Activo", zona_horaria: "America/Mexico_City" };
const RH = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Ríos", correo: "laura@uniline.mx", empresas: [10], empresas_detalle: [EMPRESA], zona_horaria: "America/Mexico_City" };
const ANA = { ...RH, id_usuario: -2, tipo_usuario: "Empleado", id_empleado: 101, nombre: "Ana Torres", correo: "ana@uniline.mx" };
const hoy = new Date();
const fecha = (dias) => new Date(hoy.getTime() + dias * 86400000).toISOString().slice(0, 10);
const momento = (dias, hora = "10:00:00") => `${fecha(dias)}T${hora}.000Z`;
const parrafo = (t) => ({ type: "p", children: [{ text: t }] });

const SUCURSALES = [
  { id: 1, nombre: "Planta Apodaca", direccion: "Av. Industrial 120, Apodaca, N.L." },
  { id: 2, nombre: "Sucursal Centro", direccion: "Calle Morelos 45, Monterrey, N.L." },
];
const MODALIDADES = [
  { id: 1, nombre: "Presencial", requiere_sucursal: true, propia: false },
  { id: 2, nombre: "Híbrida", requiere_sucursal: true, propia: false },
  { id: 3, nombre: "Remota", requiere_sucursal: false, propia: false },
];
const PREGUNTAS = [
  { id: "name", label: "Nombre completo", type: "text", required: true, base: true },
  { id: "email", label: "Correo electrónico", type: "email", required: true, base: true },
  { id: "phone", label: "Teléfono", type: "tel", required: true, base: true },
  { id: "experience", label: "¿Cuánta experiencia tienes en un puesto similar?", type: "select", required: true, options: ["Sin experiencia", "Menos de 1 año", "1 a 3 años", "Más de 3 años"] },
  { id: "cv", label: "Currículum", type: "file", required: true, base: true },
];
const vacante = (id, titulo, estado, extra = {}) => ({
  id, slug: `${titulo.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").replace(/ +/g, "-")}-${id}`, titulo, estado,
  id_sucursal: 1, id_modalidad: 1, modalidad_texto: "Presencial", puestos: 3, tipo_jornada: "Tiempo completo",
  sueldo_desde: 9500, sueldo_hasta: 11000, mostrar_sueldo: true, salario_texto: "$9,500 a $11,000 mensuales",
  cierra_el: fecha(20), descripcion: [parrafo("Opera el montacargas para mover materia prima y producto terminado en la planta."), parrafo("Ofrecemos prestaciones de ley, uniforme y comedor subsidiado.")],
  preguntas: PREGUNTAS, version_formulario: 1, creada_en: momento(-12), publicada_en: momento(-11), avisos: { email: "", toTeam: true, toCandidate: true }, ...extra,
});
const VACANTES = [
  vacante(55, "Operador de montacargas", "open"),
  vacante(56, "Cajera de sucursal", "open", { id_sucursal: 2, puestos: 2, sueldo_desde: 8800, sueldo_hasta: 9800, salario_texto: "$8,800 a $9,800 mensuales" }),
  vacante(57, "Auxiliar administrativo", "draft", { publicada_en: null, id_sucursal: 2 }),
  vacante(58, "Chofer repartidor", "paused", { id_sucursal: 1 }),
];
const candidato = (id, nombre, id_vacante, etapa, dias, extra = {}) => ({
  id, nombre, id_vacante, etapa, correo: `${nombre.split(" ")[0].toLowerCase()}@correo-demo.mx`, telefono: "5512345678",
  recibida_en: momento(dias), origen: "pagina", tiene_cv: true, contratacion: {}, ...extra,
});
const CANDIDATOS = [
  candidato(201, "Ana Torres", 55, "oferta", -6, { contratacion: { fecha_ingreso: fecha(7), id_sucursal: 1, checklist: ["data", "offer"] } }),
  candidato(202, "Beto Ruiz", 55, "entrevista", -5),
  candidato(203, "Carla Gil", 56, "revision", -3),
  candidato(204, "Diego Paz", 56, "nuevo", -1),
  candidato(205, "Elena Mora", 55, "nuevo", -1),
  candidato(206, "Fernando Ríos", 56, "descartado", -9),
];
const RESUMEN = {
  empresa: { id: 10, nombre: "Uniline", publica_bolsa: true },
  sucursales: SUCURSALES, modalidades: MODALIDADES, vacantes: VACANTES, candidatos: CANDIDATOS, whatsapp: [],
  citas: [{ id: 1, candidato: "Beto Ruiz", id_vacante: 55, id_conversacion: 1, inicio: momento(1, "16:00:00"), fin: momento(1, "16:30:00"), estado: "agendada", modalidad: "presencial", lugar: "Av. Industrial 120, Apodaca, N.L." }],
  eventos: [
    { id: 1, id_postulacion: 201, texto: "Ana Torres pasó a Oferta", en: momento(-1) },
    { id: 2, id_postulacion: 202, texto: "Beto Ruiz pasó a Entrevista", en: momento(-2) },
    { id: 3, id_postulacion: 205, texto: "Nueva postulación de Elena Mora", en: momento(-1) },
  ],
};
const DETALLE = {
  ...CANDIDATOS[0],
  respuestas: [{ id: "experience", label: "¿Cuánta experiencia tienes en un puesto similar?", type: "select", value: "1 a 3 años" }],
  notas: [{ id: 1, texto: "Buena actitud en la entrevista; tiene constancia DC-3 vigente.", en: momento(-2), autor: "Laura Ríos" }],
  eventos: [{ id: 1, texto: "Postulación recibida", en: momento(-6), autor: "" }, { id: 2, texto: "Pasó a Entrevista", en: momento(-4), autor: "Laura Ríos" }, { id: 3, texto: "Pasó a Oferta", en: momento(-1), autor: "Laura Ríos" }],
  empleado: null, sucursales: SUCURSALES, vacante: { id: 55, titulo: "Operador de montacargas", puestos: 3, contratados: 0 }, version_formulario: 1,
};

const AGENTE = {
  id_empresa: 10, activo: true, nombre_asistente: "Sofía de Uniline",
  horario_json: { lun: { desde: "08:00", hasta: "19:00" }, mar: { desde: "08:00", hasta: "19:00" }, mie: { desde: "08:00", hasta: "19:00" }, jue: { desde: "08:00", hasta: "19:00" }, vie: { desde: "08:00", hasta: "19:00" }, sab: { desde: "09:00", hasta: "14:00" } },
  mensaje_fuera_horario: "¡Gracias por escribir! Te respondemos mañana a partir de las 8:00.",
  respuestas_frecuentes: "El sueldo es de $9,500 a $11,000 mensuales.\nLa planta está en Av. Industrial 120, Apodaca.\nDamos uniforme y comedor subsidiado.",
  palabras_humano: "asesor, humano",
};
const AGENDA_VACANTE = {
  activa: true, modalidad: "presencial", direccion: "Av. Industrial 120, Apodaca, N.L.", referencia: "Entrada por la puerta 3, pregunta en caseta.",
  entrevistador: "Laura Ríos, Recursos Humanos", que_llevar: "INE, CV impreso y pluma", duracion_minutos: 30, cupo_por_horario: 2,
  horario: { lun: [{ desde: "09:00", hasta: "13:00" }, { desde: "15:00", hasta: "18:00" }], mar: [{ desde: "09:00", hasta: "13:00" }], mie: [{ desde: "09:00", hasta: "13:00" }], jue: [{ desde: "09:00", hasta: "13:00" }], vie: [{ desde: "09:00", hasta: "13:00" }] },
  bloqueos: [], quien_agenda: null, anticipacion_min_minutos: null, dias_adelante: null,
};

const LFT = {
  id_conversacion: 1,
  respuesta: "Con **3 años** de servicio le corresponden **16 días laborables** de vacaciones pagadas: 12 días el primer año y 2 días más por cada año siguiente (14 el segundo y 16 el tercero), según el artículo 76.\n\nAdemás, tiene derecho a una **prima vacacional** de al menos el 25 % del salario de esos días (artículo 80).",
  articulos: [
    { numero: "76", capitulo: "CAPÍTULO IV · Vacaciones", texto: "Las personas trabajadoras que tengan más de un año de servicios disfrutarán de un periodo anual de vacaciones pagadas, que en ningún caso podrá ser inferior a doce días laborables, y que aumentará en dos días laborables, hasta llegar a veinte, por cada año subsecuente de servicios.\n\nA partir del sexto año, el periodo de vacaciones aumentará en dos días por cada cinco de servicios." },
    { numero: "80", capitulo: "CAPÍTULO IV · Vacaciones", texto: "Los trabajadores tendrán derecho a una prima no menor de veinticinco por ciento sobre los salarios que les correspondan durante el período de vacaciones." },
  ],
};


// Evaluación de desempeño (talento): objetivos, calibración 9-box, reconocimientos y asistente de campaña.
let perfilEval = "hr";
const PLANTILLA_EVAL = {
  id: 8, versionId: 12, version: 1, revision: 1, name: "Operativo planta", description: "", areaId: null, positionId: null, archived: false,
  scale: ["Muy bajo", "Bajo", "Moderado", "Alto", "Muy alto"].map((label) => ({ label, description: label })),
  bands: [{ min: 1, max: 2.99, label: "Requiere seguimiento", color: "red" }, { min: 3, max: 3.99, label: "En progreso", color: "amber" }, { min: 4, max: 5, label: "Buen desempeño", color: "green" }],
  categories: [{ id: 1, name: "Calidad del trabajo", weight: 60, questionWeights: "equal", questions: [{ id: 11, text: "Entrega su trabajo conforme al estándar del puesto.", type: "scale", required: true, scored: true, options: [] }] },
    { id: 2, name: "Seguridad e higiene", weight: 40, questionWeights: "equal", questions: [{ id: 21, text: "Usa siempre el equipo de protección.", type: "scale", required: true, scored: true, options: [] }] }],
};
const COMPANEROS = [
  { id: 101, name: "Ana Torres", area: "Almacén", position: "Montacarguista", managerId: 18 },
  { id: 102, name: "Beto Ruiz", area: "Almacén", position: "Montacarguista", managerId: 18 },
  { id: 103, name: "Carla Gil", area: "Ventas", position: "Cajera", managerId: 19 },
  { id: 104, name: "Diego Paz", area: "Ventas", position: "Cajero", managerId: 19 },
  { id: 18, name: "Jorge Ramírez", area: "Almacén", position: "Jefe de almacén", managerId: null },
  { id: 19, name: "Elena Mora", area: "Ventas", position: "Gerente de tienda", managerId: null },
];
const anio = String(hoy.getFullYear());
const objetivo = (id, title, metric, weight, progress, extra = {}) => ({
  id, title, metric, weight, progress, status: "aprobado", target: null, unit: null, description: "", areaObjective: null, areaObjectiveId: null,
  periodStart: `${anio}-01-01`, periodEnd: `${anio}-12-31`, revision: 1, updates: [{ month: `${anio}-10`, progress: progress - 10, value: null, comment: "" }, { month: `${anio}-11`, progress, value: null, comment: "Vamos bien" }],
  comments: [{ type: "comentario", by: "Jorge Ramírez", text: "Buen avance este mes.", at: momento(-3) }], ...extra,
});
const OBJETIVOS = [{
  employeeId: 101, summary: { percent: 68, score: 3.7 },
  objectives: [
    objetivo(1, "Reducir los retrabajos en el área de carga", "Retrabajos al mes", 40, 70, { target: 2, unit: "retrabajos" }),
    objetivo(2, "Cero incidentes de seguridad", "Incidentes reportados", 35, 80),
    objetivo(3, "Terminar el curso de montacargas avanzado", "Curso concluido", 25, 50),
  ],
}];
const CALIBRACION = {
  id: 3, campaignId: 7, campaign: "Evaluación anual 2026", status: "abierta", revision: 2, closedAt: null,
  cuts: { low: 3, high: 4 }, potentialLabels: ["Bajo", "Medio", "Alto"], can: { move: true }, members: [],
  entries: [
    { employeeId: 101, name: "Ana Torres", score: 3.52, originalScore: 3.52, performanceLevel: 2, potentialLevel: 3, changed: false, revision: 1 },
    { employeeId: 102, name: "Beto Ruiz", score: 4.4, originalScore: 4.1, performanceLevel: 3, potentialLevel: 3, changed: true, revision: 2 },
    { employeeId: 103, name: "Carla Gil", score: 4.1, originalScore: 4.1, performanceLevel: 3, potentialLevel: 2, changed: false, revision: 1 },
    { employeeId: 104, name: "Diego Paz", score: 2.8, originalScore: 2.8, performanceLevel: 1, potentialLevel: 2, changed: false, revision: 1 },
    { employeeId: 105, name: "Fernanda Ríos", score: 3.3, originalScore: 3.3, performanceLevel: 2, potentialLevel: 2, changed: false, revision: 1 },
    { employeeId: 106, name: "Gabriel León", score: 3.6, originalScore: 3.6, performanceLevel: 2, potentialLevel: null, changed: false, revision: 1 },
  ],
  log: [{ at: momento(-1), by: "Laura Ríos", name: "Beto Ruiz", action: "mover", from: { performance: 3, potential: 2, score: 4.1 }, to: { performance: 3, potential: 3, score: 4.4 }, reason: "Lideró la capacitación de montacargas del trimestre." }],
};
const RECONOCIMIENTOS = [
  { id: 1, from: { name: "Jorge Ramírez" }, to: { name: "Ana Torres" }, message: "Gracias por organizar la carga del sábado sin un solo retraso.", competency: "Trabajo en equipo", at: momento(-1) },
  { id: 2, from: { name: "Elena Mora" }, to: { name: "Carla Gil" }, message: "Excelente atención a clientes en la temporada alta.", competency: null, at: momento(-4) },
];
function respuestaEval(p) {
  const hr = perfilEval === "hr";
  if (p === "/capabilities")
    return {
      profile: perfilEval, employeeId: hr ? null : 101, userId: hr ? 1 : null,
      scopes: hr ? ["templates", "catalogs", "levels", "people", "settings", "permissions", "campaigns", "assignments", "team", "results", "dashboard", "plans", "objectives", "calibration", "bonus", "feedback"] : ["people", "assignments", "results", "plans", "objectives", "oneonones", "feedback"],
      flags: { canManageTemplates: hr, canManageCampaigns: hr, canViewCampaigns: hr, canPublishResults: hr, canViewDashboard: hr },
      settings: {}, limits: { templateName: 160, comment: 4000 },
    };
  if (p === "/colleagues") return COMPANEROS;
  if (p === "/objectives") return OBJETIVOS;
  if (p === "/area-objectives") return [];
  if (p === "/calibrations") return [{ id: 3, campaignId: 7, campaign: "Evaluación anual 2026" }];
  if (p === "/campaigns/7/calibration") return CALIBRACION;
  if (p === "/recognitions") return RECONOCIMIENTOS;
  if (p === "/competencies") return ["Calidad del trabajo", "Seguridad e higiene", "Trabajo en equipo"];
  if (p === "/feedback") return [];
  if (p === "/catalogs") return { areas: [{ id: 1, name: "Almacén" }, { id: 2, name: "Ventas" }], positions: [{ id: 1, name: "Montacarguista" }, { id: 2, name: "Cajera" }] };
  if (p === "/templates/8") return PLANTILLA_EVAL;
  if (p === "/settings") return { config: {}, version: 1, persisted: true };
  if (p === "/ai/status") return { activo: false, migracion: true };
  return undefined;
}
const LISTAS_EVAL = {
  "/templates": () => [PLANTILLA_EVAL],
  "/people": () => COMPANEROS.map((c) => ({ id: c.id, employeeId: c.id, name: c.name, area: c.area, position: c.position, managerId: c.managerId, managerName: COMPANEROS.find((m) => m.id === c.managerId)?.name ?? null })),
  "/campaigns": () => [{ id: 7, name: "Evaluación anual 2026", status: "active", model: "180", dueOn: fecha(18), submitted: 40, pending: 8 }],
  "/my/assignments": () => [],
};

function firmar(secret, tipo) {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}

function atender(base, usuario) {
  return async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type,idempotency-key", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base) return json({});
    if (url.origin !== API_ORIGEN) return route.abort();
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    const m = req.method();
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    // Evaluación de desempeño
    const ev = "/checador/evaluaciones-desempeno";
    if (p.startsWith(ev)) {
      const e = p.slice(ev.length);
      if (LISTAS_EVAL[e] && m === "GET") { const filas = LISTAS_EVAL[e](); return json({ data: filas, pagination: { page: 1, pageSize: 100, total: filas.length } }); }
      const d = respuestaEval(e);
      return json({ data: d ?? null, requestId: "ayuda" });
    }
    // Reclutamiento real
    if (p === "/reclutamiento/panel/resumen") return json(RESUMEN);
    if (/^\/reclutamiento\/panel\/postulaciones\/\d+$/.test(p)) return json({ postulacion: DETALLE });
    // WhatsApp de reclutamiento
    const wa = "/reclutamiento/whatsapp";
    if (p === `${wa}/estado`) return json({ modo: "compartido", numero_whatsapp: "5215598765432", conversaciones_mes: 12, puede_usar: true, plantillas_mes: 0, entrevistas_mes: 3, entrevistas_incluidas: null, entrevistas_extra: 0 });
    if (p === `${wa}/agente`) return json(AGENTE);
    if (p === `${wa}/conversaciones`) return json({ conversaciones: [], total: 0, atencion: { total: 0, primeros: [] } });
    if (p === `${wa}/vacantes`) return json({ vacantes: [{ id_vacante: 55, id_empresa: 10, titulo: "Operador de montacargas", slug: "operador-de-montacargas-55", tiene_enlace: true }] });
    if (p === `${wa}/agenda/empresa`) return json({ quien_agenda: "califica", anticipacion_min_minutos: 120, dias_adelante: 7, horarios_a_ofrecer: 3, recordatorios: [1440, 120], pedir_confirmacion: true, permitir_cambios: true, ofrecer_alternas: true, mensajes: {} });
    if (p === `${wa}/vacantes/55/agenda`) return json(AGENDA_VACANTE);
    if (p.startsWith(`${wa}/vacantes/55/agenda/horarios`)) return json({ horarios: [] });
    if (p === `${wa}/bolsa`) return json({ id_empresa: 10, publicar_bolsa: true });
    if (p.startsWith(wa)) return json({});
    // Adamia AI (agente de la Ley Federal del Trabajo)
    if (p === "/checador/ia/estado") return json({ ok: true, activo: true, tope_mensual_usd: 5, limite_hora_usuario: 30, puede_activar: true, gasto_mes_usd: 0.42, usos_mes: 12, lft: { reforma: "2026-05-14", articulos: 1260 }, creditos: { disponible: true, cobro_activo: false } });
    if (p === "/checador/ia/lft/preguntar" && m === "POST") { await dormir(400); return json(LFT); }
    if (p === "/checador/ia/lft/conversaciones") return json({ conversaciones: [] });
    // Seguridad y Face ID
    if (p === "/auth/passkeys") return json({ passkeys: [{ id: 1, nombre: "iPhone de Ana", creado_en: momento(-30), ultimo_uso_en: momento(-1) }] });
    if (p === "/auth/sesiones") return json({ sesiones: [{ id: 1, dispositivo: "iPhone · Safari", via: "passkey", actual: true, ultimo_uso_en: momento(0) }, { id: 2, dispositivo: "Computadora · Chrome", via: "contrasena", actual: false, ultimo_uso_en: momento(-3) }] });
    return json({});
  };
}

async function capturasPropias() {
  const secret = randomUUID();
  const reserva = createServer();
  await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
  const port = reserva.address().port;
  await new Promise((r) => reserva.close(r));
  const base = `http://127.0.0.1:${port}`;
  const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { cwd: REPO, stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
  const dir = path.join(TMP, "propias");
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const foto = (pg, nombre, opciones = {}) => pg.screenshot({ path: path.join(dir, `${nombre}.png`), ...opciones });
  const intentar = async (nombre, fn) => {
    try {
      await fn();
      console.log(`OK    ${nombre}`);
    } catch (e) {
      console.log(`FALLÓ ${nombre}: ${String(e?.message ?? e).split("\n")[0]}`);
    }
  };
  async function sesion(usuario, viewport) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: viewport.width < 500 });
    await ctx.addCookies([{ name: "token", value: firmar(secret, usuario.tipo_usuario), url: base }]);
    await ctx.route("**/*", atender(base, usuario));
    return ctx.newPage();
  }
  try {
    for (let i = 0; ; i++) {
      try {
        if ((await fetch(`${base}/login`)).status) break;
      } catch {
        /* aún no arranca */
      }
      if (i > 300) throw new Error("Next no arrancó");
      await dormir(150);
    }
    const ESCRITORIO = { width: 1440, height: 900 };
    const CELULAR = { width: 390, height: 844 };
    const ir = (pg, ruta) => pg.goto(base + ruta, { waitUntil: "domcontentloaded" });

    await intentar("reclutamiento", async () => {
      const pg = await sesion(RH, ESCRITORIO);
      await ir(pg, "/panel/reclutamiento");
      await pg.getByText("Tu proceso, de un vistazo").waitFor({ timeout: 30000 });
      await dormir(600);
      await foto(pg, "rec-dashboard");
      await ir(pg, "/panel/reclutamiento/vacantes");
      await pg.getByText("Operador de montacargas").first().waitFor({ timeout: 30000 });
      await dormir(400);
      await foto(pg, "rec-vacantes");
      await pg.getByRole("button", { name: "Nueva vacante" }).first().click();
      await pg.getByLabel("Nombre del puesto *").fill("Auxiliar de almacén");
      await dormir(500);
      await foto(pg, "rec-crear-vacante");
      await ir(pg, "/panel/reclutamiento/candidatos");
      await pg.getByText("Carla Gil").first().waitFor({ timeout: 30000 });
      await dormir(400);
      await foto(pg, "rec-candidatos");
      await ir(pg, "/panel/reclutamiento/candidatos/201");
      await pg.getByText("Notas del equipo").first().waitFor({ timeout: 30000 }).catch(() => {});
      await dormir(600);
      await foto(pg, "rec-expediente");
      await pg.getByRole("tab", { name: /Contratar/ }).click();
      await pg.getByText("Prepara su llegada al equipo").waitFor({ timeout: 15000 });
      await dormir(400);
      await foto(pg, "rec-contratar");
      await pg.context().close();
    });

    await intentar("whatsapp", async () => {
      const pg = await sesion(RH, ESCRITORIO);
      await ir(pg, "/panel/whatsapp");
      await pg.getByRole("button", { name: /Agente encendido/ }).first().click({ timeout: 30000 });
      await pg.getByRole("dialog").getByText("Nombre del asistente").waitFor({ timeout: 15000 });
      await dormir(600);
      await foto(pg, "wa-configurar-agente");
      await pg.keyboard.press("Escape");
      await dormir(400);
      await pg.getByRole("button", { name: "Más opciones" }).click();
      await pg.getByRole("menuitem", { name: /Enlaces de vacantes/ }).click();
      await pg.getByRole("button", { name: "Agenda de Operador de montacargas" }).click({ timeout: 15000 });
      await pg.getByText("Dónde y con quién").waitFor({ timeout: 15000 });
      await dormir(600);
      await foto(pg, "wa-agenda-vacante");
      await pg.context().close();
    });

    await intentar("adamia-ai", async () => {
      const pg = await sesion(RH, ESCRITORIO);
      await ir(pg, "/panel/reclutamiento");
      await pg.getByRole("button", { name: "Adamia AI", exact: true }).first().click({ timeout: 30000 });
      await pg.getByRole("button", { name: /vacaciones le tocan/ }).click({ timeout: 15000 });
      await pg.getByText("Art. 76 LFT").waitFor({ timeout: 15000 });
      await dormir(500);
      await foto(pg, "ia-ley");
      await pg.context().close();
    });


    await intentar("evaluaciones", async () => {
      perfilEval = "employee";
      const emp = await sesion(ANA, CELULAR);
      await ir(emp, "/empleado/panel/evaluaciones/objetivos");
      await emp.getByText("Reducir los retrabajos").first().waitFor({ timeout: 30000 });
      await dormir(600);
      await emp.getByText("Reducir los retrabajos").first().scrollIntoViewIfNeeded();
      await foto(emp, "ev-objetivos");
      await ir(emp, "/empleado/panel/evaluaciones/reconocimientos");
      await emp.getByText("Gracias por organizar la carga").first().waitFor({ timeout: 30000 });
      await dormir(500);
      await foto(emp, "ev-reconocimientos");
      await emp.context().close();
      perfilEval = "hr";
      const rh = await sesion(RH, ESCRITORIO);
      await ir(rh, "/panel/evaluaciones/calibracion");
      await rh.getByText("Sin potencial asignado").first().waitFor({ timeout: 30000 });
      await dormir(600);
      await foto(rh, "ev-calibracion", { fullPage: true });
      await ir(rh, "/panel/evaluaciones/campanas/nueva");
      await rh.getByText("Define la campaña").first().waitFor({ timeout: 30000 });
      await rh.getByLabel("Nombre de campaña").fill("Desempeño · Cuarto trimestre 2026");
      await dormir(500);
      await foto(rh, "ev-campana-nueva");
      await rh.context().close();
    });

    // Seguridad y Face ID: la guía (y sus capturas) es seguridad/face-id-y-sesiones (nomina.mjs).
  } finally {
    await browser.close();
    next.kill("SIGTERM");
  }
}

// ───────── 3) recorte y conversión a webp ─────────
// [origen (relativo a TMP), destino (relativo a public/ayuda/capturas), recorte [x, y, ancho, alto] o null, ancho final,
//  tapas: rectángulos (en coordenadas de la PNG) que se cubren antes de recortar, con un texto opcional]
const CONVERTIR = [
  ["clima/1440-plantillas.png", "clima/plantillas.webp", [256, 0, 1184, 1030]],
  ["clima/1440-plantillas.png", "clima/tus-encuestas.webp", [256, 1185, 1184, 300]],
  ["clima/1440-editor.png", "clima/editor.webp", [256, 0, 1184, 900]],
  ["clima/1440-editor-adamia-ai.png", "clima/editor-revision-ia.webp", [256, 0, 1184, 900]],
  ["clima/1440-lanzar.png", "clima/lanzar.webp", [256, 0, 1184, 1084]],
  ["clima-canales/1440-lanzar-canales.png", "clima/lanzar-canales.webp", [256, 0, 1184, 1112]],
  ["clima-aviso/390-empleado-inicio-aviso.png", "clima/aviso-inicio.webp", [0, 0, 390, 844]],
  ["clima-aviso/1440-panel-mis-encuestas.png", "clima/mis-encuestas-panel.webp", [256, 0, 1184, 700]],
  ["clima/390-contestar.png", "clima/contestar-celular.webp", null],
  ["clima/390-nom035-inicio.png", "clima/nom035-inicio-celular.webp", null],
  ["clima-canales/390-inicio-pulso.png", "clima/como-te-fue-hoy.webp", [0, 0, 390, 844]],
  ["clima-dash/1440-dashboard.png", "clima/tablero.webp", [256, 0, 1184, 1300]],
  ["clima-insp/1440-tablero-riesgo.png", "clima/riesgo-rotacion.webp", [256, 2500, 1184, 400]],
  ["clima-insp/1440-analitica.png", "clima/analitica.webp", [256, 0, 1184, 1373]],
  ["clima-dash/390-agregar-accion.png", "clima/agregar-accion.webp", null],
  ["clima-dash/1440-tarjeta-plan-sugerido.png", "clima/plan-sugerido.webp", null],
  ["clima-dash/1440-plan-por-asignar.png", "clima/plan-por-asignar.webp", null],
  ["clima-canales/390-mis-encuestas-jefe.png", "clima/mis-encuestas-jefe.webp", null],
  ["clima-canales/1440-vista-jefe.png", "clima/vista-jefe.webp", [256, 0, 1184, 1371]],
  ["clima/1440-nom035.png", "clima/nom035-resultados.webp", [256, 0, 1184, 1512]],
  ["clima-insp/1440-expediente.png", "clima/expediente.webp", [256, 0, 1184, 1310]],
  // La liga del buzón de la prueba apunta al servidor local: se tapa con una liga de ejemplo.
  ["clima-insp/1440-buzon.png", "clima/buzon-panel.webp", [256, 0, 1184, 1000], null, [{ r: [300, 380, 470, 34], fondo: "#f1f5f9", texto: "https://adamia.com.mx/buzon/7.AbCdEfGhIjKlMnOpQrStUv", tinta: "#1e293b", letra: "13px monospace", x: 306, y: 402 }]],
  ["clima-insp/390-buzon-publico.png", "clima/buzon-publico.webp", null],
  ["clima-insp/1440-ciclo-vida.png", "clima/ciclo-vida.webp", [285, 1480, 1135, 300]],
  ["eval-tablero/plantillas-base-1440.png", "evaluaciones/plantillas-base.webp", [256, 0, 1184, 1000]],
    ["eval-tablero/tablero-campania-1440.png", "evaluaciones/tablero-campana.webp", [256, 0, 1184, 1500]],
  ["eval-tablero/empleado-aviso-1440.png", "evaluaciones/por-responder.webp", [256, 0, 1184, 800]],
  ["eval-tablero/responder-evidencia-ia-1440.png", "evaluaciones/responder-evidencia-ia.webp", [256, 0, 1184, 1400]],
  ["eval-tablero/resultado-ia-1440.png", "evaluaciones/resultado-ia.webp", [256, 0, 1184, 1500]],
  ["eval-tablero/configuracion-whatsapp-1440.png", "evaluaciones/configuracion-whatsapp.webp", [256, 0, 1184, 1500]],
  ["propias/ev-objetivos.png", "evaluaciones/objetivos.webp", null],
  ["propias/ev-reconocimientos.png", "evaluaciones/reconocimientos.webp", null],
  ["propias/ev-calibracion.png", "evaluaciones/calibracion-9-box.webp", [256, 0, 1184, 1300]],
  ["propias/ev-campana-nueva.png", "evaluaciones/nueva-campana.webp", [256, 0, 1184, 900]],
  ["propias/rec-dashboard.png", "reclutamiento/dashboard.webp", null],
  ["propias/rec-vacantes.png", "reclutamiento/vacantes.webp", null],
  ["propias/rec-crear-vacante.png", "reclutamiento/crear-vacante.webp", null],
  ["propias/rec-candidatos.png", "reclutamiento/candidatos.webp", null],
  ["propias/rec-expediente.png", "reclutamiento/expediente.webp", null],
  ["propias/rec-contratar.png", "reclutamiento/contratar.webp", null],
  ["bolsa/bolsa-escritorio-portada.png", "reclutamiento/bolsa-de-trabajo.webp", null],
  ["wavac/vacante-con-wa-1440.png", "reclutamiento/vacante-publica.webp", null],
  ["bolsa/vacante-celular-otp.png", "reclutamiento/solicitud-codigo.webp", null, 390],
  ["propias/wa-configurar-agente.png", "reclutamiento/configurar-agente.webp", null],
  ["lumob/b2-02-editor-campos-1440.png", "reclutamiento/entrevista-editor.webp", null],
  ["lumo/06-requisitos-1440.png", "reclutamiento/requisitos.webp", null],
  ["lumob/b1-01-ubicar-en-mapa-1440.png", "reclutamiento/ubicar-sucursal.webp", null],
  ["whatsapp/01-bandeja-escritorio.png", "reclutamiento/bandeja.webp", null],
  ["lumo/03-ficha-requisitos-1440.png", "reclutamiento/ficha-candidato.webp", null],
  ["lumo/01-conocimiento-1440.png", "reclutamiento/base-de-conocimiento.webp", null],
  ["propias/wa-agenda-vacante.png", "reclutamiento/agenda-vacante.webp", [330, 40, 780, 830]],
  ["propias/ia-ley.png", "adamia-ai/ley-federal-del-trabajo.webp", [980, 0, 460, 900]],
  ["clima/1440-plantillas.png", "adamia-ai/indicador-uso.webp", [280, 245, 1130, 265]],
  ["clima-aviso/390-empleado-mi-espacio.png", "mi-espacio/mi-espacio.webp", [0, 0, 390, 844]],
  ["clima-aviso/390-empleado-inicio-aviso.png", "mi-espacio/inicio.webp", [0, 0, 390, 844]],
];

async function convertir() {
  const browser = await chromium.launch();
  const pg = await browser.newPage();
  await pg.setContent("<!doctype html><title>conversión</title>");
  let hechas = 0;
  for (const [origen, destino, recorte, anchoFinal, tapas] of CONVERTIR) {
    const archivo = path.join(TMP, origen);
    if (!existsSync(archivo)) {
      console.log(`FALTA ${origen} → ${destino}`);
      continue;
    }
    const png = readFileSync(archivo).toString("base64");
    let calidad = 0.8;
    let datos = null;
    for (;;) {
      datos = await pg.evaluate(
        async ({ png, recorte, anchoFinal, calidad, tapas }) => {
          const img = new Image();
          img.src = `data:image/png;base64,${png}`;
          await img.decode();
          const W0 = img.naturalWidth;
          const H0 = img.naturalHeight;
          let fuente = img;
          if (tapas?.length) {
            const lienzo = document.createElement("canvas");
            lienzo.width = W0;
            lienzo.height = H0;
            const c2 = lienzo.getContext("2d");
            c2.drawImage(img, 0, 0);
            for (const t of tapas) {
              c2.fillStyle = t.fondo;
              c2.fillRect(...t.r);
              if (t.texto) {
                c2.fillStyle = t.tinta;
                c2.font = t.letra;
                c2.fillText(t.texto, t.x, t.y);
              }
            }
            fuente = lienzo;
          }
          const [x, y, w, h] = recorte ?? [0, 0, W0, H0];
          const ancho = Math.min(w, W0 - x);
          const alto = Math.min(h, H0 - y);
          const escala = anchoFinal ? anchoFinal / ancho : 1;
          const c = document.createElement("canvas");
          c.width = Math.round(ancho * escala);
          c.height = Math.round(alto * escala);
          const ctx = c.getContext("2d");
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(fuente, x, y, ancho, alto, 0, 0, c.width, c.height);
          return c.toDataURL("image/webp", calidad).split(",")[1];
        },
        { png, recorte, anchoFinal: anchoFinal ?? null, calidad, tapas: tapas ?? null }
      );
      if (Buffer.byteLength(datos, "base64") <= 200 * 1024 || calidad <= 0.45) break;
      calidad -= 0.1;
    }
    const final = path.join(SALIDA, destino);
    mkdirSync(path.dirname(final), { recursive: true });
    writeFileSync(final, Buffer.from(datos, "base64"));
    hechas += 1;
    console.log(`webp  ${destino} (${Math.round(Buffer.byteLength(datos, "base64") / 1024)} KB, calidad ${calidad.toFixed(1)})`);
  }
  await browser.close();
  console.log(`${hechas} de ${CONVERTIR.length} capturas listas en ${SALIDA}`);
}

if (!process.env.SOLO_CONVERTIR) {
  if (!process.env.SIN_VERIFY) for (const [carpeta, script] of VERIFY) await correr(carpeta, script);
  await capturasPropias();
}
await convertir();
