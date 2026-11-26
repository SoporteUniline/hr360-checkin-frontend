import IntegracionesEmpresa from "@/components/integraciones/IntegracionesEmpresa";

// Ajustes → Integraciones (solo el dueño): llaves de API de la empresa. Ver src/components/integraciones.
export const metadata = { title: "Integraciones | ADAMIA" };

export default function PaginaIntegraciones() {
  return <IntegracionesEmpresa />;
}
