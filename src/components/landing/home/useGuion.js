"use client";

// Reloj de las escenas animadas de la portada (WhatsApp, Clima, Tablero, Muro). Reglas en ./guion.mjs.
// - El HTML del servidor trae el estado final; al hidratar, solo lo que está fuera de la vista vuelve al inicio.
// - Corre solo mientras la escena se ve (IntersectionObserver) y la pestaña está al frente; fuera de vista se pausa.
// - «Reducir movimiento»: se queda en el estado final y no hay botón.
// - Un solo temporizador por escena; todo se limpia al desmontar.
import { useCallback, useEffect, useRef, useState } from "react";
import { corre, espera, pasoInicial, repetir, siguiente, textoControl } from "./guion.mjs";

const consultaReducido = () => window.matchMedia?.("(prefers-reduced-motion: reduce)");

export default function useGuion({ total, duraciones, pausaFinal = 9000, vueltas = 3, umbral = 0.35 }) {
  const ref = useRef(null);
  const [estado, setEstado] = useState({ paso: total, vuelta: 0 });
  const [visible, setVisible] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [reducido, setReducido] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [listo, setListo] = useState(false);
  // Las duraciones pueden ser una función creada en cada render: se leen de una ref para no reiniciar el reloj.
  const durRef = useRef(duraciones);
  durRef.current = duraciones;

  useEffect(() => {
    const el = ref.current;
    const mq = consultaReducido();
    const red = mq?.matches ?? false;
    setReducido(red);
    const alCambiarMq = (e) => {
      setReducido(e.matches);
      if (e.matches) setEstado({ paso: total, vuelta: vueltas });
    };
    mq?.addEventListener?.("change", alCambiarMq);
    if (red || !el || !("IntersectionObserver" in window)) return () => mq?.removeEventListener?.("change", alCambiarMq);
    const r = el.getBoundingClientRect();
    const seVe = r.top < window.innerHeight && r.bottom > 0;
    setEstado({ paso: pasoInicial({ total, reducido: false, visible: seVe }), vuelta: 0 });
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: umbral });
    io.observe(el);
    const alOcultar = () => setOculto(document.hidden);
    document.addEventListener("visibilitychange", alOcultar);
    setListo(true);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", alOcultar);
      mq?.removeEventListener?.("change", alCambiarMq);
    };
  }, [total, umbral, vueltas]);

  useEffect(() => {
    if (!listo || !corre({ visible, pausado, reducido, oculto })) return undefined;
    const sig = siguiente(estado, { total, vueltas });
    if (!sig) return undefined;
    const ms = espera(estado.paso, { total, duraciones: durRef.current, pausaFinal });
    const id = window.setTimeout(() => setEstado(sig), ms);
    return () => window.clearTimeout(id);
  }, [estado, visible, pausado, reducido, oculto, listo, total, vueltas, pausaFinal]);

  const terminado = estado.paso >= total && !siguiente(estado, { total, vueltas });
  const control = textoControl({ reducido: reducido || !listo, pausado, terminado });
  const alControl = useCallback(() => {
    if (terminado) { setEstado(repetir({ vueltas })); setPausado(false); return; }
    setPausado((p) => !p);
  }, [terminado, vueltas]);

  return {
    ref,
    paso: estado.paso,
    total,
    // Clases para el CSS: fuera de vista o en pausa, también se detienen las animaciones CSS que se repiten.
    quieto: !corre({ visible, pausado, reducido: false, oculto }) || reducido,
    control,
    alControl,
  };
}
