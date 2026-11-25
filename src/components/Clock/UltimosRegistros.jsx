// «Últimos» en el reloj de la empresa (kiosco, maqueta aprobada 26/11/2026): tarjeta compacta con las 3 personas que
// checaron más reciente (nombre · movimiento y la hora con su color) y cuántas checadas van hoy. La lista llega ordenada
// del más reciente al más antiguo.
const TONO = {
  entrada: { texto: "Entrada", color: "text-emerald-700" },
  salida: { texto: "Salida", color: "text-rose-700" },
  comida: { texto: "Comida", color: "text-amber-700" },
};

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

// Nombre y primer apellido: el renglón es angosto.
const nombreCorto = (nombre) => nombre.split(/\s+/).slice(0, 2).join(" ");

export default function UltimosRegistros({ movimientos, isLoading, formatearHora, totalRegistros, cuantos = 3 }) {
  const filas = ultimoPorPersona(movimientos || []).slice(0, cuantos);
  return (
    <>
      <div className="mb-1.5 flex items-center justify-between text-[13px] text-slate-600">
        <h2 className="font-bold text-slate-900">Últimos</h2>
        <span className="tabular-nums">{totalRegistros ?? 0} hoy</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {isLoading ? [...Array(cuantos)].map((_, i) => (
          <li key={i} className="py-1.5"><span className="block h-4 w-40 animate-pulse rounded bg-slate-100" /></li>
        )) : filas.length ? filas.map((f) => {
          const tono = TONO[f.tipo];
          return (
            <li key={f.clave} className="flex items-center justify-between gap-3 py-1.5 text-[14.5px]">
              <span className="min-w-0 truncate text-slate-900">{nombreCorto(f.nombre)} · <span className={f.tipo === "comida" ? tono.color : "text-slate-600"}>{tono.texto}</span></span>
              <span className={`shrink-0 font-bold tabular-nums ${tono.color}`}>{formatearHora(f.hora).replace(/:\d{2} /, " ")}</span>
            </li>
          );
        }) : <li className="py-2 text-sm text-slate-500">Aún no hay checadas hoy</li>}
      </ul>
    </>
  );
}
