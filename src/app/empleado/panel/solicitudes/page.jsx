"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PermissionDialog } from "@/components/Permission/PermissionDialog";
import useEmployeeRequests from "@/hooks/useEmployeeRequests";
import VacationBalance from "@/components/empleado/VacationBalance";
import RequestCards from "@/components/empleado/RequestCards";
import { DataState } from "@/components/empleado/shared";

export default function SolicitudesPage() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("crear");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [status, setStatus] = useState("Todas");
  const { data: all, mutate, error, isLoading } = useEmployeeRequests();
  const filtered = all.filter(row => status === "Todas" || row.estado === status);
  const total = filtered.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / limit)));
  const data = filtered.slice((currentPage - 1) * limit, currentPage * limit);
  const tabs = [["Todas","Todas"],["Pendiente","Pendientes"],["Aprobado","Aprobadas"],["Rechazado","Rechazadas"]];
  if (all.some(row => row.estado === "Cancelado")) tabs.push(["Cancelado","Canceladas"]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("nueva") === "1") {
      setOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  const openRequest = (row, nextMode) => { setSelected(row); setMode(nextMode); setOpen(true); };
  return <div className="space-y-5"><h1 className="text-3xl font-bold tracking-tight">Mis solicitudes</h1>
    <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white" onClick={() => openRequest(null, "crear")}><Plus className="size-5" />Nueva solicitud</button>
    <VacationBalance compact />
    <PermissionDialog open={open} setOpen={setOpen} mutate={() => { setPage(1); mutate(); }} mode={mode} selected={selected} />
    <DataState loading={isLoading} error={error} retry={mutate}>
      <div aria-label="Estado de solicitudes" className="flex justify-between gap-1 overflow-x-auto border-b border-slate-200">{tabs.map(([value, label]) => <button key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }} className={`min-h-12 shrink-0 border-b-2 text-[11px] font-medium tracking-normal ${status === value ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>{label} <span className="ml-0.5 rounded-full bg-slate-100 px-1 text-[10px]">{value === "Todas" ? all.length : all.filter(row => row.estado === value).length}</span></button>)}</div>
      <p className="sr-only" aria-live="polite">{total} solicitudes{status !== "Todas" ? " en este estado" : ""}</p>
      {data.length ? <RequestCards data={data} onOpen={openRequest} /> : <p className="rounded-xl border border-dashed p-6 text-center text-slate-500">No hay solicitudes para este estado.</p>}
      {total > limit && <div className="flex items-center justify-between gap-2"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="min-h-11 rounded-xl border bg-white px-4 disabled:opacity-40">Anterior</button><span className="text-sm">{currentPage} de {Math.ceil(total / limit)}</span><button disabled={currentPage * limit >= total} onClick={() => setPage(currentPage + 1)} className="min-h-11 rounded-xl border bg-white px-4 disabled:opacity-40">Siguiente</button></div>}
    </DataState>
  </div>;
}
