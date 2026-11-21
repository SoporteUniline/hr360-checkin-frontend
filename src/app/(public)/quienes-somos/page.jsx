/* eslint-disable @next/next/no-img-element -- fotos ya optimizadas (webp) del sitio */
import Link from "next/link";
import { TOTAL_MODULOS } from "@/lib/sitio/modulos";
import "@/components/landing/home/landing-home.css";
import "./nosotros.css";

// Nosotros (21/11/2026): mismo estilo que el inicio. Sin cifras que no se puedan comprobar (la versión anterior
// decía «500+ empresas», «50K+ empleados» y «4.9/5» sin fuente); se usan hechos del producto.
export const metadata = {
  title: "Nosotros | ADAMIA, Recursos Humanos hecho en México",
  description: "Conoce ADAMIA: software de Recursos Humanos hecho en Autlán de Navarro, Jalisco, para que las empresas mexicanas controlen asistencia, permisos y contratos sin papeles.",
  alternates: { canonical: "/quienes-somos" },
};

const PILARES = [
  { t: "Seguridad", d: "Cuidamos la información de tu empresa y de tu gente: cada empresa ve solo lo suyo." },
  { t: "Precisión", d: "Cálculos de horas, vacaciones y pagos pensados para la ley mexicana." },
  { t: "Transparencia", d: "Precios claros y sin letras pequeñas: pagas por las personas que registras." },
  { t: "Cercanía", d: "Te atiende gente que conoce tu operación, no un menú automático." },
  { t: "Mejora continua", d: "Publicamos mejoras seguido, a partir de lo que nos piden los clientes." },
  { t: "Para todos", d: "Tecnología de empresa grande al alcance de negocios de cualquier tamaño." },
];

const HECHOS = [
  { n: String(TOTAL_MODULOS), t: "herramientas en una sola cuenta" },
  { n: "Rostro + GPS", t: "en cada checada, aunque no haya internet" },
  { n: "WhatsApp", t: "para aprobar permisos y vacaciones" },
  { n: "Ley 2027", t: "registro electrónico de la jornada, listo" },
];

const Flecha = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function NosotrosPage() {
  return (
    <div className="lh ns">
      <section className="ns-hero">
        <div className="ns-hero-foto"><img src="/landing/equipo.webp" alt="Equipo de trabajo de una planta con uniforme azul" width={1400} height={788} /></div>
        <div className="wrap ns-hero-in">
          <div className="ns-hero-txt">
            <span className="eyebrow">Nosotros</span>
            <h1>Hecho en México, para la gente que trabaja.</h1>
            <p className="lead">Creamos ADAMIA para que Recursos Humanos deje el papel y el Excel, y dedique su tiempo a lo que importa: su gente.</p>
            <div className="ctas">
              <Link className="btn btn-primary" href="/contacto">Platiquemos <Flecha /></Link>
              <Link className="btn btn-claro" href="/funcionalidades">Ver funciones</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ns-historia">
        <div className="wrap ns-dos">
          <div className="ns-bloque-txt">
            <span className="eyebrow">Nuestra historia</span>
            <h2>Nació de la experiencia real.</h2>
          </div>
          <div className="ns-parrafos">
            <p>ADAMIA nace de la experiencia de <b>Uniline</b> creando soluciones para empresas desde <b>Autlán de Navarro, Jalisco</b>.</p>
            <p>Vimos lo mismo una y otra vez: listas de asistencia en papel, permisos por mensaje, contratos vencidos sin que nadie se diera cuenta y horas extra que no cuadraban a fin de semana.</p>
            <p>Por eso hicimos una plataforma moderna, confiable y pensada para cómo se trabaja en México: en la planta, en la obra, en la sucursal y en campo.</p>
          </div>
        </div>
      </section>

      <section className="ns-mision">
        <div className="wrap">
          <span className="eyebrow">Misión</span>
          <p className="ns-cita">Que cada empresa mexicana tenga herramientas de primer nivel para cuidar el tiempo, los derechos y el crecimiento de su gente.</p>
        </div>
      </section>

      <section className="ns-hechos" aria-label="ADAMIA en cifras del producto">
        <div className="wrap ns-hechos-grid">
          {HECHOS.map((h) => (
            <div key={h.t}>
              <b>{h.n}</b>
              <span>{h.t}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ns-pilares">
        <div className="wrap ns-dos">
          <div className="ns-bloque-txt">
            <span className="eyebrow">Lo que nos guía</span>
            <h2>Seis pilares.</h2>
            <p>Así decidimos qué construir y cómo atenderte.</p>
          </div>
          <div className="ns-pilares-grid">
            {PILARES.map((p, i) => (
              <article key={p.t}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <b>{p.t}</b>
                <p>{p.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ns-foto-banda">
        <div className="wrap ns-dos">
          <img src="/landing/planta.webp" alt="Trabajadora de una planta checando su entrada desde el celular" width={1400} height={788} />
          <div className="ns-bloque-txt">
            <span className="eyebrow">Por qué ADAMIA</span>
            <h2>Hecho para la operación real.</h2>
            <ul className="ns-lista">
              <li><b>100 % enfocado en México:</b> la ley laboral, los festivos y la forma de trabajar de aquí.</li>
              <li><b>Soporte humano:</b> te acompañamos en la implementación y después.</li>
              <li><b>Todo en una cuenta:</b> asistencia, permisos, contratos, documentos y más, conectados.</li>
              <li><b>En el celular de tu gente:</b> checan, piden permisos y firman desde su teléfono.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="ns-final">
        <div className="wrap">
          <h2>¿Trabajamos juntos?</h2>
          <p>Te mostramos ADAMIA con tu información, sin compromiso.</p>
          <div className="ctas">
            <Link className="btn btn-primary" href="/contacto">Solicitar demo <Flecha /></Link>
            <Link className="btn btn-claro" href="/cotiza">Cotizar</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
