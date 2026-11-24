import Link from "next/link";
import { CATEGORIAS, DETALLES, TOTAL_MODULOS } from "@/lib/sitio/modulos";
import "@/components/landing/home/landing-home.css";
import "./funciones.css";

// Funciones: mismo estilo que el inicio — colores sólidos de la marca, franjas lado a lado.
export const metadata = {
  title: "Funciones de ADAMIA | Asistencia, permisos, contratos y más",
  description: `Las ${TOTAL_MODULOS} herramientas de ADAMIA para Recursos Humanos en México: reloj checador con rostro y GPS, horas extra, vacaciones, permisos por WhatsApp, contratos y firma en línea.`,
  alternates: { canonical: "/funcionalidades" },
};

const Flecha = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function Modulo({ m, i, color }) {
  const contenido = (
    <>
      <span className="fx-num" style={{ "--c": color }}>{String(i + 1).padStart(2, "0")}</span>
      <b>{m.nombre}</b>
      <span>{m.texto}</span>
    </>
  );
  return m.href ? (
    <Link className="fx-mod enlace" href={m.href}>{contenido}<i aria-hidden="true">→</i></Link>
  ) : (
    <div className="fx-mod">{contenido}</div>
  );
}

export default function FuncionesPage() {
  return (
    <div className="lh">
      <section className="fx-hero">
        <div className="wrap fx-hero-grid">
          <div className="fx-hero-txt">
            <span className="eyebrow">Funciones</span>
            <h1>Todo Recursos Humanos. <span className="mark">Una sola cuenta.</span></h1>
            <p className="lead">Desde la checada con rostro y GPS hasta el contrato firmado en línea: {TOTAL_MODULOS} herramientas conectadas entre sí.</p>
            <div className="ctas">
              <Link className="btn btn-primary" href="/contacto">Solicitar demo <Flecha /></Link>
              <Link className="btn btn-claro" href="/cotiza">Cotizar</Link>
            </div>
          </div>
          <nav className="fx-indice" aria-label="Categorías">
            <p><b>{TOTAL_MODULOS}</b> herramientas en {CATEGORIAS.length} grupos</p>
            {CATEGORIAS.map((c) => (
              <a key={c.id} href={`#${c.id}`} style={{ "--c": c.color }}>
                <span>{c.modulos.length}</span>
                {c.nombre}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {CATEGORIAS.map((c) => (
        <section key={c.id} id={c.id} className={`fx-cat fondo-${c.fondo}`}>
          <div className="wrap fx-cat-grid">
            <div className="fx-cat-txt">
              <span className="eyebrow">{c.nombre} · {c.modulos.length}</span>
              <h2>{c.lema}</h2>
              <p>{c.texto}</p>
              {c.detalle ? (
                <Link className="btn btn-claro" href={c.detalle.href}>{c.detalle.texto} <Flecha /></Link>
              ) : null}
            </div>
            <div className="fx-mods">
              {c.modulos.map((m, i) => <Modulo key={m.nombre} m={m} i={i} color={c.color} />)}
            </div>
          </div>
        </section>
      ))}

      <section className="fx-detalles">
        <div className="wrap">
          <h2>Conoce cada parte a detalle</h2>
          <div className="fx-det-grid">
            {DETALLES.map((d) => (
              <Link key={d.href} className="fx-det" href={d.href}>
                <b>{d.nombre}</b>
                <span>{d.texto}</span>
                <i aria-hidden="true">→</i>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap fx-final">
          <h2>Ve ADAMIA en acción.</h2>
          <p>Te mostramos cómo se vería con tu empresa, sin compromiso.</p>
          <div className="ctas">
            <Link className="btn btn-primary" href="/contacto">Solicitar demo <Flecha /></Link>
            <Link className="btn btn-line" href="/contratar-plan">Contratar</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
