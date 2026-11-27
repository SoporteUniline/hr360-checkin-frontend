"use client";
// Centro de ayuda · piezas interactivas de las páginas públicas: buscador, «Descargar PDF», «¿Te sirvió?», avance de las
// rutas de capacitación y la barra «sigue la ruta» dentro de una guía. Lo guardado vive en este navegador (progreso.mjs).
import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Printer, Search } from "lucide-react";
import { buscar, prepararGuia } from "@/lib/ayuda/buscar.mjs";
import { avanceRuta, guardarUtil, leidas, marcarLeida, utilDe } from "@/lib/ayuda/progreso.mjs";
import { useIndiceAyuda } from "./useIndiceAyuda";

/** Guías leídas en este navegador, ya montado (en el servidor y al hidratar: ninguna). */
export function useLeidas() {
  const [marcadas, setMarcadas] = useState({});
  useEffect(() => {
    const leer = () => setMarcadas(leidas());
    leer();
    window.addEventListener("storage", leer);
    window.addEventListener("ayuda-leidas", leer);
    return () => { window.removeEventListener("storage", leer); window.removeEventListener("ayuda-leidas", leer); };
  }, []);
  const marcar = (slug, valor) => { setMarcadas({ ...marcarLeida(slug, valor) }); window.dispatchEvent(new Event("ayuda-leidas")); };
  return { marcadas, marcar };
}

