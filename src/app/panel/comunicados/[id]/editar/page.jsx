import Redactar from "@/components/comunicados/Redactar";

export const metadata = { title: "Editar comunicado | ADAMIA" };

export default async function PaginaEditarComunicado({ params }) {
  const { id } = await params;
  return <Redactar id={id} />;
}
