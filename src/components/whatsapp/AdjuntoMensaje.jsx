"use client";

// Archivos dentro de las burbujas del chat (chat todo-en-uno; espejo de la burbuja de Lumo): imagen con visor, audio con
// velocidad y transcripción, video, documento (Abrir / Descargar), ubicación (enlace a Google Maps) y sticker.
// Los bytes se piden con el token en el encabezado (blob → URL local); nunca se pone el token en la URL.
import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle, Download, ExternalLink, FileSpreadsheet, FileText, File as FileIcon, Loader2, MapPin, Mic, Pause, Play, Presentation, RotateCw, Volume2, ZoomIn, ZoomOut,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  MENSAJE_DESCARGA_FALLIDA, coordenadas, formatearDuracion, formatearTamano, infoDocumento, nombreDescarga, rutaAdjuntoSegura, rutaDescarga,
  siguienteVelocidad, textoVelocidad,
} from "@/lib/whatsapp/adjuntos.mjs";
import { descargarAdjunto } from "./api";

// ——— Caché de URLs locales (blob) por ruta: se reusa al volver a la conversación; las más viejas se liberan ———
const CACHE = new Map();
const LIMITE_CACHE = 60;
function cargarBlob(ruta) {
  const previa = CACHE.get(ruta);
  if (previa) {
    CACHE.delete(ruta);
    CACHE.set(ruta, previa);
    return previa.promesa;
  }
  const entrada = {};
  entrada.promesa = descargarAdjunto(ruta).then((blob) => {
    entrada.url = URL.createObjectURL(blob);
    return entrada.url;
  });
  entrada.promesa.catch(() => CACHE.delete(ruta));
  CACHE.set(ruta, entrada);
  while (CACHE.size > LIMITE_CACHE) {
    const [clave, vieja] = CACHE.entries().next().value;
    CACHE.delete(clave);
    if (vieja.url) URL.revokeObjectURL(vieja.url);
  }
  return entrada.promesa;
}

// URL local del adjunto cuando `activo` (visible, o el usuario pidió reproducir).
function useArchivo(adjunto, activo) {
  const ruta = adjunto?.estado === "listo" ? rutaAdjuntoSegura(adjunto.url) : null;
  const [estado, setEstado] = useState(() => ({ url: (ruta && CACHE.get(ruta)?.url) || null, error: false }));
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (!ruta || !activo) return undefined;
    let vivo = true;
    cargarBlob(ruta).then((url) => vivo && setEstado({ url, error: false })).catch(() => vivo && setEstado({ url: null, error: true }));
    return () => { vivo = false; };
  }, [ruta, activo, intento]);
  return { ...estado, ruta, cargando: !!ruta && activo && !estado.url && !estado.error, reintentar: () => { setEstado({ url: null, error: false }); setIntento((i) => i + 1); } };
}

// Visible en pantalla (o cerca): las miniaturas se piden solo cuando hacen falta.
function useVisible() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return undefined;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return undefined; }
    // Raíz = el contenedor con scroll del hilo (si no, el recorte del contenedor impide que el margen anticipe la carga).
    const obs = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) setVisible(true); },
      { root: el.closest("[data-hilo-scroll]"), rootMargin: "400px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);
  return [ref, visible];
}

