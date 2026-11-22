"use client";

// Mi espacio → Mi rostro (22/11/2026, pedido del dueño): la persona registra o actualiza su rostro para checar desde la app.
// Decisión A: se usa de inmediato y RH ve el aviso en su ficha. Antes de usar la cámara acepta, de forma expresa, el aviso
// de uso del rostro (CONSENTIMIENTO_BIOMETRICO); el servidor guarda la versión aceptada. Solo se envía la huella numérica
// (128 números), nunca la foto. Se toman 3 lecturas seguidas y se promedian para que el registro sea estable.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Camera, CheckCircle2, ScanFace } from "lucide-react";
import axios from "@/lib/axios";
import { cardClass, DataState } from "@/components/empleado/shared";
import { mensajeError } from "@/components/nomina/comun";
import { CONSENTIMIENTO_BIOMETRICO as C } from "@/lib/legal/documentos";
import { loadBrowserFaceApi, opcionesRapidas } from "@/lib/faceapi-browser";
import { promediarLecturas } from "@/lib/rostro/lecturas.mjs";

const BASE = "/checador/mi-espacio/rostro";
const get = (url) => axios.get(url).then((r) => r.data);
const LECTURAS = 3;
const fecha = (v) => (v ? new Date(`${String(v).replace(" ", "T")}Z`).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", year: "numeric" }) : "");

export default function MiRostro() {
  const { data, error, isLoading, mutate } = useSWR(BASE, get);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const vivoRef = useRef(true);
  const [acepto, setAcepto] = useState(false);
  const [fase, setFase] = useState("inicio"); // inicio · preparando · camara · leyendo · guardando · listo
  const [guia, setGuia] = useState("");
  const [aviso, setAviso] = useState(null);

  const apagar = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  useEffect(() => () => { vivoRef.current = false; apagar(); }, [apagar]);

  const encender = async () => {
    setAviso(null);
    setFase("preparando");
    setGuia("Preparando la cámara…");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: "NotFoundError" });
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } }, audio: false }),
        loadBrowserFaceApi(),
      ]);
      if (!vivoRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setFase("camara");
      setGuia("Mira de frente, con buena luz, y pulsa «Registrar mi rostro».");
    } catch (e) {
      apagar();
      setFase("inicio");
      setAviso({ ok: false, texto: ["NotAllowedError", "PermissionDeniedError"].includes(e?.name)
        ? "Permite el acceso a la cámara para registrar tu rostro (en los ajustes del teléfono o del navegador)."
        : e?.name === "NotFoundError" ? "No encontramos una cámara en este dispositivo." : "No pudimos preparar la cámara. Intenta de nuevo." });
    }
  };

  const registrar = async () => {
    const api = window.faceapi;
    if (!api || !videoRef.current) return;
    setFase("leyendo");
    setAviso(null);
    const lecturas = [];
    for (let intento = 0; intento < 15 && lecturas.length < LECTURAS && vivoRef.current; intento += 1) {
      setGuia(`Quédate quieto… ${lecturas.length + 1} de ${LECTURAS}`);
      const caras = await api.detectAllFaces(videoRef.current, opcionesRapidas(api)).withFaceLandmarks().withFaceDescriptors();
      if (caras.length === 1) lecturas.push(Array.from(caras[0].descriptor));
      else setGuia(caras.length > 1 ? "Hay más de una cara: que solo aparezca la tuya." : "No vemos tu cara: acércate y mira de frente.");
      await new Promise((r) => setTimeout(r, 250));
    }
    const r = promediarLecturas(lecturas, LECTURAS);
    if (!r.ok) {
      setFase("camara");
      setGuia("Mira de frente, con buena luz, y pulsa «Registrar mi rostro».");
      setAviso({ ok: false, texto: r.error });
      return;
    }
    setFase("guardando");
    try {
      await axios.put(BASE, { descriptor_facial: r.descriptor, acepto_consentimiento: true, version: C.version });
      apagar();
      setFase("listo");
      mutate();
    } catch (e) {
      setFase("camara");
      setAviso({ ok: false, texto: mensajeError(e, "No se pudo guardar tu rostro. Intenta de nuevo.") });
    }
  };

  const camaraVisible = ["camara", "leyendo", "guardando"].includes(fase);
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
          {data?.tiene_rostro && data?.actualizado_en ? <p className="mt-1 text-sm text-slate-500">Última actualización: {fecha(data.actualizado_en)}{data.origen === "rh" ? " (por Recursos Humanos)" : ""}.</p> : null}
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
                <span className="pointer-events-none absolute inset-[14%] rounded-[45%] border-2 border-white/70" />
              </div>
              <p role="status" className="text-center text-sm font-medium text-slate-700">{guia}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { apagar(); setFase("inicio"); }} disabled={fase !== "camara"} className="min-h-12 rounded-xl border border-slate-300 font-medium disabled:opacity-50">Cancelar</button>
                <button type="button" onClick={registrar} disabled={fase !== "camara"} className="min-h-12 rounded-xl bg-blue-600 font-semibold text-white disabled:opacity-50">
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
