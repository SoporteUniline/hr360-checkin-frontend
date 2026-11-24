"use client";

// «Continuar desde el celular»: la persona abre el enlace QR que le generó RH y registra su
// rostro con la cámara frontal de su celular. Sin sesión. Muestra solo su nombre, la empresa y el aviso de uso del rostro
// (el mismo texto y versión de Mi espacio). La cámara, las 3 lecturas y su promedio son los de Mi rostro
// (useCapturaRostro). Backend: /checador/rostro-celular/publico/:token. Errores: src/lib/rostro/enlaceCelular.mjs.
// Guía en vivo con color (óvalo y mensaje), «Registrar mi rostro» solo con la cara bien colocada y
// confirmación final con la calidad de la toma («✅ Rostro correcto»).
import { use, useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { AlertCircle, Camera, CheckCircle2, ShieldCheck } from "lucide-react";
import { CONSENTIMIENTO_BIOMETRICO as C } from "@/lib/legal/documentos";
import { useCapturaRostro } from "@/components/rostro/useCapturaRostro";
import { cuentaRegresiva, errorPublico, segundosHasta, venceEn } from "@/lib/rostro/enlaceCelular.mjs";
import { TONO_GUIA } from "@/lib/rostro/guia.mjs";
import { porcentaje } from "@/lib/rostro/lecturas.mjs";

// Instancia sin sesión: este enlace no usa ni manda la sesión del navegador.
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_RUTA_BACKEND });
const ruta = (token) => `/checador/rostro-celular/publico/${encodeURIComponent(token)}`;

function Marco({ children }) {
  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <span className="relative block h-[34px] w-[108px] overflow-hidden" aria-label="ADAMIA">
            <Image src="/assets/adamia.png" alt="ADAMIA" width={2160} height={1000} priority className="absolute -left-4 -top-[15px] h-auto w-[140px] max-w-none" />
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><ShieldCheck className="size-4" aria-hidden="true" />Enlace seguro</span>
        </div>
      </header>
      <div className="mx-auto max-w-md px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">{children}</div>
    </main>
  );
}

function Final({ exito, titulo, texto, detalle }) {
  const Icono = exito ? CheckCircle2 : AlertCircle;
  return (
    <section role={exito ? "status" : "alert"} className={`rounded-2xl border p-5 ${exito ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-950"}`} data-final={exito ? "listo" : "error"}>
      <Icono className={`size-8 ${exito ? "text-green-600" : "text-amber-600"}`} aria-hidden="true" />
      <h1 className="mt-3 text-xl font-bold">{titulo}</h1>
      <p className="mt-1 text-[15px] leading-relaxed">{texto}</p>
      {detalle ? <p className="mt-2 text-sm leading-relaxed opacity-90" data-calidad>{detalle}</p> : null}
    </section>
  );
}

