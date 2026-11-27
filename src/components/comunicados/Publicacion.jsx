"use client";
// Una publicación del muro (maquetas «AppFeed», «AppDetalle» y «Comentarios», aprobadas 27/11/2026): autor, texto (como
// texto), mosaico de fotos con visor (carrusel con deslizar y flechas), video de YouTube incrustado sin cookies que se
// carga solo al tocarlo, tarjeta del PDF, «Me gusta» y comentarios. Pensada primero para teléfono (390 px).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as D from "@radix-ui/react-dialog";
import { CalendarDays, ChevronLeft, ChevronRight, FileText, MessageCircle, Pin, Play, ThumbsUp, X } from "lucide-react";
import {
  fechaEvento, fotosDe, lineaAutor, mosaico, pdfDe, porConfirmar, rutaPost, textoComentarios, textoReacciones, urlEmbed, urlMiniatura,
} from "@/lib/comunicados/comunicados.mjs";
import { Avatar, TextoPlano } from "./comun";

/** Visor de fotos a pantalla completa: flechas, deslizar, teclado y «Foto 1 de 7». */
export function Visor({ fotos, inicio, alCerrar }) {
  const [i, setI] = useState(inicio ?? 0);
  const x0 = useRef(null);
  const n = fotos.length;
  useEffect(() => { setI(inicio ?? 0); }, [inicio]);
  const ir = (d) => setI((v) => (v + d + n) % n);
  if (inicio == null || !n) return null;
  const foto = fotos[i];
  return (
    <D.Root open onOpenChange={(o) => !o && alCerrar()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[70] bg-black/90" />
        <D.Content className="fixed inset-0 z-[71] flex flex-col text-white outline-none" data-visor
          onKeyDown={(e) => { if (e.key === "ArrowRight") ir(1); if (e.key === "ArrowLeft") ir(-1); }}>
          <div className="flex items-center justify-between gap-3 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <D.Title className="text-sm font-semibold" data-visor-cuenta>Foto {i + 1} de {n}</D.Title>
            <D.Description className="sr-only">Desliza o usa las flechas para ver las demás fotos.</D.Description>
            <D.Close aria-label="Cerrar fotos" className="grid size-11 place-items-center rounded-full hover:bg-white/10"><X className="size-6" aria-hidden="true" /></D.Close>
          </div>
          <div className="relative flex min-h-0 flex-1 touch-pan-y select-none items-center justify-center"
            onPointerDown={(e) => { x0.current = e.clientX; }}
            onPointerUp={(e) => { if (x0.current == null) return; const dx = e.clientX - x0.current; x0.current = null; if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1); }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de S3 */}
            <img src={foto.url} alt={foto.nombre || `Foto ${i + 1}`} className="max-h-full max-w-full object-contain" draggable={false} />
            {n > 1 ? (
              <>
                <button type="button" aria-label="Foto anterior" onClick={() => ir(-1)} className="absolute left-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/50 hover:bg-black/70"><ChevronLeft className="size-6" aria-hidden="true" /></button>
                <button type="button" aria-label="Foto siguiente" onClick={() => ir(1)} className="absolute right-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/50 hover:bg-black/70"><ChevronRight className="size-6" aria-hidden="true" /></button>
              </>
            ) : null}
          </div>
          <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]" />
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function Mosaico({ fotos, alAbrir }) {
  const { visibles, resto, clase } = mosaico(fotos.length);
  if (!visibles) return null;
  const rejilla = { uno: "grid-cols-1", dos: "grid-cols-2", tres: "grid-cols-2 grid-rows-2", cuatro: "grid-cols-2 grid-rows-2" }[clase];
  return (
    <div className={`grid gap-1 overflow-hidden rounded-xl ${rejilla} ${clase === "uno" ? "" : "aspect-[4/3]"}`} data-mosaico={fotos.length}>
      {fotos.slice(0, visibles).map((f, i) => {
        const ultima = i === visibles - 1 && resto > 0;
        return (
          <button key={f.id ?? i} type="button" onClick={() => alAbrir(i)} aria-label={ultima ? `Ver ${resto} fotos más` : `Ver foto ${i + 1} de ${fotos.length}`}
            className={`relative min-h-11 overflow-hidden bg-slate-100 ${clase === "tres" && i === 0 ? "row-span-2" : ""} ${clase === "uno" ? "max-h-[420px]" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de S3 */}
            <img src={f.url} alt="" loading="lazy" className={`size-full object-cover ${clase === "uno" ? "max-h-[420px]" : ""}`} />
            {ultima ? <span className="absolute inset-0 grid place-items-center bg-black/45 text-2xl font-extrabold text-white" aria-hidden="true">+{resto}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** YouTube sin cookies; no se carga nada de YouTube hasta tocar «Reproducir». */
export function VideoYoutube({ id }) {
  const [activo, setActivo] = useState(false);
  const src = urlEmbed(id);
  if (!src) return null;
  if (activo) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black" data-youtube={id}>
        <iframe src={`${src}&autoplay=1`} title="Video de YouTube" className="size-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setActivo(true)} className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-slate-900" data-youtube-portada={id} aria-label="Reproducir video de YouTube aquí mismo">
      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura pública de YouTube */}
      <img src={urlMiniatura(id)} alt="" loading="lazy" className="size-full object-cover opacity-90" />
      <span className="absolute inset-0 grid place-items-center"><span className="grid size-16 place-items-center rounded-full bg-red-600 text-white shadow-lg group-hover:bg-red-700"><Play className="ml-1 size-7 fill-white" aria-hidden="true" /></span></span>
      <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[13px] font-semibold text-white">Video de YouTube · se ve aquí mismo</span>
    </button>
  );
}

export function TarjetaPdf({ pdf }) {
  if (!pdf) return null;
  return (
    <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100" data-pdf>
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700"><FileText className="size-5" aria-hidden="true" /></span>
      <span className="min-w-0"><span className="block truncate text-[15px] font-semibold text-slate-900">{pdf.nombre || "documento.pdf"}</span><span className="block text-[13px] text-slate-600">PDF · toca para leer</span></span>
    </a>
  );
}

/**
 * Tarjeta del muro. completo: en el detalle (texto entero y sin enlace al detalle).
 * alMeGusta(it): alterna el me gusta (optimista, lo maneja el padre).
 */
export default function Publicacion({ it, tz, completo = false, alMeGusta, ocupado = false }) {
  const [visor, setVisor] = useState(null);
  const fotos = fotosDe(it);
  const pdf = pdfDe(it);
  const largo = !completo && String(it.cuerpo ?? "").length > 280;
  const reacciones = textoReacciones(it.reacciones, it.me_gusta);
  const comentarios = textoComentarios(it.comentarios);
  const pendiente = porConfirmar(it);
  const autor = it.autor?.nombre || "Recursos Humanos";
  return (
    <article className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4" data-post={it.id} aria-labelledby={`post-${it.id}-titulo`}>
      <header className="flex items-start gap-3">
        <Avatar nombre={autor} grande />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight text-slate-900">{autor}{it.autor?.rol && it.autor.rol !== autor ? <span className="font-normal text-slate-600"> · {it.autor.rol}</span> : null}</p>
          <p className="text-[13px] text-slate-600">{lineaAutor(it, { tz })}</p>
        </div>
        {it.fijado ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[13px] font-semibold text-blue-800"><Pin className="size-3.5" aria-hidden="true" />Fijada</span> : null}
      </header>
      {pendiente ? <p className="w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-[13px] font-bold text-amber-900">Requiere tu confirmación</p> : null}
      {it.titulo ? (
        completo ? <h1 id={`post-${it.id}-titulo`} className="break-words text-xl font-extrabold leading-tight text-slate-900">{it.titulo}</h1>
          : <h2 id={`post-${it.id}-titulo`} className="break-words text-[17px] font-extrabold leading-snug text-slate-900"><Link href={rutaPost(it.id)} className="inline-flex min-h-11 items-center hover:underline">{it.titulo}</Link></h2>
      ) : <span id={`post-${it.id}-titulo`} className="sr-only">Publicación de {autor}</span>}
      {it.fecha_evento ? <p className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays className="size-4 text-[#2563EB]" aria-hidden="true" />{fechaEvento(it.fecha_evento, { tz })}</p> : null}
      {it.cuerpo ? <TextoPlano className={`text-[15px] leading-relaxed text-slate-800 ${largo ? "line-clamp-5" : ""}`}>{it.cuerpo}</TextoPlano> : null}
      {largo ? <Link href={rutaPost(it.id)} className="-mt-2 inline-flex min-h-11 w-fit items-center text-sm font-semibold text-[#2563EB]">Ver más</Link> : null}
      <Mosaico fotos={fotos} alAbrir={setVisor} />
      {it.youtube_id ? <VideoYoutube id={it.youtube_id} /> : null}
      <TarjetaPdf pdf={pdf} />
      {pendiente && !completo ? <Link href={rutaPost(it.id)} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-[15px] font-bold text-white">Leer y confirmar</Link> : null}
      {reacciones || comentarios ? (
        <p className="flex items-center justify-between gap-3 text-[13px] text-slate-600" data-conteos>
          <span data-reacciones>{reacciones}</span>
          {comentarios ? (completo ? <span>{comentarios}</span> : <Link href={`${rutaPost(it.id)}#comentarios`} className="-my-3 inline-flex min-h-11 items-center hover:underline">{comentarios}</Link>) : null}
        </p>
      ) : null}
      {it.permite_reacciones !== false || it.permite_comentarios !== false ? (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
          {it.permite_reacciones !== false ? (
            <button type="button" aria-pressed={Boolean(it.me_gusta)} disabled={ocupado} onClick={() => alMeGusta?.(it)} data-me-gusta={it.me_gusta ? "si" : "no"}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold hover:bg-slate-50 ${it.me_gusta ? "text-[#2563EB]" : "text-slate-700"}`}>
              <ThumbsUp className={`size-5 ${it.me_gusta ? "fill-[#2563EB]/20" : ""}`} aria-hidden="true" />Me gusta
            </button>
          ) : <span />}
          {it.permite_comentarios !== false ? (
            completo
              ? <a href="#nuevo-comentario" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-slate-700 hover:bg-slate-50"><MessageCircle className="size-5" aria-hidden="true" />Comentar</a>
              : <Link href={`${rutaPost(it.id)}#comentarios`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-slate-700 hover:bg-slate-50"><MessageCircle className="size-5" aria-hidden="true" />Comentar</Link>
          ) : null}
        </div>
      ) : null}
      <Visor fotos={fotos} inicio={visor} alCerrar={() => setVisor(null)} />
    </article>
  );
}
