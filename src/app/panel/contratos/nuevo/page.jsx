import { Suspense } from "react";
import NuevoContrato from "./NuevoContrato";

export const metadata = { title: "Contrato nuevo | ADAMIA" };

// (27/11/2026) Alta en página con las mismas pestañas que editar: nuevo, ?duplicar=<id> (desde la lista) y
// ?empleado=&empresa=&sueldo=&periodicidad= («Crear contrato con este sueldo» desde la ficha).
export default function PaginaNuevoContrato() {
  return (
    <Suspense fallback={null}>
      <NuevoContrato />
    </Suspense>
  );
}
