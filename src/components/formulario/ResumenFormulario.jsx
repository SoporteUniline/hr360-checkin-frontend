import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lista de datos del resumen: etiqueta gris a la izquierda y valor a la derecha. Las filas sin valor no se muestran.
 * `faltan` agrega al final la fila «Falta» con una pastilla roja por dato (o «Nada» en verde si está completo).
 */
function Datos({ filas, faltan, nota }) {
  const visibles = filas.filter((f) => f && f.valor !== null && f.valor !== undefined && f.valor !== "");
  return (
    <>
      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-3 px-5 py-4">
        {visibles.map((f) => (
          <div key={f.etiqueta} className="contents" data-resumen={f.clave ?? f.etiqueta}>
            <dt data-chico className="text-[15px] text-texto-secundario">{f.etiqueta}</dt>
            <dd className={cn("m-0 break-words text-right font-semibold text-texto", f.destacado && "text-[17px] font-bold")}>{f.valor}</dd>
          </div>
        ))}
        {faltan ? (
          <div className="contents" data-resumen="falta">
            <dt data-chico className="text-[15px] text-texto-secundario">Falta</dt>
            <dd className="m-0 flex flex-wrap justify-end gap-1.5">
              {faltan.length
                ? faltan.map((t) => <span key={t} data-chico data-estado="error" className="rounded-full bg-estado-error px-2.5 py-0.5 text-[15px] font-semibold leading-snug text-estado-error-texto">{t}</span>)
                : <span data-chico data-estado="exito" className="rounded-full bg-estado-exito px-2.5 py-0.5 text-[15px] font-semibold leading-snug text-estado-exito-texto">Nada</span>}
            </dd>
          </div>
        ) : null}
      </dl>
      {nota ? <p data-chico className="m-0 border-t border-borde px-5 py-3 text-[15px] text-texto-secundario">{nota}</p> : null}
    </>
  );
}

/**
 * Panel de RESUMEN de un formulario en página (28/11/2026, mockup v3 aprobado; docs/sistema-diseno.md): lo más
 * importante de lo capturado, para no tener que regresar a otro paso a revisarlo, y lo que falta en pastillas rojas.
 *   Desde 1200 px: tarjeta de 320 px (w-resumen) a la derecha del formulario, pegada arriba al bajar.
 *   Menos de 1200 px: un bloque plegable «Resumen» debajo del formulario (cerrado; se abre con un toque).
 * Va en el prop `resumen` de PaginaFormulario, que lo acomoda. Solo MUESTRA datos: los cálculos se hacen afuera, con
 * las reglas del módulo (p. ej. src/lib/contratos/resumenContrato.mjs), nunca aquí.
 *
 * Props:
 *   titulo   «Resumen» por omisión.
 *   filas    [{ etiqueta, valor, destacado?, clave? }]: las que no tienen valor no se muestran. destacado = más grande.
 *   faltan   lista de textos («CLABE», «Tipo de contrato») o null para no mostrar la fila «Falta».
 *   nota     una línea gris al pie (opcional), p. ej. qué se calcula al guardar.
 *
 * Ejemplo:
 *   <PaginaFormulario … resumen={<ResumenFormulario filas={[{ etiqueta: "Persona", valor: "Persona Uno Demo" },
 *     { etiqueta: "Por quincena", valor: "$6,000.00", destacado: true }]} faltan={["CLABE"]} />}>
 */
export default function ResumenFormulario({ titulo = "Resumen", filas = [], faltan = null, nota = null }) {
  const id = useId();
  return (
    <>
      <aside aria-labelledby={id} data-resumen-formulario className="hidden w-resumen shrink-0 self-start overflow-hidden rounded-seccion border border-borde bg-white min-[75rem]:sticky min-[75rem]:top-4 min-[75rem]:block">
        <div className="border-b border-borde bg-franja px-5 py-3">
          <h2 id={id} className="m-0 text-titulo-seccion font-bold leading-snug text-navy">{titulo}</h2>
        </div>
        <Datos filas={filas} faltan={faltan} nota={nota} />
      </aside>
      <details data-resumen-plegable className="group overflow-hidden rounded-seccion border border-borde bg-white min-[75rem]:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 bg-franja px-4 py-3 font-bold text-navy [&::-webkit-details-marker]:hidden">
          <span>
            {titulo}
            {faltan?.length ? <span className="font-semibold text-peligro-texto"> · Falta {faltan.length === 1 ? "1 dato" : `${faltan.length} datos`}</span> : null}
          </span>
          <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <Datos filas={filas} faltan={faltan} nota={nota} />
      </details>
    </>
  );
}
