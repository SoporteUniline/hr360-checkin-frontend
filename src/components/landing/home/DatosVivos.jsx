"use client";

// Datos de ejemplo que se mueven dentro de las mini pantallas del mosaico. El HTML del servidor trae el valor final:
// sin JS, antes de hidratar o con «reducir movimiento» todo se lee completo; solo lo que aún no se ve vuelve a su inicio.
import { useEffect, useRef, useState } from "react";
import { estadoInicial, formatoReloj, largoTexto, pasoFinal, segundosReloj, siguientePaso, textoParcial, valorContador } from "./datosVivos.mjs";

const reducido = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Evento que lanza MosaicoPlegable al abrir «Ver todos los módulos» en el celular.
export const EVENTO_ABIERTO = "mz-abierto";
// IntersectionObserver que pide una lectura nueva al abrir el mosaico en el celular: lo que estaba plegado (display:none)
// y ya quedó a la vista arranca en ese momento, sin esperar otro scroll. Devuelve la limpieza.
function observar(el, alCambiar, opciones) {
  const io = new IntersectionObserver(([e]) => alCambiar(e.isIntersecting), opciones);
  io.observe(el);
  const otraVez = () => { io.unobserve(el); io.observe(el); };
  window.addEventListener(EVENTO_ABIERTO, otraVez);
  return () => { io.disconnect(); window.removeEventListener(EVENTO_ABIERTO, otraVez); };
}

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
    // El aviso del observador siempre llega después de esta línea (es asíncrono): `suelta` ya existe.
    const suelta = observar(el, (visible) => {
      if (!visible) return;
      setFase("anima");
      suelta();
    }, { threshold: 0.5 });
    return suelta;
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
    const suelta = observar(ref.current, (visible) => (visible ? arranca() : para()));
    return () => { suelta(); para(); };
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

/**
 * Pequeño ciclo de estados dentro de una mini pantalla (una solicitud que se aprueba, el número del monitor que sube,
 * otra búsqueda en el Centro de ayuda…). Todos los estados ocupan la misma celda (grid), así cambiar no mueve nada (sin
 * CLS). El HTML del servidor y «reducir movimiento» muestran el último estado, que es el que describe la tarjeta; solo
 * corre mientras se ve (un intervalo que se detiene fuera de pantalla). La mini pantalla ya es aria-hidden.
 */
export function Ciclo({ estados, ms = 2800, bloque = false, className = "" }) {
  const ref = useRef(null);
  const total = estados.length;
  const [paso, setPaso] = useState(pasoFinal(total));
  useEffect(() => {
    if (total < 2 || reducido() || !("IntersectionObserver" in window)) return undefined;
    let id = null;
    const para = () => { window.clearInterval(id); id = null; };
    const arranca = () => { if (id === null) id = window.setInterval(() => setPaso((p) => siguientePaso(p, total)), ms); };
    const suelta = observar(ref.current, (visible) => (visible ? arranca() : para()), { threshold: 0.4 });
    return () => { suelta(); para(); };
  }, [total, ms]);
  return (
    <span ref={ref} className={`mz-ciclo${bloque ? " mz-ciclo-b" : ""}${className ? ` ${className}` : ""}`} data-paso={paso} data-n={total}>
      {estados.map((e, k) => <span key={k} className={k === paso ? "on" : undefined}>{e}</span>)}
    </span>
  );
}
