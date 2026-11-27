"use client";
// Liga pública del nuevo ingreso (maquetas 4 «Preingreso» y 5 «Firma», aprobadas 27/12/2026). Sin sesión: el token es la
// llave. La persona aún no es empleada. Pasos: Datos → Documentos (foto con la cámara o archivo) → Firma (lee, acepta,
// firma con el dedo y se toma una foto de evidencia) → Rostro (con su aviso de datos biométricos). Todo se guarda al
// momento: puede salir y seguir después. Backend: /checador/induccion/publico/:token (docs/induccion-digital.md).
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { AlertCircle, Camera, Check, CheckCircle2, FileUp, Plus, ScanFace, ShieldCheck, X } from "lucide-react";
import { CONSENTIMIENTO_BIOMETRICO as C, AVISO_EMPLEADOS } from "@/lib/legal/documentos";
import { sanearHtml } from "@/lib/htmlSeguro.mjs";
import { useCapturaRostro } from "@/components/rostro/useCapturaRostro";
import CapturaGuiada from "@/components/rostro/CapturaGuiada";
import FirmaGrande from "@/components/firma/FirmaGrande";
import { ESTADO_DOC, PASOS, contarListos, errorCampo, errorPublico, pasoInicial, rutaPublica } from "@/lib/induccion/induccion.mjs";

// Instancia sin sesión: esta liga no usa ni manda la sesión del navegador.
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_RUTA_BACKEND });
const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold disabled:opacity-50";
const btnPrimario = `${btn} bg-[#2563EB] text-white`;
const btnSecundario = `${btn} border border-slate-300 bg-white text-slate-800`;
const entrada = "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 aria-[invalid=true]:border-red-500";

const TIPOS_CAMPO = { fecha_nacimiento: { type: "date" }, telefono: { inputMode: "tel", autoComplete: "tel" }, telefono_emergencia: { inputMode: "tel" }, correo: { type: "email", autoComplete: "email" }, nss: { inputMode: "numeric" }, clabe: { inputMode: "numeric" }, curp: { autoCapitalize: "characters" }, rfc: { autoCapitalize: "characters" }, direccion: { autoComplete: "street-address" } };

function Marco({ children, pie }) {
  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <span className="relative block h-[34px] w-[108px] overflow-hidden" aria-label="ADAMIA">
            <Image src="/assets/adamia.png" alt="ADAMIA" width={2160} height={1000} priority className="absolute -left-4 -top-[15px] h-auto w-[140px] max-w-none" />
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500"><ShieldCheck className="size-4" aria-hidden="true" />Liga personal segura</span>
        </div>
      </header>
      <div className="mx-auto max-w-md px-4 pb-32 pt-5">{children}</div>
      {pie ? <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{pie}</div></footer> : null}
    </main>
  );
}

function Pasos({ actual, avance }) {
  const hecho = { datos: avance?.datos, documentos: avance?.documentos?.listos >= avance?.documentos?.total, firma: avance?.firma, rostro: avance?.rostro };
  return (
    <ol aria-label="Pasos" className="mt-4 grid grid-cols-4 gap-1.5">
      {PASOS.map((p) => (
        <li key={p.clave} aria-current={actual === p.clave ? "step" : undefined} className="grid gap-1 text-center text-[13px] font-semibold">
          <span className={`h-1.5 rounded-full ${hecho[p.clave] ? "bg-green-600" : actual === p.clave ? "bg-[#2563EB]" : "bg-slate-200"}`} />
          <span className={actual === p.clave ? "text-[#2563EB]" : hecho[p.clave] ? "text-green-700" : "text-slate-500"}>{p.texto}</span>
        </li>
      ))}
    </ol>
  );
}

