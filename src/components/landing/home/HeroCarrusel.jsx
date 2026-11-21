"use client";

// Carrusel de la portada: foto + frase + botones. Pasa solo cada 6 s, se pausa al pasar el cursor o con el
// botón (WCAG 2.2.2) y se mueve con las flechas o el teclado. Con «reducir movimiento» no avanza solo.
/* eslint-disable @next/next/no-img-element -- fotos ya optimizadas (webp) con efecto de acercamiento */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DIAPOSITIVAS } from "./diapositivas";

const CADA_MS = 6000;

export default function HeroCarrusel() {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [quieto, setQuieto] = useState(false);
  const total = DIAPOSITIVAS.length;
  const ir = useCallback((n) => setActual((n + total) % total), [total]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setQuieto(mq.matches);
    const cambio = (e) => setQuieto(e.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);

  useEffect(() => {
    if (pausado || quieto) return undefined;
    const t = window.setTimeout(() => ir(actual + 1), CADA_MS);
    return () => window.clearTimeout(t);
  }, [actual, pausado, quieto, ir]);

  const teclas = (e) => {
    if (e.key === "ArrowRight") ir(actual + 1);
    if (e.key === "ArrowLeft") ir(actual - 1);
  };

  return (
    <section
      className={`carr${pausado || quieto ? " parado" : ""}`}
      aria-roledescription="carrusel"
      aria-label="ADAMIA en pocas palabras"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onKeyDown={teclas}
    >
      {DIAPOSITIVAS.map((d, i) => {
        const Titulo = i === 0 ? "h1" : "h2";
        return (
          <div
            key={d.foto}
            className={`slide${i === actual ? " on" : ""}`}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={i !== actual}
          >
            <img src={d.foto} alt={d.alt} width={1400} height={788} loading={i === 0 ? "eager" : "lazy"} />
            <div className="slide-txt">
              <span className="eyebrow">{d.etiqueta}</span>
              <Titulo>
                {d.titulo.map((linea, k) => (
                  <span key={linea} className="l">
                    {k === d.titulo.length - 1 && d.marca ? (
                      <>
                        {linea.replace(d.marca, "")}
                        <span className="mark">{d.marca}</span>
                      </>
                    ) : (
                      linea
                    )}
                  </span>
                ))}
              </Titulo>
              <p className="lead">{d.texto}</p>
              <div className="ctas">
                <Link className="btn btn-primary" href={d.boton.href} tabIndex={i === actual ? 0 : -1}>
                  {d.boton.texto}
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <a className="btn btn-claro" href="#producto" tabIndex={i === actual ? 0 : -1}>
                  Ver cómo funciona
                </a>
              </div>
            </div>
          </div>
        );
      })}
      <div className="carr-ctl">
        <button type="button" className="carr-btn" aria-label="Anterior" onClick={() => ir(actual - 1)}>‹</button>
        <div className="carr-dots" role="tablist" aria-label="Elegir diapositiva">
          {DIAPOSITIVAS.map((d, i) => (
            <button
              key={d.foto}
              type="button"
              role="tab"
              aria-selected={i === actual}
              aria-label={`Ir a ${i + 1}: ${d.titulo.join(" ")}`}
              className={i === actual ? "on" : ""}
              onClick={() => ir(i)}
            >
              <i style={{ animationDuration: `${CADA_MS}ms` }} />
            </button>
          ))}
        </div>
        <button type="button" className="carr-btn" aria-label="Siguiente" onClick={() => ir(actual + 1)}>›</button>
        <button type="button" className="carr-btn" aria-label={pausado ? "Reanudar" : "Pausar"} onClick={() => setPausado((p) => !p)}>
          {pausado ? "▶" : "❚❚"}
        </button>
      </div>
    </section>
  );
}
