import Link from "next/link";
import { notFound } from "next/navigation";
import { SITIO } from "@/lib/blog/articulos";
import { cargarAyuda, moduloPorSlug } from "@/lib/ayuda/contenido.mjs";
import { jsonSeguro, metadatos, migas } from "@/lib/ayuda/seo.mjs";
import Markdown from "@/components/ayuda/Markdown";
import { ChipsAudiencia, DatosEstructurados, IconoModulo } from "@/components/ayuda/Comun";

export const dynamicParams = false;

export function generateStaticParams() {
  return cargarAyuda().modulos.map((m) => ({ modulo: m.slug }));
}

export async function generateMetadata({ params }) {
  const { modulo } = await params;
  const m = moduloPorSlug(cargarAyuda(), modulo);
  if (!m) return {};
  return metadatos({ sitio: SITIO, ruta: m.url, titulo: `${m.titulo} · Centro de ayuda`, descripcion: m.resumen, tipo: "website" });
}

export default async function ModuloAyuda({ params }) {
  const { modulo } = await params;
  const ayuda = cargarAyuda();
  const m = moduloPorSlug(ayuda, modulo);
  if (!m) notFound();
  const guias = ayuda.guias.filter((g) => g.carpeta === m.slug);
  const datos = [jsonSeguro(migas(SITIO, [{ nombre: "Centro de ayuda", ruta: "/ayuda" }, { nombre: m.titulo, ruta: m.url }]))];
  return (
    <>
      <section className="ay-hero">
        <div className="wrap">
          <nav className="migas" aria-label="Ruta"><Link href="/ayuda">Centro de ayuda</Link><span aria-hidden="true">/</span><span>{m.titulo}</span></nav>
          <IconoModulo nombre={m.icono} />
          <h1>{m.titulo}</h1>
          <p className="ay-lead">{m.resumen}</p>
        </div>
      </section>
      <section className="ay-seccion">
        <div className="wrap">
          {m.portada?.bloques?.length ? <div style={{ maxWidth: 760, marginBottom: 32 }}><Markdown bloques={m.portada.bloques} /></div> : null}
          <h2 className="ay-sr">Guías de {m.titulo}</h2>
          <div className="ay-rejilla">
            {guias.map((g) => (
              <Link key={g.slug} href={g.url} className="ay-tarjeta" data-guia={g.slug}>
                <ChipsAudiencia audiencia={g.audiencia} />
                <h3>{g.titulo}</h3>
                <p>{g.resumen}</p>
                <span className="ay-mas">Leer la guía →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <DatosEstructurados datos={datos} />
    </>
  );
}
