import PaginaLegal from "@/components/landing/sitio/PaginaLegal";
import { AVISO_PRIVACIDAD, TERMINOS, AVISO_EMPLEADOS } from "@/lib/legal/documentos";

// Documento legal. El texto vive en src/lib/legal/documentos.js con su versión.
export const metadata = {
  title: "Aviso de privacidad | ADAMIA",
  description: "Cómo trata ADAMIA tus datos personales, para qué los usa, con quién los comparte y cómo ejercer tus derechos ARCO.",
  alternates: { canonical: "/aviso-privacidad" },
};

export default function Pagina() {
  return <PaginaLegal doc={AVISO_PRIVACIDAD} relacionados={[TERMINOS, AVISO_EMPLEADOS]} />;
}
