"use client";

// Mi espacio → Mi rostro (22/11/2026, pedido del dueño): la persona registra o actualiza su rostro para checar desde la app.
// Decisión A: se usa de inmediato y RH ve el aviso en su ficha. Antes de usar la cámara acepta, de forma expresa, el aviso
// de uso del rostro (CONSENTIMIENTO_BIOMETRICO); el servidor guarda la versión aceptada. Solo se envía la huella numérica
// (128 números), nunca la foto. Se toman 3 lecturas seguidas y se promedian para que el registro sea estable.
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Camera, CheckCircle2, ScanFace } from "lucide-react";
import axios from "@/lib/axios";
import { cardClass, DataState } from "@/components/empleado/shared";
import { mensajeError } from "@/components/nomina/comun";
import { CONSENTIMIENTO_BIOMETRICO as C } from "@/lib/legal/documentos";
import { useCapturaRostro } from "@/components/rostro/useCapturaRostro";
import { TONO_GUIA } from "@/lib/rostro/guia.mjs";

// (23/11/2026) Misma guía en vivo que el celular; el óvalo de esta pantalla deja 14 % por lado.
const OVALO = { x: 0.14, y: 0.14 };

const BASE = "/checador/mi-espacio/rostro";
const get = (url) => axios.get(url).then((r) => r.data);
const fecha = (v) => (v ? new Date(`${String(v).replace(" ", "T")}Z`).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", year: "numeric" }) : "");
const ORIGEN = { rh: " (por Recursos Humanos)", celular: " (con el enlace de Recursos Humanos)" };

export default function MiRostro() {
  const { data, error, isLoading, mutate } = useSWR(BASE, get);
  const [acepto, setAcepto] = useState(false);
  // Cámara, lecturas y promedio: compartidos con la página del celular (/rostro/[token]).
  const { videoRef, fase, guia, nivel, listo, aviso, encender, cancelar, registrar: leer, camaraVisible } = useCapturaRostro({ ovalo: OVALO });
  const tono = TONO_GUIA[nivel] ?? TONO_GUIA.info;

  const registrar = async () => {
    const ok = await leer(
      (descriptor) => axios.put(BASE, { descriptor_facial: descriptor, acepto_consentimiento: true, version: C.version }),
      (e) => mensajeError(e, "No se pudo guardar tu rostro. Intenta de nuevo."),
    );
    if (ok) mutate();
  };

  return (
    <div className="space-y-5">
      <Link href="/empleado/panel/mi-espacio" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-600"><ArrowLeft className="size-4" />Mi espacio</Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi rostro</h1>
        <p className="mt-1 text-sm text-slate-500">Regístralo o actualízalo para checar con reconocimiento facial.</p>
      </div>
      <DataState loading={isLoading} error={error} retry={mutate}>
        <section className={cardClass}>
          <p className="flex items-center gap-2 font-semibold"><ScanFace className="size-5 text-blue-600" />
            {data?.tiene_rostro ? "Tu rostro está registrado" : "Aún no registras tu rostro"}
          </p>
          {data?.tiene_rostro && data?.actualizado_en ? <p className="mt-1 text-sm text-slate-500">Última actualización: {fecha(data.actualizado_en)}{ORIGEN[data.origen] ?? ""}.</p> : null}
          {data?.tiene_rostro ? <p className="mt-1 text-sm text-slate-500">Si al checar no te reconoce bien (cambiaste de look, lentes, barba), actualízalo aquí.</p> : null}
        </section>

        {fase === "listo" ? (
          <section role="status" className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-800">
            <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5" />Listo, tu rostro quedó registrado.</p>
            <p className="mt-1 text-sm">Ya puedes checar con él. Recursos Humanos verá el aviso de este cambio.</p>
            <Link href="/empleado/panel/mi-espacio" className="mt-3 inline-flex min-h-11 items-center font-semibold text-green-900 underline">Volver a Mi espacio</Link>
          </section>
        ) : (
          <section className={cardClass} aria-labelledby="t-aviso">
            {!camaraVisible ? (
              <>
                <h2 id="t-aviso" className="font-bold">{C.titulo}</h2>
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">{C.texto.map((t) => <p key={t}>{t}</p>)}</div>
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm font-medium">
                  <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-blue-600" />
                  <span>{C.acepto}</span>
                </label>
                <button type="button" onClick={encender} disabled={!acepto || fase === "preparando"} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white disabled:opacity-50">
                  <Camera className="size-5" />{fase === "preparando" ? "Preparando la cámara…" : data?.tiene_rostro ? "Actualizar mi rostro" : "Registrar mi rostro"}
                </button>
              </>
            ) : null}
            <div className={camaraVisible ? "space-y-3" : "hidden"}>
              <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-slate-900">
                <video ref={videoRef} muted playsInline autoPlay aria-label="Vista de tu cámara" className="size-full -scale-x-100 object-cover" />
                <span className={`pointer-events-none absolute inset-[14%] rounded-[45%] border-2 transition-colors ${tono.ovalo}`} aria-hidden="true" />
              </div>
              <p role="status" aria-live="polite" className={`rounded-xl border px-3 py-2 text-center text-sm font-semibold ${tono.caja}`}>{guia}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={cancelar} disabled={fase !== "camara"} className="min-h-12 rounded-xl border border-slate-300 font-medium disabled:opacity-50">Cancelar</button>
                <button type="button" onClick={registrar} disabled={!listo} className="min-h-12 rounded-xl bg-blue-600 font-semibold text-white disabled:opacity-50">
                  {fase === "leyendo" ? "Leyendo…" : fase === "guardando" ? "Guardando…" : "Registrar mi rostro"}
                </button>
              </div>
            </div>
            {aviso ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{aviso.texto}</p> : null}
          </section>
        )}
      </DataState>
    </div>
  );
}
