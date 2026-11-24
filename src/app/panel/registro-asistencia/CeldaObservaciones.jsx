"use client";

import { Eye } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Observaciones en una sola línea recortada (el texto completo hacía la fila muy alta); el ojo abre el texto y
// su clic no abre la edición de la fila.
export default function CeldaObservaciones({ notas, notasHorasExtra }) {
  const nota = String(notas ?? "").trim();
  const extra = String(notasHorasExtra ?? "").trim();
  if (!nota && !extra) return "-";
  const resumen = nota || `Extras: ${extra}`;
  const detener = (e) => e.stopPropagation();

  return (
    <div className="flex min-w-0 items-center justify-center gap-1">
      <span className="min-w-0 truncate" title={resumen}>{resumen}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-no-row-click
            onClick={detener}
            aria-label="Ver observaciones completas"
            title="Ver observaciones"
            className="grid size-6 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Eye className="size-3.5" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent data-no-row-click onClick={detener} align="end" className="w-80 max-w-[90vw] space-y-3 border border-slate-200 bg-white p-4 text-left text-sm shadow-xl">
          {nota && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Observaciones</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-slate-800">{nota}</p>
            </div>
          )}
          {extra && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Horas extra</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-slate-800">{extra}</p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
