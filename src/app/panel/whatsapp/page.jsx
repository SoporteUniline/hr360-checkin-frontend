import { Suspense } from "react";
import BandejaWhatsapp from "@/components/whatsapp/BandejaWhatsapp";

// Bandeja real de WhatsApp de reclutamiento (R1). Vive fuera de /panel/reclutamiento, que es el módulo demo.
export const metadata = { title: "Conversaciones de WhatsApp | ADAMIA" };

export default function PaginaWhatsapp() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Cargando…</p>}>
      <BandejaWhatsapp />
    </Suspense>
  );
}
