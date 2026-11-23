import { redirect } from "next/navigation";
import { ENTREVISTAS_REAL } from "@/components/reclutamiento/navigation";

// 23/11/2026: «Entrevistas» abre la agenda real (citas por WhatsApp). La maqueta (InterviewsPage, datos de ejemplo) ya no
// se muestra: quien llegue con un enlace viejo pasa a la agenda real.
export const metadata = { title: "Entrevistas · Reclutamiento | ADAMIA" };
export default function Page() {
  redirect(ENTREVISTAS_REAL);
}
