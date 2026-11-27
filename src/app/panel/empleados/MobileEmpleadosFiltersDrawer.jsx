"use client";

import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function FilterSection({ title, options, selected, onChange }) {
  return (
    <section className="mt-6">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
        {title}
      </p>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);

          return (
            <button
              key={option}
              onClick={() => {
                onChange(
                  isSelected
                    ? selected.filter((item) => item !== option)
                    : [...selected, option],
                );
              }}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                isSelected
                  ? "bg-brand text-white"
                  : "bg-gray-100 text-gray-700",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function MobileEmpleadosFiltersDrawer({
  filtrosCamposUI,
  limpiarCampos,
  cantidadCamposFiltros = 0,
  open,
  onOpenChange,
  puestoOptions,
  unidadNegocioOptions,
  departamentoOptions,
  estadoOptions,
  puestoSeleccionado,
  setPuestoSeleccionado,
  unidadNegocioSeleccionada,
  setUnidadNegocioSeleccionada,
  departamentoSeleccionado,
  setDepartamentoSeleccionado,
  estadoSeleccionado,
  setEstadoSeleccionado,
}) {
  const activeFiltersCount =
    cantidadCamposFiltros +
    puestoSeleccionado.length +
    unidadNegocioSeleccionada.length +
    departamentoSeleccionado.length +
    estadoSeleccionado.length;

  const clearAll = () => {
    limpiarCampos?.();
    setPuestoSeleccionado([]);
    setUnidadNegocioSeleccionada([]);
    setDepartamentoSeleccionado([]);
    setEstadoSeleccionado([]);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] flex flex-col bg-white rounded-t-3xl">
        <div className="w-10 h-1.5 rounded-full bg-gray-300 mx-auto mt-3 shrink-0" />

        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="flex items-start gap-3">
            <div className="mr-auto">
              <DrawerTitle className="text-xl font-bold text-gray-900">
                Filtros
              </DrawerTitle>
              <DrawerDescription className="text-sm text-gray-500 mt-0.5">
                {activeFiltersCount} filtros activos
              </DrawerDescription>
            </div>

            <button
              onClick={clearAll}
              className="text-sm font-medium text-blue-600"
            >
              Limpiar
            </button>
            <button
              type="button"
              aria-label="Cerrar filtros"
              onClick={() => onOpenChange(false)}
              data-cerrar-hoja
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 active:bg-gray-50"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-10">
          <div className="space-y-3 mt-4">{filtrosCamposUI}</div>
          <FilterSection
            title="Estado"
            options={estadoOptions}
            selected={estadoSeleccionado}
            onChange={setEstadoSeleccionado}
          />

          <FilterSection
            title="Puesto"
            options={puestoOptions}
            selected={puestoSeleccionado}
            onChange={setPuestoSeleccionado}
          />

          <FilterSection
            title="Departamento"
            options={departamentoOptions}
            selected={departamentoSeleccionado}
            onChange={setDepartamentoSeleccionado}
          />

          <FilterSection
            title="Unidad de negocio"
            options={unidadNegocioOptions}
            selected={unidadNegocioSeleccionada}
            onChange={setUnidadNegocioSeleccionada}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
