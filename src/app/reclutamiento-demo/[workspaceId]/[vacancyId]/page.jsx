import { redirect } from "next/navigation";

// 03/12/2026: la vista de prueba (vacantes guardadas en el navegador) ya no existe; las vacantes son reales y su página
// es /vacante/<slug>. Un enlace viejo de prueba lleva a la bolsa de trabajo.
export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  redirect("/bolsa-de-trabajo");
}
