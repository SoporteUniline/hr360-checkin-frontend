// Colores de estado de las vistas de detalle (docs/vistas-de-detalle.md). (28/11/2026) Salen de los tokens globales
// --adamia-estado-* de src/app/globals.css (los mismos de EtiquetaEstado, docs/sistema-diseno.md): cambiar un color
// ahí lo cambia aquí. `suave` es el fondo de avisos largos. Contraste ≥ 4.5:1 sobre su fondo.
export const TONOS = {
  exito: { fondo: "var(--adamia-estado-exito)", texto: "var(--adamia-estado-exito-texto)", suave: "#F0FDF4" },
  aviso: { fondo: "var(--adamia-estado-aviso)", texto: "var(--adamia-estado-aviso-texto)", suave: "#FFFBEB" },
  error: { fondo: "var(--adamia-estado-error)", texto: "var(--adamia-estado-error-texto)", suave: "var(--adamia-peligro-suave)" },
  info: { fondo: "var(--adamia-estado-info)", texto: "var(--adamia-estado-info-texto)", suave: "var(--adamia-seleccion)" },
  neutro: { fondo: "var(--adamia-estado-neutro)", texto: "var(--adamia-estado-neutro-texto)", suave: "var(--adamia-franja)" },
};
export const tono = (t) => TONOS[t] ?? TONOS.neutro;

/** Pastilla de estado («Vigente», «Pendiente»…). Es la misma EtiquetaEstado del sistema de diseño. */
export { default as Pastilla } from "@/components/formulario/EtiquetaEstado";
