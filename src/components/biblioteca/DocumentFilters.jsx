import React from "react";
import { Combobox } from "@/components/Combobox";

export default function DocumentFilters({
  filters,
  setFilters,
  categorias,
  totalDocumentos,
  limpiarFiltros,
}) {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-4 mb-6 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-4 items-end">
        <div>
          <label className="text-sm font-medium">Buscar</label>
          <input
            name="search"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value,
              }))
            }
            className="mt-1 w-full border rounded-lg px-3 py-2"
            placeholder="Título, descripción o archivo"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Categorías</label>

          <Combobox
            multiple
            options={categorias.map((cat) => ({
              label: cat.nombre,
              value: String(cat.id_categoria),
            }))}
            value={filters.categorias}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                categorias: value,
              }))
            }
            placeholder="Filtrar categorías"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Tipo de archivo</label>

          <Combobox
            multiple
            options={[
              { label: "PDF", value: "pdf" },
              { label: "Word", value: "word" },
              { label: "Excel", value: "excel" },
              { label: "Imagen", value: "image" },
            ]}
            value={filters.tipos_archivo}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                tipos_archivo: value,
              }))
            }
            placeholder="Filtrar tipo de archivo"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-4">
        <p className="text-sm text-gray-500">{totalDocumentos} resultado(s)</p>

        <button
          type="button"
          onClick={limpiarFiltros}
          className="w-full sm:w-auto px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 cursor-pointer"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
