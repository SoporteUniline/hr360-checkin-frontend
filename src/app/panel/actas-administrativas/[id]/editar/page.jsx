import { Suspense } from "react";
import PaginaActa from "../../formulario/PaginaActa";

export const metadata = { title: "Editar acta administrativa | ADAMIA" };

// (28/11/2026) Editar un acta en página (antes era la ventana NewActaModal en modo «edit»). ?volver= como en /nueva.
export default async function PaginaEditarActa({ params }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <PaginaActa id={id} />
    </Suspense>
  );
}
