import { Suspense } from "react";
import PaginaActa from "../formulario/PaginaActa";

export const metadata = { title: "Nueva acta administrativa | ADAMIA" };

// (28/11/2026) Levantar un acta en página y por pasos (antes era la ventana NewActaModal). ?volver=<ruta> para regresar
// a donde estaba la persona al guardar o cancelar (por omisión, la lista de actas).
export default function PaginaNuevaActa() {
  return (
    <Suspense fallback={null}>
      <PaginaActa />
    </Suspense>
  );
}
