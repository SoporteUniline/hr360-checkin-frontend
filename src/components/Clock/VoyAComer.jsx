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

// Reloj de la empresa (kiosco, maqueta aprobada 26/11/2026): tarjeta-interruptor al pie del panel. Apagada, ámbar
// suave; prendida, borde ámbar con «Se apaga en N s» y una barra que se vacía en los 30 s.
export function TarjetaVoyAComer({ activo, segundos, total = 30, onCambiar, disabled = false, compacto = false }) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={onCambiar} disabled={disabled} data-voy-a-comer={activo ? "si" : "no"}
      aria-label="Voy a comer"
      title={activo ? "Tu siguiente checada se registra como salida a comer. Toca para quitarlo." : "Prende esto antes de checar si sales a comer"}
      className={`relative flex w-full shrink-0 items-center gap-3.5 overflow-hidden rounded-2xl text-left transition-colors active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${compacto ? "min-h-14 px-3 py-2" : "min-h-[4.5rem] px-4 py-3"} ${
        activo ? "border-2 border-amber-500 bg-amber-100/70" : "border border-amber-200 bg-amber-50/70 hover:border-amber-300"}`}>
      <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-xl ${compacto ? "size-10" : "size-11"} ${activo ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-600"}`}>
        <Utensils className="size-6" />
      </span>
      <span aria-hidden="true" className="min-w-0 flex-1">
        <span className={`block ${compacto ? "text-base" : "text-[17px]"} ${activo ? "font-extrabold text-amber-800" : "font-bold text-slate-900"}`}>{activo ? "Voy a comer · activo" : "Voy a comer"}</span>
        <span className={`block text-[13px] leading-snug ${activo ? "text-amber-700" : "text-amber-800"}`}>
          {activo ? <>Se apaga en <span className="font-semibold tabular-nums">{segundos} s</span></> : "Tócalo antes de checar tu salida a comer"}
        </span>
      </span>
      <span aria-hidden="true" className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${activo ? "bg-amber-500" : "bg-slate-200"}`}>
        <span className={`absolute top-[3px] size-[22px] rounded-full bg-white shadow transition-transform ${activo ? "left-[3px] translate-x-5" : "left-[3px]"}`} />
      </span>
      {activo && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-amber-200">
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
    <p className={`flex items-center gap-1.5 whitespace-nowrap bg-amber-500 text-white shadow-lg ${corto ? "h-11 rounded-xl px-4 text-[15px] font-extrabold" : "rounded-full px-3 py-1.5 text-sm font-semibold"}`} data-aviso-voy-a-comer>
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
