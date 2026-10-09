"use client";
import { useState } from "react";
import { useActivos } from "./ActivosProvider";
import { Heading, Panel, Field, Select, Table, Empty } from "./ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function Locations() {
  const { state, execute, busy } = useActivos();
  const [form, setForm] = useState(null);
  async function save(e) {
    e.preventDefault();
    if (
      await execute("location.save", {
        ...form,
        branchId: form.branchId || undefined,
      })
    )
      setForm(null);
  }
  return (
    <>
      <Heading
        title="Ubicaciones de inventario"
        subtitle="Almacenes y puntos de entrega vinculados a las sucursales de la empresa."
      >
        <Button
          onClick={() => setForm({ name: "", branchId: "", description: "" })}
        >
          Agregar ubicación
        </Button>
      </Heading>
      {form && (
        <form onSubmit={save} className="mb-5">
          <Panel title={form.id ? "Editar ubicación" : "Nueva ubicación"}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Nombre">
                <Input
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Sucursal">
                <Select
                  value={form.branchId || ""}
                  onChange={(e) =>
                    setForm({ ...form, branchId: e.target.value })
                  }
                >
                  <option value="">Sin sucursal específica</option>
                  {state.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Descripción">
                <Input
                  maxLength={1500}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(null)}
              >
                Cancelar
              </Button>
              <Button disabled={busy} type="submit">
                Guardar ubicación
              </Button>
            </div>
          </Panel>
        </form>
      )}
      <Panel>
        <Table headers={["Ubicación", "Sucursal", "Descripción", "Acciones"]}>
          {state.locations.map((l) => (
            <tr key={l.id}>
              <td className="font-medium">{l.name}</td>
              <td>
                {state.branches.find((b) => b.id === l.branchId)?.name || "—"}
              </td>
              <td>{l.description || "—"}</td>
              <td>
                <Button variant="outline" size="sm" onClick={() => setForm(l)}>
                  Editar
                </Button>
              </td>
            </tr>
          ))}
        </Table>
        {!state.locations.length && (
          <Empty>
            Registra tu primer almacén para comenzar a cargar inventario.
          </Empty>
        )}
      </Panel>
    </>
  );
}
