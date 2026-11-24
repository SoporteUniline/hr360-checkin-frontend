"use client";

// «Motivos (por qué)» del catálogo de tipos de registro: visita al médico, permiso personal… Los globales vienen del
// sistema (solo lectura); cada empresa agrega los suyos y los oculta. GET/POST/PUT /checador/motivos-permiso.
import { useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { Lock, Plus, X } from "lucide-react";
import axios from "@/lib/axios";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";

export const CLAVE_MOTIVOS = "/checador/motivos-permiso";

export default function MotivosPermiso() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, error, isLoading, mutate } = useSWR(CLAVE_MOTIVOS, fetcherWithToken, swr_config);
  const [nuevo, setNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const motivos = Array.isArray(data?.motivos) ? data.motivos : [];
  const existe = (n) => motivos.some((m) => m.nombre.trim().toLowerCase() === n.trim().toLowerCase());

  const pedir = async (fn, ok) => {
    setGuardando(true);
    try { await fn(); enqueueSnackbar(ok, { variant: "success" }); await mutate(); return true; }
    catch (e) { enqueueSnackbar(e?.response?.data?.error || "No se pudo guardar el motivo.", { variant: "error" }); return false; }
    finally { setGuardando(false); }
  };
  const agregar = async () => {
    const nombre = nuevo.trim();
    if (!nombre || existe(nombre)) return;
    if (await pedir(() => axios.post(CLAVE_MOTIVOS, { nombre }), `Motivo «${nombre}» agregado.`)) setNuevo("");
  };
  const ocultar = (m) => pedir(() => axios.put(`${CLAVE_MOTIVOS}/${m.id}`, { activo: false }), `Motivo «${m.nombre}» oculto.`);

  return (
    <section data-motivos className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <h2 className="text-[15px] font-semibold text-slate-900">Motivos (por qué)</h2>
      <p className="mt-0.5 text-[13px] text-slate-500">
        El tipo dice qué pasó y cuánto se paga; el motivo dice por qué. Los del sistema <Lock className="inline h-3 w-3" aria-label="no editables" /> son para todas
        las empresas; agrega los de tu empresa u ocúltalos cuando ya no los uses.
      </p>
      {error ? <p role="alert" className="mt-3 text-[13px] text-rose-700">No se pudieron cargar los motivos.</p> : null}
      {isLoading ? <p role="status" className="mt-3 text-[13px] text-slate-500">Cargando motivos…</p> : null}
      <ul className="mt-3 flex flex-wrap gap-2">
        {motivos.map((m) => (
          <li key={m.id} data-motivo={m.nombre}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-100 pl-3 pr-1.5 text-[13px] text-slate-700">
            {m.nombre}
            {m.global ? (
              <Lock className="mr-1 h-3.5 w-3.5 text-slate-400" aria-label="Del sistema" />
            ) : (
              <button type="button" disabled={guardando} onClick={() => ocultar(m)} aria-label={`Ocultar ${m.nombre}`} title="Ocultar"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex max-w-md gap-2">
        <input aria-label="Nuevo motivo" placeholder="Nuevo motivo de tu empresa…" value={nuevo} maxLength={120}
          onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") agregar(); }}
          className="h-9 min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <button type="button" onClick={agregar} disabled={guardando || !nuevo.trim() || existe(nuevo)}
          className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-200 bg-white px-3 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <Plus className="h-4 w-4" aria-hidden />Agregar
        </button>
      </div>
      {nuevo.trim() && existe(nuevo) ? <p className="mt-1 text-[12px] text-amber-700">Ese motivo ya existe.</p> : null}
      <p className="mt-3 text-[12px] text-slate-500">«Entrada antes de tiempo» y «salida después» no son permisos: los calcula el reloj. Llegar antes no genera extra; salir después sí, solo si alguien la autoriza.</p>
    </section>
  );
}
