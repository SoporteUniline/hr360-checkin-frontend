"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import axiosInstance from "@/lib/axios";
import { enqueueSnackbar } from "notistack";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  CalendarDays,
} from "lucide-react";
import LoadingTable from "@/components/LoadingTable";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatMXN(val) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(val || 0));
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatMes(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

const ESTADO_SUSCRIPCION = {
  Activa: { label: "Activa", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  PendientePago: { label: "Pendiente de pago", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  Vencida: { label: "Vencida", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  Cancelada: { label: "Cancelada", color: "bg-slate-100 text-slate-600", icon: XCircle },
};

const ESTADO_FACTURA = {
  paid: { label: "Pagada", color: "bg-green-100 text-green-700" },
  open: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  void: { label: "Anulada", color: "bg-slate-100 text-slate-500" },
  uncollectible: { label: "Incobrable", color: "bg-red-100 text-red-700" },
};

// ── Página principal ───────────────────────────────────────────────────────────

export default function MiSuscripcionPage() {
  const { data, isLoading, error, mutate } = useSWR(
    "/stripe/mi-suscripcion",
    fetcherWithToken,
  );

  const [abriendo, setAbriendo] = useState(false);
  const [generando, setGenerando] = useState(false);

  const handleGenerarEnlace = async () => {
    setGenerando(true);
    try {
      const { data: res } = await axiosInstance.post(
        `/stripe/generar-enlace/${suscripcion.id}`,
      );
      await mutate();
      window.location.href = res.enlace_pago_stripe;
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || "Error al generar el enlace de pago.",
        { variant: "error" },
      );
    } finally {
      setGenerando(false);
    }
  };

  const handleAbrirPortal = async () => {
    setAbriendo(true);
    try {
      const { data: res } = await axiosInstance.post("/stripe/portal-cliente");
      window.open(res.url, "_blank");
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message ||
          "No se pudo abrir el portal. Asegúrate de tener una suscripción activa con Stripe.",
        { variant: "error" },
      );
    } finally {
      setAbriendo(false);
    }
  };

  if (isLoading) return <LoadingTable rows={6} />;
  if (error)
    return (
      <div className="text-center py-16 text-slate-500">
        Error al cargar tu suscripción. Intenta de nuevo.
      </div>
    );

  const { suscripcion, stripeInfo } = data || {};

  if (!suscripcion) {
    return (
      <div className="space-y-4">
        <Header />
        <div className="border rounded-xl p-10 text-center text-slate-500">
          No tienes ninguna contratación registrada aún.
        </div>
      </div>
    );
  }

  const estadoRaw = suscripcion.estado_suscripcion || suscripcion.estado_contrato;
  const estadoInfo = ESTADO_SUSCRIPCION[estadoRaw] || {
    label: suscripcion.estado_contrato || "Sin activar",
    color: "bg-slate-100 text-slate-600",
    icon: Clock,
  };
  const EstadoIcon = estadoInfo.icon;

  const precioPorMes =
    Number(suscripcion.precio_por_mes || 0) ||
    Number(suscripcion.plan_precio_base || 0);
  const descuento = Number(suscripcion.descuento_porcentaje || 0);
  const precioMensualFinal = precioPorMes * (1 - descuento / 100);

  const facturasPagadas = stripeInfo?.facturas?.filter((f) => f.estado === "paid") || [];
  const mesesPagados = facturasPagadas.length;

  return (
    <div className="space-y-6 max-w-2xl">
      <Header onRefresh={mutate} />

      {/* Tarjeta principal */}
      <div className="border rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {suscripcion.nombre_plan || "Plan contratado"}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Contrato: {suscripcion.contrato_id}
            </p>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${estadoInfo.color}`}>
            <EstadoIcon className="w-3.5 h-3.5" />
            {estadoInfo.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoRow label="Precio mensual">
            {precioMensualFinal > 0 ? `${formatMXN(precioMensualFinal)} / mes` : "—"}
          </InfoRow>
          <InfoRow label="Próximo cobro">
            {stripeInfo?.proximo_cobro ? formatDate(stripeInfo.proximo_cobro) : formatDate(suscripcion.fecha_fin || suscripcion.fecha_vencimiento)}
          </InfoRow>
          <InfoRow label="Cliente desde">
            {formatDate(suscripcion.fecha_inicio)}
          </InfoRow>
          <InfoRow label="Meses pagados">
            {mesesPagados > 0 ? `${mesesPagados} ${mesesPagados === 1 ? "mes" : "meses"}` : "—"}
          </InfoRow>
        </div>

        {/* Tarjeta registrada */}
        {stripeInfo?.tarjeta && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm">
            <CreditCard className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-slate-700 capitalize">{stripeInfo.tarjeta.marca}</span>
            <span className="text-slate-500">•••• {stripeInfo.tarjeta.ultimos4}</span>
            <span className="text-slate-400 text-xs ml-auto">Vence {stripeInfo.tarjeta.expira}</span>
          </div>
        )}

        {/* Caso 1: Sin stripe_customer_id */}
        {!suscripcion.stripe_customer_id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Activa el pago en línea</p>
            <p className="mb-3">
              Tu contrato está activo pero aún no tienes pago automático configurado.
              Al activarlo se te cobrará de forma mensual el día 1 de cada mes.
            </p>
            <Button size="sm" disabled={generando} onClick={handleGenerarEnlace} className="gap-2 bg-blue-700 hover:bg-blue-800 text-white">
              <CreditCard className="w-4 h-4" />
              {generando ? "Generando enlace..." : "Activar pago mensual"}
            </Button>
          </div>
        )}

        {/* Caso 2: Tiene customer pero pago pendiente */}
        {suscripcion.stripe_customer_id &&
          suscripcion.estado_suscripcion !== "Activa" &&
          suscripcion.estado_suscripcion !== "Vencida" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-semibold mb-1">Pago de activación pendiente</p>
              <p className="mb-3">
                Aún no has completado el proceso de pago. Si el enlace expiró, genera uno nuevo.
              </p>
              <div className="flex flex-wrap gap-2">
                {suscripcion.enlace_pago_stripe && (
                  <a href={suscripcion.enlace_pago_stripe} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-yellow-700 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-yellow-800">
                    <CreditCard className="w-3.5 h-3.5" />
                    Ir a completar el pago
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <Button size="sm" variant="outline" disabled={generando} onClick={handleGenerarEnlace}
                  className="gap-2 border-yellow-600 text-yellow-800 hover:bg-yellow-100">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {generando ? "Generando..." : "Regenerar enlace"}
                </Button>
              </div>
            </div>
          )}

        {/* Caso 3: Vencida — puede reactivarse solo */}
        {suscripcion.estado_suscripcion === "Vencida" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">Tu acceso está suspendido</p>
            <p className="mb-3">
              Tu suscripción fue cancelada por falta de pago. Puedes reactivarla
              en cualquier momento — el cobro será mensual a partir del 1 del
              mes siguiente.
            </p>
            <Button
              size="sm"
              disabled={generando}
              onClick={handleGenerarEnlace}
              className="gap-2 bg-red-700 hover:bg-red-800 text-white"
            >
              <CreditCard className="w-4 h-4" />
              {generando ? "Generando enlace..." : "Reactivar suscripción"}
            </Button>
          </div>
        )}

        {/* Caso 4: Activa con Stripe */}
        {suscripcion.estado_suscripcion === "Activa" && suscripcion.stripe_customer_id && (
          <div className="space-y-2">
            <Button onClick={handleAbrirPortal} disabled={abriendo} className="w-full gap-2" variant="outline">
              <CreditCard className="w-4 h-4" />
              {abriendo ? "Abriendo portal..." : "Cambiar tarjeta o cancelar suscripción"}
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60" />
            </Button>
            {!suscripcion.stripe_subscription_id && (
              <p className="text-xs text-slate-400 text-center">
                ¿No completaste el pago inicial?{" "}
                <button className="underline text-slate-600 hover:text-slate-900" disabled={generando} onClick={handleGenerarEnlace}>
                  {generando ? "Generando..." : "Haz clic aquí para activar el cobro automático"}
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Historial de facturas de Stripe */}
      {stripeInfo?.facturas?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Historial de pagos
            </h3>
            <span className="text-xs text-slate-400 ml-auto">
              {mesesPagados} {mesesPagados === 1 ? "mes pagado" : "meses pagados"}
            </span>
          </div>
          <div className="border rounded-xl overflow-hidden divide-y">
            {stripeInfo.facturas.map((factura) => {
              const estadoF = ESTADO_FACTURA[factura.estado] || { label: factura.estado, color: "bg-slate-100 text-slate-600" };
              return (
                <div key={factura.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700">{formatMXN(factura.monto)}</p>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">
                      {formatMes(factura.periodo_inicio)} · {formatDate(factura.fecha)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${estadoF.color}`}>
                    {estadoF.label}
                  </span>
                  {factura.pdf_url && (
                    <a href={factura.pdf_url} target="_blank" rel="noreferrer"
                      className="text-slate-400 hover:text-slate-700 shrink-0" title="Descargar PDF">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  {factura.estado === "open" && factura.hosted_url && (
                    <a href={factura.hosted_url} target="_blank" rel="noreferrer"
                      className="text-yellow-600 hover:text-yellow-800 text-xs font-semibold shrink-0">
                      Pagar
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ onRefresh }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-slate-600" />
        <h1 className="text-xl font-bold text-slate-800">Mi suscripción</h1>
      </div>
      {onRefresh && (
        <button onClick={onRefresh} className="text-slate-400 hover:text-slate-700 transition-colors" title="Actualizar">
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div>
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="text-slate-700 font-medium">{children}</p>
    </div>
  );
}
