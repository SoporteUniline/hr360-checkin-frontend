"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useSnackbar } from "notistack";
import { useActivos } from "./ActivosProvider";
import {
  kitLines,
  employeeLines,
  outstanding,
  today,
} from "@/lib/activos/model.mjs";
import {
  ROOT,
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
} from "./ui";
export function DeliveryStatus({ d }) {
  return (
    <Badge
      tone={
        d.status === "cancelled"
          ? "gray"
          : d.acknowledgement === "accepted"
          ? "green"
          : "amber"
      }
    >
      {d.status === "cancelled"
        ? "Revertida"
        : d.acknowledgement === "accepted"
        ? "Recibido"
        : d.acknowledgement === "difference"
        ? "Con diferencia"
        : "Pendiente de acuse"}
    </Badge>
  );
}
export default function Deliveries({ receipts = false }) {
  const { state } = useActivos();
  const [q, setQ] = useState("");
  const rows = state.deliveries.filter((d) =>
    matches(q, d.folio, d.employee.name, d.employee.role)
  );
  return (
    <>
      <Heading
        title={receipts ? "Resguardos" : "Entregas"}
        subtitle="Cada entrega conserva sus artículos, responsable y acuse."
      >
        <Button variant="outline" asChild>
          <ResourceLink to="/devoluciones">Registrar devolución</ResourceLink>
        </Button>
        <Button asChild>
          <ResourceLink to="/entregas/nueva">
            <Plus size={16} />
            Nueva entrega
          </ResourceLink>
        </Button>
      </Heading>
      <div className="mb-4">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Buscar folio, empleado o puesto…"
        />
      </div>
      <Panel>
        <Table
          headers={[
            "Folio / fecha",
            "Empleado",
            "Unidades",
            "Por devolver",
            "Estado",
            "Acciones",
          ]}
        >
          <PagedRows
            rows={rows}
            columns={6}
            render={(d) => (
              <tr key={d.id}>
                <td>
                  <div className="font-semibold">{d.folio}</div>
                  <p className="text-xs text-slate-500">{dateLabel(d.date)}</p>
                </td>
                <td>
                  <ResourceLink
                    to={`/empleados/${d.employeeId}`}
                    className="text-blue-700"
                  >
                    {d.employee.name}
                  </ResourceLink>
                  <p className="text-xs text-slate-500">{d.employee.role}</p>
                </td>
                <td>{d.lines.reduce((n, l) => n + l.qty, 0)}</td>
                <td>
                  {d.status === "cancelled"
                    ? 0
                    : d.lines
                        .filter((l) => l.snapshot.returnable)
                        .reduce((n, l) => n + outstanding(l), 0)}
                </td>
                <td>
                  <DeliveryStatus d={d} />
                </td>
                <td>
                  <ResourceLink
                    to={`/resguardos/${d.id}`}
                    className="font-medium text-blue-700"
                  >
                    Ver resguardo
                  </ResourceLink>
                </td>
              </tr>
            )}
          />
        </Table>
      </Panel>
    </>
  );
}

