"use client";

import { useState } from "react";
import { Check, MoreHorizontal, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { FORMA_PAGO_DEFAULT, FORMAS_PAGO, UMBRAL_MINUTOS } from "@/lib/asistencia/horasExtra.mjs";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";

const detener = (e) => e.stopPropagation();

// Autorizar con forma de pago y nota (lo abre «⋯» o «Cambiar»).
function DetalleAutorizar({ registro, minutos, onAutorizar, children }) {
  const [abierto, setAbierto] = useState(false);
  const [forma, setForma] = useState(registro.forma_pago_extras || FORMA_PAGO_DEFAULT);
  const [notas, setNotas] = useState(
    String(registro.notas_hrs_extra ?? "").startsWith("No autorizadas") ? "" : registro.notas_hrs_extra || "",
  );
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 border border-slate-200 bg-white p-4 shadow-xl" data-no-row-click onClick={detener}>
        <p className="text-sm font-semibold text-slate-900">Horas extra · {registro.nombre} {registro.apellido_paterno}</p>
        {minutos != null && (
          <p className="mt-0.5 text-xs text-slate-500">{formatearMinutos(minutos)} después de la salida del horario</p>
        )}
        <label className="mt-3 block text-xs font-semibold text-slate-500">
          Forma de pago
          <select
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
          >
            {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
        <label className="mt-2 block text-xs font-semibold text-slate-500">
          Nota
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Motivo (opcional)" className="mt-1 text-sm" />
        </label>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              onAutorizar({ forma, notas });
            }}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Autorizar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Celda «Hrs extra»: estado + acciones de un clic.
export default function CeldaHorasExtra({
  registro, info, autorizador, readOnly, guardando, seleccionado, onSeleccionar, onAutorizar, onNoAutorizar, onQuitar,
}) {
  const { estado, minutos } = info;
  if (estado === "sin") {
    return <span className="text-slate-300" title={`Sin tiempo después del horario (cuenta desde ${UMBRAL_MINUTOS} min)`}>—</span>;
  }
  const casilla = !readOnly && estado === "pendiente" && (
    <input
      type="checkbox"
      aria-label={`Seleccionar ${registro.nombre} ${registro.apellido_paterno ?? ""}`}
      checked={Boolean(seleccionado)}
      onChange={(e) => onSeleccionar?.(e.target.checked)}
      onClick={detener}
      className="h-4 w-4 shrink-0 accent-blue-600"
    />
  );
  const accion = "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition disabled:opacity-50";

  if (estado === "pendiente") {
    return (
      <div className="flex items-center justify-start gap-1.5 whitespace-nowrap" data-no-row-click onClick={detener}>
        {casilla}
        <span className="min-w-[64px] font-semibold tabular-nums text-orange-700">{formatearMinutos(minutos)}</span>
        {!readOnly && (
          <>
            <button type="button" disabled={guardando} onClick={() => onAutorizar({})} className={`${accion} bg-emerald-700 text-white hover:bg-emerald-800`}>
              <Check className="h-3.5 w-3.5" /> Autorizar
            </button>
            <button type="button" disabled={guardando} onClick={onNoAutorizar} className={`${accion} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50`} title="La salida pagada queda a la hora del horario; la checada real se conserva">
              <X className="h-3.5 w-3.5" /> No
            </button>
            <DetalleAutorizar registro={registro} minutos={minutos} onAutorizar={onAutorizar}>
              <button type="button" disabled={guardando} aria-label="Autorizar con forma de pago y nota" className={`${accion} bg-slate-100 text-slate-500 hover:bg-slate-200`}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DetalleAutorizar>
          </>
        )}
      </div>
    );
  }

  if (estado === "autorizada") {
    return (
      <div className="flex items-center justify-start gap-2 whitespace-nowrap text-left" data-no-row-click onClick={detener}>
        <div className="flex flex-col">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <Check className="h-3 w-3" /> {minutos != null ? formatearMinutos(minutos) : "Autorizadas"}
          </span>
          <span className="mt-0.5 text-[11px] text-slate-500">
            {[autorizador || "Sin autorizador", registro.forma_pago_extras].filter(Boolean).join(" · ")}
          </span>
          {registro.notas_hrs_extra && (
            <span className="max-w-[220px] truncate text-[11px] text-slate-500" title={registro.notas_hrs_extra}>“{registro.notas_hrs_extra}”</span>
          )}
        </div>
        {!readOnly && (
          <div className="flex flex-col items-start">
            <DetalleAutorizar registro={registro} minutos={minutos} onAutorizar={onAutorizar}>
              <button type="button" disabled={guardando} className="text-xs font-semibold text-blue-600 hover:underline">Cambiar</button>
            </DetalleAutorizar>
            <button type="button" disabled={guardando} onClick={onQuitar} className="text-xs font-semibold text-rose-600 hover:underline">Quitar</button>
          </div>
        )}
      </div>
    );
  }

  // no_autorizada
  return (
    <div className="flex items-center justify-start gap-2 whitespace-nowrap text-left" data-no-row-click onClick={detener}>
      <div className="flex flex-col">
        <span className="inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          No autorizadas · {formatearMinutos(minutos)}
        </span>
        <span className="mt-0.5 max-w-[240px] truncate text-[11px] text-slate-500" title={registro.notas_hrs_extra || ""}>
          Se paga hasta la salida del horario
        </span>
      </div>
      {!readOnly && (
        <button type="button" disabled={guardando} onClick={onQuitar} className="text-xs font-semibold text-blue-600 hover:underline">
          Deshacer
        </button>
      )}
    </div>
  );
}
