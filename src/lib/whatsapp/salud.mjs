// Salud del agente de WhatsApp y cobro (P7, 01/12/2026). Lógica pura: textos en español claro (sin códigos crudos),
// formatos, aviso de la bandeja, escala de la gráfica y semáforo. El backend cuenta; aquí solo se presenta.
// API: GET /salud, GET /salud/eventos, GET /admin/salud y `salud` dentro de GET /estado (ver docs del backend, «P7»).

const entero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};
const miles = (n) => entero(n).toLocaleString("es-MX");

// ---------- Errores en lenguaje claro ----------

// Qué pasó, por tipo de evento (título del grupo).
export const TITULO_TIPO = {
  turno_fallido: "El agente no pudo contestar",
  turno_atorado: "Un mensaje se quedó atorado y se volvió a intentar",
  respuesta_vacia: "La IA respondió vacío",
  herramienta_fallida: "El agente no pudo guardar un dato",
  tope_hora: "Una conversación llegó al límite de respuestas por hora",
  tope_mes: "Se alcanzó el tope mensual de gasto de IA",
  modelo_respaldo: "La IA principal falló y contestó la de respaldo",
  envio_fallido: "WhatsApp no entregó un mensaje",
  media_fallida: "No se pudo descargar un archivo del candidato",
  transcripcion_fallida: "No se pudo transcribir una nota de voz",
  firma_invalida: "Llegó un aviso de WhatsApp con firma inválida",
  alerta_correo: "Se mandó un aviso por correo",
};

// Herramientas del agente → lo que intentaba hacer.
const HERRAMIENTA = {
  guardar_datos_candidato: "guardar los datos del candidato",
  registrar_precalificacion: "guardar la precalificación",
  registrar_consentimiento: "guardar el aviso de privacidad",
  escalar_a_humano: "pasar la conversación a una persona",
  registrar_pregunta_sin_respuesta: "guardar una pregunta sin respuesta",
  sugerir_vacante_alterna: "sugerir otra vacante",
  ver_horarios_entrevista: "consultar horarios",
  agendar_entrevista: "agendar la entrevista",
  cancelar_entrevista: "cancelar la entrevista",
};

// Códigos de la IA del backend (iaAgente.js) → frase.
const CODIGO_IA = {
  IA_SIN_SALDO: "la IA se quedó sin saldo con el proveedor",
  IA_LLAVE_INVALIDA: "la llave de la IA no es válida",
  IA_SATURADA: "la IA estaba saturada",
  IA_SIN_CONEXION: "no hubo conexión con la IA",
  IA_SIN_LLAVE: "la IA no está configurada en el servidor",
  IA_TOPE_MES: "se alcanzó el tope mensual de gasto de IA",
};

const limpio = (s, max = 220) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/**
 * Texto claro de un error del agente. evento: { tipo, mensaje }. Ejemplos:
 *   «El agente no pudo contestar: IA_ERROR: 500 The model is overloaded.» → «La IA no respondió (Google devolvió: The model is overloaded.)»
 *   «… IA_SIN_SALDO» → «La IA no respondió: la IA se quedó sin saldo con el proveedor»
 */