export function DeliveryForm() {
  const { state, execute, company } = useActivos();
  const search = useSearchParams(),
    router = useRouter(),
    { enqueueSnackbar } = useSnackbar();
  const [employeeId, setEmployeeId] = useState(
    search.get("empleado") || state.employees[0]?.id || ""
  );
  const [lines, setLines] = useState(() => {
    const p = state.products.find(
      (p) => p.id === search.get("articulo") && p.stock > 0 && p.active
    );
    return p ? [{ productId: p.id, qty: 1 }] : [];
  });
  const [productId, setProductId] = useState(""),
    [kit, setKit] = useState(state.kits[0]?.id || ""),
    [mode, setMode] = useState("Asignación"),
    [due, setDue] = useState(""),
    [note, setNote] = useState(""),
    [saving, setSaving] = useState(false);
  const employee = state.employees.find((e) => e.id === employeeId);
  const available = state.products.filter(
    (p) => p.active && p.stock > 0 && !lines.some((l) => l.productId === p.id)
  );
  function add() {
    const id = productId || available[0]?.id;
    if (id && available.some((p) => p.id === id)) {
      setLines([...lines, { productId: id, qty: 1 }]);
      setProductId("");
    }
  }
  function submit(e) {
    e.preventDefault();
    setSaving(true);
    const r = execute("delivery.create", {
      employeeId,
      mode,
      due,
      note,
      lines,
    });
    if (r) router.push(`${ROOT}/resguardos/${r.id}?empresa=${company.id}`);
    else setSaving(false);
  }
  return (
    <>
      <Heading
        title="Nueva entrega"
        subtitle="Equipos y uniformes en un mismo resguardo, separados en el expediente."
      />
      <form onSubmit={submit}>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-5">
            <Panel title="1. Empleado y modalidad">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Empleado">
                  <Select
                    required
                    value={employeeId}
                    onChange={(e) => {
                      setEmployeeId(e.target.value);
                      setLines([]);
                    }}
                  >
                    <option value="">Selecciona…</option>
                    {state.employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                        {e.demo ? " · Demo" : " · Prueba local"}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Modalidad">
                  <Select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    <option>Asignación</option>
                    <option>Préstamo</option>
                  </Select>
                </Field>
                {mode === "Préstamo" && (
                  <Field label="Fecha prevista de devolución">
                    <Input
                      type="date"
                      min={today()}
                      required
                      value={due}
                      onChange={(e) => setDue(e.target.value)}
                    />
                  </Field>
                )}
                <p className="text-xs text-slate-500 sm:col-span-2">
                  {employee?.role} · {employee?.department} · Talla{" "}
                  {employee?.size || "por confirmar"}
                </p>
              </div>
            </Panel>
            <Panel title="2. Artículos a entregar">
              <div className="flex flex-wrap items-end gap-2 border-b p-4">
                <div className="min-w-40 flex-1">
                  <Field label="Paquete por puesto">
                    <Select
                      value={kit}
                      onChange={(e) => setKit(e.target.value)}
                    >
                      {state.kits.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!kit || !employee}
                  onClick={() => {
                    const list = kitLines(state, kit, employeeId);
                    setLines(list);
                    enqueueSnackbar(
                      list.length
                        ? "Se agregaron solo los artículos disponibles que le faltan. Revisa cantidades y tallas."
                        : "El empleado ya tiene la dotación o no hay existencias disponibles.",
                      { variant: "info" }
                    );
                  }}
                >
                  Cargar paquete
                </Button>
              </div>
              <Table headers={["Artículo", "Disponible", "Cantidad", "Quitar"]}>
                {lines.map((l, n) => {
                  const p = state.products.find((p) => p.id === l.productId);
                  return (
                    <tr key={l.productId}>
                      <td>
                        <strong>{p.name}</strong>
                        <p className="text-xs text-slate-500">
                          {p.code} · {p.variant}
                        </p>
                        <p className="text-xs text-slate-400">
                          {p.returnable ? "Retornable" : "Sin devolución"}
                        </p>
                      </td>
                      <td>{p.stock}</td>
                      <td>
                        <Input
                          aria-label={`Cantidad de ${p.name}`}
                          className="w-20"
                          required
                          type="number"
                          min={1}
                          step={1}
                          max={p.stock}
                          readOnly={p.type === "asset"}
                          value={l.qty}
                          onChange={(e) =>
                            setLines(
                              lines.map((a, i) =>
                                i === n
                                  ? { ...a, qty: Number(e.target.value) }
                                  : a
                              )
                            )
                          }
                        />
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Quitar ${p.name}`}
                          onClick={() =>
                            setLines(lines.filter((_, i) => i !== n))
                          }
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </Table>
              {!lines.length && (
                <Empty>Agrega artículos o carga un paquete del puesto.</Empty>
              )}
              <div className="flex flex-wrap items-end gap-2 border-t p-4">
                <div className="min-w-40 flex-1">
                  <Field label="Agregar artículo disponible">
                    <Select
                      value={productId || available[0]?.id || ""}
                      onChange={(e) => setProductId(e.target.value)}
                    >
                      {!available.length && (
                        <option value="">Sin artículos disponibles</option>
                      )}
                      {available.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.variant} · {p.code}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!available.length}
                  onClick={add}
                >
                  Agregar
                </Button>
              </div>
            </Panel>
            <Panel title="3. Condición de entrega">
              <div className="p-5">
                <Field label="Observaciones y accesorios">
                  <Textarea
                    maxLength={1500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ej. Sin golpes. Cargador registrado como artículo independiente."
                  />
                </Field>
              </div>
            </Panel>
          </div>
          <aside className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Resumen
            </p>
            <p className="my-3 text-3xl font-semibold">
              {lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)}{" "}
              <span className="text-sm font-normal">unidades</span>
            </p>
            <p className="font-semibold">
              {employee?.name || "Selecciona empleado"}
            </p>
            <p className="text-xs text-slate-500">{employee?.role}</p>
            <div className="my-4 border-t" />
            <p className="text-xs text-slate-500">
              Al confirmar se descontará la existencia de la demo y se generará
              el resguardo.
            </p>
            <Button
              className="mt-5 w-full"
              disabled={saving || !lines.length || !employee}
              type="submit"
            >
              Confirmar entrega
            </Button>
            <Button className="mt-2 w-full" variant="ghost" asChild>
              <ResourceLink to="/entregas">Cancelar</ResourceLink>
            </Button>
          </aside>
        </div>
      </form>
    </>
  );
}

export function ReturnForm() {
  const { state, execute } = useActivos();
  const search = useSearchParams();
  const [employeeId, setEmployeeId] = useState(
    search.get("empleado") || state.employees[0]?.id || ""
  );
  const [selected, setSelected] = useState({}),
    [note, setNote] = useState("");
  const rows = employeeLines(state, employeeId).filter(
    (l) => l.pending > 0 && l.snapshot.returnable
  );
  function change(id, key, value) {
    setSelected((prev) => ({
      ...prev,
      [id]: { qty: 0, condition: "good", ...prev[id], [key]: value },
    }));
  }
  function submit(e) {
    e.preventDefault();
    const lines = rows
      .filter((l) => Number(selected[l.id]?.qty) > 0)
      .map((l) => ({
        deliveryId: l.delivery.id,
        lineId: l.id,
        ...selected[l.id],
        qty: Number(selected[l.id].qty),
      }));
    if (execute("delivery.return", { employeeId, lines, note })) {
      setSelected({});
      setNote("");
    }
  }
  return (
    <>
      <Heading
        title="Devoluciones y recepción"
        subtitle="Recibe todo o una parte; el resto permanece a cargo del empleado."
      />
      <form onSubmit={submit}>
        <Panel title="Seleccionar empleado">
          <div className="max-w-lg p-5">
            <Field label="Empleado">
              <Select
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  setSelected({});
                  setNote("");
                }}
              >
                {state.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Table
            headers={[
              "Artículo / resguardo",
              "Pendiente",
              "Recibir / resolver",
              "Resultado",
            ]}
          >
            {rows.map((l) => (
              <tr key={l.id}>
                <td>
                  <div className="font-semibold">{l.snapshot.name}</div>
                  <p className="text-xs text-slate-500">
                    {l.snapshot.variant} · {l.delivery.folio}
                  </p>
                  {l.delivery.due && (
                    <Badge tone={l.delivery.due < today() ? "amber" : "gray"}>
                      Devolución: {dateLabel(l.delivery.due)}
                    </Badge>
                  )}
                </td>
                <td>{l.pending}</td>
                <td>
                  <Input
                    className="w-24"
                    aria-label={`Recibir ${l.snapshot.name}`}
                    type="number"
                    min={0}
                    step={1}
                    max={l.pending}
                    value={selected[l.id]?.qty || 0}
                    onChange={(e) => change(l.id, "qty", e.target.value)}
                  />
                </td>
                <td>
                  <Select
                    aria-label={`Condición de ${l.snapshot.name}`}
                    value={selected[l.id]?.condition || "good"}
                    onChange={(e) => change(l.id, "condition", e.target.value)}
                  >
                    <option value="good">Buen estado → disponible</option>
                    <option value="review">Requiere revisión</option>
                    <option value="lost">Pérdida → baja</option>
                  </Select>
                </td>
              </tr>
            ))}
          </Table>
          {!rows.length && (
            <Empty>No tiene artículos retornables pendientes.</Empty>
          )}
          <div className="space-y-4 border-t p-5">
            <Field
              label="Observaciones"
              hint="Obligatorio para daños o pérdida. No se realizan descuentos automáticos."
            >
              <Textarea
                maxLength={1500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Las unidades que requieren revisión no estarán disponibles para
                otra entrega.
              </p>
              <Button
                type="submit"
                disabled={!rows.some((l) => Number(selected[l.id]?.qty) > 0)}
              >
                Confirmar recepción
              </Button>
            </div>
          </div>
        </Panel>
      </form>
    </>
  );
}
