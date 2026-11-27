// Centro de ayuda · búsqueda en el navegador sobre /ayuda/indice.json, tolerante a acentos y mayúsculas.
// Puntos por campo: título > palabras clave > encabezados > resumen > texto. Una palabra cuenta si coincide al inicio de
// una palabra de la guía («vacac» encuentra «vacaciones»). Sin red ni React: probado en scripts/test-ayuda.mjs.
import { normalizar, palabrasDe } from "./texto.mjs";

const PESOS = { titulo: 12, palabras: 8, secciones: 5, resumen: 4, texto: 1 };

/** Prepara una guía del índice para buscar rápido (una vez por guía). */
export function prepararGuia(g) {
  const campo = (v) => ` ${palabrasDe(Array.isArray(v) ? v.join(" ") : v).join(" ")} `;
  return {
    g,
    titulo: campo(g.titulo),
    palabras: campo(g.palabras ?? []),
    secciones: campo((g.secciones ?? []).map((s) => s.texto)),
    resumen: campo(g.resumen),
    texto: campo(g.texto ?? ""),
  };
}

// Raíz simple de cada palabra buscada («publico» → «publi», «confirmado» → «confirm»): encuentra «publicar» o «confirmación».
export const raiz = (w) => (w.length >= 6 ? w.slice(0, Math.max(5, w.length - 3)) : w);

const cuenta = (campo, palabra) => {
  let n = 0;
  for (let i = campo.indexOf(` ${palabra}`); i !== -1 && n < 5; i = campo.indexOf(` ${palabra}`, i + 1)) n += 1;
  return n;
};

/**
 * consulta → [{ g, puntos, seccion }] ordenadas. Todas las palabras deben aparecer en algún campo (como un buscador).
 * seccion: la primera sección cuyo título contiene alguna palabra (para abrir la guía en el ancla).
 */
export function buscar(preparadas = [], consulta, { limite = 20 } = {}) {
  const palabras = [...new Set(palabrasDe(consulta).map(raiz))];
  if (!palabras.length) return [];
  const frase = normalizar(consulta).trim();
  const salida = [];
  for (const p of preparadas) {
    let puntos = 0;
    let todas = true;
    for (const w of palabras) {
      let w0 = 0;
      for (const [campo, peso] of Object.entries(PESOS)) w0 += cuenta(p[campo], w) * peso;
      if (!w0) { todas = false; break; }
      puntos += w0;
    }
    if (!todas) continue;
    if (frase.length > 3 && normalizar(p.g.titulo).includes(frase)) puntos += 30;
    const seccion = (p.g.secciones ?? []).find((s) => palabras.some((w) => ` ${palabrasDe(s.texto).join(" ")} `.includes(` ${w}`))) ?? null;
    salida.push({ g: p.g, puntos, seccion });
  }
  return salida.sort((a, b) => b.puntos - a.puntos || (a.g.orden ?? 100) - (b.g.orden ?? 100)).slice(0, limite);
}
