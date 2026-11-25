"use client";

// «Voy a comer» (26/11/2026): interruptor discreto junto a los métodos de checar. Prendido, la siguiente checada se
// registra como salida a comer; se apaga solo al usarse o a los 30 s. Solo presentación: el estado vive en RelojChecador
// y la regla en el servidor (src/lib/reloj/voyAComer.mjs).
import { Utensils } from "lucide-react";

// variante: "kiosco" (cuadro como el de QR, junto al código), "normal" (reloj del empleado en escritorio) o "barra"
// (barra de abajo del reloj del empleado en el celular).
export function BotonVoyAComer({ activo, segundos, onCambiar, variante = "normal", disabled = false }) {
  const forma = {
    kiosco: "h-full aspect-square flex-col gap-0.5 rounded-2xl px-1",
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

// Aviso sobre la cámara mientras está prendido (no ocupa lugar en la pantalla).
// posicion: en el kiosco, debajo de los botones de la cámara en pantallas chicas.
export function AvisoVoyAComer({ activo, segundos, posicion = "top-3" }) {
  return (
    <div aria-live="polite" className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-3 ${posicion}`}>
      {activo && (
        <p className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white shadow-lg" data-aviso-voy-a-comer>
          <Utensils className="size-4 shrink-0" aria-hidden="true" />
          <span className="sm:hidden">Salida a comer</span>
          <span className="hidden sm:inline">Siguiente checada: salida a comer</span>
          <span aria-hidden="true" className="tabular-nums">· {segundos} s</span>
        </p>
      )}
    </div>
  );
}
