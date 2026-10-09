import { Suspense } from "react";
import { ActivosProvider } from "@/components/activos/ActivosProvider";
export default function Layout({ children }) {
  return (
    <Suspense fallback={<p>Cargando recursos…</p>}>
      <ActivosProvider self>{children}</ActivosProvider>
    </Suspense>
  );
}
