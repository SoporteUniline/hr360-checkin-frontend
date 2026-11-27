import { redirect } from "next/navigation";
import { RUTA_MURO_PANEL } from "@/lib/comunicados/comunicados.mjs";

// Comunicados abre en su primera pestaña, el muro (/panel/muro). La tabla está en /panel/comunicados/administrar.
export default function PaginaComunicados() {
  redirect(RUTA_MURO_PANEL);
}