function Final({ exito, titulo, texto }) {
  const Icono = exito ? CheckCircle2 : AlertCircle;
  return (
    <section role={exito ? "status" : "alert"} className={`rounded-2xl border p-5 ${exito ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-950"}`} data-final={exito ? "listo" : "error"}>
      <Icono className={`size-8 ${exito ? "text-green-600" : "text-amber-600"}`} aria-hidden="true" />
      <h1 className="mt-3 text-xl font-bold">{titulo}</h1>
      <p className="mt-1 text-[15px] leading-relaxed">{texto}</p>
    </section>
  );
}

// ───────── 1 · Datos ─────────
function PasoDatos({ v, guardar, alSeguir }) {
  const [f, setF] = useState(() => ({ ...v.datos }));
  const [errores, setErrores] = useState({});
  const [estado, setEstado] = useState("");
  const enviar = async (datos) => {
    setEstado("Guardando…");
    const r = await guardar("datos", { datos });
    setEstado(r.ok ? "Guardado" : "");
    if (!r.ok && r.campos) setErrores(r.campos);
    return r.ok;
  };
  const alSalir = (k) => {
    const e = errorCampo(k, f[k], f);
    setErrores((x) => ({ ...x, [k]: e ?? undefined }));
    if (!e && String(f[k] ?? "") !== String(v.datos?.[k] ?? "")) enviar({ ...f });
  };
  const seguir = async (e) => {
    e.preventDefault();
    const malos = Object.fromEntries(v.campos.map((c) => [c.clave, c.requerido && !String(f[c.clave] ?? "").trim() ? "Falta este dato." : errorCampo(c.clave, f[c.clave], f)]).filter(([, x]) => x));
    setErrores(malos);
    if (Object.keys(malos).length) { document.getElementById(`dato-${Object.keys(malos)[0]}`)?.focus(); return; }
    if (await enviar({ ...f })) alSeguir();
  };
  return (
    <form id="form-datos" onSubmit={seguir} noValidate className="grid gap-3" data-paso="datos">
      <p className="text-[15px] text-slate-600">Escribe tus datos como aparecen en tus documentos. Se guarda solo: puedes salir y seguir después.</p>
      {v.campos.map((c) => (
        <div key={c.clave} className="grid gap-1.5">
          <label htmlFor={`dato-${c.clave}`} className="text-[15px] font-semibold">{c.etiqueta}{c.requerido ? "" : <span className="font-normal text-slate-500"> (opcional)</span>}</label>
          <input id={`dato-${c.clave}`} className={entrada} value={f[c.clave] ?? ""} {...(TIPOS_CAMPO[c.clave] ?? {})}
            aria-invalid={Boolean(errores[c.clave])} aria-describedby={errores[c.clave] ? `dato-${c.clave}-error` : undefined}
            onChange={(e) => { setF({ ...f, [c.clave]: e.target.value }); if (errores[c.clave]) setErrores({ ...errores, [c.clave]: undefined }); }} onBlur={() => alSalir(c.clave)} disabled={!v.editable || v.firmado} />
          {errores[c.clave] ? <span id={`dato-${c.clave}-error`} className="text-[13px] text-red-700">{errores[c.clave]}</span> : null}
        </div>
      ))}
      {v.firmado ? <p className="rounded-xl bg-slate-100 p-3 text-[15px] text-slate-700">Ya firmaste con estos datos. Si hay un error, avisa a Recursos Humanos.</p> : null}
      <p aria-live="polite" className="text-[13px] text-slate-500">{estado}</p>
    </form>
  );
}

