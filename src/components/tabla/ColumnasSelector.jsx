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
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ordenarRegistroColumnas } from "@/lib/columnasTabla.mjs";
import { Columns3, ChevronDown, GripVertical } from "lucide-react";

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

function ColumnaOrdenable({ columna, checked, toggle, minVisible }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: columna.key, disabled: !checked });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, position: "relative", zIndex: isDragging ? 1 : undefined }}
      className={`flex items-center gap-1 rounded-lg bg-white ${isDragging ? "shadow-md ring-2 ring-blue-200" : "hover:bg-blue-50/60"}`}>
      <button type="button" disabled={!checked} {...attributes} {...listeners} aria-label={`Mover columna ${columna.label}`}
        className="ml-1 touch-none rounded p-1 text-gray-400 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 enabled:cursor-grab enabled:active:cursor-grabbing disabled:opacity-25">
        <GripVertical className="h-4 w-4" />
      </button>
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2 pr-2 text-[12.5px] font-medium text-gray-700">
        <Checkbox checked={checked} disabled={checked && minVisible} onCheckedChange={value => toggle(columna.key, Boolean(value))} />
        <span className="truncate">{columna.label}</span>
      </label>
    </div>
  );
}

export default function ColumnasSelector({
  columnas,
  visibles,
  onChange,
  storageKey = LS_COLUMNAS,
  ordenable = false,
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const registroOrdenado = ordenarRegistroColumnas(columnas, visibles);
  const guardar = next => {
    onChange(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* sin almacenamiento disponible */ }
  };
  const reordenar = ({ active, over }) => {
    if (!over || active.id === over.id || !visibles.includes(active.id) || !visibles.includes(over.id)) return;
    guardar(arrayMove(visibles, visibles.indexOf(active.id), visibles.indexOf(over.id)));
  };
  const toggle = (key, checked) => {
    let next;
    if (checked) {
      // En empleados se conserva el orden elegido; los demás módulos mantienen el del catálogo.
      next = ordenable ? [...visibles, key] : columnas
        .map((c) => c.key)
        .filter((k) => visibles.includes(k) || k === key);
    } else {
      if (visibles.length <= 2) return; // mínimo 2 columnas visibles
      next = visibles.filter((k) => k !== key);
    }
    guardar(next);
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
          <span className="ml-1.5 rounded-full bg-gradient-to-br from-brand to-brand-accent px-1.5 text-[10px] font-extrabold text-white">
            {visibles.length}
          </span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 rounded-2xl p-0" align="end">
        {ordenable && <p className="border-b border-gray-100 px-3 py-2.5 text-xs leading-relaxed text-gray-500">Arrastra las columnas visibles para ordenarlas. También puedes usar espacio y las flechas del teclado.</p>}
        <div className="max-h-72 overflow-auto p-1.5">
          {ordenable ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reordenar}>
            <SortableContext items={registroOrdenado.map(c => c.key)} strategy={verticalListSortingStrategy}>
              {registroOrdenado.map(c => <ColumnaOrdenable key={c.key} columna={c} checked={visibles.includes(c.key)} toggle={toggle} minVisible={visibles.length <= 2} />)}
            </SortableContext>
          </DndContext> : columnas.map((c) => (
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
          <span className="bg-gradient-to-br from-brand to-brand-accent bg-clip-text font-bold text-transparent">
            Se guarda automáticamente
          </span>{" "}
          — tu selección se recuerda la próxima vez que entres.
        </div>
      </PopoverContent>
    </Popover>
  );
}
