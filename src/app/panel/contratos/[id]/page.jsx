import DetalleContrato from "./DetalleContrato";

export const metadata = { title: "Contrato | ADAMIA" };

// (27/11/2026) Vista de detalle del contrato: la pantalla principal al abrir un contrato (antes era un diálogo).
export default async function PaginaContrato({ params }) {
  const { id } = await params;
  return <DetalleContrato id={id} />;
}
