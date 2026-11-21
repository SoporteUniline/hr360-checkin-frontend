import { outfit } from "@/fonts";
import AvisoCookies from "@/components/legal/AvisoCookies";
import SitioEncabezado from "@/components/landing/home/SitioEncabezado";
import SitioPie from "@/components/landing/home/SitioPie";

// Páginas públicas (funciones, cotizar, contratar, contacto, legales…) con el mismo encabezado y pie que el
// inicio y el blog (21/11/2026). El contenido de cada página conserva sus estilos.

export default function LayoutPublico({ children }) {
  return (
    <div className={outfit.variable}>
      <div className="lh sitio-fijo">
        <SitioEncabezado />
      </div>
      <main>{children}</main>
      <div className="lh">
        <SitioPie />
      </div>
      <AvisoCookies />
    </div>
  );
}
