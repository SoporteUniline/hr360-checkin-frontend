"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActivos } from "./ActivosProvider";
import {
  Heading,
  Panel,
  Table,
  Field,
  Textarea,
  Badge,
  Empty,
  SearchBox,
  matches,
} from "./ui";
export default function Categories() {
  const { state, execute, resourceType } = useActivos();
  const [form, setForm] = useState(null),
    [q, setQ] = useState("");
  const title =
    resourceType === "uniform"
      ? "Categorías de uniformes"
      : "Categorías de activos";
  async function save(e) {
    e.preventDefault();
    if (await execute("category.save", { ...form, type: resourceType }))
      setForm(null);
  }
  return (
    <>
      <Heading
        title={title}
        subtitle="Organiza tu catálogo con categorías propias de la empresa."
      >
        <Button
          disabled={!state.catalogReady}
          onClick={() => setForm({ name: "", description: "", active: true })}
        >
          Agregar categoría
        </Button>
      </Heading>
      {!state.catalogReady ? (
        <Panel>
          <Empty>
            El catálogo de categorías está pendiente de activación. Los
            artículos existentes conservan su categoría.
          </Empty>
        </Panel>
      ) : (
        <>
          {form && (
            <form onSubmit={save} className="mb-5">
              <Panel title={form.id ? "Editar categoría" : "Nueva categoría"}>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <Field label="Nombre">
                    <Input
                      required
                      maxLength={100}
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Descripción">
                    <Textarea
                      maxLength={500}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        setForm({ ...form, active: e.target.checked })
                      }
                    />
                    Disponible para nuevos artículos
                  </label>
                </div>
                <div className="flex justify-end gap-2 border-t p-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm(null)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar categoría</Button>
                </div>
              </Panel>
            </form>
          )}
          <div className="mb-4">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Buscar categoría…"
            />
          </div>
          <Panel>
            <Table
              headers={[
                "Categoría",
                "Descripción",
                "Artículos",
                "Estado",
                "Acciones",
              ]}
            >
              {state.categories
                .filter((c) => matches(q, c.name, c.description))
                .map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.description || "—"}</td>
                    <td>
                      {
                        state.products.filter((p) => p.categoryId === c.id)
                          .length
                      }
                    </td>
                    <td>
                      <Badge tone={c.active ? "green" : "gray"}>
                        {c.active ? "Activa" : "Archivada"}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setForm({ ...c })}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
            </Table>
            {!state.categories.length && (
              <Empty>
                Agrega tu primera categoría para organizar el inventario.
              </Empty>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
