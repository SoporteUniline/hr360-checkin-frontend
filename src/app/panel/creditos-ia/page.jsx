import { Suspense } from "react";
import CreditosIA from "@/components/ia/CreditosIA";

// Ajustes → Créditos de Adamia AI (25/11/2026). Dueño y RH.
export const metadata = { title: "Créditos de Adamia AI | ADAMIA" };

export default function PaginaCreditosIA() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Cargando…</p>}>
      <CreditosIA />
    </Suspense>
  );
}
