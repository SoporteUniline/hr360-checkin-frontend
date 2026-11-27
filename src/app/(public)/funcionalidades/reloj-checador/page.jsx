import PaginaDetalle from "@/components/landing/sitio/PaginaDetalle";
import { DETALLE } from "@/lib/sitio/detalles";

// Mismo estilo que el inicio. El contenido vive en src/lib/sitio/detalles.js.
export const metadata = {
  title: "Reloj checador con reconocimiento facial y GPS | ADAMIA",
  description: "Checador desde el celular o tablet con reconocimiento facial, geocerca GPS y checada con QR o código. Horas trabajadas y extra listas para tu nómina.",
  alternates: { canonical: "/funcionalidades/reloj-checador" },
};

export default function Pagina() {
  return <PaginaDetalle d={DETALLE["reloj-checador"]} />;
}
