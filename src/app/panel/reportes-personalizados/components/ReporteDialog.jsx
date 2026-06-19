// ReporteDialog.jsx
// Dialog para crear o editar una plantilla de reporte personalizado.
// Persistencia vía API → tabla reporte_plantillas en el backend.

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/Combobox";
import { ClipboardCheck, ClockArrowUp, ChevronRight, X, GripVertical, Loader2 } from "lucide-react";
import { COLUMNAS_ASISTENCIA, COLUMNAS_RELOJ } from "@/hooks/useReportePersonalizado";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const FUENTES = [
  {
    id: "asistencia",
    label: "Asistencia",
    descripcion: "Registros diarios de presencia, ausencias y horas trabajadas.",
    icon: ClipboardCheck,
  },
  {
    id: "reloj",
    label: "Reloj Checador",
    descripcion: "Movimientos de entrada/salida con correcciones y GPS.",
    icon: ClockArrowUp,
  },
];

// Chips de filtros disponibles por fuente
const CHIPS_FILTROS = {
  asistencia: {
    estadoAsistencia: {
      label: "Estado Asistencia",
      opciones: ["Presente", "Ausente", "Tardanza"],
    },
  },
  reloj: {
    estadoMovimiento: {
      label: "Estado Movimiento",
      opciones: ["Abierto", "Cerrado"],
    },
  },
};

// Tipo de dato para mostrar en el panel de campos disponibles
const TIPO_DATO = {
  fecha: "DATE",
  entrada: "TIME",
  salida: "TIME",
  entrada_corregida: "TIME",
  salida_corregida: "TIME",
  hrs_debia: "TEXT",
  hrs_trabajo: "TEXT",
  duracion: "TEXT",
};

function getTipoDato(key) {
  if (TIPO_DATO[key]) return TIPO_DATO[key];
  if (key.includes("fecha")) return "DATE";
  if (key.includes("lat") || key.includes("lon")) return "GPS";
  return "TEXT";
}

// ─────────────────────────────────────────────────────────────────────────────
// Ítem arrastrable del panel derecho de columnas
// ─────────────────────────────────────────────────────────────────────────────

