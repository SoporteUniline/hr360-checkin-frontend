"use client";
// Acomodo del reloj de la empresa según el tamaño de la pantalla (kiosco, 26/11/2026). Solo presentación.
//  - escritorio: pantalla o monitor horizontal (≥ 1280 × 600): hora y métodos a la izquierda, cámara al centro y «Hoy» a la derecha.
//  - tableta: de 768 px de ancho en adelante (horizontal o vertical): la cámara arriba y los controles abajo.
//  - bajo: celular acostado (menos de 500 px de alto): controles a la izquierda y cámara a la derecha.
//  - celular: vertical angosto: hora arriba, cámara en medio y controles abajo.
import { useEffect, useState } from "react";

export function disposicionPara(ancho, alto) {
  if (ancho > alto && alto < 500) return "bajo";
  if (ancho > alto && ancho >= 1280 && alto >= 600) return "escritorio";
  if (ancho >= 768) return "tableta";
  return "celular";
}

const medir = () => (typeof window === "undefined" ? { disposicion: "escritorio", horizontal: true } : {
  disposicion: disposicionPara(window.innerWidth, window.innerHeight),
  horizontal: window.innerWidth > window.innerHeight,
});

export function useDisposicionKiosco() {
  const [valor, setValor] = useState(medir);
  useEffect(() => {
    const cambiar = () => setValor((actual) => {
      const nuevo = medir();
      return nuevo.disposicion === actual.disposicion && nuevo.horizontal === actual.horizontal ? actual : nuevo;
    });
    cambiar();
    window.addEventListener("resize", cambiar);
    return () => window.removeEventListener("resize", cambiar);
  }, []);
  return valor;
}
