"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  Plus,
  ListFilter,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import MobileFiltersDrawer from "./MobileFiltersDrawer";
import MobileEmpleadoDetalle from "./MobileEmpleadoDetalle";
import { ArrowLeft, ArrowRight } from "lucide-react";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TZ = "America/Mexico_City";

const MESES_ES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];
const DIAS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

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

const TABS = [
  { key: "all", label: "Todos", dotClass: null },
  { key: "Presente", label: "Presentes", dotClass: "bg-green-500" },
  { key: "Tardanza", label: "Tarde", dotClass: "bg-amber-500" },
  // { key: "Pendiente", label: "Pendiente", dotClass: "bg-slate-400" },
  { key: "Ausente", label: "Ausente", dotClass: "bg-red-500" },
];

const GRUPO_CONFIG = {
  Presente: {
    label: "PRESENTES",
    dotClass: "bg-green-500",
    badgeClass: "bg-green-600",
  },
  Tardanza: {
    label: "TARDANZAS",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-500",
  },
  Pendiente: {
    label: "PENDIENTES",
    dotClass: "bg-slate-400",
    badgeClass: "bg-slate-400",
  },
  Ausente: {
    label: "AUSENTES",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-600",
  },
};

function EmpleadoCard({ registro, index, totalCount, onClick }) {
  const nombreCompleto = [
    registro.nombre,
    registro.apellido_paterno,
    registro.apellido_materno,
  ]
    .filter(Boolean)
    .join(" ");

  const initials = getInitials(registro.nombre, registro.apellido_paterno);
  const avatarColor = getAvatarColor(nombreCompleto);
  const empresa =
    registro.unidad_negocio ||
    registro.sucursal ||
    registro.empresa_nombre ||
    "";

  const entradaFmt = registro.entrada
    ? dayjs.tz(registro.entrada, DB_TZ).format("HH:mm")
    : null;
  const salidaFmt = registro.salida
    ? dayjs.tz(registro.salida, DB_TZ).format("HH:mm")
    : null;

  const esTarde = registro.estadoAsistencia === "Tardanza";

  return (
    <button
      onClick={() => onClick(registro, index)}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 text-left transition-colors"
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate leading-tight">
          {nombreCompleto}
        </p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {registro.departamento}
          {empresa ? ` · ${empresa}` : ""}
        </p>
      </div>

      {/* Times */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* IN badge */}
        {entradaFmt ? (
          <div
            className={cn(
              "flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg",
              esTarde
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700",
            )}
          >
            <span className="text-[9px] font-semibold opacity-70">IN</span>
            <span>{entradaFmt}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-300 px-2 py-1 rounded-lg border border-dashed border-gray-200">
            <span className="text-[9px] opacity-70">IN</span>
            <span>—</span>
          </div>
        )}

        {/* OUT badge */}
        {salidaFmt ? (
          <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
            <span className="text-[9px] font-semibold opacity-70">OUT</span>
            <span>{salidaFmt}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-300 px-2 py-1">
            <span className="text-[9px] opacity-70">OUT</span>
            <span>—</span>
          </div>
        )}
      </div>
    </button>
  );
}

