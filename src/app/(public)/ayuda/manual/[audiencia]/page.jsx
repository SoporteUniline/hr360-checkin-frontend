import Link from "next/link";
import { notFound } from "next/navigation";
import { SITIO } from "@/lib/blog/articulos";
import { cargarAyuda, ultimaFecha } from "@/lib/ayuda/contenido.mjs";
import { AUDIENCIAS, PARA_AUDIENCIA } from "@/lib/ayuda/frontmatter.mjs";
import { metadatos } from "@/lib/ayuda/seo.mjs";
import Markdown from "@/components/ayuda/Markdown";
import { BotonPdf } from "@/components/ayuda/PublicoCliente";
import { CabezaImpresion, fechaLarga } from "@/components/ayuda/Comun";

// «Manual completo» por audiencia: todas sus guías en una sola página, pensada para «Imprimir o guardar PDF».
// No se indexa (repite el contenido de las guías, que son las páginas canónicas).
export const dynamicParams = false;

export function generateStaticParams() {
  const ayuda = cargarAyuda();
  return AUDIENCIAS.filter((a) => ayuda.guias.some((g) => g.audiencia.includes(a))).map((audiencia) => ({ audiencia }));
}

export async function generateMetadata({ params }) {
  const { audiencia } = await params;
  if (!AUDIENCIAS.includes(audiencia)) return {};
  return metadatos({ sitio: SITIO, ruta: `/ayuda/manual/${audiencia}`, titulo: `Manual de ADAMIA para ${PARA_AUDIENCIA[audiencia]}`, descripcion: `Todas las guías de ADAMIA para ${PARA_AUDIENCIA[audiencia]} en un solo documento para imprimir o guardar como PDF.`, tipo: "website", indexar: false });
}

export default async function Manual({ params }) {
  const { audiencia } = await params;
  if (!AUDIENCIAS.includes(audiencia)) notFound();
  const ayuda = cargarAyuda();
  const guias = ayuda.guias.filter((g) => g.audiencia.includes(audiencia));
  if (!guias.length) notFound();
  const titulo = `Manual de ADAMIA para ${PARA_AUDIENCIA[audiencia]}`;
  return (
    <div className="wrap" style={{ maxWidth: 860, paddingBlock: 36 }} data-manual={audiencia}>
      <section className="ay-manual-portada">
        <CabezaImpresion texto="Centro de ayuda" />
        <nav className="migas ay-no-imprimir" aria-label="Ruta"><Link href="/ayuda">Centro de ayuda</Link><span aria-hidden="true">/</span><span>Manual completo</span></nav>
        <span className="eyebrow" style={{ display: "block", marginTop: 18 }}>Manual completo</span>
        <h1 style={{ marginBlock: "10px 12px" }}>{titulo}</h1>
        <p className="ay-lead">{guias.length} guías · actualizado al {fechaLarga(ultimaFecha({ guias }))}</p>
        <div className="ay-acciones" style={{ marginBlock: 18 }}><BotonPdf texto="Imprimir o guardar PDF" className="btn btn-primary" /></div>
        <h2 style={{ fontSize: "1.4rem", margin: "24px 0 10px" }}>Contenido</h2>
        <ol className="ay-manual-indice">{guias.map((g) => <li key={g.slug}><a href={`#${g.slug.replace("/", "--")}`}>{g.titulo}</a></li>)}</ol>
      </section>
      {guias.map((g) => (
        <section key={g.slug} id={g.slug.replace("/", "--")} className="ay-manual-guia" aria-labelledby={`t-${g.slug.replace("/", "--")}`}>
          <p className="eyebrow">{g.nombreCarpeta}</p>
          <h2 id={`t-${g.slug.replace("/", "--")}`}>{g.titulo}</h2>
          <p className="ay-lead" style={{ marginBottom: 18 }}>{g.resumen}</p>
          <Markdown bloques={g.bloques} prefijo={`${g.slug.replace("/", "--")}-`} />
        </section>
      ))}
    </div>
  );
}
