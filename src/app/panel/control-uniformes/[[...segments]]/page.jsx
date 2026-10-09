import { notFound } from "next/navigation";
import Overview from "@/components/activos/Overview";
import Inventory, {
  ProductForm,
  ProductDetail,
} from "@/components/activos/Inventory";
import Deliveries, {
  DeliveryForm,
  ReturnForm,
} from "@/components/activos/Deliveries";
import Employees, { EmployeeDetail } from "@/components/activos/Employees";
import Receipt from "@/components/activos/Receipt";
import Locations from "@/components/activos/Locations";
import Categories from "@/components/activos/Categories";
import {
  Movements,
  Maintenance,
  Requests,
  Kits,
} from "@/components/activos/Operations";
export default async function Page({ params }) {
  const { segments = [] } = await params;
  const [section, id, action] = segments;
  if (!section) return <Overview />;
  if (segments.length > 3) notFound();
  if (section === "prendas") {
    if (!id) return <Inventory type="uniform" />;
    if (id === "nuevo" && !action) return <ProductForm type="uniform" />;
    if (/^[1-9]\d*$/.test(id)) {
      if (action === "editar") return <ProductForm type="uniform" id={id} />;
      if (!action) return <ProductDetail id={id} />;
    }
    notFound();
  }
  if (action) notFound();
  if (section === "entregas" && id === "nueva") return <DeliveryForm />;
  if (section === "resguardos" && /^[1-9]\d*$/.test(id || ""))
    return <Receipt id={id} />;
  if (section === "empleados" && /^[1-9]\d*$/.test(id || ""))
    return <EmployeeDetail id={id} />;
  if (id) notFound();
  const pages = {
    entregas: Deliveries,
    devoluciones: ReturnForm,
    empleados: Employees,
    ubicaciones: Locations,
    categorias: Categories,
    movimientos: Movements,
    mantenimiento: Maintenance,
    solicitudes: Requests,
    paquetes: Kits,
  };
  if (section === "resguardos") return <Deliveries receipts />;
  const Component = pages[section];
  if (!Component) notFound();
  return <Component />;
}
