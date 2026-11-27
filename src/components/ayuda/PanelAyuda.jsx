"use client";
// Centro de ayuda dentro del sistema · panel lateral que abre el botón «?» (y las guías de «Ayuda»). Muestra la guía de
// la pantalla actual (la regla está en src/lib/ayuda/pantallas.mjs) sin salir de ella; si la pantalla no tiene guía,
// abre el buscador con las guías de la sesión. Las guías se leen de /ayuda/indice.json y /ayuda/<guia>/contenido.json
// (archivos estáticos del mismo sitio, sin backend).
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, CircleHelp, ExternalLink, Search } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { buscar, prepararGuia } from "@/lib/ayuda/buscar.mjs";
import { guiasDePantalla } from "@/lib/ayuda/pantallas.mjs";
import { rutaDeInstancia } from "@/lib/demo-base-path.mjs";
import Markdown from "./Markdown";
import { useLeidas } from "./PublicoCliente";
import { filtrarIndice, useSesionAyuda } from "./useSesionAyuda";
import { useContenidoGuia, useIndiceAyuda } from "./useIndiceAyuda";
import "./ayuda.css";

const PREFIJO = "ayuda-";

function Resultado({ g, alAbrir, seccion = null }) {
  return (
    <li>
      <button type="button" onClick={() => alAbrir(g.slug, seccion?.id ?? null)} data-resultado-ayuda={g.slug}
        className="flex min-h-12 w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none">
        <span className="text-[15px] font-semibold text-[#080d36]">{g.titulo}</span>
        <span className="line-clamp-2 text-[13px] text-slate-600">{g.resumen}</span>
        <span className="text-[13px] text-slate-500">{g.nombreCarpeta}{seccion ? ` · ${seccion.texto}` : ""}</span>
      </button>
    </li>
  );
}

