"use client";
// «Ayuda» dentro del sistema (/panel/ayuda y /empleado/panel/ayuda): las mismas guías del Centro de ayuda público,
// filtradas por la audiencia de la sesión (RH, dueño, empleado, jefe) y por los módulos encendidos de su empresa, con
// buscador, rutas de capacitación con avance y la opción de ver todas. Cada guía se abre en el panel lateral (BotonAyuda).
import { useMemo, useState } from "react";
import { BookOpen, ChevronRight, CircleHelp, ExternalLink, GraduationCap, Search } from "lucide-react";
import { buscar, prepararGuia } from "@/lib/ayuda/buscar.mjs";
import { avanceRuta } from "@/lib/ayuda/progreso.mjs";
import { rutaDeInstancia } from "@/lib/demo-base-path.mjs";
import { abrirAyuda } from "./BotonAyuda";
import { useLeidas } from "./PublicoCliente";
import { filtrarIndice, useSesionAyuda } from "./useSesionAyuda";
import { useIndiceAyuda } from "./useIndiceAyuda";

const QUIEN = { rh: "RH", dueno: "Dueño", jefe: "Jefe", empleado: "Empleado" };

function FilaGuia({ g, leida, seccion = null }) {
  return (
    <li>
      <button type="button" onClick={() => abrirAyuda(g.slug, seccion?.id ?? null)} data-guia-app={g.slug}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-[#080d36]">{g.titulo}</span>
          <span className="block text-[13px] text-slate-600">{seccion ? `${seccion.texto} · ` : ""}{g.resumen}</span>
        </span>
        {leida ? <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[13px] font-semibold text-green-800">Leída</span> : null}
        <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
      </button>
    </li>
  );
}

export default function CentroAyudaApp({ modo = "panel" }) {
  const { filtro, audiencias } = useSesionAyuda();
  const { indice, error, cargando, reintentar } = useIndiceAyuda(true);
  const [todas, setTodas] = useState(false);
  const [q, setQ] = useState("");
  const { marcadas } = useLeidas();
  const { guias, rutas, porSlug } = useMemo(() => filtrarIndice(indice, filtro, { todas }), [indice, filtro, todas]);
  const preparadas = useMemo(() => guias.map(prepararGuia), [guias]);
  const resultados = q.trim().length >= 2 ? buscar(preparadas, q, { limite: 15 }) : null;
  const grupos = useMemo(() => {
    const m = new Map();
    for (const g of guias) { if (!m.has(g.carpeta)) m.set(g.carpeta, { titulo: g.nombreCarpeta, guias: [] }); m.get(g.carpeta).guias.push(g); }
    return [...m.entries()];
  }, [guias]);
  const empleado = modo === "empleado";

  return (
    <div className={`mx-auto w-full ${empleado ? "" : "max-w-5xl p-1"} space-y-5`} data-pantalla="ayuda-app" data-audiencias={audiencias.join(",")}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={`flex items-center gap-2 font-extrabold tracking-tight text-[#080d36] ${empleado ? "text-3xl" : "text-2xl"}`}><CircleHelp className="size-7 text-[#2563EB]" aria-hidden="true" />Ayuda</h1>
          <p className="mt-1 text-[15px] text-slate-600">Guías paso a paso para {empleado ? "usar tu app" : "usar ADAMIA"}. También puedes tocar «?» arriba en cualquier pantalla.</p>
        </div>
        <a href={rutaDeInstancia("/ayuda")} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-[#2563EB] hover:bg-blue-50 sm:self-auto">
          <ExternalLink className="size-4" aria-hidden="true" />Centro de ayuda completo
        </a>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="relative">
          <label htmlFor="ayuda-app-q" className="sr-only">Busca en la ayuda</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="ayuda-app-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" placeholder="¿Qué quieres hacer? Ej. confirmar de leído"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-3 text-base text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
        </div>
        <div role="group" aria-label="Qué guías ver" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {[[false, "Para mí"], [true, "Todas"]].map(([v, t]) => (
            <button key={t} type="button" aria-pressed={todas === v} onClick={() => setTodas(v)} data-filtro-ayuda={v ? "todas" : "mias"}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${todas === v ? "bg-white text-[#080d36] shadow-sm" : "text-slate-600"}`}>{t}</button>
          ))}
        </div>
      </div>
      {!todas && audiencias.length ? <p className="-mt-2 text-[13px] text-slate-500">Mostrando guías para: {audiencias.map((a) => QUIEN[a]).join(", ")}. Solo de los módulos que tu empresa tiene encendidos.</p> : null}

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">No pudimos cargar la ayuda. <button type="button" className="font-semibold underline" onClick={() => reintentar()}>Reintentar</button></p> : null}
      {cargando && !indice ? <p role="status" className="rounded-xl bg-slate-100 p-5 text-sm text-slate-500">Cargando la ayuda…</p> : null}

      {resultados ? (
        <section aria-label="Resultados" className="grid gap-2" aria-live="polite">
          {resultados.length ? <ul className="grid gap-2">{resultados.map((r) => <FilaGuia key={r.g.slug} g={r.g} seccion={r.seccion} leida={Boolean(marcadas[r.g.slug])} />)}</ul>
            : <p className="rounded-xl border border-slate-200 bg-white p-5 text-[15px] text-slate-600">No encontramos guías con «{q.trim()}». {todas ? "" : "Prueba en «Todas» o "}con el nombre del botón o de la pantalla.</p>}
        </section>
      ) : indice ? (
        <>
          {rutas.length ? (
            <section aria-labelledby="rutas-app" className="grid gap-3">
              <h2 id="rutas-app" className="flex items-center gap-2 text-[17px] font-extrabold text-[#080d36]"><GraduationCap className="size-5 text-violet-700" aria-hidden="true" />Rutas de capacitación</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {rutas.map((r) => {
                  const a = avanceRuta(r.guias, marcadas);
                  return (
                    <li key={r.slug} className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4" data-ruta-app={r.slug}>
                      <b className="text-[15px] text-[#080d36]">{r.titulo}</b>
                      <p className="text-[13px] text-slate-600">{r.resumen}</p>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`Avance de ${r.titulo}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={a.porcentaje}><div className="h-full rounded-full bg-green-600" style={{ width: `${a.porcentaje}%` }} /></div>
                      <p className="text-[13px] font-semibold text-slate-700">{a.hechas} de {a.total} leídas</p>
                      <div className="flex flex-wrap gap-2">
                        {a.siguiente ? <button type="button" onClick={() => abrirAyuda(a.siguiente)} className="inline-flex min-h-11 items-center rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-700">{a.hechas ? "Continuar" : "Empezar"}: {porSlug.get(a.siguiente)?.titulo}</button> : <span className="inline-flex min-h-11 items-center text-sm font-semibold text-green-700">¡Ruta terminada!</span>}
                        <a href={rutaDeInstancia(r.url)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver la ruta</a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
          {grupos.length ? grupos.map(([carpeta, grupo]) => (
            <section key={carpeta} aria-labelledby={`grupo-${carpeta}`} className="grid gap-2" data-grupo-ayuda={carpeta}>
              <h2 id={`grupo-${carpeta}`} className="flex items-center gap-2 text-[17px] font-extrabold text-[#080d36]"><BookOpen className="size-5 text-[#2563EB]" aria-hidden="true" />{grupo.titulo}</h2>
              <ul className="grid gap-2">{grupo.guias.map((g) => <FilaGuia key={g.slug} g={g} leida={Boolean(marcadas[g.slug])} />)}</ul>
            </section>
          )) : <p className="rounded-xl border border-slate-200 bg-white p-5 text-[15px] text-slate-600">Aún no hay guías para tu perfil. Revisa «Todas».</p>}
        </>
      ) : null}
    </div>
  );
}
