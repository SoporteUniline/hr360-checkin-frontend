"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { finiquitosApi } from "@/lib/finiquitosApi";

const money = (value) =>
  Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("es-MX");
};

const estadoClass = (estado) => {
  const value = String(estado || "").toLowerCase();

  if (value === "pagado") return "bg-emerald-50 text-emerald-700";
  if (value === "cancelado") return "bg-rose-50 text-rose-700";

  return "bg-amber-50 text-amber-700";
};

export default function PanelEmpleadoFiniquitos({
  idEmpleado,
  idEmpresa = "all",
}) {
  const router = useRouter();
  const [finiquitos, setFiniquitos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      if (!idEmpleado) {
        setFiniquitos([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await finiquitosApi.listar({
          empresa: idEmpresa || "all",
          idEmpleado,
          page: 1,
          limit: 100,
        });

        if (!activo) return;

        setFiniquitos(Array.isArray(response?.data) ? response.data : []);
      } catch (err) {
        if (!activo) return;

        console.error("Error cargando finiquitos del empleado:", err);
        setError("No fue posible cargar los finiquitos.");
        setFiniquitos([]);
      } finally {
        if (activo) setLoading(false);
      }
    };

    cargar();

    return () => {
      activo = false;
    };
  }, [idEmpleado, idEmpresa]);

  if (loading) {
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
            Finiquitos y liquidaciones
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Historial relacionado con este empleado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/panel/finiquitos-y-liquidaciones")}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600"
        >
          Abrir módulo
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!error && finiquitos.length === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
          <ReceiptText className="mb-2 h-6 w-6 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            Sin finiquitos registrados
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Este empleado todavía no tiene finiquitos o liquidaciones.
          </p>
        </div>
      ) : null}

      {finiquitos.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50/80">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Folio
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Fecha baja
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Tipo
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Total
                  </th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody>
                {finiquitos.map((finiquito) => (
                  <tr
                    key={finiquito.id_finiquito}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                  >
                    <td className="px-3 py-3 font-semibold text-slate-700">
                      #{finiquito.id_finiquito}
                    </td>

                    <td className="px-3 py-3 text-slate-600">
                      {formatDate(finiquito.fecha_baja)}
                    </td>

                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        {finiquito.es_liquidacion
                          ? "Liquidación"
                          : "Finiquito"}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-slate-800">
                      {money(finiquito.total_pagar)}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${estadoClass(
                          finiquito.estado,
                        )}`}
                      >
                        {finiquito.estado || "Pendiente"}
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
