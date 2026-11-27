import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITIO } from "@/lib/blog/articulos";
import { cargarAyuda, guiaPorSlug, moduloPorSlug, vecinas } from "@/lib/ayuda/contenido.mjs";
import { datosGuia, jsonSeguro, metadatos } from "@/lib/ayuda/seo.mjs";
import Markdown from "@/components/ayuda/Markdown";
import { BarraRuta, BotonPdf, UtilGuia } from "@/components/ayuda/PublicoCliente";
import { CabezaImpresion, ChipsAudiencia, DatosEstructurados, fechaLarga } from "@/components/ayuda/Comun";

export const dynamicParams = false;

export function generateStaticParams() {
  return cargarAyuda().guias.map((g) => ({ modulo: g.carpeta, guia: g.slug.split("/")[1] }));
}

export async function generateMetadata({ params }) {
  const { modulo, guia } = await params;
  const g = guiaPorSlug(cargarAyuda(), `${modulo}/${guia}`);
  if (!g) return {};
  const imagen = g.bloques.find((b) => b.t === "imagen")?.src ?? null;
  return metadatos({ sitio: SITIO, ruta: g.url, titulo: g.titulo, descripcion: g.resumen, imagen, fecha: g.actualizado });
}

function Lista({ items }) {
  return (
    <ol>
      {items.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.texto}</a>{s.sub?.length ? <Lista items={s.sub} /> : null}</li>)}
    </ol>
  );
}

export default async function GuiaAyuda({ params }) {
  const { modulo, guia } = await params;
  const ayuda = cargarAyuda();
  const g = guiaPorSlug(ayuda, `${modulo}/${guia}`);
  if (!g) notFound();
  const m = moduloPorSlug(ayuda, g.carpeta);
  const { anterior, siguiente } = vecinas(ayuda, g.slug);
  const porSlug = new Map(ayuda.guias.map((x) => [x.slug, x]));
  const rutas = ayuda.rutas.filter((r) => r.guias.includes(g.slug)).map((r) => ({
    slug: r.slug, titulo: r.titulo, guias: r.guias.filter((s) => porSlug.has(s)),
    pasos: r.guias.filter((s) => porSlug.has(s)).map((s) => ({ slug: s, url: porSlug.get(s).url, titulo: porSlug.get(s).titulo })),
  }));
  const datos = datosGuia(g, { sitio: SITIO, modulo: m }).map(jsonSeguro);
  return (
    <div className="wrap ay-guia-grid" data-guia-pagina={g.slug}>
      <article>
        <CabezaImpresion texto={`Centro de ayuda · ${m.titulo}`} />
        {rutas.length ? <Suspense fallback={null}><BarraRuta slug={g.slug} rutas={rutas} /></Suspense> : null}
        <header className="ay-guia-cabeza">
          <nav className="migas ay-no-imprimir" aria-label="Ruta"><Link href="/ayuda">Centro de ayuda</Link><span aria-hidden="true">/</span><Link href={m.url}>{m.titulo}</Link></nav>
          <ChipsAudiencia audiencia={g.audiencia} largo />
          <h1>{g.titulo}</h1>
          <p className="ay-lead">{g.resumen}</p>
          <p className="ay-fecha">Actualizada el {fechaLarga(g.actualizado)}</p>
          <div className="ay-acciones"><BotonPdf /></div>
        </header>
        {g.toc.length ? <details className="ay-toc-movil"><summary>En esta guía</summary><Lista items={g.toc.map(({ id, texto }) => ({ id, texto }))} /></details> : null}
        <Markdown bloques={g.bloques} />
        <UtilGuia slug={g.slug} />
        {anterior || siguiente ? (
          <nav className="ay-vecinas" aria-label="Más guías de este tema">
            {anterior ? <Link href={anterior.url}><span>← Anterior</span><b>{anterior.titulo}</b></Link> : null}
            {siguiente ? <Link className="sig" href={siguiente.url}><span>Siguiente →</span><b>{siguiente.titulo}</b></Link> : null}
          </nav>
        ) : null}
      </article>
      <aside>{g.toc.length ? <nav className="ay-toc" aria-label="En esta guía" data-toc><b>En esta guía</b><Lista items={g.toc} /></nav> : null}</aside>
      <DatosEstructurados datos={datos} />
    </div>
  );
}
