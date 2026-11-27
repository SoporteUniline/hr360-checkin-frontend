import { permanentRedirect } from "next/navigation";

// (27/11/2026) «Capacitación» es ahora el Centro de ayuda. next.config.mjs ya redirige /capacitacion; esto cubre
// cualquier camino que llegue a la página.
export default function CapacitacionPage() {
  permanentRedirect("/ayuda");
}
