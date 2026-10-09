"use client";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSnackbar } from "notistack";
import { useActivos } from "./ActivosProvider";
import {
  Heading,
  Panel,
  Table,
  ResourceLink,
  Field,
  Textarea,
  Empty,
  dateLabel,
} from "./ui";
import { DeliveryStatus } from "./Deliveries";
export default function Receipt({ id }) {
  const { state, company, execute, self } = useActivos();
  const { enqueueSnackbar } = useSnackbar();
  const [dialog, setDialog] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false);
  const d = state.deliveries.find((d) => d.id === id);
  if (!d) return <Empty>Resguardo no encontrado en esta empresa.</Empty>;
  async function pdf() {
    setBusy(true);
    try {
      const { downloadReceipt } = await import("@/lib/activos/pdf");
      await downloadReceipt(d, d.company || company);
    } catch {
      enqueueSnackbar("No fue posible generar el PDF.", { variant: "error" });
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    const result =
      dialog === "cancel"
        ? await execute("delivery.cancel", { id, note })
        : await execute("delivery.ack", { id, status: dialog, note });
    if (result) setDialog("");
  }
  return (
    <>
      <Heading
        title={`Resguardo ${d.folio}`}
        subtitle="Documento de entrega con información conservada al momento de registrar."
      >
        <Button variant="outline" asChild>
          <ResourceLink to="/resguardos">Volver</ResourceLink>
        </Button>
        <Button variant="outline" disabled={busy} onClick={pdf}>
          {busy ? "Generando…" : "Descargar PDF"}
        </Button>
        {self &&
          d.status === "confirmed" &&
          d.acknowledgement === "pending" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setDialog("difference");
                  setNote("");
                }}
              >
                Reportar diferencia
              </Button>
              <Button
                onClick={() => {
                  setDialog("accepted");
                  setNote("");
                }}
              >
                Confirmar recepción
              </Button>
            </>
          )}
      </Heading>
      <article className="mx-auto max-w-4xl space-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-9">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b-2 border-blue-600 pb-6">
          <div>
            <Image
              src={d.company?.logo || "/assets/logo.png"}
              unoptimized
              alt={d.company?.name || "ADAMIA"}
              width={125}
              height={45}
              className="mb-4 h-auto"
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {d.company?.name || company.name}
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              Resguardo de activos y uniformes
            </h2>
          </div>
          <div className="text-right">
            <strong>{d.folio}</strong>
            <p className="mb-3 text-xs text-slate-500">{dateLabel(d.date)}</p>
            <DeliveryStatus d={d} />
          </div>
        </header>
        <Panel title="Datos de la entrega">
          <dl className="grid gap-5 p-5 sm:grid-cols-2">
            {[
              ["Recibe", d.employee.name],
              ["Puesto", d.employee.role],
              ["Entrega", d.actor],
              [
                "Devolución prevista",
                d.due ? dateLabel(d.due) : "Al terminar la asignación",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-1 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        {["asset", "uniform"].map((type) => {
          const lines = d.lines.filter((l) => l.snapshot.type === type);
          return (
            !!lines.length && (
              <Panel
                key={type}
                title={
                  type === "asset"
                    ? "Activos entregados"
                    : "Uniformes entregados"
                }
              >
                <Table
                  headers={[
                    "Artículo / variante",
                    "Código / serie",
                    "Cantidad",
                    "Retornable",
                  ]}
                >
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.snapshot.name}</strong>
                        <p className="text-xs text-slate-500">
                          {l.snapshot.variant}
                        </p>
                      </td>
                      <td className="text-xs">
                        {l.snapshot.code}
                        <br />
                        {l.snapshot.serial}
                      </td>
                      <td>{l.qty}</td>
                      <td>{l.snapshot.returnable ? "Sí" : "No"}</td>
                    </tr>
                  ))}
                </Table>
              </Panel>
            )
          );
        })}
        <Panel title="Condición y observaciones">
          <p className="whitespace-pre-wrap p-5 text-sm">{d.note}</p>
        </Panel>
        {(d.ackNote || d.cancelReason) && (
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            {d.ackNote || d.cancelReason}
          </p>
        )}
        <div className="grid gap-8 pt-10 sm:grid-cols-2">
          <div className="border-t pt-3 text-center">
            <strong>{d.actor}</strong>
            <p className="text-xs text-slate-500">Entrega · Recursos Humanos</p>
          </div>
          <div className="border-t pt-3 text-center">
            <strong>{d.employee.name}</strong>
            <p className="text-xs text-slate-500">
              {d.acknowledgement === "accepted"
                ? "Recepción confirmada por el empleado"
                : "Recibe · Pendiente de confirmación"}
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400">
          Registro de entrega y acuse de recepción. Conserva este documento para
          consultar los artículos recibidos.
        </p>
      </article>
      {!self &&
        d.status === "confirmed" &&
        d.acknowledgement === "pending" &&
        !d.lines.some((l) => l.returned || l.lost) && (
          <div className="mt-4 text-right">
            <Button
              variant="ghost"
              onClick={() => {
                setDialog("cancel");
                setNote("");
              }}
            >
              Revertir entrega por error
            </Button>
          </div>
        )}
      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog("")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "cancel"
                ? "Revertir entrega"
                : dialog === "difference"
                  ? "Reportar diferencia en recepción"
                  : "Confirmar recepción de artículos"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "cancel"
                ? "Se devolverán las existencias al inventario y se conservará el historial."
                : "La confirmación quedará registrada con tu cuenta y la fecha del servidor."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Observaciones">
              <Textarea
                required={dialog !== "accepted"}
                maxLength={1500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog("")}
              >
                Cancelar
              </Button>
              <Button type="submit">Confirmar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
