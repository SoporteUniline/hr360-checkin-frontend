import PaginaDetalle from "@/components/landing/sitio/PaginaDetalle";
import { DETALLE } from "@/lib/sitio/detalles";

// Mismo estilo que el inicio. El contenido vive en src/lib/sitio/detalles.js.
export const metadata = {
  title: "Avisos automáticos y aprobación por WhatsApp | ADAMIA",
  description: "Correos automáticos de retardos, faltas, contratos, cumpleaños y aniversarios, y aprobación de permisos desde WhatsApp.",
  alternates: { canonical: "/funcionalidades/notificaciones-reglas" },
};

export default function Pagina() {
  return <PaginaDetalle d={DETALLE["notificaciones-reglas"]} />;
}
