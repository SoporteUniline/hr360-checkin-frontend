import { Suspense } from "react";
import TableroCumplimiento from "@/components/expediente/TableroCumplimiento";

// (28/11/2026) Gestión de personal → Expediente y cumplimiento: lo que exige la ley a cada persona y quién está más
// incompleto. Ver src/components/expediente y hr360-checkin-backend/docs/expediente-ley.md.
export const metadata = { title: "Expediente y cumplimiento | ADAMIA" };

export default function PaginaExpediente() {
  return (
    <Suspense>
      <TableroCumplimiento />
    </Suspense>
  );
}
