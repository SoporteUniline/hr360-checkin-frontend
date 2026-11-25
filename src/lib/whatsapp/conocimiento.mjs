// Lumo fase A (25/11/2026): reglas de pantalla de la base de conocimiento y de «Sugerir con IA».
// Espejo de las del API (que es el que manda): solo evitan mandar algo que el servidor va a rechazar.
import { MAX_PREGUNTAS, preguntaDesdeApi } from "./entrevista.mjs";

export const LIMITE_PREGUNTA_K = 500;
export const LIMITE_RESPUESTA_K = 2000;

export const ESTADOS_ENTRADA = {
  aprobada: { texto: "Aprobada", ayuda: "El agente la usa para contestar.", tono: "verde" },
  borrador: { texto: "Borrador", ayuda: "El agente todavía no la usa.", tono: "gris" },
};
export const etiquetaEstadoEntrada = (estado) => ESTADOS_ENTRADA[estado] ?? ESTADOS_ENTRADA.borrador;

const ORIGENES = { manual: "Escrita por RH", sin_respuesta: "Respuesta a un candidato", importada: "Importada de respuestas frecuentes" };
export const etiquetaOrigen = (origen) => ORIGENES[origen] ?? ORIGENES.manual;

// Formulario de una entrada → { errores: {pregunta?, respuesta?}, valido, cuerpo }.
export function validarEntradaForm({ pregunta, respuesta, estado = "borrador", id_vacante = "" } = {}) {
  const p = String(pregunta ?? "").replace(/\s+/g, " ").trim();
  const r = String(respuesta ?? "").trim();
  const errores = {};
  if (p.length < 3) errores.pregunta = "Escribe la pregunta (al menos 3 caracteres).";
  else if (p.length > LIMITE_PREGUNTA_K) errores.pregunta = `La pregunta puede tener hasta ${LIMITE_PREGUNTA_K} caracteres.`;
  if (!r) errores.respuesta = "Escribe la respuesta que dará el agente.";
  else if (r.length > LIMITE_RESPUESTA_K) errores.respuesta = "La respuesta puede tener hasta 2,000 caracteres.";
  const valido = !Object.keys(errores).length;
  const vacante = id_vacante === "" || id_vacante == null ? null : Number(id_vacante);
  return { errores, valido, cuerpo: valido ? { pregunta: p, respuesta: r, estado: estado === "aprobada" ? "aprobada" : "borrador", id_vacante: vacante } : null };
}

export const textoPendientes = (n) => (!n ? "Sin preguntas pendientes" : n === 1 ? "1 pregunta sin respuesta" : `${n} preguntas sin respuesta`);
export const textoAlcance = (entrada) => (entrada?.id_vacante ? `Solo «${entrada.vacante || "esta vacante"}»` : "Toda la empresa");

// Filtro de la lista: texto en pregunta o respuesta, sin acentos ni mayúsculas.
const normal = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export function filtrarEntradas(entradas, { q = "", estado = "" } = {}) {
  const t = normal(q).trim();
  return (entradas ?? []).filter((e) => (!estado || e.estado === estado) && (!t || normal(e.pregunta).includes(t) || normal(e.respuesta).includes(t)));
}

// ——— «Sugerir con IA» ———

let n = 0;
// Sugerencia del API → pregunta del editor (con clave nueva; se agrega como pregunta sin guardar).
export function sugerenciaAPregunta(s) {
  const p = preguntaDesdeApi({ ...s, id: null, activa: true });
  n += 1;
  return { ...p, clave: `ia-${Date.now().toString(36)}-${n}` };
}

// ¿Cuántas más caben en la vacante? (máximo 8 en total)
export const espacioPreguntas = (actuales) => Math.max(0, MAX_PREGUNTAS - (Number(actuales) || 0));

export function textoDescartadas(descartadas) {
  const d = Number(descartadas?.discriminatorias) || 0;
  if (!d) return "";
  return d === 1
    ? "Se quitó 1 sugerencia que podía discriminar (edad, sexo, estado civil, salud, religión…)."
    : `Se quitaron ${d} sugerencias que podían discriminar (edad, sexo, estado civil, salud, religión…).`;
}

// Texto corto de la severidad de una sugerencia («Descarta: No», «Alerta: fuera de 1 a 5»).
export function textoSeveridadSugerencia(s) {
  const lista = (v) => (Array.isArray(v) && v.length ? v.join(", ") : "");
  const rango = (r) => {
    if (!r || typeof r !== "object" || Array.isArray(r)) return "";
    if (r.min != null && r.max != null) return `fuera de ${r.min} a ${r.max}`;
    if (r.min != null) return `menos de ${r.min}`;
    if (r.max != null) return `más de ${r.max}`;
    return "";
  };
  const leer = (v) => (s?.tipo === "numero" ? rango(v) : lista(v));
  return [leer(s?.descartan) ? `Descarta: ${leer(s.descartan)}` : "", leer(s?.alertan) ? `Alerta: ${leer(s.alertan)}` : ""].filter(Boolean).join(" · ") || "No descarta ni alerta";
}

// Mensajes de la puerta de Adamia AI para «Sugerir con IA».
export function mensajeErrorIa(error, porDefecto = "No se pudieron pedir sugerencias. Intenta de nuevo.") {
  const d = error?.response?.data ?? {};
  switch (d.codigo) {
    case "IA_APAGADA": return "Adamia AI no está activa en tu empresa. El dueño puede encenderla en Ajustes → Adamia AI.";
    case "IA_SIN_CREDITOS": return "Sin créditos de Adamia AI. Recarga para pedir sugerencias.";
    case "IA_LIMITE_HORA": return d.error || "Llegaste al límite de usos de Adamia AI por hora. Intenta más tarde.";
    case "IA_TOPE_MES": return d.error || "Se alcanzó el tope de Adamia AI de este mes.";
    case "IA_FORMATO": return "Adamia AI no dio sugerencias útiles. Intenta de nuevo.";
    default: break;
  }
  if (!error?.response) return error?.code === "ERR_NETWORK" ? "Sin conexión con el servidor. Revisa tu internet e intenta de nuevo." : porDefecto;
  return d.error || porDefecto;
}
