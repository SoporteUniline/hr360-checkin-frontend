import { cache } from "react";
import { SITIO } from "@/lib/blog/articulos";
import { jobPostingLd, jsonLdSeguro, textoPlano } from "@/lib/bolsaTrabajo.mjs";
import "@/components/landing/home/landing-home.css";
import "./vacante.css";
import VacanteDetalle from "./VacanteDetalle";

// Página de una vacante (rediseño 23/11/2026). El servidor solo pide la vacante para el título, la vista previa al
// compartir y los datos estructurados JobPosting; todo lo demás (preguntas, postulación, OTP) sigue en el navegador,
// con los datos al momento. Si el API no responde en 2.5 s, la página sale igual con metadatos genéricos.
// RUTA_BACKEND_SERVIDOR (opcional) permite usar una ruta interna del backend desde el servidor.
const backend = () => (process.env.RUTA_BACKEND_SERVIDOR || process.env.NEXT_PUBLIC_RUTA_BACKEND || "").replace(/\/$/, "");

const vacanteDelServidor = cache(async (slug) => {
  const base = backend();
  if (!base || !slug) return { estado: "sin-datos" };
  try {
    const r = await fetch(`${base}/vacantes/slug/${encodeURIComponent(slug)}`, { next: { revalidate: 120 }, signal: AbortSignal.timeout(2500) });
    if (r.status === 404) return { estado: "no-existe" };
    if (!r.ok) return { estado: "sin-datos" };
    const v = await r.json();
    return v?.titulo ? { estado: "ok", v } : { estado: "sin-datos" };
  } catch {
    return { estado: "sin-datos" };
  }
});

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { estado, v } = await vacanteDelServidor(slug);
  const ruta = `/vacante/${encodeURIComponent(slug)}`;
  if (estado === "no-existe") return { title: "Vacante no disponible", robots: { index: false } };
  if (estado !== "ok") return { title: "Vacante en la bolsa de trabajo", alternates: { canonical: ruta } };
  const titulo = v.nombre_empresa ? `${v.titulo} en ${v.nombre_empresa}` : v.titulo;
  const lugar = [v.ciudad, v.entidad].filter(Boolean).join(", ");
  const descripcion = textoPlano(`${lugar ? `${lugar}. ` : ""}${v.descripcion || ""}`, 160) || "Postúlate desde tu celular en la bolsa de trabajo de ADAMIA.";
  return {
    title: `${titulo} | Bolsa de trabajo`,
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: { title: `${titulo} | ADAMIA`, description: descripcion, url: ruta, siteName: "ADAMIA", locale: "es_MX", type: "website", ...(v.url_imagen ? { images: [{ url: v.url_imagen }] } : {}) },
  };
}

export default async function VacantePage({ params }) {
  const { slug } = await params;
  const { estado, v } = await vacanteDelServidor(slug);
  const ld = estado === "ok" ? jobPostingLd(v, `${SITIO}/vacante/${encodeURIComponent(slug)}`) : null;
  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSeguro(ld) }} /> : null}
      <VacanteDetalle />
    </>
  );
}
