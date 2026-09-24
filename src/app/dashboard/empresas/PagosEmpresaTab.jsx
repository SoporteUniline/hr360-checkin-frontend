"use client";

import React from "react";
import useSWR from "swr";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./detalleEmpresa.module.css";
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

  const { data, error, isLoading, mutate } = useSWR(
    empresaId ? `/empresas/${empresaId}/pagos` : null,
    fetcherWithToken
  );

  const pagos = data?.data || [];

  if (error)
    return (
      <div className={styles.empty} role="alert">
        <Wallet size={28} />
        <p>No se pudieron consultar los pagos.</p>
        <Button variant="outline" onClick={() => mutate().catch(() => {})}>
          Reintentar pagos
        </Button>
      </div>
    );

  if (isLoading) {
    return <p className="mt-4 text-sm text-gray-500">Cargando pagos...</p>;
  }

  return (
    <div className={styles.content}>
      <div className={styles.contentHeading}>
        <div>
          <h2 className="text-base font-semibold text-slate-700">
            Historial de pagos
          </h2>
          <p className="text-sm text-gray-500">
            Consulta los pagos y ajustes registrados para esta empresa.
          </p>
        </div>
        <span className={styles.status}>{pagos.length} movimientos</span>
      </div>

      {pagos.length === 0 ? (
        <div className={styles.empty}>
          <Wallet size={28} />
          Esta empresa todavía no tiene pagos registrados.
        </div>
      ) : (
        <div className={styles.ledger}>
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
              {pagos.map((pago) => {
                const esAjusteCobertura =
                  pago.referencia?.startsWith("AJUSTE-COBERTURA-");

                return (
                  <tr key={pago.id} className="border-t hover:bg-gray-50">
                    <td data-label="Fecha" className="px-3 py-3">
                      {date(pago.fecha_pago)}
                    </td>

                    <td data-label="Monto" className="px-3 py-3 font-semibold">
                      {esAjusteCobertura ? "—" : money(pago.monto)}
                    </td>

                    <td data-label="Método" className="px-3 py-3">
                      {esAjusteCobertura
                        ? "Ajuste administrativo"
                        : pago.metodo_pago || "-"}
                    </td>

                    <td data-label="Referencia" className="px-3 py-3">
                      {esAjusteCobertura
                        ? pago.notas || "Ajuste manual de cobertura"
                        : pago.referencia || "-"}
                    </td>

                    <td data-label="Periodo" className="px-3 py-3">
                      {pago.periodo_cubierto || "-"}
                    </td>

                    <td data-label="Estado" className="px-3 py-3">
                      {esAjusteCobertura ? (
                        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                          Ajuste
                        </span>
                      ) : (
                        <EstadoPago estado={pago.estado} />
                      )}
                    </td>

                    <td data-label="Registrado por" className="px-3 py-3">
                      {pago.registrado_por || "-"}
                    </td>
                  </tr>
                );
              })}
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
