import { notFound } from "next/navigation";
import RecruitmentModule from "@/components/reclutamiento/RecruitmentModule";
import { reclutamientoHabilitado } from "@/lib/modulos/menu.mjs";

// Reclutamiento depende del módulo de la empresa (GuardaModulo en panel/layout.jsx muestra el aviso si está
// apagado). NEXT_PUBLIC_RECRUITMENT_ENABLED solo queda como interruptor global de emergencia: "false" lo oculta para todos.
export default function RecruitmentLayout({ children }) {
  if (!reclutamientoHabilitado(process.env.NEXT_PUBLIC_RECRUITMENT_ENABLED)) {
    notFound();
  }

  return <RecruitmentModule>{children}</RecruitmentModule>;
}