export function textoError(evento) {
  const tipo = evento?.tipo;
  const msg = String(evento?.mensaje ?? "");
  if (tipo === "turno_fallido" || /^El agente no pudo contestar:/.test(msg)) {
    const resto = msg.replace(/^El agente no pudo contestar:\s*/, "");
    const ia = resto.match(/IA_ERROR:\s*(\d{3})?\s*(.*)$/);
    if (ia) return ia[2] ? `La IA no respondió (Google devolvió: ${limpio(ia[2])})` : `La IA no respondió (Google devolvió el error ${ia[1]})`;
    const codigo = Object.keys(CODIGO_IA).find((c) => resto.includes(c));
    if (codigo) return `La IA no respondió: ${CODIGO_IA[codigo]}`;
    if (/atorad/.test(msg)) return "El mensaje se quedó atorado y el agente ya no lo reintentó";
    return resto ? `El agente no pudo contestar (${limpio(resto)})` : TITULO_TIPO.turno_fallido;
  }
  if (tipo === "herramienta_fallida") {
    const nombre = msg.match(/herramienta (\w+)/)?.[1];
    return HERRAMIENTA[nombre] ? `El agente no pudo ${HERRAMIENTA[nombre]}` : TITULO_TIPO.herramienta_fallida;
  }
  if (tipo === "envio_fallido") {
    const detalle = msg.replace(/^Zernio no entregó (el mensaje|la plantilla|el archivo):\s*/, "");
    const que = /la plantilla/.test(msg) ? "una plantilla" : /el archivo/.test(msg) ? "un archivo" : "un mensaje";
    return detalle && detalle !== msg ? `WhatsApp no entregó ${que} (respuesta: ${limpio(detalle, 140)})` : `WhatsApp no entregó ${que}`;
  }
  if (tipo === "modelo_respaldo") {
    const m = msg.match(/respaldo ([\w.-]+) \((.*)\)\.?$/);
    return m ? `La IA principal falló y contestó la de respaldo (${m[1]})` : TITULO_TIPO.modelo_respaldo;
  }
  return TITULO_TIPO[tipo] ?? (limpio(msg) || "Algo falló en el agente");
}

export const tonoSeveridad = (s) => (s === "error" ? "rojo" : s === "aviso" ? "ambar" : "gris");

// ---------- Formatos ----------

export function formatoMs(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(Number(ms))) return "—";
  const n = Number(ms);
  if (n < 1000) return `${Math.round(n)} ms`;
  if (n < 60000) return `${(n / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} s`;
  return `${(n / 60000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} min`;
}

export function formatoUsd(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  const n = Number(v);
  const decimales = n > 0 && n < 1 ? 4 : 2;
  return `${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: decimales })} USD`;
}

export const formatoPct = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? "—" : `${Number(v).toLocaleString("es-MX", { maximumFractionDigits: 1 })} %`);

// «23 nov» para el eje y «domingo 23 de noviembre» para el tooltip (fecha AAAA-MM-DD, sin zona: es el día de México).
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const partes = (f) => String(f ?? "").slice(0, 10).split("-").map(Number);
export function fechaCorta(f) {
  const [, m, d] = partes(f);
  return m && d ? `${d} ${MESES[m - 1]}` : "";
}
export function fechaLarga(f) {
  const [a, m, d] = partes(f);
  if (!a || !m || !d) return "";
  return `${DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d} de ${MESES_LARGO[m - 1]}`;
}

