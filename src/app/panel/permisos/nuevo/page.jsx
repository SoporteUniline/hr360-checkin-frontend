import { Suspense } from "react";
import PaginaPermiso from "../formulario/PaginaPermiso";

export const metadata = { title: "Nuevo permiso | ADAMIA" };

// (28/11/2026) Alta de permisos en página (antes era la ventana PermisoDialog). ?empresa=<id> (unidad elegida en la
// lista) y ?volver=<ruta> (a dónde regresar al guardar o cancelar; por omisión la lista de Permisos).
export default function PaginaNuevoPermiso() {
  return (
    <Suspense fallback={null}>
      <PaginaPermiso />
    </Suspense>
  );
}