// Descarga con ?descargar=1 (como adjunto) y la guarda con su nombre.
async function guardarArchivo(adjunto) {
  const ruta = rutaDescarga(adjunto?.url);
  if (!ruta) throw new Error("ruta no válida");
  const blob = await descargarAdjunto(ruta);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreDescarga(adjunto);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60 md:min-h-9";

function BotonDescargar({ adjunto, etiqueta = "Descargar", className = BOTON }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(false);
  const descargar = async () => {
    setOcupado(true);
    setError(false);
    try { await guardarArchivo(adjunto); } catch { setError(true); } finally { setOcupado(false); }
  };
  return (
    <>
      <button type="button" onClick={descargar} disabled={ocupado} aria-label={adjunto?.nombre ? `${etiqueta} ${adjunto.nombre}` : etiqueta} className={className}>
        {ocupado ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />} {etiqueta}
      </button>
      {error ? <span role="alert" className="basis-full text-[12px] font-medium text-red-700">{MENSAJE_DESCARGA_FALLIDA}</span> : null}
    </>
  );
}

function EstadoArchivo({ tipo, onReintentar }) {
  if (tipo === "descargando") {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2.5 text-[13px] text-gray-600" data-adjunto-estado="descargando">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Descargando…
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800" data-adjunto-estado="fallido">
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{MENSAJE_DESCARGA_FALLIDA}</span>
      {onReintentar ? (
        <button type="button" onClick={onReintentar} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 text-[12px] font-semibold md:min-h-8">
          <RotateCw className="size-3.5" aria-hidden="true" /> Reintentar
        </button>
      ) : null}
    </div>
  );
}

// ——— Imagen y visor ———
const ZOOMS = [1, 1.5, 2, 3];
function Visor({ abierto, onCambiar, adjunto, url }) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => { if (abierto) setZoom(1); }, [abierto]);
  const cambiar = (d) => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(z) + d))]);
  const nombre = adjunto?.nombre || "Imagen";
  return (
    <Dialog open={abierto} onOpenChange={onCambiar}>
      <DialogContent
        onKeyDown={(e) => { if (e.key === "+" || e.key === "=") { e.preventDefault(); cambiar(1); } if (e.key === "-") { e.preventDefault(); cambiar(-1); } }}
        className="flex h-[100dvh] max-h-none! w-screen max-w-none! flex-col gap-0 rounded-none border-0 bg-black/95 p-0 text-white sm:max-w-none [&>button:last-child]:top-2 [&>button:last-child]:right-2 [&>button:last-child]:grid [&>button:last-child]:size-11 [&>button:last-child]:place-items-center [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/10 [&>button:last-child]:text-white [&>button:last-child]:opacity-100"
        data-visor-imagen>
        <div className="flex items-center gap-2 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] pr-16">
          <DialogTitle className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">{nombre}</DialogTitle>
          <DialogDescription className="sr-only">Usa + y − para acercar o alejar.</DialogDescription>
          <button type="button" onClick={() => cambiar(-1)} disabled={zoom === ZOOMS[0]} aria-label="Alejar" className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40">
            <ZoomOut className="size-5" aria-hidden="true" />
          </button>
          <span className="w-11 text-center text-[12px] tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => cambiar(1)} disabled={zoom === ZOOMS.at(-1)} aria-label="Acercar" className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40">
            <ZoomIn className="size-5" aria-hidden="true" />
          </button>
          <BotonDescargar adjunto={adjunto} etiqueta="Descargar" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-semibold hover:bg-white/20 disabled:opacity-60" />
        </div>
        <div className="min-h-0 flex-1 overflow-auto pb-[env(safe-area-inset-bottom)]">
          <div className="grid min-h-full min-w-full place-items-center p-2" style={{ width: zoom > 1 ? `${zoom * 100}%` : undefined }}>
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={nombre} draggable={false} onDoubleClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
                className={zoom > 1 ? "max-w-none select-none" : "max-h-[calc(100dvh-5rem)] max-w-full select-none object-contain"} style={zoom > 1 ? { width: "100%" } : undefined} />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Imagen({ adjunto, sticker = false }) {
  const [ref, visible] = useVisible();
  const { url, error, reintentar } = useArchivo(adjunto, visible);
  const [abierto, setAbierto] = useState(false);
  const nombre = adjunto?.nombre || (sticker ? "Sticker" : "Imagen");
  if (error) return <EstadoArchivo tipo="fallido" onReintentar={reintentar} />;
  const caja = sticker ? "size-32" : "h-48 w-60 max-w-full";
  if (!url) return <div ref={ref} className={`${caja} animate-pulse rounded-lg bg-black/10`} role="img" aria-label={`Cargando ${nombre}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  if (sticker) return <img src={url} alt={nombre} className="size-32 object-contain" data-sticker />;
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} aria-label={`Ver imagen ${adjunto?.nombre || ""}`.trim()}
        className="block overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={nombre} className="max-h-64 w-auto max-w-full object-contain" data-miniatura />
      </button>
      <Visor abierto={abierto} onCambiar={setAbierto} adjunto={adjunto} url={url} />
    </>
  );
}

// ——— Audio ———
function Audio({ adjunto }) {
  const [pedido, setPedido] = useState(false);
  const { url, error, cargando, reintentar } = useArchivo(adjunto, pedido);
  const audio = useRef(null);
  const quiereSonar = useRef(false);
  const [sonando, setSonando] = useState(false);
  const [posicion, setPosicion] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [velocidad, setVelocidad] = useState(1);
  const [verTexto, setVerTexto] = useState(false);
  const idTexto = useId();
  const transcripcion = String(adjunto?.transcripcion ?? "").trim();
  useEffect(() => {
    const el = audio.current;
    if (url && el && quiereSonar.current) { quiereSonar.current = false; el.play().catch(() => {}); }
  }, [url]);
  useEffect(() => { if (audio.current) audio.current.playbackRate = velocidad; }, [velocidad, url]);
  const alternar = () => {
    const el = audio.current;
    if (!url) { quiereSonar.current = true; setPedido(true); return; }
    if (el.paused) el.play().catch(() => {}); else el.pause();
  };
  const leerDuracion = (el) => {
    if (Number.isFinite(el.duration)) setDuracion(el.duration);
    else { // webm grabado en navegador: la duración llega como Infinity hasta recorrerlo
      const corregir = () => { el.removeEventListener("timeupdate", corregir); if (Number.isFinite(el.duration)) setDuracion(el.duration); el.currentTime = 0; };
      el.addEventListener("timeupdate", corregir);
      el.currentTime = 1e101;
    }
  };
  const etiqueta = adjunto?.nota_voz ? "Nota de voz" : "Audio";
  return (
    <div className="grid w-64 max-w-full gap-1.5" data-audio>
      <p className="flex items-center gap-1 text-[11.5px] font-semibold text-gray-600">
        {adjunto?.nota_voz ? <Mic className="size-3.5" aria-hidden="true" /> : <Volume2 className="size-3.5" aria-hidden="true" />} {etiqueta}
      </p>
      {error ? <EstadoArchivo tipo="fallido" onReintentar={reintentar} /> : (
        <div className="flex items-center gap-2">
          <button type="button" onClick={alternar} aria-label={sonando ? `Pausar ${etiqueta.toLowerCase()}` : `Reproducir ${etiqueta.toLowerCase()}`}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
            {cargando ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : sonando ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5 translate-x-px" aria-hidden="true" />}
          </button>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <input type="range" min={0} max={duracion || 1} step={0.1} value={Math.min(posicion, duracion || 1)} disabled={!url || !duracion}
              onChange={(e) => { if (audio.current) audio.current.currentTime = Number(e.target.value); setPosicion(Number(e.target.value)); }}
              aria-label={`Posición de la ${etiqueta.toLowerCase()}`} aria-valuetext={`${formatearDuracion(posicion)} de ${formatearDuracion(duracion)}`}
              className="h-6 w-full min-w-0 cursor-pointer accent-emerald-600" />
            <span className="text-[11px] tabular-nums text-gray-500" data-tiempo-audio>{formatearDuracion(posicion)}{duracion ? ` / ${formatearDuracion(duracion)}` : ""}</span>
          </div>
          <button type="button" onClick={() => setVelocidad(siguienteVelocidad)} aria-label={`Velocidad ${textoVelocidad(velocidad)}`}
            className="min-h-11 min-w-11 shrink-0 rounded-full bg-black/5 px-2.5 text-[12px] font-bold tabular-nums text-gray-700 hover:bg-black/10 md:min-h-8">
            {textoVelocidad(velocidad)}
          </button>
          {url ? (
            <audio ref={audio} src={url} preload="metadata" className="hidden"
              onLoadedMetadata={(e) => leerDuracion(e.currentTarget)} onTimeUpdate={(e) => setPosicion(e.currentTarget.currentTime)}
              onPlay={() => setSonando(true)} onPause={() => setSonando(false)} onEnded={() => { setSonando(false); setPosicion(0); }} />
          ) : null}
        </div>
      )}
      {transcripcion ? (
        <div className="grid gap-1">
          <button type="button" onClick={() => setVerTexto((v) => !v)} aria-expanded={verTexto} aria-controls={idTexto}
            className="inline-flex min-h-11 w-fit items-center gap-1 text-[12px] font-semibold text-blue-700 hover:underline md:min-h-7">
            {verTexto ? "Ocultar transcripción" : "Transcripción"}
          </button>
          <p id={idTexto} hidden={!verTexto} className="whitespace-pre-wrap rounded-md bg-black/5 px-2 py-1.5 text-[13px] italic leading-snug text-gray-700 [overflow-wrap:anywhere]" data-transcripcion>
            {transcripcion}
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ——— Video ———
function Video({ adjunto }) {
  const [pedido, setPedido] = useState(false);
  const { url, error, cargando, reintentar } = useArchivo(adjunto, pedido);
  if (error) return <EstadoArchivo tipo="fallido" onReintentar={reintentar} />;
  if (!url) {
    return (
      <button type="button" onClick={() => setPedido(true)} aria-label={`Reproducir video ${adjunto?.nombre || ""}`.trim()}
        className="grid aspect-video w-64 max-w-full place-items-center rounded-lg bg-gray-900 text-white">
        <span className="grid size-12 place-items-center rounded-full bg-white/20">
          {cargando ? <Loader2 className="size-6 animate-spin" aria-hidden="true" /> : <Play className="size-6 translate-x-px" aria-hidden="true" />}
        </span>
        <span className="sr-only">{adjunto?.tamano ? formatearTamano(adjunto.tamano) : ""}</span>
      </button>
    );
  }
  return <video src={url} controls autoPlay playsInline className="max-h-72 w-64 max-w-full rounded-lg bg-black" data-video />;
}

// ——— Documento ———
const ICONOS_DOC = {
  pdf: { Icono: FileText, color: "bg-red-50 text-red-600" },
  word: { Icono: FileText, color: "bg-blue-50 text-blue-700" },
  excel: { Icono: FileSpreadsheet, color: "bg-emerald-50 text-emerald-700" },
  ppt: { Icono: Presentation, color: "bg-orange-50 text-orange-600" },
  archivo: { Icono: FileIcon, color: "bg-gray-100 text-gray-600" },
};
function Documento({ adjunto }) {
  const info = infoDocumento(adjunto?.mime, adjunto?.nombre);
  const { Icono, color } = ICONOS_DOC[info.icono];
  const [error, setError] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const ruta = rutaAdjuntoSegura(adjunto?.url);
  // La ventana se abre en el clic (si no, el navegador la bloquea) y recibe la URL local cuando llegan los bytes.
  const abrir = async () => {
    setError(false);
    setAbriendo(true);
    const ventana = window.open("", "_blank");
    try {
      const url = await cargarBlob(ruta);
      if (ventana) ventana.location.href = url;
      else await guardarArchivo(adjunto);
    } catch {
      ventana?.close();
      setError(true);
    } finally {
      setAbriendo(false);
    }
  };
  const nombre = adjunto?.nombre || info.etiqueta;
  return (
    <div className="grid w-72 max-w-full gap-2 rounded-xl border border-black/10 bg-white/70 p-2.5" data-documento>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${color}`} aria-hidden="true"><Icono className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-gray-900" title={nombre}>{nombre}</p>
          <p className="text-[11.5px] text-gray-500">{info.etiqueta}{adjunto?.tamano ? ` · ${formatearTamano(adjunto.tamano)}` : ""}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={abrir} disabled={!ruta || abriendo} aria-label={`Abrir ${nombre}`} className={`${BOTON} flex-1`}>
          {abriendo ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ExternalLink className="size-4" aria-hidden="true" />} Abrir
        </button>
        <BotonDescargar adjunto={adjunto} className={`${BOTON} flex-1`} />
        {error ? <span role="alert" className="basis-full text-[12px] font-medium text-red-700">{MENSAJE_DESCARGA_FALLIDA}</span> : null}
      </div>
    </div>
  );
}

