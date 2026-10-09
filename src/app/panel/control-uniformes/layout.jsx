import { Suspense } from "react";
import { ActivosProvider } from "@/components/activos/ActivosProvider";
export default function Layout({ children }) {
  return (
    <Suspense fallback={<p>Cargando uniformes…</p>}>
      <ActivosProvider>{children}</ActivosProvider>
    </Suspense>
  );
}
