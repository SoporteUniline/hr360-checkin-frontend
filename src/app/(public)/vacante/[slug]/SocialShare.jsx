"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { Check, Link2 } from "lucide-react";

import {
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  WhatsappIcon,
  WhatsappShareButton,
  EmailIcon,
  EmailShareButton,
} from "react-share";

// Compartir la vacante con el puesto y la empresa. Redes más usadas por candidatos en México y «Copiar enlace».
export default function SocialShare({ titulo = "" }) {
  const location = usePathname();
  const [copiado, setCopiado] = React.useState(false);
  const sharedUrl = `${process.env.NEXT_PUBLIC_RUTA_DOMAIN || ""}${location}`;
  const texto = titulo ? `Vacante: ${titulo}` : "Vacante en la bolsa de trabajo de ADAMIA";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(sharedUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="vc-compartir">
      <span id="vc-compartir-t">Compartir vacante</span>
      <div role="group" aria-labelledby="vc-compartir-t">
        <WhatsappShareButton url={sharedUrl} title={texto} aria-label="Compartir por WhatsApp">
          <WhatsappIcon size={40} round />
        </WhatsappShareButton>
        <FacebookShareButton url={sharedUrl} hashtag="#empleo" aria-label="Compartir en Facebook">
          <FacebookIcon size={40} round />
        </FacebookShareButton>
        <LinkedinShareButton url={sharedUrl} title={texto} aria-label="Compartir en LinkedIn">
          <LinkedinIcon size={40} round />
        </LinkedinShareButton>
        <EmailShareButton url={sharedUrl} subject={texto} aria-label="Compartir por correo">
          <EmailIcon size={40} round />
        </EmailShareButton>
        <button type="button" className="vc-copiar" onClick={copiar} aria-label={copiado ? "Enlace copiado" : "Copiar enlace"}>
          {copiado ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        </button>
      </div>
      <span className="sr-only" role="status">{copiado ? "Enlace copiado" : ""}</span>
    </div>
  );
}
