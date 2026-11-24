import PaginaDetalle from "@/components/landing/sitio/PaginaDetalle";
import { DETALLE } from "@/lib/sitio/detalles";

// Mismo estilo que el inicio. El contenido vive en src/lib/sitio/detalles.js.
export const metadata = {
  title: "Control de contratos laborales y vencimientos | ADAMIA",
  description: "Registra contratos con todas sus condiciones, recibe avisos antes de que venzan y fírmalos en línea.",
  alternates: { canonical: "/funcionalidades/contratos" },
};

export default function Pagina() {
  return <PaginaDetalle d={DETALLE["contratos"]} />;
}
