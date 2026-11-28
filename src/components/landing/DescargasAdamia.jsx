// «Llévate ADAMIA a casa»: brochure comercial y tríptico en PDF para descargar (27/11/2026).
// Un solo componente para la portada (variante "completa", src/components/landing/home/LandingHome.jsx) y Cotizar
// (variante "compacta", src/app/(public)/cotiza/page.jsx). Va dentro de un contenedor .lh (usa sus colores, .wrap y .btn).
// Lista, pesos y páginas: ./descargas.mjs. Estilo: docs/estilo-mosaico-favorito.md (tarjeta gris claro con esquinas muy
// redondeadas, se eleva al pasar el cursor; quieta con «reducir movimiento»), sin fondos degradados.
// Sin JavaScript propio: puede vivir en un componente de servidor o de cliente.
/* eslint-disable @next/next/no-img-element -- miniaturas webp ya optimizadas en /public/descargas */
import { DESCARGAS, detalleDescarga } from "./descargas.mjs";
import "./descargas.css";

const TEXTOS = {
  completa: {
    eyebrow: "Para llevar",
    titulo: "Llévate ADAMIA a casa.",
    lead: "Descarga nuestra presentación en PDF: léela con calma, imprímela o compártela con tu equipo.",
  },
  compacta: {
    eyebrow: "Material para descargar",
    titulo: "¿Quieres compartirlo con tu equipo?",
    lead: "Descarga el brochure y el tríptico en PDF.",
  },
};

function IconoDescarga() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />
    </svg>
  );
}

export default function DescargasAdamia({ variante = "completa" }) {
  const t = TEXTOS[variante] ?? TEXTOS.completa;
  const tituloId = `dz-titulo-${variante}`;
  return (
    <section className={`dz dz-${variante}`} id={variante === "completa" ? "descargas" : "descargas-cotiza"} aria-labelledby={tituloId}>
      <div className="wrap">
        <div className="dz-cab reveal">
          <span className="eyebrow">{t.eyebrow}</span>
          <h2 id={tituloId}>{t.titulo}</h2>
          <p>{t.lead}</p>
        </div>
        <ul className="dz-lista" role="list">
          {DESCARGAS.map((d, k) => (
            <li key={d.id} className="dz-tarjeta reveal" style={{ "--d": `${0.08 * (k + 1)}s` }} data-descarga={d.id}>
              <div className={`dz-portada ${d.portada.ancho > d.portada.alto ? "dz-horizontal" : "dz-vertical"}`}>
                <img src={d.portada.src} alt={d.portada.alt} width={d.portada.ancho} height={d.portada.alto} loading="lazy" decoding="async" />
              </div>
              <div className="dz-cuerpo">
                <h3>{d.titulo}</h3>
                {variante !== "compacta" && <p>{d.resumen}</p>}
                <p className="dz-meta">{detalleDescarga(d)}</p>
                {/* download pone el nombre bonito; si el navegador no lo respeta, el PDF se abre en otra pestaña. */}
                <a className="btn btn-primary dz-boton" href={d.archivo} download={d.nombreDescarga} target="_blank" rel="noopener">
                  <IconoDescarga />
                  {/* Un solo bloque de texto: .btn es flex con gap y separaría «Descargar» de «PDF». */}
                  <span>Descargar <span className="sr-only">{d.enlace} en </span>PDF</span>
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
