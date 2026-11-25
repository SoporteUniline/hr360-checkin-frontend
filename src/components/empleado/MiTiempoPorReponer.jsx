"use client";

// Inicio del empleado: cuánto tiempo debe por permisos por horas que se reponen y de dónde
// sale (cada permiso, cada reposición y cada ajuste de RH). Solo lectura. El backend solo le devuelve su propia cuenta
// (GET /checador/cuenta-horas/:id_empleado). Si nunca ha tenido permisos que se reponen, no se muestra.
import useSWR from "swr";
import { Clock3 } from "lucide-react";
import { fetcherWithToken } from "@/lib/fetcher";
import { formatearFechaCorta } from "@/lib/formatDate";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { movimientosCuenta } from "@/lib/asistencia/permisoHoras.mjs";

export default function MiTiempoPorReponer({ idEmpleado }) {
  const { data, error } = useSWR(idEmpleado ? `/checador/cuenta-horas/${idEmpleado}` : null, fetcherWithToken, { revalidateOnFocus: false, shouldRetryOnError: false });
  const cuenta = data?.data;
  if (error || !cuenta || (!cuenta.cargos?.length && !cuenta.cierres?.length)) return null;
  const movimientos = movimientosCuenta(cuenta).filter((m) => !m.deshecho);
  const debe = Number(cuenta.debe) || 0;

  return (
    <section aria-label="Tiempo por reponer" className={`rounded-xl border p-4 ${debe ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start gap-3">
        <span className={`rounded-xl p-2 ${debe ? "bg-amber-100 text-amber-700" : "bg-green-50 text-green-700"}`}><Clock3 className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{debe ? `Debes ${formatearMinutos(debe)}` : "No debes tiempo"}</h2>
          <p className="text-sm text-slate-600">
            {debe ? "Por permisos por horas que se reponen. Se descuenta cuando trabajas tiempo de más y tu jefe lo marca como reposición." : "Estás al corriente con tus permisos por horas."}
          </p>
        </div>
      </div>
      {movimientos.length ? (
        <details className="mt-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-blue-700">Ver de dónde sale</summary>
          <ul className="divide-y divide-slate-200/70 text-sm">
            {movimientos.map((m) => (
              <li key={m.clave} className="flex items-center gap-3 py-2">
                <span className="w-16 shrink-0 text-xs text-slate-500">{formatearFechaCorta(m.fecha)}</span>
                <span className="min-w-0 flex-1">
                  {m.texto}
                  {m.nota ? <span className="block truncate text-xs text-slate-500">{m.nota}</span> : null}
                  {m.nomina ? <span className="block text-xs text-slate-600">{m.nomina}</span> : null}
                </span>
                <span className={`shrink-0 font-semibold tabular-nums ${m.minutos > 0 ? "text-amber-700" : "text-green-700"}`}>
                  {m.minutos > 0 ? "+" : "−"}{formatearMinutos(Math.abs(m.minutos))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">+ suma a lo que debes · − lo que ya repusiste o te ajustó Recursos Humanos.</p>
        </details>
      ) : null}
    </section>
  );
}
