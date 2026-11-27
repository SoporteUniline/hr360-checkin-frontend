"use client";

// Carrusel de la portada a todo lo ancho: fondo de color sólido, frase + botones a la izquierda y la foto
// en la mitad derecha fundiéndose con el fondo. Pasa solo cada 6 s, se pausa al pasar el cursor o con el
// botón (WCAG 2.2.2) y se mueve con las flechas, el teclado o deslizando el dedo. Con «reducir movimiento» no avanza solo.
// Lo usan la portada (diapositivasPortada, cambio con fundido) y la bolsa de trabajo (`desliza`: las diapositivas se recorren
// de lado a lado). Cada diapositiva puede traer `secundario` (botón claro); `null` lo quita.
/* eslint-disable @next/next/no-img-element -- fotos ya optimizadas (webp) con efecto de acercamiento */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const CADA_MS = 6000;
const SECUNDARIO = { texto: "Ver cómo funciona", href: "#producto" };
const UMBRAL_DEDO = 40; // px de deslizamiento horizontal para cambiar de diapositiva

export default function HeroCarrusel({
  diapositivas,
  etiqueta = "ADAMIA en pocas palabras",
  className = "",
  primerTitulo = "h1",
  desliza = false,
}) {
  const [actual, setActual] = useState(0);
  // Tres motivos para detenerse: el botón (o tocar en celular), el cursor encima y el foco del teclado dentro.
  const [manual, setManual] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [foco, setFoco] = useState(false);
  const pausado = manual || sobre || foco;
  const [quieto, setQuieto] = useState(false);
  const dedo = useRef(null);
  const total = diapositivas.length;
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

  // Tocar pausa el avance; deslizar a un lado cambia de diapositiva (solo si el gesto es más horizontal que vertical).
  const tocar = (e) => {
    const t = e.touches[0];
    dedo.current = { x: t.clientX, y: t.clientY };
    setManual(true);
  };
  const enfocar = (e) => {
    let teclado = true;
    try { teclado = e.target.matches(":focus-visible"); } catch { /* navegador sin :focus-visible */ }
    if (teclado) setFoco(true);
  };
  const desenfocar = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setFoco(false);
  };
  const soltar = (e) => {
    const ini = dedo.current;
    dedo.current = null;
    const t = e.changedTouches[0];
    if (!ini || !t) return;
    const dx = t.clientX - ini.x;
    if (Math.abs(dx) >= UMBRAL_DEDO && Math.abs(dx) > Math.abs(t.clientY - ini.y)) ir(actual + (dx < 0 ? 1 : -1));
  };

  return (
    <section
      className={`carr${desliza ? " desliza" : ""}${pausado || quieto ? " parado" : ""}${className ? ` ${className}` : ""}`}
      aria-roledescription="carrusel"
      aria-label={etiqueta}
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
      onFocus={enfocar}
      onBlur={desenfocar}
      onKeyDown={teclas}
      onTouchStart={tocar}
      onTouchEnd={soltar}
    >
      {diapositivas.map((d, i) => {
        const Titulo = i === 0 ? primerTitulo : "h2";
        const sec = d.secundario === undefined ? SECUNDARIO : d.secundario;
        return (
          <div
            key={d.id ?? d.foto}
            className={`slide${i === actual ? " on" : ""}`}
            style={{ "--fondo": d.fondo, "--pos": i - actual }}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={i !== actual}
          >
            <div className="slide-foto">
              <img
                src={d.foto}
                alt={d.alt}
                width={1400}
                height={788}
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
            <div className="slide-in">
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
                  <Link
                    className="btn btn-primary"
                    href={d.boton.href}
                    tabIndex={i === actual ? 0 : -1}
                  >
                    {d.boton.texto}
                    <svg
                      width={18}
                      height={18}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                  {sec ? (
                    <Link
                      className="btn btn-claro"
                      href={sec.href}
                      tabIndex={i === actual ? 0 : -1}
                    >
                      {sec.texto}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="carr-ctl">
        <div
          className="carr-dots"
          role="tablist"
          aria-label="Elegir diapositiva"
        >
          {diapositivas.map((d, i) => (
            <button
              key={d.id ?? d.foto}
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
        <button
          type="button"
          className="carr-btn pausa"
          aria-label={manual ? "Reanudar" : "Pausar"}
          onClick={() => setManual((p) => !p)}
        >
          {manual ? "▶" : "❚❚"}
        </button>
        <button
          type="button"
          className="carr-btn ant"
          aria-label="Anterior"
          onClick={() => ir(actual - 1)}
        >
          ←
        </button>
        <button
          type="button"
          className="carr-btn"
          aria-label="Siguiente"
          onClick={() => ir(actual + 1)}
        >
          →
        </button>
      </div>
    </section>
  );
}
