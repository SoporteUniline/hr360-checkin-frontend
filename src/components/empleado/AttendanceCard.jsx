"use client";
import { LogIn, LogOut } from "lucide-react";
import { cardClass, StatusBadge } from "./shared";
import { formatDate } from "@/lib/solicitudes-equipo/model.mjs";
export function attendanceTime(value, timezone) {
  if (!value || value === "-") return "—";
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0, 5);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timezone }).format(date);
}
export default function AttendanceCard({ row, timezone, today = false, compact = false }) {
  const entry = row.entrada_corregida && row.entrada_corregida !== "-" ? row.entrada_corregida : row.hora_entrada || row.entrada;
  const exit = row.salida_corregida && row.salida_corregida !== "-" ? row.salida_corregida : row.hora_salida || row.salida;
  if (compact) return <div><div className="flex items-center justify-between gap-2"><div className="flex gap-6 text-sm"><span className="text-slate-500">Entrada <strong className="block text-base text-slate-900">{attendanceTime(entry, timezone)}</strong></span><span className="text-slate-500">Salida <strong className="block text-base text-slate-900">{attendanceTime(exit, timezone)}</strong></span></div><StatusBadge status={row.estado} /></div></div>;
  return <article className={cardClass}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{today ? "Mi jornada de hoy" : formatDate(row.fecha)}</h2><StatusBadge status={row.estado} /></div>
    <div className="grid grid-cols-2 gap-3">
      {[["Entrada", entry, LogIn, "text-emerald-600"], ["Salida", exit, LogOut, "text-rose-600"]].map(([label, time, Icon, color]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-2 text-xs text-slate-500"><Icon className={`size-4 ${color}`} />{label}</div><p className="mt-2 text-xl font-bold tabular-nums">{attendanceTime(time, timezone)}</p></div>)}
    </div>
    {attendanceTime(exit, timezone) === "—" && <p className="mt-3 text-sm text-slate-500">Sin salida registrada.</p>}
    {!today && <details className="mt-3 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-medium text-blue-700">Ver detalle</summary><dl className="space-y-2 border-t pt-3 text-slate-600"><div>Entrada original: {attendanceTime(row.hora_entrada || row.entrada, timezone)}</div><div>Salida original: {attendanceTime(row.hora_salida || row.salida, timezone)}</div>{row.entrada_corregida && row.entrada_corregida !== "-" && <div>Entrada corregida: {attendanceTime(row.entrada_corregida, timezone)}</div>}{row.salida_corregida && row.salida_corregida !== "-" && <div>Salida corregida: {attendanceTime(row.salida_corregida, timezone)}</div>}</dl></details>}
  </article>;
}
