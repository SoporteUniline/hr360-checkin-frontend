/* eslint-disable @next/next/no-img-element -- imagen subida por el equipo de ADAMIA (S3), tamaño variable */
"use client";

import { useState } from "react";
import "./popup-venta.css";

// Tarjeta del pop-up. La usan la página pública (PopupVenta) y la vista previa del panel.
export default function PopupTarjeta({ popup, alCerrar, alClic, cerrarRef, vistaPrevia = false }) {
  const [copiado, setCopiado] = useState(false);
  const externo = /^https:\/\//i.test(popup.boton_url ?? "");

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(popup.cupon);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className={`pv-tarjeta${popup.imagen_url ? " con-imagen" : ""}`}>
      <button ref={cerrarRef} type="button" className="pv-cerrar" aria-label="Cerrar" onClick={alCerrar}>
        ×
      </button>
      {popup.imagen_url ? (
        <div className="pv-imagen">
          <img src={popup.imagen_url} alt="" />
        </div>
      ) : null}
      <div className="pv-cuerpo">
        <h2 id="pv-titulo">{popup.titulo}</h2>
        {popup.texto ? <p>{popup.texto}</p> : null}
        {popup.cupon ? (
          <div className="pv-cupon">
            <span>Usa el código</span>
            <b>{popup.cupon}</b>
            <button type="button" onClick={copiar}>{copiado ? "¡Copiado!" : "Copiar"}</button>
          </div>
        ) : null}
        <a
          className="pv-boton"
          href={popup.boton_url}
          onClick={vistaPrevia ? (e) => e.preventDefault() : alClic}
          {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {popup.boton_texto}
        </a>
      </div>
    </div>
  );
}
