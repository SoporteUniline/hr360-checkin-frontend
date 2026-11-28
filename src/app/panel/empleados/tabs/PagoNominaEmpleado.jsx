"use client";

// Ficha del empleado → Nómina (R1): medio de pago (D-1) y bonos/descuentos asignados (D-6).
// El medio de pago se guarda con la ficha; los bonos tienen su propio botón (otra tabla).
import { CLASE_CONTROL } from "@/components/formulario/CampoFormulario";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { dinero } from "@/lib/nomina/nomina.mjs";

// (28/11/2026) Campo del sistema de diseño (docs/sistema-diseno.md).
const campo = CLASE_CONTROL;

export function MedioPago({ form, soloLectura }) {
  const medio = form.watch("medio_pago") ?? "";
  const error = form.formState.errors?.monto_transferencia?.message;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-etiqueta font-semibold text-texto">
        Medio de pago
        <select className={campo} disabled={soloLectura} {...form.register("medio_pago")}>
          <option value="">Sin definir</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Mixto">Mixto (parte transferencia, parte efectivo)</option>
        </select>
      </label>
      {medio === "Mixto" ? (
        <label className="grid gap-2 text-etiqueta font-semibold text-texto">
          Monto por transferencia ($)
          <input type="number" min="0" step="0.01" inputMode="decimal" className={campo} disabled={soloLectura} {...form.register("monto_transferencia")} />
          <span className="text-xs font-normal text-gray-500">El resto del neto se paga en efectivo. Se puede cambiar en cada nómina.</span>
          {error ? <span role="alert" className="text-xs text-red-600">{error}</span> : null}
        </label>
      ) : null}
    </div>
  );
}

export function BonosEmpleado({ idEmpleado, soloLectura }) {
  const { enqueueSnackbar } = useSnackbar();
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!idEmpleado) return;
    axios.get(`/checador/nomina/empleados/${idEmpleado}/conceptos`)
      .then((r) => setLista(r.data.conceptos.map((c) => ({ ...c, asignado: Boolean(Number(c.asignado)), valor: c.valor ?? "" }))))
      .catch((e) => setError(e?.response?.data?.error || "No se pudieron cargar los bonos."));
  }, [idEmpleado]);

  if (!idEmpleado) return <p className="text-cuerpo text-texto-secundario">Guarda al empleado para asignarle bonos y descuentos.</p>;
  if (error) return <p className="text-cuerpo text-texto-secundario">{error}</p>;
  if (!lista) return <p className="text-cuerpo text-texto-secundario">Cargando bonos…</p>;
  if (!lista.length) return <p className="text-cuerpo text-texto-secundario">Aún no hay bonos ni descuentos. <Link className="font-semibold text-[#2c56e8] hover:underline" href="/panel/nomina/ajustes">Créalos aquí</Link>.</p>;

  const guardar = async () => {
    setGuardando(true);
    try {
      await axios.put(`/checador/nomina/empleados/${idEmpleado}/conceptos`, { conceptos: lista.map((c) => ({ id_concepto: c.id_concepto, asignado: c.asignado, valor: c.valor === "" ? null : Number(c.valor) })) });
      enqueueSnackbar("Bonos y descuentos guardados.", { variant: "success" });
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudieron guardar.", { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="grid gap-2">
      {lista.map((c, i) => (
        <div key={c.id_concepto} className="flex flex-wrap items-center gap-3 rounded-lg border border-borde bg-white p-2.5 text-cuerpo">
          <label className="flex flex-1 items-center gap-2">
            <input type="checkbox" disabled={soloLectura} checked={c.asignado} onChange={(e) => setLista(lista.map((x, j) => (j === i ? { ...x, asignado: e.target.checked } : x)))} />
            <span className="font-semibold">{c.nombre}</span>
            <span className="text-xs text-gray-500">{c.tipo === "descuento" ? "descuento" : "bono"} · {c.forma === "condicionado" ? "si cumple la asistencia" : c.forma === "manual" ? "a mano" : "fijo"}</span>
          </label>
          <input aria-label={`Valor de ${c.nombre}`} type="number" min="0" step="0.01" disabled={soloLectura || !c.asignado} className="h-9 w-32 rounded-md border border-input px-2 text-right" placeholder={dinero(c.valor_catalogo)} value={c.valor} onChange={(e) => setLista(lista.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} />
        </div>
      ))}
      {!soloLectura ? <Button type="button" variant="outline" className="justify-self-start" disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar bonos y descuentos"}</Button> : null}
      <p className="text-xs text-gray-500">Si dejas el valor vacío, se usa el del catálogo.</p>
    </div>
  );
}