function VistaGuia({ slug, ancla, alAbrirGuia, leida, alMarcar }) {
  const { guia, error, cargando, reintentar } = useContenidoGuia(slug);
  const caja = useRef(null);
  useEffect(() => {
    if (!guia) return;
    const destino = ancla ? caja.current?.querySelector(`#${CSS.escape(`${PREFIJO}${ancla}`)}`) : null;
    if (destino) destino.scrollIntoView({ block: "start" });
    else caja.current?.closest("[data-panel-scroll]")?.scrollTo({ top: 0 });
  }, [guia, ancla]);
  if (cargando && !guia) return <p role="status" className="p-5 text-sm text-slate-500">Cargando la guía…</p>;
  if (error || !guia) return <p role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">No pudimos cargar la guía. <button type="button" className="font-semibold underline" onClick={() => reintentar()}>Reintentar</button></p>;
  return (
    <article ref={caja} className="grid gap-4 px-5 pb-8 pt-4" data-guia-abierta={slug}>
      <header className="grid gap-1.5">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-violet-700">{guia.nombreCarpeta}</span>
        <h2 className="text-xl font-extrabold leading-tight text-[#080d36]">{guia.titulo}</h2>
        <p className="text-[15px] text-slate-600">{guia.resumen}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <a href={rutaDeInstancia(guia.url)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-abrir-pestana>
            <ExternalLink className="size-4" aria-hidden="true" />Abrir en otra pestaña<span className="sr-only"> (para imprimir o guardar PDF)</span>
          </a>
          <button type="button" onClick={() => alMarcar(!leida)} aria-pressed={leida} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold ${leida ? "border-green-300 bg-green-50 text-green-800" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`} data-marcar-leida>
            <Check className="size-4" aria-hidden="true" />{leida ? "Leída" : "Marcar como leída"}
          </button>
        </div>
      </header>
      <Markdown bloques={guia.bloques} prefijo={PREFIJO} alAbrirGuia={alAbrirGuia} className="ay-md-panel" />
    </article>
  );
}

/**
 * abierto / alCambiar: control del panel. pathname: la pantalla desde la que se abrió (para elegir la guía).
 * pedido: { slug, ancla } para abrir una guía concreta (desde «Ayuda»); sin él, la guía de la pantalla.
 */
export default function PanelAyuda({ abierto, alCambiar, pathname, pedido = null }) {
  const { filtro, rutaCentro } = useSesionAyuda();
  const { indice, error, cargando, reintentar } = useIndiceAyuda(abierto);
  const { guias } = useMemo(() => filtrarIndice(indice, filtro), [indice, filtro]);
  const todas = useMemo(() => filtrarIndice(indice, filtro, { todas: true }).guias, [indice, filtro]);
  const deEsta = useMemo(() => guiasDePantalla(todas, pathname), [todas, pathname]);
  const preparadas = useMemo(() => todas.map(prepararGuia), [todas]);
  const [pila, setPila] = useState([]); // [{ slug, ancla }]
  const [q, setQ] = useState("");
  const { marcadas, marcar } = useLeidas();
  const iniciado = useRef(false);

  // Al abrir: la guía pedida, la de esta pantalla o el buscador.
  useEffect(() => {
    if (!abierto) { iniciado.current = false; return; }
    if (iniciado.current || !indice) return;
    iniciado.current = true;
    setQ("");
    if (pedido?.slug) setPila([{ slug: pedido.slug, ancla: pedido.ancla ?? null }]);
    else setPila(deEsta[0] ? [{ slug: deEsta[0].slug, ancla: null }] : []);
  }, [abierto, indice, pedido, deEsta]);

  const actual = pila.at(-1) ?? null;
  const abrir = (slug, ancla = null) => { setQ(""); setPila((p) => [...p, { slug, ancla }]); };
  const volver = () => setPila((p) => p.slice(0, -1));
  const resultados = q.trim().length >= 2 ? buscar(preparadas, q, { limite: 12 }) : [];
  const otrasDeEsta = deEsta.filter((g) => g.slug !== actual?.slug).slice(0, 4);

  return (
    <Sheet open={abierto} onOpenChange={alCambiar}>
      <SheetContent side="right" className="ay-panel flex w-full flex-col gap-0 bg-white p-0 sm:max-w-[560px]" data-panel-ayuda>
        <div className="flex items-start gap-3 border-b border-slate-200 px-4 py-3 pr-12">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#2563EB] text-white"><CircleHelp className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-base font-extrabold text-[#080d36]">Ayuda</SheetTitle>
            <SheetDescription className="text-[13px] text-slate-500">{actual ? "Guía paso a paso" : deEsta.length ? "Guías de esta pantalla" : "Busca cómo hacer algo"}</SheetDescription>
          </div>
        </div>
        <div className="grid gap-2 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            {actual && pila.length > 1 ? <button type="button" onClick={volver} aria-label="Volver" className="grid size-11 shrink-0 place-items-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"><ArrowLeft className="size-4" aria-hidden="true" /></button> : null}
            {actual && pila.length === 1 ? <button type="button" onClick={() => setPila([])} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-ver-lista><Search className="size-4" aria-hidden="true" />Buscar</button> : null}
            {!actual ? (
              <div className="relative flex-1">
                <label htmlFor="panel-ayuda-q" className="sr-only">Busca en la ayuda</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="panel-ayuda-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" placeholder="¿Qué quieres hacer?" data-buscar-ayuda
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-base text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 sm:text-sm" />
              </div>
            ) : <span className="min-w-0 flex-1" />}
            <Link href={rutaCentro} onClick={() => alCambiar(false)} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-[#2563EB] hover:bg-blue-50" data-centro-ayuda>
              <BookOpen className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Todas las guías</span><span className="sm:hidden">Guías</span>
            </Link>
          </div>
          {actual && otrasDeEsta.length ? (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-slate-600">
              <span>También en esta pantalla:</span>
              {otrasDeEsta.map((g) => <button key={g.slug} type="button" onClick={() => setPila([{ slug: g.slug, ancla: null }])} className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-3 font-semibold text-slate-700 hover:border-[#2563EB] hover:text-[#2563EB]">{g.titulo}</button>)}
            </div>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" data-panel-scroll>
          {error ? <p role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">No pudimos cargar la ayuda. <button type="button" className="font-semibold underline" onClick={() => reintentar()}>Reintentar</button></p>
            : cargando && !indice ? <p role="status" className="p-5 text-sm text-slate-500">Cargando la ayuda…</p>
              : actual ? <VistaGuia key={`${actual.slug}#${actual.ancla ?? ""}`} slug={actual.slug} ancla={actual.ancla} alAbrirGuia={abrir} leida={Boolean(marcadas[actual.slug])} alMarcar={(v) => marcar(actual.slug, v)} />
                : (
                  <div className="grid gap-3 p-3" aria-live="polite">
                    {q.trim().length >= 2 ? (
                      resultados.length ? <ul className="grid gap-0.5">{resultados.map((r) => <Resultado key={r.g.slug} g={r.g} seccion={r.seccion} alAbrir={abrir} />)}</ul>
                        : <p className="p-3 text-sm text-slate-600">No encontramos guías con «{q.trim()}». Prueba con el nombre del botón o de la pantalla.</p>
                    ) : (
                      <>
                        {deEsta.length ? <><h3 className="px-3 pt-1 text-[13px] font-bold uppercase tracking-wide text-slate-500">De esta pantalla</h3><ul className="grid gap-0.5">{deEsta.map((g) => <Resultado key={g.slug} g={g} alAbrir={abrir} />)}</ul></>
                          : <p className="px-3 pt-1 text-sm text-slate-600">Esta pantalla aún no tiene una guía propia. Busca arriba o revisa estas:</p>}
                        <h3 className="px-3 pt-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">Para ti</h3>
                        <ul className="grid gap-0.5">{guias.filter((g) => !deEsta.includes(g)).slice(0, 8).map((g) => <Resultado key={g.slug} g={g} alAbrir={abrir} />)}</ul>
                      </>
                    )}
                  </div>
                )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
