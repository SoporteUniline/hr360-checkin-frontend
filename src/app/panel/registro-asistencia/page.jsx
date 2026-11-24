// src/app/panel/registro-asistencia/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AsistenciaDataContainer from "./AsistenciaDataContainer";
import MobileAsistenciaView from "./MobileAsistenciaView";
import { CuentaHorasProvider } from "./CuentaHorasContext";
import VistaHorasReponer, { usePorReponer } from "./horas-reponer/VistaHorasReponer";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import AccesosRapidos from "@/components/AccesosRapidos";
import ClockNavigation from '@/components/Clock/ClockNavigation';
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Grid3x3,
  Layers,
  List,
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
import { COLUMNAS_ASISTENCIA, COLUMNAS_RELOJ_NUEVAS } from "./AsistenciaTable";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { LIMITE_TODOS } from "@/lib/asistencia/consultaPeriodo.mjs";
import { esVistaEnVivo, RUTA_MONITOR } from "@/lib/asistencia/vistasAsistencia.mjs";
import { AGRUPAR_SITUACION, agruparEfectivo, eleccionAlCambiarPeriodo, esPeriodoHoy } from "@/lib/asistencia/situacionHoy.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

// Pestañas de Asistencias (control segmentado). En celular ocupan el ancho. Lo de hoy en vivo está en el Monitor.
const PESTANAS = [
  ["registros", "Registros", "Ver, corregir y exportar checadas del periodo"],
  ["horas", "Horas de ley", "Horas de la semana contra el límite de la ley y horas extra"],
  // (25/11/2026) Quién debe horas de permisos por horas y qué hacer con ellas (?vista=reponer).
  ["reponer", "Horas por reponer", "Quién te debe horas de permisos y qué hacer con ellas"],
];
// Pestaña que abre el enlace (?vista=reponer | horas); lo demás abre Registros.
const VISTAS_URL = ["reponer", "horas"];
// Formato de Registros: tabla (con filtros por columna y exportar) o matriz (personas × días).
const FORMATOS = [["lista", "Tabla", List], ["matriz", "Matriz", Grid3x3]];
function FormatoRegistros({ vista, onElegir, movil = false }) {
  return (
    <div role="group" aria-label="Formato de registros"
      className={`overflow-hidden rounded-xl border border-gray-200 ${movil ? "grid grid-cols-2" : "inline-flex"}`}>
      {FORMATOS.map(([valor, texto, Icono]) => (
        <button key={valor} type="button" aria-pressed={vista === valor} onClick={() => onElegir(valor)}
          className={`flex items-center justify-center gap-1.5 px-3 text-[13px] font-semibold transition-colors ${movil ? "min-h-11" : "py-2"} ${
            vista === valor ? "bg-[#2563EB] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}>
          <Icono className="h-4 w-4" aria-hidden="true" />
          {texto}
        </button>
      ))}
    </div>
  );
}
function PestanasAsistencia({ vista, onElegir, movil = false, conteos = {} }) {
  return (
    <div role="tablist" aria-label="Vistas de asistencia"
      className={`gap-1 rounded-[10px] bg-[#e8ebf3] p-1 ${movil ? "grid grid-cols-3" : "inline-flex"}`}>
      {PESTANAS.map(([clave, texto, ayuda]) => {
        const activa = clave === "registros" ? vista === "lista" || vista === "matriz" : vista === clave;
        const n = Number(conteos[clave]) || 0;
        return (
          <button key={clave} type="button" role="tab" aria-selected={activa} title={ayuda} onClick={() => onElegir(clave)} data-pestana={clave}
            className={`rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${movil ? "min-h-11 px-1 text-[13px] leading-tight" : "min-h-9 whitespace-nowrap px-4 text-sm"} ${
              activa ? "bg-white font-semibold text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,.08)]" : "font-medium text-slate-600 hover:text-slate-900"
            }`}>
            {texto}
            {n > 0 && (
              <span data-conteo={clave} aria-label={`${n} ${n === 1 ? "persona" : "personas"}`}
                className="ml-1.5 inline-block rounded-full bg-[#2563EB] px-1.5 text-[11.5px] font-bold leading-[18px] text-white">{n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Aviso corto al llegar desde una pantalla que ya vive dentro de Asistencias (ver /panel/horas-extra).
const AVISOS = {
  "horas-extra": "«Control de horas extra» ahora vive aquí: las horas extra se autorizan en el reloj de cada fila (botón morado «por autorizar»).",
};
function AvisoMovido({ clave }) {
  const [visible, setVisible] = useState(true);
  if (!visible || !AVISOS[clave]) return null;
  return (
    <div role="status" data-aviso-movido className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13.5px] text-blue-900">
      <span className="flex-1">{AVISOS[clave]}</span>
      <button type="button" onClick={() => setVisible(false)} className="min-h-9 shrink-0 font-semibold underline">Entendido</button>
    </div>
  );
}

export default function ControlAsistencia() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Enlaces viejos a «Hoy / En vivo» (?vista=envivo): esa vista ahora es el Monitor.
  const aMonitor = esVistaEnVivo(searchParams.get("vista"));
  useEffect(() => {
    if (aMonitor) router.replace(RUTA_MONITOR);
  }, [aMonitor, router]);
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
  // Asistencias abre en Registros › Tabla con el día de hoy (o la fecha del enlace).
  // ?desde=&hasta= (p. ej. la semana desde «Horas de ley») abre ese periodo.
  const FECHA = /^\d{4}-\d{2}-\d{2}$/;
  const desdeParam = FECHA.test(searchParams.get("desde") ?? "") ? searchParams.get("desde") : null;
  const hastaParam = FECHA.test(searchParams.get("hasta") ?? "") ? searchParams.get("hasta") : null;
  const [fechaInicio, setFechaInicio] = useState(desdeParam && hastaParam ? desdeParam : initialDate);
  const [fechaFin, setFechaFin] = useState(desdeParam && hastaParam ? hastaParam : initialDate);
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
  // Pestañas: «Registros» = lista (Tabla) o matriz · «Horas de ley» = horas.
  const [vista, setVista] = useState(() => (VISTAS_URL.includes(searchParams.get("vista")) ? searchParams.get("vista") : "lista"));
  const [formatoRegistros, setFormatoRegistros] = useState("lista");
  const [rangoEtiqueta, setRangoEtiqueta] = useState(desdeParam && hastaParam
    ? `${desdeParam.split("-").reverse().join("/")} – ${hastaParam.split("-").reverse().join("/")}` : "Hoy");
  // Lo elegido en «Agrupar» (undefined = no ha elegido: con Hoy se divide por «Situación de hoy»; null = «Sin agrupar»).
  const [agrupar, setAgrupar] = useState(undefined);
  const [visibleColumns, setVisibleColumns] = useState(null);

  // Las columnas guardadas se cargan en cliente (localStorage no existe en SSR)
  useEffect(() => {
    const columnas = cargarColumnasGuardadas(COLUMNAS_ASISTENCIA);
    // Columna nueva «Comida»: se muestra una vez aunque haya columnas guardadas; si la quitan, se respeta.
    try {
      if (!window.localStorage.getItem("adamia-asistencia-col-comida")) {
        window.localStorage.setItem("adamia-asistencia-col-comida", "1");
        if (!columnas.includes("comida")) {
          const i = columnas.indexOf("jornada");
          columnas.splice(i >= 0 ? i + 1 : columnas.length, 0, "comida");
        }
      }
      // Columnas del reloj (Día, Estado · motivo, Reloj): se muestran una vez; si luego las ocultan, se respeta.
      // (24/11/2026) «Goce» y «Editado» como columnas propias: se muestran una vez.
      // «-v2»: una pestaña con la versión anterior podía volver a guardar las columnas sin las nuevas.
      if (!window.localStorage.getItem("adamia-asistencia-col-goce-editado-v2")) {
        window.localStorage.setItem("adamia-asistencia-col-goce-editado-v2", "1");
        const i = columnas.includes("hrs_extra") ? columnas.indexOf("hrs_extra") + 1 : columnas.length;
        const nuevas = ["goce", "correccion"].filter((k) => !columnas.includes(k));
        columnas.splice(i, 0, ...nuevas);
      }
      // (24/11/2026) «Motivo» se separó de «Estado»: se muestra una vez a quien ya tenía columnas guardadas.
      if (!window.localStorage.getItem("adamia-asistencia-col-motivo-v2")) {
        window.localStorage.setItem("adamia-asistencia-col-motivo-v2", "1");
        if (columnas.includes("estado_asistencia") && !columnas.includes("motivo")) columnas.splice(columnas.indexOf("estado_asistencia") + 1, 0, "motivo");
      }
      if (!window.localStorage.getItem("adamia-asistencia-col-reloj")) {
        window.localStorage.setItem("adamia-asistencia-col-reloj", "1");
        for (const k of COLUMNAS_RELOJ_NUEVAS) if (!columnas.includes(k)) columnas.push(k);
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

  // «Registrar asistencia masiva» ya no está en Asistencias: lo reemplazan «Marcar como…» y «Cargar horario
  // normal…» al elegir filas (el formulario sigue existiendo para otras pantallas).
  const abrirFormulario = null;

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
  };

  const today = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");
  const esHoy = esPeriodoHoy(fechaInicio, fechaFin, today);
  const agruparAplicado = agruparEfectivo(agrupar, esHoy);
  // Al entrar o salir de Hoy, «Sin agrupar» / «Situación de hoy» vuelven al valor por defecto del periodo.
  useEffect(() => {
    setAgrupar(eleccionAlCambiarPeriodo);
  }, [esHoy]);

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
    setAgrupar(undefined);
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
    setAgrupar(v.agrupar || undefined);
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
    page: page,
    limit: limit,
    debouncedFiltroEmpleado: debouncedFiltroEmpleado,
    filtroDepartamento: filtroDepartamento,
    filtroTipoRegistro: filtroTipoRegistro,
    filtroEstadoAsistencia: filtroEstadoAsistencia,
    setPage,
    onLimitChange: handleLimitChange,
    mostrarCamposExtras,
    abrirFormulario,
    onResetFilters: handleResetFilters,
    soloPresentes: soloPresentes,
    soloAusentes: soloAusentes,
    horasExtra: horasExtra,
    sinGoceDeSueldo: sinGoceDeSueldo,
    diasFestivos: diasFestivos,
    requiereAutorizacion: requiereAutorizacion,
    sortConfig,
    setSortConfig,
    agrupar: agruparAplicado,
    visibleColumns,
    vista,
    ocultarRegistroMasivo: true,
  });

  // Número de personas que deben horas (pestaña «Horas por reponer»); la vista usa la misma consulta.
  const { data: porReponer } = usePorReponer(empresaActiva);
  const conteos = { reponer: porReponer?.data?.totales?.personas ?? 0 };

  const elegirPestana = (clave) => {
    setVista(clave === "registros" ? formatoRegistros : clave);
    // La pestaña queda en el enlace (?vista=reponer) para poder abrirla o compartirla.
    try {
      const u = new URL(window.location.href);
      if (VISTAS_URL.includes(clave)) u.searchParams.set("vista", clave);
      else u.searchParams.delete("vista");
      window.history.replaceState(window.history.state, "", u);
    } catch {
      // sin URL: solo cambia la pestaña
    }
  };
  const elegirFormato = (valor) => {
    setVista(valor);
    setFormatoRegistros(valor);
  };
  if (aMonitor) return null;

  const modalRango = (
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
  );

  // Celular: «Horas de ley» y la matriz con encabezado y pestañas; la tabla es la vista móvil de siempre.
  if (isMobile && vista !== "lista") {
    return (
      <>
        <div className="-m-5 h-[calc(100dvh-3.5rem)] overflow-y-auto overflow-x-hidden bg-[#f6f7fb] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="space-y-3.5">
            <ClockNavigation companyId={empresaActiva} />
            <header className="space-y-0.5">
              <h1 className="text-[22px] font-bold leading-tight text-slate-900">Asistencias</h1>
              <p className="text-[13px] text-slate-600">Historial: corrige, exporta y revisa por periodo</p>
            </header>
            <PestanasAsistencia vista={vista} onElegir={elegirPestana} movil conteos={conteos} />
            {vista === "matriz" ? (
              <div className="space-y-2">
                <FormatoRegistros vista={vista} onElegir={elegirFormato} movil />
                <Button variant="outline" onClick={() => setRangoOpen(true)}
                  className="min-h-11 w-full justify-between rounded-xl border-gray-200 bg-white font-semibold text-gray-700">
                  <span className="flex items-center"><CalendarDays className="mr-1.5 h-4 w-4" aria-hidden="true" />Periodo: {rangoEtiqueta}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                </Button>
              </div>
            ) : null}
            {vista === "reponer" ? <VistaHorasReponer idEmpresa={empresaActiva} movil /> : ui}
          </div>
        </div>
        {vista === "matriz" ? modalRango : null}
      </>
    );
  }

  // Mobile view: full-height layout overriding panel padding
  if (isMobile) {
    const registros = data?.registros || [];
    return (
      <>
        <div className="-m-5 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
          <div className="shrink-0 bg-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <PestanasAsistencia vista={vista} onElegir={elegirPestana} movil conteos={conteos} />
            <div className="mt-2"><AvisoMovido clave={searchParams.get("aviso")} /></div>
            <div className="mt-2"><FormatoRegistros vista={vista} onElegir={elegirFormato} movil /></div>
          </div>
          <div className="min-h-0 flex-1">
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
          subtitulo="Historial completo: corrige, exporta y revisa por periodo"
          acciones={<PestanasAsistencia vista={vista} onElegir={elegirPestana} conteos={conteos} />}
        />
      </div>


      <AvisoMovido clave={searchParams.get("aviso")} />

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


      {vista !== "reponer" && (
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

        {(vista === "lista" || vista === "matriz") && <FormatoRegistros vista={vista} onElegir={elegirFormato} />}

        {vista === "lista" && (
          <Select
            value={agruparAplicado || "none"}
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
              {esHoy && <SelectItem value={AGRUPAR_SITUACION}>Situación de hoy</SelectItem>}
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
      )}

      {(vista === "lista" || vista === "matriz") && (
      <VistasGuardadas
        hayFiltros={hayFiltrosParaVista}
        obtenerEstado={obtenerEstadoVista}
        onAplicar={aplicarEstadoVista}
        onLimpiar={handleResetFilters}
      />
      )}

      {vista === "reponer" ? <VistaHorasReponer idEmpresa={empresaActiva} /> : ui}

      {modalRango}

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