// ——— Ubicación (sin mapa incrustado) ———
function Ubicacion({ adjunto }) {
  const c = coordenadas(adjunto?.lat, adjunto?.lng);
  return (
    <div className="grid w-64 max-w-full gap-1.5 rounded-xl border border-black/10 bg-white/70 p-2.5" data-ubicacion>
      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-gray-900">
        <span className="grid size-9 place-items-center rounded-lg bg-red-50 text-red-600" aria-hidden="true"><MapPin className="size-5" /></span>
        {adjunto?.nombre || "Ubicación"}
      </p>
      {c ? (
        <>
          <p className="text-[12px] tabular-nums text-gray-600">{c.texto}</p>
          <a href={c.enlace} target="_blank" rel="noopener noreferrer" className={`${BOTON} text-blue-700`}>
            <ExternalLink className="size-4" aria-hidden="true" /> Abrir en Google Maps
          </a>
        </>
      ) : <p className="text-[12px] text-gray-500">La ubicación llegó sin coordenadas.</p>}
    </div>
  );
}

// Adjunto de un mensaje. Desconocidos se tratan como documento (se pueden descargar).
export default function AdjuntoMensaje({ adjunto }) {
  if (!adjunto) return null;
  if (adjunto.tipo === "ubicacion") return <Ubicacion adjunto={adjunto} />;
  if (adjunto.estado === "descargando" || adjunto.estado === "fallido") return <EstadoArchivo tipo={adjunto.estado} />;
  if (adjunto.tipo === "imagen") return <Imagen adjunto={adjunto} />;
  if (adjunto.tipo === "sticker") return <Imagen adjunto={adjunto} sticker />;
  if (adjunto.tipo === "audio") return <Audio adjunto={adjunto} />;
  if (adjunto.tipo === "video") return <Video adjunto={adjunto} />;
  return <Documento adjunto={adjunto} />;
}
