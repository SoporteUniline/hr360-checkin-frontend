"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Plus, X } from "lucide-react";
import axiosInstance from "@/lib/axios";
import Cookies from "js-cookie";
import { enqueueSnackbar } from "notistack";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const formatDate = (value) => {
  if (!value) return "-";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const getCurrentMonthPeriod = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 12);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12);

  return {
    inicio: start.toISOString().slice(0, 10),
    fin: end.toISOString().slice(0, 10),
  };
};

export default function FacturasEmpresaTab({ empresa }) {
  const empresaId = empresa?.id_empresa;
  const token = Cookies.get("token");
  const [showNuevaFactura, setShowNuevaFactura] = useState(false);
  const [creating, setCreating] = useState(false);
  const [facturaPago, setFacturaPago] = useState(null);
  const [paying, setPaying] = useState(false);
  const [pagoForm, setPagoForm] = useState({
    metodo_pago: "Transferencia",
    referencia_pago: "",
    notas: "",
  });
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");

  const { data, isLoading, mutate } = useSWR(
    empresaId ? `/empresas/${empresaId}/facturas` : null,
    fetcherWithToken,
  );

  const { data: suscripcionData } = useSWR(
    empresaId ? `/empresas/${empresaId}/suscripcion` : null,
    fetcherWithToken,
  );

  const facturas = data?.data || [];
  const facturasFiltradas =
    estadoFiltro === "Todos"
      ? facturas
      : facturas.filter((f) => f.estado === estadoFiltro);
  const suscripcion = suscripcionData?.data || null;

  const totalPendiente = facturas
    .filter((f) => f.estado === "Pendiente")
    .reduce((acc, f) => acc + Number(f.total || 0), 0);

  const totalPagado = facturas
    .filter(
      (f) => f.estado === "Pagada Stripe" || f.estado === "Pagada Externa",
    )
    .reduce((acc, f) => acc + Number(f.total || 0), 0);

  const facturasPendientes = facturas.filter(
    (f) => f.estado === "Pendiente",
  ).length;

  const periodoDefault = useMemo(() => getCurrentMonthPeriod(), []);

  const [form, setForm] = useState({
    periodo_inicio: periodoDefault.inicio,
    periodo_fin: periodoDefault.fin,
    total: "",
    concepto: "",
  });

  React.useEffect(() => {
    if (!suscripcion) return;

    setForm((prev) => ({
      ...prev,
      total:
        prev.total ||
        String(
          Number(
            suscripcion.precio_por_mes ||
              suscripcion.precio_base ||
              suscripcion.monto_total ||
              0,
          ),
        ),
      concepto:
        prev.concepto ||
        `Factura mensual ADAMIA — Contrato ${
          suscripcion.contrato_id || suscripcion.contratacion_id
        }`,
    }));
  }, [suscripcion]);

  const abrirPagoExterno = (factura) => {
    setFacturaPago(factura);
    setPagoForm({
      metodo_pago: "Transferencia",
      referencia_pago: "",
      notas: "",
    });
  };

  const cerrarPagoExterno = () => {
    if (paying) return;
    setFacturaPago(null);
  };

  const confirmarPagoExterno = async (e) => {
    e.preventDefault();

    if (!facturaPago?.id) return;

    try {
      setPaying(true);

      await axiosInstance.post(
        `/stripe/facturas/${facturaPago.id}/pago-externo`,
        {
          metodo_pago: pagoForm.metodo_pago || "Transferencia",
          referencia_pago:
            pagoForm.referencia_pago?.trim() || `MANUAL-${Date.now()}`,
          reflect_in_stripe: true,
          extender_periodo: true,
          notas:
            pagoForm.notas?.trim() || "Pago externo registrado desde Empresas",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      enqueueSnackbar("Factura marcada como pagada externa", {
        variant: "success",
      });

      setFacturaPago(null);
      mutate();
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message || "Error al marcar factura",
        { variant: "error" },
      );
    } finally {
      setPaying(false);
    }
  };

  const crearFactura = async (e) => {
    e.preventDefault();

    if (!suscripcion?.contratacion_id) {
      enqueueSnackbar("Esta empresa no tiene contratación asociada", {
        variant: "error",
      });
      return;
    }

    if (!form.periodo_inicio || !form.periodo_fin || !form.total) {
      enqueueSnackbar("Completa periodo y total", { variant: "warning" });
      return;
    }

    try {
      setCreating(true);

      await axiosInstance.post(
        "/stripe/facturas/manual",
        {
          contratacion_id: suscripcion.contratacion_id,
          periodo_inicio: form.periodo_inicio,
          periodo_fin: form.periodo_fin,
          total: Number(form.total),
          concepto:
            form.concepto ||
            `Factura mensual ADAMIA — Contrato ${suscripcion.contrato_id}`,
          days_until_due: 7,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      enqueueSnackbar("Factura creada correctamente", {
        variant: "success",
      });

      setShowNuevaFactura(false);
      mutate();
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message || "Error al crear factura",
        { variant: "error" },
      );
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando facturas...</p>;
  }

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-700">Facturas</h2>
          <p className="text-sm text-gray-500">
            Facturas generadas en Stripe y registradas en Adamia.
          </p>
        </div>

        <Button
          type="button"
          className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
          onClick={() => setShowNuevaFactura((prev) => !prev)}
          disabled={!suscripcion?.contratacion_id}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva factura
        </Button>
      </div>

      {showNuevaFactura && (
        <form
          onSubmit={crearFactura}
          className="mb-4 rounded-lg border bg-white p-4"
        >
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Crear factura manual
          </h3>

          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Periodo inicio">
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.periodo_inicio}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    periodo_inicio: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Periodo fin">
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.periodo_fin}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    periodo_fin: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Total">
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.total}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, total: e.target.value }))
                }
              />
            </Field>

            <Field label="Concepto">
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.concepto}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, concepto: e.target.value }))
                }
              />
            </Field>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNuevaFactura(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={creating}
            >
              {creating ? "Creando..." : "Crear factura"}
            </Button>
          </div>
        </form>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <ResumenCard
          title="Saldo pendiente"
          value={formatMoney(totalPendiente)}
        />
        <ResumenCard title="Total pagado" value={formatMoney(totalPagado)} />
        <ResumenCard title="Facturas pendientes" value={facturasPendientes} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          "Todos",
          "Pendiente",
          "Pagada Stripe",
          "Pagada Externa",
          "Vencida",
          "Cancelada",
        ].map((estado) => (
          <Button
            key={estado}
            type="button"
            size="sm"
            variant={estadoFiltro === estado ? "default" : "outline"}
            onClick={() => setEstadoFiltro(estado)}
            className={
              estadoFiltro === estado
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "bg-white"
            }
          >
            {estado}
          </Button>
        ))}
      </div>

      {facturasFiltradas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
          Esta empresa todavía no tiene facturas registradas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-3 text-left">Factura</th>
                <th className="px-3 py-3 text-left">Periodo</th>
                <th className="px-3 py-3 text-left">Total</th>
                <th className="px-3 py-3 text-left">Estado</th>
                <th className="px-3 py-3 text-left">Método</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {facturasFiltradas.map((factura) => (
                <tr key={factura.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-800">
                      {factura.numero_factura ||
                        factura.stripe_invoice_id ||
                        `#${factura.id}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {factura.cliente_email}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    {formatDate(factura.periodo_inicio)} -{" "}
                    {formatDate(factura.periodo_fin)}
                  </td>

                  <td className="px-3 py-3 font-semibold">
                    {formatMoney(factura.total)}
                  </td>

                  <td className="px-3 py-3">
                    <EstadoFactura estado={factura.estado} />
                  </td>

                  <td className="px-3 py-3">{factura.metodo_pago || "-"}</td>

                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      {factura.invoice_pdf && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(factura.invoice_pdf, "_blank")
                          }
                        >
                          <FileText className="mr-1 h-4 w-4" />
                          PDF
                        </Button>
                      )}

                      {factura.hosted_invoice_url && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(factura.hosted_invoice_url, "_blank")
                          }
                        >
                          <ExternalLink className="mr-1 h-4 w-4" />
                          Stripe
                        </Button>
                      )}

                      {["Pendiente", "Vencida"].includes(factura.estado) && (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => abrirPagoExterno(factura)}
                        >
                          Marcar pagada
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {facturaPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  Marcar factura como pagada
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Confirma el pago externo de esta factura.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={cerrarPagoExterno}
                disabled={paying}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={confirmarPagoExterno} className="px-5 py-4">
              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoPago
                    label="Factura"
                    value={facturaPago.numero_factura || `#${facturaPago.id}`}
                  />
                  <InfoPago
                    label="Monto"
                    value={formatMoney(facturaPago.total)}
                  />
                  <InfoPago
                    label="Periodo"
                    value={`${formatDate(
                      facturaPago.periodo_inicio,
                    )} - ${formatDate(facturaPago.periodo_fin)}`}
                  />
                  <InfoPago
                    label="Cliente"
                    value={facturaPago.cliente_email || "-"}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <Field label="Método de pago">
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={pagoForm.metodo_pago}
                    onChange={(e) =>
                      setPagoForm((prev) => ({
                        ...prev,
                        metodo_pago: e.target.value,
                      }))
                    }
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cortesia">Cortesía</option>
                    <option value="Otro">Otro</option>
                  </select>
                </Field>

                <Field label="Referencia">
                  <input
                    type="text"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Ej. SPEI-12345, comprobante, folio..."
                    value={pagoForm.referencia_pago}
                    onChange={(e) =>
                      setPagoForm((prev) => ({
                        ...prev,
                        referencia_pago: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field label="Notas">
                  <textarea
                    className="min-h-20 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Observaciones del pago..."
                    value={pagoForm.notas}
                    onChange={(e) =>
                      setPagoForm((prev) => ({
                        ...prev,
                        notas: e.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Al confirmar, la factura se marcará como <b>Pagada Externa</b>,
                se reflejará en Stripe como pago externo y se registrará en el
                historial de pagos.
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cerrarPagoExterno}
                  disabled={paying}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={paying}
                >
                  {paying ? "Registrando..." : "Confirmar pago"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoPago({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}

function ResumenCard({ title, value }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-medium uppercase text-gray-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function EstadoFactura({ estado }) {
  const styles = {
    Pendiente: "bg-amber-100 text-amber-800",
    "Pagada Stripe": "bg-emerald-100 text-emerald-800",
    "Pagada Externa": "bg-blue-100 text-blue-800",
    Vencida: "bg-red-100 text-red-800",
    Cancelada: "bg-zinc-200 text-zinc-700",
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
