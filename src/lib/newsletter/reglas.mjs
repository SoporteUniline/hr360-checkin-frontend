// Newsletter semanal, Guía 2027 y «Avisar por WhatsApp a» (docs/newsletter.md del backend). Puras: se prueban con
// scripts/test-newsletter.mjs. Las pantallas: /dashboard/newsletter y la sección de avisos de /dashboard/prospectos.

export const SECCIONES = [
  { clave: "vigente", titulo: "Aprobado y vigente" },
  { clave: "con_fecha", titulo: "Aprobado con fecha de entrada" },
  { clave: "en_discusion", titulo: "En discusión" },
  { clave: "propuestas", titulo: "Propuestas" },
  { clave: "consejo", titulo: "Consejo práctico para tu empresa" },
];

// Estado del boletín → etiqueta y tono (sin depender solo del color: siempre con texto).
const ESTADOS = {
  borrador: { texto: "Borrador", tono: "neutro" },
  programado: { texto: "Programado", tono: "info" },
  enviando: { texto: "Enviando…", tono: "info" },
  enviado: { texto: "Enviado", tono: "exito" },
  cancelado: { texto: "Cancelado", tono: "alerta" },
};
export const estadoBoletin = (b) => {
  if (!b) return { texto: "—", tono: "neutro" };
  if (b.estado === "borrador" && !b.contenido && !b.error && !b.generado_en) return { texto: "Generando…", tono: "info" };
  if (b.estado === "borrador" && b.error) return { texto: b.contenido ? "Necesita revisión" : "No se pudo generar", tono: "peligro" };
  if (b.estado === "borrador" && b.contenido) return { texto: "Espera tu aprobación", tono: "alerta" };
  return ESTADOS[b.estado] ?? { texto: String(b.estado ?? "—"), tono: "neutro" };
};

