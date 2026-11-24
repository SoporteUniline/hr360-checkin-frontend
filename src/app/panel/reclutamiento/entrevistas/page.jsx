import { redirect } from "next/navigation";
import { ENTREVISTAS_REAL } from "@/components/reclutamiento/navigation";

// «Entrevistas» abre la agenda real (citas por WhatsApp); un enlace a la maqueta anterior redirige aquí.
export const metadata = { title: "Entrevistas · Reclutamiento | ADAMIA" };
export default function Page() {
  redirect(ENTREVISTAS_REAL);
}
