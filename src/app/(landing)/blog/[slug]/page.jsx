import Link from "next/link";
import { notFound } from "next/navigation";
import SitioEncabezado from "@/components/landing/home/SitioEncabezado";
import SitioPie from "@/components/landing/home/SitioPie";
import { ARTICULOS, AVISO_LEGAL, SITIO, articuloPorSlug, fechaLarga } from "@/lib/blog/articulos";
import "@/components/landing/home/landing-home.css";

export function generateStaticParams() {
  return ARTICULOS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const a = articuloPorSlug(slug);
  if (!a) return {};
  const url = `${SITIO}/blog/${a.slug}`;
  return {
    title: a.titulo,
    description: a.descripcion,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: a.titulo, description: a.descripcion, publishedTime: a.fecha, locale: "es_MX" },
    twitter: { card: "summary", title: a.titulo, description: a.descripcion },
  };
}

// Datos estructurados para Google: artículo, preguntas frecuentes y migas de pan.
function datosEstructurados(a) {
  const url = `${SITIO}/blog/${a.slug}`;
  return [
    { "@context": "https://schema.org", "@type": "Article", headline: a.titulo, description: a.descripcion, datePublished: a.fecha, dateModified: a.fecha, inLanguage: "es-MX", mainEntityOfPage: url, author: { "@type": "Organization", name: "ADAMIA" }, publisher: { "@type": "Organization", name: "ADAMIA", logo: { "@type": "ImageObject", url: `${SITIO}/landing/adamia-a.png` } } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: a.faq.map((f) => ({ "@type": "Question", name: f.p, acceptedAnswer: { "@type": "Answer", text: f.r } })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITIO },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITIO}/blog` },
      { "@type": "ListItem", position: 3, name: a.titulo, item: url },
    ] },
  ];
}

export default async function ArticuloPage({ params }) {
  const { slug } = await params;
  const a = articuloPorSlug(slug);
  if (!a) notFound();
  const otros = ARTICULOS.filter((x) => x.slug !== a.slug).slice(0, 3);
  return (
    <div className="lh">
      <SitioEncabezado />
      <main className="blog">
        <article className="wrap post">
          <nav className="migas" aria-label="Ruta"><Link href="/">Inicio</Link> / <Link href="/blog">Blog</Link> / <span>{a.categoria}</span></nav>
          <header className="post-head">
            <span className="cat">{a.categoria}</span>
            <h1>{a.titulo}</h1>
            <p className="post-desc">{a.descripcion}</p>
            <small>Actualizado el {fechaLarga(a.fecha)} · {a.lectura} de lectura</small>
          </header>
          <aside className="resumen" aria-label="En 30 segundos">
            <b>En 30 segundos</b>
            <ul>{a.resumen.map((r) => <li key={r}>{r}</li>)}</ul>
          </aside>
          {a.secciones.map((s) => (
            <section key={s.titulo} className="post-sec">
              <h2>{s.titulo}</h2>
              {(s.parrafos || []).map((p) => <p key={p}>{p}</p>)}
              {s.lista && <ul>{s.lista.map((l) => <li key={l}>{l}</li>)}</ul>}
              {s.cierre && <p>{s.cierre}</p>}
            </section>
          ))}
          <section className="post-cta">
            <div>
              <b>ADAMIA registra cada entrada y salida de forma electrónica.</b>
              <p>Rostro y GPS en cada checada, horas extra separadas por semana y reportes listos para la autoridad.</p>
            </div>
            <Link className="btn btn-primary" href="/contacto">Solicitar demo</Link>
          </section>
          <section className="post-sec">
            <h2>Preguntas frecuentes</h2>
            <div className="faq">
              {a.faq.map((f) => (
                <details key={f.p}><summary>{f.p}</summary><p>{f.r}</p></details>
              ))}
            </div>
          </section>
          <section className="post-sec fuentes">
            <h2>Fuentes</h2>
            <ol>{a.fuentes.map((f) => <li key={f.url}><a href={f.url} target="_blank" rel="noopener noreferrer">{f.titulo}</a></li>)}</ol>
            <p className="aviso">{AVISO_LEGAL}</p>
          </section>
          <section className="post-sec">
            <h2>Sigue leyendo</h2>
            <div className="blog-lista mini">
              {otros.map((o) => (
                <Link key={o.slug} className="post-card" href={`/blog/${o.slug}`}><span className="cat">{o.categoria}</span><h3>{o.titulo}</h3></Link>
              ))}
            </div>
          </section>
        </article>
        {datosEstructurados(a).map((d, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />
        ))}
      </main>
      <SitioPie />
    </div>
  );
}
