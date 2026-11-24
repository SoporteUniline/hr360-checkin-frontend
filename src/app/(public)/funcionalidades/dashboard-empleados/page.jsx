import PaginaDetalle from "@/components/landing/sitio/PaginaDetalle";
import { DETALLE } from "@/lib/sitio/detalles";

// Mismo estilo que el inicio. El contenido vive en src/lib/sitio/detalles.js.
export const metadata = {
  title: "Panel de asistencia de empleados en tiempo real | ADAMIA",
  description: "Presentes, tardanzas, ausencias, permisos y contratos por vencer de tu empresa en una sola pantalla.",
  alternates: { canonical: "/funcionalidades/dashboard-empleados" },
};

export default function Pagina() {
  return <PaginaDetalle d={DETALLE["dashboard-empleados"]} />;
}
