import { Users } from "lucide-react";

// Lista compacta de las checadas de hoy para la columna lateral del reloj en modo kiosco (se desplaza por dentro).
export default function UltimosRegistros({ movimientos, isLoading, formatearHora, empleadosActivos, totalRegistros }) {
  const lista = movimientos?.slice(0, 10) || [];
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Users className="size-4 text-brand" aria-hidden="true" />
          Últimos registros
        </h2>
        <p className="text-xs text-slate-500"><span className="font-semibold text-slate-800">{empleadosActivos ?? 0}</span> activos · <span className="font-semibold text-slate-800">{totalRegistros ?? 0}</span> hoy</p>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain">
        {isLoading ? [...Array(5)].map((_, i) => (
          <li key={i} className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-slate-200" /></li>
        )) : lista.length ? lista.map((mov, i) => {
          const salida = mov.salida_corregida || mov.salida;
          return (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900">{mov.nombre}</span>
                <span className="block text-xs text-slate-500">{mov.nip}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs font-semibold tabular-nums">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{formatearHora(mov.entrada_corregida || mov.entrada)}</span>
                {salida && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">{formatearHora(salida)}</span>}
              </span>
            </li>
          );
        }) : <li className="px-4 py-6 text-center text-sm text-slate-500">No hay registros para el día de hoy aún</li>}
      </ul>
    </>
  );
}
