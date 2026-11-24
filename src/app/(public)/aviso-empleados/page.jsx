import PaginaLegal from "@/components/landing/sitio/PaginaLegal";
import { AVISO_EMPLEADOS, AVISO_PRIVACIDAD, TERMINOS } from "@/lib/legal/documentos";

// Documento legal. El texto vive en src/lib/legal/documentos.js con su versión.
export const metadata = {
  title: "Aviso de privacidad para empleados (plantilla) | ADAMIA",
  description: "Plantilla de aviso de privacidad para que las empresas que usan ADAMIA informen a su personal, incluido el reconocimiento facial.",
  alternates: { canonical: "/aviso-empleados" },
};

export default function Pagina() {
  return <PaginaLegal doc={AVISO_EMPLEADOS} relacionados={[AVISO_PRIVACIDAD, TERMINOS]} />;
}
