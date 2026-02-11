"use client";

/**
 * Página: Registro de Vacaciones
 * - Reutiliza la tabla de Asistencias del panel estándar
 * - Fija el filtro "tipo de registro" a Vacaciones (usando la clave del catálogo)
 * - Omite "filtros rápidos" (presentes/ausentes/etc.) como solicitó el usuario
 *
 * Relacionado con:
 * - Tabla: `app/panel/registro-asistencia/AsistenciaTable.jsx`
 * - Contenedor de datos: `app/panel/registro-asistencia/AsistenciaDataContainer.jsx`
 * - Catálogo de tipos: `hooks/useTiposPermisoData.js`
 * - Menú: `components/Sidebar/nav-main.jsx` (ítem "Registro de vacaciones")
 */

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import AsistenciaDataContainer from "@/app/panel/registro-asistencia/AsistenciaDataContainer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";
import { useCallback } from "react";
import styles from "../vacaciones-theme.module.css";
import AccesosRapidos from "@/components/AccesosRapidos";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function RegistroVacacionesPage() {
  // Empresa autenticada
  const { dataUser } = useAuth();
  const [empresaActiva, setEmpresaActiva] = useState("all");

  // Fechas por defecto (hoy)
  const [fechaInicio, setFechaInicio] = useState(
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD"),
  );
  const [fechaFin, setFechaFin] = useState(
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD"),
  );

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filtros básicos (sin filtros rápidos)
  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const debouncedFiltroEmpleado = useDebounce(filtroEmpleado, 500);
  const [filtroDepartamento, setFiltroDepartamento] = useState("");
  const [filtroEstadoAsistencia, setFiltroEstadoAsistencia] = useState("");

  // Sugerencias (typeahead) como en Permisos
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(0);
  const empleadosSugResp = useEmpleadosData(
    empresaActiva,
    1,
    8,
    filtroEmpleado,
    "",
    "",
    "",
  );
  const sugerencias = useMemo(() => {
    const list = empleadosSugResp?.data?.data || [];
    return list.map((e) => ({
      id_empleado: e.id_empleado,
      nombre_completo: [e.nombre, e.apellido_paterno, e.apellido_materno]
        .filter(Boolean)
        .join(" "),
    }));
  }, [empleadosSugResp?.data]);
  const handleSelectEmpleado = useCallback((emp) => {
    if (!emp) return;
    setFiltroEmpleado(emp.nombre_completo || "");
    setIsSuggestionsOpen(false);
    setPage(1);
  }, []);

  // Clave de tipo de registro: Vacaciones
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState("");

  // Catálogos
  const { data: empleados } = useEmpleadosData(empresaActiva);
  const { data: tiposPermiso } = useTiposPermisoData();

  // Derivar departamentos únicos desde empleados
  const departamentosUnicos = useMemo(() => {
    const arr =
      empleados?.data?.map((e) => e?.departamento).filter(Boolean) || [];
    return Array.from(new Set(arr)).sort();
  }, [empleados]);

  // Determinar la clave de "Vacaciones" desde el catálogo
  useEffect(() => {
    if (!tiposPermiso?.tiposPermiso) return;
    const lista = tiposPermiso.tiposPermiso;

    // 1) Coincidencia exacta por nombre
    let vac = lista.find(
      (t) => String(t?.nombre || "").toLowerCase() === "vacaciones",
    );

    // 2) Si no, buscar por clave que contenga 'vac'
    if (!vac) {
      vac = lista.find((t) =>
        String(t?.clave || "")
          .toLowerCase()
          .includes("vac"),
      );
    }

    // 3) Fallback: dejar sin filtro si no se encuentra (mostrará vacío solo si el backend requiere la clave)
    if (vac?.clave) {
      setFiltroTipoRegistro(vac.clave);
    }
  }, [tiposPermiso]);

  // UI local de filtros (sin rápidos)
  const departamentoOptions = [
    { value: "", label: "Todos los departamentos" },
    ...departamentosUnicos.map((d) => ({ value: d, label: d })),
  ];

  const handleLimitChange = (newLimit) => setLimit(newLimit);

  // Usar el contenedor de datos como función (retorna { ui, data, mutate })
  const { ui } = AsistenciaDataContainer({
    idEmpresa: empresaActiva,
    empresaActiva,
    fechaInicio,
    fechaFin,
    page,
    limit,
    debouncedFiltroEmpleado,
    filtroDepartamento,
    // Filtro clave: Vacaciones
    filtroTipoRegistro,
    filtroEstadoAsistencia: "", // No se usa en esta vista
    readOnly: true, // Vista informativa
    setPage,
    onLimitChange: handleLimitChange,
    // No mostrar campos extra en esta vista
    mostrarCamposExtras: false,
    // Callbacks no usados en esta vista
    abrirFormulario: () => {},
    onResetFilters: () => {},
    // Desactivar filtros rápidos
    soloPresentes: false,
    soloAusentes: false,
    horasExtra: false,
    sinGoceDeSueldo: false,
    diasFestivos: false,
    requiereAutorizacion: false,
  });

  useEffect(() => {
    // Opcional: Limpiar filtro de empleado al cambiar de empresa para evitar inconsistencias
    setFiltroEmpleado("");
    setFiltroDepartamento("");
  }, [empresaActiva]);

  return (
    <div className={`${styles.vacacionesTheme} space-y-4`}>
      {/* Encabezado limpio */}
      <div className="px-4 pt-4">
        <h1 className="text-xl md:text-2xl font-semibold">
          📒 Registro de vacaciones
        </h1>
      </div>

      {/* Filtros esenciales (5 columnas en pantallas grandes) */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. FILTRO DE EMPRESA (Movido aquí) */}
          <div className="flex flex-col gap-2 w-full">
            <Label htmlFor="empresa_select">Empresa</Label>
            <select
              id="empresa_select"
              value={empresaActiva}
              onChange={(e) => {
                setEmpresaActiva(e.target.value);
                setPage(1);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="all">Todas las empresas</option>
              {dataUser?.empresas_detalle?.map((emp) => (
                <option key={emp.id_empresa} value={emp.id_empresa}>
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* 2. FECHA INICIO */}
          <div className="flex flex-col gap-2 w-full">
            <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
            <Input
              id="fecha_inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* 3. FECHA FIN */}
          <div className="flex flex-col gap-2 w-full">
            <Label htmlFor="fecha_fin">Fecha Fin</Label>
            <Input
              id="fecha_fin"
              type="date"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* 4. EMPLEADO */}
          <div className="flex flex-col gap-2 w-full">
            <Label htmlFor="empleado">Empleado</Label>
            <div className="relative">
              <Input
                id="empleado"
                placeholder="Buscar por nombre..."
                value={filtroEmpleado}
                onChange={(e) => {
                  setFiltroEmpleado(e.target.value);
                  setIsSuggestionsOpen(true);
                  setHoveredSuggestionIndex(0);
                }}
                onFocus={() => setIsSuggestionsOpen(!!filtroEmpleado)}
                onBlur={() =>
                  setTimeout(() => setIsSuggestionsOpen(false), 120)
                }
                onKeyDown={(e) => {
                  if (!isSuggestionsOpen || sugerencias.length === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHoveredSuggestionIndex((prev) =>
                      prev + 1 >= sugerencias.length ? 0 : prev + 1,
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHoveredSuggestionIndex((prev) =>
                      prev - 1 < 0 ? sugerencias.length - 1 : prev - 1,
                    );
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    handleSelectEmpleado(
                      sugerencias[hoveredSuggestionIndex] || sugerencias[0],
                    );
                  } else if (e.key === "Escape") {
                    setIsSuggestionsOpen(false);
                  }
                }}
              />
              {isSuggestionsOpen && sugerencias.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow">
                  <ul className="max-h-64 overflow-auto">
                    {sugerencias.map((emp, idx) => (
                      <li
                        key={emp.id_empleado}
                        onMouseDown={() => handleSelectEmpleado(emp)}
                        onMouseEnter={() => setHoveredSuggestionIndex(idx)}
                        className={`px-3 py-2 cursor-pointer text-sm ${
                          idx === hoveredSuggestionIndex ? "bg-slate-100" : ""
                        }`}
                      >
                        {emp.nombre_completo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 5. DEPARTAMENTO */}
          <div className="flex flex-col gap-2 w-full">
            <Label htmlFor="departamento">Departamento</Label>
            <Combobox
              name="departamento"
              options={departamentoOptions}
              value={filtroDepartamento}
              onChange={(value) => {
                setFiltroDepartamento(value);
                setPage(1);
              }}
              placeholder="Todos..."
              emptyText="No hay departamentos."
            />
          </div>
        </div>
      </div>

      {/* Tabla de Asistencias */}
      <div className="px-4">{ui}</div>

      <AccesosRapidos />
    </div>
  );
}
