/* eslint-disable @next/next/no-img-element -- imagen subida por el equipo de ADAMIA (S3), tamaño variable */
"use client";

import { useState } from "react";
import { enlaceConCupon, validoHasta } from "@/lib/popups/reglas.mjs";
import "./popup-venta.css";

// La imagen la entrega el backend (ruta relativa a NEXT_PUBLIC_RUTA_BACKEND); una vista previa local trae blob:.
const fuenteImagen = (url) => (url?.startsWith("/") ? `${process.env.NEXT_PUBLIC_RUTA_BACKEND ?? ""}${url}` : url);

// Tarjeta del pop-up. La usan la página pública (PopupVenta) y la vista previa del panel.
export default function PopupTarjeta({ popup, alCerrar, alClic, cerrarRef, vistaPrevia = false }) {
  const [copiado, setCopiado] = useState(false);
  const externo = /^https:\/\//i.test(popup.boton_url ?? "");
  const hasta = validoHasta(popup.fecha_fin);

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
          <img src={fuenteImagen(popup.imagen_url)} alt="" />
        </div>
      ) : null}
      <div className="pv-cuerpo">
        <h2 id="pv-titulo">{popup.titulo}</h2>
        {popup.texto ? <p>{popup.texto}</p> : null}
        {popup.cupon ? (
          <div className="pv-cupon">
            <span>Tu código</span>
            <b>{popup.cupon}</b>
            <button type="button" onClick={copiar} aria-live="polite">{copiado ? "¡Copiado!" : "Copiar"}</button>
          </div>
        ) : null}
        <a
          className="pv-boton"
          href={enlaceConCupon(popup.boton_url, popup.cupon)}
          onClick={vistaPrevia ? (e) => e.preventDefault() : alClic}
          {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {popup.boton_texto}
        </a>
        {hasta ? <small className="pv-vigencia">Válido hasta el {hasta}.</small> : null}
      </div>
    </div>
  );
}
