"use client";

// Número de una escena (useGuion): cuenta de `desde` a `hasta` cuando la escena lo activa y vuelve a `desde` al
// repetir. Lo que ya estaba activo al montar (HTML del servidor, «reducir movimiento») no se anima. Ancho fijo con
// tabular-nums (CSS .nv-cifra) para que contar no mueva nada.
import { useEffect, useRef, useState } from "react";
import { valorContador } from "./datosVivos.mjs";

export default function Cifra({ hasta, desde = 0, activo, ms = 1100, formato = (n) => n }) {
  const [valor, setValor] = useState(activo ? hasta : desde);
  const antes = useRef(activo);
  useEffect(() => {
    const eraActivo = antes.current;
    antes.current = activo;
    if (!activo) { setValor(desde); return undefined; }
    if (eraActivo) { setValor(hasta); return undefined; }
    let id = 0;
    let t0 = null;
    const paso = (t) => {
      t0 ??= t;
      const p = Math.min(1, (t - t0) / ms);
      setValor(desde + valorContador(hasta - desde, p));
      if (p < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [activo, desde, hasta, ms]);
  return <span className="nv-cifra">{formato(valor)}</span>;
}
