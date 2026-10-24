"use client";
import { ChevronRight, FileText, Palmtree } from "lucide-react";
import { isVacation } from "@/lib/solicitudes-equipo/model.mjs";
import RequestDates from "./RequestDates";
import { StatusBadge } from "./shared";

export function RequestSummary({ row, chevron = false }) {
  const vacation = isVacation(row);
  const Icon = vacation ? Palmtree : FileText;
  const color = row.estado === "Rechazado" ? "bg-red-50 text-red-600" : vacation ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600";
  return <div className="flex items-start gap-3">
    <span className={`grid size-11 shrink-0 place-items-center rounded-full ${color}`}><Icon className="size-6" aria-hidden="true" /></span>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="text-sm font-semibold">{row.tipo_permiso_nombre || "Solicitud"}</h2><StatusBadge status={row.estado} /></div><RequestDates row={row} /></div>
    {chevron && <ChevronRight className="my-auto size-4 shrink-0 text-slate-500" aria-hidden="true" />}
  </div>;
}
export default function RequestCards({ data, onOpen }) {
  return <div className="space-y-3">{data.map(row => <article key={row.id} className="rounded-xl border border-slate-200 bg-white px-3.5 pt-4">
    <RequestSummary row={row} />
    <div className="mt-3 flex items-center border-t border-slate-100 text-sm font-medium text-blue-600">
      <button onClick={() => onOpen(row, "ver")} className="min-h-11 pr-5">{row.estado === "Rechazado" ? "Ver motivo" : "Ver detalle"}</button>
      {row.estado === "Pendiente" && <><span className="h-4 border-l border-slate-200" /><button onClick={() => onOpen(row, "editar")} className="min-h-11 px-5">Editar</button></>}
      <ChevronRight className="ml-auto size-4 text-slate-500" aria-hidden="true" />
    </div>
  </article>)}</div>;
}
