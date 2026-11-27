import "@/components/landing/home/landing-home.css";
import "../../bolsa-de-trabajo/bolsa.css";
import FormularioEntrevista from "./FormularioEntrevista";

// Lumo fase B2 (25/11/2026): formulario de la entrevista por enlace. El agente de WhatsApp (o RH desde la ficha) manda
// /postular/<token> para que el candidato llene o corrija sus datos y suba documentos. No se indexa: es personal.
export const metadata = {
  title: "Completa tu solicitud | ADAMIA",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function Pagina({ params }) {
  const { token } = await params;
  return <FormularioEntrevista token={token} />;
}
