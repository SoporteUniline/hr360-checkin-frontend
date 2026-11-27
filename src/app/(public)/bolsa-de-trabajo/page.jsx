import "@/components/landing/home/landing-home.css";
import "./bolsa.css";
import BolsaTrabajo from "./BolsaTrabajo";

// Bolsa de trabajo v2 (27/11/2026): buscador, chips y lista + vacante elegida. Sin cifras ni testimonios sin fuente.
export const metadata = {
  title: "Bolsa de trabajo",
  description: "Encuentra tu próximo trabajo en México: vacantes de empresas que contratan con ADAMIA. Busca por puesto y lugar, y postúlate por WhatsApp o con un formulario corto desde tu celular.",
  alternates: { canonical: "/bolsa-de-trabajo" },
  openGraph: {
    title: "Bolsa de trabajo | ADAMIA",
    description: "Vacantes de empresas en México que contratan con ADAMIA. Postúlate desde tu celular.",
    url: "/bolsa-de-trabajo",
    siteName: "ADAMIA",
    locale: "es_MX",
    type: "website",
  },
};

export default function BolsaTrabajoPage() {
  return <BolsaTrabajo />;
}
