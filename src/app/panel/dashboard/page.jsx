import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  UsersRound,
  AlarmClock,
  Gift,
  PartyPopper,
  XCircle,
  BarChart3,
  LineChart,
  Clock,
  FileCheck,
  Settings,
  Users,
} from "lucide-react";
import PermisosTable from "./PermisosTable";
import WeeklyTrend from "./WeeklyTrend";
import AccesosRapidos from "@/components/AccesosRapidos";
import SystemMessageRenderer from "@/components/system-messages/SystemMessageRenderer";

function monthShortUpperWithDot(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  let m = d.toLocaleString("es-MX", { month: "short" });
  m = m.replace(/\./g, "").slice(0, 3).toUpperCase() + ".";
  return m;
}

function fmtDayMonthDe(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = d
    .toLocaleString("es-MX", { month: "short" })
    .replace(/\./g, "")
    .toLowerCase();
  return `${day} de ${mon}`;
}

const MONTHS_SHORT_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function parseYMD(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function monthShortUpperMX(dateStr) {
  const parts = parseYMD(dateStr);
  if (!parts) return "";
  const idx = Math.min(Math.max(parts.m - 1, 0), 11);
  return (MONTHS_SHORT_ES[idx] || "").slice(0, 3).toUpperCase() + ".";
}

function fmtDayMonthDeMX(dateStr) {
  const parts = parseYMD(dateStr);
  if (!parts) return "";
  const day = String(parts.d).padStart(2, "0");
  const mon = (MONTHS_SHORT_ES[parts.m - 1] || "").toLowerCase();
  return `${day} de ${mon}`;
}

function formatTimeMexico(datetimeStr) {
  if (!datetimeStr) return "-";
  const hasTZ = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(datetimeStr);
  if (hasTZ) {
    try {
      const d = new Date(datetimeStr);
      return d.toLocaleTimeString("es-MX", {
        timeZone: "America/Mexico_City",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {}
  }
  const m = String(datetimeStr).match(/(\d{2}:\d{2})/);
  if (m) return m[1];
  try {
    const d = new Date(datetimeStr);
    return d.toLocaleTimeString("es-MX", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_) {
    return "-";
  }
}

function getServiceYears(fechaIngreso) {
  if (!fechaIngreso) return 0;
  const ingreso = new Date(`${String(fechaIngreso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(ingreso.getTime())) return 0;
  const today = new Date();
  let years = today.getUTCFullYear() - ingreso.getUTCFullYear();
  const hasAnniversaryThisYear =
    today.getUTCMonth() > ingreso.getUTCMonth() ||
    (today.getUTCMonth() === ingreso.getUTCMonth() &&
      today.getUTCDate() >= ingreso.getUTCDate());
  if (!hasAnniversaryThisYear) years -= 1;
  return Math.max(years, 0);
}

import { cookies } from "next/headers";

export default async function PanelDashboardPage() {
  const base =
    process.env.NEXT_PUBLIC_RUTA_BACKEND || "http://localhost:4000/api";
  let data = null;
  let empresaId = null;
  let token = null;
  try {
    let cookieStore = cookies();
    if (typeof cookieStore?.then === "function") {
      cookieStore = await cookieStore;
    }
    token = cookieStore?.get("token")?.value || null;
  } catch (_) {}

  let festivosYmd = [];
  try {
    if (empresaId && token) {
      const hUrl = new URL(`${base}/checador/holidays/${empresaId}`);
      hUrl.searchParams.set("page", "1");
      hUrl.searchParams.set("limit", "5000");
      hUrl.searchParams.set("filter", "");
      const hRes = await fetch(hUrl.toString(), {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const hJson = await hRes.json().catch(() => null);
      const list = hJson?.festivos || [];
      festivosYmd = Array.isArray(list)
        ? list
            .map((f) => String(f?.fecha || "").slice(0, 10))
            .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
        : [];
    }
  } catch (_) {
    festivosYmd = [];
  }
  try {
    const url = new URL(`${base}/checador/dashboard`);
    if (empresaId) url.searchParams.set("id_empresa", String(empresaId));
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const json = await res.json().catch(() => null);
    if (json?.ok) data = json.data;
    else data = null;
  } catch (_) {
    data = null;
  }

  let asistenciasHoy = [];
  try {
    if (empresaId && data?.fecha) {
      const aUrl = new URL(`${base}/checador/asistencias`);
      aUrl.searchParams.set("empresa", String(empresaId));
      aUrl.searchParams.set("fechaInicio", String(data.fecha));
      aUrl.searchParams.set("fechaFin", String(data.fecha));
      aUrl.searchParams.set("page", "1");
      aUrl.searchParams.set("limit", "200");
      const aRes = await fetch(aUrl.toString(), {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const aJson = await aRes.json().catch(() => null);
      if (aJson?.registros) asistenciasHoy = aJson.registros;
    }
  } catch (_) {}

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="text-sm text-red-600">
          No se pudo cargar el dashboard
        </div>
      </div>
    );
  }

  const asistenciaPct =
    data.totalEmpleados > 0
      ? Math.round((data.presentesHoy / data.totalEmpleados) * 100)
      : 0;
  const distribData =
    data.distribucionAsistenciaDetallada &&
    Array.isArray(data.distribucionAsistenciaDetallada)
      ? data.distribucionAsistenciaDetallada
      : data.distribucionAsistencia || [];
  const distribTotal = distribData.reduce(
    (acc, it) => acc + (it.count || 0),
    0,
  );
  const aniversariosMesFiltrados = (data.aniversariosMes || []).filter(
    (a) => getServiceYears(a.fecha_ingreso) >= 1,
  );

  function formatDateDMY(ymd) {
    if (!ymd) return "-";
    const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    try {
      const d = new Date(ymd);
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const yy = d.getUTCFullYear();
      return `${dd}/${mm}/${yy}`;
    } catch {
      return String(ymd);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <SystemMessageRenderer tipo="interna" contexto="dashboard" />
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
              TOTAL EMPLEADOS
            </CardTitle>
            <div className="grid size-7 sm:size-8 place-content-center rounded-md border border-violet-200 bg-violet-50">
              <UsersRound className="size-4 sm:size-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-semibold">
              {data.totalEmpleados}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Personal activo en el sistema
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
              PRESENTES HOY
            </CardTitle>
            <div className="grid size-7 sm:size-8 place-content-center rounded-md border border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="size-4 sm:size-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-semibold">
              {data.presentesHoy}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {asistenciaPct}% de asistencia
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
              TARDANZAS HOY
            </CardTitle>
            <div className="grid size-7 sm:size-8 place-content-center rounded-md border border-pink-200 bg-pink-50">
              <AlarmClock className="size-4 sm:size-4 text-pink-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-semibold">
              {data.tardanzasHoy}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Llegadas después de las 9:00 AM
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
              EVENTOS DEL MES
            </CardTitle>
            <div className="grid size-7 sm:size-8 place-content-center rounded-md border border-violet-200 bg-violet-50">
              <CalendarDays className="size-4 sm:size-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-semibold">
              {data.eventosMes}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Cumpleaños y aniversarios
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg font-semibold">Resumen del Día</span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="bg-white lg:col-span-4">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-base">Asistencias de Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 2xl:grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center flex flex-col items-center justify-center gap-1 h-16 sm:h-20 xl:h-auto">
                  <div className="text-emerald-600 text-lg sm:text-xl font-semibold">
                    {data.presentesHoy}
                  </div>
                  <div className="text-[10px] sm:text-[11px] xl:text-[10px] 2xl:text-[11px] text-zinc-500 mt-1 uppercase tracking-normal leading-snug wrap-break-word">
                    PRESENTES
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center flex flex-col items-center justify-center gap-1 h-16 sm:h-20 xl:h-auto">
                  <div className="text-amber-600 text-lg sm:text-xl font-semibold">
                    {data.tardanzasHoy}
                  </div>
                  <div className="text-[10px] sm:text-[11px] xl:text-[10px] 2xl:text-[11px] text-zinc-500 mt-1 uppercase tracking-normal leading-snug wrap-break-word">
                    TARDANZAS
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center flex flex-col items-center justify-center gap-1 h-16 sm:h-20 xl:h-auto">
                  <div className="text-rose-600 text-lg sm:text-xl font-semibold">
                    {data.ausentesHoy}
                  </div>
                  <div className="text-[10px] sm:text-[11px] xl:text-[10px] 2xl:text-[11px] text-zinc-500 mt-1 uppercase tracking-normal leading-snug wrap-break-word">
                    AUSENTES
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white lg:col-span-4">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Gift className="size-4 text-amber-600" /> Cumpleaños
              </CardTitle>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                {data.cumpleanosMes?.length || 0} este mes
              </span>
            </CardHeader>
            <CardContent>
              {!data.cumpleanosMes || data.cumpleanosMes.length === 0 ? (
                <div className="text-sm text-zinc-500">
                  No hay cumpleaños este mes
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto pr-1">
                  <ul className="divide-y">
                    {data.cumpleanosMes.map((c) => (
                      <li
                        key={`c-${c.id_empleado}`}
                        className="flex items-center gap-3 sm:gap-4 py-3 min-h-20"
                      >
                        <div className="grid w-14 h-14 place-content-center rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                          <div className="text-2xl font-bold leading-none">
                            {String(
                              new Date(
                                c.fecha_nacimiento + "T00:00:00Z",
                              ).getUTCDate(),
                            ).padStart(2, "0")}
                          </div>
                          <div className="text-[10px] uppercase leading-none mt-1 tracking-wide">
                            {monthShortUpperMX(c.fecha_nacimiento)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium leading-tight text-[15px] sm:text-base">
                            {c.nombre_empleado}
                          </div>
                          <div className="text-[11px] sm:text-xs text-zinc-500">
                            {c.nombre_empresa}
                          </div>
                        </div>
                        <div className="ml-auto">
                          <span className="inline-flex h-9 min-w-27.5 items-center justify-center rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-3 text-sm font-medium">
                            {fmtDayMonthDeMX(c.fecha_nacimiento)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white lg:col-span-4">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <PartyPopper className="size-4 text-indigo-600" /> Aniversarios
              </CardTitle>
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900">
                {aniversariosMesFiltrados.length} este mes
              </span>
            </CardHeader>
            <CardContent>
              {aniversariosMesFiltrados.length === 0 ? (
                <div className="text-sm text-zinc-500">
                  No hay aniversarios este mes
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto pr-1">
                  <ul className="divide-y">
                    {aniversariosMesFiltrados.map((a) => {
                      const years = getServiceYears(a.fecha_ingreso);
                      return (
                        <li
                          key={`a-${a.id_empleado}`}
                          className="flex items-center gap-3 sm:gap-4 py-3 min-h-20"
                        >
                          <div className="grid w-14 h-14 place-content-center rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold leading-none">
                            <div className="text-2xl">
                              {String(
                                new Date(
                                  a.fecha_ingreso + "T00:00:00Z",
                                ).getUTCDate(),
                              ).padStart(2, "0")}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium leading-tight text-[15px] sm:text-base">
                              {a.nombre_empleado} · {years} año
                              {years !== 1 ? "s" : ""}
                            </div>
                            <div className="text-[11px] sm:text-xs text-zinc-500">
                              {a.nombre_empresa}
                            </div>
                          </div>
                          <div className="ml-auto">
                            <span className="inline-flex h-9 min-w-27.5 items-center justify-center rounded-full bg-sky-50 text-sky-900 border border-sky-200 px-3 text-sm font-medium">
                              {fmtDayMonthDeMX(a.fecha_ingreso)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Card className="bg-white">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" /> Asistencias
              de Hoy · Detalle
            </CardTitle>
          </CardHeader>
          <CardContent>
            {asistenciasHoy.length === 0 ? (
              <div className="text-sm text-zinc-500">
                No hay registros de asistencia para hoy.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-105 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50 text-zinc-600">
                      <TableHead className="text-left px-3 py-2">
                        Empleado
                      </TableHead>
                      <TableHead className="text-left px-3 py-2">
                        Departamento
                      </TableHead>
                      <TableHead className="text-left px-3 py-2">
                        Tipo de registro
                      </TableHead>
                      <TableHead className="text-center px-3 py-2">
                        Fecha
                      </TableHead>
                      <TableHead className="text-center px-3 py-2">
                        Entrada
                      </TableHead>
                      <TableHead className="text-center px-3 py-2">
                        Salida
                      </TableHead>
                      <TableHead className="text-center px-3 py-2">
                        ¿Asistió?
                      </TableHead>
                      <TableHead className="text-center px-3 py-2">
                        ¿Goce de sueldo?
                      </TableHead>
                      <TableHead className="text-center px-3 py-2">
                        ¿Horas extra?
                      </TableHead>
                      <TableHead className="text-left px-3 py-2">
                        Observaciones
                      </TableHead>
                      <TableHead className="text-center px-3 py-2">
                        Estado
                      </TableHead>
                      <TableHead className="text-left px-3 py-2">
                        Estado asistencia
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asistenciasHoy.map((r) => (
                      <TableRow key={r.id} className="hover:bg-zinc-50">
                        <TableCell className="px-3 py-2">
                          {[r.nombre, r.apellido_paterno, r.apellido_materno]
                            .filter(Boolean)
                            .join(" ")}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {r.departamento || "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {r.tipo_registro_nombre || "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          {formatDateDMY(r.fecha)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          {r.entrada ? formatTimeMexico(r.entrada) : "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          {r.salida ? formatTimeMexico(r.salida) : "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          {r.asistencia ? "Sí" : "No"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          {r.goce_sueldo ? "Sí" : "No"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          {r.hrs_extra ? "Sí" : "No"}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {r.notas || "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          {r.estado || "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {r.estadoAsistencia || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="bg-white">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">Permisos Activos</CardTitle>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              {
                (data.permisosRangos || []).filter(
                  (p) =>
                    !String(p?.status?.label || "")
                      .toLowerCase()
                      .startsWith("terminado"),
                ).length
              }{" "}
              activos
            </span>
          </CardHeader>
          <CardContent>
            <PermisosTable
              rows={data.permisosRangos || []}
              festivosYmd={festivosYmd}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4">
        <Card className="bg-white">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4 text-indigo-600" /> Distribución por
              Tipo de Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {distribTotal === 0 ? (
              <div className="text-center text-sm text-zinc-500 py-10">
                No hay registros de asistencia hoy
              </div>
            ) : (
              <div className="space-y-5">
                <div className="h-6 w-full overflow-hidden rounded-md border bg-white">
                  <div className="flex h-full w-full">
                    {distribData
                      .filter((d) => d.count > 0)
                      .map((d) => {
                        const pct = Math.round((d.count / distribTotal) * 100);
                        const bg = {
                          emerald: "bg-emerald-500",
                          amber: "bg-amber-500",
                          rose: "bg-rose-500",
                          violet: "bg-violet-500",
                          indigo: "bg-indigo-500",
                          sky: "bg-sky-500",
                          fuchsia: "bg-fuchsia-500",
                          cyan: "bg-cyan-500",
                          teal: "bg-teal-500",
                          lime: "bg-lime-500",
                          orange: "bg-orange-500",
                        }[d.color];
                        return (
                          <div
                            key={`seg-${d.key}`}
                            className={`${bg} h-full`}
                            style={{ width: `${pct}%` }}
                            title={`${d.label}: ${d.count} (${pct}%)`}
                          />
                        );
                      })}
                  </div>
                </div>
                <ul className="flex flex-wrap gap-x-6 gap-y-2">
                  {distribData
                    .filter((d) => d.count > 0)
                    .map((d) => {
                      const pct = Math.round((d.count / distribTotal) * 100);
                      const dot = {
                        emerald: "bg-emerald-500",
                        amber: "bg-amber-500",
                        rose: "bg-rose-500",
                        violet: "bg-violet-500",
                        indigo: "bg-indigo-500",
                        sky: "bg-sky-500",
                        fuchsia: "bg-fuchsia-500",
                        cyan: "bg-cyan-500",
                        teal: "bg-teal-500",
                        lime: "bg-lime-500",
                        orange: "bg-orange-500",
                      }[d.color];
                      return (
                        <li
                          key={`leg-${d.key}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span
                            className={`inline-block size-3 rounded-full ${dot}`}
                          />
                          <span className="text-zinc-700">{d.label}</span>
                          <span className="text-zinc-500">
                            · {d.count} ({pct}%)
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <LineChart className="size-4 text-sky-600" /> Tendencia Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyTrend data={data.tendenciaSemanal || []} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg font-semibold">Análisis Detallado</span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-white">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-content-center rounded-md border border-amber-200 bg-amber-50">
                  <AlarmClock className="size-4 text-amber-600" />
                </div>
                <CardTitle className="text-base">
                  Registro de Tardanzas Hoy
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                  {data.tardanzasHoy} tardanza
                  {data.tardanzasHoy !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-zinc-500">
                  {data.tardanzasPctSobreRegistros}% de asistencias
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {data.tardanzasDetalle?.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-emerald-700">
                  <CheckCircle2 className="mr-2 size-4 text-emerald-600" />
                  ¡Excelente! No hay tardanzas hoy
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-50 text-zinc-600">
                          <th className="text-left px-3 py-2 font-medium w-12">
                            #
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Empleado
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Empresa
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Hora de entrada
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data?.tardanzasDetalle?.map((t, idx) => (
                          <tr
                            key={`t-${t.id_asistencia}`}
                            className="hover:bg-zinc-50"
                          >
                            <td className="px-3 py-2 text-zinc-500">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2">{t.nombre_empleado}</td>
                            <td className="px-3 py-2">{t.nombre_empresa}</td>
                            <td className="px-3 py-2 text-amber-700">
                              {t.hora_entrada
                                ? formatTimeMexico(t.hora_entrada)
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-content-center rounded-md border border-rose-200 bg-rose-50">
                  <XCircle className="size-4 text-rose-600" />
                </div>
                <CardTitle className="text-base">
                  Empleados Sin Checar Hoy
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                  {data.sinChecarCount} empleado
                  {data.sinChecarCount !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-zinc-500">
                  {data.sinChecarPct}% del total
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-600">
                        <th className="text-left px-3 py-2 font-medium w-12">
                          #
                        </th>
                        <th className="text-left px-3 py-2 font-medium">
                          Empleado
                        </th>
                        <th className="text-left px-3 py-2 font-medium">
                          Empresa
                        </th>
                        <th className="text-left px-3 py-2 font-medium">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.sinChecar?.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-6 text-center text-sm text-zinc-500"
                          >
                            Todos han registrado movimiento hoy
                          </td>
                        </tr>
                      ) : (
                        data?.sinChecar?.map((r, idx) => (
                          <tr
                            key={`sc-${r.id_empleado}`}
                            className="hover:bg-zinc-50"
                          >
                            <td className="px-3 py-2 text-zinc-500">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2">{r.nombre_empleado}</td>
                            <td className="px-3 py-2">{r.nombre_empresa}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                                <XCircle className="size-3" />
                                Sin checar
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AccesosRapidos />
    </div>
  );
}
