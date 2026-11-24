// Reglas de pantalla de la agenda de entrevistas y recordatorios por WhatsApp (R3, «APROBADO R3»).
// Todo es configurable en pantalla: valores de la empresa y, por vacante, valores propios (vacío = «Usar el de la empresa»).
// Es un espejo de la validación del API, que es la que manda. Fechas: el API manda y recibe texto «YYYY-MM-DD HH:mm» en hora
// de Ciudad de México; aquí se trabaja con ese texto tal cual (sin convertir zonas), así el navegador no altera la hora.
import { DIAS } from "./entrevista.mjs";
import { claveDia } from "./tiempo.mjs";

// ——— Quién agenda ———
export const MODOS_AGENDA = [
  {
    valor: "califica",
    titulo: "Solo a quien califica",
    texto: "El agente agenda directo a los candidatos que califican. Los que tienen alguna alerta esperan a que tú los apruebes.",
  },
  {
    valor: "califica_y_alerta",
    titulo: "A quien califica o tiene alerta",
    texto: "El agente agenda a los que califican y también a los que tienen alguna alerta. Revisas las alertas antes de la entrevista.",
  },
  {
    valor: "aprobacion",
    titulo: "Tú apruebas cada cita",
    texto: "El agente entrevista y te avisa. Nadie recibe horarios hasta que presionas «Aprobar para agendar» en su conversación.",
  },
];
export const textoModoAgenda = (valor) => MODOS_AGENDA.find((m) => m.valor === valor)?.titulo ?? "";

// ——— Estados de una cita ———
const ESTADOS_CITA = {
  agendada: { texto: "Agendada", tono: "azul" },
  confirmada: { texto: "Confirmada", tono: "verde" },
  reagendada: { texto: "Reagendada", tono: "azul" },
  cancelada: { texto: "Cancelada", tono: "gris" },
  asistio: { texto: "Asistió", tono: "verde" },
  no_asistio: { texto: "No asistió", tono: "rojo" },
};
export const ESTADOS_FILTRO = Object.entries(ESTADOS_CITA).map(([valor, e]) => ({ valor, texto: e.texto }));
export const etiquetaEstadoCita = (estado) => ESTADOS_CITA[estado] ?? { texto: "Sin estado", tono: "gris" };
const ACTIVAS = new Set(["agendada", "confirmada", "reagendada"]);
export const citaActiva = (cita) => !!cita && ACTIVAS.has(cita.estado);

// Acciones que se ofrecen en una cita. Asistencia: desde el día de la cita (el API decide).
export function accionesCita(cita, hoy) {
  const activa = citaActiva(cita);
  const dia = String(cita?.inicio ?? "").slice(0, 10);
  return {
    confirmar: activa && cita.estado !== "confirmada",
    reagendar: activa,
    cancelar: activa,
    asistencia: activa && !!dia && !!hoy && dia <= hoy,
  };
}

// ——— Minutos ↔ texto («24 h antes», «1 h 30 min», «30 min») ———
export function formatearMinutos(minutos) {
  const m = Math.round(Number(minutos));
  if (!Number.isFinite(m) || m <= 0) return "";
  const h = Math.floor(m / 60);
  const resto = m % 60;
  if (!h) return `${resto} min`;
  return resto ? `${h} h ${resto} min` : `${h} h`;
}
export const textoRecordatorio = (minutos) => {
  const t = formatearMinutos(minutos);
  return t ? `${t} antes` : "";
};

export const MAX_RECORDATORIOS = 5;
export const MIN_RECORDATORIO = 5; // minutos
export const MAX_RECORDATORIO = 7 * 24 * 60; // una semana

// Lo que el usuario escribe (cantidad + unidad) → { minutos, error }.
export function leerRecordatorio(cantidad, unidad = "horas") {
  const t = String(cantidad ?? "").trim().replace(",", ".");
  if (!t) return { minutos: null, error: "Escribe cuánto tiempo antes." };
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return { minutos: null, error: "Escribe un número mayor que 0." };
  const minutos = Math.round(unidad === "minutos" ? n : n * 60);
  if (minutos < MIN_RECORDATORIO) return { minutos: null, error: `El recordatorio debe ser al menos ${MIN_RECORDATORIO} min antes.` };
  if (minutos > MAX_RECORDATORIO) return { minutos: null, error: "El recordatorio puede ser hasta 7 días (168 h) antes." };
  return { minutos, error: "" };
}

