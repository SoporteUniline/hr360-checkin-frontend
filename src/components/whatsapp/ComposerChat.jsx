"use client";

// Cuadro para escribir del chat (R1 texto; chat todo-en-uno: archivos, nota de voz y acciones «+»).
// Mismas reglas que el texto: sin control o con la ventana de 24 h cerrada no se envía nada (queda «Enviar seguimiento»).
// Archivos: clip o «+ → Adjuntar archivo», arrastrar al hilo (escritorio) o pegar una imagen; vista previa, comentario,
// barra de avance con «Cancelar envío». Micrófono: grabadora con tiempo, cancelar y «Detener y enviar» (máx. 5 min).
// Estilo WhatsApp Web (25/11/2026): barra gris con el cuadro blanco. Sin permiso para escribir no se muestra un cuadro
// deshabilitado: el motivo ocupa su lugar con la acción que lo resuelve (`accion`, p. ej. «Tomar control»).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarClock, FileText, Loader2, MailPlus, Mic, Paperclip, Plus, SendHorizontal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LIMITE_TEXTO, MENSAJE_VENTANA, mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import {
  ACEPTAR_ARCHIVOS, LIMITE_PIE, MAX_GRABACION_SEG, MENSAJE_GRABACION_MAXIMA, formatearDuracion, formatearTamano, validarArchivo,
} from "@/lib/whatsapp/adjuntos.mjs";
import useGrabadora from "./useGrabadora";

// Archivo elegido y su error de validación. Lo usa también el hilo (arrastrar y soltar).
export function useAdjuntoPendiente() {
  const [adjunto, setAdjunto] = useState(null);
  const [error, setError] = useState("");
  const vista = useRef(null);
  const liberar = () => { if (vista.current) URL.revokeObjectURL(vista.current); vista.current = null; };
  useEffect(() => liberar, []);
  const elegir = useCallback((archivo, { notaVoz = false, aviso = "" } = {}) => {
    const v = validarArchivo(archivo);
    if (!v.ok) { setError(v.error); return false; }
    liberar();
    const previa = v.tipo === "imagen" ? URL.createObjectURL(archivo) : null;
    vista.current = previa;
    setAdjunto({ archivo, nombre: archivo.name || `imagen-${Date.now()}.${v.mime.split("/")[1]}`, mime: v.mime, tipo: v.tipo, tamano: archivo.size, vista: previa, notaVoz });
    setError(aviso);
    return true;
  }, []);
  const quitar = useCallback(() => { liberar(); setAdjunto(null); setError(""); }, []);
  return { adjunto, error, setError, elegir, quitar };
}

// Ventana de 24 h cerrada: en lugar de un cuadro bloqueado sin salida, se ofrece mandar la plantilla de seguimiento.
function Seguimiento({ onSeguimiento }) {
  const [paso, setPaso] = useState("inicio"); // inicio | confirmar | enviando | enviado
  const [error, setError] = useState("");
  const enviar = async () => {
    setPaso("enviando");
    setError("");
    try {
      await onSeguimiento();
      setPaso("enviado");
    } catch (e) {
      setError(mensajeErrorApi(e, "No se pudo enviar el seguimiento."));
      setPaso("inicio");
    }
  };
  return (
    <div role="status" data-seguimiento className="mb-2 grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[13px] text-amber-900">
      <p>{MENSAJE_VENTANA}</p>
      {paso === "enviado" ? (
        <p className="font-semibold text-emerald-800">Seguimiento enviado. Cuando el candidato conteste, podrás escribirle.</p>
      ) : paso === "confirmar" || paso === "enviando" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 basis-56 font-medium">Se envía la plantilla de seguimiento y cuenta en las plantillas del mes.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setPaso("inicio")} disabled={paso === "enviando"} className="min-h-11 bg-white md:min-h-8">Cancelar</Button>
          <Button type="button" size="sm" onClick={enviar} loading={paso === "enviando"} className="min-h-11 bg-amber-700 hover:bg-amber-800 md:min-h-8">Enviar plantilla</Button>
        </div>
      ) : (
        <div>
          <Button type="button" size="sm" variant="outline" onClick={() => setPaso("confirmar")} startIcon={<MailPlus className="size-4" />} className="min-h-11 border-amber-300 bg-white md:min-h-8">
            Enviar seguimiento
          </Button>
        </div>
      )}
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-white p-2 font-medium text-red-800">{error}</p> : null}
    </div>
  );
}

