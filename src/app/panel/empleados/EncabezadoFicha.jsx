// Encabezado compacto de la ficha del empleado (maqueta aprobada «Main.dc.html»): una sola franja con regresar,
// foto (48 px, tocarla la cambia), nombre + estado, «Puesto · Área · No. · desde…», «Credencial y QR», estado de
// cambios y Guardar. En el celular las acciones bajan a un segundo renglón y Guardar sigue en la barra fija de abajo.
import { ChevronLeft } from "lucide-react";
import { estiloEstado } from "@/lib/estados";
import { cn } from "@/lib/utils";

function Estado({ estado }) {
  if (!estado) return null;
  const e = estiloEstado(estado);
  return (
    <span data-estado-empleado className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[13px] font-bold leading-5", e.bg, e.text)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", e.dot)} />
      {estado}
    </span>
  );
}

export default function EncabezadoFicha({ textoRegresar, onRegresar, foto, nombre, estado, subtitulo, credencial, estadoCambios, guardar }) {
  return (
    <header
      data-encabezado-ficha
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-3 py-2.5 sm:mb-4 sm:flex-nowrap sm:gap-x-3.5 sm:rounded-2xl sm:border sm:px-3.5"
    >
      <button
        type="button"
        onClick={onRegresar}
        aria-label={textoRegresar}
        title={textoRegresar}
        className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-[10px] text-slate-700 hover:bg-slate-100 active:bg-slate-200 sm:ml-0 sm:size-10"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      {foto}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <h1 className="min-w-0 break-words text-[17px] font-extrabold leading-tight text-slate-900 sm:text-[19px]">{nombre}</h1>
          <Estado estado={estado} />
        </div>
        {subtitulo ? <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-600 sm:text-[13.5px]">{subtitulo}</p> : null}
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