// ───────── 2 · Documentos ─────────
function Documento({ d, subir, guardarDato, datos }) {
  const [valor, setValor] = useState(datos?.[d.dato] ?? "");
  const [escribir, setEscribir] = useState(false);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const camara = useRef({});
  const archivo = useRef({});
  const listo = ["recibido", "con_dato", "aprobado"].includes(d.estado);
  const caras = d.caras === 2 ? [1, 2] : [1];
  const elegir = async (cara, e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("El archivo pesa más de 10 MB. Toma la foto otra vez o sube un PDF más ligero."); return; }
    setSubiendo(true);
    setError("");
    const r = await subir(d.clave, cara, file);
    setSubiendo(false);
    if (!r.ok) setError(r.texto);
  };
  const guardar = async () => {
    const e = errorCampo(d.dato, valor);
    if (e || !valor.trim()) { setError(e || "Escribe el número."); return; }
    const r = await guardarDato(d.dato, valor);
    if (r.ok) setEscribir(false); else setError(r.campos?.[d.dato] || r.texto);
  };
  const estado = ESTADO_DOC[d.estado] ?? ESTADO_DOC.pendiente;
  const detalle = d.estado === "rechazado" ? `Corrige: ${d.motivo}` : d.estado === "pendiente" ? (d.instrucciones || (d.antiguedad_meses ? `No mayor a ${d.antiguedad_meses} meses` : "")) : d.estado === "parcial" ? "Falta el otro lado" : estado.texto;
  return (
    <li className={`grid gap-3 rounded-2xl border bg-white p-4 ${d.estado === "rechazado" ? "border-red-300" : "border-slate-200"}`} data-documento={d.clave} data-estado={d.estado}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full text-base font-bold ${listo ? "bg-green-100 text-green-700" : d.estado === "rechazado" ? "bg-red-100 text-red-700" : "bg-blue-50 text-[#2563EB]"}`}>{listo ? "✓" : d.estado === "rechazado" ? "!" : "+"}</span>
        <span className="min-w-0 flex-1">
          <b className="block text-[15px]">{d.nombre}{d.obligatorio ? "" : <span className="font-normal text-slate-500"> (opcional)</span>}</b>
          <span className={`block text-[13px] ${d.estado === "rechazado" ? "font-semibold text-red-700" : listo ? "text-green-700" : "text-slate-600"}`}>{detalle}</span>
        </span>
      </div>
      {d.dato && escribir ? (
        <div className="grid gap-2">
          <label htmlFor={`dato-doc-${d.clave}`} className="text-[15px] font-semibold">{d.dato === "nss" ? "Número de seguridad social (11 dígitos)" : "CLABE (18 dígitos)"}</label>
          <input id={`dato-doc-${d.clave}`} className={entrada} inputMode="numeric" value={valor} onChange={(e) => { setValor(e.target.value); setError(""); }} aria-invalid={Boolean(error)} />
          <div className="grid grid-cols-2 gap-2"><button type="button" className={btnSecundario} onClick={() => setEscribir(false)}>Cancelar</button><button type="button" className={btnPrimario} onClick={guardar}>Guardar</button></div>
        </div>
      ) : null}
      {listo && d.estado !== "aprobado" ? (
        <div className="flex flex-wrap gap-2">
          {caras.map((cara) => (
            <span key={cara}>
              <input ref={(el) => { archivo.current[cara] = el; }} type="file" accept="image/*,application/pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => elegir(cara, e)} data-entrada-archivo={`${d.clave}-${cara}`} />
              <button type="button" disabled={subiendo} onClick={() => archivo.current[cara]?.click()} className="min-h-11 rounded-xl px-3 text-[15px] font-semibold text-[#2563EB] underline">
                {d.con_dato || d.estado === "con_dato" ? "Subir constancia" : `Cambiar${d.caras === 2 ? (cara === 1 ? " frente" : " vuelta") : ""}`}
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {!listo ? (
        <div className={`grid gap-2 ${caras.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {caras.map((cara) => {
            const subida = d.caras_subidas?.includes(cara) && d.estado !== "rechazado";
            const etiqueta = d.caras === 2 ? (cara === 1 ? "frente" : "vuelta") : "";
            return (
              <div key={cara} className="grid gap-2">
                <input ref={(el) => { camara.current[cara] = el; }} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => elegir(cara, e)} data-entrada-camara={`${d.clave}-${cara}`} />
                <input ref={(el) => { archivo.current[cara] = el; }} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => elegir(cara, e)} data-entrada-archivo={`${d.clave}-${cara}`} />
                <button type="button" disabled={subiendo} onClick={() => camara.current[cara]?.click()} className={subida ? btnSecundario : btnPrimario}>
                  {subida ? <Check className="size-5" aria-hidden="true" /> : <Camera className="size-5" aria-hidden="true" />}{subida ? `Cambiar ${etiqueta}`.trim() : `Tomar foto${etiqueta ? ` · ${etiqueta}` : ""}`}
                </button>
                {caras.length === 1 ? <button type="button" disabled={subiendo} onClick={() => archivo.current[cara]?.click()} className={btnSecundario}><FileUp className="size-5" aria-hidden="true" />Subir archivo o PDF</button> : null}
              </div>
            );
          })}
          {caras.length === 2 ? <button type="button" disabled={subiendo} onClick={() => archivo.current[d.caras_subidas?.includes(1) ? 2 : 1]?.click()} className={`${btnSecundario} col-span-2`}><FileUp className="size-5" aria-hidden="true" />Subir archivo o PDF</button> : null}
          {d.dato && !escribir ? <button type="button" onClick={() => setEscribir(true)} className={btnSecundario}><Plus className="size-5" aria-hidden="true" />Escribir el número</button> : null}
        </div>
      ) : null}
      {subiendo ? <p role="status" className="text-[13px] text-slate-600">Subiendo…</p> : null}
      {error ? <p role="alert" className="text-[13px] font-medium text-red-700">{error}</p> : null}
    </li>
  );
}

