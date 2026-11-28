import { useId } from "react";
import { cn } from "@/lib/utils";

const COLUMNAS = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
};

/**
 * Sección de un formulario (28/11/2026, mockup aprobado; docs/sistema-diseno.md): tarjeta blanca con borde, esquinas de
 * 14 px y franja gris con el título (h2 de 21 px en escritorio, peso 700, azul marino). SIN fondos de color: el color
 * se queda para los estados (EtiquetaEstado).
 *
 * Props:
 *   titulo       texto del h2 (obligatorio).
 *   descripcion  una línea gris debajo del título (opcional).
 *   accion       algo a la derecha de la franja (p. ej. un enlace) (opcional).
 *   columnas     1, 2 (por defecto) o 3: cuántos campos por renglón en escritorio. En celular siempre 1.
 *   className    clases extra para el cuerpo (p. ej. para que un campo ocupe todo: usa `md:col-span-2` en el campo).
 *
 * Ejemplo:
 *   <SeccionFormulario titulo="Sueldo" descripcion="Lo que gana la persona y cada cuándo se le paga.">
 *     <CampoFormulario id="sueldo" etiqueta="Sueldo mensual" obligatorio>{(p) => <input {...p} />}</CampoFormulario>
 *   </SeccionFormulario>
 */
export default function SeccionFormulario({ titulo, descripcion = null, accion = null, columnas = 2, className = "", children, ...resto }) {
  const id = useId();
  return (
    <section data-seccion-formulario aria-labelledby={id} className="min-w-0 overflow-hidden rounded-seccion border border-borde bg-white" {...resto}>
      <div data-franja className="flex flex-wrap items-start justify-between gap-3 border-b border-borde bg-franja px-4 py-3.5 lg:px-7 lg:py-4">
        <div className="min-w-0">
          <h2 id={id} className="m-0 text-titulo-seccion font-bold leading-snug text-navy">{titulo}</h2>
          {descripcion ? <p className="m-0 mt-1 text-cuerpo text-texto-secundario">{descripcion}</p> : null}
        </div>
        {accion}
      </div>
      <div className={cn("grid gap-5 p-4 lg:gap-x-7 lg:gap-y-6 lg:p-7", COLUMNAS[columnas] ?? COLUMNAS[2], className)}>{children}</div>
    </section>
  );
}
