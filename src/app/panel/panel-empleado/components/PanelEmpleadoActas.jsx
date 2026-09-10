"use client";

import { ExternalLink, FileWarning, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdministrativeMinutes } from "@/hooks/useAdministrativeMinutes";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("es-MX");
};

const gravedadClass = (gravedad) =>
  String(gravedad || "").toLowerCase() === "grave"
    ? "bg-rose-50 text-rose-700"
    : "bg-amber-50 text-amber-700";

const estadoClass = (estado) => {
  const value = String(estado || "").toLowerCase();

  if (value === "cerrada") return "bg-slate-100 text-slate-600";
  if (value === "notificada") return "bg-emerald-50 text-emerald-700";
  if (value === "elaborada") return "bg-blue-50 text-blue-700";

  return "bg-violet-50 text-violet-700";
};

export default function PanelEmpleadoActas({
  idEmpleado,
  idEmpresa = "all",
}) {
  const router = useRouter();

  const {
    data: actas,
    isLoading,
    error,
  } = useAdministrativeMinutes(idEmpresa || "all", 1, 100, {
    empleado: idEmpleado ? String(idEmpleado) : "",
  });

  if (isLoading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Actas administrativas
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Actas registradas a nombre de este empleado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/panel/actas-administrativas")}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600"
        >
          Abrir módulo
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No fue posible cargar las actas administrativas.
        </div>
      ) : null}

      {!error && (!actas || actas.length === 0) ? (
        <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
          <FileWarning className="mb-2 h-6 w-6 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            Sin actas administrativas
          </p>
          <p className="mt-1 text-xs text-slate-400">
            No hay actas registradas para este empleado.
          </p>
        </div>
      ) : null}

      {actas?.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50/80">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Folio
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Tipo
                  </th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Gravedad
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Fecha incidente
                  </th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody>
                {actas.map((acta) => (
                  <tr
                    key={acta.id_acta}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                  >
                    <td className="px-3 py-3 font-semibold text-slate-700">
                      {acta.folio || `#${acta.id_acta}`}
                    </td>

                    <td className="px-3 py-3 text-slate-600">
                      {acta.nombre_tipo_acta || "—"}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${gravedadClass(
                          acta.gravedad_tipo,
                        )}`}
                      >
                        {acta.gravedad_tipo || "—"}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-slate-600">
                      {formatDate(acta.fecha_incidente)}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${estadoClass(
                          acta.estatus,
                        )}`}
                      >
                        {acta.estatus || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
