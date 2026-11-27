import DetalleIngreso from "@/components/induccion/DetalleIngreso";

// Nuevos ingresos → una persona: revisión de documentos, alta y checklist del primer día.
export const metadata = { title: "Nuevo ingreso | ADAMIA" };

export default async function PaginaDetalleIngreso({ params }) {
  const { id } = await params;
  return <DetalleIngreso id={id} />;
}
