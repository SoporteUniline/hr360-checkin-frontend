"use client";

// Felicitar (maqueta Felicitar.dc.html), con las decisiones del dueño:
//   - WhatsApp: texto FIJO del catálogo aprobado por Meta (no se edita). Se elige una de las variantes y se abre wa.me con
//     el texto ya escrito; la persona solo le da enviar. Queda anotado que ya se felicitó.
//   - Correo: la plantilla de la empresa (o la de ADAMIA si no la ha personalizado), con vista previa; se manda al correo
//     de notificaciones del empleado y no se repite en el año.
// Sin teléfono o sin correo, el botón queda deshabilitado con el motivo.
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Cake, Check, Loader2, Mail, Medal, MessageCircle } from "lucide-react";
import axios from "@/lib/axios";
import { API, RUTA_PLANTILLAS, enlaceWhatsApp, mensajeError, subtituloFelicitar, textoFelicitado } from "@/lib/avisos/avisos.mjs";
import { Ventana } from "./Ventana";

const ICONO = { cumpleanos: [Cake, "bg-pink-100 text-pink-700"], aniversario: [Medal, "bg-violet-100 text-violet-700"] };

export default function FelicitarDialog({ aviso, abierta, onOpenChange, idEmpresa, puedeEditar, movil, onFelicitado }) {
  const ids = useId();
  const [variante, setVariante] = useState(null);
  const [vista, setVista] = useState("whatsapp");
  const [correo, setCorreo] = useState({ estado: "idle" });
  const [aviso_, setAviso] = useState(null); // mensaje tras felicitar
  const [enviando, setEnviando] = useState(false);
  const [felicitado, setFelicitado] = useState(aviso?.felicitado ?? null);
  const pedido = useRef(null);

  useEffect(() => {
    if (!aviso) return;
    setVariante(aviso.whatsapp?.mensajes?.[0]?.clave ?? null);
    setVista("whatsapp");
    setCorreo({ estado: "idle" });
    pedido.current = null;
    setAviso(null);
    setFelicitado(aviso.felicitado ?? null);
  }, [aviso]);

  // Vista previa del correo: se pide una vez por aviso, cuando se abre su pestaña. Una respuesta de otro aviso se ignora.
  useEffect(() => {
    if (!aviso || !abierta || vista !== "correo" || pedido.current === aviso.clave) return;
    const clave = aviso.clave;
    pedido.current = clave;
    setCorreo({ estado: "cargando" });
    axios.post(`${API}/felicitaciones/vista-previa`, { empresa: idEmpresa ?? undefined, id_empleado: aviso.id_empleado, tipo: aviso.tipo, anio: aviso.anio })
      .then((r) => pedido.current === clave && setCorreo({ estado: "listo", ...r.data }))
      .catch((e) => {
        if (pedido.current !== clave) return;
        pedido.current = null; // al volver a la pestaña se reintenta
        setCorreo({ estado: "error", error: mensajeError(e, "No se pudo armar la vista previa del correo.") });
      });
  }, [aviso, abierta, vista, idEmpresa]);

  if (!aviso) return null;
  const [Icono, colores] = ICONO[aviso.tipo] ?? ICONO.cumpleanos;
  const mensajes = aviso.whatsapp?.mensajes ?? [];
  const elegido = mensajes.find((m) => m.clave === variante) ?? mensajes[0];
  const url = aviso.whatsapp?.telefono && elegido ? enlaceWhatsApp(aviso.whatsapp.telefono, elegido.texto) : null;
  const cuerpo = { empresa: idEmpresa ?? undefined, id_empleado: aviso.id_empleado, tipo: aviso.tipo, anio: aviso.anio };
  const yaCorreo = Boolean(felicitado?.correo);

  const anotarWhatsApp = async () => {
    try {
      const r = await axios.post(`${API}/felicitaciones`, { ...cuerpo, canal: "whatsapp", plantilla: elegido?.clave });
      setFelicitado(r.data.felicitado);
      setAviso({ tono: "ok", texto: "Abrimos WhatsApp con el mensaje listo; tú solo le das enviar. Quedó anotado que ya lo felicitaste." });
      onFelicitado?.();
    } catch (e) {
      setAviso({ tono: "alerta", texto: `Abrimos WhatsApp, pero no se pudo anotar la felicitación: ${mensajeError(e)}` });
    }
  };

  const enviarCorreo = async () => {
    setEnviando(true);
    setAviso(null);
    try {
      const r = await axios.post(`${API}/felicitaciones/correo`, cuerpo);
      setFelicitado(r.data.felicitado);
      setAviso({ tono: "ok", texto: `Listo: le mandamos la felicitación a ${r.data.para}.` });
      onFelicitado?.();
    } catch (e) {
      setAviso({ tono: "alerta", texto: mensajeError(e, "No se pudo mandar el correo.") });
    } finally {
      setEnviando(false);
    }
  };

  const nombre = aviso.nombre_corto || aviso.nombre;
  return (
    <Ventana
      abierta={abierta}
      onOpenChange={onOpenChange}
      hoja={movil}
      titulo={`Felicitar a ${aviso.nombre}`}
      descripcion={subtituloFelicitar(aviso)}
      className={movil ? "" : "max-w-[960px]"}
      encabezado={<span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-xl ${colores}`}><Icono className="size-[22px]" /></span>}
    >
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-slate-200">
        <div className="grid md:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-3 p-4 sm:px-6 sm:py-5 md:border-r md:border-slate-200">
            <div>
              <p id={`${ids}-wa`} className="mb-2 text-[13px] font-bold text-slate-700">Mensaje de WhatsApp</p>
              {/* Hoy el catálogo trae una plantilla por tipo; con más de una se elige aquí. */}
              {mensajes.length > 1 ? <div role="radiogroup" aria-labelledby={`${ids}-wa`} className="grid gap-2 sm:grid-cols-3">
                {mensajes.map((m) => {
                  const activo = m.clave === elegido?.clave;
                  return (
                    <button key={m.clave} type="button" role="radio" aria-checked={activo} onClick={() => setVariante(m.clave)}
                      className={`min-h-14 rounded-xl px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${activo ? "border-2 border-brand bg-blue-50" : "border border-slate-200 bg-white hover:bg-slate-50"}`}>
                      <b className={`block text-sm ${activo ? "text-blue-800" : "text-slate-900"}`}>{m.etiqueta}</b>
                      <span className="text-[12.5px] text-slate-600">{m.descripcion}</span>
                    </button>
                  );
                })}
              </div> : <p className="whitespace-pre-line rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">{elegido?.texto}</p>}
            </div>
            <p className="text-[13px] text-slate-600">Texto aprobado por WhatsApp; no se puede cambiar.</p>
            <p className="text-[13px] text-slate-600">
              El correo usa la plantilla de tu empresa.{puedeEditar ? <> <Link href={RUTA_PLANTILLAS} className="inline-flex min-h-11 items-center font-semibold text-brand underline-offset-2 hover:underline" onClick={() => onOpenChange(false)}>Ver plantillas</Link></> : null}
            </p>
            {aviso.felicitado?.whatsapp_automatico ? <p className="text-[13px] text-slate-600">Hoy se le mandó solo por WhatsApp desde el número de ADAMIA.</p> : null}
            {felicitado && (felicitado.whatsapp || felicitado.correo) ? (
              <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-800"><Check aria-hidden="true" className="size-4" />{textoFelicitado({ felicitado })}</p>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-2.5 bg-slate-50 p-4 sm:px-6 sm:py-5">
            <div role="tablist" aria-label="Vista previa" className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-200/70 p-1">
              {[["whatsapp", "WhatsApp"], ["correo", "Correo"]].map(([clave, etiqueta]) => (
                <button key={clave} type="button" role="tab" id={`${ids}-tab-${clave}`} aria-selected={vista === clave} aria-controls={`${ids}-panel-${clave}`}
                  onClick={() => setVista(clave)}
                  className={`min-h-11 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${vista === clave ? "bg-white text-blue-800 shadow-sm" : "text-slate-700"}`}>
                  {etiqueta}
                </button>
              ))}
            </div>
            {vista === "whatsapp" ? (
              <div role="tabpanel" id={`${ids}-panel-whatsapp`} aria-labelledby={`${ids}-tab-whatsapp`} className="flex flex-col gap-2">
                <p className="text-[13px] font-bold text-slate-700">Así lo verá en WhatsApp</p>
                <div className="flex min-h-[200px] flex-col justify-end rounded-2xl bg-[#E7F0E4] p-4">
                  <p data-mensaje-whatsapp className="max-w-[92%] self-end whitespace-pre-line break-words rounded-xl rounded-br-sm bg-[#D9FDD3] px-3 py-2.5 text-sm leading-relaxed text-[#111B21] shadow-sm">{elegido?.texto}</p>
                </div>
                <p className="text-[13px] text-slate-600">{aviso.whatsapp?.visible ? `A: ${nombre} · ${aviso.whatsapp.visible}` : aviso.whatsapp?.motivo}</p>
              </div>
            ) : (
              <div role="tabpanel" id={`${ids}-panel-correo`} aria-labelledby={`${ids}-tab-correo`} className="flex flex-col gap-2">
                {correo.estado === "listo" ? (
                  <>
                    <p className="text-[13px] text-slate-700"><b>Asunto:</b> {correo.subject}</p>
                    <iframe title={`Vista previa del correo para ${aviso.nombre}`} sandbox="" srcDoc={correo.html} className="h-[340px] w-full rounded-xl border border-slate-200 bg-white" />
                    <p className="text-[13px] text-slate-600">{correo.para ? `Para: ${correo.para}` : correo.motivo} · {correo.personalizada ? "plantilla de tu empresa" : "plantilla de ADAMIA"}</p>
                  </>
                ) : correo.estado === "error" ? (
                  <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{correo.error}</p>
                ) : (
                  <p role="status" className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-slate-600"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Armando la vista previa…</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
        <p role="status" className={`min-w-0 flex-1 basis-60 text-[13px] ${aviso_?.tono === "alerta" ? "font-semibold text-amber-800" : aviso_?.tono === "ok" ? "font-semibold text-green-800" : "text-slate-600"}`}>
          {aviso_?.texto ?? "Se abre WhatsApp con el mensaje listo; tú solo le das enviar. Queda anotado que ya lo felicitaste."}
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <span className="flex flex-col">
            <button type="button" onClick={enviarCorreo} disabled={!aviso.correo?.disponible || yaCorreo || enviando}
              aria-describedby={!aviso.correo?.disponible ? `${ids}-sin-correo` : undefined}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60">
              {enviando ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : yaCorreo ? <Check aria-hidden="true" className="size-4" /> : <Mail aria-hidden="true" className="size-4" />}
              {yaCorreo ? "Correo enviado" : "Enviar por correo"}
            </button>
            {!aviso.correo?.disponible ? <span id={`${ids}-sin-correo`} className="mt-1 max-w-64 text-[12px] text-slate-600">{aviso.correo?.motivo}</span> : null}
          </span>
          <span className="flex flex-col">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" onClick={anotarWhatsApp} data-enlace-whatsapp
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-[18px] text-sm font-bold text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2">
                <MessageCircle aria-hidden="true" className="size-[18px]" />Enviar por WhatsApp
              </a>
            ) : (
              <>
                <button type="button" disabled aria-describedby={`${ids}-sin-tel`}
                  className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-green-700 px-[18px] text-sm font-bold text-white opacity-60">
                  <MessageCircle aria-hidden="true" className="size-[18px]" />Enviar por WhatsApp
                </button>
                <span id={`${ids}-sin-tel`} className="mt-1 max-w-64 text-[12px] text-slate-600">{aviso.whatsapp?.motivo}</span>
              </>
            )}
          </span>
        </div>
      </div>
    </Ventana>
  );
}
