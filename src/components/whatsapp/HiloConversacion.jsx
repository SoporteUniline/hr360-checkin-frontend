"use client";

// Hilo de una conversación de WhatsApp (R1): burbujas, control humano/IA y cuadro para escribir.
// R2: el agente firma con su nombre. R3: con la ventana de 24 h cerrada, «Enviar seguimiento» manda la plantilla aprobada.
// Chat todo-en-uno: archivos en las burbujas, cuadro con archivos y nota de voz (ComposerChat), arrastrar y soltar un
// archivo sobre el hilo y líneas de sistema tras cada acción de la cita.
// Estilo WhatsApp Web (25/11/2026): fondo beige, entrantes blancas y salientes verdes (las del agente con «Asistente IA»),
// eventos del sistema como avisos centrados y encabezado compacto: avatar + nombre (abre la ficha), vacante · teléfono ·
// estado, quién atiende, «Tomar control» / «Devolver a la IA», «Agendar» y el menú «Acciones» (ver ficha, agendar,
// ofrecer horarios, mover etapa, enlace de WhatsApp de la vacante y marcar como atendido). La cita, la sugerencia del agente
// y la atención pendiente se ven como avisos fijos sobre el chat mientras la ficha está cerrada.
import { Fragment, useEffect, useRef, useState } from "react";
import {
  AlertCircle, AlertTriangle, ArrowLeft, Bot, CalendarCheck2, CalendarPlus, Check, CheckCheck, Clock, IdCard, Link2, Loader2, MoreVertical, Paperclip,
  RotateCw, Send, Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { claveDia, etiquetaDia, horaCorta } from "@/lib/whatsapp/tiempo.mjs";
import { formatearTelefono, nombreContacto } from "@/lib/whatsapp/telefono.mjs";
import { textoArchivo, accionesControl, etiquetaActor, etiquetaControl, etiquetaEstado, permisoEscribir } from "@/lib/whatsapp/reglas.mjs";
import { fechaHoraCorta } from "@/lib/whatsapp/agenda.mjs";
import { Avatar } from "./ListaConversaciones";
import AdjuntoMensaje from "./AdjuntoMensaje";
import ComposerChat, { useAdjuntoPendiente } from "./ComposerChat";
import { ChipEstadoCita } from "./citas";

function IconoEstado({ estado }) {
  const etiqueta = etiquetaEstado(estado);
  const comun = { className: "size-3.5", "aria-hidden": true };
  let icono = null;
  if (estado === "enviando") icono = <Clock {...comun} />;
  else if (estado === "enviado") icono = <Check {...comun} />;
  else if (estado === "entregado") icono = <CheckCheck {...comun} />;
  else if (estado === "leido") icono = <CheckCheck {...comun} className="size-3.5 text-sky-700" />;
  else if (estado === "fallido") icono = <AlertCircle {...comun} className="size-3.5 text-red-700" />;
  if (!icono) return null;
  return (
    <span className="inline-flex items-center" title={etiqueta}>
      {icono}
      <span className="sr-only">{etiqueta}</span>
    </span>
  );
}

// Globos estilo WhatsApp: entrantes blancos con la punta arriba a la izquierda; salientes verdes con la punta a la derecha.
const SOMBRA = "shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]";
const COLOR_ACTOR = { ia: "text-violet-700", reclutador: "text-emerald-800", sistema: "text-[#54656F]" };

// Evento del sistema («Pedro tomó la conversación»): aviso centrado, como los de WhatsApp.
function AvisoSistema({ mensaje }) {
  return (
    <div className="flex justify-center" data-mensaje={mensaje.id} data-direccion={mensaje.direccion} data-aviso-sistema="">
      <p className={`max-w-[85%] rounded-lg bg-[#FFF5C4] px-3 py-1.5 text-center text-[12.5px] text-[#3B4A54] ${SOMBRA}`}>
        <span className="sr-only">Sistema: </span>{mensaje.texto}
        <span className="ml-1.5 text-[11px] text-[#54656F]">{horaCorta(mensaje.creado_en)}</span>
      </p>
    </div>
  );
}

function Burbuja({ mensaje, onReintentar, reintentando, nombreAsistente }) {
  const entrante = mensaje.direccion === "entrante";
  const fallido = mensaje.estado === "fallido";
  const texto = mensaje.texto ?? "";
  const adjunto = mensaje.adjunto ?? null;
  if (!entrante && mensaje.actor === "sistema" && !adjunto && !fallido && texto) return <AvisoSistema mensaje={mensaje} />;
  return (
    <div className={`flex ${entrante ? "justify-start" : "justify-end"}`} data-mensaje={mensaje.id} data-direccion={mensaje.direccion}>
      <div className={`max-w-[85%] px-2.5 py-1.5 text-[#111B21] lg:max-w-[65%] ${SOMBRA} ${
        entrante ? "rounded-[2px_10px_10px_10px] bg-white" : "rounded-[10px_2px_10px_10px] bg-[#D9FDD3]"} ${fallido ? "ring-1 ring-red-300" : ""}`}>
        {!entrante ? <p className={`text-[12px] font-bold ${COLOR_ACTOR[mensaje.actor] ?? COLOR_ACTOR.reclutador}`}>{etiquetaActor(mensaje, nombreAsistente)}</p> : null}
        {adjunto ? <div className={`mt-0.5 ${texto ? "mb-1.5" : ""}`} data-adjunto={adjunto.tipo}><AdjuntoMensaje adjunto={adjunto} /></div> : null}
        {texto ? (
          <p className="whitespace-pre-wrap text-[14.5px] leading-[1.4] [overflow-wrap:anywhere]">{texto}</p>
        ) : !adjunto ? (
          <p className="text-[13px] italic text-[#54656F]">{textoArchivo(mensaje.tipo)}</p>
        ) : null}
        <p className="-mb-0.5 mt-0.5 flex items-center justify-end gap-1 text-[11.5px] text-[#54656F]">
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
                <RotateCw className={`size-3.5 ${reintentando ? "animate-spin" : ""}`} aria-hidden="true" /> Reintentar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const TONO_CONTROL = {
  violeta: "bg-violet-100 text-violet-800",
  azul: "bg-blue-100 text-blue-800",
  gris: "bg-white text-[#3B4A54] ring-1 ring-inset ring-[#D1D7DB]",
};
const TEXTO_CONTROL = { violeta: "text-violet-800", azul: "text-blue-800", gris: "text-[#3B4A54]" };
// «La IA atiende» / «Tú tienes el control» / «Atiende Pedro».
export function textoQuienAtiende(conversacion, usuario) {
  const e = etiquetaControl(conversacion, usuario);
  return { texto: conversacion?.modo !== "humano" ? "La IA atiende" : e.texto, tono: e.tono };
}

const ITEM = "min-h-11 gap-3 px-4 text-[14.5px] text-[#111B21] focus:bg-[#F0F2F5] [&_svg]:text-[#54656F]";
const BOTON_ICONO = "grid size-11 shrink-0 place-items-center rounded-full text-[#54656F] outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-40 lg:size-10";

export default function HiloConversacion({
  conversacion, mensajes, cargando, error, usuario, onVolver, onTomar, onDevolver, cambiandoControl, onEnviar, enviando, onReintentar, reintentandoId, aviso, anuncio, ahora,
  nombreAsistente = "", onSeguimiento = null, onEnviarAdjunto = null, ofrecer = null, lineas = [],
  estado = "", fichaAbierta = false, onVerFicha = null, onAgendar = null, cita = null, onMoverEtapa = null, onEnlaceVacante = null,
  atencion = null, onAtendido = null, marcando = false, sugerencia = null,
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
  const nombre = conversacion ? nombreContacto(contacto) : "Cargando…";
  const quien = conversacion ? textoQuienAtiende(conversacion, usuario) : null;
  const idVacante = conversacion?.vacante?.id_vacante ?? null;
  const subtitulo = [conversacion?.vacante?.titulo || (conversacion ? "Sin vacante" : ""), contacto?.telefono ? formatearTelefono(contacto.telefono) : "", estado]
    .filter(Boolean).join(" · ");
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
  const agendarTexto = cita ? "Ver entrevista agendada" : "Agendar entrevista";
  // La opción que abre la ficha o un diálogo se ejecuta cuando el menú terminó de cerrarse (patrón de Radix): así el
  // diálogo no hereda la capa del menú (el primer Escape lo cerraba a él) y el foco se queda en el destino.
  const pendienteMenu = useRef(null);
  const elegir = (fn) => () => { pendienteMenu.current = fn; };
  const menu = conversacion ? (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Acciones" title="Acciones" className={`${BOTON_ICONO} data-[state=open]:bg-[#D1D7DB] data-[state=open]:text-[#111B21]`}>
          <MoreVertical className="size-5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-labelledby={undefined} aria-label="Acciones de la conversación"
        onCloseAutoFocus={(e) => { const fn = pendienteMenu.current; pendienteMenu.current = null; if (fn) { e.preventDefault(); fn(); } }} className="w-80 max-w-[calc(100vw-1rem)] rounded-xl border-0 bg-white py-2 shadow-[0_12px_34px_rgba(11,20,26,0.22)]">
        {onVerFicha ? <DropdownMenuItem className={ITEM} onSelect={elegir(() => onVerFicha())}><IdCard aria-hidden="true" /> Ver ficha del candidato</DropdownMenuItem> : null}
        {onAgendar ? (
          <DropdownMenuItem className={ITEM} disabled={!idVacante && !cita} onSelect={elegir(onAgendar)}>
            {cita ? <CalendarCheck2 aria-hidden="true" /> : <CalendarPlus aria-hidden="true" />}
            <span className="grid">
              <span>{agendarTexto}</span>
              {!idVacante && !cita ? <span className="text-[12px] text-[#54656F]">Sin vacante: no se puede agendar</span> : null}
            </span>
          </DropdownMenuItem>
        ) : null}
        {ofrecer ? (
          <DropdownMenuItem className={ITEM} disabled={!ofrecer.disponible || ofrecer.cargando} onSelect={ofrecer.onOfrecer}>
            <Send aria-hidden="true" />
            <span className="grid">
              <span>Ofrecer horarios</span>
              {!ofrecer.disponible && ofrecer.motivo ? <span className="text-[12px] text-[#54656F]">{ofrecer.motivo}</span> : null}
            </span>
          </DropdownMenuItem>
        ) : null}
        {onMoverEtapa ? <DropdownMenuItem className={ITEM} onSelect={elegir(onMoverEtapa)}><Workflow aria-hidden="true" /> Mover etapa del proceso</DropdownMenuItem> : null}
        {onEnlaceVacante && idVacante ? (
          <DropdownMenuItem className={ITEM} onSelect={elegir(onEnlaceVacante)}><Link2 aria-hidden="true" /> Copiar enlace de WhatsApp de la vacante</DropdownMenuItem>
        ) : null}
        {acciones.devolver ? (
          <DropdownMenuItem className={`${ITEM} lg:hidden`} onSelect={onDevolver} disabled={cambiandoControl}><Bot aria-hidden="true" /> Devolver a la IA</DropdownMenuItem>
        ) : null}
        {atencion && onAtendido ? (
          <>
            <DropdownMenuSeparator className="my-1.5 bg-[#E9EDEF]" />
            <DropdownMenuItem className={`${ITEM} text-red-700 focus:text-red-800 [&_svg]:!text-red-700`} disabled={marcando} onSelect={onAtendido}>
              <AlertTriangle aria-hidden="true" /> Marcar como atendido
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  return (
    <section aria-label={conversacion ? `Conversación con ${nombre}` : "Conversación"} className="relative flex min-h-0 flex-1 flex-col bg-[#EFEAE2]" {...soltar}>
      {arrastrando ? (
        <div className="pointer-events-none absolute inset-2 z-20 grid place-items-center rounded-2xl border-2 border-dashed border-emerald-600 bg-emerald-50/90 text-emerald-800" data-soltar-archivo>
          <p className="flex items-center gap-2 text-[15px] font-semibold"><Paperclip className="size-5" aria-hidden="true" /> Suelta el archivo para adjuntarlo</p>
        </div>
      ) : null}
      <header className="flex min-h-[60px] shrink-0 items-center gap-1.5 border-b border-[#E2E8F0] bg-[#F0F2F5] pl-1 pr-1.5 pt-[env(safe-area-inset-top)] lg:gap-2.5 lg:pl-4 lg:pr-3 lg:pt-0">
        <button type="button" onClick={onVolver} aria-label="Volver a la lista" className={`${BOTON_ICONO} lg:hidden`}>
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onVerFicha?.()} disabled={!conversacion || !onVerFicha} aria-expanded={fichaAbierta}
          aria-label={conversacion ? `Ver ficha de ${nombre}` : "Cargando conversación"} data-ver-ficha=""
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 pr-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 lg:gap-3">
          <Avatar contacto={contacto} className="size-9 text-[13px] lg:size-10 lg:text-sm" />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-[#111B21] lg:text-[16px]">{nombre}</span>
            {quien ? (
              <span className={`block truncate text-[12.5px] font-semibold lg:hidden ${TEXTO_CONTROL[quien.tono]}`} data-quien-atiende-movil="">
                {quien.texto}{conversacion?.vacante?.titulo ? <span className="font-normal text-[#54656F]"> · {conversacion.vacante.titulo}</span> : null}
              </span>
            ) : null}
            {subtitulo ? <span className="hidden truncate text-[13px] text-[#54656F] lg:block" title={subtitulo} data-subtitulo-chat="">{subtitulo}</span> : null}
          </span>
        </button>
        {quien ? (
          <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-bold lg:inline-flex ${TONO_CONTROL[quien.tono]}`} data-quien-atiende="">{quien.texto}</span>
        ) : null}
        {acciones.tomar ? (
          <Button type="button" onClick={onTomar} loading={cambiandoControl} className="hidden min-h-10 shrink-0 rounded-full bg-[#1D5CF5] px-3.5 text-[14px] font-bold hover:bg-[#1747C4] lg:inline-flex">
            Tomar control
          </Button>
        ) : null}
        {acciones.devolver ? (
          <Button type="button" variant="outline" onClick={onDevolver} loading={cambiandoControl} startIcon={<Bot className="size-4" />}
            className="hidden min-h-10 shrink-0 rounded-full border-[#D1D7DB] bg-white px-3.5 text-[14px] font-semibold lg:inline-flex">
            Devolver a la IA
          </Button>
        ) : null}
        {conversacion && onAgendar ? (
          <button type="button" onClick={onAgendar} disabled={!idVacante && !cita} aria-label={agendarTexto} title={!idVacante && !cita ? "Sin vacante: no se puede agendar" : agendarTexto}
            className={`${BOTON_ICONO} max-lg:hidden`} data-boton-agendar="">
            {cita ? <CalendarCheck2 className="size-5" aria-hidden="true" /> : <CalendarPlus className="size-5" aria-hidden="true" />}
          </button>
        ) : null}
        {menu}
      </header>
      {!fichaAbierta && atencion ? (
        <div role="status" data-banner-atencion="" className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-red-200 bg-red-50 px-3 py-1.5 text-[13px] text-red-800 lg:px-4">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">{atencion}</span>
          {onVerFicha ? (
            <button type="button" onClick={() => onVerFicha()} className="min-h-11 rounded-full px-3 font-semibold underline underline-offset-2 hover:bg-red-100 lg:min-h-8">Ver ficha</button>
          ) : null}
          {onAtendido ? (
            <Button type="button" size="sm" onClick={onAtendido} loading={marcando} className="min-h-11 rounded-full bg-red-700 hover:bg-red-800 lg:min-h-8">Marcar como atendido</Button>
          ) : null}
        </div>
      ) : null}
      {!fichaAbierta ? sugerencia : null}
      {!fichaAbierta && cita ? (
        <button type="button" onClick={() => onVerFicha?.("cita")} data-cita-fijada={cita.estado}
          className="flex min-h-11 w-full shrink-0 items-center gap-2.5 border-b border-[#E2E8F0] bg-white/95 px-3 py-1.5 text-left text-[13px] text-[#111B21] outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 lg:px-4">
          <CalendarCheck2 className="size-4 shrink-0 text-blue-700" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate"><span className="text-[#54656F]">Entrevista: </span><span className="font-semibold first-letter:uppercase">{fechaHoraCorta(cita.inicio)}</span></span>
          <ChipEstadoCita estado={cita.estado} />
          <span className="shrink-0 font-semibold text-blue-700">Ver</span>
        </button>
      ) : null}
      <div ref={scroll} data-hilo-scroll className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3 lg:px-[6%] lg:py-4" aria-live="polite" aria-busy={cargando}>
        {error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : cargando && !total ? (
          <p className="mx-auto flex w-fit items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm text-[#54656F]"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando mensajes…</p>
        ) : !total ? (
          <p className="mx-auto w-fit rounded-lg bg-white px-3 py-1.5 text-center text-sm text-[#54656F]">Todavía no hay mensajes en esta conversación.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {mensajes.map((m, i) => {
              const dia = claveDia(m.creado_en);
              const nuevoDia = dia && dia !== claveDia(mensajes[i - 1]?.creado_en);
              return (
                <Fragment key={m.id}>
                  {nuevoDia ? (
                    <p className={`my-1.5 self-center rounded-lg bg-white px-3 py-1 text-[12.5px] font-medium text-[#54656F] ${SOMBRA}`}>{etiquetaDia(m.creado_en, ahora)}</p>
                  ) : null}
                  <Burbuja mensaje={m} onReintentar={m.estado === "fallido" && !m.temporal ? onReintentar : null} reintentando={String(reintentandoId) === String(m.id)} nombreAsistente={nombreAsistente} />
                </Fragment>
              );
            })}
            {lineas.map((l) => (
              <p key={l.id} data-linea-sistema className={`my-1 max-w-[85%] self-center rounded-lg bg-[#FFF5C4] px-3 py-1.5 text-center text-[12.5px] text-[#3B4A54] ${SOMBRA}`}>{l.texto}</p>
            ))}
          </div>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{anuncio}</p>
      {aviso ? (
        <p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-800">{aviso}</p>
      ) : null}
      <ComposerChat permiso={permiso} onEnviar={onEnviar} enviando={enviando} ventanaCerrada={conversacion?.ventana_abierta === false} onSeguimiento={onSeguimiento}
        onEnviarAdjunto={onEnviarAdjunto} pendiente={pendiente} ofrecer={ofrecer}
        accion={acciones.tomar ? { texto: "Tomar control", etiqueta: "Tomar control para escribir", onClick: onTomar, cargando: cambiandoControl } : null} />
    </section>
  );
}
