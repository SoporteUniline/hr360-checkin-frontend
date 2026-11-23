"use client";

// Hilo de una conversación de WhatsApp (R1): burbujas, control humano/IA y cuadro para escribir.
// R2: el agente firma con su nombre y, bajo 1280 px, «Ver evaluación» abre el panel del candidato.
// R3: con la ventana de 24 h cerrada, «Enviar seguimiento» manda la plantilla aprobada (con confirmación, cuenta en el mes).
// Chat todo-en-uno: archivos en las burbujas, cuadro con archivos y nota de voz (ComposerChat), arrastrar y soltar un
// archivo sobre el hilo, cita fija arriba (CitaChat) y líneas de sistema tras cada acción de la cita.
import { Fragment, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Bot, Check, CheckCheck, ClipboardList, Clock, Hand, Loader2, Paperclip, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claveDia, etiquetaDia, horaCorta } from "@/lib/whatsapp/tiempo.mjs";
import { formatearTelefono, nombreContacto } from "@/lib/whatsapp/telefono.mjs";
import { textoArchivo, accionesControl, etiquetaActor, etiquetaEstado, permisoEscribir } from "@/lib/whatsapp/reglas.mjs";
import { Avatar, ChipControl } from "./ListaConversaciones";
import EnlaceWhatsappVacante from "./EnlaceWhatsappVacante";
import AdjuntoMensaje from "./AdjuntoMensaje";
import ComposerChat, { useAdjuntoPendiente } from "./ComposerChat";
import CitaChat from "./CitaChat";

function IconoEstado({ estado }) {
  const etiqueta = etiquetaEstado(estado);
  const comun = { className: "size-3.5", "aria-hidden": true };
  let icono = null;
  if (estado === "enviando") icono = <Clock {...comun} />;
  else if (estado === "enviado") icono = <Check {...comun} />;
  else if (estado === "entregado") icono = <CheckCheck {...comun} />;
  else if (estado === "leido") icono = <CheckCheck {...comun} className="size-3.5 text-sky-500" />;
  else if (estado === "fallido") icono = <AlertCircle {...comun} className="size-3.5 text-red-600" />;
  if (!icono) return null;
  return (
    <span className="inline-flex items-center" title={etiqueta}>
      {icono}
      <span className="sr-only">{etiqueta}</span>
    </span>
  );
}

const ESTILO_BURBUJA = {
  candidato: "bg-white border border-gray-200 text-gray-900 rounded-bl-md",
  reclutador: "bg-emerald-50 border border-emerald-200 text-gray-900 rounded-br-md",
  ia: "bg-violet-50 border border-violet-200 text-gray-900 rounded-br-md",
  sistema: "bg-gray-100 border border-gray-200 text-gray-700 rounded-br-md",
};

