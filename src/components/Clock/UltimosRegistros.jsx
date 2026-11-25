import { CalendarClock } from "lucide-react";

// «Hoy» en el reloj de la empresa (kiosco): un renglón por persona con su último movimiento (Entrada, Salida o Salió a
// comer) y la hora con su color. La lista llega ordenada del más reciente al más antiguo; se desplaza por dentro.
const TONO = {
  entrada: { texto: "Entrada", hora: "text-emerald-700", avatar: "bg-emerald-50 text-emerald-700" },
  salida: { texto: "Salida", hora: "text-rose-700", avatar: "bg-slate-100 text-slate-600" },
  comida: { texto: "Salió a comer", hora: "text-amber-700", avatar: "bg-amber-50 text-amber-700" },
};

const iniciales = (nombre) => String(nombre || "").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase() || "?";

export function ultimoPorPersona(movimientos = []) {
  const vistos = new Set();
  const filas = [];
  for (const mov of movimientos) {
    const clave = mov.nip ?? mov.id_empleado ?? mov.nombre;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const salida = mov.salida_corregida || mov.salida;
    const tipo = !salida ? "entrada" : mov.tipo_cierre === "comida" ? "comida" : "salida";
    filas.push({ clave, nombre: String(mov.nombre || "").trim(), tipo, hora: salida || mov.entrada_corregida || mov.entrada });
  }
  return filas;
}

export default function UltimosRegistros({ movimientos, isLoading, formatearHora, empleadosActivos, totalRegistros }) {
  const filas = ultimoPorPersona(movimientos || []).slice(0, 30);
  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Hoy</h2>
          <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{empleadosActivos ?? 0}</span> en turno ahora</p>
        </div>
        <p className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand tabular-nums">
          {totalRegistros ?? 0} {Number(totalRegistros) === 1 ? "checada" : "checadas"}
        </p>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1">
        {isLoading ? [...Array(5)].map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-2 py-2.5">
            <span className="size-9 animate-pulse rounded-full bg-slate-100" />
            <span className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          </li>
        )) : filas.length ? filas.map((f) => {
          const tono = TONO[f.tipo];
          return (
            <li key={f.clave} className="flex items-center gap-3 rounded-lg px-2 py-2">
              <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold ${tono.avatar}`}>{iniciales(f.nombre)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{f.nombre}</span>
                <span className="block text-xs text-slate-500">{tono.texto}</span>
              </span>
              <span className={`shrink-0 text-sm font-semibold tabular-nums ${tono.hora}`}>{formatearHora(f.hora).replace(/:\d{2} /, " ")}</span>
            </li>
          );
        }) : (
          <li className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <CalendarClock className="size-8 text-slate-300" aria-hidden="true" />
            <span className="text-sm text-slate-500">Aún no hay checadas hoy</span>
          </li>
        )}
      </ul>
    </>
  );
}
