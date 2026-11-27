import { Suspense } from "react";
import Link from "next/link";
import { SITIO } from "@/lib/blog/articulos";
import { cargarAyuda } from "@/lib/ayuda/contenido.mjs";
import { jsonSeguro, metadatos, migas } from "@/lib/ayuda/seo.mjs";
import { AUDIENCIAS, PARA_AUDIENCIA } from "@/lib/ayuda/frontmatter.mjs";
import { AvanceTarjeta, BuscadorAyuda } from "@/components/ayuda/PublicoCliente";
import { ChipsAudiencia, DatosEstructurados, IconoModulo } from "@/components/ayuda/Comun";

const TITULO = "Centro de ayuda de ADAMIA";
const DESCRIPCION = "Guías paso a paso para usar ADAMIA: muro y comunicados, asistencias, vacaciones, nómina, Mi espacio y más. Para Recursos Humanos, jefes y empleados.";
const SUGERENCIAS = ["confirmar de leído", "publicar un comunicado", "cambiar la portada", "iniciar sesión", "Mi espacio"];

export const metadata = metadatos({ sitio: SITIO, ruta: "/ayuda", titulo: TITULO, descripcion: DESCRIPCION, tipo: "website" });

export default function PortadaAyuda() {
  const ayuda = cargarAyuda();
  const porSlug = new Map(ayuda.guias.map((g) => [g.slug, g]));
  const manuales = AUDIENCIAS.filter((a) => ayuda.guias.some((g) => g.audiencia.includes(a)));
  const datos = [
    jsonSeguro({ "@context": "https://schema.org", "@type": "WebSite", name: "ADAMIA", url: SITIO, potentialAction: { "@type": "SearchAction", target: `${SITIO}/ayuda?q={consulta}`, "query-input": "required name=consulta" } }),
    jsonSeguro(migas(SITIO, [{ nombre: "Inicio", ruta: "/" }, { nombre: "Centro de ayuda", ruta: "/ayuda" }])),
  ];
  return (
    <>
      <section className="ay-hero">
        <div className="wrap">
          <span className="eyebrow">Centro de ayuda</span>
          <h1>¿En qué te ayudamos?</h1>
          <p className="ay-lead">Guías paso a paso, con capturas reales, para Recursos Humanos, jefes de equipo y empleados. Busca por lo que quieres hacer o por el nombre del botón.</p>
          <Suspense fallback={<div className="ay-buscador"><input aria-label="Busca en el Centro de ayuda" disabled placeholder="Cargando el buscador…" /></div>}>
            <BuscadorAyuda sugerencias={SUGERENCIAS} />
          </Suspense>
        </div>
      </section>

      {ayuda.rutas.length ? (
        <section className="ay-seccion" aria-labelledby="rutas-titulo">
          <div className="wrap">
            <h2 id="rutas-titulo">Rutas de capacitación</h2>
            <p className="ay-sub">Lecturas en orden para aprender lo esencial. Marca cada guía al terminarla y retoma donde te quedaste.</p>
            <div className="ay-rejilla">
              {ayuda.rutas.map((r) => {
                const guias = r.guias.filter((s) => porSlug.has(s));
                return (
                  <Link key={r.slug} href={r.url} className="ay-tarjeta ay-ruta" data-ruta={r.slug}>
                    <ChipsAudiencia audiencia={r.audiencia} />
                    <h3>{r.titulo}</h3>
                    <p>{r.resumen}</p>
                    <AvanceTarjeta guias={guias} />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="ay-seccion" aria-labelledby="modulos-titulo">
        <div className="wrap">
          <h2 id="modulos-titulo">Guías por tema</h2>
          <p className="ay-sub">Cada tema explica para qué sirve, quién lo usa, el paso a paso y qué pasa si algo no sale como esperabas.</p>
          <div className="ay-rejilla">
            {ayuda.modulos.map((m) => (
              <article key={m.slug} className="ay-tarjeta" data-modulo-ayuda={m.slug}>
                <IconoModulo nombre={m.icono} />
                <h3><Link href={m.url} style={{ color: "inherit", textDecoration: "none" }}>{m.titulo}</Link></h3>
                <p>{m.resumen}</p>
                <ul className="ay-lista-guias">
                  {m.guias.slice(0, 4).map((s) => <li key={s}><Link href={porSlug.get(s).url}>{porSlug.get(s).titulo}</Link></li>)}
                </ul>
                <Link className="ay-mas" href={m.url}>{m.guias.length > 4 ? `Ver las ${m.guias.length} guías →` : "Ver el tema →"}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {manuales.length ? (
        <section className="ay-seccion" aria-labelledby="manual-titulo">
          <div className="wrap">
            <h2 id="manual-titulo">Manual completo en PDF</h2>
            <p className="ay-sub">Todas las guías de un perfil en un solo documento, listo para imprimir o guardar como PDF.</p>
            <div className="ay-manuales">
              {manuales.map((a) => <Link key={a} className="btn btn-line" href={`/ayuda/manual/${a}`}>Manual para {PARA_AUDIENCIA[a]}</Link>)}
            </div>
          </div>
        </section>
      ) : null}

      <section className="ay-final">
        <div className="wrap">
          <div>
            <h2>¿No encontraste lo que buscabas?</h2>
            <p>Escríbenos y te ayudamos. Si ya usas ADAMIA, también puedes abrir «Ayuda» desde el menú o el botón «?» de cada pantalla.</p>
          </div>
          <Link className="btn btn-primary" href="/contacto">Contactar a soporte</Link>
        </div>
      </section>
      <DatosEstructurados datos={datos} />
    </>
  );
}