/** Buscador de la portada. Lee y escribe ?q= para poder compartir la búsqueda. */
export function BuscadorAyuda({ sugerencias = [] }) {
  const parametros = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(() => parametros?.get("q") ?? "");
  const [tocado, setTocado] = useState(Boolean(parametros?.get("q")));
  const { indice, error, cargando } = useIndiceAyuda(tocado);
  const preparadas = useMemo(() => (indice?.guias ?? []).map(prepararGuia), [indice]);
  const resultados = useMemo(() => (q.trim().length >= 2 ? buscar(preparadas, q, { limite: 8 }) : []), [preparadas, q]);
  const id = useId();
  useEffect(() => {
    const t = setTimeout(() => {
      const actual = parametros?.get("q") ?? "";
      if (actual === q.trim()) return;
      router.replace(q.trim() ? `/ayuda?q=${encodeURIComponent(q.trim())}` : "/ayuda", { scroll: false });
    }, 500);
    return () => clearTimeout(t);
  }, [q, parametros, router]);
  return (
    <div className="ay-buscador" data-buscador-ayuda>
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor={`${id}-q`} className="ay-sr">Busca en el Centro de ayuda</label>
        <Search className="ay-lupa" size={22} aria-hidden="true" />
        <input id={`${id}-q`} type="search" value={q} autoComplete="off" enterKeyHint="search" placeholder="Ej. confirmar de leído, pedir vacaciones, cambiar la portada…"
          onFocus={() => setTocado(true)} onChange={(e) => { setQ(e.target.value); setTocado(true); }} aria-controls={`${id}-res`} />
      </form>
      <div id={`${id}-res`} aria-live="polite">
        {q.trim().length >= 2 ? (
          <div className="ay-resultados" data-resultados>
            {error ? <p className="ay-vacio">No pudimos cargar el buscador. Revisa tu conexión e intenta de nuevo.</p>
              : cargando && !indice ? <p className="ay-vacio">Buscando…</p>
                : resultados.length ? (
                  <ul>
                    {resultados.map(({ g, seccion }) => (
                      <li key={g.slug}>
                        <Link href={`${g.url}${seccion ? `#${seccion.id}` : ""}`} data-resultado={g.slug}>
                          <b>{g.titulo}</b>
                          <span>{g.resumen}</span>
                          <small>{g.nombreCarpeta}{seccion ? ` · ${seccion.texto}` : ""}</small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="ay-vacio">No encontramos guías con «{q.trim()}». Prueba con otra palabra, por ejemplo el nombre del botón o de la pantalla.</p>}
          </div>
        ) : sugerencias.length ? (
          <ul className="ay-chips" aria-label="Búsquedas frecuentes" style={{ marginTop: 14 }}>
            {sugerencias.map((s) => <li key={s}><a className="ay-chip" href={`/ayuda?q=${encodeURIComponent(s)}`} onClick={(e) => { e.preventDefault(); setQ(s); setTocado(true); }}>{s}</a></li>)}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/** «Descargar PDF»: la impresión del navegador con la hoja de estilos de impresión (ayuda.css). */
export function BotonPdf({ texto = "Descargar PDF", className = "btn btn-line" }) {
  return (
    <button type="button" className={className} onClick={() => window.print()} data-descargar-pdf>
      <Printer size={18} aria-hidden="true" />{texto}
    </button>
  );
}

/** «¿Te sirvió esta guía?» (por ahora solo se guarda en este navegador). */
export function UtilGuia({ slug }) {
  const [valor, setValor] = useState(null);
  useEffect(() => { setValor(utilDe(slug)); }, [slug]);
  const elegir = (v) => { setValor(v); guardarUtil(slug, v); };
  return (
    <section className="ay-util" aria-label="¿Te sirvió esta guía?" data-util>
      <b>¿Te sirvió esta guía?</b>
      <button type="button" aria-pressed={valor === "si"} onClick={() => elegir("si")}>Sí</button>
      <button type="button" aria-pressed={valor === "no"} onClick={() => elegir("no")}>No</button>
      {valor ? <p role="status">{valor === "si" ? "¡Gracias! Nos alegra que te sirviera." : "Gracias por avisarnos. Si te quedó una duda, escríbenos desde Contacto y mejoramos la guía."}</p> : null}
    </section>
  );
}

/** Avance de una ruta en su tarjeta de la portada. */
export function AvanceTarjeta({ guias }) {
  const { marcadas } = useLeidas();
  const a = avanceRuta(guias, marcadas);
  return (
    <>
      <span className="ay-barra" aria-hidden="true"><span style={{ width: `${a.porcentaje}%` }} /></span>
      <span className="ay-mas">{a.hechas ? `${a.hechas} de ${a.total} leídas · Continuar →` : `${a.total} guías · Empezar →`}</span>
    </>
  );
}

/** Lista de guías de una ruta con «Ya la leí» y el avance. pasos: [{ slug, url, titulo, resumen }]. */
export function PasosRuta({ ruta, pasos }) {
  const { marcadas, marcar } = useLeidas();
  const a = avanceRuta(pasos.map((p) => p.slug), marcadas);
  const siguiente = pasos.find((p) => p.slug === a.siguiente);
  return (
    <>
      <div className="ay-avance" data-avance-ruta={a.hechas}>
        <b>{a.hechas === a.total ? "¡Terminaste esta ruta!" : `${a.hechas} de ${a.total} guías leídas`}</b>
        <span className="ay-barra" role="progressbar" aria-label="Avance de la ruta" aria-valuemin={0} aria-valuemax={100} aria-valuenow={a.porcentaje}><span style={{ width: `${a.porcentaje}%` }} /></span>
        {siguiente ? <Link className="btn btn-primary" href={`${siguiente.url}?ruta=${ruta}`} style={{ justifySelf: "start", marginTop: 6 }}>{a.hechas ? "Continuar" : "Empezar"}: {siguiente.titulo}</Link> : null}
      </div>
      <ol className="ay-pasos">
        {pasos.map((p, i) => {
          const hecha = Boolean(marcadas[p.slug]);
          return (
            <li key={p.slug} className={hecha ? "hecha" : ""} data-paso={p.slug}>
              <span className="num" aria-hidden="true">{hecha ? <Check size={18} /> : i + 1}</span>
              <span><Link href={`${p.url}?ruta=${ruta}`}>{p.titulo}</Link><p>{p.resumen}</p></span>
              <label><input type="checkbox" checked={hecha} onChange={(e) => marcar(p.slug, e.target.checked)} />Ya la leí</label>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** Dentro de una guía abierta desde una ruta (?ruta=slug): «paso 2 de 5» y «Marcar como leída y seguir». */
export function BarraRuta({ slug, rutas }) {
  const parametros = useSearchParams();
  const router = useRouter();
  const { marcadas, marcar } = useLeidas();
  const ruta = rutas.find((r) => r.slug === parametros?.get("ruta") && r.guias.includes(slug));
  if (!ruta) return null;
  const i = ruta.guias.indexOf(slug);
  const sig = ruta.pasos[i + 1] ?? null;
  const seguir = () => { marcar(slug, true); router.push(sig ? `${sig.url}?ruta=${ruta.slug}` : `/ayuda/rutas/${ruta.slug}`); };
  return (
    <div className="ay-ruta-barra" data-barra-ruta>
      <span>Ruta <Link href={`/ayuda/rutas/${ruta.slug}`}><b>{ruta.titulo}</b></Link> · paso {i + 1} de {ruta.guias.length}{marcadas[slug] ? " · leída" : ""}</span>
      <button type="button" className="btn btn-primary" onClick={seguir}>{sig ? "Marcar como leída y seguir" : "Marcar como leída y terminar"}</button>
    </div>
  );
}
