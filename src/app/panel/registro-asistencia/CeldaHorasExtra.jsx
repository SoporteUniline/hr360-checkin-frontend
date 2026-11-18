"use client";

// Horas extra en dos columnas (pedido del 18/11/2026: «más bonito y limpio»):
// - «Horas extra»: solo el tiempo después de la salida del horario (+ casilla para el masivo).
// - «¿Autorizar?»: selector Sí | No. Tocar la opción ya elegida la quita (vuelve a «por autorizar»).
//   «⋯» abre forma de pago y nota.

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { FORMA_PAGO_DEFAULT, FORMAS_PAGO, UMBRAL_MINUTOS } from "@/lib/asistencia/horasExtra.mjs";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";

const detener = (e) => e.stopPropagation();
const notaPropia = (registro) =>
  String(registro.notas_hrs_extra ?? "").startsWith("No autorizadas") ? "" : registro.notas_hrs_extra || "";

// Forma de pago y nota antes de autorizar (o para cambiarlas).
function DetalleAutorizar({ registro, minutos, onAutorizar, children }) {
  const [abierto, setAbierto] = useState(false);
  const [forma, setForma] = useState(registro.forma_pago_extras || FORMA_PAGO_DEFAULT);
  const [notas, setNotas] = useState(notaPropia(registro));
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

// Columna «Horas extra»: solo el tiempo.
export default function CeldaHorasExtra({ registro, info, readOnly, seleccionado, onSeleccionar }) {
  const { estado, minutos } = info;
  if (estado === "sin") {
    return <span className="text-slate-300" title={`Sin tiempo después del horario (cuenta desde ${UMBRAL_MINUTOS} min)`}>—</span>;
  }
  const texto = minutos != null ? formatearMinutos(minutos) : "Sí";
  return (
    <div className="flex items-center gap-2 whitespace-nowrap" data-no-row-click onClick={detener}>
      {!readOnly && estado === "pendiente" && (
        <input
          type="checkbox"
          aria-label={`Seleccionar ${registro.nombre} ${registro.apellido_paterno ?? ""}`}
          checked={Boolean(seleccionado)}
          onChange={(e) => onSeleccionar?.(e.target.checked)}
          className="h-4 w-4 shrink-0 accent-blue-600"
        />
      )}
      <span
        className={`font-semibold tabular-nums ${
          estado === "pendiente" ? "text-orange-700" : estado === "autorizada" ? "text-emerald-700" : "text-slate-400 line-through"
        }`}
        title={estado === "no_autorizada" ? "No autorizadas: se paga hasta la salida del horario" : undefined}
      >
        {texto}
      </span>
    </div>
  );
}

// Columna «¿Autorizar?»: Sí | No.
export function CeldaAutorizarExtra({
  registro, info, autorizador, readOnly, guardando, onAutorizar, onNoAutorizar, onQuitar,
}) {
  const { estado, minutos } = info;
  if (estado === "sin") return <span className="text-slate-300">—</span>;
  const si = estado === "autorizada";
  const no = estado === "no_autorizada";
  const opcion = (activa, tono) =>
    `px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
      activa ? tono : "bg-white text-slate-500 hover:bg-slate-50"
    }`;
  const detalle = si
    ? [autorizador || "Sin autorizador", registro.forma_pago_extras, notaPropia(registro) && `“${notaPropia(registro)}”`]
        .filter(Boolean)
        .join(" · ")
    : no
    ? "Se paga hasta la salida del horario; la checada del reloj se conserva"
    : "Por autorizar";

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap" data-no-row-click onClick={detener} title={detalle}>
      <div
        role="group"
        aria-label={`Autorizar horas extra de ${registro.nombre} ${registro.apellido_paterno ?? ""}`}
        className="inline-flex overflow-hidden rounded-lg border border-slate-200"
      >
        <button
          type="button"
          aria-pressed={si}
          disabled={readOnly || guardando}
          onClick={() => (si ? onQuitar() : onAutorizar({}))}
          className={opcion(si, "bg-emerald-600 text-white")}
        >
          Sí
        </button>
        <button
          type="button"
          aria-pressed={no}
          disabled={readOnly || guardando}
          onClick={() => (no ? onQuitar() : onNoAutorizar())}
          className={`${opcion(no, "bg-rose-600 text-white")} border-l border-slate-200`}
        >
          No
        </button>
      </div>
      {!readOnly && !no && (
        <DetalleAutorizar registro={registro} minutos={minutos} onAutorizar={onAutorizar}>
          <button
            type="button"
            disabled={guardando}
            aria-label="Forma de pago y nota"
            title="Forma de pago y nota"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DetalleAutorizar>
      )}
      {si && <span className="max-w-[140px] truncate text-[11px] text-slate-500">{autorizador || ""}</span>}
    </div>
  );
}
