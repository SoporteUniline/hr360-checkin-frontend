"use client";

// «Continuar desde el celular»: la persona abre el enlace QR que le generó RH y registra su
// rostro con la cámara frontal de su celular. Sin sesión. Muestra solo su nombre, la empresa y el aviso de uso del rostro
// (el mismo texto y versión de Mi espacio). La cámara y el registro guiado en 5 poses son los de Mi rostro
// (useCapturaRostro + CapturaGuiada). Backend: POST /checador/rostro-celular/publico/:token con descriptores [{ pose, descriptor }];
// un 409 gasta un intento del enlace y trae intentos_restantes. Errores: src/lib/rostro/enlaceCelular.mjs (409 ROSTRO_PARECIDO incluido).
import { use, useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { AlertCircle, Camera, CheckCircle2, ShieldCheck } from "lucide-react";
import { CONSENTIMIENTO_BIOMETRICO as C } from "@/lib/legal/documentos";
import { useCapturaRostro } from "@/components/rostro/useCapturaRostro";
import { cuentaRegresiva, errorPublico, segundosHasta, venceEn } from "@/lib/rostro/enlaceCelular.mjs";
import CapturaGuiada from "@/components/rostro/CapturaGuiada";

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
  const captura = useCapturaRostro();
  const { fase, aviso, encender, registrarGuiado, apagar, camaraVisible } = captura;
  const [fotos, setFotos] = useState(0);

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

  const registrar = async () => {
    if (!(await encender())) return;
    await registrarGuiado(
    async (descriptores) => {
      await api.post(ruta(token), { descriptores, acepto_consentimiento: true, version: C.version });
      setFotos(descriptores.length);
    },
    (e) => {
      const er = errorPublico(e);
      if (er.fin) { apagar(); setFin(er); }
      return er.texto;
    },
    );
  };

  if (fase === "listo") {
    return (
      <Marco>
        <Final exito titulo="✅ Rostro correcto: quedó bien registrado"
          texto={`${info?.nombre ? `${info.nombre}, tu` : "Tu"} rostro quedó registrado${info?.empresa ? ` en ${info.empresa}` : ""}. Ya puedes checar con él y cerrar esta página.`}
          detalle={fotos ? `Se guardaron ${fotos} fotos de tu rostro (de frente y con movimientos): así te reconoce mejor.` : null} />
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
          <p className="mt-3 text-[15px] text-slate-600">Te pediremos 5 movimientos cortos: mirar al frente, subir y bajar un poco la cara y girarla un poco a cada lado. Las fotos se toman solas.</p>
          <button type="button" onClick={registrar} disabled={!acepto || fase === "preparando"} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] text-base font-semibold text-white disabled:opacity-50">
            <Camera className="size-5" aria-hidden="true" />{fase === "preparando" ? "Preparando la cámara…" : "Continuar a la cámara"}
          </button>
          {!acepto ? <p className="mt-2 text-center text-xs text-slate-500">Marca la casilla para continuar.</p> : null}
        </section>
      ) : null}

      <section className={camaraVisible ? "mt-5" : "hidden"} aria-label="Cámara">
        <CapturaGuiada captura={captura} forma="vertical" ovalo="inset-x-[17%] inset-y-[14%]" etiqueta="Vista de tu cámara frontal" />
      </section>
      {aviso && !camaraVisible ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-[15px] text-red-700">{aviso.texto}</p> : null}
      <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">Solo se guarda el patrón numérico de tu rostro, no la foto. Si tienes dudas, pregunta a Recursos Humanos.</p>
    </Marco>
  );
}
