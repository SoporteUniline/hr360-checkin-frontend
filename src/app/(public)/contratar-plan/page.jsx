import { Suspense } from "react";
import ContratarPlanContent from "./ContratarPlanContent";

export default function ContratarPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p>Cargando formulario...</p>
        </div>
      }
    >
      <ContratarPlanContent />
    </Suspense>
  );
}
