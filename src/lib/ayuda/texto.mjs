// Centro de ayuda · utilidades de texto compartidas (sin red ni React). Probado en scripts/test-ayuda.mjs.

/** Minúsculas y sin acentos («Días» → «dias»); para buscar y para comparar. */
export const normalizar = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Ancla de un encabezado: «¿Qué pasa si…?» → «que-pasa-si». */
export function slugTexto(texto) {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "seccion";
}

/** Palabras de búsqueda: sin acentos, sin signos y sin palabras vacías. */
const VACIAS = new Set(
  "a al algo como con cual cuales cuando de del donde el en es esta este esto la las lo los me mi mis o para pero por que se si sin su sus te tu tus un una uno unos y ya yo hay hacer puedo puede quiero como".split(" "),
);
export function palabrasDe(texto) {
  return normalizar(texto)
    .replace(/[^a-z0-9ñ\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((p) => p.length > 1 && !VACIAS.has(p));
}
