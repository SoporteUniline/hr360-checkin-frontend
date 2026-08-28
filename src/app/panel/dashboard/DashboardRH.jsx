"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import dayjs from "dayjs";
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
  CalendarRange,
  ChartNoAxesCombined,
  CheckCircle2,
  FileCheck2,
  FileText,
  Gift,
  Home,
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
import PermisosCalendario from "../permisos/PermisosCalendario";
import { buildQuery, previousRange, rangeFromPreset } from "./lib/periodos";
import {
  fmtDayMonthDeMX,
  formatDateDMY,
  formatTimeMexico,
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

function isPermissionOngoing(permission, reference = dayjs()) {
  if (!isActivePermission(permission)) return false;
  const start = permission?.inicio || permission?.fecha_inicio;
  const end = permission?.fin || permission?.fecha_fin || start;
  if (!start || !end || !dayjs(start).isValid() || !dayjs(end).isValid()) {
    return true;
  }
  const day = dayjs(reference).startOf("day");
  return !day.isBefore(dayjs(start).startOf("day")) && !day.isAfter(dayjs(end).endOf("day"));
}

function employeeName(row) {
  return (
    row?.nombre_empleado ||
    [row?.nombre, row?.apellido_paterno, row?.apellido_materno]
      .filter(Boolean)
      .join(" ") ||
    "Empleado"
  );
}

function personKey(row, fallback = "") {
  const id = row?.id_empleado ?? row?.empleado_id;
  if (id !== undefined && id !== null) return `id:${id}`;
  return `name:${normalizeText(employeeName(row)) || fallback}`;
}

function isVacationPermission(permission) {
  return normalizeText(permission?.tipo).includes("vacacion");
}

function uniquePeople(rows = []) {
  const people = new Map();
  rows.forEach((row, index) => {
    const key = personKey(row, index);
    if (!people.has(key)) people.set(key, row);
  });
  return Array.from(people.values());
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

const DASHBOARD_VIEWS = [
  { key: "inicio", label: "Operación de hoy", icon: Home },
  { key: "ausencias", label: "Ausencias y calendario", icon: CalendarRange },
];

function DashboardViewTabs({ value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Vistas de Inicio"
      className="flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:thin]"
    >
      {DASHBOARD_VIEWS.map(({ key, label, icon: Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition sm:px-4 ${
              active
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:border-blue-200 hover:text-blue-600"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function AnalyticsMetric({ label, value, helper, icon: Icon, delta, negative = false }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
          {label}
        </p>
        <span className="grid size-8 place-content-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <div className="mt-1 flex min-h-5 flex-wrap items-center gap-2">
        <p className="text-[10px] leading-relaxed text-slate-400">{helper}</p>
        {delta && (
          typeof delta === "string" ? (
            <span className={`text-[10px] font-semibold ${negative ? "text-rose-600" : "text-emerald-600"}`}>
              {delta}
            </span>
          ) : delta
        )}
      </div>
    </div>
  );
}

function AnalyticsNarrative({ stories }) {
  return (
    <section className="rounded-2xl bg-blue-600 p-4 text-white shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4" />
          <h2 className="text-sm font-semibold">La historia de este periodo</h2>
        </div>
        <span className="text-[10px] text-blue-100">Calculada con los filtros seleccionados</span>
      </div>
      <div className="grid gap-2.5 lg:grid-cols-3">
        {stories.map((story) => (
          <article
            key={story.label}
            className="rounded-xl border border-white/20 bg-white/10 p-3.5"
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-blue-100">
              {story.label}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-white">{story.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AttendanceDistribution({ items }) {
  const palette = [
    "bg-blue-600",
    "bg-cyan-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-emerald-500",
  ];
  const rows = items
    .filter((item) => Number(item.count) > 0)
    .map((item, index) => ({
      ...item,
      count: Number(item.count) || 0,
      color: palette[index % palette.length],
    }));
  const total = rows.reduce((sum, item) => sum + item.count, 0);

  if (!total) return <EmptyState>No hay registros para mostrar.</EmptyState>;

  return (
    <div>
      <div
        className="flex h-4 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`Distribución de ${total} registros`}
      >
        {rows.map((item) => (
          <span
            key={item.key || item.label}
            className={item.color}
            style={{ width: `${(item.count / total) * 100}%` }}
            title={`${item.label || item.key}: ${item.count}`}
          />
        ))}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {rows.slice(0, 8).map((item) => (
          <div key={item.key || item.label} className="flex items-center gap-2 text-xs">
            <span className={`size-2 shrink-0 rounded-full ${item.color}`} />
            <span className="min-w-0 flex-1 truncate text-slate-500">
              {item.label || item.key}
            </span>
            <span className="font-semibold text-slate-800 tabular-nums">{item.count}</span>
            <span className="w-9 text-right text-[10px] text-slate-400 tabular-nums">
              {Math.round((item.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepartmentLollipop({ items }) {
  const rows = items
    .map((item) => ({
      name: item.departamento || item.nombre || "Sin departamento",
      value: clamp(item.pct ?? item.porcentaje),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (!rows.length) return <EmptyState>No hay datos por departamento.</EmptyState>;

  return (
    <div className="space-y-3.5">
      {rows.map((row) => (
        <div key={row.name} className="grid grid-cols-[minmax(88px,150px)_1fr_38px] items-center gap-3">
          <span className="truncate text-[11px] font-medium text-slate-600" title={row.name}>
            {row.name}
          </span>
          <div className="relative h-1.5 rounded-full bg-slate-100">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-blue-200"
              style={{ width: `${row.value}%` }}
            />
            <span
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-sm"
              style={{ left: `${Math.max(2, row.value)}%` }}
            />
          </div>
          <span className="text-right text-xs font-bold text-slate-800 tabular-nums">
            {Math.round(row.value)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function WorkforceWaterfall({ data, totalEmployees }) {
  if (!data) return <EmptyState>No hay información de altas y bajas.</EmptyState>;

  const hires = Number(data.altas) || 0;
  const exits = Number(data.bajas) || 0;
  const net = Number.isFinite(Number(data.plantillaNeta))
    ? Number(data.plantillaNeta)
    : hires - exits;
  const initial = Number(data.plantillaAnterior) || Math.max(0, totalEmployees - net);
  const final = totalEmployees || Math.max(0, initial + net);
  const max = Math.max(1, initial, final, hires * 4, exits * 4);
  const height = (value, minimum = 12) => `${Math.max(minimum, (value / max) * 100)}%`;

  const bars = [
    { label: "Inicio", value: initial, visual: initial, color: "bg-blue-600" },
    { label: "Altas", value: `+${hires}`, visual: hires * 4, color: "bg-emerald-500" },
    { label: "Bajas", value: `−${exits}`, visual: exits * 4, color: "bg-rose-500" },
    { label: "Cambio neto", value: `${net >= 0 ? "+" : ""}${net}`, visual: Math.abs(net) * 4, color: net >= 0 ? "bg-cyan-500" : "bg-amber-500" },
    { label: "Cierre", value: final, visual: final, color: "bg-blue-700" },
  ];

  return (
    <div>
      <div className="grid h-44 grid-cols-5 items-end gap-2 border-b border-slate-200 px-1 pt-3">
        {bars.map((bar) => (
          <div key={bar.label} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5">
            <span className="text-[11px] font-bold text-slate-800 tabular-nums">{bar.value}</span>
            <span
              className={`w-full max-w-12 rounded-t-md ${bar.color}`}
              style={{ height: height(bar.visual) }}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2 px-1 pt-2 text-center text-[9px] leading-tight text-slate-400">
        {bars.map((bar) => <span key={bar.label}>{bar.label}</span>)}
      </div>
    </div>
  );
}

function ContractProjection({ rows, available }) {
  if (!available) {
    return <EmptyState>El servicio todavía no entregó vencimientos de contratos.</EmptyState>;
  }
  if (!rows.length) {
    return <EmptyState positive>No hay contratos próximos a vencer.</EmptyState>;
  }

  const buckets = [
    {
      label: "Vencidos",
      count: rows.filter((row) => (getContractDays(row) ?? 1) < 0).length,
      color: "bg-rose-500",
      text: "text-rose-700",
    },
    {
      label: "Próximos 7 días",
      count: rows.filter((row) => {
        const days = getContractDays(row);
        return days != null && days >= 0 && days <= 7;
      }).length,
      color: "bg-amber-500",
      text: "text-amber-700",
    },
    {
      label: "8 a 30 días",
      count: rows.filter((row) => {
        const days = getContractDays(row);
        return days != null && days > 7 && days <= 30;
      }).length,
      color: "bg-blue-600",
      text: "text-blue-700",
    },
  ];
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return (
    <div>
      <div className="grid h-40 grid-cols-3 items-end gap-4 border-b border-slate-200 px-3 pt-2">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex h-full flex-col items-center justify-end gap-2">
            <span className={`text-lg font-bold tabular-nums ${bucket.text}`}>{bucket.count}</span>
            <span
              className={`w-full max-w-16 rounded-t-lg ${bucket.color}`}
              style={{ height: `${Math.max(8, (bucket.count / max) * 78)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 px-1 pt-2 text-center text-[9px] leading-tight text-slate-400">
        {buckets.map((bucket) => <span key={bucket.label}>{bucket.label}</span>)}
      </div>
    </div>
  );
}

function getContractDays(contract) {
  const explicit = contract?.dias_restantes ?? contract?.diasRestantes;
  if (explicit !== undefined && explicit !== null && explicit !== "") {
    const parsed = Number(explicit);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const expiration =
    contract?.fecha_vencimiento || contract?.fecha_fin || contract?.fechaFin;
  if (!expiration || !dayjs(expiration).isValid()) return null;
  return dayjs(expiration).startOf("day").diff(dayjs().startOf("day"), "day");
}

function contractDeadlineLabel(days) {
  if (days == null) return "Sin fecha";
  if (days < 0) return `Vencido hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Vence en ${days} días`;
}

function ContractExpiryBoard({ rows, available }) {
  const sorted = [...rows].sort((a, b) => {
    const daysA = getContractDays(a);
    const daysB = getContractDays(b);
    return (daysA ?? 99999) - (daysB ?? 99999);
  });
  const expired = sorted.filter((row) => (getContractDays(row) ?? 1) < 0).length;
  const critical = sorted.filter((row) => {
    const days = getContractDays(row);
    return days != null && days >= 0 && days <= 7;
  }).length;
  const upcoming = sorted.filter((row) => {
    const days = getContractDays(row);
    return days != null && days > 7 && days <= 30;
  }).length;

  return (
    <Section
      title="Contratos por vencer"
      description="Prioridad operativa: vencidos, próximos vencimientos y acciones antes de que se pase una fecha."
      icon={BriefcaseBusiness}
      action={<SectionLink href="/panel/contratos">Gestionar contratos</SectionLink>}
    >
      {available && sorted.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-rose-50 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-rose-500">Vencidos</p>
              <p className="mt-1 text-xl font-bold text-rose-700 tabular-nums">{expired}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-600">Próximos 7 días</p>
              <p className="mt-1 text-xl font-bold text-amber-700 tabular-nums">{critical}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-blue-500">Dentro de 30 días</p>
              <p className="mt-1 text-xl font-bold text-blue-700 tabular-nums">{upcoming}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Empleado</th>
                  <th className="px-3 py-2.5">Contrato</th>
                  <th className="px-3 py-2.5">Fecha de vencimiento</th>
                  <th className="px-3 py-2.5">Urgencia</th>
                  <th className="px-3 py-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.slice(0, 6).map((contract, index) => {
                  const days = getContractDays(contract);
                  const urgent = days != null && days <= 7;
                  const warning = days != null && days > 7 && days <= 30;
                  return (
                    <tr key={`${contract.id || contract.nombre_empleado}-${index}`} className="hover:bg-slate-50/70">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-700">{contract.nombre_empleado || "Empleado"}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{contract.departamento || "Sin departamento"}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {contract.tipo_contrato || contract.tipo || "Contrato"}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-700 tabular-nums">
                        {formatDateDMY(contract.fecha_vencimiento || contract.fecha_fin)}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                          urgent
                            ? "bg-rose-50 text-rose-700"
                            : warning
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                        }`}>
                          {contractDeadlineLabel(days)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link href="/panel/contratos" className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700">
                          Revisar <ArrowRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : available ? (
        <EmptyState positive>No hay contratos próximos a vencer.</EmptyState>
      ) : (
        <EmptyState>El servicio todavía no entregó información de vencimientos de contratos.</EmptyState>
      )}
    </Section>
  );
}

function AbsenceOverview({ rows }) {
  const visible = rows
    .filter((row) => isPermissionOngoing(row) || isPendingPermission(row))
    .sort((a, b) => String(a.regresa || a.fin || "9999").localeCompare(String(b.regresa || b.fin || "9999")))
    .slice(0, 6);

  return (
    <Section
      title="Ausencias y próximos regresos"
      description="Quién continúa fuera, desde cuándo y qué día debe reincorporarse."
      icon={CalendarRange}
      action={<SectionLink href="/panel/permisos">Ver calendario completo</SectionLink>}
    >
      {visible.length ? (
        <div className="divide-y divide-slate-100">
          {visible.map((permission, index) => {
            const pending = isPendingPermission(permission);
            return (
              <div key={`${permission.id_permiso || index}`} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(150px,.8fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-700">{employeeName(permission)}</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">
                    {permission.departamento || permission.nombre_empresa || "Sin departamento"}
                  </p>
                </div>
                <div>
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                    pending ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                  }`}>
                    {permission.tipo || "Permiso"}{pending ? " · Pendiente" : " · En curso"}
                  </span>
                  <p className="mt-1 text-[10px] text-slate-500 tabular-nums">
                    {formatDateDMY(permission.inicio)} → {formatDateDMY(permission.fin)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Regresa</p>
                  <p className="mt-0.5 text-xs font-bold text-blue-700 tabular-nums">
                    {permission.regresa ? formatDateDMY(permission.regresa) : "Por confirmar"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState positive>No hay ausencias activas ni solicitudes pendientes.</EmptyState>
      )}
    </Section>
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

function OperationalStatusStrip({ items, value, onChange }) {
  const tones = {
    slate: "text-slate-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
    violet: "text-violet-700",
    blue: "text-blue-700",
  };

  return (
    <div className="grid auto-cols-[132px] grid-flow-col gap-2 overflow-x-auto pb-1 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 xl:grid-cols-6 [scrollbar-width:thin]">
      {items.map(({ key, label, value: count, helper, icon: Icon, tone, delta }) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`min-h-[86px] rounded-2xl border bg-white p-3 text-left shadow-sm transition ${
            value === key
              ? "border-blue-500 ring-1 ring-blue-500"
              : "border-slate-200 hover:border-blue-200 hover:shadow-md"
          }`}
        >
          <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            {label}
            <Icon className={`size-4 ${tones[tone]}`} />
          </span>
          <span className={`mt-2 flex items-center gap-2 text-2xl font-bold leading-none tabular-nums ${tones[tone]}`}>
            {count ?? "—"}
            {delta}
          </span>
          <span className="mt-1 block truncate text-[10px] text-slate-400">
            {helper}
          </span>
        </button>
      ))}
    </div>
  );
}

const PERSON_STATUS = {
  present: {
    label: "Presente",
    badge: "bg-emerald-50 text-emerald-700",
    icon: UserCheck,
  },
  late: {
    label: "Tardanza",
    badge: "bg-amber-50 text-amber-700",
    icon: AlarmClock,
  },
  absent: {
    label: "Falta",
    badge: "bg-rose-50 text-rose-700",
    icon: UserMinus,
  },
  vacation: {
    label: "Vacaciones",
    badge: "bg-violet-50 text-violet-700",
    icon: CalendarDays,
  },
  permission: {
    label: "Permiso",
    badge: "bg-blue-50 text-blue-700",
    icon: CalendarCheck2,
  },
};

function OperationalRoster({ rows, filter, expectedCount = 0 }) {
  const visibleRows = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "present") {
      return row.status === "present" || row.status === "late";
    }
    return row.status === filter;
  });

  if (!visibleRows.length) {
    return (
      <EmptyState positive={Number(expectedCount) === 0}>
        {Number(expectedCount) > 0
          ? `El resumen indica ${expectedCount} persona${Number(expectedCount) === 1 ? "" : "s"}, pero el backend no entregó el detalle de nombres.`
          : "No hay personas en este estado."}
      </EmptyState>
    );
  }

  return (
    <div className="max-h-[430px] overflow-auto [scrollbar-gutter:stable]">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-400">
          <tr>
            <th className="px-3 py-2.5">Empleado</th>
            <th className="px-3 py-2.5">Estado</th>
            <th className="px-3 py-2.5">Entrada / inicio</th>
            <th className="px-3 py-2.5">Salida / regreso</th>
            <th className="px-3 py-2.5">Unidad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visibleRows.map((row, index) => {
            const status = PERSON_STATUS[row.status] || PERSON_STATUS.present;
            const StatusIcon = status.icon;
            return (
              <tr key={`${row.key}-${index}`} className="bg-white hover:bg-slate-50/70">
                <td className="px-3 py-2.5">
                  <p className="font-semibold text-slate-700">{row.name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {row.department || "Sin departamento"}
                  </p>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${status.badge}`}>
                    <StatusIcon className="size-3" /> {status.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-semibold text-slate-700 tabular-nums">
                  {row.start || "—"}
                  <span className="mt-0.5 block text-[9px] font-normal text-slate-400">
                    {row.startLabel}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-semibold text-slate-700 tabular-nums">
                  {row.end || "—"}
                  <span className="mt-0.5 block text-[9px] font-normal text-slate-400">
                    {row.endLabel}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-500">
                  {row.unit || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

export default function DashboardRH({ mode = "inicio" }) {
  const router = useRouter();
  const { dataUser, isAuthChecked } = useAuth();
  const analyticsPage = mode === "dashboard";
  const [activeView, setActiveView] = useState(analyticsPage ? "kpis" : "inicio");
  const [peopleFilter, setPeopleFilter] = useState("all");
  const [filters, setFilters] = useState({
    preset: analyticsPage ? "30d" : "hoy",
    custom: {},
    compare: analyticsPage,
    id_empresa: "all",
    id_sucursal: "all",
    id_sucursal_option: "all",
    id_departamento: "all",
  });
  const updateFilters = (nextFilters) => {
    setPeopleFilter("all");
    setFilters(nextFilters);
  };
  const monthRange = {
    fechaInicio: dayjs().startOf("month").format("YYYY-MM-DD"),
    fechaFin: dayjs().endOf("month").format("YYYY-MM-DD"),
  };
  const changeView = (view) => {
    setActiveView(view);
    setPeopleFilter("all");
    setFilters((current) => {
      if (view === "inicio") {
        return { ...current, preset: "hoy", custom: {}, compare: false };
      }
      if (view === "ausencias") {
        return {
          ...current,
          preset: "custom",
          custom: monthRange,
          compare: false,
        };
      }
      return { ...current, preset: "30d", custom: {}, compare: true };
    });
  };

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
        {!analyticsPage && <DashboardViewTabs value={activeView} onChange={changeView} />}
        <DashboardFilters
          value={filters}
          onChange={updateFilters}
          resetPreset={activeView === "inicio" ? "hoy" : activeView === "kpis" ? "30d" : "custom"}
          resetCustom={activeView === "ausencias" ? monthRange : {}}
          resetCompare={activeView === "kpis"}
        />
        <div className="rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-content-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="size-6" />
          </span>
          <h1 className="mt-3 text-base font-semibold text-slate-900">
            No fue posible actualizar {analyticsPage ? "el Dashboard" : "Inicio"}
          </h1>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Revisa la conexión o restablece los filtros. La unidad de negocio ahora se envía con su identificador correcto.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => updateFilters({
              preset: activeView === "inicio" ? "hoy" : activeView === "kpis" ? "30d" : "custom",
              custom: activeView === "ausencias" ? monthRange : {},
              compare: activeView === "kpis",
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
  const presentDetails = uniquePeople(
    Array.isArray(data.presentesDetalle) && data.presentesDetalle.length
      ? data.presentesDetalle
      : Array.isArray(data.asistenciasDetalle)
        ? data.asistenciasDetalle
        : [],
  );
  const absentDetails = uniquePeople(
    Array.isArray(data.sinChecar) ? data.sinChecar : [],
  );
  const today = rangeFromPreset("hoy");
  const showingToday =
    range.fechaInicio === today.fechaInicio && range.fechaFin === today.fechaFin;

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
  const approvedPermissions = permissions.filter(isActivePermission);
  const activePermissions = permissions.filter((permission) => isPermissionOngoing(permission));
  const pendingPermissions = permissions.filter(isPendingPermission);
  const vacationPermissions = activePermissions.filter(isVacationPermission);
  const otherPermissions = activePermissions.filter(
    (permission) => !isVacationPermission(permission),
  );
  const approvedVacationPermissions = approvedPermissions.filter(isVacationPermission);
  const approvedOtherPermissions = approvedPermissions.filter(
    (permission) => !isVacationPermission(permission),
  );
  const previousData = filters.compare !== false ? data.periodoAnterior || {} : {};

  const latePeople = new Set(
    uniquePeople(Array.isArray(data.tardanzasDetalle) ? data.tardanzasDetalle : [])
      .map((row, index) => personKey(row, index)),
  );
  const operationalPeople = new Map();

  activePermissions.forEach((permission, index) => {
    const key = personKey(permission, `permission-${index}`);
    const vacation = isVacationPermission(permission);
    operationalPeople.set(key, {
      key,
      name: employeeName(permission),
      department: permission.departamento,
      unit: permission.nombre_empresa,
      status: vacation ? "vacation" : "permission",
      start: formatDateDMY(permission.inicio),
      startLabel: "Inicio",
      end: formatDateDMY(permission.regresa || permission.fin),
      endLabel: permission.regresa ? "Regresa" : "Termina",
    });
  });

  presentDetails.forEach((person, index) => {
    const key = personKey(person, `present-${index}`);
    if (operationalPeople.has(key)) return;
    const latePerson = latePeople.has(key);
    const exit = person.hora_salida || person.salida;
    operationalPeople.set(key, {
      key,
      name: employeeName(person),
      department: person.departamento,
      unit: person.nombre_empresa || person.unidad_negocio,
      status: latePerson ? "late" : "present",
      start: formatTimeMexico(person.hora_entrada || person.entrada),
      startLabel: latePerson ? "Llegó tarde" : "Entrada",
      end: exit ? formatTimeMexico(exit) : "—",
      endLabel: exit ? "Salida" : "Salida pendiente",
    });
  });

  absentDetails.forEach((person, index) => {
    const key = personKey(person, `absent-${index}`);
    if (operationalPeople.has(key)) return;
    operationalPeople.set(key, {
      key,
      name: employeeName(person),
      department: person.departamento,
      unit: person.nombre_empresa || person.unidad_negocio,
      status: "absent",
      start: "Sin registro",
      startLabel: person.horario_entrada
        ? `Turno ${formatTimeMexico(person.horario_entrada)}`
        : "Entrada esperada",
      end: "—",
      endLabel: "Por revisar",
    });
  });

  const operationalRows = Array.from(operationalPeople.values()).sort((a, b) => {
    const order = { absent: 0, late: 1, vacation: 2, permission: 3, present: 4 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9) ||
      a.name.localeCompare(b.name, "es");
  });

  const expectedPeopleCount = {
    all: totalEmployees,
    present,
    late,
    absent,
    vacation: vacationPermissions.length,
    permission: otherPermissions.length,
  }[peopleFilter];

  const statusItems = [
    {
      key: "all",
      label: "Plantilla",
      value: totalEmployees,
      helper: data.promedioHoras != null
        ? `${data.promedioHoras} h promedio`
        : "Personal activo",
      icon: UsersRound,
      tone: "slate",
      delta: <Delta current={totalEmployees} previous={previousData.totalEmpleados} />,
    },
    {
      key: "present",
      label: "Presentes",
      value: present,
      helper: attendancePct != null
        ? `${Math.round(attendancePct)}% de asistencia`
        : "Con entrada registrada",
      icon: UserCheck,
      tone: "emerald",
      delta: <Delta current={present} previous={previousData.presentes} meaning="up" />,
    },
    {
      key: "late",
      label: "Tardanzas",
      value: late,
      helper: "Llegaron después",
      icon: AlarmClock,
      tone: "amber",
      delta: <Delta current={late} previous={previousData.tardanzas} meaning="down" />,
    },
    {
      key: "absent",
      label: "Faltaron",
      value: absent,
      helper: "Sin registro",
      icon: UserMinus,
      tone: "rose",
      delta: <Delta current={absent} previous={previousData.ausentes} meaning="down" />,
    },
    {
      key: "vacation",
      label: "Vacaciones",
      value: vacationPermissions.length,
      helper: "Con descanso autorizado",
      icon: CalendarDays,
      tone: "violet",
    },
    {
      key: "permission",
      label: "Con permiso",
      value: otherPermissions.length,
      helper: pendingPermissions.length
        ? `${pendingPermissions.length} pendiente${pendingPermissions.length === 1 ? "" : "s"}`
        : "Sin pendientes",
      icon: CalendarCheck2,
      tone: "blue",
      delta: <Delta current={otherPermissions.length} previous={previousData.permisosActivos} />,
    },
  ];

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
  const punctualityPct = present > 0
    ? Math.round(clamp(((present - late) / present) * 100) * 10) / 10
    : null;
  const absenteeismBase = present + absent;
  const absenteeismPct = absenteeismBase > 0
    ? Math.round(clamp((absent / absenteeismBase) * 100) * 10) / 10
    : null;
  const previousTotal = Number(previousData.totalEmpleados) || 0;
  const previousPresent = Number(previousData.presentes) || 0;
  const previousLate = Number(previousData.tardanzas) || 0;
  const previousAbsent = Number(previousData.ausentes) || 0;
  const previousAttendancePct = pick(
    previousData.asistenciaPromedioPct,
    previousTotal > 0
      ? Math.round(clamp((previousPresent / previousTotal) * 100) * 10) / 10
      : null,
  );
  const previousPunctualityPct = previousPresent > 0
    ? Math.round(clamp(((previousPresent - previousLate) / previousPresent) * 100) * 10) / 10
    : null;
  const previousAbsenteeismBase = previousPresent + previousAbsent;
  const previousAbsenteeismPct = previousAbsenteeismBase > 0
    ? Math.round(clamp((previousAbsent / previousAbsenteeismBase) * 100) * 10) / 10
    : null;
  const bestDepartment = departmentAttendance
    .map((department) => ({
      name: department.departamento || department.nombre || "Sin departamento",
      value: clamp(department.pct ?? department.porcentaje),
    }))
    .sort((a, b) => b.value - a.value)[0];
  const riskDepartment = departmentIncidents
    .map((department) => ({
      name: department.departamento || department.nombre || "Sin departamento",
      incidents: (Number(department.faltas) || 0) + (Number(department.tardanzas) || 0),
      absences: Number(department.faltas) || 0,
      late: Number(department.tardanzas) || 0,
    }))
    .sort((a, b) => b.incidents - a.incidents)[0];
  const contractsInSevenDays = contracts.filter((contract) => {
    const days = getContractDays(contract);
    return days != null && days >= 0 && days <= 7;
  }).length;
  const expiredContracts = contracts.filter((contract) => (getContractDays(contract) ?? 1) < 0).length;
  const attendanceDifference = attendancePct != null && previousAttendancePct != null
    ? Math.round((Number(attendancePct) - Number(previousAttendancePct)) * 10) / 10
    : null;
  const analyticsStories = [
    {
      label: attendanceDifference == null || attendanceDifference >= 0 ? "Lo que mejoró" : "Cambio principal",
      text: attendanceDifference != null ? (
        <>
          La asistencia {attendanceDifference >= 0 ? "subió" : "bajó"}{" "}
          <strong>{Math.abs(attendanceDifference)} punto{Math.abs(attendanceDifference) === 1 ? "" : "s"}</strong>{" "}
          contra el periodo anterior.
        </>
      ) : attendancePct != null ? (
        <>La asistencia acumulada del periodo es de <strong>{Math.round(Number(attendancePct) * 10) / 10}%</strong>.</>
      ) : (
        <>Aún no hay información suficiente para comparar la asistencia.</>
      ),
    },
    {
      label: "Atención",
      text: riskDepartment?.incidents > 0 ? (
        <>
          <strong>{riskDepartment.name}</strong> concentra {riskDepartment.incidents} incidencias: {riskDepartment.absences} faltas y {riskDepartment.late} tardanzas.
        </>
      ) : bestDepartment ? (
        <>
          <strong>{bestDepartment.name}</strong> encabeza la asistencia con {Math.round(bestDepartment.value)}%.
        </>
      ) : (
        <>No se detectaron concentraciones departamentales con los datos disponibles.</>
      ),
    },
    {
      label: "Próximo riesgo",
      text: contractsAvailable ? (
        contracts.length > 0 ? (
          <>
            Hay <strong>{expiredContracts} vencido{expiredContracts === 1 ? "" : "s"}</strong> y {contractsInSevenDays} contrato{contractsInSevenDays === 1 ? "" : "s"} que vence{contractsInSevenDays === 1 ? "" : "n"} durante los próximos 7 días.
          </>
        ) : (
          <>No hay contratos próximos a vencer dentro del alcance seleccionado.</>
        )
      ) : (
        <>La fuente de vencimientos todavía no está integrada para este alcance.</>
      ),
    },
  ];
  const calendarPermissions = permissions.map((permission, index) => ({
    ...permission,
    id_empleado: permission.id_empleado ?? permission.empleado_id ?? `permiso-${index}`,
    empleado_nombre: employeeName(permission),
    tipo_permiso_nombre: permission.tipo_permiso_nombre || permission.tipo || "Permiso",
    fecha_inicio: permission.fecha_inicio || permission.inicio,
    fecha_fin: permission.fecha_fin || permission.fin || permission.inicio,
    estado: permission.estado || permission.status?.label || "Sin estado",
  }));

  return (
    <main className="mx-auto w-full max-w-[1480px] space-y-4 pb-8">
      <SystemMessageRenderer tipo="interna" contexto="dashboard" />

      <header className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span className="hidden size-11 shrink-0 place-content-center rounded-2xl bg-blue-600 text-white shadow-sm sm:grid">
            {analyticsPage ? <ChartNoAxesCombined className="size-5" /> : <Home className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {analyticsPage ? "Dashboard" : "Inicio"}
              </h1>
              <span className="rounded-full border border-blue-100 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                ADAMIA
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {analyticsPage
                ? "Histórico, tendencias y riesgos para entender cómo evoluciona tu personal."
                : activeView === "inicio"
                ? "Operación diaria del personal, ausencias, regresos y contratos que requieren atención."
                : activeView === "ausencias"
                  ? "Calendario completo de vacaciones, permisos, incapacidades y regresos."
                  : "Indicadores estadísticos de asistencia, puntualidad e incidencias."}
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

      {!analyticsPage && <DashboardViewTabs value={activeView} onChange={changeView} />}

      <DashboardFilters
        value={filters}
        onChange={updateFilters}
        resetPreset={activeView === "inicio" ? "hoy" : activeView === "kpis" ? "30d" : "custom"}
        resetCustom={activeView === "ausencias" ? monthRange : {}}
        resetCompare={activeView === "kpis"}
      />

      {isValidating && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
          <RefreshCw className="size-3.5 animate-spin" />
          Actualizando resultados para los filtros seleccionados…
        </div>
      )}

      {activeView === "inicio" && (
        <>
      <section aria-busy={isValidating} className={isValidating ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            {showingToday ? "Estado del personal hoy" : "Estado del personal en el periodo"}
          </h2>
          {filters.compare !== false && hasOwn(data, "periodoAnterior") && (
            <span className="text-[10px] text-slate-400">vs. periodo anterior</span>
          )}
        </div>
        <OperationalStatusStrip
          items={statusItems}
          value={peopleFilter}
          onChange={setPeopleFilter}
        />
      </section>

      <Section
        title={showingToday ? "Dónde está cada persona hoy" : "Detalle operativo del personal"}
        description="Una sola lista con estado, horario y fecha de regreso. Usa los indicadores superiores para filtrar."
        icon={UsersRound}
        action={<SectionLink href="/panel/registro-asistencia">Ver detalle</SectionLink>}
      >
        <OperationalRoster
          rows={operationalRows}
          filter={peopleFilter}
          expectedCount={expectedPeopleCount}
        />
      </Section>

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

      <AbsenceOverview rows={permissions} />

      <ContractExpiryBoard rows={contracts} available={contractsAvailable} />
        </>
      )}

      {activeView === "kpis" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <AnalyticsMetric
              label="Asistencia"
              value={attendancePct != null ? `${Math.round(Number(attendancePct) * 10) / 10}%` : "—"}
              helper="Cumplimiento promedio"
              icon={UserCheck}
              delta={<Delta current={attendancePct} previous={previousAttendancePct} meaning="up" suffix=" pts" />}
            />
            <AnalyticsMetric
              label="Puntualidad"
              value={punctualityPct != null ? `${punctualityPct}%` : "—"}
              helper="Entradas a tiempo"
              icon={AlarmClock}
              delta={<Delta current={punctualityPct} previous={previousPunctualityPct} meaning="up" suffix=" pts" />}
            />
            <AnalyticsMetric
              label="Ausentismo"
              value={absenteeismPct != null ? `${absenteeismPct}%` : "—"}
              helper={`${absent} falta${absent === 1 ? "" : "s"} en el periodo`}
              icon={UserMinus}
              delta={<Delta current={absenteeismPct} previous={previousAbsenteeismPct} meaning="down" suffix=" pts" />}
            />
            <AnalyticsMetric
              label="Promedio de horas"
              value={data.promedioHoras != null ? `${data.promedioHoras} h` : "—"}
              helper="Jornada efectiva registrada"
              icon={BarChart3}
              delta={<Delta current={data.promedioHoras} previous={previousData.promedioHoras} meaning="up" suffix=" h" />}
            />
            <AnalyticsMetric
              label="Personal activo"
              value={totalEmployees}
              helper="Plantilla del alcance"
              icon={UsersRound}
              delta={<Delta current={totalEmployees} previous={previousData.totalEmpleados} meaning="neutral" />}
            />
            <AnalyticsMetric
              label="Rotación"
              value={rotationAvailable ? `${data.rotacion.rotacionPct ?? 0}%` : "—"}
              helper={rotationAvailable ? `${data.rotacion.altas || 0} altas · ${data.rotacion.bajas || 0} bajas` : "Pendiente de datos"}
              icon={RefreshCw}
            />
          </div>

          <AnalyticsNarrative stories={analyticsStories} />

          <div className="grid gap-4 lg:grid-cols-3">
            <Section
              title="Evolución de asistencia"
              description="Presentes por día, con faltas, retardos y permisos al consultar cada punto."
              icon={ChartNoAxesCombined}
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
              title="Asistencia por departamento"
              description="Ranking porcentual para detectar brechas entre áreas."
              icon={Building2}
            >
              <DepartmentLollipop items={departmentAttendance} />
            </Section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section
              title="Mapa de asistencia"
              description="Cumplimiento por día y unidad de negocio; desplázate para recorrer periodos largos."
              icon={CalendarDays}
            >
              {data.heatmapUnidad?.unidades?.length > 0 ? (
                <Heatmap data={data.heatmapUnidad} />
              ) : (
                <EmptyState>No hay mapa de asistencia para este periodo.</EmptyState>
              )}
            </Section>

            <Section
              title="Composición de registros"
              description="Qué proporción corresponde a presencia, faltas, permisos y otras incidencias."
              icon={LayoutDashboard}
              action={<SectionLink href="/panel/registro-asistencia">Ver detalle</SectionLink>}
            >
              <AttendanceDistribution items={distribution} />
            </Section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section
              title="Movimiento de plantilla"
              description="Cómo las altas y bajas explican el cambio entre la plantilla inicial y el cierre."
              icon={Users}
              action={<SectionLink href="/panel/empleados">Ver empleados</SectionLink>}
            >
              <WorkforceWaterfall data={rotationAvailable ? data.rotacion : null} totalEmployees={totalEmployees} />
            </Section>

            <Section
              title="Proyección de contratos"
              description="Vencidos y próximos vencimientos agrupados por nivel de urgencia."
              icon={BriefcaseBusiness}
              action={<SectionLink href="/panel/contratos">Gestionar</SectionLink>}
            >
              <ContractProjection rows={contracts} available={contractsAvailable} />
            </Section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section
              title="Departamentos con más incidencias"
              description="Áreas que concentran faltas y tardanzas durante el periodo."
              icon={ShieldAlert}
              action={<SectionLink href="/panel/registro-asistencia">Revisar</SectionLink>}
            >
              {departmentIncidents.length > 0 ? (
                <IncidentRanking items={departmentIncidents} />
              ) : (
                <EmptyState>No hay incidencias departamentales para mostrar.</EmptyState>
              )}
            </Section>

            <Section
              title="Distribución de la plantilla"
              description="Personal activo por departamento en el alcance seleccionado."
              icon={UsersRound}
              action={<SectionLink href="/panel/empleados">Ver empleados</SectionLink>}
            >
              {headcount.length > 0 ? (
                <HorizontalBars
                  items={headcount.map((department) => ({
                    name: department.departamento || department.nombre,
                    value: department.count ?? department.total ?? 0,
                    color: "bg-blue-600",
                  }))}
                />
              ) : (
                <EmptyState>No hay distribución de plantilla disponible.</EmptyState>
              )}
            </Section>
          </div>
        </>
      )}

      {activeView === "ausencias" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsMetric
              label="Ausencias autorizadas"
              value={approvedPermissions.length}
              helper="Dentro del mes consultado"
              icon={CalendarCheck2}
            />
            <AnalyticsMetric
              label="Vacaciones"
              value={approvedVacationPermissions.length}
              helper="Periodos aprobados"
              icon={CalendarDays}
            />
            <AnalyticsMetric
              label="Otros permisos"
              value={approvedOtherPermissions.length}
              helper="Permisos e incapacidades"
              icon={CalendarRange}
            />
            <AnalyticsMetric
              label="Pendientes"
              value={pendingPermissions.length}
              helper="Solicitudes por resolver"
              icon={ShieldAlert}
              negative={pendingPermissions.length > 0}
            />
          </div>

          <PermisosCalendario
            desde={range.fechaInicio}
            hasta={range.fechaFin}
            registros={calendarPermissions}
            onVerPermiso={() => router.push("/panel/permisos")}
            titulo="Calendario mensual de ausencias"
            headerTone="blue"
          />

          <AbsenceOverview rows={permissions} />
        </>
      )}

      {activeView === "inicio" && documentsAvailable && (
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

      {activeView === "inicio" && (
      <div className="grid gap-4 lg:grid-cols-2">
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
      )}

      {activeView === "inicio" && (
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-3.5 text-blue-500" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Accesos rápidos
          </h2>
        </div>
        <QuickActions />
      </section>
      )}
    </main>
  );
}
