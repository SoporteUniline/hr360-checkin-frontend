"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Download } from "lucide-react";
import { useActivos } from "./ActivosProvider";
import { assigned, LOCATIONS } from "@/lib/activos/model.mjs";
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
  money,
  downloadCsv,
  dateLabel,
} from "./ui";
const section = (type) => (type === "asset" ? "activos" : "uniformes");
function ProductStatus({ p, state }) {
  return (
    <Badge
      tone={
        !p.active
          ? "gray"
          : p.repair
          ? "amber"
          : p.stock < p.minimum
          ? "amber"
          : p.stock
          ? "green"
          : "blue"
      }
    >
      {!p.active
        ? "Archivado"
        : p.repair
        ? "En revisión"
        : p.stock < p.minimum
        ? "Existencia baja"
        : p.stock
        ? "Disponible"
        : assigned(state, p.id)
        ? "Asignado"
        : "Sin existencias"}
    </Badge>
  );
}
export default function Inventory({ type }) {
  const { state } = useActivos();
  const [q, setQ] = useState(""),
    [status, setStatus] = useState("active");
  const rows = state.products.filter(
    (p) =>
      p.type === type &&
      (status === "all" ||
        (status === "active" && p.active) ||
        (status === "low" && p.active && p.stock < p.minimum)) &&
      matches(q, p.name, p.code, p.serial, p.variant, p.location)
  );
  return (
    <>
      <Heading
        title={type === "asset" ? "Activos" : "Uniformes"}
        subtitle={
          type === "asset"
            ? "Cada equipo identificado, con su responsable e historial."
            : "Control de prendas por talla, color, ubicación y cantidad."
        }
      >
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(`${section(type)}-demo.csv`, [
              [
                "Código",
                "Artículo",
                "Variante",
                "Serie",
                "Ubicación",
                "Disponible",
                "Asignado",
                "En revisión",
              ],
              ...rows.map((p) => [
                p.code,
                p.name,
                p.variant,
                p.serial,
                p.location,
                p.stock,
                assigned(state, p.id),
                p.repair,
              ]),
            ])
          }
        >
          <Download size={16} />
          Exportar
        </Button>
        <Button asChild>
          <ResourceLink to={`/${section(type)}/nuevo`}>
            <Plus size={16} />
            {type === "asset" ? "Registrar activo" : "Registrar uniforme"}
          </ResourceLink>
        </Button>
      </Heading>
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Buscar nombre, código, serie o talla…"
        />
        <div className="w-48">
          <Select
            aria-label="Estado del inventario"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Registros activos</option>
            <option value="all">Incluir archivados</option>
            {type === "uniform" && (
              <option value="low">Existencias bajas</option>
            )}
          </Select>
        </div>
      </div>
      <Panel>
        <Table
          headers={[
            "Artículo",
            type === "asset" ? "Código / serie" : "Talla / color",
            "Ubicación",
            "Disponible",
            "Asignado",
            "Estado",
            "Acciones",
          ]}
        >
          <PagedRows
            rows={rows}
            columns={7}
            render={(p) => (
              <tr key={p.id}>
                <td>
                  <div className="font-semibold">{p.name}</div>
                  <p className="text-xs text-slate-500">
                    {type === "asset" ? p.variant : p.code}
                  </p>
                </td>
                <td>
                  <div>{type === "asset" ? p.code : p.size}</div>
                  <p className="text-xs text-slate-500">
                    {type === "asset" ? p.serial || "Sin serie" : p.color}
                  </p>
                </td>
                <td className="text-xs text-slate-500">{p.location}</td>
                <td className="tabular-nums">{p.stock}</td>
                <td className="tabular-nums">{assigned(state, p.id)}</td>
                <td>
                  <ProductStatus p={p} state={state} />
                </td>
                <td>
                  <ResourceLink
                    to={`/${section(type)}/${p.id}`}
                    className="font-medium text-blue-700"
                  >
                    Ver
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

export function ProductForm({ type, id }) {
  const { state, execute, company } = useActivos();
  const existing = state.products.find((p) => p.id === id);
  const router = useRouter();
  const [form, setForm] = useState(
    existing || {
      type,
      name: "",
      code: "",
      serial: "",
      variant: "",
      category: type === "asset" ? "Computación" : "Uniforme",
      location: LOCATIONS[0],
      size: "",
      color: "",
      stock: 1,
      minimum: 0,
      cost: 0,
      renewalMonths: 0,
      returnable: true,
    }
  );
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  if (id && !existing) return <Empty>Artículo no encontrado.</Empty>;
  function submit(e) {
    e.preventDefault();
    setSaving(true);
    const r = execute("product.save", form);
    if (r)
      router.push(`${ROOT}/${section(type)}/${r.id}?empresa=${company.id}`);
    else setSaving(false);
  }
  return (
    <>
      <Heading
        title={
          id
            ? "Editar artículo"
            : type === "asset"
            ? "Registrar activo"
            : "Registrar uniforme"
        }
        subtitle="Información del catálogo de demostración."
      />
      <form onSubmit={submit}>
        <Panel title="Datos del artículo">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Nombre">
              <Input
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="Código único">
              <Input
                required
                maxLength={50}
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
              />
            </Field>
            <Field label="Categoría">
              <Input
                value={form.category}
                maxLength={70}
                onChange={(e) => set("category", e.target.value)}
              />
            </Field>
            <Field label="Ubicación">
              <Select
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              >
                {LOCATIONS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </Select>
            </Field>
            {type === "asset" ? (
              <>
                <Field label="Número de serie">
                  <Input
                    value={form.serial}
                    maxLength={100}
                    onChange={(e) => set("serial", e.target.value)}
                  />
                </Field>
                <Field label="Marca, modelo y características">
                  <Input
                    maxLength={150}
                    value={form.variant}
                    onChange={(e) => set("variant", e.target.value)}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Talla / variante">
                  <Input
                    required
                    value={form.size}
                    maxLength={25}
                    onChange={(e) => set("size", e.target.value)}
                  />
                </Field>
                <Field label="Color">
                  <Input
                    value={form.color}
                    maxLength={40}
                    onChange={(e) => set("color", e.target.value)}
                  />
                </Field>
                {!id && (
                  <Field label="Existencia inicial">
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={form.stock}
                      onChange={(e) => set("stock", e.target.value)}
                    />
                  </Field>
                )}
                <Field label="Existencia mínima">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={form.minimum}
                    onChange={(e) => set("minimum", e.target.value)}
                  />
                </Field>
                <Field
                  label="Reposición sugerida (meses)"
                  hint="0 = sin periodicidad"
                >
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={form.renewalMonths}
                    onChange={(e) => set("renewalMonths", e.target.value)}
                  />
                </Field>
              </>
            )}
            <Field label="Costo unitario de referencia (MXN)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.cost}
                onChange={(e) => set("cost", e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.returnable}
                onChange={(e) => set("returnable", e.target.checked)}
              />
              Requiere devolución
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t p-4">
            <Button variant="outline" asChild>
              <ResourceLink to={`/${section(type)}`}>Cancelar</ResourceLink>
            </Button>
            <Button disabled={saving} type="submit">
              Guardar artículo
            </Button>
          </div>
        </Panel>
      </form>
    </>
  );
}

export function ProductDetail({ id }) {
  const { state, execute } = useActivos();
  const p = state.products.find((p) => p.id === id);
  const [dialog, setDialog] = useState(""),
    [qty, setQty] = useState(1),
    [note, setNote] = useState(""),
    [location, setLocation] = useState(LOCATIONS[1]);
  if (!p) return <Empty>Artículo no encontrado.</Empty>;
  const assignments = state.deliveries
    .filter((d) => d.status === "confirmed")
    .flatMap((d) =>
      d.lines
        .filter((l) => l.productId === p.id && l.qty > l.returned + l.lost)
        .map((l) => ({ d, l }))
    );
  const movements = state.movements.filter((m) => m.productId === p.id);
  function open(type) {
    setDialog(type);
    setNote("");
    setQty(1);
  }
  function submit(e) {
    e.preventDefault();
    let result;
    if (dialog === "archive") result = execute("product.archive", { id: p.id });
    else if (dialog === "maintenance")
      result = execute("maintenance.open", {
        productId: p.id,
        qty,
        reason: note,
      });
    else
      result = execute("stock.move", {
        id: p.id,
        operation: dialog,
        qty,
        note,
        location,
      });
    if (result) setDialog("");
  }
  return (
    <>
      <Heading title={p.name} subtitle={`${p.code} · ${p.variant}`}>
        <Button variant="outline" asChild>
          <ResourceLink to={`/${section(p.type)}`}>Volver</ResourceLink>
        </Button>
        <Button variant="outline" asChild>
          <ResourceLink to={`/${section(p.type)}/${p.id}/editar`}>
            Editar
          </ResourceLink>
        </Button>
        <Button asChild disabled={!p.active || !p.stock}>
          <ResourceLink to={`/entregas/nueva?articulo=${p.id}`}>
            Entregar
          </ResourceLink>
        </Button>
      </Heading>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Ficha del artículo"
          actions={<ProductStatus p={p} state={state} />}
        >
          <dl className="grid grid-cols-2 gap-5 p-5">
            {[
              ["Ubicación", p.location],
              ["Serie", p.serial || "No aplica"],
              ["Disponible", p.stock],
              ["Asignado", assigned(state, p.id)],
              ["En revisión", p.repair],
              ["Bajas registradas", p.retired],
              ["Costo de referencia", money(p.cost)],
              ["Devolución", p.returnable ? "Requerida" : "No requerida"],
              ["Mínimo", p.minimum],
              [
                "Reposición",
                p.renewalMonths
                  ? `${p.renewalMonths} meses`
                  : "Sin periodicidad",
              ],
            ].map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-slate-500">{key}</dt>
                <dd className="mt-1 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2 border-t p-4">
            {p.active && (
              <>
                {p.type === "uniform" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => open("entrada")}
                  >
                    Entrada
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!p.stock}
                  onClick={() => open("maintenance")}
                >
                  Enviar a revisión
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!p.stock}
                  onClick={() => open("ajuste")}
                >
                  Baja / ajuste
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!p.stock || !!assigned(state, p.id) || !!p.repair}
                  onClick={() => open("traslado")}
                >
                  Trasladar
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={!!p.stock || !!p.repair || !!assigned(state, p.id)}
              onClick={() => open("archive")}
            >
              {p.active ? "Archivar" : "Reactivar"}
            </Button>
          </div>
        </Panel>
        <Panel title="Asignaciones actuales">
          <Table headers={["Empleado", "Cantidad", "Resguardo"]}>
            {assignments.map(({ d, l }) => (
              <tr key={l.id}>
                <td>
                  <ResourceLink
                    to={`/empleados/${d.employeeId}`}
                    className="text-blue-700"
                  >
                    {d.employee.name}
                  </ResourceLink>
                </td>
                <td>{l.qty - l.returned - l.lost}</td>
                <td>
                  <ResourceLink
                    to={`/resguardos/${d.id}`}
                    className="text-blue-700"
                  >
                    {d.folio}
                  </ResourceLink>
                </td>
              </tr>
            ))}
          </Table>
          {!assignments.length && <Empty>Sin asignaciones pendientes.</Empty>}
        </Panel>
      </div>
      <div className="mt-5">
        <Panel title="Historial del artículo">
          <Table
            headers={["Fecha", "Movimiento", "Cantidad", "Responsable / nota"]}
          >
            <PagedRows
              rows={movements}
              columns={4}
              render={(m) => (
                <tr key={m.id}>
                  <td>{dateLabel(m.date)}</td>
                  <td>{m.type}</td>
                  <td>{m.qty}</td>
                  <td>
                    <div>{m.actor}</div>
                    <p className="text-xs text-slate-500">{m.note}</p>
                  </td>
                </tr>
              )}
            />
          </Table>
        </Panel>
      </div>
      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog("")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {
                {
                  entrada: "Registrar entrada",
                  ajuste: "Baja de existencias",
                  traslado: "Trasladar registro",
                  maintenance: "Enviar a revisión",
                  archive: p.active
                    ? "Archivar artículo"
                    : "Reactivar artículo",
                }[dialog]
              }
            </DialogTitle>
            <DialogDescription>
              {p.name} · {p.code}. Movimiento de demostración.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {!["archive", "traslado"].includes(dialog) && (
              <Field label="Cantidad">
                <Input
                  required
                  type="number"
                  min={1}
                  max={dialog === "entrada" ? undefined : p.stock}
                  step={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </Field>
            )}
            {dialog === "traslado" && (
              <Field label="Destino (todas las existencias del registro)">
                <Select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  {LOCATIONS.filter((l) => l !== p.location).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              </Field>
            )}
            {dialog !== "archive" && (
              <Field label="Motivo / referencia">
                <Textarea
                  required
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog("")}
              >
                Cancelar
              </Button>
              <Button type="submit">Confirmar movimiento</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
