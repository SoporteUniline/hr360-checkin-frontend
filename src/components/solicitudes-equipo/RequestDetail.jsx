"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  History,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { useSnackbar } from "notistack";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  formatDate,
  formatRange,
  isPending,
  isVacation,
  lastVacation,
  nextWorkday,
} from "@/lib/solicitudes-equipo/model.mjs";
import {
  blueButton,
  Loading,
  requestedDays,
  Status,
  teamFetcher,
} from "./shared";

export default function RequestDetail({
  selected,
  identity,
  calendar,
  requests,
  today,
  onResolved,
  onHistory,
}) {
  const { data, error, isLoading, mutate } = useSWR(
    [`/api/solicitudes-equipo/${selected.id}`, identity],
    teamFetcher,
    { shouldRetryOnError: false },
  );
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const { enqueueSnackbar } = useSnackbar();
  const row = data?.request || selected;
  const days = requestedDays(row, calendar);
  const available = data?.balance?.available ?? null;
  const projected =
    available !== null &&
    days !== null &&
    Number(row.descuenta_vacaciones) === 1
      ? available - days
      : null;
  const returnDate = nextWorkday(
    row,
    calendar.holidays,
    calendar.holidaysAvailable,
  );
  const previous = lastVacation(requests, row.id_empleado, today, row.id);

  async function resolve() {
    setBusy(true);
    setActionError("");
    try {
      await teamFetcher(`/api/solicitudes-equipo/${row.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: confirmation }),
      });
      setConfirmation(null);
      enqueueSnackbar(
        confirmation === "Aprobado"
          ? "Solicitud aprobada."
          : "Solicitud rechazada.",
        {
          variant: "success",
          anchorOrigin: { vertical: "top", horizontal: "right" },
        },
      );
      await Promise.all([mutate(), onResolved()]);
    } catch (err) {
      setConfirmation(null);
      setActionError(err.message);
      if (err.status === 409) await Promise.all([mutate(), onResolved()]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Solicitud #{row.id}
          </span>
          <Status row={row} />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">
            {row.empleado_nombre}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {row.puesto || "Colaborador de tu equipo"}
          </p>
        </div>
        <section className="rounded-xl border border-gray-200 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CalendarDays className="size-4 text-blue-600" />
            {row.tipo_permiso_nombre || "Permiso"}
          </p>
          <p className="mt-3 text-sm font-medium text-gray-800">
            {formatRange(row)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {days === null
              ? "Días por confirmar"
              : `${days} ${Number(row.descuenta_vacaciones) === 1 ? "días a descontar" : "días naturales"}`}
          </p>
          <div className="mt-4 border-t border-gray-100 pt-3 text-sm">
            <span className="text-gray-500">Regreso previsto</span>
            <p className="mt-1 font-semibold text-gray-900">
              {returnDate
                ? formatDate(returnDate, { weekday: "long" })
                : "Por confirmar con su horario"}
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Según el horario actual y los días festivos registrados.
            </p>
          </div>
        </section>
        {isLoading && <Loading text="Consultando saldo y periodos…" />}
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error.message}
            <button
              className="mt-2 block font-semibold underline"
              onClick={() => mutate()}
            >
              Volver a intentar
            </button>
          </div>
        )}
        {isVacation(row) && data && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {isPending(row)
                ? "Saldo de vacaciones"
                : "Saldo actual de vacaciones"}
            </h3>
            <div className="grid grid-cols-3 divide-x divide-blue-100 rounded-xl border border-blue-100 bg-blue-50/60 py-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {available ?? "—"}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">Disponibles</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {days ?? "—"}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">Solicitados</p>
              </div>
              <div>
                <p
                  className={`text-2xl font-semibold ${projected !== null && projected < 0 ? "text-red-600" : "text-blue-600"}`}
                >
                  {isPending(row)
                    ? (projected ?? "—")
                    : (data.balance?.taken ?? "—")}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  {isPending(row) ? "Restarían*" : "Utilizados"}
                </p>
              </div>
            </div>
            <p className="text-xs leading-5 text-gray-500">
              {isPending(row)
                ? "*Estimación sobre el saldo actual, sin reservar otras solicitudes pendientes. El saldo definitivo lo calcula ADAMIA al autorizar."
                : "Este es el saldo disponible hoy; no representa el saldo que tenía al resolver esta solicitud."}
            </p>
            {projected !== null && projected < 0 && isPending(row) && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Los días solicitados superan el saldo disponible. Revisa el
                periodo con RH antes de autorizar.
              </p>
            )}
            {data.warning && (
              <p
                role="status"
                className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800"
              >
                {data.warning}
              </p>
            )}
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">
                Periodo de cargo
              </p>
              {data.allocatedPeriod ? (
                <p className="mt-1 text-sm font-medium">
                  {formatRange(data.allocatedPeriod)}
                </p>
              ) : (
                <p className="mt-1 flex items-start gap-2 text-sm text-gray-600">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  No informado en esta solicitud
                </p>
              )}
              {!!data.periods.length && (
                <details className="mt-3 border-t border-gray-100 pt-3">
                  <summary className="cursor-pointer text-xs font-medium text-blue-600">
                    Ver periodos registrados ({data.periods.length})
                  </summary>
                  <ul className="mt-3 space-y-3">
                    {data.periods.map((period) => (
                      <li key={period.id} className="text-xs leading-5">
                        <p className="font-medium text-gray-700">
                          {formatRange(period)}
                        </p>
                        <p className="text-gray-500">
                          {period.dias} días asignados · {period.estado}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </section>
        )}
        <section>
          <h3 className="text-sm font-semibold text-gray-900">Motivo</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
            {row.motivo || row.notas || "Sin comentarios adicionales."}
          </p>
        </section>
        <section className="rounded-xl bg-gray-50 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <History className="size-4" />
            Últimas vacaciones registradas
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {previous
              ? formatRange(previous)
              : "Sin vacaciones aprobadas y concluidas en el historial disponible."}
          </p>
          <button
            type="button"
            onClick={() => onHistory(row.id_empleado)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
          >
            Ver historial del colaborador
            <ArrowUpRight className="size-3.5" />
          </button>
        </section>
        {!isPending(row) && row.fecha_actualizacion && (
          <p className="text-xs text-gray-500">
            Actualizada el {formatDate(row.fecha_actualizacion)}
            {row.actualizado_por_nombre
              ? ` por ${row.actualizado_por_nombre}`
              : ""}
            .
          </p>
        )}
        {actionError && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {actionError}
          </p>
        )}
      </div>
      {isPending(row) && (
        <div className="sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy || isLoading || !!error}
            onClick={() => setConfirmation("Rechazado")}
          >
            <X className="size-4" />
            Rechazar
          </Button>
          <Button
            className={`flex-1 ${blueButton}`}
            disabled={busy || isLoading || !!error}
            onClick={() => setConfirmation("Aprobado")}
          >
            <Check className="size-4" />
            Aprobar
          </Button>
        </div>
      )}
      <AlertDialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation === "Aprobado"
                ? "¿Aprobar esta solicitud?"
                : "¿Rechazar esta solicitud?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {row.empleado_nombre} · {formatRange(row)}. Se registrará tu
              decisión en ADAMIA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Volver</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmation === "Aprobado"
                  ? blueButton
                  : "bg-red-600 text-white hover:bg-red-700"
              }
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                resolve();
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Guardando…" : "Confirmar decisión"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
