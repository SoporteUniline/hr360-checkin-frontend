"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useActivos } from "./ActivosProvider";
import {
  Heading,
  Panel,
  Field,
  Select,
  Textarea,
  Table,
  Badge,
  ResourceLink,
  SearchBox,
  matches,
  PagedRows,
  Empty,
  dateLabel,
  money,
  downloadCsv,
} from "./ui";
export function Movements() {
  const { state } = useActivos();
  const [q, setQ] = useState(""),
    [type, setType] = useState("");
  const rows = state.movements.filter(
    (m) =>
      (!type || m.type === type) &&
      matches(q, m.productName, m.employeeName, m.actor, m.note)
  );
  return (
    <>
      <Heading
        title="Movimientos"
        subtitle="Historial de entradas, entregas, devoluciones, ajustes y responsables."
      >
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv("movimientos.csv", [
              [
                "Fecha",
                "Movimiento",
                "Artículo",
                "Cantidad",
                "Empleado",
                "Responsable",
                "Motivo",
              ],
              ...rows.map((m) => [
                m.date,
                m.type,
                m.productName,
                m.qty,
                m.employeeName,
                m.actor,
                m.note,
              ]),
            ])
          }
        >
          Exportar CSV
        </Button>
      </Heading>
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Buscar artículo, persona o referencia…"
        />
        <div className="w-56">
          <Select
            aria-label="Tipo de movimiento"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Todos los movimientos</option>
            {[...new Set(state.movements.map((m) => m.type))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
      </div>
      <Panel>
        <Table
          headers={[
            "Fecha",
            "Movimiento",
            "Artículo / empleado",
            "Cantidad",
            "Responsable / motivo",
          ]}
        >
          <PagedRows
            rows={rows}
            columns={5}
            render={(m) => (
              <tr key={m.id}>
                <td>{dateLabel(m.date)}</td>
                <td>
                  <Badge tone={m.type === "Devolución" ? "green" : "blue"}>
                    {m.type}
                  </Badge>
                </td>
                <td>
                  <div className="font-medium">{m.productName}</div>
                  <p className="text-xs text-slate-500">
                    {m.employeeName || "Almacén"}
                  </p>
                </td>
                <td>{m.qty}</td>
                <td>
                  <div>{m.actor}</div>
                  <p className="max-w-sm whitespace-pre-wrap text-xs text-slate-500">
                    {m.note}
                  </p>
                </td>
              </tr>
            )}
          />
        </Table>
      </Panel>
    </>
  );
}

export function Maintenance() {
  const { state, execute } = useActivos();
  const [q, setQ] = useState(""),
    [modal, setModal] = useState(null),
    [form, setForm] = useState({});
  const product = (id) => state.products.find((p) => p.id === id);
  const rows = state.maintenance.filter((m) =>
    matches(q, product(m.productId)?.name, m.reason, m.supplier)
  );
  const set = (k, v) => setForm({ ...form, [k]: v });
  async function submit(e) {
    e.preventDefault();
    const result = await execute(
      modal === "new" ? "maintenance.open" : "maintenance.close",
      modal === "new" ? form : { ...form, id: modal }
    );
    if (result) setModal(null);
  }
  return (
    <>
      <Heading
        title="Revisión y mantenimiento"
        subtitle="Equipos fuera de disponibilidad hasta concluir su revisión."
      >
        <Button
          onClick={() => {
            setForm({
              productId:
                state.products.find((p) => p.active && p.stock > 0)?.id || "",
              qty: 1,
              reason: "",
              supplier: "",
              due: "",
            });
            setModal("new");
          }}
        >
          Registrar mantenimiento
        </Button>
      </Heading>
      <div className="mb-4">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Buscar equipo, motivo o proveedor…"
        />
      </div>
      <Panel>
        <Table
          headers={[
            "Artículo",
            "Motivo / proveedor",
            "Fechas",
            "Cantidad",
            "Estado / costo",
            "Acciones",
          ]}
        >
          <PagedRows
            rows={rows}
            columns={6}
            render={(m) => (
              <tr key={m.id}>
                <td>
                  <strong>{product(m.productId)?.name}</strong>
                  <p className="text-xs text-slate-500">
                    {product(m.productId)?.code}
                  </p>
                </td>
                <td>
                  <p>{m.reason}</p>
                  <p className="text-xs text-slate-500">{m.supplier}</p>
                  {m.resolution && (
                    <p className="mt-1 text-xs">{m.resolution}</p>
                  )}
                </td>
                <td className="text-xs">
                  Ingreso: {dateLabel(m.date)}
                  <br />
                  Previsto: {dateLabel(m.due)}
                </td>
                <td>{m.qty}</td>
                <td>
                  <Badge
                    tone={
                      m.status === "open"
                        ? "amber"
                        : m.status === "repaired"
                        ? "green"
                        : "gray"
                    }
                  >
                    {m.status === "open"
                      ? "En revisión"
                      : m.status === "repaired"
                      ? "Reparado"
                      : "Baja definitiva"}
                  </Badge>
                  <p className="mt-1 text-xs text-slate-500">{money(m.cost)}</p>
                </td>
                <td>
                  {m.status === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setForm({ outcome: "repaired", cost: 0, note: "" });
                        setModal(m.id);
                      }}
                    >
                      Concluir
                    </Button>
                  )}
                </td>
              </tr>
            )}
          />
        </Table>
      </Panel>
      <Dialog open={!!modal} onOpenChange={(v) => !v && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modal === "new"
                ? "Registrar mantenimiento"
                : "Concluir revisión"}
            </DialogTitle>
            <DialogDescription>
              La disponibilidad se actualiza con el resultado registrado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {modal === "new" ? (
              <>
                <Field label="Artículo disponible">
                  <Select
                    required
                    value={form.productId}
                    onChange={(e) => set("productId", e.target.value)}
                  >
                    <option value="">Selecciona…</option>
                    {state.products
                      .filter((p) => p.active && p.stock > 0)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.code}
                        </option>
                      ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Cantidad">
                    <Input
                      required
                      type="number"
                      min={1}
                      max={product(form.productId)?.stock}
                      step={1}
                      value={form.qty}
                      onChange={(e) => set("qty", e.target.value)}
                    />
                  </Field>
                  <Field label="Regreso previsto">
                    <Input
                      type="date"
                      value={form.due}
                      onChange={(e) => set("due", e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Proveedor o responsable">
                  <Input
                    value={form.supplier}
                    maxLength={100}
                    onChange={(e) => set("supplier", e.target.value)}
                  />
                </Field>
                <Field label="Motivo">
                  <Textarea
                    required
                    value={form.reason}
                    maxLength={1000}
                    onChange={(e) => set("reason", e.target.value)}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Resultado">
                  <Select
                    value={form.outcome}
                    onChange={(e) => set("outcome", e.target.value)}
                  >
                    <option value="repaired">Reparado → disponible</option>
                    <option value="retired">
                      No reparable → baja definitiva
                    </option>
                  </Select>
                </Field>
                <Field label="Costo (MXN)">
                  <Input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => set("cost", e.target.value)}
                  />
                </Field>
                <Field label="Trabajo realizado / motivo">
                  <Textarea
                    required
                    value={form.note}
                    maxLength={1000}
                    onChange={(e) => set("note", e.target.value)}
                  />
                </Field>
              </>
            )}
            <Button className="w-full" type="submit">
              Guardar resultado
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Kits() {
  const { state, execute } = useActivos();
  const [editing, setEditing] = useState(null),
    [form, setForm] = useState({ name: "", role: "", lines: [] }),
    [productId, setProductId] = useState("");
  function open(kit) {
    setForm(
      kit ? JSON.parse(JSON.stringify(kit)) : { name: "", role: "", lines: [] }
    );
    setEditing(kit?.id || "new");
  }
  async function save(e) {
    e.preventDefault();
    if (await execute("kit.save", form)) setEditing(null);
  }
  return (
    <>
      <Heading
        title="Paquetes por puesto"
        subtitle="Define dotaciones reutilizables; revisa talla y disponibilidad en cada entrega."
      >
        <Button onClick={() => open(null)}>Crear paquete</Button>
      </Heading>
      {!!state.mixedKits?.length && (
        <Panel title="Paquetes mixtos anteriores">
          <div className="p-4 text-sm text-slate-600">
            <p>
              Estos paquetes conservan equipos y uniformes. Crea una dotación
              separada en cada módulo para nuevas entregas.
            </p>
            <ul className="mt-2 list-disc pl-5">
              {state.mixedKits.map((k) => (
                <li key={k.id}>{k.name}</li>
              ))}
            </ul>
          </div>
        </Panel>
      )}
      {editing ? (
        <form onSubmit={save}>
          <Panel title={editing === "new" ? "Nuevo paquete" : "Editar paquete"}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Nombre">
                <Input
                  required
                  value={form.name}
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Puesto">
                <Select
                  value={form.roleId || ""}
                  onChange={(e) =>
                    setForm({ ...form, roleId: e.target.value || undefined })
                  }
                >
                  <option value="">Todos los puestos</option>
                  {state.roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Table headers={["Artículo", "Cantidad", "Acción"]}>
              {form.lines.map((l, n) => (
                <tr key={l.productId}>
                  <td>
                    {state.products.find((p) => p.id === l.productId)?.name}
                    <p className="text-xs text-slate-500">
                      {
                        state.products.find((p) => p.id === l.productId)
                          ?.variant
                      }
                    </p>
                  </td>
                  <td>
                    <Input
                      aria-label="Cantidad del paquete"
                      className="w-20"
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={l.qty}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((a, i) =>
                            i === n ? { ...a, qty: Number(e.target.value) } : a
                          ),
                        })
                      }
                    />
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          ...form,
                          lines: form.lines.filter((_, i) => i !== n),
                        })
                      }
                    >
                      Quitar
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
            <div className="flex flex-wrap items-end gap-3 border-t p-5">
              <div className="min-w-48 flex-1">
                <Field label="Agregar artículo">
                  <Select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    <option value="">Selecciona…</option>
                    {state.products
                      .filter(
                        (p) =>
                          p.active &&
                          !form.lines.some((l) => l.productId === p.id)
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.variant}
                        </option>
                      ))}
                  </Select>
                </Field>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!productId}
                onClick={() => {
                  setForm({
                    ...form,
                    lines: [...form.lines, { productId, qty: 1 }],
                  });
                  setProductId("");
                }}
              >
                Agregar
              </Button>
            </div>
            <div className="flex justify-end gap-2 border-t p-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar paquete</Button>
            </div>
          </Panel>
        </form>
      ) : (
        <Panel>
          <Table headers={["Paquete", "Puesto", "Artículos", "Acciones"]}>
            {state.kits.map((k) => (
              <tr key={k.id}>
                <td className="font-medium">{k.name}</td>
                <td>{k.role}</td>
                <td>
                  {k.lines.map((l) => (
                    <p key={l.productId} className="text-xs text-slate-500">
                      {l.qty} ×{" "}
                      {state.products.find((p) => p.id === l.productId)?.name}
                    </p>
                  ))}
                </td>
                <td>
                  <Button variant="outline" size="sm" onClick={() => open(k)}>
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
          {!state.kits.length && <Empty />}
        </Panel>
      )}
    </>
  );
}