function VistaAdjunto({ adjunto, onQuitar, bloqueado }) {
  return (
    <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-2" data-adjunto-pendiente={adjunto.tipo}>
      {adjunto.vista ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={adjunto.vista} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white text-gray-600 ring-1 ring-gray-200" aria-hidden="true">
          {adjunto.notaVoz || adjunto.tipo === "audio" ? <Mic className="size-5" /> : <FileText className="size-5" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-gray-900" title={adjunto.nombre}>{adjunto.notaVoz ? "Nota de voz" : adjunto.nombre}</p>
        <p className="text-[11.5px] text-gray-500">{formatearTamano(adjunto.tamano)}</p>
      </div>
      <button type="button" onClick={onQuitar} disabled={bloqueado} aria-label="Quitar archivo"
        className="grid size-11 shrink-0 place-items-center rounded-full text-gray-600 hover:bg-gray-200 disabled:opacity-50 md:size-9">
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function Avance({ progreso, onCancelar }) {
  const pct = progreso === null ? null : Math.round(progreso * 100);
  return (
    <div className="mb-2 grid gap-1.5" data-subiendo>
      <div className="flex items-center gap-2 text-[12.5px] text-gray-700">
        <Loader2 className="size-4 animate-spin text-emerald-600" aria-hidden="true" />
        <span className="min-w-0 flex-1">Enviando archivo…{pct !== null ? ` ${pct}%` : ""}</span>
        <button type="button" onClick={onCancelar} className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 font-semibold text-gray-800 hover:bg-gray-50 md:min-h-8">
          Cancelar envío
        </button>
      </div>
      <div role="progressbar" aria-label="Avance del envío" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined} className="h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full bg-emerald-600 transition-[width] ${pct === null ? "w-1/3 animate-pulse" : ""}`} style={pct !== null ? { width: `${pct}%` } : undefined} />
      </div>
    </div>
  );
}

function BarraGrabacion({ segundos, onCancelar, onDetener }) {
  return (
    <div role="group" aria-label="Grabando nota de voz" className="flex items-center gap-2" data-grabando>
      <button type="button" onClick={onCancelar} aria-label="Cancelar grabación" className="grid size-11 shrink-0 place-items-center rounded-full text-red-700 hover:bg-red-50">
        <Trash2 className="size-5" aria-hidden="true" />
      </button>
      <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-[14px] text-red-800">
        <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
        <span className="font-semibold">Grabando</span>
        <span className="tabular-nums" data-tiempo-grabacion>{formatearDuracion(segundos)}</span>
        <span className="ml-auto hidden text-[12px] text-red-700/80 sm:inline">máx. {formatearDuracion(MAX_GRABACION_SEG)}</span>
      </div>
      <button type="button" onClick={onDetener} aria-label="Detener y enviar" className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
        <SendHorizontal className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

const ICONO = "grid size-11 shrink-0 place-items-center rounded-full text-[#54656F] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40";

export default function ComposerChat({
  permiso, onEnviar, enviando, ventanaCerrada = false, onSeguimiento = null, onEnviarAdjunto = null, pendiente, ofrecer = null, accion = null,
}) {
  const [texto, setTexto] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const area = useRef(null);
  const selector = useRef(null);
  const control = useRef(null);
  const { adjunto, error, setError, elegir, quitar } = pendiente;
  const ajustarAltura = () => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };
  useLayoutEffect(ajustarAltura, [texto]);
  const limite = adjunto ? LIMITE_PIE : LIMITE_TEXTO;
  const limpio = texto.trim();
  const ocupado = enviando || subiendo;
  const puedeEnviar = permiso.puede && (limpio.length > 0 || !!adjunto) && texto.length <= limite && !ocupado;

  const subir = async (datos) => {
    if (!onEnviarAdjunto) return false;
    const ctl = new AbortController();
    control.current = ctl;
    setSubiendo(true);
    setProgreso(0);
    try {
      return await onEnviarAdjunto(datos, { onProgreso: setProgreso, signal: ctl.signal });
    } finally {
      control.current = null;
      setSubiendo(false);
      setProgreso(null);
    }
  };
  const enviar = async () => {
    if (!puedeEnviar) return;
    if (adjunto) {
      const ok = await subir({ archivo: adjunto.archivo, nombre: adjunto.nombre, texto: limpio, notaVoz: adjunto.notaVoz });
      if (ok) { quitar(); setTexto(""); }
      area.current?.focus();
      return;
    }
    const previo = texto;
    setTexto("");
    const ok = await onEnviar(limpio);
    if (!ok) setTexto(previo);
    area.current?.focus();
  };
  const grabadora = useGrabadora({
    onError: setError,
    onTerminar: (archivo, motivo) => {
      if (motivo === "maximo") { elegir(archivo, { notaVoz: true, aviso: MENSAJE_GRABACION_MAXIMA }); return; }
      const v = validarArchivo(archivo);
      if (!v.ok) { setError(v.error); return; }
      subir({ archivo, nombre: archivo.name, texto: "", notaVoz: true });
    },
  });
  const sePuedeAdjuntar = permiso.puede && !!onEnviarAdjunto && !ocupado && !grabadora.grabando;
  const abrirSelector = () => { if (sePuedeAdjuntar) selector.current?.click(); };
  const alPegar = (e) => {
    const archivos = [...(e.clipboardData?.files ?? [])];
    if (!archivos.length || !sePuedeAdjuntar) return;
    e.preventDefault();
    elegir(archivos.find((f) => f.type.startsWith("image/")) ?? archivos[0]);
  };
  const aviso = error ? (
    <p role="alert" className={`mb-2 flex items-start gap-2 rounded-lg border p-2.5 text-[13px] ${adjunto ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-800"}`} data-error-adjunto>
      <span className="min-w-0 flex-1">{error}</span>
      <button type="button" onClick={() => setError("")} aria-label="Cerrar aviso" className="-m-1 grid size-8 shrink-0 place-items-center rounded-full hover:bg-black/5"><X className="size-4" aria-hidden="true" /></button>
    </p>
  ) : null;

  const conSeguimiento = ventanaCerrada && !!onSeguimiento;
  return (
    <div className="bg-[#F0F2F5] px-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 lg:px-4" data-composer="">
      {conSeguimiento ? <Seguimiento onSeguimiento={onSeguimiento} /> : null}
      {!permiso.puede && permiso.motivo && !conSeguimiento ? (
        <div className="flex items-center gap-2.5 lg:gap-3" data-sin-permiso="">
          <p role="status" className={`flex min-h-11 min-w-0 flex-1 items-center rounded-lg px-3.5 py-2 text-[13px] lg:text-[14px] ${permiso.ventanaCerrada ? "bg-amber-50 text-amber-900" : "bg-white text-[#54656F]"}`}>
            {permiso.motivo}
          </p>
          {accion ? (
            <Button type="button" onClick={accion.onClick} loading={accion.cargando} aria-label={accion.etiqueta ?? accion.texto}
              className="min-h-11 shrink-0 rounded-full bg-[#1D5CF5] px-4 text-[14px] font-bold hover:bg-[#1747C4]">
              {accion.texto}
            </Button>
          ) : null}
        </div>
      ) : null}
      {aviso}
      {adjunto && permiso.puede ? <VistaAdjunto adjunto={adjunto} onQuitar={quitar} bloqueado={subiendo} /> : null}
      {subiendo ? <Avance progreso={progreso} onCancelar={() => control.current?.abort()} /> : null}
      <input ref={selector} type="file" accept={ACEPTAR_ARCHIVOS} className="hidden" tabIndex={-1} aria-hidden="true" data-selector-archivo
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) elegir(f); }} />
      {!permiso.puede ? null : grabadora.grabando ? (
        <BarraGrabacion segundos={grabadora.segundos} onCancelar={grabadora.cancelar} onDetener={grabadora.detener} />
      ) : (
        <div className="flex items-end gap-1.5 md:gap-2">
          {onEnviarAdjunto || ofrecer ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Más acciones" className={ICONO}><Plus className="size-5" aria-hidden="true" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="min-w-56">
              <DropdownMenuItem disabled={!sePuedeAdjuntar} onSelect={abrirSelector} className="min-h-11 gap-2 md:min-h-9">
                <Paperclip className="size-4" aria-hidden="true" /> Adjuntar archivo
              </DropdownMenuItem>
              {ofrecer ? (
                <DropdownMenuItem disabled={!ofrecer.disponible || ofrecer.cargando} onSelect={ofrecer.onOfrecer} className="min-h-11 gap-2 md:min-h-9">
                  <CalendarClock className="size-4 text-blue-600" aria-hidden="true" />
                  <span className="grid">
                    <span>Ofrecer horarios</span>
                    {!ofrecer.disponible && ofrecer.motivo ? <span className="text-[11.5px] text-gray-500">{ofrecer.motivo}</span> : null}
                  </span>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          ) : null}
          {onEnviarAdjunto ? (
            <button type="button" onClick={abrirSelector} disabled={!sePuedeAdjuntar} aria-label="Adjuntar archivo" className={`${ICONO} max-sm:hidden`}>
              <Paperclip className="size-5" aria-hidden="true" />
            </button>
          ) : null}
          <label className="min-w-0 flex-1">
            <span className="sr-only">{adjunto ? "Comentario del archivo" : "Mensaje"}</span>
            <textarea
              ref={area}
              rows={1}
              value={texto}
              disabled={!permiso.puede || subiendo}
              maxLength={limite}
              onChange={(e) => setTexto(e.target.value)}
              onPaste={alPegar}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  enviar();
                }
              }}
              placeholder={!permiso.puede ? "No puedes escribir en esta conversación" : adjunto ? "Agrega un comentario (opcional)" : "Escribe un mensaje"}
              className="block max-h-40 min-h-11 w-full resize-none rounded-lg border-0 bg-white px-3.5 py-2.5 text-base leading-snug text-[#111B21] outline-none placeholder:text-[#54656F] focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-100 md:text-[15px]"
            />
          </label>
          {onEnviarAdjunto ? (
            <button type="button" onClick={grabadora.iniciar} disabled={!sePuedeAdjuntar || !!adjunto} aria-label="Grabar nota de voz" className={ICONO}>
              <Mic className="size-5" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={enviar}
            disabled={!puedeEnviar}
            aria-label={adjunto ? "Enviar archivo" : "Enviar mensaje"}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-700 text-white transition-colors hover:bg-emerald-800 disabled:bg-[#D1D7DB] disabled:text-[#54656F]"
          >
            {ocupado ? <Loader2 className="size-5 animate-spin" /> : <SendHorizontal className="size-5" />}
          </button>
        </div>
      )}
      {permiso.puede ? (
        <p className="mt-1 flex justify-between gap-2 px-1 text-[11px] text-[#54656F]">
          <span className="hidden lg:inline">Enter para enviar · Shift + Enter para un salto de línea{onEnviarAdjunto ? " · Arrastra o pega un archivo para adjuntarlo" : ""}</span>
          {texto.length > limite - 600 ? <span className={texto.length >= limite ? "text-red-600" : ""}>{texto.length}/{limite}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
