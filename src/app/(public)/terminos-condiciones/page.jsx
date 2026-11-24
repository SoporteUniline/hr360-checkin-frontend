import PaginaLegal from "@/components/landing/sitio/PaginaLegal";
import { TERMINOS, AVISO_PRIVACIDAD, AVISO_EMPLEADOS } from "@/lib/legal/documentos";

// Documento legal. El texto vive en src/lib/legal/documentos.js con su versión.
export const metadata = {
  title: "Términos y condiciones | ADAMIA",
  description: "Condiciones de uso de la plataforma ADAMIA: servicio, precio y pago, cancelación, datos de los empleados y responsabilidad.",
  alternates: { canonical: "/terminos-condiciones" },
};

export default function Pagina() {
  return <PaginaLegal doc={TERMINOS} relacionados={[AVISO_PRIVACIDAD, AVISO_EMPLEADOS]} />;
}
