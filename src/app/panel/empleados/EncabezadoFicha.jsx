// Encabezado compacto de la ficha del empleado (maqueta aprobada «Main.dc.html»): una sola franja con regresar,
// foto (48 px, tocarla la cambia), nombre + estado, «Puesto · Área · No. · desde…», «Credencial y QR», estado de
// cambios y Guardar. En el celular las acciones bajan a un segundo renglón y Guardar sigue en la barra fija de abajo.
// (28/11/2026, sistema de diseño; docs/sistema-diseno.md) Franja gris como el encabezado de página, nombre en azul
// marino peso 700 y botón de regresar de 48 px. Solo presentación.
import { ChevronLeft } from "lucide-react";
import { estiloEstado } from "@/lib/estados";
import { cn } from "@/lib/utils";

function Estado({ estado }) {
  if (!estado) return null;
  const e = estiloEstado(estado);
  return (
    <span data-estado-empleado data-chico className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-0.5 text-[15px] font-semibold leading-6", e.bg, e.text)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", e.dot)} />
      {estado}
    </span>
  );
}

export default function EncabezadoFicha({ textoRegresar, onRegresar, foto, nombre, estado, subtitulo, credencial, estadoCambios, guardar }) {
  return (
    <header
      data-encabezado-ficha
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-borde bg-franja px-3 py-3 sm:mb-4 sm:flex-nowrap sm:gap-x-3.5 sm:rounded-seccion sm:border sm:px-4"
    >
      <button
        type="button"
        onClick={onRegresar}
        aria-label={textoRegresar}
        title={textoRegresar}
        className="-ml-1 flex size-12 shrink-0 items-center justify-center rounded-boton border border-borde-campo bg-white text-texto-boton hover:bg-franja sm:ml-0"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      {foto}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <h1 className="min-w-0 break-words text-[20px] font-bold leading-tight text-navy sm:text-[22px]">{nombre}</h1>
          <Estado estado={estado} />
        </div>
        {subtitulo ? <p className="mt-0.5 line-clamp-2 text-cuerpo leading-snug text-texto-secundario">{subtitulo}</p> : null}
      </div>
      {(credencial || estadoCambios || guardar) && (
        <div className={cn("w-full items-center justify-between gap-3 sm:flex sm:w-auto sm:shrink-0 sm:justify-end", credencial || estadoCambios ? "flex" : "hidden")}>
          {credencial}
          <div className="flex items-center gap-3">
            {estadoCambios}
            {guardar ? <span className="hidden sm:contents">{guardar}</span> : null}
          </div>
        </div>
      )}
    </header>
  );
}
