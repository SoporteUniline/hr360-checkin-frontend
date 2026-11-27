// Centro de ayuda · guías leídas y «¿Te sirvió?» guardados en el navegador (localStorage, por ahora). Todo con try/catch:
// en modo privado, sin almacenamiento o en la app sin permisos la página funciona igual (solo no recuerda).
// El mismo dato sirve a /ayuda (público) y a «Ayuda» dentro del sistema: es el mismo sitio.
// Sin red ni React: probado en scripts/test-ayuda.mjs (con un almacenamiento falso).

export const CLAVE_LEIDAS = "adamia.ayuda.leidas.v1";
export const CLAVE_UTIL = "adamia.ayuda.util.v1";
const MAX = 500;

const almacen = (s) => {
  if (s) return s;
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
};
function leer(clave, s) {
  try {
    const v = JSON.parse(almacen(s)?.getItem(clave) ?? "null");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
function escribir(clave, valor, s) {
  try { almacen(s)?.setItem(clave, JSON.stringify(valor)); return true; } catch { return false; }
}
const recortar = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => String(b[1]).localeCompare(String(a[1]))).slice(0, MAX));

/** { slug: "AAAA-MM-DD" } de las guías marcadas como leídas. */
export const leidas = (s) => leer(CLAVE_LEIDAS, s);
export function marcarLeida(slug, leida = true, { s, hoy = new Date() } = {}) {
  const actual = leidas(s);
  if (leida) actual[slug] = hoy.toISOString().slice(0, 10);
  else delete actual[slug];
  escribir(CLAVE_LEIDAS, recortar(actual), s);
  return actual;
}
/** Avance de una ruta: { hechas, total, porcentaje, siguiente } (siguiente = primera guía sin leer). */
export function avanceRuta(guias = [], marcadas = {}) {
  const hechas = guias.filter((g) => marcadas[g]).length;
  return { hechas, total: guias.length, porcentaje: guias.length ? Math.round((hechas * 100) / guias.length) : 0, siguiente: guias.find((g) => !marcadas[g]) ?? null };
}

/** «¿Te sirvió?»: «si» | «no» | null por guía (solo en este navegador, por ahora). */
export const utilDe = (slug, s) => leer(CLAVE_UTIL, s)[slug] ?? null;
export function guardarUtil(slug, valor, s) {
  const actual = leer(CLAVE_UTIL, s);
  if (valor === "si" || valor === "no") actual[slug] = valor;
  else delete actual[slug];
  return escribir(CLAVE_UTIL, actual, s);
}
