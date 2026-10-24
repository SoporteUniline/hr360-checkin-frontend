import Link from "next/link";
import { ChevronRight } from "lucide-react";
export const cardClass = "rounded-2xl border border-slate-200 bg-white p-5";
export function DataState({ loading, error, retry, children }) {
  if (loading) return <p role="status" className="rounded-xl bg-slate-100 p-5 text-sm text-slate-500">Consultando información…</p>;
  if (error) return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>No pudimos consultar esta información. Intenta de nuevo.</p>{retry && <button onClick={() => retry()} className="mt-2 min-h-11 font-semibold text-blue-700">Reintentar</button>}</div>;
  return children;
}
export function MenuLink({ href, icon: Icon, title, description }) {
  return <Link href={href} className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:bg-blue-50"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><Icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span>{description && <span className="block text-sm text-slate-500">{description}</span>}</span><ChevronRight className="size-4 shrink-0 text-slate-400" /></Link>;
}
export function StatusBadge({ status }) {
  const color = /aprobado|a tiempo|abierto|presente/i.test(status) ? "bg-emerald-50 text-emerald-700" : /rechazado|falta|ausente/i.test(status) ? "bg-red-50 text-red-700" : /pendiente|retardo|tardanza/i.test(status) ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600";
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{status || "Sin estado"}</span>;
}
