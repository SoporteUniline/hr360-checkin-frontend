import { Suspense } from "react";
import { ActivosProvider } from "@/components/activos/ActivosProvider";
import NavegacionActivos from "@/components/activos/NavegacionActivos";

// Activos y uniformes: un solo módulo con Inicio · Inventario · Personas y Ajustes.
export default function Layout({ children }) {
  return (
    <Suspense fallback={<p className="p-6 text-slate-500">Cargando activos y uniformes…</p>}>
      <ActivosProvider>
        <NavegacionActivos />
        {children}
      </ActivosProvider>
    </Suspense>
  );
}
