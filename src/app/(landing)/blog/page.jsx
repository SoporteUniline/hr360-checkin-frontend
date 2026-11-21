import Link from "next/link";
import SitioEncabezado from "@/components/landing/home/SitioEncabezado";
import SitioPie from "@/components/landing/home/SitioPie";
import { ARTICULOS, SITIO, fechaLarga } from "@/lib/blog/articulos";
import "@/components/landing/home/landing-home.css";

export const metadata = {
  title: "Blog: reforma laboral, registro de jornada y horas extra",
  description:
    "Guías claras sobre la reforma a la Ley Federal del Trabajo: registro electrónico de la jornada obligatorio en 2027, multas, jornada de 40 horas y horas extra.",
  alternates: { canonical: `${SITIO}/blog` },
  openGraph: { type: "website", url: `${SITIO}/blog`, title: "Blog de ADAMIA · Reforma laboral 2026–2030" },
};

export default function BlogPage() {
  const [principal, ...resto] = [...ARTICULOS].sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
  return (
    <div className="lh">
      <SitioEncabezado />
      <main className="blog">
        <section className="blog-head">
          <div className="wrap">
            <span className="eyebrow">Blog · Reforma laboral</span>
            <h1>La ley laboral, explicada para quien la tiene que cumplir.</h1>
            <p>Registro electrónico de la jornada, multas, jornada de 40 horas y horas extra. Con fuentes oficiales y sin rodeos.</p>
          </div>
        </section>
        <section className="wrap blog-lista">
          <Link className="post-card principal" href={`/blog/${principal.slug}`}>
            <span className="cat">{principal.categoria}</span>
            <h2>{principal.titulo}</h2>
            <p>{principal.descripcion}</p>
            <small>{fechaLarga(principal.fecha)} · {principal.lectura} de lectura</small>
            <b className="leer">Leer la guía →</b>
          </Link>
          {resto.map((a) => (
            <Link key={a.slug} className="post-card" href={`/blog/${a.slug}`}>
              <span className="cat">{a.categoria}</span>
              <h2>{a.titulo}</h2>
              <p>{a.descripcion}</p>
              <small>{fechaLarga(a.fecha)} · {a.lectura} de lectura</small>
            </Link>
          ))}
        </section>
      </main>
      <SitioPie />
    </div>
  );
}
