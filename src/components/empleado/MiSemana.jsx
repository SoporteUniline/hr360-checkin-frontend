"use client";
// «Mi semana»: resumen semanal (GET /checador/jornadas-legales/resumen-semanal). Programadas o extras en null =
// «Por revisar», nunca 0. Es orientativo: no es el cálculo de nómina.
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { hoyMexico } from "@/lib/asistencia/limiteLegal.mjs";

const valor = (min) => (min == null ? "Por revisar" : formatearMinutos(min));

export default function MiSemana() {
  const { data, error } = useSWR(`/checador/jornadas-legales/resumen-semanal?fecha=${hoyMexico()}`, fetcherWithToken, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    refreshInterval: 60000,
  });
  const r = data?.data?.resumen;
  if (error || !r) return null;
  const limite = r.regla_legal?.minutos_ordinarios_semanales ?? null;
  const progreso = r.progreso_porcentaje == null ? null : Math.min(100, Math.max(0, r.progreso_porcentaje));
  const anio = String(r.regla_legal?.vigencia_desde || "").slice(0, 4);
  return (
    <section aria-label="Mi semana" className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Mi semana</h2>
        {limite != null && <span className="text-xs text-slate-500">Límite legal{anio ? ` ${anio}` : ""}: {formatearMinutos(limite)}</span>}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-2"><dt className="text-[11px] text-slate-500">Trabajadas</dt><dd className="font-semibold tabular-nums">{valor(r.trabajadas_minutos)}</dd></div>
        <div className="rounded-lg bg-slate-50 p-2"><dt className="text-[11px] text-slate-500">Programadas</dt><dd className="font-semibold tabular-nums">{valor(r.programadas_minutos)}</dd></div>
        <div className="rounded-lg bg-slate-50 p-2"><dt className="text-[11px] text-slate-500">Posibles extra</dt><dd className="font-semibold tabular-nums">{valor(r.posibles_extra_minutos)}</dd></div>
      </dl>
      {progreso != null && (
        <div className="mt-3 h-2 w-full rounded-full bg-slate-100" role="progressbar" aria-label="Avance de la semana" aria-valuenow={Math.round(progreso)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progreso}%` }} />
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-500">Las horas extra solo cuentan cuando RH las autoriza.</p>
    </section>
  );
}
