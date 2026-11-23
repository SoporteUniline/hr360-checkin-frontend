"use client";

// Hilo de una conversación de WhatsApp (R1): burbujas, control humano/IA y cuadro para escribir.
// R2: el agente firma con su nombre y, bajo 1280 px, «Ver evaluación» abre el panel del candidato.
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Bot, Check, CheckCheck, ClipboardList, Clock, Hand, Loader2, RotateCw, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claveDia, etiquetaDia, horaCorta } from "@/lib/whatsapp/tiempo.mjs";
import { formatearTelefono, nombreContacto } from "@/lib/whatsapp/telefono.mjs";
import { LIMITE_TEXTO, textoArchivo, accionesControl, etiquetaActor, etiquetaEstado, permisoEscribir } from "@/lib/whatsapp/reglas.mjs";
import { Avatar, ChipControl } from "./ListaConversaciones";
import EnlaceWhatsappVacante from "./EnlaceWhatsappVacante";

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
  return (
    <div className={`flex ${entrante ? "justify-start" : "justify-end"}`} data-mensaje={mensaje.id} data-direccion={mensaje.direccion}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.04)] md:max-w-[70%] ${estilo} ${fallido ? "!border-red-300" : ""}`}>
        {!entrante ? <p className="mb-0.5 text-[11px] font-semibold text-gray-500">{etiquetaActor(mensaje, nombreAsistente)}</p> : null}
        {texto ? (
          <p className="whitespace-pre-wrap text-[14px] leading-snug [overflow-wrap:anywhere]">{texto}</p>
        ) : (
          <p className="text-[13px] italic text-gray-500">{textoArchivo(mensaje.tipo)}</p>
        )}
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

function Composer({ permiso, onEnviar, enviando }) {
  const [texto, setTexto] = useState("");
  const area = useRef(null);
  const ajustarAltura = () => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };
  useLayoutEffect(ajustarAltura, [texto]);
  const limpio = texto.trim();
  const puedeEnviar = permiso.puede && limpio.length > 0 && texto.length <= LIMITE_TEXTO && !enviando;
  const enviar = async () => {
    if (!puedeEnviar) return;
    const previo = texto;
    setTexto("");
    const ok = await onEnviar(limpio);
    if (!ok) setTexto(previo);
    area.current?.focus();
  };
  return (
    <div className="border-t border-gray-200 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      {!permiso.puede && permiso.motivo ? (
        <p role="status" className={`mb-2 rounded-lg border p-2.5 text-[13px] ${permiso.ventanaCerrada ? "border-amber-200 bg-amber-50 text-amber-900" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
          {permiso.motivo}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Mensaje</span>
          <textarea
            ref={area}
            rows={1}
            value={texto}
            disabled={!permiso.puede}
            maxLength={LIMITE_TEXTO}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder={permiso.puede ? "Escribe un mensaje" : "No puedes escribir en esta conversación"}
            className="block max-h-40 min-h-11 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base leading-snug outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 md:text-sm"
          />
        </label>
        <button
          type="button"
          onClick={enviar}
          disabled={!puedeEnviar}
          aria-label="Enviar mensaje"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:bg-gray-300"
        >
          {enviando ? <Loader2 className="size-5 animate-spin" /> : <SendHorizontal className="size-5" />}
        </button>
      </div>
      {permiso.puede ? (
        <p className="mt-1 flex justify-between gap-2 text-[11px] text-gray-400">
          <span className="hidden md:inline">Enter para enviar · Shift + Enter para un salto de línea</span>
          {texto.length > LIMITE_TEXTO - 600 ? <span className={texto.length >= LIMITE_TEXTO ? "text-red-600" : ""}>{texto.length}/{LIMITE_TEXTO}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

export default function HiloConversacion({
  conversacion, mensajes, cargando, error, usuario, onVolver, onTomar, onDevolver, cambiandoControl, onEnviar, enviando, onReintentar, reintentandoId, aviso, anuncio, ahora,
  nombreAsistente = "", onVerEvaluacion = null, requiereAtencion = false,
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
  }, [total]);

  const permiso = permisoEscribir(conversacion, usuario);
  const acciones = accionesControl(conversacion, usuario);
  const contacto = conversacion?.contacto;
  return (
    <section aria-label="Conversación" className="flex min-h-0 flex-1 flex-col bg-white">
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
      <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f5f3ef] px-3 py-4 md:px-6" aria-live="polite" aria-busy={cargando}>
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
          </div>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{anuncio}</p>
      {aviso ? (
        <p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-800">{aviso}</p>
      ) : null}
      <Composer permiso={permiso} onEnviar={onEnviar} enviando={enviando} />
    </section>
  );
}
