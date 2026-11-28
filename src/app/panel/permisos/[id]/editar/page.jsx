import { Suspense } from "react";
import PaginaPermiso from "../../formulario/PaginaPermiso";

export const metadata = { title: "Editar permiso | ADAMIA" };

// (28/11/2026) Editar un permiso en página (antes era la ventana PermisoDialog): datos, estado y cancelación con días
// pasados. ?empresa= y ?volver= como en /panel/permisos/nuevo.
export default async function PaginaEditarPermiso({ params }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <PaginaPermiso id={id} />
    </Suspense>
  );
}
