"use client";

// Campo «Motivo de la corrección» (obligatorio, 5 a 500 letras) con sugerencias rápidas y el error junto al campo.
// Lo usan todas las pantallas que corrigen checadas o asistencias fuera del reloj del día (Centro de incidencias, Entradas y
// salidas, acciones masivas, qué pasó, comida agregada, registro masivo). Reglas: lib/asistencia/motivoCorreccion.mjs.
// `error`: texto a mostrar (la pantalla decide cuándo: al intentar guardar o lo que respondió el servidor).
import { useId } from "react";
import { MOTIVO_MAX, SUGERENCIAS } from "@/lib/asistencia/motivoCorreccion.mjs";

export default function CampoMotivo({
  valor, onCambio, error = "", disabled = false, movil = false, etiqueta = "Motivo de la corrección",
  sugerencias = SUGERENCIAS, placeholder = "Ej. olvidó checar, falla del reloj…", autoFocus = false, className = "", nombre = "",
}) {
  const id = useId();
  const alto = movil ? "h-11 text-base" : "h-9 text-[13.5px] max-sm:h-11 max-sm:text-base";
  const de = nombre ? ` de ${nombre}` : "";
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`} data-campo-motivo>
      <label htmlFor={id} className="text-[12.5px] font-semibold text-slate-600">
        {etiqueta} <span className="font-normal text-slate-500">(obligatorio)</span>
      </label>
      <input
        id={id}
        aria-label={`${etiqueta}${de} (obligatorio)`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        data-motivo-correccion
        value={valor ?? ""}
        maxLength={MOTIVO_MAX}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onCambio(e.target.value)}
        className={`${alto} w-full min-w-0 rounded-lg border bg-white px-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-50 ${error ? "border-rose-300 bg-rose-50" : "border-slate-200"}`}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" data-error-motivo className="text-[12.5px] font-medium leading-snug text-rose-700">{error}</p>
      ) : null}
      {sugerencias?.length ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Sugerencias rápidas" data-sugerencias-motivo>
          {sugerencias.map((s) => (
            <button key={s} type="button" disabled={disabled} onClick={() => onCambio(s)}
              className={`${movil ? "min-h-11 px-3 text-[14px]" : "min-h-7 px-2.5 text-[12px] max-sm:min-h-11 max-sm:text-[14px]"} rounded-full border text-left leading-tight ${valor === s ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
