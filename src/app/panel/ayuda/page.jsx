import CentroAyudaApp from "@/components/ayuda/CentroAyudaApp";

// «Ayuda» del panel (RH, dueño y usuarios con acceso): guías filtradas por rol y por módulos encendidos.
export const metadata = { title: "Ayuda" };

export default function AyudaPanel() {
  return <CentroAyudaApp modo="panel" />;
}