export function Requests() {
  const { state, execute, self, resourceType } = useActivos();
  const [dialog, setDialog] = useState(null),
    [form, setForm] = useState({});
  async function submit(e) {
    e.preventDefault();
    if (
      await execute(dialog === "new" ? "request.create" : "request.resolve", {
        ...form,
        ...(dialog !== "new" ? { id: dialog, resolution: form.note } : {}),
      })
    )
      setDialog(null);
  }
  return (
    <>
      <Heading
        title="Solicitudes e incidencias"
        subtitle="Fallas, cambios de talla y reposiciones con seguimiento de RH."
      >
        <Button
          onClick={() => {
            setForm({
              employeeId: self ? state.employeeId : state.employees[0]?.id,
              kind:
                resourceType === "uniform"
                  ? "Cambio de talla"
                  : "Falla de equipo",
              note: "",
            });
            setDialog("new");
          }}
        >
          Registrar solicitud
        </Button>
      </Heading>
      <Panel>
        <Table
          headers={[
            "Empleado / fecha",
            "Tipo",
            "Solicitud",
            "Estado",
            "Respuesta",
          ]}
        >
          <PagedRows
            rows={state.requests}
            columns={5}
            render={(r) => (
              <tr key={r.id}>
                <td>
                  <ResourceLink
                    to={`/empleados/${r.employeeId}`}
                    className="text-blue-700"
                  >
                    {state.employees.find((e) => e.id === r.employeeId)?.name}
                  </ResourceLink>
                  <p className="text-xs text-slate-500">{dateLabel(r.date)}</p>
                </td>
                <td>{r.kind}</td>
                <td className="max-w-xs whitespace-pre-wrap">{r.note}</td>
                <td>
                  <Badge tone={r.status === "pending" ? "amber" : "green"}>
                    {r.status === "pending" ? "Pendiente" : "Atendida"}
                  </Badge>
                </td>
                <td>
                  {r.status === "pending" && !self ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setForm({ note: "" });
                        setDialog(r.id);
                      }}
                    >
                      Atender
                    </Button>
                  ) : (
                    <p className="max-w-xs text-xs">{r.resolution}</p>
                  )}
                </td>
              </tr>
            )}
          />
        </Table>
      </Panel>
      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "new"
                ? "Solicitud del empleado"
                : "Responder solicitud"}
            </DialogTitle>
            <DialogDescription>
              La solicitud no modifica existencias. Registra la entrega o
              devolución correspondiente cuando ocurra.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            {dialog === "new" && (
              <>
                <Field label="Empleado">
                  <Select
                    value={form.employeeId}
                    onChange={(e) =>
                      setForm({ ...form, employeeId: e.target.value })
                    }
                  >
                    {state.employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tipo">
                  <Select
                    value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  >
                    {[
                      "Falla de equipo",
                      "Cambio de talla",
                      "Reposición",
                      "Otro",
                    ]
                      .filter(
                        (t) =>
                          !resourceType ||
                          t === "Otro" ||
                          (resourceType === "uniform"
                            ? t !== "Falla de equipo"
                            : t === "Falla de equipo")
                      )
                      .map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                  </Select>
                </Field>
              </>
            )}
            <Field
              label={
                dialog === "new" ? "Descripción" : "Respuesta / resolución"
              }
            >
              <Textarea
                required
                maxLength={1500}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </Field>
            <Button className="w-full" type="submit">
              Guardar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