export const puedeEditar = (b) => Boolean(b?.contenido) && ["borrador", "programado"].includes(b?.estado);
export const puedeAprobar = puedeEditar;
export const puedeCancelar = (b) => ["borrador", "programado"].includes(b?.estado);
// ¿Hay que volver a pedir el panel? (se está generando o enviando).
export const enCurso = (b) => b?.estado === "enviando" || (b?.estado === "borrador" && !b?.contenido && !b?.error);

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const partes = (v) => /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(v ?? ""));
/** "2026-12-01 09:00:00" → "martes 1 de diciembre de 2026, 9:00" */
export function fechaLarga(v) {
  const m = partes(v);
  if (!m) return "—";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  const fecha = `${DIAS[d.getUTCDay()]} ${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
  return m[4] ? `${fecha}, ${Number(m[4])}:${m[5]}` : fecha;
}
/** "2026-11-30" → "30/11/2026" */
export const fechaCorta = (v) => { const m = partes(v); return m ? `${m[3]}/${m[2]}/${m[1]}` : "—"; };
export const semanaDe = (b) => (b?.lunes ? `Semana del ${fechaLarga(b.lunes).replace(/^\S+ /, "")}` : "");

/** Cuándo sale (o salió) el boletín, en palabras. */
export function textoEnvio(b, { requerirAprobacion = false } = {}) {
  if (!b) return "";
  if (b.estado === "enviado") return `Enviado el ${fechaLarga(b.enviado_en)} a ${b.enviados} de ${b.destinatarios} personas${b.fallidos ? ` (${b.fallidos} con error)` : ""}.`;
  if (b.estado === "cancelado") return `Cancelado el ${fechaLarga(b.cancelado_en)}${b.cancelado_por ? ` por ${b.cancelado_por}` : ""}. No se envió.`;
  if (b.estado === "enviando") return "Se está enviando ahora.";
  if (b.estado === "programado") return requerirAprobacion && !b.aprobado_en ? "Espera tu aprobación: no se enviará solo." : `Se enviará solo el ${fechaLarga(b.programado_para)} si no lo cancelas.`;
  if (b.estado === "borrador" && b.contenido) return "Espera tu aprobación: no se enviará solo.";
  return "";
}

export const totalNotas = (contenido) => SECCIONES.reduce((n, s) => n + (contenido?.secciones?.[s.clave]?.length ?? 0), 0);

/** Borrador editable a partir del contenido del servidor. */
export function borradorDe(b) {
  const c = b?.contenido ?? {};
  return {
    asunto: c.asunto ?? b?.asunto ?? "",
    introduccion: c.introduccion ?? "",
    notas: Object.fromEntries(SECCIONES.flatMap((s) => (c.secciones?.[s.clave] ?? []).map((n) => [n.id, { titulo: n.titulo, resumen: n.resumen, quitar: false }]))),
    guia: Object.fromEntries((b?.guia_propuesta ?? []).map((p) => [p.clave, { quitar: false }])),
  };
}

/** Errores del borrador antes de guardar (los mismos límites que el servidor). → { campo: mensaje } */
export function erroresBorrador(d) {
  const e = {};
  if (String(d.asunto ?? "").trim().length < 4) e.asunto = "Escribe el asunto del correo.";
  for (const [id, n] of Object.entries(d.notas ?? {})) {
    if (n.quitar) continue;
    if (String(n.titulo ?? "").trim().length < 4) e[`titulo:${id}`] = "Escribe el título de la nota.";
    if (String(n.resumen ?? "").trim().length < 10) e[`resumen:${id}`] = "Escribe un resumen de al menos 10 letras.";
  }
  return e;
}

/** Cuerpo de PUT /checador/newsletter/:id: solo lo que cambió. */
export function cambiosBorrador(b, d) {
  const original = borradorDe(b);
  const cambios = {};
  if (d.asunto.trim() !== original.asunto) cambios.asunto = d.asunto.trim();
  if (d.introduccion.trim() !== original.introduccion) cambios.introduccion = d.introduccion.trim();
  const notas = [];
  for (const [id, n] of Object.entries(d.notas)) {
    const o = original.notas[id];
    if (!o) continue;
    if (n.quitar) { notas.push({ id, quitar: true }); continue; }
    const c = { id };
    if (n.titulo.trim() !== o.titulo) c.titulo = n.titulo.trim();
    if (n.resumen.trim() !== o.resumen) c.resumen = n.resumen.trim();
    if (Object.keys(c).length > 1) notas.push(c);
  }
  if (notas.length) cambios.notas = notas;
  const guia = Object.entries(d.guia).filter(([, g]) => g.quitar).map(([clave]) => ({ clave, quitar: true }));
  if (guia.length) cambios.guia = guia;
  return cambios;
}

// ── «Avisar por WhatsApp a» y «Avisar por correo a» ───────────────────────────────────────────────────────────────
// Mismo criterio que el servidor: internacional (+52…), 10 dígitos = México, sin repetir, máximo 5.
export const MAX_AVISOS = 5;
export function celularInternacional(texto) {
  const t = String(texto ?? "").trim();
  if (!t) return "";
  const d = t.replace(/[^\d+]/g, "");
  const c = d.startsWith("+") ? d : d.replace(/\D/g, "").length === 10 ? `+52${d.replace(/\D/g, "")}` : `+${d.replace(/\D/g, "")}`;
  return /^\+[1-9]\d{7,14}$/.test(c) ? c : null;
}
/** Lista escrita → { lista, error } */
export function validarCelulares(textos) {
  const lista = [];
  for (const t of textos) {
    if (!String(t ?? "").trim()) continue;
    const c = celularInternacional(t);
    if (!c) return { lista: [], error: `«${String(t).trim().slice(0, 30)}» no es un celular válido. Escríbelo con lada, por ejemplo +52 55 1234 5678.` };
    if (!lista.includes(c)) lista.push(c);
  }
  if (lista.length > MAX_AVISOS) return { lista: [], error: `Puedes avisar a ${MAX_AVISOS} celulares como máximo.` };
  return { lista, error: null };
}
const CORREO = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;
export function validarCorreos(textos) {
  const lista = [];
  for (const t of textos) {
    const c = String(t ?? "").trim().toLowerCase();
    if (!c) continue;
    if (!CORREO.test(c)) return { lista: [], error: `«${c.slice(0, 40)}» no es un correo válido.` };
    if (!lista.includes(c)) lista.push(c);
  }
  if (lista.length > MAX_AVISOS) return { lista: [], error: `Puedes avisar a ${MAX_AVISOS} correos como máximo.` };
  return { lista, error: null };
}

// ── Guía 2027 ────────────────────────────────────────────────────────────────────────────────────────────────────
export const ESTADOS_GUIA = { vigente: "Vigente", aprobado_con_fecha: "Aprobado, con fecha de entrada", propuesta: "Propuesta" };
export const textoPunto = (p) => (p.estado === "aprobado_con_fecha" && p.fecha_entrada ? `${ESTADOS_GUIA[p.estado]}: ${fechaCorta(p.fecha_entrada)}` : ESTADOS_GUIA[p.estado] ?? p.estado);
/** Cuerpo de PUT /checador/newsletter/guia/puntos/:clave. */
export function cuerpoPunto(f) {
  return {
    titulo: f.titulo.trim(), detalle: f.detalle.trim(), estado: f.estado, fecha_entrada: f.estado === "aprobado_con_fecha" ? f.fecha_entrada || null : null,
    fuente: { titulo: f.fuente_titulo.trim(), url: f.fuente_url.trim() }, fecha_fuente: f.fecha_fuente || null, nota: f.nota?.trim() ?? "", por_confirmar: f.por_confirmar === true,
  };
}
export function erroresPunto(f) {
  const e = {};
  if (f.titulo.trim().length < 4) e.titulo = "Escribe el título del punto.";
  if (f.detalle.trim().length < 10) e.detalle = "Escribe el detalle del punto.";
  if (f.estado === "aprobado_con_fecha" && !/^\d{4}-\d{2}-\d{2}$/.test(f.fecha_entrada ?? "")) e.fecha_entrada = "Pon la fecha de entrada en vigor.";
  if (f.fuente_url.trim() && !/^https:\/\/\S+\.\S+/.test(f.fuente_url.trim())) e.fuente_url = "La fuente debe empezar con https://";
  if (!f.por_confirmar && !f.fuente_url.trim()) e.fuente_url = "Sin fuente el punto queda «por confirmar» y no sale en los correos.";
  return e;
}
