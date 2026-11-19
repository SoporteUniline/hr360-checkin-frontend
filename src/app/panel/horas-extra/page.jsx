"use client";

// Control de horas extra (maqueta aprobada 19/11/2026).
// Reutiliza la tabla de Asistencias filtrada a quien tiene horas extra: misma edición al dar clic,
// mismas acciones masivas, mismo Excel e historial. Lo que se cambia aquí ES la asistencia.
// Arriba: semana legal (lunes–domingo), tarjetas que filtran y el tope semanal al doble de la LFT.
// Lógica: lib/asistencia/controlHorasExtra.mjs.
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Clock3, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import { fetcherWithToken } from "@/lib/fetcher";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { Input } from "@/components/ui/input";
import AsistenciaDataContainer from "../registro-asistencia/AsistenciaDataContainer";
import { LIMITE_TODOS } from "@/lib/asistencia/consultaPeriodo.mjs";
import { ETIQUETAS_ESTADO } from "@/lib/asistencia/horasExtra.mjs";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { moverSemana, semanaDe, topeRespaldo } from "@/lib/asistencia/controlHorasExtra.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

const COLUMNAS = ["empleado", "departamento", "fecha", "correccion", "salida", "hrs_extra", "forma_pago", "notas"];
const ORDEN = { sortBy: "horasExtra", sortOrder: "desc" };
const corta = (f) => dayjs(f).format("D MMM").replace(".", "");
const TARJETAS = [
  ["pendiente", "Por autorizar", "text-orange-700"],
  ["autorizada", "Autorizadas", "text-emerald-700"],
  ["no_autorizada", "No autorizadas", "text-slate-500"],
];