// Agrega sin repetir, ordenados del más anticipado al más cercano. Devuelve { lista, error }.
export function agregarRecordatorio(lista, minutos) {
  const actual = normalizarRecordatorios(lista);
  if (actual.includes(minutos)) return { lista: actual, error: `Ya tienes un recordatorio ${textoRecordatorio(minutos)}.` };
  if (actual.length >= MAX_RECORDATORIOS) return { lista: actual, error: `Máximo ${MAX_RECORDATORIOS} recordatorios.` };
  return { lista: normalizarRecordatorios([...actual, minutos]), error: "" };
}
export function normalizarRecordatorios(lista) {
  const set = new Set();
  for (const v of Array.isArray(lista) ? lista : []) {
    const n = Math.round(Number(v));
    if (Number.isFinite(n) && n >= MIN_RECORDATORIO && n <= MAX_RECORDATORIO) set.add(n);
  }
  return [...set].sort((a, b) => b - a);
}

// Horas en pantalla ↔ minutos del API. «» = vacío (null). Acepta decimales: «1.5» = 90 min.
export function horasDesdeMinutos(minutos) {
  if (minutos === null || minutos === undefined || minutos === "") return "";
  const n = Number(minutos);
  if (!Number.isFinite(n)) return "";
  return String(Math.round((n / 60) * 100) / 100);
}
export function minutosDesdeHoras(texto, { max = 720 } = {}) {
  const t = String(texto ?? "").trim().replace(",", ".");
  if (!t) return { valor: null, error: "" };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { valor: null, error: "Escribe un número de horas (0 o más)." };
  if (n > max) return { valor: null, error: `Máximo ${max} horas.` };
  return { valor: Math.round(n * 60), error: "" };
}
function enteroEnRango(texto, min, max, nombre) {
  const t = String(texto ?? "").trim();
  if (!t) return { valor: null, error: "" };
  const n = Number(t);
  if (!Number.isInteger(n) || n < min || n > max) return { valor: null, error: `${nombre}: escribe un número entero de ${min} a ${max}.` };
  return { valor: n, error: "" };
}

// ——— Mensajes del agente y marcadores ———
export const MARCADORES = [
  { clave: "nombre", texto: "Nombre del candidato" },
  { clave: "empresa", texto: "Empresa" },
  { clave: "vacante", texto: "Vacante" },
  { clave: "fecha", texto: "Fecha de la cita" },
  { clave: "hora", texto: "Hora de la cita" },
  { clave: "direccion", texto: "Dirección" },
  { clave: "enlace", texto: "Enlace de video" },
  { clave: "que_llevar", texto: "Qué llevar" },
  { clave: "entrevistador", texto: "Entrevistador" },
];
export const LIMITE_TEXTO_AGENTE = 1000;
// «fuera_horario» ya se edita en la pestaña «Agente» (R2, mensaje_fuera_horario); aquí no se repite para no tener dos fuentes.
export const TEXTOS_AGENTE = [
  { clave: "saludo", titulo: "Saludo", ayuda: "Primer mensaje cuando un candidato escribe.",
    original: "¡Hola {nombre}! Gracias por tu interés en la vacante de {vacante} en {empresa}. Te haré unas preguntas rápidas." },
  { clave: "confirmacion_cita", titulo: "Cita agendada", ayuda: "Se envía al agendar o reagendar la entrevista.",
    original: "Listo, {nombre}: tu entrevista para {vacante} es el {fecha} a las {hora} en {direccion}. Trae {que_llevar}. Te atiende {entrevistador}." },
  { clave: "recordatorio", titulo: "Recordatorio", ayuda: "Se envía antes de la cita, según tus recordatorios.",
    original: "Hola {nombre}, te recordamos tu entrevista para {vacante} el {fecha} a las {hora} en {direccion}. ¿Nos confirmas tu asistencia?" },
  { clave: "despedida", titulo: "Despedida", ayuda: "Al terminar la entrevista por WhatsApp.",
    original: "Gracias por tu tiempo, {nombre}. ¡Mucho éxito!" },
  { clave: "no_califica", titulo: "No califica", ayuda: "Cuando el candidato no cumple con lo que pide la vacante.",
    original: "Gracias, {nombre}. Por ahora tu perfil no coincide con lo que busca la vacante de {vacante}. Te tendremos en cuenta para otras oportunidades." },
];
export const DATOS_EJEMPLO = {
  nombre: "Ana Ruiz", empresa: "tu empresa", vacante: "Operador de montacargas", fecha: "lunes 30 de noviembre", hora: "10:00 a.m.",
  direccion: "Av. Industrial 120, Apodaca", enlace: "https://meet.google.com/abc-defg-hij", que_llevar: "INE y CV impreso", entrevistador: "Laura Gómez",
};
const CLAVES_MARCADORES = new Set(MARCADORES.map((m) => m.clave));
// Marcadores escritos que el agente no conoce (por ejemplo «{nombr}»), sin repetir.
export function marcadoresDesconocidos(texto) {
  const vistos = new Set();
  for (const m of String(texto ?? "").matchAll(/\{([^{}\s]*)\}/g)) if (!CLAVES_MARCADORES.has(m[1])) vistos.add(`{${m[1]}}`);
  return [...vistos];
}
// Vista previa: reemplaza los marcadores conocidos con los datos; los desconocidos se dejan tal cual.
export function renderizarTexto(texto, datos = DATOS_EJEMPLO) {
  return String(texto ?? "").replace(/\{([a-z_]+)\}/g, (todo, clave) => (CLAVES_MARCADORES.has(clave) && datos[clave] != null ? String(datos[clave]) : todo));
}
// Inserta en la posición del cursor (o reemplaza la selección). Devuelve { texto, cursor }.
export function insertarEnCursor(texto, inicio, fin, insercion) {
  const base = String(texto ?? "");
  const a = Number.isInteger(inicio) ? Math.max(0, Math.min(inicio, base.length)) : base.length;
  const b = Number.isInteger(fin) ? Math.max(a, Math.min(fin, base.length)) : a;
  return { texto: base.slice(0, a) + insercion + base.slice(b), cursor: a + insercion.length };
}

