"use client";

// Sistema de filtros homologado Adamia (diseño aprobado en Reporte de horas):
// - FiltrosGrid: rejilla de columnas idénticas alineadas por la base.
// - CampoFiltro: etiqueta pequeña arriba + control abajo (alto 38px, radio 6px).
// - SelectorBoton: disparador estilo select uniforme para popovers/modales.
//
// Regla de oro: TODOS los controles de una barra de filtros miden lo mismo.

import { ChevronDown } from "lucide-react";

export function FiltrosGrid({ columnas = 6, children, className = "" }) {
  const cols =
    {
      2: "sm:grid-cols-2",
      3: "sm:grid-cols-2 lg:grid-cols-3",
      4: "sm:grid-cols-2 lg:grid-cols-4",
      5: "sm:grid-cols-3 lg:grid-cols-5",
      6: "sm:grid-cols-3 lg:grid-cols-6",
    }[columnas] || "sm:grid-cols-3 lg:grid-cols-6";
  return (
    <div className={`grid grid-cols-2 ${cols} items-end gap-2.5 ${className}`}>
      {children}
    </div>
  );
}

export function CampoFiltro({ etiqueta, children }) {
  return (
    <div className="min-w-0">
      {etiqueta ? (
        <label className="mb-1.5 block text-[11px] font-semibold text-gray-500">
          {etiqueta}
        </label>
      ) : null}
      {children}
    </div>
  );
}

export function SelectorBoton({
  valor,
  placeholder = "Seleccionar...",
  activo = false,
  onClick,
  disabled = false,
  ...props
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[38px] w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-[13px] font-medium text-gray-900 transition-colors hover:border-blue-200 focus-visible:border-blue-300 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-55 ${
        activo ? "border-blue-200 [&>span]:text-[#1d4ed8] [&>span]:font-semibold" : "border-gray-200"
      }`}
      {...props}
    >
      <span className="truncate">{valor || placeholder}</span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
    </button>
  );
}
