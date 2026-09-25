"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetchCompanySummary } from "./empresaResumen";
import axiosInstance from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enqueueSnackbar } from "notistack";
import styles from "./detalleEmpresa.module.css";

const money = (value) =>
  Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const date = (value) => {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export default function SuscripcionEmpresaTab({ empresa }) {
  const empresaId = empresa?.id_empresa;

  const {
    data,
    error: subscriptionError,
    isLoading,
    mutate,
  } = useSWR(
    empresaId ? `/empresas/${empresaId}/suscripcion` : null,
    fetchCompanySummary
  );

  const {
    data: resumenFinancieroData,
    error: financialError,
    isLoading: financialLoading,
    mutate: refreshFinancial,
  } = useSWR(
    empresaId ? `/empresas/${empresaId}/resumen-financiero` : null,
    fetchCompanySummary
  );

  const suscripcion = data?.data;
  const resumenFinanciero = resumenFinancieroData?.data;

  const [form, setForm] = useState({
    precio_base_mensual: "",
    empleados_incluidos: "",
    precio_empleado_extra: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!suscripcion) return;

    setForm({
      precio_base_mensual: suscripcion.precio_base_mensual ?? 0,
      empleados_incluidos: suscripcion.empleados_incluidos ?? 0,
      precio_empleado_extra: suscripcion.precio_empleado_extra ?? 60,
    });
  }, [suscripcion]);

  const preview = useMemo(() => {
    const activos = Number(suscripcion?.empleados_activos || 0);
    const base = Number(form.precio_base_mensual || 0);
    const incluidos = Number(form.empleados_incluidos || 0);
    const extra = Number(form.precio_empleado_extra || 60);
    const excedentes = Math.max(activos - incluidos, 0);
    const total = base + excedentes * extra;

    return { activos, base, incluidos, extra, excedentes, total };
  }, [form, suscripcion]);

  const set = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const guardarConfiguracion = async () => {
    setSaving(true);
    try {
      await axiosInstance.put(`/empresas/${empresaId}/suscripcion/comercial`, {
        precio_base_mensual: Number(form.precio_base_mensual || 0),
        empleados_incluidos: Number(form.empleados_incluidos || 0),
        precio_empleado_extra: Number(form.precio_empleado_extra || 60),
      });

      enqueueSnackbar("Configuración comercial actualizada.", {
        variant: "success",
      });

      await mutate();
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error ||
          "No se pudo actualizar la configuración comercial.",
        { variant: "error" }
      );
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <p className="mt-4 text-sm text-gray-500">Cargando suscripción...</p>
    );
  }

  if (subscriptionError) {
    return (
      <div
        role="alert"
        className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        No se pudo consultar la suscripción.
        <Button
          variant="outline"
          className="ml-3"
          onClick={() => mutate().catch(() => {})}
        >
          Reintentar suscripción
        </Button>
      </div>
    );
  }

  if (!suscripcion) {
    return (
      <div className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
        Esta empresa no tiene una suscripción asociada.
      </div>
    );
  }

  return (
    <div className={styles.content}>
      {financialError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          No se pudo consultar el saldo de esta empresa.
          <Button
            variant="outline"
            className="ml-3"
            onClick={() => refreshFinancial().catch(() => {})}
          >
            Reintentar saldo
          </Button>
        </div>
      )}
      <div className={styles.metrics}>
        <MetricCard
          title="Estatus financiero"
          value={
            financialError
              ? "No disponible"
              : financialLoading
              ? "Cargando…"
              : resumenFinanciero?.estatus_financiero || "Sin dato"
          }
        />

        <MetricCard
          title="Saldo pendiente"
          value={
            financialError
              ? "No disponible"
              : financialLoading
              ? "Cargando…"
              : resumenFinanciero?.saldo_pendiente == null
              ? "Sin dato"
              : money(resumenFinanciero.saldo_pendiente)
          }
        />

        <MetricCard
          title="Meses con saldo"
          value={
            financialError
              ? "No disponible"
              : financialLoading
              ? "Cargando…"
              : resumenFinanciero?.periodos_con_saldo == null
              ? "Sin dato"
              : `${resumenFinanciero.periodos_con_saldo} / 2`
          }
        />
      </div>

      {Number(resumenFinanciero?.periodos_con_saldo || 0) === 2 &&
        empresa.estado === "Activo" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Esta empresa tiene dos mensualidades pendientes. Si no liquida ambas
            antes de iniciar el siguiente periodo, será suspendida.
          </div>
        )}

      {empresa.estado === "Suspendido" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          La empresa está suspendida. Debe liquidar todas las mensualidades
          pendientes para recuperar el acceso.
        </div>
      )}

      <div className={styles.billingLayout}>
        <section className={`${styles.panel} ${styles.contract}`}>
          <h2 className="mb-3 text-base font-semibold text-slate-700">
            Suscripción
          </h2>

          <div className={styles.infoGrid}>
            <Info label="Contrato" value={suscripcion.contrato_id} />
            <Info label="Estado contrato" value={suscripcion.estado_contrato} />
            <Info
              label="Estado suscripción"
              value={suscripcion.estado_suscripcion}
            />
            <Info label="Origen" value={suscripcion.origen} />
            <Info label="Fecha inicio" value={date(suscripcion.fecha_inicio)} />
            <Info label="Fecha fin" value={date(suscripcion.fecha_fin)} />
            <Info
              label="Tipo de cobro"
              value={
                suscripcion.tipo_cobro === "base_mas_excedente"
                  ? "Base + empleados excedentes"
                  : suscripcion.tipo_cobro === "plan_legacy"
                  ? "Plan legacy"
                  : "-"
              }
            />
            <Info
              label="Mensualidad actual"
              value={money(suscripcion.mensualidad_actual)}
            />
            <Info
              label="Empleados activos"
              value={suscripcion.empleados_activos}
            />
            <Info
              label="Empleados al contratar"
              value={suscripcion.empleados}
            />
          </div>
          <details className={styles.technical}>
            <summary>Referencias de Stripe</summary>
            <div>
              {" "}
              <Info
                label="Stripe Customer"
                value={suscripcion.stripe_customer_id || "-"}
              />
              <Info
                label="Stripe Subscription"
                value={suscripcion.stripe_subscription_id || "-"}
              />
            </div>
          </details>
        </section>

        <section className={`${styles.panel} ${styles.commercial}`}>
          <h2 className="text-base font-semibold text-slate-700">
            Configuración comercial
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Define el precio especial de esta empresa. Si no capturas base ni
            incluidos, se cobrará por empleado activo con el costo excedente.
          </p>

          <div className={styles.fields}>
            <div>
              <label className={styles.infoLabel}>Precio base mensual</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                aria-label={"Precio base mensual"}
                value={form.precio_base_mensual}
                onChange={set("precio_base_mensual")}
                className="mt-1"
              />
            </div>

            <div>
              <label className={styles.infoLabel}>Empleados incluidos</label>
              <Input
                type="number"
                min="0"
                step="1"
                aria-label={"Empleados incluidos"}
                value={form.empleados_incluidos}
                onChange={set("empleados_incluidos")}
                className="mt-1"
              />
            </div>

            <div>
              <label className={styles.infoLabel}>
                Costo por empleado excedente
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                aria-label={"Costo por empleado excedente"}
                value={form.precio_empleado_extra}
                onChange={set("precio_empleado_extra")}
                className="mt-1"
              />
            </div>
          </div>

          <div className={styles.preview}>
            <p className="font-semibold">Vista previa próximo cobro</p>
            <div>
              <Info label="Activos" value={preview.activos} />
              <Info label="Incluidos" value={preview.incluidos} />
              <Info label="Excedentes" value={preview.excedentes} />
              <Info label="Costo excedente" value={money(preview.extra)} />
              <Info label="Total estimado" value={money(preview.total)} />
            </div>
          </div>

          <div className={styles.formFooter}>
            <Button onClick={guardarConfiguracion} disabled={saving}>
              {saving ? "Guardando..." : "Guardar configuración"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ title, value }) {
  return (
    <div className={styles.metric}>
      <p className={styles.infoLabel}>{title}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className={styles.infoLabel}>{label}</p>
      <p className={styles.infoValue}>{value ?? "-"}</p>
    </div>
  );
}
