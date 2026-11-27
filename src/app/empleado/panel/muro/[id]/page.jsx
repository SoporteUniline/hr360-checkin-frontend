import DetallePost from "@/components/comunicados/DetallePost";

// Muro → una publicación: detalle, confirmar de leído y comentarios.
export default async function PaginaPublicacion({ params }) {
  const { id } = await params;
  return <DetallePost id={id} />;
}
