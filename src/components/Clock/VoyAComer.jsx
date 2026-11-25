"use client";

// «Voy a comer» (26/11/2026): interruptor discreto junto a los métodos de checar. Prendido, la siguiente checada se
// registra como salida a comer; se apaga solo al usarse o a los 30 s. Solo presentación: el estado vive en RelojChecador
// y la regla en el servidor (src/lib/reloj/voyAComer.mjs).
import { Utensils } from "lucide-react";

// variante: "normal" (reloj del empleado en escritorio) o "barra"
// (barra de abajo del reloj del empleado en el celular).
export function BotonVoyAComer({ activo, segundos, onCambiar, variante = "normal", disabled = false }) {
  const forma = {
    normal: "h-auto min-h-11 flex-col gap-0.5 rounded-2xl px-4",
    barra: "h-11 shrink-0 gap-1.5 rounded-xl px-3",
  }[variante];
  const tono = activo
    ? "border-amber-500 bg-amber-500 text-white shadow-sm"
    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900";
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={onCambiar} disabled={disabled} data-voy-a-comer={activo ? "si" : "no"}
      aria-label="Voy a comer"
      title={activo ? "Tu siguiente checada se registra como salida a comer. Toca para quitarlo." : "Prende esto antes de checar si sales a comer"}
      className={`flex shrink-0 items-center justify-center border-2 transition-colors active:scale-95 disabled:opacity-50 ${forma} ${tono}`}>
      <Utensils className={variante === "barra" ? "size-4" : "size-6"} aria-hidden="true" />
      <span aria-hidden="true" className={variante === "barra" ? "text-xs font-semibold tabular-nums" : "text-[10px] font-black uppercase tracking-tighter tabular-nums"}>
        {activo ? `${segundos} s` : "Comer"}
      </span>
    </button>
  );
}

// Reloj de la empresa (kiosco): tarjeta-interruptor visible en la columna de controles. Apagada, blanca; prendida, ámbar,
// con la cuenta regresiva y una barra que se vacía en los 30 s.
export function TarjetaVoyAComer({ activo, segundos, total = 30, onCambiar, disabled = false, compacto = false }) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={onCambiar} disabled={disabled} data-voy-a-comer={activo ? "si" : "no"}
      aria-label="Voy a comer"
      title={activo ? "Tu siguiente checada se registra como salida a comer. Toca para quitarlo." : "Prende esto antes de checar si sales a comer"}
      className={`relative flex w-full shrink-0 items-center gap-3 overflow-hidden rounded-2xl border text-left shadow-sm transition-colors active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${compacto ? "min-h-14 px-3 py-2" : "min-h-16 px-4 py-3"} ${
        activo ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-xl ${compacto ? "size-10" : "size-11"} ${activo ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-600"}`}>
        <Utensils className="size-5" />
      </span>
      <span aria-hidden="true" className="min-w-0 flex-1">
        <span className={`block font-semibold ${compacto ? "text-sm" : "text-base"} ${activo ? "text-amber-900" : "text-slate-900"}`}>Voy a comer</span>
        <span className={`block truncate text-xs ${activo ? "font-medium text-amber-800" : "text-slate-500"}`}>
          {activo ? "Ahora checa tu salida" : "Actívalo antes de checar"}
        </span>
      </span>
      {activo && <span aria-hidden="true" className="shrink-0 text-xl font-bold tabular-nums text-amber-700">{segundos} s</span>}
      <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${activo ? "bg-amber-500" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${activo ? "left-0.5 translate-x-5" : "left-0.5"}`} />
      </span>
      {activo && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-amber-100">
          <span className="block h-full bg-amber-500 transition-[width] duration-300 ease-linear" style={{ width: `${Math.min(100, (segundos / total) * 100)}%` }} />
        </span>
      )}
    </button>
  );
}

// Aviso sobre la cámara mientras está prendido (no ocupa lugar en la pantalla).
// posicion: en el kiosco, debajo de los botones de la cámara en pantallas chicas. enLinea: sin su propio contenedor
// (el kiosco lo pone en la fila de avisos de la cámara). corto: siempre «Salida a comer».
export function AvisoVoyAComer({ activo, segundos, posicion = "top-3", enLinea = false, corto = false }) {
  const chip = activo && (
    <p className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold shadow-lg ${corto ? "bg-amber-400 text-amber-950" : "bg-amber-500 text-white"}`} data-aviso-voy-a-comer>
      <Utensils className="size-4 shrink-0" aria-hidden="true" />
      {corto ? <span>Salida a comer</span> : <>
        <span className="sm:hidden">Salida a comer</span>
        <span className="hidden sm:inline">Siguiente checada: salida a comer</span>
      </>}
      <span aria-hidden="true" className="tabular-nums">· {segundos} s</span>
    </p>
  );
  if (enLinea) return <div aria-live="polite" className="contents">{chip}</div>;
  return (
    <div aria-live="polite" className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-3 ${posicion}`}>
      {chip}
    </div>
  );
}
