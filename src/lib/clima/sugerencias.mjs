// «Plan de acción sugerido» de Adamia AI → acciones del plan con un clic (lógica pura, sin React).
// El servidor manda sugerencias ya validadas ({ dimension, accion ≤300, porque, … }) y vuelve a validar al crear:
// POST /campanias/:id/acciones con responsable y fecha vacíos (RH los asigna después) y 409 DUPLICADA si ya existe.
// node --test scripts/test-clima-sugerencias.mjs

const LIMITE_TEXTO = 300;

const limpio = (v) =>
  String(v ?? "")
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

// Misma identidad que el servidor (modules/clima/services/acciones.js · claveAccion): texto sin mayúsculas, acentos,
// espacios de más ni puntuación final, y la misma dimensión (null = general).
export function claveAccion(texto, dimension) {
  const t = limpio(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s.;:,!¡?¿…]+$/u, "")
    .trim();
  return `${dimension ?? ""}|${t}`;
}

// Cada sugerencia con su estado frente al plan actual: enPlan (ya hay una acción igual) e idAccion.
export function estadoSugerencias(sugerencias = [], acciones = []) {
  const plan = new Map(acciones.map((a) => [claveAccion(a.texto, a.dimension ?? null), a.id]));
  return sugerencias.map((s) => {
    const id = plan.get(claveAccion(s.accion, s.dimension ?? null));
    return { ...s, enPlan: id !== undefined, idAccion: id ?? null };
  });
}

export const porAgregar = (sugerencias, acciones) => estadoSugerencias(sugerencias, acciones).filter((s) => !s.enPlan);

// Cuerpo para el endpoint de siempre. La empresa la pone la sesión (no va en el cuerpo).
export function cuerpoAccion(s) {
  return { texto: limpio(s.accion).slice(0, LIMITE_TEXTO), dimension: s.dimension ?? null, id_responsable: null, fecha_limite: null };
}

// Qué le falta a una acción para estar completa (las agregadas desde Adamia AI llegan sin responsable ni fecha).
export function faltaAsignar(accion) {
  const falta = [];
  if (!accion?.responsable?.id) falta.push("responsable");
  if (!accion?.fecha_limite) falta.push("fecha límite");
  return falta;
}

export function textoFalta(accion) {
  const f = faltaAsignar(accion);
  return f.length ? `Falta asignar ${f.join(" y ")}` : "";
}

export const porAsignar = (acciones = []) => acciones.filter((a) => faltaAsignar(a).length).length;

// Resultado de «Agregar todas»: una petición por sugerencia (en orden). DUPLICADA cuenta como «ya estaba».
// resultados: [{ ok: true } | { ok: false, codigo, error }].
export function resumenAgregadas(resultados = []) {
  const agregadas = resultados.filter((r) => r.ok).length;
  const yaEstaban = resultados.filter((r) => !r.ok && r.codigo === "DUPLICADA").length;
  const fallidas = resultados.filter((r) => !r.ok && r.codigo !== "DUPLICADA");
  const partes = [];
  if (agregadas) partes.push(agregadas === 1 ? "Se agregó 1 acción al plan" : `Se agregaron ${agregadas} acciones al plan`);
  if (yaEstaban) partes.push(yaEstaban === 1 ? "1 ya estaba" : `${yaEstaban} ya estaban`);
  if (fallidas.length) partes.push(`${fallidas.length} no se pudo agregar: ${fallidas[0].error || "intenta de nuevo"}`);
  const unido = partes.join(" · ");
  const texto = partes.length ? (/[.!?]$/.test(unido) ? unido : `${unido}.`) : "No había acciones por agregar.";
  return {
    agregadas,
    yaEstaban,
    fallidas: fallidas.length,
    texto: agregadas ? `${texto} Asigna responsable y fecha en el plan.` : texto,
    variante: fallidas.length ? (agregadas ? "warning" : "error") : "success",
  };
}

export const nombreDimension = (clave, dimensiones = []) => (clave ? dimensiones.find((d) => d.clave === clave)?.nombre ?? clave : "General");
