// Centro de ayuda · frontmatter de las guías (contrato: docs/centro-de-ayuda.md). YAML SIMPLE: solo «clave: valor» y
// listas «[a, b]» en una línea. Se permite un comentario al final de la línea con « # …» (espacio antes y después del #).
// Sin red ni React: probado en scripts/test-ayuda.mjs.

export const AUDIENCIAS = Object.freeze(["rh", "jefe", "empleado", "dueno"]);
export const NOMBRE_AUDIENCIA = Object.freeze({ rh: "Recursos Humanos", jefe: "Jefes de equipo", empleado: "Empleados", dueno: "Dueño de la cuenta" });
/** «Manual para …», «Guías para …». */
export const PARA_AUDIENCIA = Object.freeze({ rh: "Recursos Humanos", jefe: "jefes de equipo", empleado: "empleados", dueno: "el dueño de la cuenta" });
const LISTAS = new Set(["audiencia", "pantallas", "palabras", "fuentes", "guias"]);
// Claves conocidas por tipo de archivo; una clave desconocida es advertencia (no rompe).
export const CLAVES = Object.freeze({
  guia: ["titulo", "resumen", "modulo", "audiencia", "pantallas", "palabras", "orden", "actualizado", "fuentes"],
  portada: ["titulo", "resumen", "modulo", "audiencia", "palabras", "orden", "actualizado", "fuentes", "pantallas"],
  ruta: ["titulo", "resumen", "audiencia", "guias", "orden", "actualizado", "palabras"],
});
const OBLIGATORIAS = Object.freeze({
  guia: ["titulo", "resumen", "modulo", "audiencia", "actualizado", "fuentes"],
  portada: ["titulo", "resumen"],
  ruta: ["titulo", "resumen", "audiencia", "guias"],
});

const sinComillas = (v) => {
  const t = v.trim();
  return (t.length >= 2 && ((t[0] === '"' && t.at(-1) === '"') || (t[0] === "'" && t.at(-1) === "'"))) ? t.slice(1, -1) : t;
};
const sinComentario = (v) => v.replace(/\s+#\s.*$/, "").replace(/\s{2,}#.*$/, "");

/** Texto del archivo → { datos, cuerpo, lineaCuerpo, errores: [texto] }. */
export function separarFrontmatter(texto) {
  const s = String(texto ?? "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const errores = [];
  if (!s.startsWith("---\n")) return { datos: {}, cuerpo: s, lineaCuerpo: 0, errores: ["El archivo debe empezar con «---» (frontmatter)."] };
  const fin = s.indexOf("\n---", 4);
  if (fin === -1) return { datos: {}, cuerpo: s, lineaCuerpo: 0, errores: ["Falta el «---» que cierra el frontmatter."] };
  const cabecera = s.slice(4, fin);
  const resto = s.slice(fin + 4).replace(/^[^\n]*\n?/, "");
  const datos = {};
  cabecera.split("\n").forEach((linea, n) => {
    if (!linea.trim() || /^\s*#/.test(linea)) return;
    const m = /^([a-z_]+):\s*(.*)$/.exec(linea);
    if (!m) { errores.push(`Frontmatter línea ${n + 2}: usa «clave: valor» («${linea.trim().slice(0, 40)}»).`); return; }
    const [, clave, crudo] = m;
    if (clave in datos) errores.push(`Frontmatter: «${clave}» está repetida.`);
    const valor = sinComentario(crudo).trim();
    if (valor.startsWith("[")) {
      if (!valor.endsWith("]")) { errores.push(`Frontmatter: la lista «${clave}» debe abrir y cerrar en la misma línea.`); return; }
      datos[clave] = valor.slice(1, -1).split(",").map(sinComillas).map((x) => x.trim()).filter(Boolean);
    } else datos[clave] = sinComillas(valor);
  });
  const lineaCuerpo = cabecera.split("\n").length + 2;
  return { datos, cuerpo: resto, lineaCuerpo, errores };
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const fechaValida = (f) => FECHA.test(f) && !Number.isNaN(new Date(`${f}T12:00:00Z`).getTime()) && new Date(`${f}T12:00:00Z`).toISOString().slice(0, 10) === f;

/**
 * Normaliza y valida los datos de un archivo. tipo: «guia» | «portada» (index.md de un módulo) | «ruta».
 * → { meta, errores: [texto], advertencias: [texto] }.
 */
export function validarDatos(datos = {}, tipo = "guia") {
  const errores = [];
  const advertencias = [];
  const meta = {};
  for (const [clave, valor] of Object.entries(datos)) {
    if (!CLAVES[tipo].includes(clave)) { advertencias.push(`Clave desconocida en el frontmatter: «${clave}».`); continue; }
    meta[clave] = LISTAS.has(clave) ? (Array.isArray(valor) ? valor : String(valor).trim() ? [String(valor).trim()] : []) : Array.isArray(valor) ? valor.join(", ") : String(valor);
  }
  for (const clave of OBLIGATORIAS[tipo]) {
    const v = meta[clave];
    if (v == null || (Array.isArray(v) ? !v.length : !String(v).trim())) errores.push(`Falta «${clave}» en el frontmatter.`);
  }
  if (meta.titulo && meta.titulo.length > 90) advertencias.push("El título pasa de 90 caracteres (se corta en los buscadores).");
  if (meta.resumen && meta.resumen.length > 200) advertencias.push("El resumen pasa de 200 caracteres.");
  if (meta.audiencia) {
    meta.audiencia = meta.audiencia.map((a) => a.toLowerCase());
    for (const a of meta.audiencia) if (!AUDIENCIAS.includes(a)) errores.push(`Audiencia desconocida: «${a}» (usa ${AUDIENCIAS.join(", ")}).`);
  }
  if (meta.modulo && !/^[a-z0-9_-]+$/.test(meta.modulo)) errores.push(`«modulo» debe ser una clave en minúsculas («${meta.modulo}»).`);
  if (meta.orden != null && meta.orden !== "") {
    const n = Number(meta.orden);
    if (!Number.isFinite(n)) errores.push(`«orden» debe ser un número («${meta.orden}»).`);
    meta.orden = Number.isFinite(n) ? n : 100;
  } else meta.orden = 100;
  if (meta.actualizado != null && !fechaValida(meta.actualizado)) errores.push(`«actualizado» debe ser una fecha AAAA-MM-DD («${meta.actualizado}»).`);
  for (const p of meta.pantallas ?? []) if (!/^\/[\w\-[\].\/]*$/.test(p) || p.includes("//")) errores.push(`Pantalla inválida: «${p}» (debe ser una ruta como /panel/muro).`);
  for (const g of meta.guias ?? []) if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(g)) errores.push(`Guía inválida en la ruta: «${g}» (usa modulo/guia).`);
  meta.palabras = meta.palabras ?? [];
  meta.pantallas = meta.pantallas ?? [];
  meta.fuentes = meta.fuentes ?? [];
  return { meta, errores, advertencias };
}
