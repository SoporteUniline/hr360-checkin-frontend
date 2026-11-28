// HTML del contrato en el navegador (27/11/2026). El texto lo arma y lo congela el servidor (que ya quita scripts y
// manejadores); aquí se vuelve a limpiar antes de pintarlo (defensa en profundidad, misma regla que el backend
// limpiarHtml) y se resaltan las variables en el editor de plantillas. Puro; lo prueba scripts/test-contratos.mjs.
import { ETIQUETA_VARIABLE } from "./variablesContrato.mjs";

export function limpiarHtmlContrato(html) {
  return String(html ?? "")
    .replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "$1=$2#$2");
}

const escapar = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Vista previa del editor: cada {{variable}} como una pastilla azul con su nombre en palabras. */
export function resaltarVariables(html) {
  return limpiarHtmlContrato(html).replace(/\{\{\s*([a-z_]+\.[a-z_]+)\s*\}\}/gi, (_, clave) => {
    const etiqueta = ETIQUETA_VARIABLE.get(clave.toLowerCase());
    return `<span data-variable="${escapar(clave)}" style="background:#EEF2FF;color:#1E40C4;border-radius:6px;padding:0 4px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:0.9em;">${escapar(etiqueta ?? clave)}</span>`;
  });
}

/** Variables {{…}} que usa un texto (en orden, sin repetir). */
export function variablesUsadas(html) {
  return [...new Set([...String(html ?? "").matchAll(/\{\{\s*([a-z_]+\.[a-z_]+)\s*\}\}/gi)].map((m) => m[1].toLowerCase()))];
}