// ——— Plantillas de WhatsApp ———
export const PLANTILLAS_SUGERIDAS = ["recordatorio_entrevista", "seguimiento_candidato", "confirmacion_entrevista"];
export const IDIOMAS_PLANTILLA = [
  { valor: "es_MX", texto: "Español (México) · es_MX" },
  { valor: "es", texto: "Español · es" },
  { valor: "en_US", texto: "Inglés (EE. UU.) · en_US" },
];
const NOMBRE_PLANTILLA = /^[a-z0-9_]{1,512}$/;

// Aviso (no bloquea): con recordatorios y sin plantilla, los que caigan fuera de las 24 h no se pueden enviar.
export const avisoSinPlantilla = (form) =>
  normalizarRecordatorios(form?.recordatorios).length && !String(form?.plantilla_recordatorio ?? "").trim()
    ? "Sin plantilla de recordatorio, WhatsApp solo deja enviar recordatorios si el candidato escribió en las últimas 24 h."
    : "";

// ——— Agenda de la empresa ———
export const LIMITES_EMPRESA = { anticipacionHoras: 720, dias: { min: 1, max: 60 }, horarios: { min: 1, max: 10 } };

export function agendaEmpresaDesdeApi(a) {
  const textos = {};
  for (const { clave } of TEXTOS_AGENTE) textos[clave] = String(a?.textos?.[clave] ?? "");
  return {
    quien_agenda: MODOS_AGENDA.some((m) => m.valor === a?.quien_agenda) ? a.quien_agenda : "califica",
    anticipacion_horas: horasDesdeMinutos(a?.anticipacion_min_minutos ?? 120),
    dias_adelante: String(a?.dias_adelante ?? 7),
    horarios_a_ofrecer: String(a?.horarios_a_ofrecer ?? 3),
    recordatorios: normalizarRecordatorios(a?.recordatorios ?? []),
    pedir_confirmacion: a?.pedir_confirmacion !== false,
    permitir_cambios: a?.permitir_cambios !== false,
    ofrecer_alternas: a?.ofrecer_alternas === true,
    plantilla_recordatorio: String(a?.plantilla_recordatorio ?? ""),
    plantilla_seguimiento: String(a?.plantilla_seguimiento ?? ""),
    plantilla_idioma: String(a?.plantilla_idioma || "es_MX"),
    textos,
  };
}

