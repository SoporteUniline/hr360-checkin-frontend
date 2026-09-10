"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Gift, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { aguinaldosApi } from "@/lib/aguinaldosApi";

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

export default function PanelEmpleadoAguinaldos({
  idEmpleado,
  idEmpresa = "all",
}) {
  const router = useRouter();
  const [aguinaldos, setAguinaldos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      if (!idEmpleado) {
        setAguinaldos([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await aguinaldosApi.listar({
          empresa: idEmpresa || "all",
          idEmpleado,
          page: 1,
          limit: 100,
        });

        const calculos = Array.isArray(response?.data) ? response.data : [];

        const detalles = await Promise.all(
          calculos.map(async (calculo) => {
            try {
              const detalle = await aguinaldosApi.detalle(
                calculo.id_calculo || calculo.id,
              );

              const individual = (detalle?.aguinaldos || []).find(
                (item) =>
                  String(item.id_empleado) === String(idEmpleado),
              );

              if (!individual) return null;

              return {
                ...individual,
                id_calculo:
                  calculo.id_calculo ||
                  detalle?.maestro?.id_calculo,
                año_fiscal:
                  calculo.año_fiscal ||
                  detalle?.maestro?.año_fiscal,
                fecha_calculo:
                  calculo.fecha_calculo ||
                  detalle?.maestro?.fecha_calculo,
                fecha_corte:
                  individual.fecha_corte ||
                  detalle?.maestro?.fecha_corte,
              };
            } catch (err) {
              console.error(
                "Error cargando detalle de aguinaldo:",
                err,
              );
              return null;
            }
          }),
        );

        if (!activo) return;

        setAguinaldos(detalles.filter(Boolean));
      } catch (err) {
        if (!activo) return;

        console.error("Error cargando aguinaldos del empleado:", err);
        setError("No fue posible cargar los aguinaldos.");
        setAguinaldos([]);
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
            Aguinaldos
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Historial de aguinaldos calculados para este empleado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/panel/aguinaldos")}
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

      {!error && aguinaldos.length === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
          <Gift className="mb-2 h-6 w-6 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            Sin aguinaldos registrados
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Todavía no hay cálculos de aguinaldo para este empleado.
          </p>
        </div>
      ) : null}

      {aguinaldos.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50/80">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Año
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Fecha corte
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Días trabajados
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Días aguinaldo
                  </th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Tipo
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Monto
                  </th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody>
                {aguinaldos.map((aguinaldo) => (
                  <tr
                    key={aguinaldo.id_aguinaldo}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                  >
                    <td className="px-3 py-3 font-semibold text-slate-700">
                      {aguinaldo.año_fiscal || "—"}
                    </td>

                    <td className="px-3 py-3 text-slate-600">
                      {formatDate(aguinaldo.fecha_corte)}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {Number(aguinaldo.dias_trabajados || 0).toFixed(0)}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600">
                      {Number(
                        aguinaldo.dias_aguinaldo_calculado || 0,
                      ).toFixed(2)}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        {aguinaldo.es_proporcional
                          ? "Proporcional"
                          : "Completo"}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-slate-800">
                      {money(aguinaldo.monto_aguinaldo)}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${estadoClass(
                          aguinaldo.estado,
                        )}`}
                      >
                        {aguinaldo.estado || "Pendiente"}
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
