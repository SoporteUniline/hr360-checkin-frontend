"use client";

import React from "react";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

const money = (value) =>
  Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const date = (value) => {
  if (!value) return "-";
  const [fecha, hora] = String(value).split(" ");
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}${hora ? ` ${hora.slice(0, 5)}` : ""}`;
};

export default function PagosEmpresaTab({ empresa }) {
  const empresaId = empresa?.id_empresa;

  const { data, isLoading } = useSWR(
    empresaId ? `/empresas/${empresaId}/pagos` : null,
    fetcherWithToken,
  );

  const pagos = data?.data || [];

  if (isLoading) {
    return <p className="mt-4 text-sm text-gray-500">Cargando pagos...</p>;
  }

  return (
    <div className="mt-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-700">Pagos</h2>
        <p className="text-sm text-gray-500">
          Historial de pagos registrados para esta empresa.
        </p>
      </div>

      {pagos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
          Esta empresa todavía no tiene pagos registrados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-3 text-left">Fecha</th>
                <th className="px-3 py-3 text-left">Monto</th>
                <th className="px-3 py-3 text-left">Método</th>
                <th className="px-3 py-3 text-left">Referencia</th>
                <th className="px-3 py-3 text-left">Periodo</th>
                <th className="px-3 py-3 text-left">Estado</th>
                <th className="px-3 py-3 text-left">Registrado por</th>
              </tr>
            </thead>

            <tbody>
              {pagos.map((pago) => (
                <tr key={pago.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-3">{date(pago.fecha_pago)}</td>
                  <td className="px-3 py-3 font-semibold">
                    {money(pago.monto)}
                  </td>
                  <td className="px-3 py-3">{pago.metodo_pago || "-"}</td>
                  <td className="px-3 py-3">{pago.referencia || "-"}</td>
                  <td className="px-3 py-3">{pago.periodo_cubierto || "-"}</td>
                  <td className="px-3 py-3">
                    <EstadoPago estado={pago.estado} />
                  </td>
                  <td className="px-3 py-3">{pago.registrado_por || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EstadoPago({ estado }) {
  const styles = {
    Pagado: "bg-emerald-100 text-emerald-800",
    Pendiente: "bg-amber-100 text-amber-800",
    Rechazado: "bg-red-100 text-red-800",
    Fallido: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[estado] || "bg-zinc-100 text-zinc-700"
      }`}
    >
      {estado || "-"}
    </span>
  );
}