// «hace 5 min», «hace 3 h», «el 21 nov» para la fecha de un evento («AAAA-MM-DD HH:mm:ss», hora de México).
export function haceCuanto(fecha, ahora = new Date()) {
  const [a, m, d] = partes(fecha);
  const [h = 0, mi = 0] = String(fecha ?? "").slice(11, 16).split(":").map(Number);
  if (!a || !m || !d) return "";
  // La fecha viene en hora de México (UTC−6, sin horario de verano desde 2022).
  const ms = Date.UTC(a, m - 1, d, h + 6, mi);
  const min = Math.floor((ahora.getTime() - ms) / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  if (min < 24 * 60) return `hace ${Math.floor(min / 60)} h`;
  return `el ${fechaCorta(fecha)}`;
}

// ---------- Aviso en la bandeja ----------

/** null si está bien; si no, { texto, tono }. salud = respuesta.salud de GET /estado. */
export function avisoBandeja(salud) {
  if (!salud || salud.estado === "ok" || !salud.estado) return null;
  const n = entero(salud.fallas_24h);
  const texto = n > 0
    ? `El agente falló ${n === 1 ? "1 vez" : `${miles(n)} veces`} en las últimas 24 h`
    : "El agente tuvo avisos en las últimas 24 h";
  return { texto, tono: salud.estado === "error" ? "rojo" : "ambar" };
}

// ---------- Tarjetas y gráfica ----------

/** Tarjetas de la vista de RH a partir de resumen (GET /salud). */
export function tarjetasResumen(r = {}) {
  const fallas = entero(r.fallidos) + entero(r.sin_respuesta);
  return [
    { clave: "respondidos", titulo: "Respondidos", valor: formatoPct(r.pct_respondidos), detalle: `${miles(entero(r.respondidos) + entero(r.pasos_persona))} de ${miles(entero(r.turnos) - entero(r.cancelados))} turnos` },
    { clave: "fallas", titulo: "Fallas", valor: miles(fallas), detalle: fallas ? "sin contestar al candidato" : "ninguna en el periodo", alerta: fallas > 0 },
    { clave: "persona", titulo: "Pasos a persona", valor: miles(entero(r.pasos_persona) + entero(r.topes)), detalle: "pidieron o necesitaron a alguien" },
    { clave: "tiempo", titulo: "Tiempo de respuesta", valor: formatoMs(r.latencia_p50_ms), detalle: r.latencia_p95_ms != null ? `9 de cada 10 en menos de ${formatoMs(r.latencia_p95_ms)}` : "sin datos" },
    { clave: "costo", titulo: "Costo de IA del mes", valor: formatoUsd(r.costo_mes_usd ?? r.costo_usd), detalle: r.costo_mes_usd != null ? `${formatoUsd(r.costo_usd)} en el periodo` : "del periodo" },
  ];
}

/** Escala «bonita» del eje: máximo redondeado y 3–5 marcas enteras. */
export function escalaEje(maximo) {
  const m = Math.max(0, Number(maximo) || 0);
  if (m <= 4) return { max: 4, marcas: [0, 1, 2, 3, 4] };
  const crudo = m / 4;
  const potencia = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 5, 10].map((k) => k * potencia).find((p) => p >= crudo);
  const max = Math.ceil(m / paso) * paso;
  const marcas = [];
  for (let v = 0; v <= max; v += paso) marcas.push(v);
  return { max, marcas };
}

/** Barras apiladas por día: contestados abajo, sin contestar arriba. → { max, marcas, dias: [{ fecha, contestados, sin_contestar, total }] } */
export function datosGrafica(serie = []) {
  const dias = serie.map((d) => {
    const contestados = entero(d.respondidos);
    const sin = entero(d.no_contestados);
    return { fecha: d.fecha, contestados, sin_contestar: sin, total: contestados + sin, turnos: entero(d.turnos) };
  });
  return { ...escalaEje(Math.max(0, ...dias.map((d) => d.total))), dias };
}

// Periodos del selector.
export const PERIODOS = [{ dias: 7, texto: "7 días" }, { dias: 30, texto: "30 días" }];

// Fechas «desde/hasta» (AAAA-MM-DD) para los últimos N días terminando en `hoy` (AAAA-MM-DD).
export function rangoUltimosDias(dias, hoy) {
  const [a, m, d] = partes(hoy);
  if (!a) return { desde: undefined, hasta: undefined };
  const fin = Date.UTC(a, m - 1, d);
  const inicio = new Date(fin - (Math.max(1, entero(dias)) - 1) * 86400000);
  return { desde: inicio.toISOString().slice(0, 10), hasta: hoy };
}

// ---------- Administrador ----------

export const SEMAFORO = {
  verde: { texto: "Bien", clase: "bg-emerald-50 text-emerald-800", punto: "bg-emerald-500" },
  ambar: { texto: "Revisar", clase: "bg-amber-50 text-amber-900", punto: "bg-amber-500" },
  rojo: { texto: "Fallando", clase: "bg-red-50 text-red-800", punto: "bg-red-600" },
};
export const semaforo = (s) => SEMAFORO[s] ?? SEMAFORO.verde;

// Orden de la tabla: rojo, ámbar, verde; dentro, más fallas primero y luego nombre.
const PESO = { rojo: 0, ambar: 1, verde: 2 };
export function ordenarEmpresas(empresas = []) {
  return [...empresas].sort((a, b) => (PESO[a.semaforo] ?? 3) - (PESO[b.semaforo] ?? 3)
    || entero(b.fallas_24h) - entero(a.fallas_24h)
    || String(a.nombre_empresa ?? "").localeCompare(String(b.nombre_empresa ?? ""), "es"));
}
