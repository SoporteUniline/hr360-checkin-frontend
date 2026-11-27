import { Suspense } from "react";
import BajaNoticias from "./BajaNoticias";

// Baja de las noticias de ADAMIA: el enlace que lleva cada correo (docs/prospectos.md del backend). No se indexa.
export const metadata = {
  title: "Dejar de recibir noticias | ADAMIA",
  description: "Date de baja de las noticias y promociones de ADAMIA.",
  robots: { index: false, follow: false },
};

export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <BajaNoticias />
    </Suspense>
  );
}
