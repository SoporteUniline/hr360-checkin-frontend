import PaginaDetalle from "@/components/landing/sitio/PaginaDetalle";
import { DETALLE } from "@/lib/sitio/detalles";

// Rediseño del 21/11/2026 al estilo del inicio. El contenido vive en src/lib/sitio/detalles.js.
export const metadata = {
  title: "Gestión de colaboradores y expediente digital | ADAMIA",
  description: "Ficha completa, expediente 360°, altas y bajas con historial, campos personalizados y portal del empleado.",
  alternates: { canonical: "/funcionalidades/colaboradores" },
};

export default function Pagina() {
  return <PaginaDetalle d={DETALLE["colaboradores"]} />;
}
