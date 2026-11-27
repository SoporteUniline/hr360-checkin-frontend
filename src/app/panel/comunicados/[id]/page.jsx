import Seguimiento from "@/components/comunicados/Seguimiento";

export const metadata = { title: "Seguimiento de lectura | ADAMIA" };

export default async function PaginaSeguimiento({ params }) {
  const { id } = await params;
  return <Seguimiento id={id} />;
}
