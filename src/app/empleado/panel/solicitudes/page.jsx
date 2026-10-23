"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PermissionDialog } from "@/components/Permission/PermissionDialog";
import { usePermisosEmpleado } from "@/hooks/usePermisoPorEmpleado";
import VacationBalance from "@/components/empleado/VacationBalance";
import RequestCards from "@/components/empleado/RequestCards";
import { DataState } from "@/components/empleado/shared";

export default function SolicitudesPage() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("crear");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data, total, mutate, error, isLoading } = usePermisosEmpleado(page, limit);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("nueva") === "1") {
      setOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  const openRequest = (row, nextMode) => { setSelected(row); setMode(nextMode); setOpen(true); };
  return <div className="space-y-5"><h1 className="text-3xl font-bold tracking-tight">Mis solicitudes</h1>
    <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white" onClick={() => openRequest(null, "crear")}><Plus className="size-5" />Nueva solicitud</button>
    <VacationBalance />
    <PermissionDialog open={open} setOpen={setOpen} mutate={() => { setPage(1); mutate(); }} mode={mode} selected={selected} />
    <DataState loading={isLoading} error={error} retry={mutate}>
      <p className="text-sm text-slate-500">{total} solicitudes</p>
      {data.length ? <RequestCards data={data} onOpen={openRequest} /> : <p className="rounded-xl border border-dashed p-6 text-center text-slate-500">Aún no tienes solicitudes. Crea una con el botón de arriba.</p>}
      {total > limit && <div className="flex items-center justify-between gap-2"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="min-h-11 rounded-xl border bg-white px-4 disabled:opacity-40">Anterior</button><span className="text-sm">{page} de {Math.ceil(total / limit)}</span><button disabled={page * limit >= total} onClick={() => setPage(p => p + 1)} className="min-h-11 rounded-xl border bg-white px-4 disabled:opacity-40">Siguiente</button></div>}
    </DataState>
  </div>;
}
