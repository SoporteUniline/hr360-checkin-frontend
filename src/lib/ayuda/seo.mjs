// Centro de ayuda · metadatos para buscadores y datos estructurados (JSON-LD). Sin red ni React.
import { NOMBRE_AUDIENCIA } from "./frontmatter.mjs";

/** JSON seguro dentro de <script type="application/ld+json"> (sin «</script>» ni «<!--»). */
export const jsonSeguro = (dato) => JSON.stringify(dato).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

const absoluta = (sitio, ruta) => (ruta && /^https?:\/\//.test(ruta) ? ruta : `${sitio}${ruta ?? ""}`);

/** Migas de pan: [{ nombre, ruta }]. */
export const migas = (sitio, lista) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: lista.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: m.nombre, item: absoluta(sitio, m.ruta) })),
});

/** Datos estructurados de una guía: TechArticle siempre; HowTo por tarea «## Cómo …»; FAQPage si trae preguntas. */
export function datosGuia(g, { sitio, modulo }) {
  const url = absoluta(sitio, g.url);
  const imagen = g.bloques.find((b) => b.t === "imagen")?.src;
  const lista = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: g.titulo,
      description: g.resumen,
      inLanguage: "es-MX",
      dateModified: g.actualizado,
      mainEntityOfPage: url,
      audience: (g.audiencia ?? []).map((a) => ({ "@type": "Audience", audienceType: NOMBRE_AUDIENCIA[a] ?? a })),
      ...(imagen ? { image: absoluta(sitio, imagen) } : {}),
      about: { "@type": "SoftwareApplication", name: "ADAMIA", applicationCategory: "BusinessApplication", operatingSystem: "Web, Android, iOS" },
      publisher: { "@type": "Organization", name: "ADAMIA", logo: { "@type": "ImageObject", url: `${sitio}/landing/adamia-a.png` } },
    },
    migas(sitio, [{ nombre: "Centro de ayuda", ruta: "/ayuda" }, { nombre: modulo?.titulo ?? g.nombreCarpeta, ruta: `/ayuda/${g.carpeta}` }, { nombre: g.titulo, ruta: g.url }]),
  ];
  for (const t of g.tareas ?? []) {
    lista.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: t.titulo,
      inLanguage: "es-MX",
      url: `${url}#${t.id}`,
      ...(t.imagen ? { image: absoluta(sitio, t.imagen) } : {}),
      step: t.pasos.map((p, i) => ({ "@type": "HowToStep", position: i + 1, text: p, url: `${url}#${t.id}` })),
    });
  }
  if (g.faq?.length) {
    lista.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: g.faq.map((f) => ({ "@type": "Question", name: f.pregunta, acceptedAnswer: { "@type": "Answer", text: f.respuesta } })),
    });
  }
  return lista;
}

/** Metadatos de Next (title, description, canonical, OpenGraph, Twitter). */
export function metadatos({ sitio, ruta, titulo, descripcion, imagen = null, tipo = "article", indexar = true, fecha = null }) {
  const url = absoluta(sitio, ruta);
  const imagenes = imagen ? [{ url: absoluta(sitio, imagen) }] : undefined;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: { type: tipo, url, title: titulo, description: descripcion, locale: "es_MX", siteName: "ADAMIA", ...(imagenes ? { images: imagenes } : {}), ...(fecha && tipo === "article" ? { modifiedTime: fecha } : {}) },
    twitter: { card: imagen ? "summary_large_image" : "summary", title: titulo, description: descripcion },
    ...(indexar ? {} : { robots: { index: false, follow: true } }),
  };
}
