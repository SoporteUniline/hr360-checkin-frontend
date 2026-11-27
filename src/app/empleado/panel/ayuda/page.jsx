import CentroAyudaApp from "@/components/ayuda/CentroAyudaApp";

// «Ayuda» de Mi espacio (empleados y jefes): guías filtradas por rol y por módulos encendidos.
export const metadata = { title: "Ayuda" };

export default function AyudaEmpleado() {
  return <CentroAyudaApp modo="empleado" />;
}