function ControlHorasExtra() {
  const params = useSearchParams();
  const { dataUser } = useAuth();
  const hoy = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");
  const [semana, setSemana] = useState(() => semanaDe(params.get("semana") || hoy));
  const [buscar, setBuscar] = useState(params.get("empleado") || "");
  const filtroEmpleado = useDebounce(buscar, 400);
  const [estado, setEstado] = useState(null);
  const [porPersona, setPorPersona] = useState(false);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(ORDEN);
  // Igual que Asistencias: todas las empresas del usuario.
  const empresaActiva = dataUser ? "all" : null;

  // Tope semanal al doble del catálogo de jornadas legales (o el respaldo de la LFT).
  const { data: regla } = useSWR(`/checador/jornadas-legales/vigente?fecha=${semana.inicio}`, fetcherWithToken, { revalidateOnFocus: false, shouldRetryOnError: false });
  const tope = Number(regla?.data?.minutos_extra_transitorios_semanales) || topeRespaldo(semana.inicio);
  const controlHorasExtra = useMemo(() => ({ tope }), [tope]);
  const estados = useMemo(() => (estado ? [ETIQUETAS_ESTADO[estado]] : []), [estado]);

  const res = AsistenciaDataContainer({
    idEmpresa: empresaActiva,
    empresaActiva,
    fechaInicio: semana.inicio,
    fechaFin: semana.fin,
    page,
    limit: LIMITE_TODOS,
    debouncedFiltroEmpleado: filtroEmpleado,
    filtroDepartamento: [],
    filtroTipoRegistro: "",
    filtroEstadoAsistencia: "",
    setPage,
    onLimitChange: () => {},
    mostrarCamposExtras: false,
    abrirFormulario: () => {},
    onResetFilters: () => { setEstado(null); setBuscar(""); },
    soloPresentes: false,
    soloAusentes: false,
    horasExtra: true,
    sinGoceDeSueldo: false,
    diasFestivos: false,
    requiereAutorizacion: false,
    sortConfig,
    setSortConfig,
    agrupar: porPersona ? "empleado" : null,
    visibleColumns: COLUMNAS,
    vista: "lista",
    controlHorasExtra,
    estadosHorasExtra: estados,
    ocultarRegistroMasivo: true,
  });
  const ui = res?.ui ?? res;
  const resumen = res?.control?.resumen;

  const valor = (k) => resumen?.[k];
  const nota = {
    pendiente: resumen ? `${resumen.pendiente.registros} registros · ${resumen.pendiente.personas} personas` : "",
    autorizada: resumen ? `${formatearMinutos(resumen.autorizada.dobles)} al doble · ${formatearMinutos(resumen.autorizada.triples)} al triple` : "",
    no_autorizada: "se pagó hasta la salida del horario",
  };
  const semanaActual = semana.inicio <= hoy && hoy <= semana.fin;

  return (
    <div className="space-y-4">
      <EncabezadoPagina
        icono={Clock3}
        titulo="Control de horas extra"
        subtitulo="Quién hizo horas extra, cuánto y quién las autorizó · se corrige aquí mismo y queda en el historial"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" aria-label="Semana anterior" onClick={() => { setSemana((s) => moverSemana(s, -1)); setPage(1); }}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <b className="text-slate-900">Semana {corta(semana.inicio)} – {corta(semana.fin)} {semana.fin.slice(0, 4)}</b>
          <button type="button" aria-label="Semana siguiente" onClick={() => { setSemana((s) => moverSemana(s, 1)); setPage(1); }}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
          {!semanaActual && (
            <button type="button" className="text-xs font-semibold text-blue-600 hover:underline" onClick={() => setSemana(semanaDe(hoy))}>Esta semana</button>
          )}
          <span className="text-xs text-slate-500">· semana legal lunes–domingo · {formatearMinutos(tope)} extra al doble, lo demás al triple</span>
        </div>
        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white text-sm font-semibold" role="group" aria-label="Agrupar">
          <button type="button" aria-pressed={!porPersona} onClick={() => setPorPersona(false)} className={`px-3 py-1.5 ${!porPersona ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Por día</button>
          <button type="button" aria-pressed={porPersona} onClick={() => setPorPersona(true)} className={`px-3 py-1.5 ${porPersona ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Por persona</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" role="group" aria-label="Resumen de la semana">
        {TARJETAS.map(([k, titulo, color]) => (
          <button key={k} type="button" aria-pressed={estado === k} onClick={() => setEstado(estado === k ? null : k)}
            className={`rounded-2xl border bg-white px-4 py-2.5 text-left transition hover:border-slate-300 ${estado === k ? "border-blue-500 ring-2 ring-blue-500/30" : "border-slate-200"}`}>
            <span className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-500">{titulo}</span>
            <b className={`text-[22px] tabular-nums ${color}`}>{resumen ? formatearMinutos(valor(k).minutos) : "—"}</b>
            <small className="block text-[11.5px] text-slate-500">{nota[k]}</small>
          </button>
        ))}
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
          <span className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Alertas de ley</span>
          <b className={`text-[22px] tabular-nums ${resumen?.alertas ? "text-red-700" : "text-slate-900"}`}>{resumen ? resumen.alertas : "—"}</b>
          <small className="block text-[11.5px] text-slate-500">más de 4 h en un día · pasa del tope semanal</small>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input aria-label="Buscar empleado" placeholder="Buscar empleado…" value={buscar} onChange={(e) => setBuscar(e.target.value)} className="h-9 rounded-xl pl-9" />
        </div>
        {estado && (
          <button type="button" onClick={() => setEstado(null)} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {ETIQUETAS_ESTADO[estado]} ✕
          </button>
        )}
        {params.get("empleado") && buscar === params.get("empleado") && (
          <span className="text-xs text-slate-500">Llegaste desde Asistencias › Horas</span>
        )}
      </div>

      {ui}

      <p className="text-xs text-slate-500">
        Clic en una fila: abre la misma ventana de Asistencias (horario, checadas del reloj, edición e historial).
        Lo que cambias aquí es la asistencia: se ve igual en Asistencias, en el Reporte de horas y en la pestaña Horas.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ControlHorasExtra />
    </Suspense>
  );
}
