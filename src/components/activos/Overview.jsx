"use client";
import { useActivos } from "./ActivosProvider";
import {
  ROOT,
  Heading,
  Panel,
  Stats,
  Badge,
  ResourceLink,
  Table,
  Empty,
} from "./ui";
import { assigned, outstanding, today } from "@/lib/activos/model.mjs";
import { ArrowUpRight } from "lucide-react";
export default function Overview() {
  const { state } = useActivos();
  const low = state.products.filter((p) => p.active && p.stock < p.minimum);
  const overdue = state.deliveries.filter(
    (d) =>
      d.status === "confirmed" &&
      d.due &&
      d.due < today() &&
      d.lines.some((l) => outstanding(l) > 0)
  );
  return (
    <>
      <Heading
        title="Control de Activos y Uniformes"
        subtitle="Inventario, entregas y devoluciones conectados al expediente del empleado."
      />
      <Stats
        items={[
          [
            "Activos disponibles",
            state.products
              .filter((p) => p.type === "asset")
              .reduce((s, p) => s + p.stock, 0),
          ],
          [
            "Activos asignados",
            state.products
              .filter((p) => p.type === "asset")
              .reduce((s, p) => s + assigned(state, p.id), 0),
          ],
          [
            "Uniformes disponibles",
            state.products
              .filter((p) => p.type === "uniform")
              .reduce((s, p) => s + p.stock, 0),
          ],
          ["Préstamos vencidos", overdue.length],
        ]}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Activos", "Equipos, herramientas y accesorios", "/activos"],
          ["Uniformes", "Prendas, tallas y existencias", "/uniformes"],
          [
            "Entregas y devoluciones",
            "Responsables y recepción parcial",
            "/entregas",
          ],
          ["Paquetes por puesto", "Prepara una dotación completa", "/paquetes"],
        ].map(([name, description, url]) => (
          <ResourceLink
            to={url}
            key={url}
            className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300"
          >
            <div className="flex justify-between font-semibold">
              {name}
              <ArrowUpRight size={17} className="text-blue-600" />
            </div>
            <p className="mt-2 text-xs text-slate-500">{description}</p>
          </ResourceLink>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Pendientes de atención">
          <div className="divide-y divide-slate-100">
            {[
              [
                "Acuses por confirmar",
                state.deliveries.filter(
                  (d) =>
                    d.status === "confirmed" && d.acknowledgement === "pending"
                ).length,
                "/resguardos",
              ],
              [
                "En revisión o mantenimiento",
                state.maintenance.filter((m) => m.status === "open").length,
                "/mantenimiento",
              ],
              [
                "Solicitudes del personal",
                state.requests.filter((r) => r.status === "pending").length,
                "/solicitudes",
              ],
              ["Devoluciones vencidas", overdue.length, "/devoluciones"],
            ].map(([label, n, url]) => (
              <ResourceLink
                to={url}
                key={url}
                className="flex items-center justify-between px-5 py-4"
              >
                <span>{label}</span>
                <Badge tone={n ? "amber" : "gray"}>{n}</Badge>
              </ResourceLink>
            ))}
          </div>
        </Panel>
        <Panel title="Uniformes por reponer">
          <Table headers={["Prenda / variante", "Disponible", "Mínimo"]}>
            {low.map((p) => (
              <tr key={p.id}>
                <td>
                  <ResourceLink
                    to={`/uniformes/${p.id}`}
                    className="font-medium text-blue-700"
                  >
                    {p.name}
                  </ResourceLink>
                  <p className="text-xs text-slate-500">{p.variant}</p>
                </td>
                <td>
                  <Badge tone="amber">{p.stock}</Badge>
                </td>
                <td>{p.minimum}</td>
              </tr>
            ))}
          </Table>
          {!low.length && <Empty>Existencias mínimas cubiertas.</Empty>}
        </Panel>
      </div>
      <div className="mt-5 flex flex-wrap gap-4 text-sm text-blue-700">
        <ResourceLink to="/empleados">
          Ver expedientes de demostración →
        </ResourceLink>
        <ResourceLink to="/movimientos">Consultar movimientos →</ResourceLink>
      </div>
    </>
  );
}
