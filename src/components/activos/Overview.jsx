"use client";
import { useActivos } from "./ActivosProvider";
import { Heading, Panel, Stats, Badge, ResourceLink, Table, Empty } from "./ui";
import { assigned, outstanding, today } from "@/lib/activos/model.mjs";
import { ArrowUpRight } from "lucide-react";
// Inicio de «Activos y uniformes» (20/11/2026): lo que requiere atención hoy y accesos a lo más usado.
export default function Overview() {
  const { state } = useActivos();
  const inventario = (p) => `/${p.type === "uniform" ? "uniformes" : "activos"}`;
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
        title="Activos y uniformes"
        subtitle="Equipos y prendas del personal: qué hay, quién lo tiene y qué falta atender."
      />
      <Stats
        items={[
          ["Disponibles", state.products.reduce((s, p) => s + p.stock, 0)],
          ["Entregados", state.products.reduce((s, p) => s + assigned(state, p.id), 0)],
          ["Por reponer", low.length],
          ["Devoluciones vencidas", overdue.length],
        ]}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Entregar", "Busca a la persona y elige artículos o un paquete", "/entregas/nueva"],
          ["Recibir devolución", "Lo que regresa: bueno, dañado o perdido", "/devoluciones"],
          ["Inventario", "Activos y prendas con sus existencias", "/activos"],
          ["Historial", "Todos los movimientos del inventario", "/movimientos"],
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
        <Panel title="Existencias por reponer">
          <Table headers={["Artículo", "Disponible", "Mínimo"]}>
            {low.map((p) => (
              <tr key={p.id}>
                <td>
                  <ResourceLink
                    to={`${inventario(p)}/${p.id}`}
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
    </>
  );
}
