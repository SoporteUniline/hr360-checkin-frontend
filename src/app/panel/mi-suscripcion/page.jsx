"use client";

import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  RefreshCw,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
} from "lucide-react";
import LoadingTable from "@/components/LoadingTable";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import StatCard from "@/components/StatCard";

function formatMXN(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function estadoFacturaBadge(estado) {
  const styles = {
    Pendiente: "bg-yellow-100 text-yellow-700",
    Vencida: "bg-red-100 text-red-700",
    "Pagada Stripe": "bg-green-100 text-green-700",
    "Pagada Externa": "bg-green-100 text-green-700",
    Cancelada: "bg-slate-100 text-slate-600",
  };

  return (
    <Badge className={styles[estado] || "bg-slate-100 text-slate-600"}>
      {estado || "Sin estado"}
    </Badge>
  );
}

function estadoCuentaBadge(estado) {
  const styles = {
    "Al corriente": "bg-green-100 text-green-700",
    "Con adeudo": "bg-yellow-100 text-yellow-700",
    "En segundo adeudo": "bg-orange-100 text-orange-700",
    Suspendido: "bg-red-100 text-red-700",
  };

  return (
    <Badge className={styles[estado] || "bg-slate-100 text-slate-600"}>
      {estado || "Sin estado"}
    </Badge>
  );
}

export default function MiSuscripcionPage() {
  const { data, isLoading, error, mutate } = useSWR(
    "/stripe/mi-suscripcion",
    fetcherWithToken,
  );

  if (isLoading) return <LoadingTable rows={6} />;

  if (error) {
    return (
      <div className="p-6 text-center text-slate-500">
        Error al cargar tu estado de cuenta.
      </div>
    );
  }

  const { suscripcion, resumen = {}, facturas = [], pagos = [] } = data || {};

  if (!suscripcion) {
    return (
      <div className="space-y-4 max-w-5xl">
        <Header onRefresh={mutate} />
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No tienes ninguna contratación registrada.
          </CardContent>
        </Card>
      </div>
    );
  }

  const facturasPendientes = facturas.filter((factura) =>
    ["Pendiente", "Vencida"].includes(factura.estado),
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <Header onRefresh={mutate} />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={CreditCard}
          accent="blue"
          title="Estado financiero"
          value={estadoCuentaBadge(resumen.estatus_financiero)}
        />
        <StatCard
          icon={AlertTriangle}
          accent="amber"
          title="Saldo pendiente"
          value={formatMXN(resumen.saldo_pendiente)}
        />
        <StatCard
          icon={CheckCircle2}
          accent="emerald"
          title="Total pagado"
          value={formatMXN(resumen.total_pagado)}
        />
        <StatCard
          icon={Clock}
          accent="violet"
          title="Facturas pendientes"
          value={resumen.facturas_pendientes || 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Resumen de suscripción
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-3">
          <Info label="Empresa" value={suscripcion.nombre_empresa} />
          <Info label="Contrato" value={suscripcion.contrato_id} />
          <Info label="Estado empresa" value={suscripcion.estado_empresa} />
          <Info label="Estado contrato" value={suscripcion.estado_contrato} />
          <Info
            label="Mensualidad actual"
            value={formatMXN(suscripcion.mensualidad_actual)}
          />
          <Info
            label="Vencimiento"
            value={formatDate(suscripcion.fecha_vencimiento)}
          />
          <Info
            label="Empleados activos"
            value={suscripcion.empleados_activos ?? 0}
          />
          <Info
            label="Empleados facturables"
            value={suscripcion.empleados_facturables ?? suscripcion.empleados}
          />
          <Info
            label="Precio por empleado excedente"
            value={formatMXN(suscripcion.precio_empleado_extra)}
          />
          <Info
            label="Precio base mensual"
            value={formatMXN(suscripcion.precio_base_mensual)}
          />
          <Info
            label="Empleados incluidos"
            value={suscripcion.empleados_incluidos ?? 0}
          />
          <Info label="Origen" value={suscripcion.origen || "—"} />
        </CardContent>
      </Card>

      {facturasPendientes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Tienes facturas pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-800">
              Puedes abrir cada factura en Stripe para pagarla en línea. Si ya
              pagaste por transferencia, espera a que el administrador aplique
              el pago.
            </p>

            <div className="flex flex-wrap gap-2">
              {facturasPendientes.map((factura) =>
                factura.hosted_invoice_url ? (
                  <Button key={factura.id} asChild>
                    <a
                      href={factura.hosted_invoice_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Pagar {formatMXN(factura.total)}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                ) : null,
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturas
          </CardTitle>
        </CardHeader>

        <CardContent>
          {facturas.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aún no tienes facturas registradas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {facturas.map((factura) => (
                  <TableRow key={factura.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(factura.periodo_inicio)} -{" "}
                      {formatDate(factura.periodo_fin)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {factura.concepto || "Factura Adamia"}
                    </TableCell>
                    <TableCell>{estadoFacturaBadge(factura.estado)}</TableCell>
                    <TableCell>
                      {formatDate(factura.fecha_vencimiento)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMXN(factura.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {factura.hosted_invoice_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={factura.hosted_invoice_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {["Pendiente", "Vencida"].includes(factura.estado)
                                ? "Pagar"
                                : "Ver"}
                            </a>
                          </Button>
                        )}

                        {factura.invoice_pdf && (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={factura.invoice_pdf}
                              target="_blank"
                              rel="noreferrer"
                            >
                              PDF
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pagos registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell>{formatDate(pago.fecha_pago)}</TableCell>
                    <TableCell>{pago.metodo_pago || "—"}</TableCell>
                    <TableCell>{pago.referencia || "—"}</TableCell>
                    <TableCell>{pago.periodo_cubierto || "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatMXN(pago.monto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Header({ onRefresh }) {
  return (
    <EncabezadoPagina
      icono={CreditCard}
      titulo="Mi suscripción"
      subtitulo="Consulta tu estado de cuenta, facturas y pagos de Adamia."
      acciones={
        <Button variant="outline" onClick={() => onRefresh?.()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      }
    />
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-800">
        {value || "—"}
      </div>
    </div>
  );
}
