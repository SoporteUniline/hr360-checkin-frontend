"use client";
import { coincideCampos } from "@/lib/camposPersonalizados.mjs";

import { ListFilter } from "lucide-react";
import MobileEmpleadosFiltersDrawer from "./MobileEmpleadosFiltersDrawer";
import { useState, useMemo } from "react";
import { Search, Plus, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { EstadoBadge } from "@/lib/estados";


function getInitials(nombre = "", apellido = "") {
  return `${nombre[0] || ""}${apellido[0] || ""}`.toUpperCase();
}

function getNombreCompleto(emp) {
  return [emp.nombre, emp.apellido_paterno, emp.apellido_materno]
    .filter(Boolean)
    .join(" ");
}

const TABS = [
  { key: "Activo", label: "Activos" },
  { key: "Inactivo", label: "Inactivos" },
  { key: "all", label: "Todos" },
];

function EmpleadoCard({ emp, onClick }) {
  const nombreCompleto = getNombreCompleto(emp);
  const initials = getInitials(emp.nombre, emp.apellido_paterno);
  const subtitulo = [emp.puesto, emp.departamento].filter(Boolean).join(" · ");

  const getFotoPerfilUrl = (foto) => {
    if (!foto) return null;

    if (foto.startsWith("http://") || foto.startsWith("https://")) {
      return foto;
    }

    return null; // para que muestre iniciales si viene ruta local vieja
  };

  const fotoUrl = getFotoPerfilUrl(emp.foto_perfil);
  return (
    <button
      onClick={() => onClick(emp)}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 text-left transition-colors"
    >
      {fotoUrl ? (
        <img
          src={fotoUrl}
          alt={nombreCompleto}
          className="w-10 h-10 rounded-full object-cover shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-blue-50 text-blue-700 shrink-0"
        >
          {initials}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate leading-tight">
          {nombreCompleto}
        </p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {subtitulo || "Sin puesto asignado"}
        </p>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        <EstadoBadge estado={emp.estado} />
        {emp.nip && (
          <span className="text-[10px] text-gray-400">NIP: {emp.nip}</span>
        )}
      </div>
    </button>
  );
}

export default function MobileEmpleadosView({
  camposFiltros = {},
  filtrosCamposUI,
  limpiarCampos,
  cantidadCamposFiltros = 0,
  empleados = [],
  abrirFormulario,
  isLoading,
}) {
  const [activeTab, setActiveTab] = useState("Activo");
  const [localSearch, setLocalSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState([]);
  const [unidadNegocioSeleccionada, setUnidadNegocioSeleccionada] = useState(
    [],
  );
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState([]);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState([]);

  const uniqueOptions = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const puestoOptions = useMemo(
    () => uniqueOptions(empleados.map((emp) => emp.puesto)),
    [empleados],
  );

  const unidadNegocioOptions = useMemo(
    () =>
      uniqueOptions(empleados.map((emp) => emp.unidad_negocio || emp.sucursal)),
    [empleados],
  );

  const departamentoOptions = useMemo(
    () => uniqueOptions(empleados.map((emp) => emp.departamento)),
    [empleados],
  );

  const estadoOptions = useMemo(
    () => uniqueOptions(empleados.map((emp) => emp.estado)),
    [empleados],
  );

  const activeFiltersCount =
    cantidadCamposFiltros +
    puestoSeleccionado.length +
    unidadNegocioSeleccionada.length +
    departamentoSeleccionado.length +
    estadoSeleccionado.length;

  const baseFiltered = useMemo(() => {
    let rows = empleados.filter(employee => coincideCampos(employee, camposFiltros));

    if (puestoSeleccionado.length > 0) {
      rows = rows.filter((e) => puestoSeleccionado.includes(e.puesto));
    }

    if (unidadNegocioSeleccionada.length > 0) {
      rows = rows.filter((e) =>
        unidadNegocioSeleccionada.includes(e.unidad_negocio || e.sucursal),
      );
    }

    if (departamentoSeleccionado.length > 0) {
      rows = rows.filter((e) =>
        departamentoSeleccionado.includes(e.departamento),
      );
    }

    if (estadoSeleccionado.length > 0) {
      rows = rows.filter((e) => estadoSeleccionado.includes(e.estado));
    }

    const q = localSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((e) => {
        const nombre = getNombreCompleto(e).toLowerCase();
        const puesto = (e.puesto || "").toLowerCase();
        const depto = (e.departamento || "").toLowerCase();
        const unidad = (e.unidad_negocio || e.sucursal || "").toLowerCase();

        return (
          nombre.includes(q) ||
          puesto.includes(q) ||
          depto.includes(q) ||
          unidad.includes(q)
        );
      });
    }

    return rows;
  }, [
    empleados,
    camposFiltros,
    localSearch,
    puestoSeleccionado,
    unidadNegocioSeleccionada,
    departamentoSeleccionado,
    estadoSeleccionado,
  ]);

  const counts = useMemo(
    () => ({
      all: baseFiltered.length,
      Activo: baseFiltered.filter((e) => e.estado === "Activo").length,
      Inactivo: baseFiltered.filter((e) => e.estado === "Inactivo").length,
    }),
    [baseFiltered],
  );

  const filtered = useMemo(() => {
    if (activeTab === "all") return baseFiltered;
    return baseFiltered.filter((e) => e.estado === activeTab);
  }, [baseFiltered, activeTab]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Encabezado blanco con acentos azul ADAMIA, como la app del empleado (21/11/2026; antes azul pizarra oscuro).
          Sin botón de menú propio: el encabezado general del panel ya lo tiene. */}
      <div className="bg-white text-[#080d36] px-4 pt-3 pb-3 shrink-0 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold tracking-tight">Empleados</h1>
          <button
            onClick={() => abrirFormulario(null)}
            className="flex min-h-10 items-center gap-1.5 bg-brand hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-3.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar por nombre o puesto"
              className="w-full min-h-11 bg-slate-50 text-[#080d36] placeholder-slate-400 text-base pl-9 pr-9 rounded-xl border border-slate-200 focus:outline-none focus:border-brand focus:bg-white"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                aria-label="Borrar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(true)}
            aria-label="Filtros"
            className="relative grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-brand shrink-0 active:bg-blue-50"
          >
            <ListFilter className="w-4 h-4" />

            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-200 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-500",
              )}
            >
              {counts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>
      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Cargando empleados...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
            <Users className="w-8 h-8 opacity-40" />
            <p className="text-sm">
              {localSearch
                ? "Sin resultados para la búsqueda"
                : "No hay empleados"}
            </p>
          </div>
        ) : (
          filtered.map((emp) => (
            <EmpleadoCard key={emp.id_empleado} emp={emp} onClick={(e) => abrirFormulario(e)} />
          ))
        )}
      </div>
      {/* Barra inferior */}
      <div className="bg-white border-t border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0">
        <span className="text-xs text-gray-500">
          {filtered.length} empleado{filtered.length !== 1 ? "s" : ""}
        </span>
        {localSearch && (
          <button
            onClick={() => setLocalSearch("")}
            className="text-xs text-blue-600 font-medium"
          >
            Limpiar búsqueda
          </button>
        )}
      </div>
      <MobileEmpleadosFiltersDrawer
        filtrosCamposUI={filtrosCamposUI}
        limpiarCampos={limpiarCampos}
        cantidadCamposFiltros={cantidadCamposFiltros}
        open={showFilters}
        onOpenChange={setShowFilters}
        puestoOptions={puestoOptions}
        unidadNegocioOptions={unidadNegocioOptions}
        departamentoOptions={departamentoOptions}
        estadoOptions={estadoOptions}
        puestoSeleccionado={puestoSeleccionado}
        setPuestoSeleccionado={setPuestoSeleccionado}
        unidadNegocioSeleccionada={unidadNegocioSeleccionada}
        setUnidadNegocioSeleccionada={setUnidadNegocioSeleccionada}
        departamentoSeleccionado={departamentoSeleccionado}
        setDepartamentoSeleccionado={setDepartamentoSeleccionado}
        estadoSeleccionado={estadoSeleccionado}
        setEstadoSeleccionado={setEstadoSeleccionado}
      />
    </div>
  );
}
