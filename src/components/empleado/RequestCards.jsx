"use client";
import RequestDates from "./RequestDates";
import { cardClass, StatusBadge } from "./shared";
export default function RequestCards({ data, onOpen }) {
  return <div className="space-y-3">{data.map(row => <article key={row.id} className={cardClass}><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 break-words font-semibold">{row.tipo_permiso_nombre || "Solicitud"}</h2><StatusBadge status={row.estado} /></div><RequestDates row={row} />{row.motivo && <p className="mt-2 line-clamp-2 break-words text-sm text-slate-600">{row.motivo}</p>}<div className="mt-3 flex flex-wrap gap-3"><button onClick={() => onOpen(row, "ver")} className="min-h-11 rounded-lg bg-blue-50 px-4 text-sm font-semibold text-blue-700">Ver detalle</button>{row.estado === "Pendiente" && <button onClick={() => onOpen(row, "editar")} className="min-h-11 rounded-lg border px-4 text-sm font-semibold">Editar solicitud</button>}</div></article>)}</div>;
}
