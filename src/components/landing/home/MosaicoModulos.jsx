// Mosaico de módulos. Inspirado en la sección de módulos de Crehana: tarjeta principal grande con degradado de marca y
// las demás en gris suave; cada una con nombre, submarca «adamia ___.», dos líneas de beneficio, flecha a su página y una
// mini pantalla del producto dibujada con código (datos de ejemplo). Estilo favorito del dueño:
// docs/estilo-mosaico-favorito.md. Estilos en ./landing-home.css (bloque «Mosaico de módulos», todo bajo .lh .mz).
//
// Componente de SERVIDOR (lo monta src/app/(landing)/page.jsx y llega a LandingHome como prop): el marcado de las 24
// tarjetas no viaja en el JavaScript de la portada; solo hidratan los datos vivos (DatosVivos.jsx) y el botón del
// celular (MosaicoPlegable.jsx). Lista y textos: ./mosaico.mjs; mini pantallas: ./MinisMosaico.jsx.
import Link from "next/link";
import { GRUPOS, TARJETAS, TOTAL_TARJETAS, tarjetasDeGrupo } from "./mosaico.mjs";
import { ChatIA, MINIS } from "./MinisMosaico";
import MosaicoPlegable from "./MosaicoPlegable";

// Ritmo de la flotación: cada mini pantalla con su duración y desfase para que no vayan sincronizadas.
const FLOTA = [["6.4s", "-1.2s"], ["5.6s", "-3.1s"], ["6.6s", "-2.2s"], ["7.3s", "-0.9s"], ["6.2s", "-3.6s"], ["7.1s", "-0.4s"], ["6s", "-4.2s"], ["6.8s", "-2.5s"]];
// Posición de cada tarjeta en la lista completa (escalona la flotación).
const ORDEN = new Map(TARJETAS.map((c, i) => [c.id, i]));
// Sin JavaScript se ven todas (el botón no serviría).
const SIN_JS = ".lh .mz-mas{display:grid!important}.lh .mz-vertodos{display:none!important}";

function Flecha({ href, nombre }) {
  return (
    <Link className="mz-flecha" href={href} aria-label={`Conocer ${nombre}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
    </Link>
  );
}

function Cabecera({ c }) {
  return (
    <div className="mz-cab">
      <h4>{c.nombre}{c.etiqueta ? <span className="mz-etq">{c.etiqueta}</span> : null}</h4>
      <div className="mz-sub"><b>adamia</b> {c.sub}.</div>
      <p>{c.texto}</p>
    </div>
  );
}

function Tarjeta({ c, k }) {
  const clases = ["mz-m", `mz-${c.ancho}`, c.estilo ? `mz-${c.estilo}` : "", c.movil ? "" : "mz-mas", "reveal"].filter(Boolean).join(" ");
  const [ft, fd] = FLOTA[k % FLOTA.length];
  const Mini = MINIS[c.id];
  return (
    <article className={clases} data-tarjeta={c.id}>
      <Cabecera c={c} />
      <Flecha href={c.href} nombre={c.aria} />
      {c.estilo === "ia" ? (
        <div className="mz-chat flota" style={{ "--ft": "7.6s", "--fd": "-1.8s" }}><ChatIA /></div>
      ) : (
        <div className="mz-mini flota" style={{ "--ft": ft, "--fd": fd }} aria-hidden="true"><Mini /></div>
      )}
    </article>
  );
}

export default function MosaicoModulos() {
  return (
    <section className="mz" id="modulos-adamia" aria-labelledby="mz-titulo">
      <div className="wrap">
        <div className="txt reveal mz-encabezado">
          <span className="eyebrow">Módulos</span>
          <h2 id="mz-titulo">Todo el día de tu equipo, en una sola plataforma.</h2>
          <p>Del checador a la nómina, del reclutamiento al clima laboral, con IA que conoce la Ley Federal del Trabajo. Activa solo lo que tu empresa necesita.</p>
        </div>
        <noscript><style>{SIN_JS}</style></noscript>
        <MosaicoPlegable total={TOTAL_TARJETAS}>
          {GRUPOS.map((g) => {
            const tarjetas = tarjetasDeGrupo(g.id);
            return (
              <div key={g.id} className="mz-grupo" role="group" aria-labelledby={`mz-g-${g.id}`}>
                <div className="mz-grupo-cab reveal">
                  <h3 id={`mz-g-${g.id}`}>{g.titulo}</h3>
                  <p>{g.lema}</p>
                  <span className="mz-cuenta">{tarjetas.length} {tarjetas.length === 1 ? "módulo" : "módulos"}</span>
                </div>
                <div className="mz-grid">
                  {tarjetas.map((c) => <Tarjeta key={c.id} c={c} k={ORDEN.get(c.id)} />)}
                </div>
              </div>
            );
          })}
        </MosaicoPlegable>
      </div>
    </section>
  );
}

