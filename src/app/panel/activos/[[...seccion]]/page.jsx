import { notFound } from "next/navigation";
import Overview from "@/components/activos/Overview";
import Inventory, { ProductForm, ProductDetail } from "@/components/activos/Inventory";
import Deliveries, { DeliveryForm, ReturnForm } from "@/components/activos/Deliveries";
import Employees, { EmployeeDetail } from "@/components/activos/Employees";
import Receipt from "@/components/activos/Receipt";
import { Movements, Maintenance, Requests } from "@/components/activos/Operations";
import Ajustes from "@/components/activos/Ajustes";
import FiltroTipo from "@/components/activos/FiltroTipo";
import { TIPO_DE_URL } from "@/lib/activos/module.mjs";

// Activos y uniformes (20/11/2026). Inicio · Inventario · Personas · Ajustes; el resto son pantallas a
// las que se llega desde esas (entregar, recibir, resguardos, revisión, solicitudes, historial).
const ID = /^[1-9]\d*$/;
const SIN_ID = {
  entregar: DeliveryForm,
  recibir: ReturnForm,
  entregas: Deliveries,
  revision: Maintenance,
  solicitudes: Requests,
  historial: Movements,
};

export default async function Page({ params, searchParams }) {
  const { seccion = [] } = await params;
  const { tipo } = await searchParams;
  const [vista, id, accion] = seccion;
  if (seccion.length > 3) notFound();
  if (!vista) return <Overview />;

  if (vista === "inventario") {
    const type = TIPO_DE_URL[tipo] ?? "asset";
    if (!id) return (<><FiltroTipo /><Inventory type={type} /></>);
    if (id === "nuevo" && !accion) return <ProductForm type={type} />;
    if (ID.test(id) && accion === "editar") return <ProductForm type={type} id={id} />;
    if (ID.test(id) && !accion) return <ProductDetail id={id} />;
    notFound();
  }
  if (vista === "ajustes") {
    if (accion) notFound();
    return <Ajustes seccion={id || "categorias"} />;
  }
  if (accion) notFound();
  if (vista === "personas") {
    if (!id) return <Employees />;
    if (ID.test(id)) return <EmployeeDetail id={id} />;
    notFound();
  }
  if (vista === "resguardos") {
    if (!id) return <Deliveries receipts />;
    if (ID.test(id)) return <Receipt id={id} />;
    notFound();
  }
  const Componente = SIN_ID[vista];
  if (!Componente || id) notFound();
  return <Componente />;
}
