"use client";

/**
 * Dashboard de Recursos Humanos (cliente).
 *
 * Estrategia:
 * - Filtros (periodo, empresa, unidad de negocio, departamento) controlan el estado.
 * - Cada cambio recalcula el rango de fechas y los query params, y refresca los
 *   datos con SWR (`/checador/dashboard`, `/checador/holidays`, `/checador/asistencias`).
 * - Los bloques se renderizan a partir de un shape de datos bien definido; cuando el
 *   backend todavía no entrega una sección (ej. contratos por vencer), se muestra un
 *   estado vacío en lugar de romper. Ver `docs/DASHBOARD_BACKEND.md` para el contrato.
 *
 * Nota: se corrige el bug anterior donde `id_empresa` era siempre `null` — ahora sale
 * de `dataUser.id_empresa` (o del filtro de empresa), por lo que festivos y el detalle
 * de asistencias sí cargan.
 */

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  CalendarDays,
  CheckCircle2,
  UsersRound,
  AlarmClock,
  XCircle,
  Gift,
  PartyPopper,
  BarChart3,
  LineChart,
  PieChart,
  FileText,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Clock3,
  LayoutGrid,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import EllipsisLoader from "@/components/loading/EllipsisLoader";
import SystemMessageRenderer from "@/components/system-messages/SystemMessageRenderer";
import AccesosRapidos from "@/components/AccesosRapidos";
import WeeklyTrend from "./WeeklyTrend";
import PermisosTable from "./PermisosTable";
import DashboardFilters from "./DashboardFilters";
import { buildQuery, rangeFromPreset, previousRange } from "./lib/periodos";
import {
  monthShortUpperMX,
  fmtDayMonthDeMX,
  formatDateDMY,
  formatTimeMexico,
  getServiceYears,
} from "./lib/format";

/* ------------------------------------------------------------------ */
/* Helpers de presentación                                            */
/* ------------------------------------------------------------------ */

const pick = (...vals) => vals.find((v) => v !== undefined && v !== null);

const BAR = {
  emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500",
  violet: "bg-violet-500", indigo: "bg-indigo-500", sky: "bg-sky-500",
  fuchsia: "bg-fuchsia-500", cyan: "bg-cyan-500", teal: "bg-teal-500",
  lime: "bg-lime-500", orange: "bg-orange-500",
};
const CAT = ["sky", "teal", "amber", "violet", "orange", "fuchsia", "indigo", "lime"];