function GrupoSection({
  estado,
  registros,
  allRegistros,
  totalCount,
  totalFromStats,
  onEmpleadoClick,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const config = GRUPO_CONFIG[estado] || GRUPO_CONFIG.Pendiente;

  if (registros.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100 sticky top-0 z-10"
      >
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", config.dotClass)} />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {config.label}
          </span>
          <span className="text-xs font-bold text-gray-400">
            {totalFromStats ?? registros.length}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
          {collapsed ? "Expandir" : "Contraer"}
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </div>
      </button>
      {!collapsed &&
        registros.map((reg, i) => {
          const globalIndex = allRegistros.findIndex((r) => r.id === reg.id);
          return (
            <EmpleadoCard
              key={reg.id ?? i}
              registro={reg}
              index={globalIndex >= 0 ? globalIndex : i}
              totalCount={totalCount}
              onClick={onEmpleadoClick}
            />
          );
        })}
    </div>
  );
}

export default function MobileAsistenciaView({
  registros = [],
  data,
  mutate,
  fechaInicio,
  fechaFin,
  setFechaInicio,
  setFechaFin,
  filtroEmpleado,
  setFiltroEmpleado,
  filtroEstadoAsistencia,
  setFiltroEstadoAsistencia,
  filtroDepartamento,
  setFiltroDepartamento,
  soloPresentes,
  setSoloPresentes,
  page,
  setPage,
  limit,
  setLimit,
  empresaActiva,
  departamentos,
  abrirFormulario,
  isLoading,
  onResetFilters,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetalle, setShowDetalle] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  // Track last data update
  useEffect(() => {
    setLastUpdated(Date.now());
  }, [registros]);

  const today = dayjs().tz(DB_TZ).format("YYYY-MM-DD");
  const isToday = fechaInicio === today && fechaFin === today;
  const isSingleDay = fechaInicio === fechaFin;

  // Date header
  const fechaObj = fechaInicio
    ? dayjs.tz(fechaInicio, DB_TZ)
    : dayjs().tz(DB_TZ);
  const fechaFinObj = fechaFin ? dayjs.tz(fechaFin, DB_TZ) : dayjs().tz(DB_TZ);
  const diaNumero = fechaObj.date();
  const mesNombre = MESES_ES[fechaObj.month()];
  const año = fechaObj.year();
  const diaNombre = DIAS_ES[fechaObj.day()];
  // Range display helpers
  const startYear = fechaObj.year();
  const endYear = fechaFinObj.year();
  const rangoLabel =
    `${fechaObj.date()} ${MESES_ES[fechaObj.month()].slice(0, 3)}${
      startYear !== endYear ? ` ${startYear}` : ""
    } — ` +
    `${fechaFinObj.date()} ${MESES_ES[fechaFinObj.month()].slice(
      0,
      3,
    )} ${endYear}`;

  const handlePrevDay = () => {
    if (!isSingleDay) return;
    const prev = dayjs(fechaInicio).subtract(1, "day").format("YYYY-MM-DD");
    setFechaInicio(prev);
    setFechaFin(prev);
    setPage(1);
  };

  const handleNextDay = () => {
    if (!isSingleDay) return;
    const next = dayjs(fechaInicio).add(1, "day").format("YYYY-MM-DD");
    setFechaInicio(next);
    setFechaFin(next);
    setPage(1);
  };

  const handleGoToToday = () => {
    setFechaInicio(today);
    setFechaFin(today);
    setFiltroEstadoAsistencia("");
    setFiltroDepartamento([]);
    setSoloPresentes(false);
    setPage(1);
  };

  // Stats
  const totalEmpleados = data?.total_empleados ?? 0;
  const totalPresentes = data?.total_presentes ?? 0;
  const totalTardanzas = data?.total_tardanzas ?? 0;
  const totalAusencias = data?.total_ausencias ?? 0;

  const progressPresentes =
    totalEmpleados > 0 ? (totalPresentes / totalEmpleados) * 100 : 0;
  const progressTarde =
    totalEmpleados > 0 ? (totalTardanzas / totalEmpleados) * 100 : 0;

  // Local tab filtering (client-side, no API call)
  const displayedRegistros = useMemo(() => {
    if (activeTab === "all") return registros;
    if (activeTab === "Pendiente")
      return registros.filter(
        (r) => !r.estadoAsistencia || r.estadoAsistencia === "Pendiente",
      );
    if (activeTab === "Presente")
      return registros.filter((r) => r.estadoAsistencia === "Presente");
    return registros.filter((r) => r.estadoAsistencia === activeTab);
  }, [registros, activeTab]);

  // Grouped when tab === "all"
  const grouped = useMemo(() => {
    if (activeTab !== "all") return null;
    return {
      Presente: registros.filter((r) => r.estadoAsistencia === "Presente"),
      Tardanza: registros.filter((r) => r.estadoAsistencia === "Tardanza"),
      Pendiente: registros.filter(
        (r) => !r.estadoAsistencia || r.estadoAsistencia === "Pendiente",
      ),
      Ausente: registros.filter((r) => r.estadoAsistencia === "Ausente"),
    };
  }, [registros, activeTab]);

  // Tab counts — always from loaded registros so badges match what's visible in the list
  const tabCounts = useMemo(
    () => ({
      all: registros.length,
      Presente: registros.filter((r) => r.estadoAsistencia === "Presente")
        .length,
      Tardanza: registros.filter((r) => r.estadoAsistencia === "Tardanza")
        .length,
      Pendiente: registros.filter(
        (r) => !r.estadoAsistencia || r.estadoAsistencia === "Pendiente",
      ).length,
      Ausente: registros.filter((r) => r.estadoAsistencia === "Ausente").length,
    }),
    [registros],
  );

  // Active filter count for badge
  const activeFiltersCount = [
    filtroEstadoAsistencia,
    filtroDepartamento,
    soloPresentes,
    !isToday,
  ].filter(Boolean).length;

  const handleEmpleadoClick = (registro, index) => {
    setSelectedEmpleado(registro);
    setSelectedIndex(index);
    setShowDetalle(true);
  };

  // Pagination info
  const totalRegistros = data?.total ?? registros.length;
  const totalPages = limit > 0 ? Math.ceil(totalRegistros / limit) : 1;

  const isPast = fechaInicio < today;
  const isFuture = fechaInicio > today;

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* ─── Dark header ─── */}
      <div className="text-black px-4 pt-3 pb-4 shrink-0">
        {/* Company row */}
        <div className="mb-1">
          <h1 className="text-lg font-bold leading-tight">Asistencia</h1>
          <p className="text-xs uppercase tracking-wider">
            {totalEmpleados > 0 ? `${totalEmpleados} EMPLEADOS` : ""}
          </p>
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between bg-white/8 rounded-xl px-3 py-2 mt-2">
          {isSingleDay ? (
            <>
              <button
                onClick={handlePrevDay}
                className="p-1 px-3 py-1 font-bold shadow-2xl shadow-black border-2 rounded-lg cursor-pointer"
              >
                ‹
              </button>
              <div className="text-center flex-1 border-2 rounded-lg mx-5 px-3 flex justify-between">
                <div className="flex items-center p-3">
                  <span className="font-bold text-2xl">{diaNumero}</span>
                  <div className="flex flex-col justify-start px-2">
                    <span className="text-xs text-gray-500 text-left">
                      {mesNombre} {año}
                    </span>
                    <div className="font-bold text-left">
                      <span className="text-sm"> {diaNombre}</span>
                      {isToday && <span className="text-sm"> · Hoy</span>}
                    </div>
                  </div>
                </div>

                {!isToday && (
                  <button
                    onClick={handleGoToToday}
                    className="text-blue-600 font-medium flex items-center gap-1"
                  >
                    {isPast ? (
                      <>
                        Ir a hoy
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <ArrowLeft className="w-4 h-4" />
                        Ir a hoy
                      </>
                    )}
                  </button>
                )}

                {isToday && (
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 text-[10px] font-bold uppercase">
                      LIVE
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNextDay}
                  className="p-1 px-3 py-1 font-bold shadow-2xl shadow-black border-2 rounded-lg cursor-pointer"
                >
                  ›
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 text-center">
                <span className="text-sm font-semibold">{rangoLabel}</span>
              </div>
              <button
                onClick={handleGoToToday}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 text-white shrink-0 cursor-pointer"
              >
                × Hoy
              </button>
            </>
          )}
        </div>

        {/* Stats + progress — solo en vista de un día */}
        {isSingleDay && (
          <div className="bg-gray-900 py-3 rounded-2xl px-5 mt-2">
            <div className="flex justify-between mt-3 mb-2">
              <div className="text-center min-w-0 flex-1">
                <div className="flex items-center gap-1 justify-center mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                    Presentes
                  </span>
                </div>
                <div className="text-2xl font-bold text-white leading-tight">
                  {totalPresentes}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {totalEmpleados > 0
                    ? `↑${Math.min(
                        100,
                        Math.round((totalPresentes / totalEmpleados) * 100),
                      )}%`
                    : "—"}
                </div>
              </div>
              <div className="text-center min-w-0 flex-1">
                <div className="flex items-center gap-1 justify-center mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                    Tarde
                  </span>
                </div>
                <div className="text-2xl font-bold text-white leading-tight">
                  {totalTardanzas}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  tardanzas
                </div>
              </div>
              <div className="text-center min-w-0 flex-1">
                <div className="flex items-center gap-1 justify-center mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                    Pendiente
                  </span>
                </div>
                <div className="text-2xl font-bold text-white leading-tight">
                  {totalAusencias}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  sin checar
                </div>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden flex mt-1">
              <div
                className="h-full bg-green-400 transition-all duration-500"
                style={{ width: `${Math.min(100, progressPresentes)}%` }}
              />
              <div
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${Math.min(100, progressTarde)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Search + Filter ─── */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 shrink-0 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder={`Buscar ${totalEmpleados || ""} empleados...`}
            value={filtroEmpleado}
            onChange={(e) => {
              setFiltroEmpleado(e.target.value);
              setPage(1);
            }}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none min-w-0"
          />
          {filtroEmpleado && (
            <button
              onClick={() => {
                setFiltroEmpleado("");
                setPage(1);
              }}
              className="text-gray-400 text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className="relative p-2.5 bg-gray-900 rounded-xl text-white shrink-0 active:bg-gray-700"
        >
          <ListFilter className="w-4 h-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── Status tabs ─── */}
      <div className="bg-white border-b border-gray-100 shrink-0">
        <div className="flex overflow-x-auto scrollbar-hide px-4 gap-2 py-2">
          {TABS.map((tab) => {
            const count = tabCounts[tab.key] ?? 0;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0",
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-100",
                )}
              >
                {tab.dotClass && (
                  <span
                    className={cn("w-1.5 h-1.5 rounded-full", tab.dotClass)}
                  />
                )}
                {tab.label}

                <span
                  className={cn(
                    "ml-1 rounded-lg px-2 py-0.5",
                    isActive
                      ? "bg-gray-700 text-white"
                      : "bg-gray-200 text-gray-600",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── List ─── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && registros.length === 0 && (
          <div className="flex flex-col gap-3 p-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-white rounded-xl animate-pulse border border-gray-100"
              />
            ))}
          </div>
        )}

        {!isLoading && registros.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-sm font-medium">Sin registros</p>
            <p className="text-xs mt-1">Intenta con otros filtros</p>
          </div>
        )}

        {activeTab === "all" && grouped ? (
          <>
            <GrupoSection
              estado="Presente"
              registros={grouped.Presente}
              allRegistros={registros}
              totalCount={registros.length}
              onEmpleadoClick={handleEmpleadoClick}
            />
            <GrupoSection
              estado="Tardanza"
              registros={grouped.Tardanza}
              allRegistros={registros}
              totalCount={registros.length}
              onEmpleadoClick={handleEmpleadoClick}
            />
            <GrupoSection
              estado="Pendiente"
              registros={grouped.Pendiente}
              allRegistros={registros}
              totalCount={registros.length}
              onEmpleadoClick={handleEmpleadoClick}
            />
            <GrupoSection
              estado="Ausente"
              registros={grouped.Ausente}
              allRegistros={registros}
              totalCount={registros.length}
              onEmpleadoClick={handleEmpleadoClick}
            />
          </>
        ) : (
          displayedRegistros.map((reg, i) => (
            <EmpleadoCard
              key={reg.id ?? i}
              registro={reg}
              index={i}
              totalCount={displayedRegistros.length}
              onClick={handleEmpleadoClick}
            />
          ))
        )}

        {/* Spacer for bottom bar */}
        <div className="h-16" />
      </div>

      {/* ─── Bottom bar ─── */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-gray-400 leading-tight min-w-0">
          <span className="font-semibold text-gray-600">
            {totalRegistros} registros
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Anterior
              </button>

              <span className="text-xs">
                Pág. {page} / {totalPages}
              </span>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Siguiente
              </button>

              <button
                onClick={() => {
                  setPage(1);
                  setLimit(10000);
                }}
              >
                Ver todos
              </button>
            </div>
          )}
        </div>
        <button
          onClick={abrirFormulario}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-xl shrink-0 active:bg-gray-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Masivo
        </button>
      </div>

      {/* ─── Drawers ─── */}
      <MobileFiltersDrawer
        open={showFilters}
        onOpenChange={setShowFilters}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        setFechaInicio={setFechaInicio}
        setFechaFin={setFechaFin}
        filtroEstadoAsistencia={filtroEstadoAsistencia}
        setFiltroEstadoAsistencia={setFiltroEstadoAsistencia}
        filtroDepartamento={filtroDepartamento}
        setFiltroDepartamento={setFiltroDepartamento}
        soloPresentes={soloPresentes}
        setSoloPresentes={setSoloPresentes}
        setPage={setPage}
        data={data}
        departamentos={departamentos}
        onResetFilters={onResetFilters}
      />

      <MobileEmpleadoDetalle
        open={showDetalle}
        onOpenChange={setShowDetalle}
        registro={selectedEmpleado}
        currentIndex={selectedIndex}
        totalCount={registros.length}
        mutateAsistencia={mutate}
      />
    </div>
  );
}
