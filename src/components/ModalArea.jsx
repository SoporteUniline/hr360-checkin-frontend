"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, X } from "lucide-react";
import AreaCheckMap from "@/components/AreaCheckMap";

export default function ModalArea({
  isOpen,
  onClose,
  onSave,
  initialData,
  loading,
}) {
  const [formData, setFormData] = useState({
    nombre_area: "",
    latitud: null,
    longitud: null,
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({ nombre_area: "", latitud: null, longitud: null });
    }
  }, [isOpen]);

  // 🧠 Esto es lo importante:
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ nombre_area: "", latitud: null, longitud: null });
    }
  }, [initialData]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {initialData ? "Editar Área" : "Nueva Área"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Nombre del Área</Label>
            <Input
              value={formData.nombre_area}
              onChange={(e) =>
                setFormData({ ...formData, nombre_area: e.target.value })
              }
            />
          </div>

          <AreaCheckMap area={formData} onChange={setFormData} />

          <div className="flex justify-end gap-2 border-t pt-4">
            {/* Botón secundario según `Colores.txt`:
                - Background: #ffffff
                - Border: #d1d5db
                - Text: #374151
                - Hover: #f9fafb
                Relación: mismo patrón usado en `src/app/panel/reglas-aviso/page.jsx` y catálogos. */}
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
            >
              <X className="h-4 w-4 mr-2" /> Cancelar
            </Button>
            {/* Botón primario según `Colores.txt`:
                - Background: #37495E
                - Hover: #2c3a4a
                - Shadow: 0 4px 12px rgba(55, 73, 94, 0.3)
                Relación: coincide con "Nuevo" en catálogos y botones principales del panel. */}
            <Button
              onClick={() => onSave(formData)}
              disabled={loading}
              className="bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]"
            >
              {loading ? (
                <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {initialData ? "Actualizar" : "Crear"} Área
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
