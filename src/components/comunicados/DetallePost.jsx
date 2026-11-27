"use client";
// Detalle de una publicación en Mi espacio (maquetas «AppDetalle» y «Comentarios», aprobadas 27/11/2026). Abrirlo la
// marca como vista. Si pide confirmación: casilla «Leí el comunicado y estoy enterado» + «Confirmar de leído» (se guarda
// nombre, fecha, hora, IP y dispositivo). Backend: GET /mi/:id, POST /mi/:id/confirmar, POST /mi/:id/me-gusta.
import { useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { Capacitor } from "@capacitor/core";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import axios from "@/lib/axios";
import { API_MI, RUTA_MURO, dispositivo, errorDe, fechaHora, porConfirmar, principal } from "@/lib/comunicados/comunicados.mjs";
import Publicacion from "./Publicacion";
import Comentarios from "./Comentarios";
import useMeGusta from "./useMeGusta";
import { useZona } from "./comun";

const get = (url) => axios.get(url).then((r) => r.data);
const urlMeGusta = (id) => `${API_MI}/${encodeURIComponent(id)}/me-gusta`;
const esNativo = () => { try { return Capacitor.isNativePlatform() || navigator.userAgent.includes("AdamiaAppNative"); } catch { return false; } };

function Confirmar({ it, tz, alConfirmar }) {
  const [enterado, setEnterado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  if (it.confirmado_en) {
    return <p role="status" className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-[15px] font-semibold text-green-800" data-confirmado><CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />Confirmaste de leído el {fechaHora(it.confirmado_en, { tz })}.</p>;
  }
  if (!porConfirmar(it)) return null;
  const confirmar = async () => {
    setEnviando(true); setError(null);
    try { const r = await axios.post(`${API_MI}/${encodeURIComponent(it.id)}/confirmar`, { dispositivo: dispositivo(navigator.userAgent, esNativo()) }); await alConfirmar(r.data?.confirmado_en ?? new Date().toISOString()); }
    catch (e) { setError(errorDe(e, "No se pudo confirmar. Intenta de nuevo.")); }
    finally { setEnviando(false); }
  };
  return (
    <section aria-label="Confirmar de leído" className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4" data-confirmar>
      <label htmlFor="det-enterado" className="flex min-h-11 cursor-pointer items-center gap-3">
        <input id="det-enterado" type="checkbox" className="size-6 accent-[#2563EB]" checked={enterado} onChange={(e) => setEnterado(e.target.checked)} />
        <span className="text-[15px] font-semibold text-slate-900">Leí el comunicado y estoy enterado</span>
      </label>
      {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
      <button type="button" disabled={!enterado || enviando} onClick={confirmar} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-[16px] font-bold text-white disabled:opacity-50">{enviando ? "Confirmando…" : "Confirmar de leído"}</button>
      <p className="text-center text-[13px] text-slate-600">Se guarda tu nombre, la fecha y la hora.</p>
    </section>
  );
}

export default function DetallePost({ id }) {
  const tz = useZona();
  const { data, error, isLoading, mutate } = useSWR(`${API_MI}/${encodeURIComponent(id)}`, get, { revalidateOnFocus: false, shouldRetryOnError: false });
  const { mutate: mutarGlobal } = useSWRConfig();
  const megusta = useMeGusta(urlMeGusta);
  const [delta, setDelta] = useState(0);
  const base = principal(data);
  const it = base ? megusta.aplicar({ ...base, comentarios: Math.max(0, (Number(base.comentarios) || 0) + delta) }) : null;
  return (
    <div className="space-y-4" data-pantalla="detalle-post">
      <Link href={RUTA_MURO} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-slate-600"><ArrowLeft className="size-4" aria-hidden="true" />Muro</Link>
      {isLoading ? <p role="status" className="rounded-xl bg-slate-100 p-5 text-sm text-slate-500">Cargando…</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{errorDe(error, "Esta publicación no existe o ya no está disponible.")}</p> : null}
      {it ? (
        <>
          <Publicacion it={it} tz={tz} completo alMeGusta={megusta.alternar} ocupado={megusta.ocupado(it.id)} />
          {megusta.error ? <p role="alert" className="text-[13px] text-red-700">{megusta.error}</p> : null}
          <Confirmar it={it} tz={tz} alConfirmar={async (en) => {
            await mutate({ ...data, comunicado: { ...base, confirmado_en: en, requiere_confirmar: false } }, { revalidate: false });
            // El aviso emergente y la franja «por confirmar» del muro ya no deben salir: se piden de nuevo.
            mutarGlobal((k) => typeof k === "string" && (k.startsWith(`${API_MI}/popup`) || k.includes(`${API_MI}/muro`)));
          }} />
          <Comentarios id={it.id} permite={it.permite_comentarios !== false} tz={tz} alCambiarTotal={(n) => setDelta((d) => d + n)} />
        </>
      ) : null}
    </div>
  );
}
