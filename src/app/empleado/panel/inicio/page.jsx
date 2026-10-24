"use client";
import Link from "next/link";
import RequestDates from "@/components/empleado/RequestDates";
import useSWR from "swr";
import { Clock3, FilePlus2 } from "lucide-react";
import useEmpleadoSesion from "@/hooks/useEmpleadoSesion";
import { useEmpresaTimezone } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";
import { usePermisosEmpleado } from "@/hooks/usePermisoPorEmpleado";
import { StatusBadge } from "@/components/empleado/shared";
import VacationBalance from "@/components/empleado/VacationBalance";
import AttendanceCard from "@/components/empleado/AttendanceCard";
import { DataState, MenuLink } from "@/components/empleado/shared";

export default function EmployeeHome() {
  const session = useEmpleadoSesion();
  const requests = usePermisosEmpleado(1, 3);
  const timezone = useEmpresaTimezone(session.empresa);
  const { data, error, isLoading, mutate } = useSWR(session.id ? `/checador/reloj/registros-del-dia-empleado?id_empleado=${session.id}` : null, fetcherWithToken, { refreshInterval: 30000, shouldRetryOnError: false });
  const rows = Array.isArray(data?.registrosHoy) ? data.registrosHoy : [];
  return <div className="space-y-5">
    <div><h1 className="text-3xl font-bold tracking-tight">Hola, {session.dataUser?.nombre?.split(" ")[0] || "bienvenido"}</h1><p className="mt-1 text-sm text-slate-500">Tu jornada y tus solicitudes, en un solo lugar.</p></div>
    <DataState loading={session.isLoading || isLoading} error={session.error || error} retry={mutate}>
      {rows.length ? rows.map((row, index) => <AttendanceCard key={row.id || index} row={row} timezone={data?.zona_horaria || timezone} today />) : <div className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Tu asistencia de hoy</h2><p className="mt-2 text-sm text-slate-500">Aún no tienes registros de hoy.</p></div>}
    </DataState>
    <Link href="/empleado/reloj-checador" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700"><Clock3 className="size-5" />Checar entrada o salida</Link>
    <VacationBalance />
    <section className="space-y-3"><h2 className="font-semibold">Mis solicitudes recientes</h2><DataState loading={requests.isLoading} error={requests.error} retry={requests.mutate}>{requests.data.length ? requests.data.map(row => <Link href="/empleado/panel/solicitudes" key={row.id} className="block rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{row.tipo_permiso_nombre}</span><StatusBadge status={row.estado} /></div><RequestDates row={row} /></Link>) : <p className="text-sm text-slate-500">Aún no tienes solicitudes.</p>}</DataState></section>
    <section className="space-y-3"><h2 className="font-semibold">Accesos rápidos</h2><MenuLink href="/empleado/panel/solicitudes?nueva=1" icon={FilePlus2} title="Solicitar permiso o vacaciones" /><MenuLink href="/empleado/panel/asistencias" icon={Clock3} title="Mis asistencias" description="Consulta tus entradas y salidas" /></section>
  </div>;
}
