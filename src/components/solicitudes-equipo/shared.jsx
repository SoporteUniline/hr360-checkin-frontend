"use client";

import { Loader2 } from "lucide-react";
import {
  isApproved,
  isPending,
  normalize,
} from "@/lib/solicitudes-equipo/model.mjs";
import { calcDiasTotalesYHabiles } from "@/lib/permisosDias";

export const blueButton = "bg-[#2563EB] text-white hover:bg-[#1d4ed8]";
export const selectClass =
  "h-10 min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export async function teamFetcher(key, options) {
  const url = Array.isArray(key) ? key[0] : key;
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.error || "No se pudo consultar la información.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

export function Status({ row }) {
  const color = isPending(row)
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : isApproved(row)
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : normalize(row.estado) === "rechazado"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-gray-200 bg-gray-50 text-gray-600";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${color}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {row.estado || "Sin estado"}
    </span>
  );
}

export function Loading({ text = "Consultando solicitudes…" }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500"
    >
      <Loader2 className="size-4 animate-spin" />
      {text}
    </div>
  );
}

export function requestedDays(row, calendar) {
  if (!row.fecha_inicio || !row.fecha_fin || row.fecha_inicio > row.fecha_fin)
    return null;
  // Mismo cálculo que las solicitudes existentes. Sin festivos no proyectar saldo.
  if (Number(row.descuenta_vacaciones) === 1 && !calendar.holidaysAvailable)
    return null;
  const count = calcDiasTotalesYHabiles({
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    diasTrabajo: row.dias_trabajo,
    festivosSet: new Set(calendar.holidays),
  });
  return Number(row.descuenta_vacaciones) === 1
    ? count.diasHabiles
    : count.diasTotales;
}

export function Empty({ title, children }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-6 py-16 text-center">
      <p className="font-medium text-gray-900">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
        {children}
      </p>
    </div>
  );
}
