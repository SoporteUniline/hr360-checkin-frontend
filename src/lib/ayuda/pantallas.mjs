// Centro de ayuda · qué guía abre el botón «?» en cada pantalla y qué guías ve cada sesión dentro del sistema.
// La MISMA regla sirve al botón «?» (BotonAyuda.jsx) y a la prueba de cobertura (scripts/test-ayuda.mjs): una pantalla
// «tiene guía» si el botón «?» abriría alguna en ella. Sin red ni React: probado en scripts/test-ayuda.mjs.
import { BASE, CLAVES as CLAVES_MODULO } from "../modulos/catalogo.mjs";
import { rutaPermitida } from "../modulos/menu.mjs";
import { rutaPermitidaAcceso } from "../permisos/permisos.mjs";

// Raíces que nunca cuentan como prefijo (una guía de «/panel» no puede cubrir todo el panel).
const RAICES = new Set(["/", "/panel", "/empleado", "/empleado/panel", "/dashboard"]);
const segmentos = (r) => String(r ?? "").split(/[?#]/)[0].split("/").filter(Boolean);
const esDinamico = (s) => /^\[.+\]$/.test(s);

/**
 * ¿La ruta encaja en el patrón? patrón con segmentos de Next: [id], [...resto], [[...opcional]].
 * La ruta puede ser concreta (/panel/comunicados/12) o también un patrón (/panel/comunicados/[id]): un segmento
 * dinámico de la ruta encaja con un segmento dinámico del patrón.
 */
export function coincide(patron, ruta) {
  const p = segmentos(patron);
  const r = segmentos(ruta);
  const ir = (i, j) => {
    if (i === p.length) return j === r.length;
    const s = p[i];
    if (/^\[\[\.\.\..+\]\]$/.test(s)) return true;
    if (/^\[\.\.\..+\]$/.test(s)) return j < r.length;
    if (j >= r.length) return false;
    if (esDinamico(s)) return ir(i + 1, j + 1);
    if (esDinamico(r[j])) return false;
    return s === r[j] && ir(i + 1, j + 1);
  };
  return ir(0, 0);
}

/** ¿El patrón es prefijo de la ruta (por segmentos) y no es una raíz? Devuelve cuántos segmentos encajan, o 0. */
export function prefijo(patron, ruta) {
  const p = segmentos(patron);
  const limpio = `/${p.join("/")}`;
  if (RAICES.has(limpio) || p.some((s) => s.startsWith("[["))) return 0;
  const r = segmentos(ruta);
  if (p.length >= r.length) return 0;
  return coincide(limpio, `/${r.slice(0, p.length).join("/")}`) ? p.length : 0;
}

/**
 * Guías de una pantalla, de la más precisa a la menos: primero las que la nombran exactamente y luego las del prefijo más
 * largo (p. ej. /panel/nomina cubre /panel/nomina/5). Empate (misma ruta): gana el «orden» más bajo (contrato con los
 * agentes de contenido, 27/11/2026). guias: [{ slug, pantallas, orden }]. (audiencias se acepta por compatibilidad: el
 * filtro por audiencia se hace antes, en guiasVisibles.)
 */
export function guiasDePantalla(guias = [], ruta) {
  const puntuadas = [];
  for (const g of guias) {
    let puntos = 0;
    for (const p of g.pantallas ?? []) {
      if (coincide(p, ruta)) puntos = Math.max(puntos, 1000 + segmentos(p).length);
      else puntos = Math.max(puntos, prefijo(p, ruta));
    }
    if (puntos) puntuadas.push({ g, puntos });
  }
  return puntuadas
    .sort((a, b) => b.puntos - a.puntos || (a.g.orden ?? 100) - (b.g.orden ?? 100) || String(a.g.slug).localeCompare(String(b.g.slug)))
    .map((x) => x.g);
}

/** Ruta del archivo de página (src/app/…/page.jsx) → ruta de la app sin grupos «(x)». null si no es una página. */
export function rutaDeArchivo(relativo) {
  const partes = String(relativo).replace(/\\/g, "/").split("/");
  if (!/^page\.(jsx?|tsx?|mdx)$/.test(partes.at(-1) ?? "")) return null;
  const segs = partes.slice(0, -1).filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("@"));
  return `/${segs.join("/")}`.replace(/\/+$/, "") || "/";
}

/** Ruta representativa de un patrón para preguntar «¿qué guía abre aquí?»: el [[...opcional]] no lleva segmentos. */
export const rutaRepresentativa = (patron) => `/${segmentos(patron).filter((s) => !s.startsWith("[[")).join("/")}`;

// ───────── dentro del sistema ─────────
/**
 * Audiencias de la sesión. Panel: RH (y «dueno» si no es un usuario con acceso). Mi espacio: empleado (y «jefe» si
 * tiene equipo). Administrador de ADAMIA: todas.
 */
export function audienciasDeSesion(dataUser, { esJefe = false } = {}) {
  const tipo = dataUser?.tipo_usuario;
  if (tipo === "Admin") return ["rh", "dueno", "jefe", "empleado"];
  if (tipo === "Empleado") return esJefe ? ["empleado", "jefe"] : ["empleado"];
  if (tipo === "Recruiter" || tipo === "User") return dataUser?.esAcceso ? ["rh"] : ["rh", "dueno"];
  return [];
}

const MODULOS_OPCIONALES = new Set(CLAVES_MODULO.filter((c) => !BASE.includes(c)));
/**
 * ¿La guía se ve dentro del sistema con estos módulos y permisos? (la audiencia se filtra aparte, con «Todas»).
 * - «modulo» que no es un módulo opcional del catálogo (usuarios, seguridad, primeros-pasos…) cuenta como base.
 * - modulo del catálogo opcional apagado → no.
 * - si tiene pantallas, alguna debe estar permitida por módulos (y por permisos del acceso, en el panel).
 */
export function guiaDisponible(g, { activos = null, opciones, permisos = null } = {}) {
  // clima, adamia-ai, mi-espacio, usuarios, seguridad… no son módulos opcionales del catálogo: cuentan como base.
  if (MODULOS_OPCIONALES.has(g.modulo)) {
    if (g.modulo === "reclutamiento" && opciones?.reclutamiento === false) return false;
    if (activos && !activos.has(g.modulo)) return false;
  }
  const pantallas = g.pantallas ?? [];
  if (!pantallas.length) return true;
  return pantallas.some((p) => rutaPermitida(p, activos, opciones) && (!p.startsWith("/panel") || rutaPermitidaAcceso(p, permisos)));
}

/** Guías visibles: disponibles y (si todas = false) de alguna audiencia de la sesión. */
export function guiasVisibles(guias = [], { audiencias = [], todas = false, ...resto } = {}) {
  return guias.filter((g) => guiaDisponible(g, resto) && (todas || (g.audiencia ?? []).some((a) => audiencias.includes(a))));
}

/** Rutas de capacitación de la sesión con solo las guías disponibles. */
export function rutasVisibles(rutas = [], guiasPorSlug = new Map(), { audiencias = [], todas = false, ...resto } = {}) {
  return rutas
    .filter((r) => todas || (r.audiencia ?? []).some((a) => audiencias.includes(a)))
    .map((r) => ({ ...r, guias: r.guias.filter((s) => guiasPorSlug.has(s) && guiaDisponible(guiasPorSlug.get(s), resto)) }))
    .filter((r) => r.guias.length);
}
