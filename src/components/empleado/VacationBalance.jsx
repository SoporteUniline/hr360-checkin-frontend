"use client";
import useSWR from "swr";
import { CalendarDays } from "lucide-react";
import { fetcherWithToken } from "@/lib/fetcher";
import { cardClass, DataState } from "./shared";
export default function VacationBalance() {
  const { data, error, isLoading, mutate } = useSWR("/checador/vacaciones/mi-saldo", fetcherWithToken, { shouldRetryOnError: false });
  return <section className={cardClass}><div className="mb-3 flex items-center gap-3"><CalendarDays className="size-5 text-blue-600" /><h2 className="text-sm text-slate-500">Vacaciones disponibles</h2></div><DataState loading={isLoading} error={error} retry={mutate}>{data && <><p className="text-3xl font-bold">{data.dias_disponibles ?? "—"} <span className="text-base font-normal text-slate-500">días</span></p><p className="mt-2 text-sm text-slate-500">{data.dias_cargados ?? "—"} asignados · {data.dias_tomados ?? "—"} utilizados</p></>}</DataState></section>;
}
