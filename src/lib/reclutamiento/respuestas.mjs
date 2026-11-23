// Preguntas propias de una vacante en el formulario público (03/12/2026). Puro: lo prueba
// scripts/test-reclutamiento-adaptador.mjs. El servidor repite la validación (services/panel/reglas.js).
const vacio = (v) => v == null || v === "" || (Array.isArray(v) && !v.length);

// IDs de las preguntas obligatorias sin responder.
export const faltantes = (preguntas = [], valores = {}) =>
  preguntas.filter((p) => p.required && vacio(valores[p.id])).map((p) => p.id);

// Lo que se manda como «respuestas» (solo preguntas de la vacante, sin vacíos).
export const respuestasParaEnviar = (preguntas = [], valores = {}) =>
  Object.fromEntries(preguntas.filter((p) => !vacio(valores[p.id])).map((p) => [p.id, valores[p.id]]));
