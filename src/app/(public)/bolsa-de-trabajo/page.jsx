import "@/components/landing/home/landing-home.css";
import "./bolsa.css";
import BolsaTrabajo from "./BolsaTrabajo";

// Bolsa de trabajo (rediseño 23/11/2026): mismo estilo que el inicio de ADAMIA. Sin la portada vieja de HR360 ni las
// cifras y testimonios sin fuente que tenía antes (300 empresas, 1000 vacantes, 5000 postulaciones).
export const metadata = {
  title: "Bolsa de trabajo",
  description: "Encuentra tu próximo trabajo en México: vacantes de empresas que contratan con ADAMIA. Busca por puesto y ubicación, y postúlate desde tu celular en minutos.",
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
  return (
    <div className="lh bt">
      <BolsaTrabajo />
    </div>
  );
}
