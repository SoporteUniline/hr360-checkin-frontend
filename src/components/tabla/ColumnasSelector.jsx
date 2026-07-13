"use client";

// Selector de columnas visibles con persistencia (localStorage).
// Componente compartido: cada página pasa su registro de columnas y su
// storageKey propio (p. ej. "asistencias-columnas-visibles").

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Columns3, ChevronDown } from "lucide-react";

export const LS_COLUMNAS = "asistencias-columnas-visibles";

export function cargarColumnasGuardadas(columnas, storageKey = LS_COLUMNAS) {
  try {
    const s = JSON.parse(window.localStorage.getItem(storageKey));
    if (Array.isArray(s) && s.length >= 2) {
      const validas = columnas.map((c) => c.key);
      const filtradas = s.filter((k) => validas.includes(k));
      if (filtradas.length >= 2) return filtradas;
    }
  } catch {
    // sin preferencia guardada
  }
  return columnas.filter((c) => !c.extra).map((c) => c.key);
}

export default function ColumnasSelector({
  columnas,
  visibles,
  onChange,
  storageKey = LS_COLUMNAS,
}) {
  const toggle = (key, checked) => {
    let next;
    if (checked) {
      // conservar el orden canónico del registro de columnas
      next = columnas
        .map((c) => c.key)
        .filter((k) => visibles.includes(k) || k === key);
    } else {
      if (visibles.length <= 2) return; // mínimo 2 columnas visibles
      next = visibles.filter((k) => k !== key);
    }
    onChange(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // sin persistencia si localStorage no está disponible
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="rounded-xl border-gray-200 font-semibold text-gray-700"
        >
          <Columns3 className="mr-1.5 h-4 w-4" />
          Columnas
          <span className="ml-1.5 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-1.5 text-[10px] font-extrabold text-white">
            {visibles.length}
          </span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 rounded-2xl p-0" align="end">
        <div className="max-h-72 overflow-auto p-1.5">
          {columnas.map((c) => (
            <label
              key={c.key}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-gray-700 hover:bg-blue-50/60"
            >
              <Checkbox
                checked={visibles.includes(c.key)}
                onCheckedChange={(v) => toggle(c.key, Boolean(v))}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
        <div className="border-t border-gray-100 bg-[#fafbfe] px-3.5 py-2.5 text-[10.5px] font-medium leading-snug text-gray-400">
          💾{" "}
          <span className="bg-gradient-to-br from-[#2563eb] to-[#7c3aed] bg-clip-text font-bold text-transparent">
            Se guarda automáticamente
          </span>{" "}
          — tu selección se recuerda la próxima vez que entres.
        </div>
      </PopoverContent>
    </Popover>
  );
}