function Burbuja({ mensaje, onReintentar, reintentando, nombreAsistente }) {
  const entrante = mensaje.direccion === "entrante";
  const estilo = entrante ? ESTILO_BURBUJA.candidato : ESTILO_BURBUJA[mensaje.actor] ?? ESTILO_BURBUJA.reclutador;
  const fallido = mensaje.estado === "fallido";
  const texto = mensaje.texto ?? "";
  const adjunto = mensaje.adjunto ?? null;
  return (
    <div className={`flex ${entrante ? "justify-start" : "justify-end"}`} data-mensaje={mensaje.id} data-direccion={mensaje.direccion}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.04)] md:max-w-[70%] ${estilo} ${fallido ? "!border-red-300" : ""}`}>
        {!entrante ? <p className="mb-0.5 text-[11px] font-semibold text-gray-500">{etiquetaActor(mensaje, nombreAsistente)}</p> : null}
        {adjunto ? <div className={texto ? "mb-1.5" : ""} data-adjunto={adjunto.tipo}><AdjuntoMensaje adjunto={adjunto} /></div> : null}
        {texto ? (
          <p className="whitespace-pre-wrap text-[14px] leading-snug [overflow-wrap:anywhere]">{texto}</p>
        ) : !adjunto ? (
          <p className="text-[13px] italic text-gray-500">{textoArchivo(mensaje.tipo)}</p>
        ) : null}
        <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-gray-500">
          <span>{mensaje.estado === "enviando" ? "Enviando…" : horaCorta(mensaje.creado_en)}</span>
          {!entrante ? <IconoEstado estado={mensaje.estado} /> : null}
        </p>
        {fallido ? (
          <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2 border-t border-red-200 pt-1.5">
            <span className="text-[12px] font-semibold text-red-700">No enviado{mensaje.error ? `: ${mensaje.error}` : ""}</span>
            {onReintentar ? (
              <button
                type="button"
                onClick={() => onReintentar(mensaje)}
                disabled={reintentando}
                className="inline-flex min-h-9 items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 text-[12px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                <RotateCw className={`size-3.5 ${reintentando ? "animate-spin" : ""}`} /> Reintentar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function HiloConversacion({
  conversacion, mensajes, cargando, error, usuario, onVolver, onTomar, onDevolver, cambiandoControl, onEnviar, enviando, onReintentar, reintentandoId, aviso, anuncio, ahora,
  nombreAsistente = "", onVerEvaluacion = null, requiereAtencion = false, onSeguimiento = null,
  onEnviarAdjunto = null, citas = null, hoy = "", onCitaCambio = null, ofrecer = null, lineas = [],
}) {
  const scroll = useRef(null);
  const primeraCarga = useRef(true);
  const total = mensajes.length;
  useEffect(() => {
    const el = scroll.current;
    if (!el || !total) return;
    const cercaDelFinal = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (primeraCarga.current || cercaDelFinal) {
      el.scrollTop = el.scrollHeight;
      primeraCarga.current = false;
    }
  }, [total, lineas.length]);

  const permiso = permisoEscribir(conversacion, usuario);
  const acciones = accionesControl(conversacion, usuario);
  const contacto = conversacion?.contacto;
  const pendiente = useAdjuntoPendiente();
  // Arrastrar un archivo sobre el hilo (escritorio). El contador evita parpadeos al pasar sobre elementos hijos.
  const [arrastrando, setArrastrando] = useState(false);
  const capas = useRef(0);
  const puedeSoltar = permiso.puede && !!onEnviarAdjunto;
  const conArchivos = (e) => [...(e.dataTransfer?.types ?? [])].includes("Files");
  const soltar = {
    onDragEnter: (e) => { if (!puedeSoltar || !conArchivos(e)) return; e.preventDefault(); capas.current += 1; setArrastrando(true); },
    onDragOver: (e) => { if (!puedeSoltar || !conArchivos(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; },
    onDragLeave: () => { if (!puedeSoltar) return; capas.current = Math.max(0, capas.current - 1); if (!capas.current) setArrastrando(false); },
    onDrop: (e) => {
      if (!puedeSoltar || !conArchivos(e)) return;
      e.preventDefault();
      capas.current = 0;
      setArrastrando(false);
      const f = e.dataTransfer.files?.[0];
      if (f) pendiente.elegir(f);
    },
  };
  return (
    <section aria-label="Conversación" className="relative flex min-h-0 flex-1 flex-col bg-white" {...soltar}>
      {arrastrando ? (
        <div className="pointer-events-none absolute inset-2 z-20 grid place-items-center rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-50/90 text-emerald-800" data-soltar-archivo>
          <p className="flex items-center gap-2 text-[15px] font-semibold"><Paperclip className="size-5" aria-hidden="true" /> Suelta el archivo para adjuntarlo</p>
        </div>
      ) : null}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-4 md:pt-2">
        <button type="button" onClick={onVolver} aria-label="Volver a la lista" className="grid size-11 shrink-0 place-items-center rounded-full text-gray-600 hover:bg-gray-100 md:hidden">
          <ArrowLeft className="size-5" />
        </button>
        <Avatar contacto={contacto} className="hidden sm:grid" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold text-gray-900">{conversacion ? nombreContacto(contacto) : "Cargando…"}</h2>
          <p className="truncate text-[12px] text-gray-500">
            {contacto?.telefono ? formatearTelefono(contacto.telefono) : ""}
            {conversacion?.vacante?.titulo ? ` · ${conversacion.vacante.titulo}` : ""}
          </p>
        </div>
        {conversacion ? (
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto xl:w-full 2xl:w-auto">
            <ChipControl conversacion={conversacion} usuario={usuario} />
            {acciones.tomar ? (
              <Button type="button" size="sm" onClick={onTomar} loading={cambiandoControl} startIcon={<Hand className="size-4" />} className="min-h-10 md:min-h-8">
                Tomar control
              </Button>
            ) : null}
            {acciones.devolver ? (
              <Button type="button" size="sm" variant="outline" onClick={onDevolver} loading={cambiandoControl} startIcon={<Bot className="size-4" />} className="min-h-10 md:min-h-8">
                Devolver a IA
              </Button>
            ) : null}
            {onVerEvaluacion ? (
              <Button type="button" size="sm" variant="outline" onClick={onVerEvaluacion} startIcon={<ClipboardList className="size-4 text-violet-600" />} className="min-h-10 xl:hidden md:min-h-8">
                Ver evaluación
                {requiereAtencion ? <span className="size-2 rounded-full bg-red-500" aria-label="requiere atención" role="img" /> : null}
              </Button>
            ) : null}
            {conversacion.vacante?.id_vacante ? (
              <EnlaceWhatsappVacante idVacante={conversacion.vacante.id_vacante} titulo={conversacion.vacante.titulo} variante="ghost" className="min-h-10 md:min-h-8" />
            ) : null}
          </div>
        ) : null}
      </header>
      {conversacion && citas && onCitaCambio ? (
        <CitaChat conversacion={conversacion} activa={citas.activa} ultima={citas.ultima} hoy={hoy} onCambio={onCitaCambio} ofrecer={ofrecer} />
      ) : null}
      <div ref={scroll} data-hilo-scroll className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f5f3ef] px-3 py-4 md:px-6" aria-live="polite" aria-busy={cargando}>
        {error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : cargando && !total ? (
          <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Cargando mensajes…</p>
        ) : !total ? (
          <p className="text-center text-sm text-gray-500">Todavía no hay mensajes en esta conversación.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {mensajes.map((m, i) => {
              const dia = claveDia(m.creado_en);
              const nuevoDia = dia && dia !== claveDia(mensajes[i - 1]?.creado_en);
              return (
                <Fragment key={m.id}>
                  {nuevoDia ? (
                    <p className="my-2 self-center rounded-full bg-white/90 px-3 py-0.5 text-[11.5px] font-medium text-gray-600 shadow-sm">{etiquetaDia(m.creado_en, ahora)}</p>
                  ) : null}
                  <Burbuja mensaje={m} onReintentar={m.estado === "fallido" && !m.temporal ? onReintentar : null} reintentando={String(reintentandoId) === String(m.id)} nombreAsistente={nombreAsistente} />
                </Fragment>
              );
            })}
            {lineas.map((l) => (
              <p key={l.id} data-linea-sistema className="my-1 self-center rounded-full bg-blue-50 px-3 py-1 text-center text-[12px] font-medium text-blue-900 ring-1 ring-inset ring-blue-200">{l.texto}</p>
            ))}
          </div>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{anuncio}</p>
      {aviso ? (
        <p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-800">{aviso}</p>
      ) : null}
      <ComposerChat permiso={permiso} onEnviar={onEnviar} enviando={enviando} ventanaCerrada={conversacion?.ventana_abierta === false} onSeguimiento={onSeguimiento}
        onEnviarAdjunto={onEnviarAdjunto} pendiente={pendiente} ofrecer={ofrecer} />
    </section>
  );
}