function PasoDocumentos({ v, token, recargar, guardar }) {
  const [aviso, setAviso] = useState(false);
  const subir = async (clave, cara, file) => {
    const form = new FormData();
    form.append("clave", clave);
    form.append("cara", String(cara));
    form.append("archivo", file, file.name || "foto.jpg");
    try {
      await api.post(`${rutaPublica(token)}/documentos`, form);
      await recargar();
      return { ok: true };
    } catch (e) { return { ok: false, ...errorPublico(e) }; }
  };
  const guardarDato = (k, valor) => guardar("datos", { datos: { ...v.datos, [k]: valor } });
  return (
    <div className="grid gap-3" data-paso="documentos">
      <p className="text-[15px] text-slate-600">Toma una foto clara o sube el archivo. Puedes salir y seguir después: se guarda solo.</p>
      <ul className="grid gap-3">{v.documentos.map((d) => <Documento key={d.clave} d={d} subir={subir} guardarDato={guardarDato} datos={v.datos} />)}</ul>
      <p className="text-[13px] text-slate-500">Tus documentos solo los ve Recursos Humanos de {v.empresa.nombre || "tu empresa"}. <button type="button" onClick={() => setAviso(true)} className="min-h-11 font-semibold text-[#2563EB] underline">Aviso de privacidad</button></p>
      {aviso ? (
        <div role="dialog" aria-modal="true" aria-labelledby="aviso-titulo" className="fixed inset-0 z-50 grid items-end bg-black/40 sm:items-center">
          <div className="mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3"><h2 id="aviso-titulo" className="text-lg font-bold">Aviso de privacidad para empleados</h2><button type="button" aria-label="Cerrar" onClick={() => setAviso(false)} className="grid size-11 place-items-center rounded-lg"><X className="size-5" aria-hidden="true" /></button></div>
            <p className="mt-2 text-[15px] text-slate-600">{AVISO_EMPLEADOS.intro.replace("Plantilla para que cada empresa que usa ADAMIA informe a su personal. ", "")}</p>
            {AVISO_EMPLEADOS.secciones.map((s) => <section key={s.id} className="mt-3"><h3 className="text-[15px] font-semibold">{s.titulo}</h3>{(s.parrafos ?? []).map((p) => <p key={p} className="mt-1 text-[15px] text-slate-600">{p.replaceAll("[Nombre de la empresa]", v.empresa.nombre || "Tu empresa")}</p>)}</section>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ───────── 3 y 4 · Firma y rostro ─────────
function FotoEvidencia({ alTomar, alCancelar }) {
  const video = useRef(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let flujo;
    navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: "user" }, audio: false })
      .then((s) => { flujo = s; if (video.current) { video.current.srcObject = s; video.current.play?.().catch(() => {}); } })
      .catch(() => setError("Permite la cámara para tomar la foto de evidencia de tu firma."));
    return () => flujo?.getTracks().forEach((t) => t.stop());
  }, []);
  const tomar = () => {
    const v = video.current;
    if (!v?.videoWidth) { setError("La cámara aún no está lista."); return; }
    const c = document.createElement("canvas");
    c.width = Math.min(960, v.videoWidth);
    c.height = Math.round((c.width / v.videoWidth) * v.videoHeight);
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => (b ? alTomar(b) : setError("No se pudo tomar la foto.")), "image/jpeg", 0.85);
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="foto-titulo" className="fixed inset-0 z-50 grid items-end bg-black/50 sm:items-center">
      <div className="mx-auto grid w-full max-w-md gap-3 rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h2 id="foto-titulo" className="text-lg font-bold">Foto de evidencia</h2>
        <p className="text-[15px] text-slate-600">Se guarda junto con tu firma, la fecha y la hora. Mira a la cámara.</p>
        <video ref={video} playsInline muted className="aspect-[3/4] w-full -scale-x-100 rounded-2xl bg-slate-900 object-cover" aria-label="Vista de tu cámara frontal" />
        {error ? <p role="alert" className="text-[15px] text-red-700">{error}</p> : null}
        <div className="grid grid-cols-2 gap-2"><button type="button" className={btnSecundario} onClick={alCancelar}>Cancelar</button><button type="button" className={btnPrimario} onClick={tomar}><Camera className="size-5" aria-hidden="true" />Tomar foto y firmar</button></div>
      </div>
    </div>
  );
}

function LeerFormato({ token, f, alCerrar }) {
  const [html, setHtml] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get(`${rutaPublica(token)}/formatos/${encodeURIComponent(f.clave)}`).then((r) => setHtml(sanearHtml(r.data.html))).catch((e) => setError(errorPublico(e).texto));
  }, [token, f.clave]);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="leer-titulo" className="fixed inset-0 z-50 grid bg-black/40 sm:place-items-center">
      <div className="mx-auto grid h-dvh w-full max-w-md grid-rows-[auto_1fr_auto] bg-white sm:h-[85dvh] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4"><h2 id="leer-titulo" className="text-lg font-bold">{f.nombre}</h2><button type="button" aria-label="Cerrar" onClick={alCerrar} className="grid size-11 shrink-0 place-items-center rounded-lg"><X className="size-5" aria-hidden="true" /></button></div>
        <div className="overflow-y-auto p-4 text-[15px] leading-relaxed text-slate-800 [&_h3]:mt-3 [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2" data-formato={f.clave}>
          {error ? <p role="alert" className="text-red-700">{error}</p> : html === null ? <p role="status">Cargando…</p> : <div dangerouslySetInnerHTML={{ __html: html }} />}
        </div>
        <div className="border-t border-slate-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><button type="button" onClick={alCerrar} className={`${btnPrimario} w-full`}>Ya lo leí</button></div>
      </div>
    </div>
  );
}

