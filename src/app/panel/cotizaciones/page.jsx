"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import TablePagination from "@/components/TablePagination";

function formatCurrencyMXN(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-MX");
}

export default function CotizacionesAdminPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set("search", search);
    return `/checador/contrataciones/cotizaciones/admin?${params.toString()}`;
  }, [page, limit, search]);

  const { data, isLoading } = useSWR(endpoint, fetcherWithToken, swr_config);
  const cotizaciones = data?.cotizaciones || [];
  const total = Number(data?.total || 0);

  const onSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#2563EB] p-2.5 rounded-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Cotizaciones web</h1>
            <p className="text-sm text-gray-600">
              Seguimiento de personas interesadas en ADAMIA desde la landing.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de cotizaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nombre, empresa, correo o teléfono..."
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearch();
                }}
              />
            </div>
            <Button onClick={onSearch} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              Buscar
            </Button>
          </div>

          <div className="space-y-3 md:hidden">
            {isLoading ? (
              <div className="rounded-lg border bg-white p-3 text-sm text-gray-500">
                Cargando cotizaciones...
              </div>
            ) : cotizaciones.length === 0 ? (
              <div className="rounded-lg border bg-white p-3 text-sm text-gray-500">
                No hay cotizaciones registradas.
              </div>
            ) : (
              cotizaciones.map((row) => (
                <article key={row.id} className="rounded-lg border bg-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">#{row.id}</p>
                    <Badge variant="secondary">{row.estado || "Pendiente"}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium">{row.nombre_contacto || "—"}</p>
                  <p className="text-xs text-gray-600">{row.empresa || "—"}</p>
                  <div className="mt-2 space-y-1 text-xs text-gray-700">
                    <p>
                      <strong>Tel:</strong> {row.telefono || "—"}
                    </p>
                    <p>
                      <strong>Correo:</strong> {row.correo || "—"}
                    </p>
                    <p>
                      <strong>Plan:</strong> {row.meses ?? "—"} meses • {row.empleados ?? "—"} empleados
                    </p>
                    <p>
                      <strong>Total:</strong> {formatCurrencyMXN(row.monto_total)}
                    </p>
                    <p>
                      <strong>Fecha:</strong> {formatDateTime(row.fecha_cotizacion)}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="hidden rounded-lg border overflow-x-auto md:block">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-700">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Empresa</th>
                  <th className="px-3 py-2">Teléfono</th>
                  <th className="px-3 py-2">Correo</th>
                  <th className="px-3 py-2">Empleados</th>
                  <th className="px-3 py-2">Meses</th>
                  <th className="px-3 py-2">Precio mensual</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Descuento</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-3 py-3 text-gray-500" colSpan={13}>
                      Cargando cotizaciones...
                    </td>
                  </tr>
                ) : cotizaciones.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-gray-500" colSpan={13}>
                      No hay cotizaciones registradas.
                    </td>
                  </tr>
                ) : (
                  cotizaciones.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{row.id}</td>
                      <td className="px-3 py-2">{row.nombre_contacto || "—"}</td>
                      <td className="px-3 py-2">{row.empresa || "—"}</td>
                      <td className="px-3 py-2">{row.telefono || "—"}</td>
                      <td className="px-3 py-2">{row.correo || "—"}</td>
                      <td className="px-3 py-2">{row.empleados ?? "—"}</td>
                      <td className="px-3 py-2">{row.meses ?? "—"}</td>
                      <td className="px-3 py-2">
                        {formatCurrencyMXN(row.precio_mensual)}
                      </td>
                      <td className="px-3 py-2">{formatCurrencyMXN(row.monto_total)}</td>
                      <td className="px-3 py-2">
                        {Number(row.descuento_porcentaje || 0)}%
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{row.origen || "Web"}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary">{row.estado || "Pendiente"}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {formatDateTime(row.fecha_cotizacion)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
