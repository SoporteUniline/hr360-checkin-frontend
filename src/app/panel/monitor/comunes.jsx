"use client";

// Piezas que comparten las tres vistas del Monitor (Tablero, Línea del día y Lista): nombre, área, avatar, chips y la
// elección de vista recordada por usuario. Los textos salen de src/lib/asistencia/tablero.mjs y vistasMonitor.mjs.
import { useCallback, useEffect, useState } from "react";
import { claveVistaMonitor, VISTA_POR_DEFECTO, vistaValida, VISTAS_MONITOR } from "@/lib/asistencia/vistasMonitor.mjs";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { cn } from "@/lib/utils";

export const nombreDe = (r) => [r.nombre, r.apellido_paterno].filter(Boolean).join(" ");
export const iniciales = (r) => `${r.nombre?.[0] ?? ""}${r.apellido_paterno?.[0] ?? ""}`.toUpperCase() || "?";
export const areaDe = (r) => r.departamento || r.puesto || "";

// Tonos de tablero.mjs → clases de Tailwind.
export const CHIP = {
  azul: "bg-blue-100 text-blue-800",
  violeta: "bg-violet-100 text-violet-800",
  amarillo: "bg-yellow-100 text-yellow-800",
  rojo: "bg-red-100 text-red-800",
  naranja: "bg-orange-100 text-orange-800",
  celeste: "bg-sky-100 text-sky-800",
  gris: "bg-slate-100 text-slate-700",
  ambar: "bg-amber-100 text-amber-800",
};

// Chips de la tarjeta del Tablero más «Debe N» (cuenta de horas), igual en las tres vistas.
export const chipsPersona = (ficha, debe) =>
  debe > 0 ? [...ficha.chips, { texto: `Debe ${formatearMinutos(debe)}`, tono: "ambar" }] : ficha.chips;

export function Avatar({ registro, tono, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold", CHIP[tono], className)}
    >
      {iniciales(registro)}
    </span>
  );
}

export function Chips({ chips, className = "" }) {
  if (!chips.length) return null;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {chips.map((c, i) => (
        <span
          key={i}
          data-chip
          className={cn("inline-flex max-w-full rounded-[10px] px-2 py-0.5 text-[11.5px] font-semibold leading-tight", CHIP[c.tono])}
        >
          {c.texto}
        </span>
      ))}
    </span>
  );
}

export function ChipEstado({ estado, className = "" }) {
  return (
    <span
      data-estado-chip
      className={cn(
        "inline-flex w-fit max-w-full whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold leading-tight",
        CHIP[estado.tono],
        className
      )}
    >
      {estado.texto}
    </span>
  );
}

// Vista elegida, recordada por usuario en este navegador. Se lee después de montar (el servidor no ve localStorage):
// la primera pintura es el Tablero y cambia en cuanto se lee. Sin localStorage (privado, bloqueado) queda el Tablero.
export function useVistaMonitor(idUsuario) {
  const clave = claveVistaMonitor(idUsuario);
  const [vista, setVista] = useState(VISTA_POR_DEFECTO);
  useEffect(() => {
    let guardada = null;
    try {
      guardada = window.localStorage.getItem(clave);
    } catch {
      // sin almacenamiento: queda la vista por defecto
    }
    setVista(vistaValida(guardada));
  }, [clave]);
  const elegir = useCallback(
    (v) => {
      const valida = vistaValida(v);
      setVista(valida);
      try {
        window.localStorage.setItem(clave, valida);
      } catch {
        // sin almacenamiento: la elección dura mientras siga abierta la página
      }
    },
    [clave]
  );
  return [vista, elegir];
}

export function SelectorVista({ vista, onElegir, className = "" }) {
  return (
    <div
      role="group"
      aria-label="Vista del Monitor"
      className={cn("grid grid-cols-3 rounded-[11px] border border-slate-200 bg-white p-0.5 lg:inline-grid", className)}
    >
      {VISTAS_MONITOR.map((v) => (
        <button
          key={v.clave}
          type="button"
          aria-pressed={vista === v.clave}
          data-vista={v.clave}
          onClick={() => onElegir(v.clave)}
          className={cn(
            "min-h-11 whitespace-nowrap rounded-[9px] px-2 sm:px-3 text-[13px] font-semibold transition-colors lg:min-h-8 lg:px-3.5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            vista === v.clave ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          {v.titulo}
        </button>
      ))}
    </div>
  );
}
