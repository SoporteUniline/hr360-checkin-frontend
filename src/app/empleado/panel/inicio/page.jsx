"use client";
import Link from "next/link";
import { RequestSummary } from "@/components/empleado/RequestCards";
import useSWR from "swr";
import { Clock3, Plus } from "lucide-react";
import useEmpleadoSesion from "@/hooks/useEmpleadoSesion";
import { useEmpresaTimezone } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";
import { usePermisosEmpleado } from "@/hooks/usePermisoPorEmpleado";
import VacationBalance from "@/components/empleado/VacationBalance";
import AttendanceCard from "@/components/empleado/AttendanceCard";
import { DataState } from "@/components/empleado/shared";

export default function EmployeeHome() {
  const session = useEmpleadoSesion();
  const requests = usePermisosEmpleado(1, 2);
  const timezone = useEmpresaTimezone(session.empresa);
  const { data, error, isLoading, mutate } = useSWR(session.id ? `/checador/reloj/registros-del-dia-empleado?id_empleado=${session.id}` : null, fetcherWithToken, { refreshInterval: 30000, shouldRetryOnError: false });
  const rows = Array.isArray(data?.registrosHoy) ? data.registrosHoy : [];
  return <div className="space-y-4">
    <div><h1 className="text-3xl font-bold tracking-tight">Hola, {session.dataUser?.nombre?.split(" ")[0] || "bienvenido"}</h1><p className="mt-1 text-base first-letter:uppercase text-slate-500">{new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(new Date())}</p></div>
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <h2 className="mb-3 font-semibold">Tu jornada de hoy</h2>
      <DataState loading={session.isLoading || isLoading} error={session.error || error} retry={mutate}>
        {rows.length ? <div className="space-y-3">{rows.map((row, index) => <AttendanceCard key={row.id || index} row={row} timezone={data?.zona_horaria || timezone} today compact />)}</div> : <p className="flex items-center gap-3 text-sm text-slate-500"><Clock3 className="size-5" />Sin registros</p>}
      </DataState>
      <Link href="/empleado/reloj-checador" className="mt-5 flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">Checar entrada o salida</Link>
    </section>
    <VacationBalance />
    <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold">Solicitudes recientes</h2><Link href="/empleado/panel/solicitudes" className="flex min-h-11 items-center text-sm font-medium text-blue-600">Ver todas</Link></div><DataState loading={requests.isLoading} error={requests.error} retry={requests.mutate}>{requests.data.length ? requests.data.slice(0, 2).map(row => <Link href="/empleado/panel/solicitudes" key={row.id} className="block rounded-xl border border-slate-200 bg-white p-3.5"><RequestSummary row={row} chevron /></Link>) : <p className="text-sm text-slate-500">Aún no tienes solicitudes.</p>}</DataState></section>
    <Link href="/empleado/panel/solicitudes?nueva=1" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-600 text-sm font-medium text-blue-600"><Plus className="size-4" />Solicitar permiso</Link>
  </div>;
}