function Rostro({ v, token, recargar }) {
  const [acepto, setAcepto] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const captura = useCapturaRostro();
  const { fase, aviso, encender, registrarGuiado, apagar, camaraVisible } = captura;
  if (v.rostro.registrado) {
    return <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4" data-rostro="listo"><ScanFace className="size-7 text-green-700" aria-hidden="true" /><span><b className="block text-[15px] text-green-900">Tu rostro para checar</b><span className="text-[13px] text-green-800">Registrado con tu permiso</span></span></div>;
  }
  const registrar = async () => {
    if (!(await encender())) return;
    await registrarGuiado(
      async (descriptores) => { await api.post(`${rutaPublica(token)}/rostro`, { descriptores, acepto_consentimiento: true, version: C.version }); apagar(); setAbierto(false); await recargar(); },
      (e) => errorPublico(e).texto,
    );
  };
  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="t-rostro" data-rostro="pendiente">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-indigo-50"><ScanFace className="size-6 text-indigo-700" /></span>
        <span className="min-w-0 flex-1"><b id="t-rostro" className="block text-[15px]">Tu rostro para checar</b><span className="text-[13px] text-slate-600">Con tu permiso para datos biométricos</span></span>
        {!abierto ? <button type="button" onClick={() => setAbierto(true)} className={`${btnSecundario} min-h-11 px-3 text-[15px]`}>Registrar</button> : null}
      </div>
      {abierto && !camaraVisible ? (
        <div className="grid gap-3">
          <h3 className="text-[15px] font-bold">{C.titulo}</h3>
          <div className="grid gap-2 text-[15px] leading-relaxed text-slate-600">{C.texto.map((t) => <p key={t}>{t}</p>)}</div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-[15px] font-medium"><input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 size-6 shrink-0 accent-[#2563EB]" /><span>{C.acepto}</span></label>
          <button type="button" onClick={registrar} disabled={!acepto || fase === "preparando"} className={btnPrimario}><Camera className="size-5" aria-hidden="true" />{fase === "preparando" ? "Preparando la cámara…" : "Continuar a la cámara"}</button>
          <p className="text-[13px] text-slate-500">Solo se guarda el patrón numérico de tu rostro, no la foto. Si no aceptas, tu empresa te indicará otra forma de checar.</p>
        </div>
      ) : null}
      <div className={camaraVisible ? "" : "hidden"}><CapturaGuiada captura={captura} forma="vertical" ovalo="inset-x-[17%] inset-y-[14%]" etiqueta="Vista de tu cámara frontal" /></div>
      {aviso && !camaraVisible ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-[15px] text-red-700">{aviso.texto}</p> : null}
    </section>
  );
}

