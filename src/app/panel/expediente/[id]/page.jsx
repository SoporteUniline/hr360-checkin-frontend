import { Suspense } from "react";
import ExpedientePersona from "@/components/expediente/ExpedientePersona";

// (28/11/2026) Expediente por etapas de una persona (Ingreso, Durante la relación, Salida), lista de ley y exportación.
export const metadata = { title: "Expediente | ADAMIA" };

export default async function PaginaExpedientePersona({ params }) {
  const { id } = await params;
  return (
    <Suspense>
      <ExpedientePersona id={id} />
    </Suspense>
  );
}
