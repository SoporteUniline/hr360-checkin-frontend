"use client";
import { useActivos } from "./ActivosProvider";
import { Heading, Panel, Stats, Badge, ResourceLink, Table, Empty } from "./ui";
import { assigned, outstanding, today } from "@/lib/activos/model.mjs";
import { ArrowUpRight } from "lucide-react";
export default function Overview() {
  const { state, resourceType } = useActivos();
  const uniform = resourceType === "uniform";
  const inventory = uniform ? "/uniformes" : "/activos";
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
        title={uniform ? "Control de Uniformes" : "Control de Activos"}
        subtitle={
          uniform
            ? "Prendas, tallas, entregas y reposiciones del personal."
            : "Equipos, responsables, préstamos y mantenimiento."
        }
      />
      <Stats
        items={[
          [
            uniform ? "Prendas disponibles" : "Activos disponibles",
            state.products.reduce((s, p) => s + p.stock, 0),
          ],
          [
            uniform ? "Prendas entregadas" : "Activos asignados",
            state.products.reduce((s, p) => s + assigned(state, p.id), 0),
          ],
          [
            uniform ? "Prendas por reponer" : "En mantenimiento",
            uniform
              ? low.length
              : state.maintenance.filter((m) => m.status === "open").length,
          ],
          ["Devoluciones vencidas", overdue.length],
        ]}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            uniform ? "Prendas y existencias" : "Inventario de activos",
            uniform
              ? "Tallas, colores y cantidades"
              : "Equipos, herramientas y números de serie",
            inventory,
          ],
          [
            "Nueva entrega",
            "Selecciona al empleado y los artículos",
            "/entregas/nueva",
          ],
          [
            uniform ? "Dotaciones por puesto" : "Paquetes de equipo",
            "Prepara la entrega por puesto",
            "/paquetes",
          ],
          ["Categorías", "Organiza el catálogo de la empresa", "/categorias"],
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
                uniform ? "Prendas en revisión" : "En revisión o mantenimiento",
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
        <Panel
          title={uniform ? "Uniformes por reponer" : "Existencias por reponer"}
        >
          <Table headers={["Artículo", "Disponible", "Mínimo"]}>
            {low.map((p) => (
              <tr key={p.id}>
                <td>
                  <ResourceLink
                    to={`${inventory}/${p.id}`}
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
          {uniform
            ? "Ver uniformes por empleado →"
            : "Ver activos por empleado →"}
        </ResourceLink>
        <ResourceLink to="/movimientos">Consultar movimientos →</ResourceLink>
      </div>
    </>
  );
}
