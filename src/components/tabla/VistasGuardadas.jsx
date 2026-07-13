"use client";

// Vistas guardadas: combinaciones de filtros + columnas + rango con nombre,
// mostradas como pestañas reutilizables y persistidas en localStorage.

import { useEffect, useState } from "react";
import { X, Plus, Bookmark } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const LS_VISTAS = "asistencias-vistas";

export default function VistasGuardadas({
  hayFiltros,
  obtenerEstado,
  onAplicar,
  onLimpiar,
  storageKey = LS_VISTAS,
}) {
  const [vistas, setVistas] = useState([]);
  const [vistaActiva, setVistaActiva] = useState(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [nombreVista, setNombreVista] = useState("");

  useEffect(() => {
    try {
      const v = JSON.parse(window.localStorage.getItem(storageKey));
      if (Array.isArray(v)) setVistas(v);
    } catch {
      // sin vistas guardadas
    }
  }, []);

  const persistir = (next) => {
    setVistas(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // localStorage no disponible
    }
  };

  const confirmarGuardar = () => {
    const limpio = nombreVista.trim().slice(0, 40);
    if (!limpio) return;
    const next = [
      ...vistas.filter((v) => v.nombre !== limpio),
      { nombre: limpio, estado: obtenerEstado() },
    ];
    persistir(next);
    setVistaActiva(limpio);
    setNombreVista("");
    setDialogAbierto(false);
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
          onClick={() => {
            setNombreVista("");
            setDialogAbierto(true);
          }}
          className="inline-flex items-center gap-1 rounded-xl border border-dashed border-violet-200 bg-[#fdfcff] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#7c3aed] transition-colors hover:border-[#7c3aed] hover:bg-violet-50"
        >
          <Plus className="h-3.5 w-3.5" /> Guardar vista actual
        </button>
      )}

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[420px]">
          <DialogHeader className="px-6 pb-4 pt-5">
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold tracking-tight text-gray-900">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-[0_5px_12px_rgba(37,99,235,0.3)]">
                <Bookmark className="h-4 w-4 text-white" />
              </span>
              Guardar vista
            </DialogTitle>
          </DialogHeader>
          <div className="h-[2.5px] bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />
          <div className="px-6 py-5">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Nombre de la vista
            </label>
            <Input
              autoFocus
              value={nombreVista}
              maxLength={40}
              placeholder="Ej. Ausencias Planta Zapopan"
              className="rounded-xl"
              onChange={(e) => setNombreVista(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmarGuardar();
              }}
            />
            <p className="mt-2 text-[11.5px] font-medium leading-snug text-gray-400">
              Se guardan los filtros, el rango de fechas, la agrupación y las
              columnas visibles. La vista queda disponible como pestaña.
            </p>
          </div>
          <DialogFooter className="gap-2 border-t border-gray-100 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setDialogAbierto(false)}
              className="rounded-xl border-gray-200 font-semibold text-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarGuardar}
              disabled={!nombreVista.trim()}
              className="rounded-xl bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.32)] hover:opacity-95"
            >
              Guardar vista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
