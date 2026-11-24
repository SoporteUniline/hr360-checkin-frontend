"use client";

// Datos de ejemplo que se mueven dentro de las mini pantallas del mosaico. El HTML del servidor trae el valor final:
// sin JS, antes de hidratar o con «reducir movimiento» todo se lee completo; solo lo que aún no se ve vuelve a su inicio.
import { useEffect, useRef, useState } from "react";
import { estadoInicial, formatoReloj, largoTexto, segundosReloj, textoParcial, valorContador } from "./datosVivos.mjs";

const reducido = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Fase de entrada: "final" (valor completo), "espera" (fuera de vista, en su inicio) o "anima" (ya entró en pantalla).
function useEntrada() {
  const ref = useRef(null);
  const [fase, setFase] = useState("final");
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return undefined;
    const r = el.getBoundingClientRect();
    if (estadoInicial({ reducido: reducido(), visible: r.top < window.innerHeight && r.bottom > 0 }) === "final") return undefined;
    setFase("espera");
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setFase("anima");
      io.disconnect();
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, fase, setFase];
}

// Corre fn(progreso 0..1) en cada cuadro durante ms; devuelve la limpieza para el efecto.
function cuadros(ms, fn, alTerminar) {
  let id = 0;
  let t0 = null;
  const paso = (t) => {
    t0 ??= t;
    const p = (t - t0) / ms;
    fn(p);
    if (p < 1) id = requestAnimationFrame(paso);
    else alTerminar?.();
  };
  id = requestAnimationFrame(paso);
  return () => cancelAnimationFrame(id);
}

/** Reloj de jornada decorativo: un solo intervalo, activo solo mientras se ve y calculado con el tiempo real. */
export function RelojJornada({ inicio }) {
  const ref = useRef(null);
  const [seg, setSeg] = useState(inicio);
  useEffect(() => {
    const desde = Date.now();
    let id = null;
    const tic = () => setSeg(segundosReloj(inicio, desde, Date.now()));
    const para = () => { window.clearInterval(id); id = null; };
    const arranca = () => { if (id === null) { tic(); id = window.setInterval(tic, 1000); } };
    if (!("IntersectionObserver" in window)) { arranca(); return para; }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? arranca() : para()));
    io.observe(ref.current);
    return () => { io.disconnect(); para(); };
  }, [inicio]);
  return <b ref={ref} className="mz-reloj" aria-hidden="true">{formatoReloj(seg)}</b>;
}

/** Número que sube hasta su valor al entrar en pantalla (ancho reservado con tabular-nums y min-width en CSS). */
export function Contador({ hasta, sufijo = "" }) {
  const [ref, fase] = useEntrada();
  const [valor, setValor] = useState(hasta);
  useEffect(() => {
    if (fase === "espera") setValor(0);
    if (fase !== "anima") return undefined;
    return cuadros(1400, (p) => setValor(valorContador(hasta, p)));
  }, [fase, hasta]);
  return <b ref={ref} className="mz-num">{valor}{sufijo}</b>;
}

/** Barra que se llena al entrar en pantalla: escala en X (solo transform) hasta valor (0..1). */
export function BarraLlena({ valor }) {
  const [ref, fase] = useEntrada();
  return <div ref={ref} className="mz-barra"><i className={fase === "espera" ? "mz-vacia" : undefined} style={{ "--v": valor }} /></div>;
}

/**
 * Respuesta de Adamia AI que se escribe sola. El lector de pantalla recibe el texto completo una vez (sr-only) y la
 * escritura es aria-hidden. El texto final invisible reserva el alto de la burbuja: escribir no desplaza nada (sin CLS).
 * children (la cita) y «✓ Listo» aparecen con opacidad al terminar.
 */
export function EscrituraIA({ partes, children }) {
  const [ref, fase, setFase] = useEntrada();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (fase !== "anima") return undefined;
    const total = largoTexto(partes);
    return cuadros(total * 32, (p) => setN(Math.round(total * Math.min(1, p))), () => setFase("final"));
  }, [fase, partes, setFase]);
  const pinta = (lista) => lista.map((p, i) => (p.b ? <b key={i}>{p.texto}</b> : <span key={i}>{p.texto}</span>));
  const escribiendo = fase !== "final";
  return (
    <span ref={ref} className={`mz-escribe${escribiendo ? " mz-tecleando" : ""}`}>
      <span className="sr-only">{partes.map((p) => p.texto).join("")}</span>
      <span className="mz-capas" aria-hidden="true">
        <span className="mz-completo">{pinta(partes)}</span>
        {escribiendo ? <span className="mz-parcial">{pinta(textoParcial(partes, n))}</span> : null}
      </span>
      <span className="mz-pie">{children}<span className="mz-listo" aria-hidden="true">✓ Listo</span></span>
    </span>
  );
}
