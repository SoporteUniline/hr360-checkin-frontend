// Une clases de Tailwind sin choques (28/11/2026, sistema de diseño: docs/sistema-diseno.md). Es lo que usa cn()
// (src/lib/utils.js) en todos los componentes.
//
// ¿Por qué existe? tailwind-merge decide qué clase «gana» cuando dos chocan (p. ej. `h-8` contra `h-boton`). Solo
// conoce los tamaños de fábrica: sin registrar nuestros tokens, `text-boton` lo tomaría por un COLOR y borraría
// `text-white`, y `h-boton` no le ganaría a `h-8`. Aquí se registran los nombres de tamaño, letra y radio que se
// definen en src/app/globals.css (@theme). Los colores no hace falta: tailwind-merge acepta cualquier nombre de color.
//
// Si agregas un token de tamaño, letra o radio en globals.css, agrégalo también a la lista que le toca.
import { extendTailwindMerge } from "tailwind-merge";

/** Alturas y anchos (h-*, w-*, size-*, min-h-*…): --spacing-* en globals.css. */
export const TOKENS_TAMANO = ["boton", "boton-principal", "icono", "campo", "resumen"];
/** Tamaños de letra (text-*): --text-* en globals.css. */
export const TOKENS_LETRA = ["cuerpo", "boton", "boton-principal", "campo", "etiqueta", "ayuda", "titulo-seccion", "titulo-pagina"];
/** Radios (rounded-*): --radius-* en globals.css. */
export const TOKENS_RADIO = ["boton", "seccion"];

export const unirClases = extendTailwindMerge({
  extend: {
    theme: {
      spacing: TOKENS_TAMANO,
      text: TOKENS_LETRA,
      radius: TOKENS_RADIO,
    },
  },
});
