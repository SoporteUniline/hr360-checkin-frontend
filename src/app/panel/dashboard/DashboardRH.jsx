"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  AlarmClock,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Gift,
  LayoutDashboard,
  Minus,
  PartyPopper,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserMinus,
  Users,
  UsersRound,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import SystemMessageRenderer from "@/components/system-messages/SystemMessageRenderer";
import DashboardFilters from "./DashboardFilters";
import WeeklyTrend from "./WeeklyTrend";
import { buildQuery, previousRange, rangeFromPreset } from "./lib/periodos";
import {
  fmtDayMonthDeMX,
  formatDateDMY,
  getAnniversaryYears,
} from "./lib/format";

const hasOwn = (object, key) =>
  Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
const pick = (...values) =>
  values.find((value) => value !== undefined && value !== null);
const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number(value) || 0));

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function permissionStatus(permission) {
  return normalizeText(permission?.estado || permission?.status?.label);
}

function isPendingPermission(permission) {
  const status = permissionStatus(permission);
  return status.includes("pendiente") || status.includes("por aprobar");
}

function isActivePermission(permission) {
  const status = permissionStatus(permission);
  return (
    status === "aprobado" ||
    status === "activo" ||
    status === "en curso" ||
    status === "autorizado"
  );
}

function Delta({ current, previous, meaning = "neutral", suffix = "" }) {
  if (
    current === undefined ||
    current === null ||
    previous === undefined ||
    previous === null
  ) {
    return null;
  }

  const difference = Math.round((Number(current) - Number(previous)) * 10) / 10;
  const isUp = difference > 0;
  const isFlat = difference === 0;
  const isGood =
    isFlat || meaning === "neutral"
      ? null
      : meaning === "up"
        ? isUp
        : !isUp;
  const styles = isFlat || isGood === null
    ? "bg-slate-100 text-slate-500"
    : isGood
      ? "bg-emerald-50 text-emerald-700"
      : "bg-rose-50 text-rose-700";
  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${styles}`}
      title="Variación contra el periodo anterior"
    >
      <Icon className="size-3" />
      {isFlat ? "0" : `${isUp ? "+" : ""}${difference}`}
      {suffix}
    </span>
  );
}

function KpiCard({
  label,
  value,
  unit,
  helper,
  icon: Icon,
  tone = "blue",
  delta,
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <div className="flex min-h-[82px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:min-h-[112px] sm:flex-col sm:items-start sm:gap-2.5 sm:p-4 xl:min-h-[126px]">
      <div className="flex w-full items-center gap-3 sm:justify-between">
        <span
          className={`grid size-9 shrink-0 place-content-center rounded-xl ring-1 ${tones[tone]}`}
        >
          <Icon className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1 text-xs font-semibold text-slate-500 sm:hidden">
          {label}
        </span>
        <div className="flex items-center gap-1.5 sm:ml-auto">{delta}</div>
      </div>

      <div className="ml-auto text-right sm:ml-0 sm:text-left">
        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 sm:block">
          {label}
        </p>
        <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:mt-1 sm:text-[28px]">
          {value ?? "—"}
          {unit && (
            <span className="ml-1 text-xs font-semibold text-slate-400">
              {unit}
            </span>
          )}
        </p>
        <p className="mt-0.5 max-w-[150px] truncate text-[10px] text-slate-400 sm:text-[11px]">
          {helper}
        </p>
      </div>
    </div>
  );
}

function Section({ title, description, icon: Icon, action, children, className = "" }) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        {Icon && (
          <span className="mt-0.5 grid size-8 shrink-0 place-content-center rounded-xl bg-blue-50 text-blue-600">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-[15px]">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">
              {description}
            </p>
          )}
        </div>
        {action}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function SectionLink({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50"
    >
      {children} <ArrowRight className="size-3" />
    </Link>
  );
}

function EmptyState({ children, positive = false }) {
  return (
    <div
      className={`flex min-h-24 items-center justify-center rounded-xl border border-dashed px-4 text-center text-xs ${
        positive
          ? "border-emerald-200 bg-emerald-50/60 text-emerald-700"
          : "border-slate-200 bg-slate-50/60 text-slate-400"
      }`}
    >
      {positive && <CheckCircle2 className="mr-2 size-4" />}
      {children}
    </div>
  );
}

function AttentionCard({ item }) {
  const styles = {
    amber: "border-amber-200 bg-amber-50/70 text-amber-700",
    rose: "border-rose-200 bg-rose-50/70 text-rose-700",
    violet: "border-violet-200 bg-violet-50/70 text-violet-700",
    blue: "border-blue-200 bg-blue-50/70 text-blue-700",
  };
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group flex min-h-[76px] items-center gap-3 rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${styles[item.tone]}`}
    >
      <span className="grid size-9 shrink-0 place-content-center rounded-xl bg-white/80">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold leading-none tabular-nums">{item.count}</p>
        <p className="mt-1 truncate text-xs font-semibold">{item.label}</p>
        <p className="truncate text-[10px] opacity-75">{item.hint}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function HorizontalBars({ items, percent = false }) {
  const max = percent
    ? 100
    : Math.max(1, ...items.map((item) => Number(item.value) || 0));

  return (
    <div className="space-y-3.5">
      {items.slice(0, 8).map((item, index) => {
        const value = Number(item.value) || 0;
        const width = clamp((value / max) * 100);
        return (
          <div key={`${item.name}-${index}`}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-slate-600">{item.name}</span>
              <span className="shrink-0 font-bold text-slate-800 tabular-nums">
                {value}{percent ? "%" : ""}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${item.color || "bg-blue-500"}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IncidentRanking({ items }) {
  const ranked = items
    .map((item) => ({
      ...item,
      total: (Number(item.faltas) || 0) + (Number(item.tardanzas) || 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="divide-y divide-slate-100">
      {ranked.map((item, index) => (
        <div key={`${item.departamento}-${index}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className={`grid size-7 shrink-0 place-content-center rounded-lg text-[11px] font-bold ${
            index === 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
          }`}>
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-700">
              {item.departamento || item.nombre || "Sin departamento"}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {item.faltas || 0} faltas · {item.tardanzas || 0} tardanzas
            </p>
          </div>
          <span className="text-sm font-bold text-rose-600 tabular-nums">
            {item.total}
          </span>
        </div>
      ))}
    </div>
  );
}

function CompactList({ rows, type }) {
  const isDocument = type === "document";
  return (
    <div className="divide-y divide-slate-100">
      {rows.slice(0, 5).map((row, index) => {
        const days = row.dias_restantes ?? row.diasRestantes;
        return (
          <div key={`${row.id || row.nombre_empleado}-${index}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className={`grid size-8 shrink-0 place-content-center rounded-xl ${
              days != null && days <= 7
                ? "bg-rose-50 text-rose-600"
                : "bg-amber-50 text-amber-600"
            }`}>
              {isDocument ? <FileCheck2 className="size-4" /> : <BriefcaseBusiness className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700">
                {row.nombre_empleado || "Empleado"}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {isDocument
                  ? row.documento || "Documento"
                  : row.tipo_contrato || row.tipo || "Contrato"}
                {row.fecha_vencimiento
                  ? ` · ${formatDateDMY(row.fecha_vencimiento)}`
                  : ""}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
              days != null && days <= 7
                ? "bg-rose-50 text-rose-700"
                : "bg-amber-50 text-amber-700"
            }`}>
              {days == null ? row.estado || "Vigente" : `${days} días`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EventList({ rows, kind, referenceDate }) {
  const isBirthday = kind === "birthday";
  return (
    <div className="divide-y divide-slate-100">
      {rows.slice(0, 5).map((row, index) => {
        const date = isBirthday ? row.fecha_nacimiento : row.fecha_ingreso;
        const years = isBirthday ? null : getAnniversaryYears(date, referenceDate);
        return (
          <div key={`${kind}-${row.id_empleado || index}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className={`grid size-9 shrink-0 place-content-center rounded-xl text-xs font-bold ${
              isBirthday
                ? "bg-amber-50 text-amber-700"
                : "bg-blue-50 text-blue-700"
            }`}>
              {String(date || "").slice(8, 10) || "—"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700">
                {row.nombre_empleado}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {isBirthday
                  ? row.nombre_empresa || fmtDayMonthDeMX(date)
                  : `${years} año${years === 1 ? "" : "s"} · ${fmtDayMonthDeMX(date)}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RotationSummary({ data }) {
  const net = Number(data.plantillaNeta) || 0;
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="rounded-xl bg-emerald-50 p-3">
        <p className="text-[10px] font-semibold uppercase text-emerald-600">Altas</p>
        <p className="mt-1 text-xl font-bold text-emerald-700 tabular-nums">
          +{data.altas || 0}
        </p>
      </div>
      <div className="rounded-xl bg-rose-50 p-3">
        <p className="text-[10px] font-semibold uppercase text-rose-600">Bajas</p>
        <p className="mt-1 text-xl font-bold text-rose-700 tabular-nums">
          {data.bajas || 0}
        </p>
      </div>
      <div className="rounded-xl bg-slate-50 p-3">
        <p className="text-[10px] font-semibold uppercase text-slate-400">Rotación</p>
        <p className="mt-1 text-xl font-bold text-slate-800 tabular-nums">
          {data.rotacionPct ?? 0}%
        </p>
      </div>
      <div className="rounded-xl bg-blue-50 p-3">
        <p className="text-[10px] font-semibold uppercase text-blue-500">Plantilla neta</p>
        <p className="mt-1 text-xl font-bold text-blue-700 tabular-nums">
          {net >= 0 ? "+" : ""}{net}
        </p>
      </div>
    </div>
  );
}

function Heatmap({ data }) {
  const days = data.dias || [];
  const units = data.unidades || [];
  const values = data.valores || [];
  const columns = `120px repeat(${days.length}, minmax(32px, 1fr))`;
  const color = (value) => {
    const percentage = clamp(value);
    if (percentage >= 90) return "bg-emerald-500 text-white";
    if (percentage >= 80) return "bg-emerald-200 text-emerald-900";
    if (percentage >= 65) return "bg-amber-200 text-amber-900";
    return "bg-rose-200 text-rose-900";
  };

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[520px] space-y-1.5">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: columns }}>
          <span />
          {days.map((day, index) => (
            <span key={`${day}-${index}`} className="text-center text-[10px] font-semibold text-slate-400">
              {day}
            </span>
          ))}
        </div>
        {units.slice(0, 8).map((unit, rowIndex) => (
          <div key={`${unit}-${rowIndex}`} className="grid items-center gap-1.5" style={{ gridTemplateColumns: columns }}>
            <span className="truncate text-[11px] font-medium text-slate-600" title={unit}>
              {unit}
            </span>
            {days.map((_, columnIndex) => {
              const value = values[rowIndex]?.[columnIndex] ?? 0;
              return (
                <span
                  key={`${rowIndex}-${columnIndex}`}
                  className={`grid h-7 place-content-center rounded-md text-[9px] font-bold ${color(value)}`}
                  title={`${unit}: ${Math.round(value)}%`}
                >
                  {Math.round(value)}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { href: "/panel/empleados", label: "Empleados", icon: UsersRound },
  { href: "/panel/registro-asistencia", label: "Asistencia", icon: UserCheck },
  { href: "/panel/permisos", label: "Permisos", icon: CalendarCheck2 },
  { href: "/panel/reporte-horas", label: "Reportes", icon: BarChart3 },
  { href: "/panel/contratos", label: "Contratos", icon: FileText },
];

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="group flex min-h-14 items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <span className="grid size-8 shrink-0 place-content-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-white group-hover:text-blue-600">
            <Icon className="size-4" />
          </span>
          {label}
          <ArrowRight className="ml-auto size-3.5 opacity-30" />
        </Link>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1480px] animate-pulse space-y-4">
      <div className="h-20 rounded-2xl bg-slate-100" />
      <div className="h-24 rounded-2xl bg-slate-100" />
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-24 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-slate-100" />
    </div>
  );
}

export default function DashboardRH() {
  const { dataUser, isAuthChecked } = useAuth();
  const [filters, setFilters] = useState({
    preset: "7d",
    custom: {},
    compare: true,
    id_empresa: "all",
    id_sucursal: "all",
    id_sucursal_option: "all",
    id_departamento: "all",
  });

  const range = useMemo(
    () => rangeFromPreset(filters.preset, filters.custom),
    [filters.preset, filters.custom],
  );
  const previous = useMemo(() => previousRange(range), [range]);
  const companies = dataUser?.empresas_detalle || [];
  const canSelectAllCompanies = companies.length > 1;
  const idEmpresa =
    filters.id_empresa !== "all"
      ? filters.id_empresa
      : canSelectAllCompanies
        ? null
        : dataUser?.id_empresa || companies[0]?.id_empresa || null;

  const queryParams = {
    fechaInicio: range.fechaInicio,
    fechaFin: range.fechaFin,
    id_empresa: idEmpresa || "all",
    id_sucursal: filters.id_sucursal,
    id_departamento: filters.id_departamento,
    ...(filters.compare !== false
      ? {
          fechaInicioPrev: previous.fechaInicioPrev,
          fechaFinPrev: previous.fechaFinPrev,
        }
      : {}),
  };

  // No se consulta hasta que el contexto autenticado determine el alcance de empresa.
  const dashboardKey =
    isAuthChecked && dataUser
      ? `/checador/dashboard${buildQuery(queryParams)}`
      : null;
  const {
    data: response,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(dashboardKey, fetcherWithToken, {
    ...swr_config,
    keepPreviousData: true,
  });

  const responseFailed = response?.ok === false;
  const data = responseFailed
    ? null
    : response?.data || (response && !hasOwn(response, "ok") ? response : null);

  if (!isAuthChecked || (isLoading && !data)) return <DashboardSkeleton />;

  if (error || responseFailed || !data) {
    return (
      <div className="mx-auto w-full max-w-[1480px] space-y-4">
        <DashboardFilters value={filters} onChange={setFilters} />
        <div className="rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-content-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="size-6" />
          </span>
          <h1 className="mt-3 text-base font-semibold text-slate-900">
            No fue posible actualizar el dashboard
          </h1>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Revisa la conexión o restablece los filtros. La unidad de negocio ahora se envía con su identificador correcto.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => setFilters({
              preset: "7d",
              custom: {},
              compare: true,
              id_empresa: "all",
              id_sucursal: "all",
              id_sucursal_option: "all",
              id_departamento: "all",
            })}>
              Restablecer filtros
            </Button>
            <Button onClick={() => mutate()} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="size-4" /> Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalEmployees = Number(pick(data.totalEmpleados, 0));
  const present = Number(pick(data.presentes, data.presentesHoy, 0));
  const late = Number(pick(data.tardanzas, data.tardanzasHoy, 0));
  const absent = Number(pick(data.ausentes, data.ausentesHoy, 0));
  const trend = Array.isArray(data.tendenciaSemanal) ? data.tendenciaSemanal : [];

  const fallbackAttendancePct = (() => {
    if (totalEmployees <= 0) return null;
    if (trend.length) {
      const validDays = trend.filter((day) => day.asistencias != null);
      if (!validDays.length) return null;
      return Math.round(
        validDays.reduce(
          (sum, day) => sum + clamp((Number(day.asistencias) / totalEmployees) * 100),
          0,
        ) / validDays.length,
      );
    }
    if (range.fechaInicio === range.fechaFin) {
      return Math.round(clamp((present / totalEmployees) * 100));
    }
    return null;
  })();
  const attendancePct = pick(data.asistenciaPromedioPct, fallbackAttendancePct);

  const permissions = Array.isArray(data.permisosRangos) ? data.permisosRangos : [];
  const activePermissions = permissions.filter(isActivePermission);
  const pendingPermissions = permissions.filter(isPendingPermission);
  const previousData = filters.compare !== false ? data.periodoAnterior || {} : {};

  const distribution = Array.isArray(data.distribucionAsistenciaDetallada)
    ? data.distribucionAsistenciaDetallada
    : Array.isArray(data.distribucionAsistencia)
      ? data.distribucionAsistencia
      : [];
  const departmentAttendance = Array.isArray(data.asistenciaPorDepartamento)
    ? data.asistenciaPorDepartamento
    : [];
  const departmentIncidents = Array.isArray(data.incidenciasPorDepartamento)
    ? data.incidenciasPorDepartamento
    : [];
  const headcount = Array.isArray(data.distribucionPorDepartamento)
    ? data.distribucionPorDepartamento
    : [];

  const contractsAvailable = hasOwn(data, "contratosPorVencer");
  const documentsAvailable = hasOwn(data, "documentosPorVencer");
  const rotationAvailable = hasOwn(data, "rotacion") && data.rotacion;
  const contracts = Array.isArray(data.contratosPorVencer)
    ? data.contratosPorVencer
    : [];
  const documents = Array.isArray(data.documentosPorVencer)
    ? data.documentosPorVencer
    : [];
  const missingCheckinsAvailable = hasOwn(data, "sinChecarCount") || hasOwn(data, "sinChecar");
  const missingCheckins = Number(
    pick(data.sinChecarCount, Array.isArray(data.sinChecar) ? data.sinChecar.length : 0),
  );

  const birthdays = Array.isArray(data.cumpleanosMes) ? data.cumpleanosMes : [];
  const anniversaries = (Array.isArray(data.aniversariosMes) ? data.aniversariosMes : []).filter(
    (anniversary) => getAnniversaryYears(anniversary.fecha_ingreso, range.fechaFin) >= 1,
  );
  const monthLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${range.fechaFin}T00:00:00Z`));

  const attentionItems = [
    pendingPermissions.length > 0 && {
      count: pendingPermissions.length,
      label: "Permisos pendientes",
      hint: "Requieren aprobación",
      href: "/panel/permisos",
      icon: CalendarCheck2,
      tone: "violet",
    },
    contractsAvailable && contracts.length > 0 && {
      count: contracts.length,
      label: "Contratos por vencer",
      hint: `${contracts.filter((contract) => (contract.dias_restantes ?? contract.diasRestantes ?? 99) <= 7).length} vencen en 7 días`,
      href: "/panel/contratos",
      icon: BriefcaseBusiness,
      tone: "amber",
    },
    documentsAvailable && documents.length > 0 && {
      count: documents.length,
      label: "Documentos por vencer",
      hint: "Revisar vigencias",
      href: "/panel/gestion-documental/documentos",
      icon: FileCheck2,
      tone: "blue",
    },
    missingCheckinsAvailable && missingCheckins > 0 && {
      count: missingCheckins,
      label: "Registros sin checar",
      hint: "Validar incidencias",
      href: "/panel/registro-asistencia",
      icon: XCircle,
      tone: "rose",
    },
  ].filter(Boolean);

  const dataSourcesAvailable = [
    true,
    contractsAvailable,
    documentsAvailable,
    missingCheckinsAvailable,
  ].filter(Boolean).length;

  return (
    <main className="mx-auto w-full max-w-[1480px] space-y-4 pb-8">
      <SystemMessageRenderer tipo="interna" contexto="dashboard" />

      <header className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/50 to-violet-50/70 p-4 shadow-sm sm:p-5">
        <div className="absolute -right-16 -top-20 size-48 rounded-full bg-blue-200/25 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="hidden size-11 shrink-0 place-content-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-200 sm:grid">
            <LayoutDashboard className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Resumen de Recursos Humanos
              </h1>
              <span className="rounded-full border border-blue-100 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                ADAMIA
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Indicadores, pendientes y comportamiento del personal en una sola vista.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isValidating}
            className="shrink-0 gap-1.5 bg-white/80"
          >
            <RefreshCw className={`size-3.5 ${isValidating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </header>

      <DashboardFilters value={filters} onChange={setFilters} />

      {isValidating && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
          <RefreshCw className="size-3.5 animate-spin" />
          Actualizando resultados para los filtros seleccionados…
        </div>
      )}

      <section aria-busy={isValidating} className={isValidating ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Indicadores principales
          </h2>
          {filters.compare !== false && hasOwn(data, "periodoAnterior") && (
            <span className="text-[10px] text-slate-400">vs. periodo anterior</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Total empleados"
            value={totalEmployees}
            helper="Personal activo"
            icon={UsersRound}
            tone="blue"
            delta={<Delta current={totalEmployees} previous={previousData.totalEmpleados} />}
          />
          <KpiCard
            label="Presentes"
            value={present}
            helper={attendancePct != null ? `${Math.round(attendancePct)}% de asistencia` : "Periodo seleccionado"}
            icon={UserCheck}
            tone="emerald"
            delta={<Delta current={present} previous={previousData.presentes} meaning="up" />}
          />
          <KpiCard
            label="Tardanzas"
            value={late}
            helper={data.tardanzasPctSobreRegistros != null ? `${Math.round(data.tardanzasPctSobreRegistros)}% de registros` : "Incidencias del periodo"}
            icon={AlarmClock}
            tone="amber"
            delta={<Delta current={late} previous={previousData.tardanzas} meaning="down" />}
          />
          <KpiCard
            label="Ausencias"
            value={absent}
            helper={data.sinChecarPct != null ? `${Math.round(data.sinChecarPct)}% del total` : "Faltas registradas"}
            icon={UserMinus}
            tone="rose"
            delta={<Delta current={absent} previous={previousData.ausentes} meaning="down" />}
          />
          <KpiCard
            label="Permisos activos"
            value={activePermissions.length}
            helper={pendingPermissions.length ? `${pendingPermissions.length} pendientes` : "Sin solicitudes pendientes"}
            icon={CalendarCheck2}
            tone="violet"
            delta={<Delta current={activePermissions.length} previous={previousData.permisosActivos} />}
          />
          <KpiCard
            label="Promedio de horas"
            value={data.promedioHoras ?? "—"}
            unit={data.promedioHoras != null ? "h" : ""}
            helper="Jornada efectiva"
            icon={Clock3}
            tone="slate"
            delta={<Delta current={data.promedioHoras} previous={previousData.promedioHoras} />}
          />
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-3.5 text-violet-500" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Requiere atención
          </h2>
        </div>
        {attentionItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {attentionItems.map((item) => (
              <AttentionCard key={item.label} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-700">
            <span className="grid size-9 shrink-0 place-content-center rounded-xl bg-white/80">
              <CheckCircle2 className="size-4.5" />
            </span>
            <div>
              <p className="text-xs font-semibold">Sin pendientes críticos en la información disponible</p>
              <p className="mt-0.5 text-[10px] opacity-75">
                {dataSourcesAvailable < 4
                  ? "Se muestran únicamente las fuentes integradas por el backend."
                  : "Todos los indicadores operativos están al corriente."}
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Tendencia de asistencia"
          description="Personas presentes por día; las incidencias se resumen por separado."
          icon={BarChart3}
          className="lg:col-span-2"
          action={<SectionLink href="/panel/reporte-horas">Ver reporte</SectionLink>}
        >
          {trend.length ? (
            <WeeklyTrend data={trend} />
          ) : (
            <EmptyState>No hay tendencia disponible para este periodo.</EmptyState>
          )}
        </Section>

        <Section
          title="Distribución de registros"
          description="Composición de las incidencias capturadas."
          icon={LayoutDashboard}
          action={<SectionLink href="/panel/registro-asistencia">Ver detalle</SectionLink>}
        >
          {distribution.some((item) => Number(item.count) > 0) ? (
            <HorizontalBars
              items={distribution
                .filter((item) => Number(item.count) > 0)
                .map((item, index) => ({
                  name: item.label || item.key,
                  value: item.count,
                  color: ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500"][index % 5],
                }))}
            />
          ) : (
            <EmptyState>No hay registros para mostrar.</EmptyState>
          )}
        </Section>
      </div>

      {(departmentAttendance.length > 0 || departmentIncidents.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {departmentAttendance.length > 0 && (
            <Section
              title="Asistencia por departamento"
              description="Porcentaje de cumplimiento del periodo seleccionado."
              icon={Building2}
            >
              <HorizontalBars
                percent
                items={departmentAttendance.map((department) => {
                  const value = Math.round(department.pct ?? department.porcentaje ?? 0);
                  return {
                    name: department.departamento || department.nombre,
                    value,
                    color: value >= 90 ? "bg-emerald-500" : value >= 80 ? "bg-amber-500" : "bg-rose-500",
                  };
                })}
              />
            </Section>
          )}

          {departmentIncidents.length > 0 && (
            <Section
              title="Departamentos con más incidencias"
              description="Prioriza las áreas con faltas y tardanzas acumuladas."
              icon={ShieldAlert}
              action={<SectionLink href="/panel/registro-asistencia">Revisar</SectionLink>}
            >
              <IncidentRanking items={departmentIncidents} />
            </Section>
          )}
        </div>
      )}

      {data.heatmapUnidad?.unidades?.length > 0 && (
        <Section
          title="Asistencia por día y unidad"
          description="Comparativo porcentual entre unidades de negocio."
          icon={Building2}
        >
          <Heatmap data={data.heatmapUnidad} />
        </Section>
      )}

      {(headcount.length > 0 || rotationAvailable) && (
        <div className="grid gap-4 lg:grid-cols-3">
          {headcount.length > 0 && (
            <Section
              title="Distribución de la plantilla"
              description="Personal activo por departamento."
              icon={Users}
              className={rotationAvailable ? "lg:col-span-2" : "lg:col-span-3"}
              action={<SectionLink href="/panel/empleados">Ver empleados</SectionLink>}
            >
              <HorizontalBars
                items={headcount.map((department, index) => ({
                  name: department.departamento || department.nombre,
                  value: department.count ?? department.total ?? 0,
                  color: index % 2 ? "bg-violet-500" : "bg-blue-500",
                }))}
              />
            </Section>
          )}
          {rotationAvailable && (
            <Section
              title="Movimiento de personal"
              description="Altas, bajas y variación de plantilla."
              icon={RefreshCw}
            >
              <RotationSummary data={data.rotacion} />
            </Section>
          )}
        </div>
      )}

      {(contractsAvailable || documentsAvailable) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {contractsAvailable && (
            <Section
              title="Contratos próximos a vencer"
              description="Próximos vencimientos que requieren seguimiento."
              icon={BriefcaseBusiness}
              action={<SectionLink href="/panel/contratos">Ver todos</SectionLink>}
            >
              {contracts.length ? (
                <CompactList rows={contracts} type="contract" />
              ) : (
                <EmptyState positive>No hay contratos próximos a vencer.</EmptyState>
              )}
            </Section>
          )}
          {documentsAvailable && (
            <Section
              title="Documentos próximos a vencer"
              description="Vigencias registradas en el expediente del personal."
              icon={FileCheck2}
              action={<SectionLink href="/panel/gestion-documental/documentos">Ver todos</SectionLink>}
            >
              {documents.length ? (
                <CompactList rows={documents} type="document" />
              ) : (
                <EmptyState positive>No hay documentos próximos a vencer.</EmptyState>
              )}
            </Section>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Permisos del periodo"
          description="Solicitudes activas y pendientes de resolución."
          icon={CalendarCheck2}
          action={<SectionLink href="/panel/permisos">Gestionar</SectionLink>}
        >
          {permissions.length ? (
            <div className="space-y-2.5">
              {permissions.slice(0, 5).map((permission, index) => {
                const pending = isPendingPermission(permission);
                const active = isActivePermission(permission);
                const days = permission.inicio && permission.fin
                  ? Math.max(
                      1,
                      Math.round(
                        (new Date(`${permission.fin}T00:00:00Z`) -
                          new Date(`${permission.inicio}T00:00:00Z`)) /
                          86400000,
                      ) + 1,
                    )
                  : null;
                return (
                  <div key={`${permission.id_permiso || index}`} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                    <span className={`grid size-8 shrink-0 place-content-center rounded-lg ${
                      pending
                        ? "bg-amber-100 text-amber-700"
                        : active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-500"
                    }`}>
                      <CalendarDays className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-700">
                        {permission.nombre_empleado}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {permission.tipo || "Permiso"}
                        {days ? ` · ${days} día${days === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                      pending
                        ? "bg-amber-100 text-amber-700"
                        : active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                    }`}>
                      {permission.estado || permission.status?.label || "Sin estado"}
                    </span>
                  </div>
                );
              })}
              {permissions.length > 5 && (
                <p className="text-center text-[10px] text-slate-400">
                  +{permissions.length - 5} permisos adicionales
                </p>
              )}
            </div>
          ) : (
            <EmptyState positive>No hay permisos en el periodo.</EmptyState>
          )}
        </Section>

        <Section
          title={`Cumpleaños de ${monthLabel}`}
          description="Próximas celebraciones del personal."
          icon={Gift}
        >
          {birthdays.length ? (
            <EventList rows={birthdays} kind="birthday" referenceDate={range.fechaFin} />
          ) : (
            <EmptyState>No hay cumpleaños registrados.</EmptyState>
          )}
        </Section>

        <Section
          title={`Aniversarios de ${monthLabel}`}
          description="Antigüedad laboral del personal."
          icon={PartyPopper}
        >
          {anniversaries.length ? (
            <EventList rows={anniversaries} kind="anniversary" referenceDate={range.fechaFin} />
          ) : (
            <EmptyState>No hay aniversarios registrados.</EmptyState>
          )}
        </Section>
      </div>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-3.5 text-blue-500" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Accesos rápidos
          </h2>
        </div>
        <QuickActions />
      </section>
    </main>
  );
}
