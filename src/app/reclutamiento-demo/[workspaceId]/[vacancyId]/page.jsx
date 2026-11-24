import { redirect } from "next/navigation";

// Enlace viejo de la vista de prueba: las vacantes reales viven en /vacante/<slug>; se manda a la bolsa de trabajo.
export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  redirect("/bolsa-de-trabajo");
}
