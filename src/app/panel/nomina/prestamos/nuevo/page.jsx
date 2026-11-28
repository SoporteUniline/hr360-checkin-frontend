import { Suspense } from "react";
import RegistrarPrestamo from "@/components/nomina/RegistrarPrestamo";

export const metadata = { title: "Registrar préstamo | ADAMIA" };

// (27/11/2026) Registrar un préstamo es una página, no una ventana (docs/vistas-de-detalle.md, regla 7).
// ?empresa=<id> llega desde la lista de Préstamos.
export default function PaginaRegistrarPrestamo() {
  return (
    <Suspense fallback={null}>
      <RegistrarPrestamo />
    </Suspense>
  );
}
