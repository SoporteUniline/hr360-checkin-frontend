import Link from "next/link";
import { DETALLES } from "@/lib/sitio/modulos";
import "@/components/landing/home/landing-home.css";
import "./detalle.css";

// Plantilla de las páginas de detalle de Funciones (mismo estilo que el inicio). Contenido en src/lib/sitio/detalles.js.
const Flecha = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function PaginaDetalle({ d }) {
  const otras = DETALLES.filter((x) => x.href !== d.ruta);
  return (
    <div className="lh dt" style={{ "--c": d.color }}>
      <section className="dt-hero">
        <div className="wrap dt-hero-grid">
          <div className="dt-hero-txt">
            <Link className="dt-volver" href="/funcionalidades">← Todas las funciones</Link>
            <span className="eyebrow">{d.eyebrow}</span>
            <h1>{d.titulo}</h1>
            <p className="lead">{d.lead}</p>
            <div className="ctas">
              <Link className="btn btn-primary" href="/contacto">Solicitar demo <Flecha /></Link>
              <Link className="btn btn-claro" href="/cotiza">Cotizar</Link>
            </div>
          </div>
          <ul className="dt-resumen" aria-label="En resumen">
            {d.resumen.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      </section>

      {d.bloques.map((b, i) => (
        <section key={b.titulo} className={`dt-bloque${i % 2 ? " gris" : ""}`}>
          <div className="wrap dt-bloque-grid">
            <div className="dt-bloque-txt">
              <span className="dt-num">{String(i + 1).padStart(2, "0")}</span>
              <h2>{b.titulo}</h2>
              <p>{b.texto}</p>
            </div>
            <div className="dt-puntos">
              {b.puntos.map((p) => (
                <article key={p.t}>
                  <b>{p.t}</b>
                  <span>{p.d}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="wrap dt-faq">
        <h2>Preguntas frecuentes</h2>
        {d.faq.map((f) => (
          <details key={f.p}>
            <summary>{f.p}</summary>
            <p>{f.r}</p>
          </details>
        ))}
      </section>

      <section className="wrap dt-otras">
        <h2>Otras funciones</h2>
        <div className="dt-otras-grid">
          {otras.map((o) => (
            <Link key={o.href} href={o.href}>
              <b>{o.nombre}</b>
              <span>{o.texto}</span>
              <i aria-hidden="true">→</i>
            </Link>
          ))}
        </div>
      </section>

      <section className="dt-final">
        <div className="wrap">
          <h2>Ve ADAMIA en acción.</h2>
          <p>Te mostramos cómo funcionaría con tu empresa, sin compromiso.</p>
          <div className="ctas">
            <Link className="btn btn-primary" href="/contacto">Solicitar demo <Flecha /></Link>
            <Link className="btn btn-claro" href="/contratar-plan">Contratar</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
