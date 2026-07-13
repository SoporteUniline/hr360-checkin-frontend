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
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/Combobox";
import {
  FiltrosGrid,
  CampoFiltro,
  SelectorBoton,
} from "@/components/filtros/CampoFiltro";
import RangoFechasModal from "@/components/filtros/RangoFechasModal";
import { useCallback } from "react";
import styles from "../vacaciones-theme.module.css";
import AccesosRapidos from "@/components/AccesosRapidos";
import { CalendarDays, Search } from "lucide-react";

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

  // Filtro homologado de rango de fechas (modal + etiqueta del botón).
  // Las fechas iniciales (hoy → hoy) corresponden al preset "Hoy".
  const [rangoOpen, setRangoOpen] = useState(false);
  const [rangoEtiqueta, setRangoEtiqueta] = useState("Hoy");

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
      {/* Encabezado compacto homologado Adamia */}
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-[0_8px_18px_rgba(37,99,235,0.3)]">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              Registro de vacaciones
            </h1>
            <p className="text-[12.5px] text-gray-500">
              Consulta informativa de registros (solo lectura) por periodo.
            </p>
          </div>
        </div>
        <div className="mt-3 h-[2.5px] rounded bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />
      </div>

      {/* Fila de filtros homologada (sin filtros rápidos) */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <FiltrosGrid columnas={5}>
          <CampoFiltro etiqueta="Unidad de negocio">
            <div className="[&_button]:h-[38px] [&_button]:w-full [&_button]:rounded-md [&_button]:border-gray-200 [&_button]:text-[13px] [&_button]:font-medium">
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
          </CampoFiltro>

          <CampoFiltro etiqueta="Rango de fechas">
            <SelectorBoton
              valor={rangoEtiqueta}
              activo
              onClick={() => setRangoOpen(true)}
            />
          </CampoFiltro>

          {/* EMPLEADO (typeahead) */}
          <CampoFiltro etiqueta="Empleado">
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
                className="h-[38px] rounded-md border-gray-200 bg-white pl-9 text-[13px]"
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
          </CampoFiltro>

          {/* DEPARTAMENTO */}
          <CampoFiltro etiqueta="Departamento">
            <div className="[&_button]:h-[38px] [&_button]:w-full [&_button]:rounded-md [&_button]:border-gray-200 [&_button]:text-[13px] [&_button]:font-medium">
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
          </CampoFiltro>
        </FiltrosGrid>
      </div>

      {/* Modal de rango de fechas homologado */}
      <RangoFechasModal
        open={rangoOpen}
        onOpenChange={setRangoOpen}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onAplicar={({ inicio, fin, etiqueta }) => {
          setFechaInicio(inicio);
          setFechaFin(fin);
          setRangoEtiqueta(etiqueta);
          setPage(1);
        }}
      />

      {/* Tabla de Asistencias (reutilizada) */}
      <div>{ui}</div>

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
