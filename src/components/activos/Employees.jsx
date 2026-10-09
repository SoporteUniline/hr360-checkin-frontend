"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ActivosProvider, useActivos } from "./ActivosProvider";
import {
  companiesFor,
  employeeLines,
  outstanding,
  uid,
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
  Empty,
  dateLabel,
} from "./ui";

export default function Employees() {
  const { state, execute } = useActivos();
  const [q, setQ] = useState(""),
    [form, setForm] = useState(null);
  function submit(e) {
    e.preventDefault();
    if (execute("employee.upsert", form)) setForm(null);
  }
  return (
    <>
      <Heading
        title="Recursos por empleado"
        subtitle="Activos y uniformes separados, con el historial completo de entregas."
      >
        <Button
          onClick={() =>
            setForm({
              id: `demo-${uid()}`,
              name: "",
              role: "",
              department: "",
              size: "",
              shoeSize: "",
            })
          }
        >
          Agregar empleado ficticio
        </Button>
      </Heading>
      <div className="mb-4">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Buscar empleado o puesto…"
        />
      </div>
      <Panel>
        <Table
          headers={[
            "Empleado",
            "Puesto",
            "Activos a cargo",
            "Uniformes entregados",
            "Expediente",
          ]}
        >
          {state.employees
            .filter((e) => matches(q, e.name, e.role, e.department))
            .map((e) => (
              <tr key={e.id}>
                <td>
                  <div className="font-semibold">{e.name}</div>
                  <Badge tone="gray">
                    {e.demo
                      ? "Persona ficticia"
                      : "Prueba vinculada al expediente"}
                  </Badge>
                </td>
                <td>{e.role}</td>
                <td>
                  {employeeLines(state, e.id, "asset").reduce(
                    (n, l) => n + l.pending,
                    0
                  )}
                </td>
                <td>
                  {employeeLines(state, e.id, "uniform").reduce(
                    (n, l) => n + l.pending,
                    0
                  )}
                </td>
                <td>
                  <ResourceLink
                    to={`/empleados/${e.id}`}
                    className="font-medium text-blue-700"
                  >
                    Ver expediente
                  </ResourceLink>
                </td>
              </tr>
            ))}
        </Table>
      </Panel>
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Empleado ficticio</DialogTitle>
            <DialogDescription>
              Solo se agrega al catálogo local de esta demostración.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <form onSubmit={submit} className="space-y-4">
              {[
                ["Nombre", "name"],
                ["Puesto", "role"],
                ["Departamento", "department"],
                ["Talla de uniforme", "size"],
                ["Talla de calzado", "shoeSize"],
              ].map(([label, key]) => (
                <Field key={key} label={label}>
                  <Input
                    maxLength={100}
                    required={key === "name"}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </Field>
              ))}
              <Button type="submit" className="w-full">
                Guardar empleado ficticio
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function renewal(line) {
  if (!line.snapshot.renewalMonths) return "Sin periodicidad";
  const d = new Date(line.delivery.date + "T12:00:00");
  d.setMonth(d.getMonth() + line.snapshot.renewalMonths);
  return dateLabel(d.toISOString().slice(0, 10));
}
export function EmployeeResources({ employeeId, type, showHistory = true }) {
  const { state, execute, company } = useActivos();
  const router = useRouter();
  const [exchange, setExchange] = useState(null),
    [form, setForm] = useState({});
  const lines = employeeLines(state, employeeId, type);
  const active = lines.filter((l) => l.pending > 0);
  function submit(e) {
    e.preventDefault();
    const r = execute("uniform.exchange", {
      ...form,
      deliveryId: exchange.delivery.id,
      lineId: exchange.id,
    });
    if (r) {
      setExchange(null);
      router.push(`${ROOT}/resguardos/${r.id}?empresa=${company.id}`);
    }
  }
  return (
    <>
      <Panel
        title={type === "asset" ? "Activos asignados" : "Uniformes entregados"}
        actions={
          <Badge tone="gray">
            {active.reduce((n, l) => n + l.pending, 0)} unidades
          </Badge>
        }
      >
        <Table
          headers={
            type === "asset"
              ? [
                  "Equipo / código",
                  "Entrega",
                  "A su cargo",
                  "Devolución",
                  "Resguardo",
                ]
              : [
                  "Prenda / talla",
                  "Entrega",
                  "Cantidad vigente",
                  "Reposición sugerida",
                  "Acciones",
                ]
          }
        >
          {active.map((l) => (
            <tr key={l.id}>
              <td>
                <div className="font-semibold">{l.snapshot.name}</div>
                <p className="text-xs text-slate-500">
                  {l.snapshot.variant} · {l.snapshot.code}
                </p>
                {type === "asset" && (
                  <p className="text-xs text-slate-400">{l.snapshot.serial}</p>
                )}
              </td>
              <td>{dateLabel(l.delivery.date)}</td>
              <td>{l.pending}</td>
              <td>
                {type === "asset"
                  ? l.snapshot.returnable
                    ? l.delivery.due
                      ? dateLabel(l.delivery.due)
                      : "Al terminar la asignación"
                    : "No requerida"
                  : renewal(l)}
              </td>
              <td>
                <div className="flex flex-wrap gap-2">
                  <ResourceLink
                    to={`/resguardos/${l.delivery.id}`}
                    className="text-blue-700"
                  >
                    {l.delivery.folio}
                  </ResourceLink>
                  {type === "uniform" && l.snapshot.returnable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setExchange(l);
                        setForm({
                          productId: "",
                          qty: 1,
                          condition: "good",
                          note: "",
                        });
                      }}
                    >
                      Cambiar talla
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
        {!active.length && (
          <Empty>
            Sin{" "}
            {type === "asset" ? "activos asignados" : "uniformes entregados"} en
            esta demostración.
          </Empty>
        )}
      </Panel>
      {showHistory && !!lines.length && (
        <details className="mt-4 rounded-lg border bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Historial de entregas y devoluciones
          </summary>
          <Table
            headers={["Artículo", "Entregado", "Devuelto", "Pérdida", "Fecha"]}
          >
            {lines.map((l) => (
              <tr key={l.id}>
                <td>{l.snapshot.name}</td>
                <td>{l.qty}</td>
                <td>{l.returned}</td>
                <td>{l.lost}</td>
                <td>{dateLabel(l.delivery.date)}</td>
              </tr>
            ))}
          </Table>
        </details>
      )}
      <Dialog open={!!exchange} onOpenChange={(v) => !v && setExchange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambio de talla</DialogTitle>
            <DialogDescription>
              La recepción de la prenda anterior y la entrega de la nueva se
              registran juntas.
            </DialogDescription>
          </DialogHeader>
          {exchange && (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm">
                Recibir: {exchange.snapshot.name} · {exchange.snapshot.variant}
              </p>
              <Field label="Nueva prenda / variante disponible">
                <Select
                  required
                  value={form.productId}
                  onChange={(e) =>
                    setForm({ ...form, productId: e.target.value })
                  }
                >
                  <option value="">Selecciona…</option>
                  {state.products
                    .filter(
                      (p) =>
                        p.type === "uniform" &&
                        p.active &&
                        p.stock > 0 &&
                        p.id !== exchange.productId
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.variant} ({p.stock})
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Cantidad">
                <Input
                  type="number"
                  min={1}
                  max={exchange.pending}
                  step={1}
                  required
                  value={form.qty}
                  onChange={(e) =>
                    setForm({ ...form, qty: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Condición de la prenda recibida">
                <Select
                  value={form.condition}
                  onChange={(e) =>
                    setForm({ ...form, condition: e.target.value })
                  }
                >
                  <option value="good">Buen estado → disponible</option>
                  <option value="review">Requiere revisión</option>
                </Select>
              </Field>
              <Field label="Motivo">
                <Textarea
                  required
                  maxLength={1000}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </Field>
              <Button className="w-full" type="submit">
                Confirmar cambio
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EmployeeDetail({ id }) {
  const { state, execute } = useActivos();
  const employee = state.employees.find((e) => e.id === id);
  const [editing, setEditing] = useState(false),
    [form, setForm] = useState(employee || {});
  if (!employee)
    return <Empty>Empleado no encontrado en esta demostración.</Empty>;
  return (
    <>
      <Heading
        title={employee.name}
        subtitle={`${employee.role} · ${employee.department} · Expediente de demostración`}
      >
        <Button
          variant="outline"
          onClick={() => {
            setForm(employee);
            setEditing(true);
          }}
        >
          Tallas del empleado
        </Button>
        <Button variant="outline" asChild>
          <ResourceLink to={`/devoluciones?empleado=${id}`}>
            Registrar devolución
          </ResourceLink>
        </Button>
        <Button asChild>
          <ResourceLink to={`/entregas/nueva?empleado=${id}`}>
            Nueva entrega
          </ResourceLink>
        </Button>
      </Heading>
      <div className="space-y-5">
        <EmployeeResources employeeId={id} type="asset" />
        <EmployeeResources employeeId={id} type="uniform" />
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tallas del empleado</DialogTitle>
            <DialogDescription>
              Preferencias locales de la demostración.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (execute("employee.upsert", form)) setEditing(false);
            }}
            className="space-y-4"
          >
            <Field label="Talla de uniforme">
              <Input
                value={form.size}
                maxLength={25}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
            </Field>
            <Field label="Calzado">
              <Input
                value={form.shoeSize}
                maxLength={25}
                onChange={(e) => setForm({ ...form, shoeSize: e.target.value })}
              />
            </Field>
            <Button type="submit">Guardar tallas</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Inserción en el expediente real: no se crean entregas ficticias automáticamente.
export function ExpedienteResources({ employee, companyId, type }) {
  const { dataUser } = useAuth();
  const companies = companiesFor(dataUser);
  const resolved = employee?.id_empresa || companyId;
  const valid = companies.find((c) => c.id === String(resolved));
  const scope = valid?.id || (companies.length === 1 ? companies[0].id : null);
  if (!scope)
    return (
      <Empty>
        Selecciona una unidad de negocio para consultar los recursos de esta
        persona.
      </Empty>
    );
  return (
    <ActivosProvider fixedCompany={scope} compact>
      <ExpedienteInner employee={employee} type={type} />
    </ActivosProvider>
  );
}
function ExpedienteInner({ employee, type }) {
  const { execute, state, company } = useActivos();
  const router = useRouter();
  const id = employee?.id_empleado ? `real-${employee.id_empleado}` : null;
  const profile = state.employees.find((e) => e.id === id);
  if (!id) return <Empty>No se pudo identificar al empleado.</Empty>;
  function prepare() {
    const r = execute("employee.upsert", {
      id,
      name: employee.nombre_completo || "Empleado",
      role: employee.puesto || "Sin puesto",
      department: employee.departamento || "",
      size: profile?.size || "",
      shoeSize: profile?.shoeSize || "",
    });
    if (r)
      router.push(
        `${ROOT}/entregas/nueva?empresa=${company.id}&empleado=${id}`
      );
  }
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs text-slate-500">
          Aquí aparecerán las asignaciones de esta persona. Por ahora solo se
          muestran pruebas locales creadas explícitamente desde su expediente.
        </p>
        <Button variant="outline" onClick={prepare}>
          Preparar entrega ficticia
        </Button>
      </div>
      <EmployeeResources employeeId={id} type={type} />
    </>
  );
}
