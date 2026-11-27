import Link from "next/link";
import { notFound } from "next/navigation";
import { SITIO } from "@/lib/blog/articulos";
import { cargarAyuda } from "@/lib/ayuda/contenido.mjs";
import { jsonSeguro, metadatos, migas } from "@/lib/ayuda/seo.mjs";
import Markdown from "@/components/ayuda/Markdown";
import { PasosRuta } from "@/components/ayuda/PublicoCliente";
import { ChipsAudiencia, DatosEstructurados } from "@/components/ayuda/Comun";

export const dynamicParams = false;

const rutaPorSlug = (ayuda, slug) => ayuda.rutas.find((r) => r.slug === slug) ?? null;

export function generateStaticParams() {
  return cargarAyuda().rutas.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const r = rutaPorSlug(cargarAyuda(), slug);
  if (!r) return {};
  return metadatos({ sitio: SITIO, ruta: r.url, titulo: `Ruta de capacitación: ${r.titulo}`, descripcion: r.resumen, tipo: "website" });
}

export default async function RutaCapacitacion({ params }) {
  const { slug } = await params;
  const ayuda = cargarAyuda();
  const r = rutaPorSlug(ayuda, slug);
  if (!r) notFound();
  const porSlug = new Map(ayuda.guias.map((g) => [g.slug, g]));
  const pasos = r.guias.filter((s) => porSlug.has(s)).map((s) => ({ slug: s, url: porSlug.get(s).url, titulo: porSlug.get(s).titulo, resumen: porSlug.get(s).resumen }));
  const datos = [
    jsonSeguro(migas(SITIO, [{ nombre: "Centro de ayuda", ruta: "/ayuda" }, { nombre: r.titulo, ruta: r.url }])),
    jsonSeguro({ "@context": "https://schema.org", "@type": "ItemList", name: r.titulo, itemListOrder: "https://schema.org/ItemListOrderAscending", itemListElement: pasos.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.titulo, url: `${SITIO}${p.url}` })) }),
  ];
  return (
    <>
      <section className="ay-hero">
        <div className="wrap">
          <nav className="migas" aria-label="Ruta"><Link href="/ayuda">Centro de ayuda</Link><span aria-hidden="true">/</span><span>Rutas de capacitación</span></nav>
          <span className="eyebrow">Ruta de capacitación</span>
          <h1>{r.titulo}</h1>
          <p className="ay-lead">{r.resumen}</p>
          <ChipsAudiencia audiencia={r.audiencia} largo />
        </div>
      </section>
      <section className="ay-seccion" data-ruta-pagina={r.slug}>
        <div className="wrap" style={{ maxWidth: 860 }}>
          {r.bloques.length ? <div style={{ marginBottom: 28 }}><Markdown bloques={r.bloques} /></div> : null}
          <PasosRuta ruta={r.slug} pasos={pasos} />
          <p style={{ marginTop: 18, fontSize: ".92rem" }}>Tu avance se guarda solo en este navegador.</p>
        </div>
      </section>
      <DatosEstructurados datos={datos} />
    </>
  );
}
