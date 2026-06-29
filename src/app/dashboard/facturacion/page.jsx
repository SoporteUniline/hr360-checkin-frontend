"use client";

import React from "react";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  FileText,
  Wallet,
} from "lucide-react";

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

const estadoStyles = {
  Pendiente: "bg-amber-100 text-amber-800",
  Vencida: "bg-red-100 text-red-800",
  "Pagada Stripe": "bg-emerald-100 text-emerald-800",
  "Pagada Externa": "bg-blue-100 text-blue-800",
  Cancelada: "bg-zinc-200 text-zinc-700",
};

export default function FacturacionDashboardPage() {
  const { data, isLoading, error } = useSWR(
    "/stripe/dashboard-financiero",
    fetcherWithToken,
  );

  const { data: facturasRecientesData } = useSWR(
    "/stripe/facturas-recientes?limit=20",
    fetcherWithToken,
  );

  const resumen = data?.resumen || {};
  const topAdeudos = data?.top_adeudos || [];

  const facturasRecientes = facturasRecientesData?.data || [];

  if (isLoading) {
    return (
      <p className="text-sm text-gray-500">Cargando dashboard financiero...</p>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Error al cargar el dashboard financiero.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          Facturación Adamia
        </h1>
        <p className="text-sm text-gray-500">
          Resumen general de facturas, pagos, adeudos y empresas suspendidas.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Total cobrado"
          value={money(resumen.total_cobrado)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <MetricCard
          title="Saldo pendiente"
          value={money(resumen.saldo_pendiente)}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <MetricCard
          title="Facturas"
          value={resumen.total_facturas || 0}
          icon={<FileText className="h-5 w-5" />}
        />
        <MetricCard
          title="Pendientes"
          value={resumen.facturas_pendientes || 0}
          icon={<FileText className="h-5 w-5" />}
        />
        <MetricCard
          title="Vencidas"
          value={resumen.facturas_vencidas || 0}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <MetricCard
          title="Suspendidas"
          value={resumen.empresas_suspendidas || 0}
          icon={<Ban className="h-5 w-5" />}
        />
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold text-slate-700">
            Empresas con adeudo
          </h2>
          <p className="text-sm text-gray-500">
            Top empresas ordenadas por saldo pendiente.
          </p>
        </div>

        {topAdeudos.length === 0 ? (
          <div className="flex items-center gap-2 p-5 text-sm text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            No hay empresas con adeudo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Adeudos</th>
                  <th className="px-4 py-3 text-left">Saldo</th>
                </tr>
              </thead>

              <tbody>
                {topAdeudos.map((item) => (
                  <tr
                    key={item.id_empresa}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-slate-800">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        {item.nombre_empresa}
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.adeudos}</td>
                    <td className="px-4 py-3 font-semibold">
                      {money(item.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold text-slate-700">
            Facturas recientes
          </h2>
          <p className="text-sm text-gray-500">
            Últimas facturas generadas en Adamia.
          </p>
        </div>

        {facturasRecientes.length === 0 ? (
          <div className="p-5 text-sm text-gray-500">
            No hay facturas recientes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Factura</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Periodo</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha emisión</th>
                </tr>
              </thead>

              <tbody>
                {facturasRecientes.map((factura) => (
                  <tr key={factura.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {factura.numero_factura ||
                          factura.stripe_invoice_id ||
                          `#${factura.id}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {factura.cliente_email}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {factura.nombre_empresa || "-"}
                    </td>

                    <td className="px-4 py-3">
                      {date(factura.periodo_inicio)} -{" "}
                      {date(factura.periodo_fin)}
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      {money(factura.total)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          estadoStyles[factura.estado] ||
                          "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {factura.estado || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">{date(factura.fecha_emision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between text-gray-500">
        <p className="text-xs font-medium uppercase">{title}</p>
        {icon}
      </div>
      <p className="text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}
