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
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import AsistenciaDataContainer from "@/app/panel/registro-asistencia/AsistenciaDataContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";
import { useCallback } from "react";
import styles from "../vacaciones-theme.module.css";
import AccesosRapidos from "@/components/AccesosRapidos";
import { CalendarDays, Filter, Search } from "lucide-react";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function RegistroVacacionesPage() {
  // Empresa autenticada
  const { dataUser } = useAuth();
  const [unidadActiva, setUnidadActiva] = useState("all");
  const { options: unidadOptions, byId: unidadById } = useUnidadesNegocio();
  const idEmpresa =
    unidadActiva === "all"
      ? "all"
      : String(unidadById[unidadActiva]?.id_empresa || "all");

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
    idEmpresa,
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
  const { data: empleados } = useEmpleadosData(idEmpresa);
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
    idEmpresa,
    empresaActiva: idEmpresa,
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
  }, [unidadActiva]);

  return (
    <div className={`${styles.vacacionesTheme} space-y-6`}>
      {/* Header ADAMIA */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#2563EB] p-2.5 rounded-lg">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Registro de vacaciones
            </h1>
            <p className="text-sm text-gray-600">
              Consulta informativa de registros (solo lectura) por periodo.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros esenciales (sin filtros rápidos) */}
      <Card className="border-blue-100 bg-blue-50">
        
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex flex-col gap-2 w-full">
              <Label htmlFor="unidad_select">Unidad de negocio</Label>
              <Combobox
                name="unidad_select"
                options={[
                  { value: "all", label: "Todas las unidades de negocio" },
                  ...unidadOptions,
                ]}
                value={unidadActiva}
                onChange={(value) => {
                  setUnidadActiva(value || "all");
                  setPage(1);
                }}
                placeholder="Seleccionar unidad de negocio"
                emptyText="No hay unidades disponibles."
              />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Label
                className="text-sm font-medium text-gray-700"
                htmlFor="fecha_inicio"
              >
                Fecha inicio
              </Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value);
                  setPage(1);
                }}
                className="bg-white"
              />
            </div>

            {/* 3. FECHA FIN */}
            <div className="flex flex-col gap-2 w-full">
              <Label
                className="text-sm font-medium text-gray-700"
                htmlFor="fecha_fin"
              >
                Fecha fin
              </Label>
              <Input
                id="fecha_fin"
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setFechaFin(e.target.value);
                  setPage(1);
                }}
                className="bg-white"
              />
            </div>

            {/* 4. EMPLEADO */}
            <div className="flex flex-col gap-2 w-full">
              <Label
                className="text-sm font-medium text-gray-700"
                htmlFor="empleado"
              >
                Empleado
              </Label>
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                  className="bg-white pl-9"
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
              <Label
                className="text-sm font-medium text-gray-700"
                htmlFor="departamento"
              >
                Departamento
              </Label>
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
        </CardContent>
      </Card>

      {/* Tabla de Asistencias (reutilizada) */}
      <div>{ui}</div>

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