// Formulario → { errores, valido, cuerpo } para PUT /agenda/empresa. Textos vacíos no se mandan: el agente usa el original.
export function validarAgendaEmpresa(form) {
  const errores = {};
  const anticipacion = minutosDesdeHoras(form?.anticipacion_horas, { max: LIMITES_EMPRESA.anticipacionHoras });
  if (anticipacion.error) errores.anticipacion_horas = anticipacion.error;
  else if (anticipacion.valor === null) errores.anticipacion_horas = "Escribe con cuántas horas de anticipación mínima se puede agendar (0 = sin mínimo).";
  const dias = enteroEnRango(form?.dias_adelante, LIMITES_EMPRESA.dias.min, LIMITES_EMPRESA.dias.max, "Días hacia adelante");
  if (dias.error || dias.valor === null) errores.dias_adelante = dias.error || "Escribe cuántos días hacia adelante se ofrecen horarios.";
  const horarios = enteroEnRango(form?.horarios_a_ofrecer, LIMITES_EMPRESA.horarios.min, LIMITES_EMPRESA.horarios.max, "Horarios a ofrecer");
  if (horarios.error || horarios.valor === null) errores.horarios_a_ofrecer = horarios.error || "Escribe cuántos horarios ofrece el agente.";
  const plantillas = {};
  for (const campo of ["plantilla_recordatorio", "plantilla_seguimiento"]) {
    const v = String(form?.[campo] ?? "").trim();
    if (v && !NOMBRE_PLANTILLA.test(v)) errores[campo] = "Usa el nombre exacto de la plantilla: minúsculas, números y guion bajo (_), sin espacios.";
    plantillas[campo] = v || null;
  }
  const recordatorios = normalizarRecordatorios(form?.recordatorios);
  const idioma = String(form?.plantilla_idioma ?? "").trim();
  if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(idioma)) errores.plantilla_idioma = "Elige el idioma de las plantillas.";
  const textos = {};
  const erroresTextos = {};
  for (const { clave, titulo } of TEXTOS_AGENTE) {
    const t = String(form?.textos?.[clave] ?? "").trim();
    if (!t) continue;
    if (t.length > LIMITE_TEXTO_AGENTE) erroresTextos[clave] = `${titulo}: máximo ${LIMITE_TEXTO_AGENTE} caracteres.`;
    const raros = marcadoresDesconocidos(t);
    if (raros.length) erroresTextos[clave] = `${titulo}: el agente no conoce ${raros.join(", ")}. Usa los botones de marcadores.`;
    textos[clave] = t;
  }
  if (Object.keys(erroresTextos).length) errores.textos = erroresTextos;
  const cuerpo = {
    quien_agenda: MODOS_AGENDA.some((m) => m.valor === form?.quien_agenda) ? form.quien_agenda : "califica",
    anticipacion_min_minutos: anticipacion.valor,
    dias_adelante: dias.valor,
    horarios_a_ofrecer: horarios.valor,
    recordatorios,
    pedir_confirmacion: form?.pedir_confirmacion === true,
    permitir_cambios: form?.permitir_cambios === true,
    ofrecer_alternas: form?.ofrecer_alternas === true,
    plantilla_recordatorio: plantillas.plantilla_recordatorio,
    plantilla_seguimiento: plantillas.plantilla_seguimiento,
    plantilla_idioma: idioma,
    textos,
  };
  return { errores, valido: !Object.keys(errores).length, cuerpo };
}

// ——— Agenda por vacante ———
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_HORA = /^(\d{4})-(\d{2})-(\d{2})[ T]([01]\d|2[0-3]):([0-5]\d)$/;
export const LIMITES_VACANTE = { duracion: { min: 10, max: 240 }, cupo: { min: 1, max: 50 }, rangosPorDia: 4, bloqueos: 30, texto: 300, motivo: 120 };

export function horarioVacanteVacio() {
  const h = {};
  for (const { clave } of DIAS) h[clave] = [];
  return h;
}
const rangoValido = (r) => HORA.test(r.desde) && HORA.test(r.hasta);

// Revisa los rangos de un día: formato, inicio < fin y sin empalmes. Devuelve el texto del error o «».
export function validarRangos(rangos, nombreDia = "Este día") {
  const lista = (rangos ?? []).map((r) => ({ desde: String(r?.desde ?? "").slice(0, 5), hasta: String(r?.hasta ?? "").slice(0, 5) }));
  if (lista.length > LIMITES_VACANTE.rangosPorDia) return `${nombreDia}: máximo ${LIMITES_VACANTE.rangosPorDia} horarios.`;
  if (lista.some((r) => !rangoValido(r))) return `${nombreDia}: escribe la hora de inicio y de fin.`;
  if (lista.some((r) => r.desde >= r.hasta)) return `${nombreDia}: la hora de fin debe ser después de la de inicio.`;
  const orden = [...lista].sort((a, b) => a.desde.localeCompare(b.desde));
  for (let i = 1; i < orden.length; i++) {
    if (orden[i].desde < orden[i - 1].hasta) return `${nombreDia}: los horarios ${orden[i - 1].desde}–${orden[i - 1].hasta} y ${orden[i].desde}–${orden[i].hasta} se empalman.`;
  }
  return "";
}

