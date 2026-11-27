"use client";

// En el celular el mosaico muestra primero 8 tarjetas (las marcadas `movil` en mosaico.mjs) y un botón «Ver todos los
// módulos (N)» que abre el resto; en tableta y escritorio el botón no aparece y se ven todas (CSS, sin medir pantalla).
// El HTML del servidor ya trae todas las tarjetas (buscadores y lectores de pantalla las tienen); sin JavaScript un
// <noscript> las muestra todas. Al abrir, el foco pasa a la primera tarjeta que estaba oculta.
import { useRef, useState } from "react";
import { EVENTO_ABIERTO } from "./DatosVivos";

export default function MosaicoPlegable({ total, children }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);
  const abrir = () => {
    setAbierto(true);
    // Después de pintar: los datos vivos y el flotado vuelven a medir si se ven (EVENTO_ABIERTO) y la primera tarjeta que
    // estaba oculta recibe el foco (su flecha) y queda a la vista.
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event(EVENTO_ABIERTO));
      caja.current?.querySelector(".mz-mas .mz-flecha")?.focus();
    });
  };
  return (
    <div ref={caja} id="mz-todas" className={`mz-plegable${abierto ? " mz-abierto" : ""}`}>
      {children}
      {abierto ? null : (
        <button type="button" className="mz-vertodos" aria-expanded="false" aria-controls="mz-todas" onClick={abrir}>
          Ver todos los módulos ({total})
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      )}
    </div>
  );
}
