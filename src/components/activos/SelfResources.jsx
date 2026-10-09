"use client";
import { useActivos } from "./ActivosProvider";
import { EmployeeResources } from "./Employees";
import { Requests } from "./Operations";
import { DeliveryStatus } from "./Deliveries";
import { Heading, Panel, Table, ResourceLink, Empty, dateLabel } from "./ui";
export default function SelfResources() {
  const { state } = useActivos();
  return (
    <div className="space-y-6">
      <Heading
        title="Mis activos y uniformes"
        subtitle="Consulta lo que recibiste, confirma tus entregas y solicita atención a Recursos Humanos."
      />
      <Panel title="Mis resguardos">
        <Table headers={["Folio", "Fecha", "Estado", "Acciones"]}>
          {state.deliveries.map((d) => (
            <tr key={d.id}>
              <td>{d.folio}</td>
              <td>{dateLabel(d.date)}</td>
              <td>
                <DeliveryStatus d={d} />
              </td>
              <td>
                <ResourceLink
                  to={`/resguardos/${d.id}`}
                  className="font-medium text-blue-700"
                >
                  {d.acknowledgement === "pending" && d.status === "confirmed"
                    ? "Ver y confirmar"
                    : "Ver resguardo"}
                </ResourceLink>
              </td>
            </tr>
          ))}
        </Table>
        {!state.deliveries.length && (
          <Empty>Todavía no tienes entregas registradas.</Empty>
        )}
      </Panel>
      <EmployeeResources employeeId={state.employeeId} type="asset" />
      <EmployeeResources employeeId={state.employeeId} type="uniform" />
      <Requests />
    </div>
  );
}