function Pill({ tone = "zinc", children, className = "" }) {
  const map = {
    zinc: "border-zinc-200 bg-zinc-50 text-zinc-700",
    good: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    crit: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${map[tone] || map.zinc} ${className}`}
    >
      {children}
    </span>
  );
}

/** Pill de delta vs. periodo anterior. `goodWhenDown` invierte el color (tardanzas, ausentes). */
function Delta({ current, prev, unit = "", goodWhenDown = false }) {
  if (prev === undefined || prev === null || current === undefined || current === null)
    return null;
  const diff = Number(current) - Number(prev);
  const rounded = Math.round(diff * 10) / 10;
  const isUp = rounded > 0;
  const isFlat = rounded === 0;
  const positive = isFlat ? null : goodWhenDown ? !isUp : isUp;
  const tone = isFlat
    ? "text-zinc-500 bg-zinc-100"
    : positive
      ? "text-emerald-700 bg-emerald-50"
      : "text-rose-700 bg-rose-50";
  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      <Icon className="size-3" />
      {isFlat ? "0" : `${isUp ? "+" : ""}${rounded}`}{unit}
    </span>
  );
}

function KpiCard({ label, icon: Icon, tone, value, unit, sub, delta }) {
  const chip = {
    brand: "border-violet-200 bg-violet-50 text-violet-600",
    good: "border-emerald-200 bg-emerald-50 text-emerald-600",
    warn: "border-amber-200 bg-amber-50 text-amber-600",
    crit: "border-rose-200 bg-rose-50 text-rose-600",
    info: "border-sky-200 bg-sky-50 text-sky-600",
    violet: "border-violet-200 bg-violet-50 text-violet-600",
  }[tone];
  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
          {label}
        </CardTitle>
        <div className={`grid size-8 place-content-center rounded-md border ${chip}`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl sm:text-4xl font-semibold tabular-nums">
          {value}
          {unit && <span className="text-xl font-normal text-zinc-400"> {unit}</span>}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
          {delta}
          <span>{sub}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, icon: Icon, iconClass = "text-indigo-600", right, children, pad = true }) {
  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          {Icon && <Icon className={`size-4 ${iconClass}`} />} {title}
        </CardTitle>
        {right}
      </CardHeader>
      <CardContent className={pad ? "" : "p-0"}>{children}</CardContent>
    </Card>
  );
}

function Empty({ children }) {
  return <div className="py-8 text-center text-sm text-zinc-400">{children}</div>;
}

/** Barras horizontales genéricas: [{ name, value, color }]. */
function HBars({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value || 0));
  const total = items.reduce((a, i) => a + (i.value || 0), 0) || 1;
  return (
    <div className="flex flex-col gap-3">
      {items.map((it, idx) => (
        <div key={idx} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
          <span className="truncate text-[13px] text-zinc-600">{it.name}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
            <span
              className={`block h-full rounded-full ${BAR[it.color] || "bg-sky-500"}`}
              style={{ width: `${((it.value || 0) / max) * 100}%` }}
            />
          </span>
          <span className="min-w-[62px] text-right text-[13px] font-semibold tabular-nums">
            {it.value} · {Math.round(((it.value || 0) / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal                                               */
/* ------------------------------------------------------------------ */

export default function DashboardRH() {
  const { dataUser } = useAuth();

  const [filters, setFilters] = useState({
    preset: "7d",
    custom: {},
    id_empresa: "all",
    id_sucursal: "all",
    id_departamento: "all",
  });

  const rango = useMemo(
    () => rangeFromPreset(filters.preset, filters.custom),
    [filters.preset, filters.custom],
  );
  const prev = useMemo(() => previousRange(rango), [rango]);

  // Empresa efectiva: filtro explícito o la del usuario autenticado.
  const idEmpresa =
    filters.id_empresa !== "all" ? filters.id_empresa : dataUser?.id_empresa || null;

  const commonParams = {
    fechaInicio: rango.fechaInicio,
    fechaFin: rango.fechaFin,
    id_empresa: idEmpresa || "all",
    id_sucursal: filters.id_sucursal,
    id_departamento: filters.id_departamento,
  };

  const dashboardKey = `/checador/dashboard${buildQuery({
    ...commonParams,
    fechaInicioPrev: prev.fechaInicioPrev,
    fechaFinPrev: prev.fechaFinPrev,
  })}`;

  const holidaysKey = idEmpresa
    ? `/checador/holidays/${idEmpresa}?page=1&limit=5000&filter=`
    : null;

  const asistenciasKey = idEmpresa
    ? `/checador/asistencias${buildQuery({
        empresa: idEmpresa,
        fechaInicio: rango.fechaInicio,
        fechaFin: rango.fechaFin,
        id_sucursal: filters.id_sucursal,
        id_departamento: filters.id_departamento,
        page: 1,
        limit: 200,
      })}`
    : null;

  const { data: dashResp, error, isLoading } = useSWR(
    dashboardKey,
    fetcherWithToken,
    swr_config,
  );
  const { data: holidaysResp } = useSWR(holidaysKey, fetcherWithToken, swr_config);
  const { data: asistResp } = useSWR(asistenciasKey, fetcherWithToken, swr_config);

  const data = dashResp?.ok ? dashResp.data : dashResp?.data || null;

  const festivosYmd = useMemo(() => {
    const list = holidaysResp?.festivos || [];
    return Array.isArray(list)
      ? list
          .map((f) => String(f?.fecha || "").slice(0, 10))
          .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
      : [];
  }, [holidaysResp]);

  const asistenciasDetalle =
    asistResp?.registros || data?.asistenciasDetalle || [];

  if (isLoading && !data) {
    return (
      <div className="mx-auto w-full max-w-7xl px-1 py-6">
        <EllipsisLoader />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-7xl px-1 py-6 space-y-4">
        <DashboardFilters value={filters} onChange={setFilters} />
        <div className="rounded-xl border bg-white p-6 text-sm text-rose-600">
          No se pudo cargar el dashboard. Verifica tu conexión o los filtros
          seleccionados.
        </div>
      </div>
    );
  }

  /* ---------- Derivados ---------- */
  const totalEmpleados = pick(data.totalEmpleados, 0);
  const presentes = pick(data.presentes, data.presentesHoy, 0);
  const tardanzas = pick(data.tardanzas, data.tardanzasHoy, 0);
  const ausentes = pick(data.ausentes, data.ausentesHoy, 0);
  const asistenciaPct =
    pick(data.asistenciaPromedioPct) ??
    (totalEmpleados > 0 ? Math.round((presentes / totalEmpleados) * 100) : 0);

  const ant = data.periodoAnterior || {};

  const distribData = Array.isArray(data.distribucionAsistenciaDetallada)
    ? data.distribucionAsistenciaDetallada
    : data.distribucionAsistencia || [];
  const distribTotal = distribData.reduce((a, it) => a + (it.count || 0), 0);

  const aniversariosMes = (data.aniversariosMes || []).filter(
    (a) => getServiceYears(a.fecha_ingreso) >= 1,
  );

  const permisosActivos = (data.permisosRangos || []).filter(
    (p) => !String(p?.status?.label || "").toLowerCase().startsWith("terminado"),
  ).length;

  const headcount = data.distribucionPorDepartamento || [];
  const incidencias = data.incidenciasPorDepartamento || [];
  const asistenciaDepto = data.asistenciaPorDepartamento || [];
  const heatmap = data.heatmapUnidad || null;
  const contratos = data.contratosPorVencer || [];
  const documentos = data.documentosPorVencer || [];
  const rotacion = data.rotacion || null;

  return (
    <div className="mx-auto w-full max-w-7xl px-1 py-4 space-y-4">
      <SystemMessageRenderer tipo="interna" contexto="dashboard" />

      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Dashboard de Recursos Humanos
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Asistencia, permisos y plantilla · vista consolidada con filtros
        </p>
      </div>

      <DashboardFilters value={filters} onChange={setFilters} />

      {/* ================= KPIs ================= */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Total empleados" icon={UsersRound} tone="brand"
          value={totalEmpleados}
          unit={data.empleadosIncluidos != null ? `/ ${data.empleadosIncluidos}` : ""}
          sub={
            data.empleadosExcedentes > 0
              ? `${data.empleadosExcedentes} excedentes`
              : "Personal activo"
          }
          delta={<Delta current={totalEmpleados} prev={ant.totalEmpleados} />}
        />
        <KpiCard
          label="Presentes" icon={CheckCircle2} tone="good"
          value={presentes} sub={`${asistenciaPct}% asistencia`}
          delta={<Delta current={presentes} prev={ant.presentes} />}
        />
        <KpiCard
          label="Tardanzas" icon={AlarmClock} tone="warn"
          value={tardanzas}
          sub={data.tardanzasPctSobreRegistros != null ? `${data.tardanzasPctSobreRegistros}% de registros` : "Retrasos"}
          delta={<Delta current={tardanzas} prev={ant.tardanzas} goodWhenDown />}
        />
        <KpiCard
          label="Ausentes" icon={XCircle} tone="crit"
          value={ausentes}
          sub={data.sinChecarPct != null ? `${data.sinChecarPct}% del total` : "Faltas"}
          delta={<Delta current={ausentes} prev={ant.ausentes} goodWhenDown />}
        />
        <KpiCard
          label="Permisos activos" icon={FileText} tone="violet"
          value={permisosActivos} sub="En el periodo"
          delta={<Delta current={permisosActivos} prev={ant.permisosActivos} />}
        />
        <KpiCard
          label="Prom. horas" icon={Clock3} tone="info"
          value={pick(data.promedioHoras, "—")}
          unit={data.promedioHoras != null ? "hrs" : ""}
          sub="Jornada efectiva"
          delta={<Delta current={data.promedioHoras} prev={ant.promedioHoras} />}
        />
      </div>

      {/* ================= Tendencia + Distribución ================= */}
      <h2 className="pt-2 text-[15px] font-semibold">Comportamiento en el periodo</h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard
            title="Tendencia de asistencia" icon={LineChart} iconClass="text-sky-600"
            right={<Pill tone="info">Prom. {asistenciaPct}% asistencia</Pill>}
          >
            <div className="mb-2 flex flex-wrap gap-4 text-xs text-zinc-600">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-emerald-500" />Presentes</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-amber-500" />Tardanzas</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-rose-500" />Ausentes</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-violet-500" />Permisos</span>
            </div>
            {(data.tendenciaSemanal || []).length === 0 ? (
              <Empty>Sin datos de tendencia para el periodo</Empty>
            ) : (
              <WeeklyTrend data={data.tendenciaSemanal || []} />
            )}
          </SectionCard>
        </div>
        <SectionCard title="Distribución por tipo" icon={PieChart} iconClass="text-sky-600">
          {distribTotal === 0 ? (
            <Empty>No hay registros de asistencia</Empty>
          ) : (
            <HBars
              items={distribData
                .filter((d) => d.count > 0)
                .map((d) => ({ name: d.label, value: d.count, color: d.color }))}
            />
          )}
        </SectionCard>
      </div>

      {/* ================= Depto + Heatmap ================= */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionCard
          title="Asistencia por departamento" icon={BarChart3} iconClass="text-violet-600"
          right={<Pill tone="good">Meta 90%</Pill>}
        >
          {asistenciaDepto.length === 0 ? (
            <Empty>Pendiente de datos por departamento</Empty>
          ) : (
            <div className="flex flex-col gap-3.5">
              {asistenciaDepto.map((d, i) => {
                const pct = Math.round(d.pct ?? d.porcentaje ?? 0);
                const color = pct >= 90 ? "emerald" : pct >= 85 ? "amber" : "rose";
                const text = pct >= 90 ? "text-emerald-600" : pct >= 85 ? "text-amber-600" : "text-rose-600";
                return (
                  <div key={i} className="grid grid-cols-[110px_1fr_46px] items-center gap-3">
                    <span className="text-[13px] text-zinc-600">{d.departamento || d.nombre}</span>
                    <span className="h-5 overflow-hidden rounded-md bg-zinc-100">
                      <span className={`block h-full rounded-md ${BAR[color]}`} style={{ width: `${pct}%` }} />
                    </span>
                    <span className={`text-right text-[13px] font-bold tabular-nums ${text}`}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Asistencia por día y unidad" icon={LayoutGrid} iconClass="text-sky-600">
          {!heatmap || !Array.isArray(heatmap.unidades) || heatmap.unidades.length === 0 ? (
            <Empty>Pendiente de datos por unidad de negocio</Empty>
          ) : (
            <Heatmap heatmap={heatmap} />
          )}
        </SectionCard>
      </div>

      {/* ================= Plantilla, contratos e incidencias ================= */}
      <h2 className="pt-2 text-[15px] font-semibold">Plantilla, contratos e incidencias</h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionCard
          title="Distribución de personal por departamento" icon={Users} iconClass="text-violet-600"
          right={<Pill tone="info">{totalEmpleados} empleados</Pill>}
        >
          {headcount.length === 0 ? (
            <Empty>Pendiente de datos de plantilla</Empty>
          ) : (
            <HBars
              items={headcount.map((d, i) => ({
                name: d.departamento || d.nombre,
                value: d.count ?? d.total ?? 0,
                color: CAT[i % CAT.length],
              }))}
            />
          )}
        </SectionCard>

        <SectionCard title="Departamentos con más incidencias" icon={AlertTriangle} iconClass="text-rose-600">
          {incidencias.length === 0 ? (
            <Empty>Sin incidencias registradas en el periodo</Empty>
          ) : (
            <RankingIncidencias items={incidencias} />
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard
            title="Contratos por vencer" icon={FileText} iconClass="text-amber-600"
            right={<Pill tone="warn">{contratos.length} próximos</Pill>} pad={false}
          >
            {contratos.length === 0 ? (
              <Empty>No hay contratos por vencer</Empty>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50 text-zinc-600">
                      <TableHead className="px-3 py-2">Empleado</TableHead>
                      <TableHead className="px-3 py-2">Departamento</TableHead>
                      <TableHead className="px-3 py-2">Tipo de contrato</TableHead>
                      <TableHead className="px-3 py-2">Vence</TableHead>
                      <TableHead className="px-3 py-2 text-center">Restan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contratos.map((c, i) => {
                      const dias = c.dias_restantes ?? c.diasRestantes ?? 0;
                      const tone = dias <= 7 ? "crit" : dias <= 21 ? "warn" : "info";
                      return (
                        <TableRow key={i} className="hover:bg-zinc-50">
                          <TableCell className="px-3 py-2 font-medium">{c.nombre_empleado}</TableCell>
                          <TableCell className="px-3 py-2 text-zinc-500">{c.departamento || "-"}</TableCell>
                          <TableCell className="px-3 py-2"><Pill tone="violet">{c.tipo_contrato || c.tipo}</Pill></TableCell>
                          <TableCell className="px-3 py-2 text-zinc-500 tabular-nums">{formatDateDMY(c.fecha_vencimiento)}</TableCell>
                          <TableCell className="px-3 py-2 text-center"><Pill tone={tone}>{dias} días</Pill></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </div>
        <SectionCard title="Rotación del periodo" icon={RefreshCw} iconClass="text-teal-600">
          {!rotacion ? (
            <Empty>Pendiente de datos de rotación</Empty>
          ) : (
            <RotacionCard rotacion={rotacion} />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Documentos por vencer" icon={ShieldCheck} iconClass="text-sky-600"
        right={<Pill tone="info">Vigencias del expediente</Pill>} pad={false}
      >
        {documentos.length === 0 ? (
          <Empty>No hay documentos próximos a vencer</Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 text-zinc-600">
                  <TableHead className="px-3 py-2">Empleado</TableHead>
                  <TableHead className="px-3 py-2">Documento</TableHead>
                  <TableHead className="px-3 py-2">Departamento</TableHead>
                  <TableHead className="px-3 py-2">Vence</TableHead>
                  <TableHead className="px-3 py-2 text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((d, i) => {
                  const dias = d.dias_restantes ?? d.diasRestantes;
                  const tone = dias == null ? "info" : dias <= 7 ? "crit" : dias <= 21 ? "warn" : "info";
                  const estado = d.estado || (dias != null ? `Vence en ${dias} días` : "Vigente");
                  return (
                    <TableRow key={i} className="hover:bg-zinc-50">
                      <TableCell className="px-3 py-2 font-medium">{d.nombre_empleado}</TableCell>
                      <TableCell className="px-3 py-2">{d.documento}</TableCell>
                      <TableCell className="px-3 py-2 text-zinc-500">{d.departamento || "-"}</TableCell>
                      <TableCell className="px-3 py-2 text-zinc-500 tabular-nums">{formatDateDMY(d.fecha_vencimiento)}</TableCell>
                      <TableCell className="px-3 py-2 text-center"><Pill tone={tone}>{estado}</Pill></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* ================= Detalle operativo ================= */}
      <h2 className="pt-2 text-[15px] font-semibold">Detalle operativo</h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionCard
          title="Tardanzas" icon={AlarmClock} iconClass="text-amber-600"
          right={<Pill tone="warn">{tardanzas} tardanza{tardanzas !== 1 ? "s" : ""}</Pill>} pad={false}
        >
          {(data.tardanzasDetalle || []).length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-emerald-700">
              <CheckCircle2 className="mr-2 size-4 text-emerald-600" />
              ¡Sin tardanzas en el periodo!
            </div>
          ) : (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 text-zinc-600">
                    <TableHead className="px-3 py-2 w-10">#</TableHead>
                    <TableHead className="px-3 py-2">Empleado</TableHead>
                    <TableHead className="px-3 py-2">Empresa</TableHead>
                    <TableHead className="px-3 py-2">Entrada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.tardanzasDetalle || []).map((t, idx) => (
                    <TableRow key={`t-${t.id_asistencia ?? idx}`} className="hover:bg-zinc-50">
                      <TableCell className="px-3 py-2 text-zinc-400">{idx + 1}</TableCell>
                      <TableCell className="px-3 py-2 font-medium">{t.nombre_empleado}</TableCell>
                      <TableCell className="px-3 py-2 text-zinc-500">{t.nombre_empresa}</TableCell>
                      <TableCell className="px-3 py-2 text-amber-700 tabular-nums">
                        {t.hora_entrada ? formatTimeMexico(t.hora_entrada) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Sin checar" icon={XCircle} iconClass="text-rose-600"
          right={<Pill tone="crit">{pick(data.sinChecarCount, (data.sinChecar || []).length)} empleados</Pill>} pad={false}
        >
          {(data.sinChecar || []).length === 0 ? (
            <Empty>Todos registraron movimiento</Empty>
          ) : (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 text-zinc-600">
                    <TableHead className="px-3 py-2 w-10">#</TableHead>
                    <TableHead className="px-3 py-2">Empleado</TableHead>
                    <TableHead className="px-3 py-2">Empresa</TableHead>
                    <TableHead className="px-3 py-2 text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.sinChecar || []).map((r, idx) => (
                    <TableRow key={`sc-${r.id_empleado ?? idx}`} className="hover:bg-zinc-50">
                      <TableCell className="px-3 py-2 text-zinc-400">{idx + 1}</TableCell>
                      <TableCell className="px-3 py-2 font-medium">{r.nombre_empleado}</TableCell>
                      <TableCell className="px-3 py-2 text-zinc-500">{r.nombre_empresa}</TableCell>
                      <TableCell className="px-3 py-2 text-center">
                        <Pill tone="crit"><XCircle className="size-3" /> Sin checar</Pill>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Detalle de asistencias */}
      <SectionCard
        title="Asistencias · Detalle" icon={CheckCircle2} iconClass="text-emerald-600" pad={false}
      >
        {asistenciasDetalle.length === 0 ? (
          <Empty>No hay registros de asistencia para el periodo.</Empty>
        ) : (
          <div className="max-h-[26rem] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 text-zinc-600">
                  <TableHead className="px-3 py-2">Empleado</TableHead>
                  <TableHead className="px-3 py-2">Departamento</TableHead>
                  <TableHead className="px-3 py-2">Tipo</TableHead>
                  <TableHead className="px-3 py-2 text-center">Fecha</TableHead>
                  <TableHead className="px-3 py-2 text-center">Entrada</TableHead>
                  <TableHead className="px-3 py-2 text-center">Salida</TableHead>
                  <TableHead className="px-3 py-2 text-center">Asistió</TableHead>
                  <TableHead className="px-3 py-2">Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asistenciasDetalle.map((r) => (
                  <TableRow key={r.id} className="hover:bg-zinc-50">
                    <TableCell className="px-3 py-2">
                      {[r.nombre, r.apellido_paterno, r.apellido_materno].filter(Boolean).join(" ")}
                    </TableCell>
                    <TableCell className="px-3 py-2">{r.departamento || "-"}</TableCell>
                    <TableCell className="px-3 py-2">{r.tipo_registro_nombre || "-"}</TableCell>
                    <TableCell className="px-3 py-2 text-center tabular-nums">{formatDateDMY(r.fecha)}</TableCell>
                    <TableCell className="px-3 py-2 text-center tabular-nums">{r.entrada ? formatTimeMexico(r.entrada) : "-"}</TableCell>
                    <TableCell className="px-3 py-2 text-center tabular-nums">{r.salida ? formatTimeMexico(r.salida) : "-"}</TableCell>
                    <TableCell className="px-3 py-2 text-center">{r.asistencia ? "Sí" : "No"}</TableCell>
                    <TableCell className="px-3 py-2">{r.notas || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Permisos */}
      <SectionCard
        title="Permisos activos" icon={FileText} iconClass="text-violet-600"
        right={<Pill tone="violet">{permisosActivos} activos</Pill>}
      >
        <PermisosTable rows={data.permisosRangos || []} festivosYmd={festivosYmd} />
      </SectionCard>

      {/* ================= Eventos ================= */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionCard
          title="Cumpleaños del mes" icon={Gift} iconClass="text-amber-600"
          right={<Pill tone="warn">{data.cumpleanosMes?.length || 0} este mes</Pill>}
        >
          {!data.cumpleanosMes || data.cumpleanosMes.length === 0 ? (
            <Empty>No hay cumpleaños este mes</Empty>
          ) : (
            <div className="max-h-64 overflow-y-auto pr-1">
              <ul className="divide-y">
                {data.cumpleanosMes.map((c) => (
                  <li key={`c-${c.id_empleado}`} className="flex items-center gap-3 py-3">
                    <div className="grid h-12 w-12 place-content-center rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
                      <div className="text-lg font-bold leading-none">
                        {String(new Date(c.fecha_nacimiento + "T00:00:00Z").getUTCDate()).padStart(2, "0")}
                      </div>
                      <div className="mt-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-center">
                        {monthShortUpperMX(c.fecha_nacimiento)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight">{c.nombre_empleado}</div>
                      <div className="text-xs text-zinc-400">{c.nombre_empresa}</div>
                    </div>
                    <Pill tone="warn" className="ml-auto">{fmtDayMonthDeMX(c.fecha_nacimiento)}</Pill>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Aniversarios laborales" icon={PartyPopper} iconClass="text-sky-600"
          right={<Pill tone="info">{aniversariosMes.length} este mes</Pill>}
        >
          {aniversariosMes.length === 0 ? (
            <Empty>No hay aniversarios este mes</Empty>
          ) : (
            <div className="max-h-64 overflow-y-auto pr-1">
              <ul className="divide-y">
                {aniversariosMes.map((a) => {
                  const years = getServiceYears(a.fecha_ingreso);
                  return (
                    <li key={`a-${a.id_empleado}`} className="flex items-center gap-3 py-3">
                      <div className="grid h-12 w-12 place-content-center rounded-lg border border-sky-200 bg-sky-50 text-sky-900">
                        <div className="text-lg font-bold leading-none">
                          {String(new Date(a.fecha_ingreso + "T00:00:00Z").getUTCDate()).padStart(2, "0")}
                        </div>
                        <div className="mt-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-center">
                          {monthShortUpperMX(a.fecha_ingreso)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-tight">
                          {a.nombre_empleado} · {years} año{years !== 1 ? "s" : ""}
                        </div>
                        <div className="text-xs text-zinc-400">{a.nombre_empresa}</div>
                      </div>
                      <Pill tone="info" className="ml-auto">{fmtDayMonthDeMX(a.fecha_ingreso)}</Pill>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>

      <AccesosRapidos />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-bloques                                                        */
/* ------------------------------------------------------------------ */

function RankingIncidencias({ items }) {
  const withTotal = items.map((d) => ({
    ...d,
    total: (d.faltas || 0) + (d.tardanzas || 0),
  }));
  const max = Math.max(1, ...withTotal.map((d) => d.total));
  return (
    <div className="flex flex-col gap-3">
      {withTotal.map((d, i) => (
        <div key={i} className="grid grid-cols-[24px_1fr] items-start gap-2.5">
          <span
            className={
              "grid size-6 place-content-center rounded-md border text-[11px] font-bold " +
              (i === 0
                ? "border-rose-200 bg-rose-50 text-rose-600"
                : "border-zinc-200 bg-zinc-50 text-zinc-500")
            }
          >
            {i + 1}
          </span>
          <div className="min-w-0">
            <div className="flex justify-between gap-2 text-sm font-semibold">
              <span className="truncate">{d.departamento || d.nombre}</span>
              <span className="text-rose-600 tabular-nums">{d.total} incidencias</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <span className="block h-full rounded-full bg-rose-500" style={{ width: `${(d.total / max) * 100}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              {d.faltas || 0} faltas · {d.tardanzas || 0} tardanzas
              {d.tasaAusentismo != null && ` · ${d.tasaAusentismo}% ausentismo`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RotacionCard({ rotacion }) {
  const stat = (k, v, cls = "") => (
    <div className="rounded-xl border bg-zinc-50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{k}</div>
      <div className={`mt-1 flex items-baseline gap-1.5 text-2xl font-bold tabular-nums ${cls}`}>{v}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {stat("Altas", <><ArrowUp className="size-4" />{rotacion.altas ?? 0}</>, "text-emerald-600")}
      {stat("Bajas", <><ArrowDown className="size-4" />{rotacion.bajas ?? 0}</>, "text-rose-600")}
      {stat("Rotación", <>{rotacion.rotacionPct ?? 0}<span className="text-sm font-medium">%</span></>)}
      {stat("Antigüedad prom.", <>{rotacion.antiguedadPromedio ?? 0}<span className="text-sm font-medium">años</span></>)}
      <div className="col-span-2 rounded-xl border bg-zinc-50 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Plantilla neta</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">
          {(rotacion.plantillaNeta ?? 0) >= 0 ? "+" : ""}{rotacion.plantillaNeta ?? 0}
          {rotacion.plantillaAnterior != null && (
            <span className="ml-2 text-sm font-medium text-zinc-500">
              vs. periodo anterior ({rotacion.plantillaAnterior} → {(rotacion.plantillaAnterior || 0) + (rotacion.plantillaNeta || 0)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Heatmap({ heatmap }) {
  const dias = heatmap.dias || [];
  const unidades = heatmap.unidades || [];
  const valores = heatmap.valores || [];
  const shade = (v) => {
    const o = Math.round((((v ?? 0) / 100) * 0.85 + 0.06) * 100);
    return `color-mix(in srgb, var(--color-emerald-500, #10b981) ${o}%, #f4f4f5)`;
  };
  const cols = `120px repeat(${dias.length}, minmax(0, 1fr))`;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[360px] flex flex-col gap-1">
        <div className="grid gap-1" style={{ gridTemplateColumns: cols }}>
          <span />
          {dias.map((d, i) => (
            <span key={i} className="text-center text-[10px] text-zinc-400">{d}</span>
          ))}
        </div>
        {unidades.map((u, ri) => (
          <div key={ri} className="grid items-center gap-1" style={{ gridTemplateColumns: cols }}>
            <span className="truncate text-[12px] text-zinc-600">{u}</span>
            {(valores[ri] || []).map((v, ci) => (
              <span
                key={ci}
                title={`${u} · ${dias[ci]}: ${v}%`}
                className="h-5 rounded"
                style={{ background: shade(v) }}
              />
            ))}
          </div>
        ))}
        <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-zinc-400">
          Menos
          {[20, 50, 80, 100].map((v) => (
            <span key={v} className="h-4 w-4 rounded" style={{ background: shade(v) }} />
          ))}
          Más
        </div>
      </div>
    </div>
  );
}
