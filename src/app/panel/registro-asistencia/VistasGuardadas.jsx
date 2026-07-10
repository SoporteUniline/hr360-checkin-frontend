"use client";

// Vistas guardadas: combinaciones de filtros + columnas + rango con nombre,
// mostradas como pestañas reutilizables y persistidas en localStorage.

import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";

const LS_VISTAS = "asistencias-vistas";

export default function VistasGuardadas({
  hayFiltros,
  obtenerEstado,
  onAplicar,
  onLimpiar,
}) {
  const [vistas, setVistas] = useState([]);
  const [vistaActiva, setVistaActiva] = useState(null);

  useEffect(() => {
    try {
      const v = JSON.parse(window.localStorage.getItem(LS_VISTAS));
      if (Array.isArray(v)) setVistas(v);
    } catch {
      // sin vistas guardadas
    }
  }, []);

  const persistir = (next) => {
    setVistas(next);
    try {
      window.localStorage.setItem(LS_VISTAS, JSON.stringify(next));
    } catch {
      // localStorage no disponible
    }
  };

  const guardarActual = () => {
    const nombre = window.prompt(
      "Nombre de la vista (ej. Ausencias Planta Zapopan):",
    );
    if (!nombre || !nombre.trim()) return;
    const limpio = nombre.trim().slice(0, 40);
    const next = [
      ...vistas.filter((v) => v.nombre !== limpio),
      { nombre: limpio, estado: obtenerEstado() },
    ];
    persistir(next);
    setVistaActiva(limpio);
  };

  const eliminar = (nombre) => {
    persistir(vistas.filter((v) => v.nombre !== nombre));
    if (vistaActiva === nombre) setVistaActiva(null);
  };

  if (!vistas.length && !hayFiltros) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          setVistaActiva(null);
          onLimpiar();
        }}
        className={`rounded-xl border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
          vistaActiva === null && !hayFiltros
            ? "border-[#2563eb] bg-gradient-to-br from-blue-50 to-violet-50 text-[#1d4ed8] shadow-[inset_0_0_0_1px_#2563eb]"
            : "border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:text-gray-900"
        }`}
      >
        Todas
      </button>

      {vistas.map((v) => (
        <span
          key={v.nombre}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors cursor-pointer ${
            vistaActiva === v.nombre
              ? "border-[#2563eb] bg-gradient-to-br from-blue-50 to-violet-50 text-[#1d4ed8] shadow-[inset_0_0_0_1px_#2563eb]"
              : "border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:text-gray-900"
          }`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setVistaActiva(v.nombre);
            onAplicar(v.estado);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setVistaActiva(v.nombre);
              onAplicar(v.estado);
            }
          }}
        >
          {v.nombre}
          <button
            type="button"
            aria-label={`Eliminar vista ${v.nombre}`}
            onClick={(e) => {
              e.stopPropagation();
              eliminar(v.nombre);
            }}
            className="text-blue-300 hover:text-red-500"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {hayFiltros && (
        <button
          type="button"
          onClick={guardarActual}
          className="inline-flex items-center gap-1 rounded-xl border border-dashed border-violet-200 bg-[#fdfcff] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#7c3aed] transition-colors hover:border-[#7c3aed] hover:bg-violet-50"
        >
          <Plus className="h-3.5 w-3.5" /> Guardar vista actual
        </button>
      )}
    </div>
  );
}