function PasoFirma({ v, token, recargar, alTerminar, registrarAccion }) {
  const pendientes = v.firmas.filter((f) => !f.firmado);
  const [aceptados, setAceptados] = useState(() => new Set(v.firmas.filter((f) => f.firmado).map((f) => f.clave)));
  const [leer, setLeer] = useState(null);
  const [firma, setFirma] = useState(null);
  const [foto, setFoto] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const faltan = pendientes.filter((f) => f.obligatorio && !aceptados.has(f.clave));
  const terminar = useCallback(async () => {
    setError("");
    if (pendientes.length) {
      if (faltan.length) { setError(`Marca que leíste y aceptas: ${faltan.map((f) => f.nombre).join(", ")}.`); return; }
      if (!firma) { setError("Dibuja tu firma."); return; }
      setFoto(true);
      return;
    }
    if (!v.rostro.registrado) { setError("Registra tu rostro para terminar."); return; }
    setEnviando(true);
    try { await api.post(`${rutaPublica(token)}/terminar`); await alTerminar(); }
    catch (e) { setError(errorPublico(e).texto); } finally { setEnviando(false); }
  }, [pendientes.length, faltan, firma, v.rostro.registrado, token, alTerminar]);
  useEffect(() => { registrarAccion(terminar); }, [registrarAccion, terminar]);
  const firmar = async (evidencia) => {
    setFoto(false);
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("claves", JSON.stringify(pendientes.filter((f) => aceptados.has(f.clave)).map((f) => f.clave)));
      form.append("firma", firma, "firma.png");
      form.append("evidencia", evidencia, "evidencia.jpg");
      await api.post(`${rutaPublica(token)}/firmar`, form);
      await recargar();
      if (v.rostro.registrado) { await api.post(`${rutaPublica(token)}/terminar`); await alTerminar(); }
    } catch (e) { setError(errorPublico(e).texto); } finally { setEnviando(false); }
  };
  return (
    <div className="grid gap-4" data-paso="firma">
      {v.firmas.length ? (
        <ul className="grid gap-2">
          {v.firmas.map((f) => (
            <li key={f.clave} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3" data-firma={f.clave}>
              <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 text-[15px]">
                <input type="checkbox" className="size-6 shrink-0 accent-[#2563EB]" checked={aceptados.has(f.clave)} disabled={f.firmado || enviando}
                  onChange={(e) => setAceptados((s) => { const n = new Set(s); if (e.target.checked) n.add(f.clave); else n.delete(f.clave); return n; })} />
                <span className="min-w-0">{f.nombre}{f.firmado ? <span className="block text-[13px] text-green-700">Firmado</span> : !f.obligatorio ? <span className="block text-[13px] text-slate-500">Opcional</span> : null}</span>
              </label>
              <button type="button" onClick={() => setLeer(f)} className="min-h-11 shrink-0 px-2 text-[15px] font-semibold text-[#2563EB] underline">Leer</button>
            </li>
          ))}
        </ul>
      ) : <p className="rounded-2xl bg-slate-100 p-4 text-[15px] text-slate-700">Tu empresa no te pide firmar documentos en este paso.</p>}
      {pendientes.length ? (
        <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="t-firma">
          <p id="t-firma" className="text-[15px] font-semibold">Tu firma</p>
          {firma ? (
            <div className="grid gap-2"><span className="rounded-xl border border-green-200 bg-green-50 p-3 text-[15px] text-green-900" data-firma-lista>✓ Firma lista</span><button type="button" onClick={() => setFirma(null)} className={btnSecundario}>Volver a firmar</button></div>
          ) : (
            <FirmaGrande textoBoton="Dibujar mi firma" textoGuardar="Usar esta firma" titulo="Tu firma" etiqueta="Dibuja tu firma con el dedo" onGuardar={async (png) => { setFirma(png); return true; }} />
          )}
          <p className="text-[13px] text-slate-500">Se guarda con fecha, hora y foto tuya, como la firma de ADAMIA que ya usan los documentos.</p>
        </section>
      ) : null}
      <Rostro v={v} token={token} recargar={recargar} />
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-[15px] text-red-700">{error}</p> : null}
      {enviando ? <p role="status" className="text-[15px] text-slate-600">Guardando…</p> : null}
      {leer ? <LeerFormato token={token} f={leer} alCerrar={() => { setAceptados((s) => new Set(s).add(leer.clave)); setLeer(null); }} /> : null}
      {foto ? <FotoEvidencia alTomar={firmar} alCancelar={() => setFoto(false)} /> : null}
    </div>
  );
}

