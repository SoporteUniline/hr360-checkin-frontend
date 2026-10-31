"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrdenCamposEditor({ campos, disabled, onChange }) {
  const index = campos.findIndex(c => c.actual);
  if (campos.length < 2 || index < 0) return null;

  function move(offset) {
    const next = [...campos];
    const [current] = next.splice(index, 1);
    next.splice(index + offset, 0, current);
    onChange(next[index + offset + 1]?.id ?? null);
  }

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-medium text-gray-700">Así aparecerán en el formulario</legend>
      <p className="text-xs text-gray-500">Estos campos comparten la misma posición. Sube o baja el campo que estás editando.</p>
      <ul className="space-y-2" aria-label="Orden de los campos en esta posición">
        {campos.map(c => (
          <li key={c.id} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${c.actual ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"}`}>
            <span className="min-w-0 break-words text-sm text-gray-700">{c.nombre.trim() || "Nuevo campo"}{c.actual && <span className="ml-2 text-xs text-blue-600">Este campo</span>}</span>
            {c.actual && <div className="flex shrink-0 gap-1">
              <Button type="button" variant="ghost" size="icon" disabled={disabled || index === 0} aria-label="Subir este campo" title="Subir" onClick={() => move(-1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" disabled={disabled || index === campos.length - 1} aria-label="Bajar este campo" title="Bajar" onClick={() => move(1)}><ArrowDown className="h-4 w-4" /></Button>
            </div>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500" role="status">{index === 0 ? "Este campo aparecerá primero." : `Este campo aparecerá después de ${campos[index - 1].nombre}.`}</p>
    </fieldset>
  );
}