export default function RostroDesdeCelular({ params }) {
  const { token } = use(params);
  const [info, setInfo] = useState(null);
  const [fin, setFin] = useState(null); // error terminal del enlace
  const [acepto, setAcepto] = useState(false);
  const [vence, setVence] = useState(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const { videoRef, fase, guia, nivel, listo, calidad, aviso, encender, cancelar, registrar: leer, apagar, camaraVisible } = useCapturaRostro();
  const tono = TONO_GUIA[nivel] ?? TONO_GUIA.info;

  useEffect(() => {
    let vivo = true;
    api.get(ruta(token))
      .then(({ data }) => { if (vivo) { setInfo(data); setVence(venceEn(data.segundos)); } })
      .catch((e) => { if (vivo) setFin(errorPublico(e)); });
    return () => { vivo = false; };
  }, [token]);

  useEffect(() => {
    if (!vence || fin || fase === "listo") return undefined;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [vence, fin, fase]);
  const restantes = vence ? segundosHasta(vence, ahora) : null;
  useEffect(() => {
    if (restantes === 0 && fase !== "listo" && fase !== "guardando" && !fin) { apagar(); setFin(errorPublico({ response: { data: { codigo: "ENLACE_VENCIDO" } } })); }
  }, [restantes, fase, fin, apagar]);

  const registrar = () => leer(
    (descriptor) => api.post(ruta(token), { descriptor_facial: descriptor, acepto_consentimiento: true, version: C.version }),
    (e) => {
      const er = errorPublico(e);
      if (er.fin) { apagar(); setFin(er); }
      return er.texto;
    },
  );

  if (fase === "listo") {
    return (
      <Marco>
        <Final exito titulo="✅ Rostro correcto: quedó bien registrado"
          texto={`${info?.nombre ? `${info.nombre}, tu` : "Tu"} rostro quedó registrado${info?.empresa ? ` en ${info.empresa}` : ""}. Ya puedes checar con él y cerrar esta página.`}
          detalle={calidad != null ? `Las 3 lecturas coinciden entre sí (${porcentaje(calidad)} %): la toma salió bien.` : null} />
      </Marco>
    );
  }
  if (fin) return <Marco><Final titulo={fin.titulo} texto={fin.texto} /></Marco>;
  if (!info) {
    return (
      <Marco>
        <div className="flex flex-col items-center gap-3 py-16 text-slate-500" role="status">
          <div className="size-9 animate-spin rounded-full border-b-2 border-[#2563EB] motion-reduce:animate-none" aria-hidden="true" />
          Revisando el enlace…
        </div>
      </Marco>
    );
  }

  return (
    <Marco>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">Registro de rostro</p>
      <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight break-words">{info.nombre}</h1>
      {info.empresa ? <p className="mt-0.5 text-sm text-slate-600 break-words">{info.empresa}</p> : null}
      {restantes != null ? <p className="mt-2 text-xs text-slate-500">Este enlace vence en <b className="font-semibold tabular-nums text-slate-700">{cuentaRegresiva(restantes)}</b> y sirve una sola vez.</p> : null}

      {!camaraVisible ? (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="t-aviso">
          <h2 id="t-aviso" className="text-lg font-bold">{C.titulo}</h2>
          <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-slate-600">{C.texto.map((t) => <p key={t}>{t}</p>)}</div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-[15px] font-medium">
            <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 size-6 shrink-0 accent-[#2563EB]" />
            <span>{C.acepto}</span>
          </label>
          <button type="button" onClick={encender} disabled={!acepto || fase === "preparando"} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] text-base font-semibold text-white disabled:opacity-50">
            <Camera className="size-5" aria-hidden="true" />{fase === "preparando" ? "Preparando la cámara…" : "Continuar a la cámara"}
          </button>
          {!acepto ? <p className="mt-2 text-center text-xs text-slate-500">Marca la casilla para continuar.</p> : null}
        </section>
      ) : null}

      <section className={camaraVisible ? "mt-5 space-y-3" : "hidden"} aria-label="Cámara">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl bg-slate-900">
          <video ref={videoRef} muted playsInline autoPlay aria-label="Vista de tu cámara frontal" className="size-full -scale-x-100 object-cover" />
          <span className={`pointer-events-none absolute inset-x-[17%] inset-y-[14%] rounded-[50%] border-[3px] shadow-[0_0_0_999px_rgba(15,23,42,0.35)] transition-colors ${tono.ovalo}`} aria-hidden="true" data-ovalo={nivel} />
        </div>
        <p role="status" aria-live="polite" className={`min-h-12 rounded-xl border px-3 py-2.5 text-center text-[15px] font-semibold ${tono.caja}`} data-guia={nivel}>{guia}</p>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
          <button type="button" onClick={cancelar} disabled={fase !== "camara"} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-medium disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={registrar} disabled={!listo} className="min-h-12 rounded-xl bg-[#2563EB] px-4 text-base font-semibold text-white disabled:opacity-50">
            {fase === "leyendo" ? "Leyendo…" : fase === "guardando" ? "Guardando…" : "Registrar mi rostro"}
          </button>
        </div>
        {fase === "camara" && !listo ? <p className="text-center text-xs text-slate-500">El botón se activa cuando tu rostro esté bien colocado dentro del óvalo.</p> : null}
      </section>
      {aviso ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-[15px] text-red-700">{aviso.texto}</p> : null}
      <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">Solo se guarda el patrón numérico de tu rostro, no la foto. Si tienes dudas, pregunta a Recursos Humanos.</p>
    </Marco>
  );
}