// ───────── página ─────────
export default function Preingreso({ token }) {
  const [v, setV] = useState(null);
  const [fin, setFin] = useState(null);
  const [paso, setPaso] = useState(null);
  const [aviso, setAviso] = useState("");
  const accion = useRef(null);
  const registrarAccion = useCallback((fn) => { accion.current = fn; }, []);

  const recargar = useCallback(async () => {
    try {
      const { data } = await api.get(rutaPublica(token));
      setV(data);
      setPaso((p) => p ?? pasoInicial(data));
      return data;
    } catch (e) {
      const er = errorPublico(e);
      if (er.fin) setFin(er); else setAviso(er.texto);
      return null;
    }
  }, [token]);
  useEffect(() => { recargar(); }, [recargar]);
  useEffect(() => { window.scrollTo?.(0, 0); }, [paso]);

  const guardar = async (tipo, cuerpo) => {
    try {
      const { data } = await api.put(`${rutaPublica(token)}/${tipo}`, cuerpo);
      setV(data);
      setAviso("");
      return { ok: true };
    } catch (e) {
      const er = errorPublico(e);
      if (er.fin) setFin(er); else if (!er.campos) setAviso(er.texto);
      return { ok: false, ...er };
    }
  };

  if (fin) return <Marco><Final titulo={fin.titulo} texto={fin.texto} /></Marco>;
  if (!v) return <Marco><div className="flex flex-col items-center gap-3 py-16 text-slate-500" role="status"><div className="size-9 animate-spin rounded-full border-b-2 border-[#2563EB] motion-reduce:animate-none" aria-hidden="true" />{aviso || "Abriendo tu liga…"}</div></Marco>;

  const encabezado = (
    <header>
      <p className="text-[13px] font-bold tracking-wide text-[#2563EB]">{(v.empresa.nombre || "Tu empresa").toUpperCase()} · BIENVENIDA</p>
      <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight">Hola {v.persona.nombre}, completa tu ingreso</h1>
      <p className="mt-1 text-[15px] text-slate-600">{v.persona.puesto ? `${v.persona.puesto} · ` : ""}Tu primer día: {v.fecha_texto}</p>
      {paso !== "listo" && v.editable ? <Pasos actual={paso === "rostro" ? "firma" : paso} avance={{ ...v.avance, documentos: contarListos(v.documentos.filter((d) => d.obligatorio)) }} /> : null}
    </header>
  );

  if (!v.editable) {
    return (
      <Marco>
        {encabezado}
        <div className="mt-5"><Final exito titulo="¡Listo! Ya enviaste todo" texto={`Recursos Humanos de ${v.empresa.nombre || "tu empresa"} está revisando tus documentos. Si te piden corregir algo, te avisaremos y lo verás aquí mismo.`} /></div>
      </Marco>
    );
  }

  const docs = contarListos(v.documentos);
  const pies = {
    datos: <button type="submit" form="form-datos" className={`${btnPrimario} w-full`}>Continuar</button>,
    documentos: (<><span className="flex-1 text-[15px] font-semibold text-slate-700" data-cuenta-documentos>{docs.listos} de {docs.total} listos</span><button type="button" onClick={() => setPaso("firma")} className={`${btnPrimario} px-6`}>Continuar</button></>),
    firma: <button type="button" onClick={() => accion.current?.()} className={`${btnPrimario} w-full`}>{v.firmas.some((f) => !f.firmado) ? "Firmar y terminar" : "Terminar"}</button>,
  };
  const actual = paso === "rostro" || paso === "listo" ? "firma" : paso;
  return (
    <Marco pie={pies[actual]}>
      {encabezado}
      {aviso ? <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-[15px] text-amber-900">{aviso}</p> : null}
      {v.avance.rechazados?.length ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[15px] text-red-800">Recursos Humanos te pide corregir: {v.avance.rechazados.map((d) => `${d.nombre} (${d.motivo})`).join("; ")}.</p> : null}
      <nav aria-label="Ir a un paso" className="mt-4 flex gap-2 overflow-x-auto">
        {[["datos", "Datos"], ["documentos", "Documentos"], ["firma", "Firma y rostro"]].map(([k, t]) => (
          <button key={k} type="button" onClick={() => setPaso(k)} aria-pressed={actual === k} className={`min-h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold ${actual === k ? "bg-[#2563EB] text-white" : "bg-white text-slate-700 ring-1 ring-slate-300"}`}>{t}</button>
        ))}
      </nav>
      <div className="mt-4">
        {actual === "datos" ? <PasoDatos v={v} guardar={guardar} alSeguir={() => setPaso("documentos")} /> : null}
        {actual === "documentos" ? <PasoDocumentos v={v} token={token} recargar={recargar} guardar={guardar} /> : null}
        {actual === "firma" ? <PasoFirma v={v} token={token} recargar={recargar} alTerminar={recargar} registrarAccion={registrarAccion} /> : null}
      </div>
    </Marco>
  );
}
