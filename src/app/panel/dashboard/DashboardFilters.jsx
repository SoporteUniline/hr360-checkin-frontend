"use client";

/**
 * Barra de filtros del Dashboard de RH.
 * - Periodo (segmentado: Hoy / 7d / 30d / Mes / Personalizado + rango custom).
 * - Empresa (de `dataUser.empresas_detalle`).
 * - Unidad de negocio / sucursal (hook `useUnidadesNegocio`, filtrada por empresa).
 * - Departamento (hook `useDepartamentosData`, depende de la empresa).
 *
 * Estado controlado: recibe `value` y notifica con `onChange`. Cada cambio
 * dispara un refetch en el componente padre (SWR).
 */

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import useDepartamentosData from "@/hooks/useDepartamentosData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PRESETS, labelRange, rangeFromPreset } from "./lib/periodos";
import { CalendarDays, RotateCcw } from "lucide-react";

export default function DashboardFilters({ value, onChange }) {
  const { dataUser } = useAuth();

  const empresas = useMemo(() => {
    const list = dataUser?.empresas_detalle || [];
    return list.map((e) => ({
      value: String(e.id_empresa),
      label: e.nombre_comercial || e.razon_social || e.nombre || `Empresa ${e.id_empresa}`,
    }));
  }, [dataUser]);

  const empresaFiltro =
    value.id_empresa && value.id_empresa !== "all" ? value.id_empresa : null;

  // Empresa efectiva para cargar dependencias: filtro explícito o la de la sesión.
  const idEmpresaEfectiva = empresaFiltro || dataUser?.id_empresa || null;

  const { options: unidadesAll = [] } = useUnidadesNegocio();
  const unidades = useMemo(() => {
    if (!empresaFiltro) return unidadesAll;
    return unidadesAll.filter((u) => String(u.id_empresa) === String(empresaFiltro));
  }, [unidadesAll, empresaFiltro]);

  const { departamentos = [] } = useDepartamentosData(idEmpresaEfectiva);

  const rango = rangeFromPreset(value.preset, value.custom);

  const set = (patch) => onChange({ ...value, ...patch });

  const reset = () =>
    onChange({
      preset: "7d",
      custom: {},
      id_empresa: "all",
      id_sucursal: "all",
      id_departamento: "all",
    });

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Periodo */}
        <div className="flex flex-col">
          <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Periodo
          </span>
          <div className="inline-flex rounded-lg border bg-zinc-50 p-0.5 gap-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={value.preset === p.key}
                onClick={() => set({ preset: p.key })}
                className={
                  "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition " +
                  (value.preset === p.key
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rango personalizado */}
        {value.preset === "custom" && (
          <div className="flex items-end gap-2">
            <div className="flex flex-col">
              <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Desde
              </span>
              <Input
                type="date"
                className="w-[150px]"
                value={value.custom?.fechaInicio || rango.fechaInicio}
                max={value.custom?.fechaFin || undefined}
                onChange={(e) =>
                  set({ custom: { ...value.custom, fechaInicio: e.target.value } })
                }
              />
            </div>
            <div className="flex flex-col">
              <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Hasta
              </span>
              <Input
                type="date"
                className="w-[150px]"
                value={value.custom?.fechaFin || rango.fechaFin}
                min={value.custom?.fechaInicio || undefined}
                onChange={(e) =>
                  set({ custom: { ...value.custom, fechaFin: e.target.value } })
                }
              />
            </div>
          </div>
        )}

        {/* Empresa */}
        {empresas.length > 1 && (
          <div className="flex flex-col">
            <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Empresa
            </span>
            <Select
              value={value.id_empresa}
              onValueChange={(v) =>
                set({ id_empresa: v, id_sucursal: "all", id_departamento: "all" })
              }
            >
              <SelectTrigger className="w-[190px] bg-white">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Unidad de negocio */}
        <div className="flex flex-col">
          <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Unidad de negocio
          </span>
          <Select
            value={value.id_sucursal}
            onValueChange={(v) => set({ id_sucursal: v })}
          >
            <SelectTrigger className="w-[190px] bg-white">
              <SelectValue placeholder="Unidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las unidades</SelectItem>
              {unidades.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Departamento */}
        <div className="flex flex-col">
          <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Departamento
          </span>
          <Select
            value={value.id_departamento}
            onValueChange={(v) => set({ id_departamento: v })}
            disabled={!idEmpresaEfectiva}
          >
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {departamentos.map((d) => (
                <SelectItem
                  key={d.id_departamento}
                  value={String(d.id_departamento)}
                >
                  {d.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw className="size-3.5" /> Limpiar
          </Button>
        </div>
      </div>

      {/* Chips de contexto */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-zinc-50 px-2.5 py-1">
          <CalendarDays className="size-3.5 text-zinc-400" />
          <span className="text-zinc-700 font-medium">{labelRange(rango)}</span>
        </span>
        <span className="text-zinc-400">Comparando vs. periodo anterior</span>
      </div>
    </div>
  );
}
