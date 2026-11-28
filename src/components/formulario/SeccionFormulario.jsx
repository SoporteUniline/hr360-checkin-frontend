import { useId } from "react";
import { cn } from "@/lib/utils";

const COLUMNAS = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  // (28/11/2026, mockup v3) Se acomoda sola al ancho de la pantalla para aprovechar todo el ancho:
  // 1 en celular, 2 desde 768 px, 3 desde 1200 px y 4 desde 1600 px.
  auto: "grid-cols-1 md:grid-cols-2 min-[75rem]:grid-cols-3 min-[100rem]:grid-cols-4",
};
/** Para un campo largo (CLABE, dirección, notas) dentro de columnas="auto": ocupa 2 columnas desde 768 px. */
export const CAMPO_ANCHO = "md:col-span-2";
/** Para algo que debe ocupar el renglón completo (un aviso, una nota) dentro de columnas="auto". */
export const RENGLON_COMPLETO = "col-span-full";

/**
 * Sección de un formulario (28/11/2026, mockup aprobado; docs/sistema-diseno.md): tarjeta blanca con borde, esquinas de
 * 14 px y franja gris con el título (h2 de 18 px en escritorio, peso 700, azul marino). SIN fondos de color: el color
 * se queda para los estados (EtiquetaEstado).
 *
 * Props:
 *   titulo       texto del h2 (obligatorio).
 *   descripcion  una línea gris junto al título (opcional).
 *   accion       algo a la derecha de la franja (p. ej. un enlace) (opcional).
 *   columnas     1, 2 (por defecto), 3 o "auto". Con "auto" (mockup v3, todo el ancho) la grilla se acomoda sola:
 *                1 en celular, 2 desde 768 px, 3 desde 1200 px y 4 desde 1600 px, y la tarjeta es más compacta
 *                (franja de 12 px y cuerpo de 20 px). Con 1, 2 o 3 es fija en escritorio y en celular siempre 1.
 *   className    clases extra para el cuerpo.
 * Un campo largo usa CAMPO_ANCHO (2 columnas) y un aviso que va a lo ancho, RENGLON_COMPLETO.
 *
 * Ejemplo:
 *   <SeccionFormulario titulo="Forma de pago" descripcion="A dónde se le deposita." columnas="auto">
 *     <CampoFormulario id="banco" etiqueta="Banco">{(p) => <input {...p} />}</CampoFormulario>
 *     <CampoFormulario id="clabe" etiqueta="CLABE" className={CAMPO_ANCHO}>{(p) => <input {...p} />}</CampoFormulario>
 *   </SeccionFormulario>
 */
export default function SeccionFormulario({ titulo, descripcion = null, accion = null, columnas = 2, className = "", children, ...resto }) {
  const id = useId();
  const compacta = columnas === "auto";
  return (
    <section data-seccion-formulario data-columnas={columnas} aria-labelledby={id} className="min-w-0 overflow-hidden rounded-seccion border border-borde bg-white" {...resto}>
      <div data-franja className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-borde bg-franja px-4 py-3.5", compacta ? "lg:px-5 lg:py-3" : "lg:px-7 lg:py-4")}>
        <div className={cn("min-w-0", compacta && "lg:flex lg:flex-wrap lg:items-baseline lg:gap-x-3")}>
          <h2 id={id} className="m-0 text-titulo-seccion font-bold leading-snug text-navy">{titulo}</h2>
          {descripcion ? <p className={cn("m-0 mt-1 text-cuerpo text-texto-secundario", compacta && "lg:mt-0")}>{descripcion}</p> : null}
        </div>
        {accion}
      </div>
      <div className={cn("grid gap-5 p-4", compacta ? "lg:gap-x-5 lg:gap-y-[18px] lg:p-5" : "lg:gap-x-7 lg:gap-y-6 lg:p-7", COLUMNAS[columnas] ?? COLUMNAS[2], className)}>{children}</div>
    </section>
  );
}
