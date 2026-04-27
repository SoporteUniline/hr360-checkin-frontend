"use client";

import { useState, useMemo } from "react";
import { Search, Plus, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";

const AVATAR_COLORS = [
  "#F97316",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
];

function getAvatarColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(nombre = "", apellido = "") {
  return `${nombre[0] || ""}${apellido[0] || ""}`.toUpperCase();
}

function getNombreCompleto(emp) {
  return [emp.nombre, emp.apellido_paterno, emp.apellido_materno]
    .filter(Boolean)
    .join(" ");
}

const TABS = [
  { key: "all", label: "Todos" },
  { key: "Activo", label: "Activos" },
  { key: "Inactivo", label: "Inactivos" },
];

function EmpleadoCard({ emp, onClick }) {
  const nombreCompleto = getNombreCompleto(emp);
  const avatarColor = getAvatarColor(nombreCompleto);
  const initials = getInitials(emp.nombre, emp.apellido_paterno);
  const esActivo = emp.estado === "Activo";
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
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: avatarColor }}
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
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            esActivo
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500",
          )}
        >
          {emp.estado}
        </span>
        {emp.nip && (
          <span className="text-[10px] text-gray-400">NIP: {emp.nip}</span>
        )}
      </div>
    </button>
  );
}

export default function MobileEmpleadosView({
  empleados = [],
  abrirFormulario,
  isLoading,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [localSearch, setLocalSearch] = useState("");

  const counts = useMemo(
    () => ({
      all: empleados.length,
      Activo: empleados.filter((e) => e.estado === "Activo").length,
      Inactivo: empleados.filter((e) => e.estado === "Inactivo").length,
    }),
    [empleados],
  );

  const filtered = useMemo(() => {
    let rows = empleados;

    if (activeTab !== "all") {
      rows = rows.filter((e) => e.estado === activeTab);
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
  }, [empleados, activeTab, localSearch]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header oscuro */}
      <div className="bg-[#1E293B] text-white px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-white hover:bg-white/10 -ml-1" />
            <h1 className="text-lg font-bold">Empleados</h1>
          </div>
          <button
            onClick={() => abrirFormulario(null, false, false)}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Nombre, puesto, departamento..."
            className="w-full bg-white/10 text-white placeholder-white/50 text-sm pl-9 pr-9 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-white/50"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
            <EmpleadoCard
              key={emp.id_empleado}
              emp={emp}
              onClick={(e) => abrirFormulario(e, false, true)}
            />
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
    </div>
  );
}