function SortableColumnaItem({ col, onQuitar }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-blue-50 border border-blue-100 select-none"
    >
      <div className="flex items-center gap-1.5">
        {/* Asa de arrastre */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none text-gray-300 hover:text-gray-500 transition-colors"
          {...attributes}
          {...listeners}
          tabIndex={-1}
        >
          <GripVertical className="h-3.5 w-3.5 flex-shrink-0" />
        </button>
        <span className="text-sm text-gray-800 font-medium">{col.label}</span>
      </div>
      <button
        type="button"
        onClick={() => onQuitar(col.key)}
        className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function ReporteDialog({
  open,
  onClose,
  plantillaEditar,
  onGuardar,
  guardando = false,
  empresas = [],
  empresaDefault = null,
}) {
  const modoEdicion = Boolean(plantillaEditar);

  const [nombre, setNombre] = useState("");
  const [fuente, setFuente] = useState("asistencia");
  const [descripcion, setDescripcion] = useState("");
  const [idEmpresa, setIdEmpresa] = useState("");
  const [columnasSeleccionadas, setColumnasSeleccionadas] = useState([]);
  const [filtrosDefecto, setFiltrosDefecto] = useState({
    estadoAsistencia: [],
    estadoMovimiento: [],
  });
  const [error, setError] = useState("");

  const empresasOptions = useMemo(
    () =>
      empresas.map((e) => ({
        value: String(e.id_empresa),
        label: e.nombre || e.nombre_empresa || `Empresa ${e.id_empresa}`,
      })),
    [empresas],
  );

  useEffect(() => {
    if (open) {
      if (plantillaEditar) {
        setNombre(plantillaEditar.nombre || "");
        setFuente(plantillaEditar.fuente || "asistencia");
        setDescripcion(plantillaEditar.descripcion || "");
        setIdEmpresa(String(plantillaEditar.idEmpresa || ""));
        setColumnasSeleccionadas(plantillaEditar.columnas || []);
        setFiltrosDefecto(
          plantillaEditar.filtrosDefecto || { estadoAsistencia: [], estadoMovimiento: [] },
        );
      } else {
        setNombre("");
        setFuente("asistencia");
        setDescripcion("");
        setIdEmpresa(empresaDefault ? String(empresaDefault) : "");
        setColumnasSeleccionadas(COLUMNAS_ASISTENCIA.filter((c) => c.defaultOn));
        setFiltrosDefecto({ estadoAsistencia: [], estadoMovimiento: [] });
      }
      setError("");
    }
  }, [open, plantillaEditar, empresaDefault]);

  // Al cambiar la fuente de datos, resetear columnas seleccionadas
  const handleCambioFuente = (nuevaFuente) => {
    setFuente(nuevaFuente);
    const cols = nuevaFuente === "reloj" ? COLUMNAS_RELOJ : COLUMNAS_ASISTENCIA;
    setColumnasSeleccionadas(cols.filter((c) => c.defaultOn));
  };

  // Columnas disponibles según la fuente activa
  const columnasDisponibles = useMemo(
    () => (fuente === "reloj" ? COLUMNAS_RELOJ : COLUMNAS_ASISTENCIA),
    [fuente],
  );

  // Agrupadas por grupo para el panel izquierdo
  const gruposColumnas = useMemo(() => {
    const map = {};
    columnasDisponibles.forEach((col) => {
      const g = col.grupo || "General";
      if (!map[g]) map[g] = [];
      map[g].push(col);
    });
    return map;
  }, [columnasDisponibles]);

  const seleccionadasKeys = useMemo(
    () => new Set(columnasSeleccionadas.map((c) => c.key)),
    [columnasSeleccionadas],
  );

  // Toggle de columna en el panel izquierdo — agrega al final para respetar el orden del usuario
  const toggleColumna = (col) => {
    setColumnasSeleccionadas((prev) => {
      if (prev.some((c) => c.key === col.key)) {
        return prev.filter((c) => c.key !== col.key);
      }
      return [...prev, col];
    });
  };

  // Quitar columna desde el panel derecho
  const quitarColumna = (key) => {
    setColumnasSeleccionadas((prev) => prev.filter((c) => c.key !== key));
  };

  // Toggle de chip de filtro por defecto
  const toggleChip = (campo, valor) => {
    setFiltrosDefecto((prev) => {
      const actuales = prev[campo] || [];
      const existe = actuales.includes(valor);
      return {
        ...prev,
        [campo]: existe ? actuales.filter((v) => v !== valor) : [...actuales, valor],
      };
    });
  };

  const handleGuardar = () => {
    if (!nombre.trim()) {
      setError("El nombre del reporte es obligatorio.");
      return;
    }
    if (!modoEdicion && !idEmpresa) {
      setError("Selecciona la empresa para este reporte.");
      return;
    }
    if (columnasSeleccionadas.length === 0) {
      setError("Selecciona al menos una columna.");
      return;
    }
    setError("");

    onGuardar({
      idEmpresa: Number(idEmpresa),
      nombre: nombre.trim(),
      fuente,
      descripcion: descripcion.trim(),
      columnas: columnasSeleccionadas,
      filtrosDefecto,
      agrupacionDefecto: plantillaEditar?.agrupacionDefecto || "ninguna",
    });
  };

  const chipsActivos = CHIPS_FILTROS[fuente] || {};

  // Sensores para drag-and-drop (mouse/touch + teclado)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Reordena columnas cuando termina un arrastre
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnasSeleccionadas((prev) => {
        const oldIndex = prev.findIndex((c) => c.key === active.id);
        const newIndex = prev.findIndex((c) => c.key === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-bold text-gray-900">
            {modoEdicion ? "Editar reporte" : "Nuevo reporte personalizado"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5">
          {/* ── Empresa (solo al crear; en edición es solo lectura) ── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Empresa {!modoEdicion && <span className="text-red-500">*</span>}
            </Label>
            {modoEdicion ? (
              <Input
                value={
                  empresasOptions.find((e) => e.value === idEmpresa)?.label ||
                  plantillaEditar?.empresaNombre ||
                  "—"
                }
                readOnly
                className="bg-gray-50 text-gray-600"
              />
            ) : (
              <Combobox
                options={empresasOptions}
                value={idEmpresa}
                onChange={setIdEmpresa}
                placeholder="Seleccionar empresa..."
                emptyText="No hay empresas disponibles."
              />
            )}
            <p className="text-xs text-gray-400">
              El reporte será visible para todos los usuarios de esta empresa.
            </p>
          </div>

          {/* ── Nombre y Fuente ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Ej. Reporte mensual de asistencia"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={error && !nombre.trim() ? "border-red-400" : ""}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Fuente de datos</Label>
              <Select value={fuente} onValueChange={handleCambioFuente}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar fuente..." />
                </SelectTrigger>
                <SelectContent>
                  {FUENTES.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                {FUENTES.find((f) => f.id === fuente)?.descripcion}
              </p>
            </div>
          </div>

          {/* ── Descripción ── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Descripción <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Textarea
              placeholder="Para qué se usa este reporte..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* ── Selector de columnas: dos paneles ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700">Campos del reporte</Label>
              <span className="text-xs text-gray-400">
                {columnasSeleccionadas.length} columna{columnasSeleccionadas.length !== 1 ? "s" : ""} seleccionada{columnasSeleccionadas.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-gray-200 rounded-xl overflow-hidden">
              {/* Panel izquierdo: Campos disponibles */}
              <div className="bg-gray-50 p-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Campos disponibles
                </p>
                <div className="overflow-y-auto max-h-56 space-y-3">
                  {Object.entries(gruposColumnas).map(([grupo, cols]) => (
                    <div key={grupo}>
                      <p className="text-xs font-semibold text-gray-400 mb-1.5">{grupo}</p>
                      {cols.map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-white transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={seleccionadasKeys.has(col.key)}
                              onCheckedChange={() => toggleColumna(col)}
                            />
                            <span className="text-sm text-gray-700">{col.label}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-200 rounded px-1.5 py-0.5 group-hover:bg-gray-100">
                            {getTipoDato(col.key)}
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel derecho: Columnas seleccionadas */}
              <div className="bg-white p-3 border-l border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Columnas del reporte ({columnasSeleccionadas.length})
                </p>
                {columnasSeleccionadas.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-gray-400 text-sm text-center">
                    <div>
                      <ChevronRight className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      Selecciona campos de la izquierda.
                    </div>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={columnasSeleccionadas.map((c) => c.key)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="overflow-y-auto max-h-56 space-y-1">
                        {columnasSeleccionadas.map((col) => (
                          <SortableColumnaItem
                            key={col.key}
                            col={col}
                            onQuitar={quitarColumna}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>

          {/* ── Filtros por defecto ── */}
          {Object.keys(chipsActivos).length > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-700 block mb-2">
                Filtros por defecto{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <div className="space-y-3">
                {Object.entries(chipsActivos).map(([campo, cfg]) => (
                  <div key={campo}>
                    <p className="text-xs text-gray-500 mb-1.5">{cfg.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {cfg.opciones.map((opcion) => {
                        const activo = (filtrosDefecto[campo] || []).includes(opcion);
                        return (
                          <button
                            key={opcion}
                            type="button"
                            onClick={() => toggleChip(campo, opcion)}
                            className={`
                              text-sm px-3 py-1 rounded-full border font-medium transition-all
                              ${activo
                                ? "bg-[#2563EB] border-[#2563EB] text-white"
                                : "bg-white border-gray-300 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                              }
                            `}
                          >
                            {opcion}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700">
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={guardando}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
          >
            {guardando ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Guardando...
              </>
            ) : modoEdicion ? (
              "Guardar cambios"
            ) : (
              "Crear reporte"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
