"use client";

// Cuenta de horas por reponer del empleado (permisos por horas, R1 20/11/2026).
// Lo que debe = permisos que se reponen − reposiciones − cierres. RH la cierra a mano: Rebajar, Condonar u Otro.
// Solo lectura si no hay permisos por horas; si el empleado está dado de baja con horas pendientes, se avisa.
import { useState } from "react";
import useSWR from "swr";
import Cookies from "js-cookie";
import { Clock3, Undo2 } from "lucide-react";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { formatearFechaCorta } from "@/lib/formatDate";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { movimientosCuenta, TIPOS_CIERRE } from "@/lib/asistencia/permisoHoras.mjs";

const auth = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` } });

function FormCierre({ debe, onGuardar, guardando }) {
  const [tipo, setTipo] = useState("");
  const [horas, setHoras] = useState("");
  const [minutos, setMinutos] = useState("");
  const [nota, setNota] = useState("");
  const total = (Number(horas) || 0) * 60 + (Number(minutos) || 0);
  if (!tipo) {
    return (
      <div className="flex flex-wrap gap-2">
        {TIPOS_CIERRE.map((t) => (
          <button key={t.valor} type="button" onClick={() => setTipo(t.valor)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {t.texto}
          </button>
        ))}
      </div>
    );
  }
  const error = total <= 0 ? "Indica el tiempo." : total > debe ? `No puede pasar de ${formatearMinutos(debe)}.` : tipo === "otro" && !nota.trim() ? "Escribe el motivo." : "";
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold text-slate-700">{TIPOS_CIERRE.find((t) => t.valor === tipo)?.texto} · debe {formatearMinutos(debe)}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input aria-label="Horas" type="number" min="0" value={horas} onChange={(e) => setHoras(e.target.value)} className="h-9 w-16 rounded-md border border-slate-200 px-2" /> h
        <input aria-label="Minutos" type="number" min="0" max="59" value={minutos} onChange={(e) => setMinutos(e.target.value)} className="h-9 w-16 rounded-md border border-slate-200 px-2" /> min
        <button type="button" onClick={() => { setHoras(String(Math.floor(debe / 60))); setMinutos(String(debe % 60)); }}
          className="text-xs font-semibold text-blue-700 hover:underline">Todo</button>
      </div>
      <input aria-label="Nota" placeholder={tipo === "otro" ? "Motivo (obligatorio)" : "Nota (opcional)"} value={nota} onChange={(e) => setNota(e.target.value)}
        className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm" />
      {error && total > 0 && <p className="text-xs text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setTipo("")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Cancelar</button>
        <button type="button" disabled={Boolean(error) || guardando} onClick={() => onGuardar({ tipo, minutos: total, nota: nota.trim() || undefined })}
          className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Guardar</button>
      </div>
    </div>
  );
}

export default function CuentaHorasEmpleado({ idEmpleado, dadoDeBaja = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const url = idEmpleado ? `/checador/cuenta-horas/${idEmpleado}` : null;
  const { data, error, mutate } = useSWR(url, fetcherWithToken, { revalidateOnFocus: false, shouldRetryOnError: false });
  const [guardando, setGuardando] = useState(false);
  const cuenta = data?.data;
  // Sin migración o sin permisos por horas no se muestra nada.
  if (error || !cuenta || (!cuenta.cargos.length && !cuenta.cierres.length)) return null;

  const enviar = async (fn, ok) => {
    setGuardando(true);
    try {
      const r = await fn();
      await mutate({ ok: true, data: r.data.data }, { revalidate: false });
      enqueueSnackbar(ok, { variant: "success" });
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudo guardar.", { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4" aria-label="Cuenta de horas">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900">
          <Clock3 className="h-3.5 w-3.5 text-brand" /> Cuenta de horas por reponer
        </h3>
        <p className={`text-lg font-extrabold tabular-nums ${cuenta.debe ? "text-sky-700" : "text-emerald-700"}`}>
          {cuenta.debe ? `Debe ${formatearMinutos(cuenta.debe)}` : "Al corriente"}
        </p>
      </div>
      {dadoDeBaja && cuenta.debe > 0 && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          El empleado está dado de baja y tiene horas pendientes: ciérralas con Rebajar, Condonar u Otro.
        </p>
      )}
      <p className="mt-1 text-xs text-slate-500">
        Permisos {formatearMinutos(cuenta.total_cargos)} · repuesto {formatearMinutos(cuenta.total_repuesto)} · cerrado {formatearMinutos(cuenta.total_cerrado)}.
        Lo repone con «Repone» en el control de horas extra.
      </p>

      {cuenta.debe > 0 && (
        <div className="mt-3">
          {/* La key reinicia el formulario después de cada cierre guardado o deshecho. */}
          <FormCierre key={`${cuenta.cierres.length}-${cuenta.total_cerrado}`} debe={cuenta.debe} guardando={guardando}
            onGuardar={(cuerpo) => enviar(() => axios.post(`/checador/cuenta-horas/${idEmpleado}/cierres`, cuerpo, auth()), "Cuenta actualizada.")} />
        </div>
      )}

      <ul className="mt-3 divide-y divide-slate-100 text-sm">
        {movimientosCuenta(cuenta).map((m) => (
          <li key={m.clave} className={`flex items-center gap-3 py-2 ${m.deshecho ? "opacity-50" : ""}`}>
            <span className="w-20 shrink-0 font-mono text-xs text-slate-500">{formatearFechaCorta(m.fecha)}</span>
            <span className="min-w-0 flex-1">
              <span className={m.deshecho ? "line-through" : ""}>{m.texto}</span>
              {m.nota && <span className="block truncate text-xs text-slate-500">{m.nota}</span>}
              {m.deshecho && <span className="block text-xs text-slate-500">Deshecho{m.cierre?.borrado_por_nombre ? ` por ${m.cierre.borrado_por_nombre}` : ""}</span>}
            </span>
            <span className={`shrink-0 font-semibold tabular-nums ${m.minutos > 0 ? "text-sky-700" : "text-emerald-700"}`}>
              {m.minutos > 0 ? "+" : "−"}{formatearMinutos(Math.abs(m.minutos))}
            </span>
            {m.cierre && !m.deshecho && (
              <button type="button" disabled={guardando} title="Deshacer" aria-label="Deshacer cierre"
                onClick={() => enviar(() => axios.post(`/checador/cuenta-horas/cierres/${m.cierre.id}/deshacer`, {}, auth()), "Cierre deshecho.")}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <Undo2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
