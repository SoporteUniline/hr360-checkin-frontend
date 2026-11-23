// src/app/panel/registro-asistencia/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AsistenciaDataContainer from "./AsistenciaDataContainer";
import MobileAsistenciaView from "./MobileAsistenciaView";
import { CuentaHorasProvider } from "./CuentaHorasContext";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import FormularioAsistenciasMasivas from "@/components/FormularioAsistenciasMasivas";
import AccesosRapidos from "@/components/AccesosRapidos";
import ClockNavigation from '@/components/Clock/ClockNavigation';
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Grid3x3,
  Layers,
  List,
  Radio,
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
import RangoFechasModal from "@/components/filtros/RangoFechasModal";
import VistasGuardadas from "@/components/tabla/VistasGuardadas";
import ColumnasSelector, {
  cargarColumnasGuardadas,
  LS_COLUMNAS,
} from "@/components/tabla/ColumnasSelector";
import { COLUMNAS_ASISTENCIA } from "./AsistenciaTable";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { LIMITE_TODOS } from "@/lib/asistencia/consultaPeriodo.mjs";

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
  // (22/11/2026) Asistencias abre en «Hoy» (en vivo: ayer y hoy, por los turnos nocturnos). Si llega con un enlace
  // a una fecha o persona (desde Horas, Incidencias o el buscador), abre en «Registros».
  const conEnlace = Boolean(searchParams.get("fecha") || searchParams.get("empleado") || searchParams.get("abrirEmpleado"));
  const ayerMx = dayjs().tz("America/Mexico_City").subtract(1, "day").format("YYYY-MM-DD");
  const [fechaInicio, setFechaInicio] = useState(conEnlace ? initialDate : ayerMx);
  const [fechaFin, setFechaFin] = useState(initialDate);
  const [page, setPage] = useState(1);
  // Escritorio arranca en "Todos los registros": se ve el periodo completo y los
  // filtros por columna se aplican sobre todo. Celular conserva páginas de 500.
  const [limit, setLimit] = useState(LIMITE_TODOS);
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
  const [sinComida, setSinComida] = useState(false);
  const [sinGoceDeSueldo, setSinGoceDeSueldo] = useState(false);
  const [diasFestivos, setDiasFestivos] = useState(false);
  const [requiereAutorizacion, setRequiereAutorizacion] = useState(false);
  const [filtroRapido, setFiltroRapido] = useState("hoy");

  // Nueva UX de escritorio: rango con modal, agrupación, columnas y detalle
  const [rangoOpen, setRangoOpen] = useState(false);
  // Pestañas: «Hoy» = envivo · «Registros» = lista o matriz (Calendario) · «Horas de ley» = horas.
  const [vista, setVista] = useState(conEnlace ? "lista" : "envivo");
  const [formatoRegistros, setFormatoRegistros] = useState("lista");
  const [rangoEtiqueta, setRangoEtiqueta] = useState(conEnlace ? "Hoy" : "En vivo");
  const [agrupar, setAgrupar] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);

  // Las columnas guardadas se cargan en cliente (localStorage no existe en SSR)
  useEffect(() => {
    const columnas = cargarColumnasGuardadas(COLUMNAS_ASISTENCIA);
    // (23/11/2026) Columna nueva «Comida»: se muestra una vez aunque haya columnas guardadas; si la quitan, se respeta.
    try {
      if (!window.localStorage.getItem("adamia-asistencia-col-comida")) {
        window.localStorage.setItem("adamia-asistencia-col-comida", "1");
        if (!columnas.includes("comida")) {
          const i = columnas.indexOf("jornada");
          columnas.splice(i >= 0 ? i + 1 : columnas.length, 0, "comida");
        }
      }
    } catch {
      // sin almacenamiento local: se usan las columnas cargadas
    }
    setVisibleColumns(columnas);
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

  // Al cambiar entre escritorio y móvil cambia el tamaño de página.
  // Reiniciar la paginación evita conservar una página que ya no corresponde
  // al nuevo límite.
  useEffect(() => {
    setPage(1);
    setLimit(isMobile ? 500 : LIMITE_TODOS);
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
  // Al salir de «En vivo» (que carga ayer y hoy) se regresa a «Hoy».
  useEffect(() => {
    if (vista !== "envivo" && rangoEtiqueta === "En vivo") {
      setFechaInicio(today);
      setFechaFin(today);
      setRangoEtiqueta("Hoy");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista]);

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

  const { ui, data, mutate, localEvents, resumenHorasExtra, totalSinComida, cargando } = AsistenciaDataContainer({
    sinComida,
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
    vista,
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
          <CuentaHorasProvider registros={registros}>
          <MobileAsistenciaView
            localEvents={localEvents}
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
          </CuentaHorasProvider>
        </div>
      </>
    );
  }

  // Desktop view — UX renovada: encabezado compacto, banda de resumen,
  // toolbar unificada (búsqueda + rango modal + agrupar + columnas) y vistas.
  return (
    <div className="space-y-5">
      <ClockNavigation companyId={empresaActiva} />

      <div>
        <EncabezadoPagina
          icono={ClipboardCheck}
          titulo="Asistencias"
          subtitulo="Quién está hoy, registros de entrada y salida, y horas de ley"
        />
      </div>

      {modoFormulario && (
        <FormularioAsistenciasMasivas
          values={values}
          setModoFormulario={setModoFormulario}
          mutate={mutate}
          idEmpresa={idEmpresa}
        />
      )}

      <div role="tablist" aria-label="Vistas de asistencia" className="flex gap-1 border-b border-gray-200">
        {[
          ["envivo", "Hoy", Radio, "Quién está, quién falta, quién va tarde y quién debe tiempo"],
          ["registros", "Registros", List, "Ver y corregir checadas del periodo"],
          ["horas", "Horas de ley", Clock3, "Horas de la semana contra el límite de la ley y horas extra"],
        ].map(([clave, texto, Icono, ayuda]) => {
          const activa = clave === "registros" ? vista === "lista" || vista === "matriz" : vista === clave;
          return (
            <button
              key={clave}
              type="button"
              role="tab"
              aria-selected={activa}
              title={ayuda}
              onClick={() => {
                if (clave === "envivo") {
                  setVista("envivo");
                  setFechaInicio(dayjs().tz("America/Mexico_City").subtract(1, "day").format("YYYY-MM-DD"));
                  setFechaFin(today);
                  setRangoEtiqueta("En vivo");
                  setPage(1);
                } else {
                  setVista(clave === "registros" ? formatoRegistros : "horas");
                }
              }}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                activa ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icono className="h-4 w-4" />
              {texto}
            </button>
          );
        })}
      </div>

      {(vista === "lista" || vista === "matriz") && (
      <ResumenAsistencia
        totals={data}
        cargando={cargando}
        soloPresentes={soloPresentes}
        setSoloPresentes={setSoloPresentes}
        soloAusentes={soloAusentes}
        setSoloAusentes={setSoloAusentes}
        horasExtra={horasExtra}
        setHorasExtra={setHorasExtra}
        resumenHorasExtra={resumenHorasExtra}
        sinComida={sinComida}
        setSinComida={setSinComida}
        totalSinComida={totalSinComida}
        filtroEstadoAsistencia={filtroEstadoAsistencia}
        setFiltroEstadoAsistencia={setFiltroEstadoAsistencia}
        setPage={setPage}
      />
      )}


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

        {(vista === "lista" || vista === "matriz") && (
        <Button
          variant="outline"
          onClick={() => setRangoOpen(true)}
          className="rounded-xl border-gray-200 font-semibold text-gray-700"
        >
          <CalendarDays className="mr-1.5 h-4 w-4" />
          {rangoEtiqueta}
          <ChevronDown className="ml-1 h-3.5 w-3.5 text-gray-400" />
        </Button>
        )}

        {(vista === "lista" || vista === "matriz") && (
          <div className="inline-flex overflow-hidden rounded-xl border border-gray-200" role="group" aria-label="Formato de registros">
            {[["lista", "Lista", List], ["matriz", "Calendario", Grid3x3]].map(([valor, texto, Icono]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={vista === valor}
                onClick={() => { setVista(valor); setFormatoRegistros(valor); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold transition-colors ${
                  vista === valor ? "bg-[#2563EB] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icono className="h-4 w-4" />
                {texto}
              </button>
            ))}
          </div>
        )}

        {vista === "lista" && (
          <Select
            value={agrupar || "none"}
            onValueChange={(v) => {
              setAgrupar(v === "none" ? null : v);
            }}
          >
            <SelectTrigger className="h-9 w-auto min-w-[190px] whitespace-nowrap rounded-xl border-gray-200 font-semibold text-gray-700 [&>span]:flex [&>span]:items-center [&>span]:gap-1.5">
              <Layers className="h-4 w-4 shrink-0 text-gray-500" />
              <SelectValue placeholder="Agrupar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin agrupar</SelectItem>
              <SelectItem value="unidad">Unidad de negocio</SelectItem>
              <SelectItem value="departamento">Departamento</SelectItem>
              <SelectItem value="tipo">Tipo de registro</SelectItem>
              <SelectItem value="estado">Estado</SelectItem>
            </SelectContent>
          </Select>
        )}

        {(vista === "lista" || vista === "matriz") && (
        <Button
          onClick={handleResetFilters}
          variant="ghost"
          className="rounded-xl font-semibold text-gray-500 hover:text-gray-900"
        >
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Limpiar
        </Button>
        )}

        <div className="flex-1" />

        {vista === "lista" && Array.isArray(visibleColumns) && (
          <ColumnasSelector
            columnas={COLUMNAS_ASISTENCIA}
            visibles={visibleColumns}
            onChange={setVisibleColumns}
          />
        )}
      </div>

      {(vista === "lista" || vista === "matriz") && (
      <VistasGuardadas
        hayFiltros={hayFiltrosParaVista}
        obtenerEstado={obtenerEstadoVista}
        onAplicar={aplicarEstadoVista}
        onLimpiar={handleResetFilters}
      />
      )}

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
