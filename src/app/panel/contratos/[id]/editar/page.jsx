import FormularioContrato from "../../formulario/FormularioContrato";

export const metadata = { title: "Editar contrato | ADAMIA" };

// (27/11/2026) Editar el contrato en página (antes era una ventana que se veía con campos en blanco: INC-CONTRATO-EDITAR-001).
export default async function PaginaEditarContrato({ params }) {
  const { id } = await params;
  return <FormularioContrato modo="editar" id={id} />;
}