export function copiarDiaATodos(horario, origen) {
  const rangos = (horario?.[origen] ?? []).map((r) => ({ ...r }));
  const h = {};
  for (const { clave } of DIAS) h[clave] = rangos.map((r) => ({ ...r }));
  return h;
}

// «2026-11-30 09:00» ↔ «2026-11-30T09:00» (valor de <input type="datetime-local">).
export const aDatetimeLocal = (texto) => {
  const m = String(texto ?? "").trim().match(FECHA_HORA);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}` : "";
};
export const aTextoApi = (local) => {
  const m = String(local ?? "").trim().match(FECHA_HORA);
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : "";
};

let secuencia = 0;
const claveLocal = () => `l${Date.now().toString(36)}${(secuencia++).toString(36)}`;
export const bloqueoNuevo = (hoy) => ({ clave: claveLocal(), desde: hoy ? `${hoy}T09:00` : "", hasta: hoy ? `${hoy}T18:00` : "", motivo: "" });
const aMinutos = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
// Rango nuevo: si ya hay uno, empieza donde termina el anterior y dura 2 h (sin pasar de 23:59).
export const rangoNuevo = (anterior) => {
  if (anterior && HORA.test(anterior.hasta) && anterior.hasta < "23:00") {
    const inicio = aMinutos(anterior.hasta);
    return { clave: claveLocal(), desde: anterior.hasta, hasta: aHora(Math.min(inicio + 120, 23 * 60 + 59)) };
  }
  return { clave: claveLocal(), desde: "09:00", hasta: "13:00" };
};

// El servidor (GET /vacantes/:id/agenda) responde `horario_json` y `bloqueos_json`; los mocks, `horario` y `bloqueos`.
// Se aceptan los dos.
const horarioDeApi = (a) => a?.horario ?? a?.horario_json ?? null;
const bloqueosDeApi = (a) => a?.bloqueos ?? a?.bloqueos_json ?? null;

export function agendaVacanteDesdeApi(a) {
  const horario = horarioVacanteVacio();
  for (const { clave } of DIAS) {
    const dia = horarioDeApi(a)?.[clave];
    horario[clave] = (Array.isArray(dia) ? dia : dia ? [dia] : []).map((r) => ({ clave: claveLocal(), desde: String(r?.desde ?? "").slice(0, 5), hasta: String(r?.hasta ?? "").slice(0, 5) }));
  }
  return {
    activa: a?.activa === true,
    modalidad: a?.modalidad === "video" ? "video" : "presencial",
    direccion: String(a?.direccion ?? ""),
    referencia: String(a?.referencia ?? ""),
    enlace_video: String(a?.enlace_video ?? ""),
    entrevistador: String(a?.entrevistador ?? ""),
    que_llevar: String(a?.que_llevar ?? ""),
    duracion_minutos: String(a?.duracion_minutos ?? 30),
    cupo_por_horario: String(a?.cupo_por_horario ?? 1),
    horario,
    bloqueos: (Array.isArray(bloqueosDeApi(a)) ? bloqueosDeApi(a) : []).map((b) => ({ clave: claveLocal(), desde: aDatetimeLocal(b?.desde), hasta: aDatetimeLocal(b?.hasta), motivo: String(b?.motivo ?? "") })),
    quien_agenda: MODOS_AGENDA.some((m) => m.valor === a?.quien_agenda) ? a.quien_agenda : "",
    usa_anticipacion_empresa: a?.anticipacion_min_minutos === null || a?.anticipacion_min_minutos === undefined,
    anticipacion_horas: horasDesdeMinutos(a?.anticipacion_min_minutos),
    usa_dias_empresa: a?.dias_adelante === null || a?.dias_adelante === undefined,
    dias_adelante: a?.dias_adelante === null || a?.dias_adelante === undefined ? "" : String(a.dias_adelante),
  };
}

const esUrlSegura = (t) => {
  try {
    const u = new URL(t);
    return u.protocol === "https:" && !!u.hostname;
  } catch {
    return false;
  }
};

// Formulario → { errores, valido, cuerpo } para PUT /vacantes/:id/agenda. Con la agenda apagada solo se revisa el formato.
export function validarAgendaVacante(form) {
  const errores = {};
  const activa = form?.activa === true;
  const txt = (campo) => String(form?.[campo] ?? "").trim();
  const modalidad = form?.modalidad === "video" ? "video" : "presencial";
  for (const campo of ["direccion", "referencia", "entrevistador", "que_llevar"]) {
    if (txt(campo).length > LIMITES_VACANTE.texto) errores[campo] = `Máximo ${LIMITES_VACANTE.texto} caracteres.`;
  }
  if (activa && modalidad === "presencial" && !txt("direccion")) errores.direccion = "Escribe la dirección donde será la entrevista.";
  const enlace = txt("enlace_video");
  if (enlace && !esUrlSegura(enlace)) errores.enlace_video = "Pega un enlace completo que empiece con https://";
  else if (activa && modalidad === "video" && !enlace) errores.enlace_video = "Pega el enlace de la videollamada (Meet, Zoom, Teams…).";
  const duracion = enteroEnRango(form?.duracion_minutos, LIMITES_VACANTE.duracion.min, LIMITES_VACANTE.duracion.max, "Duración");
  if (duracion.error || duracion.valor === null) errores.duracion_minutos = duracion.error || "Escribe cuántos minutos dura cada entrevista.";
  const cupo = enteroEnRango(form?.cupo_por_horario, LIMITES_VACANTE.cupo.min, LIMITES_VACANTE.cupo.max, "Personas por horario");
  if (cupo.error || cupo.valor === null) errores.cupo_por_horario = cupo.error || "Escribe cuántas personas caben en cada horario.";
  const horario = {};
  const erroresHorario = {};
  for (const { clave, texto } of DIAS) {
    const rangos = (form?.horario?.[clave] ?? []).map((r) => ({ desde: String(r?.desde ?? "").slice(0, 5), hasta: String(r?.hasta ?? "").slice(0, 5) }));
    const e = validarRangos(rangos, texto);
    if (e) erroresHorario[clave] = e;
    horario[clave] = [...rangos].sort((a, b) => a.desde.localeCompare(b.desde));
  }
  if (activa && !Object.keys(erroresHorario).length && !DIAS.some(({ clave }) => horario[clave].length)) {
    erroresHorario.general = "Agrega al menos un horario para que el agente pueda ofrecer citas.";
  }
  if (Object.keys(erroresHorario).length) errores.horario = erroresHorario;
  const bloqueos = [];
  const erroresBloqueos = {};
  const listaBloqueos = form?.bloqueos ?? [];
  if (listaBloqueos.length > LIMITES_VACANTE.bloqueos) errores.bloqueos_general = `Máximo ${LIMITES_VACANTE.bloqueos} bloqueos.`;
  listaBloqueos.forEach((b, i) => {
    const desde = aTextoApi(b?.desde);
    const hasta = aTextoApi(b?.hasta);
    const motivo = String(b?.motivo ?? "").trim();
    let e = "";
    if (!desde || !hasta) e = "Escribe desde y hasta (fecha y hora).";
    else if (desde >= hasta) e = "El fin del bloqueo debe ser después del inicio.";
    else if (motivo.length > LIMITES_VACANTE.motivo) e = `El motivo admite hasta ${LIMITES_VACANTE.motivo} caracteres.`;
    if (e) erroresBloqueos[b?.clave ?? i] = e;
    bloqueos.push({ desde, hasta, motivo });
  });
  if (Object.keys(erroresBloqueos).length) errores.bloqueos = erroresBloqueos;
  let anticipacion = null;
  if (!form?.usa_anticipacion_empresa) {
    const r = minutosDesdeHoras(form?.anticipacion_horas, { max: LIMITES_EMPRESA.anticipacionHoras });
    if (r.error || r.valor === null) errores.anticipacion_horas = r.error || "Escribe las horas o usa el valor de la empresa.";
    anticipacion = r.valor;
  }
  let dias = null;
  if (!form?.usa_dias_empresa) {
    const r = enteroEnRango(form?.dias_adelante, LIMITES_EMPRESA.dias.min, LIMITES_EMPRESA.dias.max, "Días hacia adelante");
    if (r.error || r.valor === null) errores.dias_adelante = r.error || "Escribe los días o usa el valor de la empresa.";
    dias = r.valor;
  }
  const cuerpo = {
    activa,
    modalidad,
    direccion: txt("direccion"),
    referencia: txt("referencia"),
    enlace_video: enlace,
    entrevistador: txt("entrevistador"),
    que_llevar: txt("que_llevar"),
    duracion_minutos: duracion.valor,
    cupo_por_horario: cupo.valor,
    horario,
    bloqueos,
    quien_agenda: MODOS_AGENDA.some((m) => m.valor === form?.quien_agenda) ? form.quien_agenda : null,
    anticipacion_min_minutos: anticipacion,
    dias_adelante: dias,
  };
  return { errores, valido: !Object.keys(errores).length, cuerpo };
}

// ——— Fechas como texto «YYYY-MM-DD HH:mm» (hora de México, sin convertir) ———
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function partesTexto(texto) {
  const m = String(texto ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]) - 1;
  const dia = Number(m[3]);
  const fecha = new Date(Date.UTC(anio, mes, dia));
  if (fecha.getUTCMonth() !== mes) return null;
  return { anio, mes, dia, semana: fecha.getUTCDay(), hora: m[4] ? Number(m[4]) : 0, minuto: m[5] ? Number(m[5]) : 0 };
}
const clave = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
export function sumarDias(claveDiaTexto, n) {
  const p = partesTexto(claveDiaTexto);
  if (!p) return "";
  return clave(new Date(Date.UTC(p.anio, p.mes, p.dia + n)));
}
// Lunes de la semana del día dado.
export function inicioSemana(claveDiaTexto) {
  const p = partesTexto(claveDiaTexto);
  if (!p) return "";
  return sumarDias(claveDiaTexto, -((p.semana + 6) % 7));
}
export const hoyMx = (ahora = new Date()) => claveDia(ahora);
export function diasDeSemana(lunes) {
  return Array.from({ length: 7 }, (_, i) => {
    const c = sumarDias(lunes, i);
    const p = partesTexto(c);
    return { clave: c, largo: DIAS_LARGOS[p.semana], corto: DIAS_CORTOS[p.semana], numero: p.dia, mes: MESES[p.mes] };
  });
}
// «23 – 29 nov 2026» o «30 nov – 6 dic 2026».
export function etiquetaSemana(lunes) {
  const a = partesTexto(lunes);
  const b = partesTexto(sumarDias(lunes, 6));
  if (!a || !b) return "";
  if (a.mes === b.mes) return `${a.dia} – ${b.dia} ${MESES[b.mes]} ${b.anio}`;
  return a.anio === b.anio ? `${a.dia} ${MESES[a.mes]} – ${b.dia} ${MESES[b.mes]} ${b.anio}` : `${a.dia} ${MESES[a.mes]} ${a.anio} – ${b.dia} ${MESES[b.mes]} ${b.anio}`;
}
// «Hoy · lunes 23 de noviembre», «Mañana · …» o «martes 1 de diciembre».
export function etiquetaDiaLargo(claveDiaTexto, hoy) {
  const p = partesTexto(claveDiaTexto);
  if (!p) return "";
  const base = `${DIAS_LARGOS[p.semana]} ${p.dia} de ${MESES_LARGOS[p.mes]}`;
  if (hoy && claveDiaTexto === hoy) return `Hoy · ${base}`;
  if (hoy && claveDiaTexto === sumarDias(hoy, 1)) return `Mañana · ${base}`;
  return base;
}
// «10:00 a.m.»
export function horaTexto(texto) {
  const p = partesTexto(texto);
  if (!p) return "";
  const h12 = p.hora % 12 === 0 ? 12 : p.hora % 12;
  return `${h12}:${String(p.minuto).padStart(2, "0")} ${p.hora < 12 ? "a.m." : "p.m."}`;
}
// «lun 30 nov · 10:00 a.m.»
export function fechaHoraCorta(texto) {
  const p = partesTexto(texto);
  if (!p) return "";
  return `${DIAS_CORTOS[p.semana]} ${p.dia} ${MESES[p.mes]} · ${horaTexto(texto)}`;
}
export const minutosDelDia = (texto) => {
  const p = partesTexto(texto);
  return p ? p.hora * 60 + p.minuto : 0;
};

// Citas de la semana agrupadas por día (en orden de hora). `dias` = claves de los días a incluir (vacíos también).
export function agruparPorDia(citas, dias = null) {
  const mapa = new Map((dias ?? []).map((d) => [d, []]));
  for (const c of citas ?? []) {
    const d = String(c?.inicio ?? "").slice(0, 10);
    if (!partesTexto(d)) continue;
    if (dias && !mapa.has(d)) continue;
    if (!mapa.has(d)) mapa.set(d, []);
    mapa.get(d).push(c);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, lista]) => ({ clave: d, citas: lista.sort((x, y) => String(x.inicio).localeCompare(String(y.inicio))) }));
}

// Horas que muestra el calendario: de 8 a 19 h, ampliado si hay citas antes o después.
export function rangoHorasCalendario(citas, { desde = 8, hasta = 19 } = {}) {
  let min = desde;
  let max = hasta;
  for (const c of citas ?? []) {
    const ini = partesTexto(c?.inicio);
    if (!ini) continue;
    min = Math.min(min, ini.hora);
    const fin = c?.fin ? minutosDelDia(c.fin) : minutosDelDia(c.inicio) + 30;
    max = Math.max(max, Math.ceil(fin / 60));
  }
  return { desde: Math.max(0, min), hasta: Math.min(24, Math.max(max, min + 1)) };
}

// Columnas para citas que se empalman en un mismo día: { [id]: { carril, total } }.
export function carriles(citas) {
  const orden = [...(citas ?? [])].sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
  const salida = {};
  let grupo = [];
  let finGrupo = -1;
  let fines = [];
  const cerrar = () => {
    const total = fines.length || 1;
    for (const id of grupo) salida[id].total = total;
    grupo = [];
    fines = [];
  };
  for (const c of orden) {
    const ini = minutosDelDia(c.inicio);
    const fin = Math.max(ini + 15, c.fin ? minutosDelDia(c.fin) : ini + 30);
    if (ini >= finGrupo) cerrar();
    let carril = fines.findIndex((f) => f <= ini);
    if (carril === -1) { carril = fines.length; fines.push(fin); } else fines[carril] = fin;
    salida[c.id] = { carril, total: 1 };
    grupo.push(c.id);
    finGrupo = Math.max(finGrupo, fin);
  }
  cerrar();
  return salida;
}

// Horarios disponibles de /horarios agrupados por día, con cuántos lugares quedan.
export function agruparHorarios(horarios) {
  const grupos = agruparPorDia((horarios ?? []).map((h, i) => ({ ...h, id: i })));
  return grupos.map((g) => ({
    clave: g.clave,
    horarios: g.citas.map(({ id, ...h }) => {
      const capacidad = Math.max(0, Number(h.capacidad) || 0);
      const ocupados = Math.max(0, Number(h.ocupados) || 0);
      return { ...h, capacidad, ocupados, libres: Math.max(0, capacidad - ocupados) };
    }),
  }));
}
export const textoLugares = (libres, capacidad) => (libres <= 0 ? "Lleno" : capacidad <= 1 ? "Libre" : libres === 1 ? "Queda 1 lugar" : `Quedan ${libres} lugares`);

// ¿Se ofrece «Aprobar para agendar»? Motivo de atención sobre la agenda, o «con alerta» cuando la empresa agenda solo a quien califica.
const MOTIVO_AGENDA = /agend|aprobaci|aprobar/i;
export function necesitaAprobacionAgenda(entrevista, modo, cita) {
  if (!entrevista || citaActiva(cita) || entrevista.agenda_aprobada === true) return false;
  if (entrevista.requiere_atencion === true && (entrevista.motivo_codigo === "aprobar_agenda" || MOTIVO_AGENDA.test(String(entrevista.motivo_atencion ?? "")))) return true;
  return modo === "califica" && entrevista.calificacion === "con_alerta";
}

// «N plantillas enviadas este mes» (null si el API no lo manda).
export function textoPlantillasMes(estado) {
  const v = estado?.plantillas_mes;
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  const t = Math.floor(n).toLocaleString("es-MX");
  return n === 1 ? "1 plantilla enviada este mes" : `${t} plantillas enviadas este mes`;
}

// Selector de horarios: se distingue por qué no hay horarios para no dejar a la persona ante una lista vacía.
// Precedencia: falta la migración (503 SIN_MIGRACION) → agenda sin configurar → días sin horarios («Siguientes»).
export const MENSAJE_SIN_MIGRACION_AGENDA = "Falta correr la migración de la agenda (R3)";
export const MENSAJE_AGENDA_SIN_CONFIGURAR = "La agenda de esta vacante no está configurada";
export function agendaConfigurada(agenda) {
  if (!agenda || agenda.activa !== true) return false;
  return Object.values(horarioDeApi(agenda) ?? {}).some((rangos) => Array.isArray(rangos) && rangos.length > 0);
}
export function causaSinHorarios({ agenda, errorAgenda, errorHorarios } = {}) {
  const codigo = (e) => e?.response?.data?.codigo;
  if ((errorHorarios?.response?.status === 503 && codigo(errorHorarios) === "SIN_MIGRACION") || codigo(errorAgenda) === "SIN_MIGRACION") return "sin_migracion";
  if (agenda && !agendaConfigurada(agenda)) return "sin_agenda";
  return null;
}
