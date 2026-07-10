// src/app/panel/registro-asistencia/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AsistenciaDataContainer from "./AsistenciaDataContainer";
import MobileAsistenciaView from "./MobileAsistenciaView";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import FormularioAsistenciasMasivas from "@/components/FormularioAsistenciasMasivas";
import AccesosRapidos from "@/components/AccesosRapidos";
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Layers,
  RotateCcw,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import useDepartamentosData from "@/hooks/useDepartamentosData";
import ResumenAsistencia from "./ResumenAsistencia";
import RangoFechasModal from "./RangoFechasModal";
import VistasGuardadas from "./VistasGuardadas";
import ColumnasSelector, {
  cargarColumnasGuardadas,
  LS_COLUMNAS,
} from "./ColumnasSelector";
import { COLUMNAS_ASISTENCIA } from "./AsistenciaTable";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ControlAsistencia() {
  const searchParams = useSearchParams();
  const [empresaActiva, setEmpresaActiva] = useState(null);
  const idEmpresa = empresaActiva;
  const initialDate =
    searchParams.get("fecha") ||
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");
  const getInitialFilters = () => ({
    fechaInicio: initialDate,
    fechaFin: initialDate,
    filtroEmpleado: searchParams.get("empleado") || "",
    filtroDepartamento: [],
    filtroTipoRegistro: "",
    filtroEstadoAsistencia: "",
    page: 1,
    filtroPresentes: false,
    filtroAusentes: false,
    filtroHorasExtra: false,
    filtroSinGoceDeSueldo: false,
    filtroDiasFestivos: false,
    filtroRequiereAutorizacion: false,
  });
  const [fechaInicio, setFechaInicio] = useState(initialDate);
  const [fechaFin, setFechaFin] = useState(initialDate);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtroEmpleado, setFiltroEmpleado] = useState(
    searchParams.get("empleado") || "",
  );
  const debouncedFiltroEmpleado = useDebounce(filtroEmpleado, 500);
  const [filtroDepartamento, setFiltroDepartamento] = useState([]);
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState("");
  const [filtroEstadoAsistencia, setFiltroEstadoAsistencia] = useState("");
  const [mostrarCamposExtras, setMostrarCamposExtras] = useState(false);
  const [soloPresentes, setSoloPresentes] = useState(false);
  const [soloAusentes, setSoloAusentes] = useState(false);
  const [horasExtra, setHorasExtra] = useState(false);
  const [sinGoceDeSueldo, setSinGoceDeSueldo] = useState(false);
  const [diasFestivos, setDiasFestivos] = useState(false);
  const [requiereAutorizacion, setRequiereAutorizacion] = useState(false);
  const [filtroRapido, setFiltroRapido] = useState("hoy");

  // Nueva UX de escritorio: rango con modal, agrupación, columnas y detalle
  const [rangoOpen, setRangoOpen] = useState(false);
  const [rangoEtiqueta, setRangoEtiqueta] = useState("Hoy");
  const [agrupar, setAgrupar] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);

  // Las columnas guardadas se cargan en cliente (localStorage no existe en SSR)
  useEffect(() => {
    setVisibleColumns(cargarColumnasGuardadas(COLUMNAS_ASISTENCIA));
  }, []);

  const DEFAULT_SORT_CONFIG = {
    sortBy: "fecha",
    sortOrder: "desc",
  };
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT_CONFIG);

  const { dataUser } = useAuth();
  const isMobile = useIsMobile();
  const { departamentos } = useDepartamentosData(idEmpresa);

  useEffect(() => {
    if (dataUser?.empresas?.length > 0 && !empresaActiva) {
      setEmpresaActiva("all");
    }
  }, [dataUser, empresaActiva]);

  // Use a larger limit on mobile to load all employees for client-side grouping
  useEffect(() => {
    if (isMobile) setLimit(500);
    else setLimit(10);
  }, [isMobile]);

  const [modoFormulario, setModoFormulario] = useState(false);
  const [values, setValues] = useState(null);

  const abrirFormulario = () => {
    setValues(null);
    setModoFormulario(true);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
  };

  const today = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");

  const handleResetFilters = () => {
    setEmpresaActiva("all");
    setFechaInicio(today);
    setFechaFin(today);
    setFiltroEmpleado("");
    setFiltroDepartamento([]);
    setFiltroTipoRegistro("");
    setFiltroEstadoAsistencia("");
    setPage(1);
    setSoloPresentes(false);
    setSoloAusentes(false);
    setHorasExtra(false);
    setSinGoceDeSueldo(false);
    setDiasFestivos(false);
    setRequiereAutorizacion(false);
    setMostrarCamposExtras(false);
    setFiltroRapido("hoy");
    setSortConfig(DEFAULT_SORT_CONFIG);
    setAgrupar(null);
    setRangoEtiqueta("Hoy");
  };

  // ——— Vistas guardadas: serializar/aplicar el estado de la pantalla ———
  const hayFiltrosParaVista = Boolean(
    filtroEmpleado ||
    soloPresentes ||
    soloAusentes ||
    horasExtra ||
    sinGoceDeSueldo ||
    diasFestivos ||
    requiereAutorizacion ||
    filtroEstadoAsistencia ||
    (filtroDepartamento || []).length ||
    filtroTipoRegistro ||
    agrupar ||
    rangoEtiqueta !== "Hoy",
  );

  const obtenerEstadoVista = () => ({
    fechaInicio,
    fechaFin,
    rangoEtiqueta,
    filtroEmpleado,
    filtroDepartamento,
    filtroTipoRegistro,
    filtroEstadoAsistencia,
    soloPresentes,
    soloAusentes,
    horasExtra,
    sinGoceDeSueldo,
    diasFestivos,
    requiereAutorizacion,
    agrupar,
    visibleColumns,
  });

  const aplicarEstadoVista = (v) => {
    if (!v) return;
    setFechaInicio(v.fechaInicio ?? today);
    setFechaFin(v.fechaFin ?? today);
    setRangoEtiqueta(v.rangoEtiqueta || "Hoy");
    setFiltroEmpleado(v.filtroEmpleado || "");
    setFiltroDepartamento(
      Array.isArray(v.filtroDepartamento) ? v.filtroDepartamento : [],
    );
    setFiltroTipoRegistro(v.filtroTipoRegistro || "");
    setFiltroEstadoAsistencia(v.filtroEstadoAsistencia || "");
    setSoloPresentes(Boolean(v.soloPresentes));
    setSoloAusentes(Boolean(v.soloAusentes));
    setHorasExtra(Boolean(v.horasExtra));
    setSinGoceDeSueldo(Boolean(v.sinGoceDeSueldo));
    setDiasFestivos(Boolean(v.diasFestivos));
    setRequiereAutorizacion(Boolean(v.requiereAutorizacion));
    setAgrupar(v.agrupar || null);
    if (Array.isArray(v.visibleColumns) && v.visibleColumns.length >= 2) {
      setVisibleColumns(v.visibleColumns);
      try {
        window.localStorage.setItem(
          LS_COLUMNAS,
          JSON.stringify(v.visibleColumns),
        );
      } catch {
        // sin persistencia
      }
    }
    setPage(1);
  };

  const { ui, data, mutate } = AsistenciaDataContainer({
    idEmpresa,
    empresaActiva,
    fechaInicio,
    fechaFin,
    page,
    limit,
    debouncedFiltroEmpleado,
    filtroDepartamento,
    filtroTipoRegistro,
    filtroEstadoAsistencia,
    setPage,
    onLimitChange: handleLimitChange,
    mostrarCamposExtras,
    abrirFormulario,
    onResetFilters: handleResetFilters,
    soloPresentes,
    soloAusentes,
    horasExtra,
    sinGoceDeSueldo,
    diasFestivos,
    requiereAutorizacion,
    sortConfig,
    setSortConfig,
    agrupar,
    visibleColumns,
  });

  // Mobile view: full-height layout overriding panel padding
  if (isMobile) {
    const registros = data?.registros || [];
    return (
      <>
        {modoFormulario && (
          <FormularioAsistenciasMasivas
            values={values}
            setModoFormulario={setModoFormulario}
            mutate={mutate}
            idEmpresa={idEmpresa}
          />
        )}
        <div className="-m-5 h-[calc(100dvh-3.5rem)] overflow-hidden">
          <MobileAsistenciaView
            registros={registros}
            data={data}
            mutate={mutate}
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            setFechaInicio={setFechaInicio}
            setFechaFin={setFechaFin}
            filtroEmpleado={filtroEmpleado}
            setFiltroEmpleado={(v) => {
              setFiltroEmpleado(v);
              setPage(1);
            }}
            filtroEstadoAsistencia={filtroEstadoAsistencia}
            setFiltroEstadoAsistencia={setFiltroEstadoAsistencia}
            filtroDepartamento={filtroDepartamento}
            setFiltroDepartamento={setFiltroDepartamento}
            soloPresentes={soloPresentes}
            setSoloPresentes={setSoloPresentes}
            page={page}
            setPage={setPage}
            limit={limit}
            setLimit={setLimit}
            empresaActiva={empresaActiva}
            departamentos={departamentos}
            abrirFormulario={abrirFormulario}
            isLoading={!data}
            onResetFilters={handleResetFilters}
            filtroRapido={filtroRapido}
            setFiltroRapido={setFiltroRapido}
          />
        </div>
      </>
    );
  }

  // Desktop view — UX renovada: encabezado compacto, banda de resumen,
  // toolbar unificada (búsqueda + rango modal + agrupar + columnas) y vistas.
  return (
    <div className="space-y-5">
      {/* Encabezado compacto con la tipografía del landing */}
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-[0_8px_18px_rgba(37,99,235,0.3)]">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              Asistencias
            </h1>
            <p className="text-[12.5px] text-gray-500">
              Registros de entrada y salida por empleado
            </p>
          </div>
        </div>
        <div className="mt-3 h-[2.5px] rounded bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />
      </div>

      {modoFormulario && (
        <FormularioAsistenciasMasivas
          values={values}
          setModoFormulario={setModoFormulario}
          mutate={mutate}
          idEmpresa={idEmpresa}
        />
      )}

      <ResumenAsistencia
        totals={data}
        soloPresentes={soloPresentes}
        setSoloPresentes={setSoloPresentes}
        soloAusentes={soloAusentes}
        setSoloAusentes={setSoloAusentes}
        horasExtra={horasExtra}
        setHorasExtra={setHorasExtra}
        filtroEstadoAsistencia={filtroEstadoAsistencia}
        setFiltroEstadoAsistencia={setFiltroEstadoAsistencia}
        setPage={setPage}
      />

      {/* Toolbar unificada */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] max-w-[340px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar empleado..."
            className="rounded-xl pl-9"
            value={filtroEmpleado}
            onChange={(e) => {
              setFiltroEmpleado(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Button
          variant="outline"
          onClick={() => setRangoOpen(true)}
          className="rounded-xl border-gray-200 font-semibold text-gray-700"
        >
          <CalendarDays className="mr-1.5 h-4 w-4" />
          {rangoEtiqueta}
          <ChevronDown className="ml-1 h-3.5 w-3.5 text-gray-400" />
        </Button>

        <Select
          value={agrupar || "none"}
          onValueChange={(v) => {
            setAgrupar(v === "none" ? null : v);
          }}
        >
          <SelectTrigger className="w-[200px] rounded-xl border-gray-200 font-semibold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Agrupar" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin agrupar</SelectItem>
            <SelectItem value="unidad">Unidad de negocio</SelectItem>
            <SelectItem value="departamento">Departamento</SelectItem>
            <SelectItem value="tipo">Tipo de registro</SelectItem>
            <SelectItem value="estado">Estado</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={handleResetFilters}
          variant="ghost"
          className="rounded-xl font-semibold text-gray-500 hover:text-gray-900"
        >
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Limpiar
        </Button>

        <div className="flex-1" />

        {Array.isArray(visibleColumns) && (
          <ColumnasSelector
            columnas={COLUMNAS_ASISTENCIA}
            visibles={visibleColumns}
            onChange={setVisibleColumns}
          />
        )}
      </div>

      <VistasGuardadas
        hayFiltros={hayFiltrosParaVista}
        obtenerEstado={obtenerEstadoVista}
        onAplicar={aplicarEstadoVista}
        onLimpiar={handleResetFilters}
      />

      {ui}

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

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
