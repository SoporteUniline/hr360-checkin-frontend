"use client";
import Link from "next/link";
import useSWR from "swr";
import { CalendarDays, ChevronRight } from "lucide-react";
import { fetcherWithToken } from "@/lib/fetcher";
import { DataState } from "./shared";
export default function VacationBalance({ compact = false }) {
  const { data, error, isLoading, mutate } = useSWR("/checador/vacaciones/mi-saldo", fetcherWithToken, { shouldRetryOnError: false });
  return <DataState loading={isLoading} error={error} retry={mutate}>{data && (compact ?
    <p className="flex items-center gap-2 text-sm text-slate-500"><CalendarDays className="size-4 shrink-0" />{data.dias_disponibles ?? "—"} días de vacaciones disponibles</p> :
    <Link href="/empleado/panel/solicitudes" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"><span className="grid size-14 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><CalendarDays className="size-7" /></span><div className="flex-1"><h2 className="text-sm">Vacaciones disponibles</h2><p className="mt-1 text-[28px] font-bold leading-tight">{data.dias_disponibles ?? "—"} días</p></div><ChevronRight className="size-4 text-slate-500" /></Link>
  )}</DataState>;
}
