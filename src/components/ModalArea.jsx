"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Save, X } from "lucide-react";
import AreaCheckMap from "@/components/AreaCheckMap";
import { Combobox } from "./Combobox";

export default function ModalArea({
  isOpen,
  onClose,
  onSave,
  initialData,
  loading,
  empresas = [],
  id_empresa_defecto,
}) {
  const [formData, setFormData] = useState({
    nombre_area: "",
    latitud: null,
    longitud: null,
  });

  // Unificamos la lógica de inicialización
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Si estamos editando, cargamos los datos existentes
        setFormData(initialData);
      } else {
        // Si es nueva, reseteamos pero PRESERVAMOS la empresa por defecto
        setFormData({
          nombre_area: "",
          latitud: null,
          longitud: null,
          // Si empresaActiva es "all" ponemos vacío, si no, ponemos el ID seleccionado
          id_empresa: id_empresa_defecto === "all" ? "" : id_empresa_defecto,
        });
      }
    }
  }, [isOpen, initialData, id_empresa_defecto]);

  if (!isOpen) return null;
  const isEdit = Boolean(initialData?.id_area);

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] border border-gray-100 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 bg-linear-to-r from-indigo-600 to-blue-600 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                <MapPin className="size-5 text-white" />
              </span>
              <div>
                <h2 className="text-base font-bold">
                  {isEdit ? "Editar área" : "Nueva área"}
                </h2>
                <p className="text-sm text-white/80">
                  Define nombre, radio y ubicación en el mapa.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {!formData.id_area && id_empresa_defecto === "all" && (
            <div>
              <Label className="mb-2">Seleccionar Empresa</Label>
              <Combobox
                options={empresas.map((e) => ({
                  value: e.id_empresa,
                  label: e.nombre,
                }))}
                value={formData.id_empresa}
                onChange={(val) =>
                  setFormData({ ...formData, id_empresa: val })
                }
              />
            </div>
          )}

          <div>
            <Label className="text-sm font-medium text-gray-700">
              Nombre del área
            </Label>
            <Input
              value={formData.nombre_area}
              onChange={(e) =>
                setFormData({ ...formData, nombre_area: e.target.value })
              }
              className="bg-white"
            />
          </div>

          <AreaCheckMap area={formData} onChange={setFormData} />
        </div>

        <div className="bg-gray-50 border-t border-gray-100 p-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onSave(formData)}
            disabled={loading}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? "Actualizar" : "Crear"} área
          </Button>
        </div>
      </div>
    </div>
  );
}
