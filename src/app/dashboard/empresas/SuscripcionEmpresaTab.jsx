"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import axiosInstance from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enqueueSnackbar } from "notistack";

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

  const { data, isLoading, mutate } = useSWR(
    empresaId ? `/empresas/${empresaId}/suscripcion` : null,
    fetcherWithToken,
  );

  const { data: resumenFinancieroData } = useSWR(
    empresaId ? `/empresas/${empresaId}/resumen-financiero` : null,
    fetcherWithToken,
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
        { variant: "error" },
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

  if (!suscripcion) {
    return (
      <div className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
        Esta empresa no tiene una suscripción asociada.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          title="Estatus financiero"
          value={resumenFinanciero?.estatus_financiero || "Al corriente"}
        />
        <MetricCard
          title="Saldo pendiente"
          value={money(resumenFinanciero?.saldo_pendiente)}
        />
        <MetricCard
          title="Total pagado"
          value={money(resumenFinanciero?.total_pagado)}
        />
        <MetricCard
          title="Facturas pendientes"
          value={resumenFinanciero?.adeudos || 0}
        />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-700">
          Suscripción
        </h2>

        <div className="grid gap-3 md:grid-cols-2">
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
          <Info label="Empleados al contratar" value={suscripcion.empleados} />
          <Info
            label="Stripe Customer"
            value={suscripcion.stripe_customer_id || "-"}
          />
          <Info
            label="Stripe Subscription"
            value={suscripcion.stripe_subscription_id || "-"}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="text-base font-semibold text-slate-700">
          Configuración comercial
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Define el precio especial de esta empresa. Si no capturas base ni
          incluidos, se cobrará por empleado activo con el costo excedente.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium uppercase text-gray-500">
              Precio base mensual
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.precio_base_mensual}
              onChange={set("precio_base_mensual")}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase text-gray-500">
              Empleados incluidos
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.empleados_incluidos}
              onChange={set("empleados_incluidos")}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase text-gray-500">
              Costo por empleado excedente
            </label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.precio_empleado_extra}
              onChange={set("precio_empleado_extra")}
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold">Vista previa próximo cobro</p>
          <div className="mt-2 grid gap-2 md:grid-cols-5">
            <Info label="Activos" value={preview.activos} />
            <Info label="Incluidos" value={preview.incluidos} />
            <Info label="Excedentes" value={preview.excedentes} />
            <Info label="Costo excedente" value={money(preview.extra)} />
            <Info label="Total estimado" value={money(preview.total)} />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={guardarConfiguracion} disabled={saving}>
            {saving ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-medium uppercase text-gray-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value ?? "-"}</p>
    </div>
  );
}
