"use client";

import { useRef, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function OpcionOrdenable({ row, index, disabled, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, position: "relative", zIndex: isDragging ? 1 : undefined }}
      className={`flex items-center gap-2 rounded-lg bg-white ${isDragging ? "ring-2 ring-blue-200 shadow-lg" : ""}`}>
      <button type="button" disabled={disabled} {...attributes} {...listeners} aria-label={`Mover opción ${index + 1}`}
        className="touch-none shrink-0 cursor-grab rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 active:cursor-grabbing disabled:cursor-default">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-4 shrink-0 text-center text-xs tabular-nums text-gray-400">{index + 1}</span>
      <Input aria-label={`Opción ${index + 1}`} disabled={disabled} maxLength={100} value={row.value} placeholder="Escribe una opción"
        className="h-9 rounded-lg border-gray-200 shadow-none" onChange={e => onChange(e.target.value)} />
      <Button type="button" disabled={disabled} variant="ghost" size="icon" aria-label={`Eliminar opción ${index + 1}`}
        className="shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-500" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

export default function OpcionesCampoEditor({ opciones, onChange, disabled }) {
  const [rows, setRows] = useState(() => opciones.map((value, index) => ({ id: `opcion-${index}`, value })));
  const nextId = useRef(opciones.length);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function update(next) { setRows(next); onChange(next.map(row => row.value)); }
  function reorder({ active, over }) {
    if (!over || active.id === over.id) return;
    const from = rows.findIndex(row => row.id === active.id);
    const to = rows.findIndex(row => row.id === over.id);
    if (from >= 0 && to >= 0) update(arrayMove(rows, from, to));
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Arrastra desde el icono para cambiar el orden. También puedes usar espacio y las flechas del teclado.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
        <SortableContext items={rows.map(row => row.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">{rows.map((row, index) => <OpcionOrdenable key={row.id} row={row} index={index} disabled={disabled}
            onChange={value => update(rows.map(item => item.id === row.id ? { ...item, value } : item))}
            onRemove={() => update(rows.filter(item => item.id !== row.id))} />)}</div>
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" size="sm" className="gap-1.5 border-dashed text-blue-600" disabled={disabled || rows.length >= 100}
        onClick={() => update([...rows, { id: `opcion-${nextId.current++}`, value: "" }])}><Plus className="h-3.5 w-3.5" />Agregar opción</Button>
    </div>
  );
}
