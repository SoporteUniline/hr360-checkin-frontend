"use client";

// «Avisar por WhatsApp a» (docs/newsletter.md del backend): los celulares del equipo de ADAMIA que reciben el aviso de
// nuevo prospecto y de boletín listo. Se guardan en la base (GET/PUT /checador/prospectos/ajustes/avisos), no en el código.
import { useEffect, useState } from "react";
import useSWR from "swr";
import Cookies from "js-cookie";
import { enqueueSnackbar } from "notistack";
import { fetcherWithToken } from "@/lib/fetcher";
import { celularLegible } from "@/lib/prospectos/reglas.mjs";
import { MAX_AVISOS, validarCelulares } from "@/lib/newsletter/reglas.mjs";

const API = `${process.env.NEXT_PUBLIC_RUTA_BACKEND ?? ""}/checador/prospectos/ajustes/avisos`;
const CAMPO = "h-12 w-full rounded-xl border border-[#C7CEDD] bg-white px-4 text-base text-[#0B1033] outline-none focus-visible:border-[#2C56E8] focus-visible:ring-[3px] focus-visible:ring-[#2C56E8]/30";
const BOTON = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2C56E8]/40 disabled:cursor-not-allowed disabled:opacity-60";

export default function AvisosWhatsapp() {
  const { data, error, mutate } = useSWR("/checador/prospectos/ajustes/avisos", fetcherWithToken);
  const [lista, setLista] = useState([""]);
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    if (data?.whatsapp) setLista(data.whatsapp.length ? data.whatsapp.map(celularLegible) : [""]);
  }, [data]);

  const guardar = async () => {
    const v = validarCelulares(lista);
    if (v.error) { setMensaje(v.error); return; }
    setMensaje("");
    setGuardando(true);
    try {
      const r = await fetch(API, { method: "PUT", headers: { Authorization: `Bearer ${Cookies.get("token")}`, "content-type": "application/json" }, body: JSON.stringify({ whatsapp: v.lista }) });
      const cuerpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(cuerpo.error || "No se pudo guardar.");
      enqueueSnackbar(v.lista.length ? "Listo: se avisará a esos celulares." : "Listo: ya no se avisará por WhatsApp.", { variant: "success" });
      mutate();
    } catch (e) {
      setMensaje(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="grid gap-4 rounded-2xl border border-[#D8DEEB] bg-white p-5" aria-labelledby="titulo-avisos" data-seccion="avisos-whatsapp">
      <div className="grid gap-1">
        <h2 id="titulo-avisos" className="text-[1.25rem] font-bold">Avisar por WhatsApp a</h2>
        <p className="text-[#4B5563]">Cuando alguien nuevo deja sus datos (y cuando el boletín semanal está listo) llega un WhatsApp a estos celulares. Hasta {MAX_AVISOS}, con lada del país.</p>
      </div>
      {error ? <p role="alert" className="font-bold text-[#991B1B]">{error?.response?.data?.error || "No se pudieron cargar los avisos."}</p> : null}
      {data?.aviso ? <p role="status" className="rounded-xl border-l-4 border-[#F59E0B] bg-[#FFFBEB] p-4 text-[#78350F]">{data.aviso}</p> : null}
      <div className="grid gap-3">
        {lista.map((c, i) => (
          <div key={i} className="flex gap-3">
            <input type="tel" inputMode="tel" autoComplete="off" aria-label={`Celular ${i + 1}`} className={CAMPO} placeholder="+52 55 1234 5678" value={c} maxLength={25} onChange={(e) => setLista((l) => l.map((x, j) => (j === i ? e.target.value : x)))} />
            {lista.length > 1 || c ? (
              <button type="button" className={`${BOTON} border-2 border-[#2C56E8] bg-white text-[#2C56E8]`} onClick={() => setLista((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : [""]))}>Quitar</button>
            ) : null}
          </div>
        ))}
      </div>
      {mensaje ? <p role="alert" className="font-bold text-[#B91C1C]">{mensaje}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        {lista.length < MAX_AVISOS ? <button type="button" className={`${BOTON} border-2 border-[#2C56E8] bg-white text-[#2C56E8]`} onClick={() => setLista((l) => [...l, ""])}>Agregar otro celular</button> : null}
        <button type="button" className={`${BOTON} bg-[#2C56E8] text-white hover:bg-[#1F44C8]`} onClick={guardar} disabled={guardando || data?.disponible === false}>{guardando ? "Guardando…" : "Guardar celulares"}</button>
      </div>
      <p className="text-[#4B5563]">Los mensajes salen del número de notificaciones de ADAMIA solo cuando Meta aprueba las plantillas «adamia_prospecto_nuevo» y «adamia_newsletter_revision».</p>
    </section>
  );
}
