"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import axios from "@/lib/axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSnackbar } from "notistack";

export default function PagoAdelantadoEmpresaTab({ empresa }) {
  const { enqueueSnackbar } = useSnackbar();
  const empresaId = empresa?.id_empresa;

  const { data } = useSWR(
    empresaId ? `/empresas/${empresaId}/suscripcion` : null,
    fetcherWithToken,
  );

  const suscripcion = data?.data;

  const [loadingPago, setLoadingPago] = useState(false);
  const [loadingCobertura, setLoadingCobertura] = useState(false);

  const [formPago, setFormPago] = useState({
    meses: "",
    monto: "",
    metodo_pago: "Transferencia",
    referencia: "",
    notas: "",
  });

  const [formCobertura, setFormCobertura] = useState({
    fecha_fin: "",
    motivo: "",
  });

  const handlePagoChange = (e) => {
    setFormPago((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCoberturaChange = (e) => {
    setFormCobertura((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const registrarPagoAdelantado = async () => {
    if (!formPago.monto || Number(formPago.monto) <= 0) {
      enqueueSnackbar("Ingresa un monto válido.", { variant: "warning" });
      return;
    }

    if (!formPago.meses || Number(formPago.meses) <= 0) {
      enqueueSnackbar("Ingresa los meses cubiertos.", { variant: "warning" });
      return;
    }

    try {
      setLoadingPago(true);

      await axios.post(`/empresas/${empresaId}/pago-adelantado`, {
        monto: Number(formPago.monto),
        meses: Number(formPago.meses),
        metodo_pago: formPago.metodo_pago,
        referencia: formPago.referencia,
        notas: formPago.notas,
      });

      enqueueSnackbar("Pago adelantado registrado correctamente.", {
        variant: "success",
      });

      setFormPago({
        meses: "",
        monto: "",
        metodo_pago: "Transferencia",
        referencia: "",
        notas: "",
      });

      await mutate(`/empresas/${empresaId}/suscripcion`);
      await mutate(`/empresas/${empresaId}/pagos`);
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error || "No se pudo registrar el pago.",
        { variant: "error" },
      );
    } finally {
      setLoadingPago(false);
    }
  };

  const ajustarCobertura = async () => {
    if (!formCobertura.fecha_fin) {
      enqueueSnackbar("Selecciona la fecha pagada hasta.", {
        variant: "warning",
      });
      return;
    }

    try {
      setLoadingCobertura(true);

      await axios.put(`/empresas/${empresaId}/cobertura`, {
        fecha_fin: formCobertura.fecha_fin,
        motivo: formCobertura.motivo,
      });

      enqueueSnackbar("Cobertura ajustada correctamente.", {
        variant: "success",
      });

      setFormCobertura({
        fecha_fin: "",
        motivo: "",
      });

      await mutate(`/empresas/${empresaId}/suscripcion`);
      await mutate(`/empresas/${empresaId}/pagos`);
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error || "No se pudo ajustar la cobertura.",
        { variant: "error" },
      );
    } finally {
      setLoadingCobertura(false);
    }
  };

  return (
    <div className="mt-5 space-y-6">
      <div className="rounded-lg border bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-700">
          Cobertura actual
        </h2>

        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <Info label="Empresa" value={empresa?.nombre_empresa} />

          <Info
            label="Pagada hasta"
            value={suscripcion?.fecha_vencimiento || "-"}
            highlight
          />

          <Info
            label="Mensualidad actual"
            value={money(suscripcion?.mensualidad_actual)}
          />

          <Info
            label="Estado suscripción"
            value={suscripcion?.estado_suscripcion || "-"}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-700">
          Registrar pago adelantado
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Registra un pago recibido y extiende automáticamente la fecha pagada
          de la empresa.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Meses cubiertos"
            name="meses"
            type="number"
            min="1"
            value={formPago.meses}
            onChange={handlePagoChange}
          />

          <Field
            label="Monto recibido"
            name="monto"
            type="number"
            min="1"
            step="0.01"
            value={formPago.monto}
            onChange={handlePagoChange}
          />

          <Field
            label="Método de pago"
            name="metodo_pago"
            value={formPago.metodo_pago}
            onChange={handlePagoChange}
          />

          <Field
            label="Referencia"
            name="referencia"
            value={formPago.referencia}
            onChange={handlePagoChange}
          />
        </div>

        <Textarea
          label="Notas"
          name="notas"
          value={formPago.notas}
          onChange={handlePagoChange}
        />

        <Button
          className="mt-5"
          onClick={registrarPagoAdelantado}
          disabled={loadingPago}
        >
          {loadingPago ? "Guardando..." : "Registrar pago adelantado"}
        </Button>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-700">
          Ajustar cobertura manualmente
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Úsalo solo para corregir errores o definir directamente hasta qué
          fecha está pagada la empresa.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Pagada hasta"
            name="fecha_fin"
            type="date"
            value={formCobertura.fecha_fin}
            onChange={handleCoberturaChange}
          />

          <Textarea
            label="Motivo del ajuste"
            name="motivo"
            value={formCobertura.motivo}
            onChange={handleCoberturaChange}
          />
        </div>

        <Button
          className="mt-5"
          variant="outline"
          onClick={ajustarCobertura}
          disabled={loadingCobertura}
        >
          {loadingCobertura ? "Guardando..." : "Actualizar cobertura"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase text-gray-500">
        {label}
      </label>
      <Input className="mt-1" {...props} />
    </div>
  );
}

function Textarea({ label, ...props }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase text-gray-500">
        {label}
      </label>
      <textarea
        rows={3}
        className="mt-1 w-full rounded-md border p-3 text-sm"
        {...props}
      />
    </div>
  );
}

function Info({ label, value, highlight = false }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold ${
          highlight ? "text-blue-700" : "text-slate-800"
        }`}
      >
        {value ?? "-"}
      </p>
    </div>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}
