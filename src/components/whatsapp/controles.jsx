"use client";

// Piezas compartidas de WhatsApp R2 (agente y entrevista): interruptor accesible, campo con ayuda y error,
// chip de calificación, aviso de cambios sin guardar y clases del diálogo que en teléfono ocupa toda la pantalla.
import { etiquetaCalificacion } from "@/lib/whatsapp/entrevista.mjs";

export const TONOS = {
  verde: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ambar: "bg-amber-50 text-amber-900 ring-amber-200",
  rojo: "bg-red-50 text-red-700 ring-red-200",
  gris: "bg-gray-100 text-gray-700 ring-gray-200",
};

// Diálogo centrado en escritorio; en teléfono, hoja a pantalla completa. La «X» de Radix (último hijo) crece a 44 px.
// globals.css topa todo diálogo en celular a 100dvh − 1rem (!important) para no quedar bajo la hora o la barra de inicio;
// esta hoja ocupa toda la pantalla y respeta esas zonas con su propio relleno (safe-area en encabezado y pie), por eso
// anula el tope con `max-h-none!` (un !important de capa gana al !important sin capa).
export const DIALOGO_PANTALLA_COMPLETA =
  "flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:max-h-none! max-sm:overflow-hidden! max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 [&>button:last-child]:top-2 [&>button:last-child]:right-2 [&>button:last-child]:grid [&>button:last-child]:size-11 [&>button:last-child]:place-items-center [&>button:last-child]:rounded-full";

export function ChipCalificacion({ calificacion, className = "" }) {
  const e = etiquetaCalificacion(calificacion);
  if (!e) return null;
  return (
    <span data-calificacion={calificacion} className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONOS[e.tono]} ${className}`}>
      {e.texto}
    </span>
  );
}

// Interruptor (role="switch") con objetivo táctil de 44 px en teléfono. El texto visible es su nombre accesible.
export function Interruptor({ activo, onCambiar, children, disabled = false, className = "", ...resto }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={disabled}
      onClick={() => onCambiar(!activo)}
      className={`inline-flex min-h-11 items-center gap-2.5 rounded-lg text-left text-sm font-medium text-gray-800 outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-50 md:min-h-9 ${className}`}
      {...resto}
    >
      <span aria-hidden="true" className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${activo ? "bg-emerald-600" : "bg-gray-300"}`}>
        <span className={`absolute size-5 rounded-full bg-white shadow transition-transform ${activo ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </span>
      <span className="min-w-0">{children}</span>
    </button>
  );
}

// Etiqueta + control + ayuda + error. `id` es el del control; la ayuda y el error se enlazan con aria-describedby.
export function Campo({ id, etiqueta, ayuda, error, contador, children }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-gray-800">{etiqueta}</label>
        {contador ? <span className="text-[11.5px] text-gray-500">{contador}</span> : null}
      </div>
      {children}
      {ayuda ? <p id={`${id}-ayuda`} className="text-[12.5px] text-gray-500">{ayuda}</p> : null}
      {error ? <p id={`${id}-error`} className="text-[12.5px] font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
export const describir = (id, { ayuda, error }) => [ayuda ? `${id}-ayuda` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;

export const CLASE_ENTRADA =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 aria-[invalid=true]:border-red-400 md:text-sm";

// Pie del diálogo cuando se intenta cerrar con cambios: no se pierde lo escrito por un toque accidental.
export function AvisoSinGuardar({ onSeguir, onDescartar }) {
  return (
    <div role="alertdialog" aria-label="Cambios sin guardar" className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <span className="min-w-0 flex-1 basis-48 font-medium">Tienes cambios sin guardar.</span>
      <button type="button" onClick={onSeguir} className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-semibold md:min-h-9">Seguir editando</button>
      <button type="button" onClick={onDescartar} className="min-h-11 rounded-lg bg-amber-700 px-3 font-semibold text-white hover:bg-amber-800 md:min-h-9">Descartar cambios</button>
    </div>
  );
}
