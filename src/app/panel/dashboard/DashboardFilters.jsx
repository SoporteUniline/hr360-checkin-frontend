"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PRESETS, labelRange, rangeFromPreset } from "./lib/periodos";
import {
  Building2,
  CalendarDays,
  Check,
  Filter,
  GitCompareArrows,
  MapPin,
  RotateCcw,
} from "lucide-react";

function FieldLabel({ children }) {
  return (
    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
      {children}
    </span>
  );
}

function CompareControl({ active, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`flex h-9 items-center justify-between gap-3 rounded-lg border px-3 text-xs font-medium transition ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        <GitCompareArrows className="size-3.5" /> Comparar periodo anterior
      </span>
      <span
        className={`grid size-4 place-content-center rounded-full border ${
          active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
        }`}
      >
        {active && <Check className="size-2.5" />}
      </span>
    </button>
  );
}

export default function DashboardFilters({ value, onChange }) {
  const { dataUser } = useAuth();
  const todayRange = useMemo(() => rangeFromPreset("hoy"), []);
  const [customDraft, setCustomDraft] = useState(() => ({
    fechaInicio: value.custom?.fechaInicio || todayRange.fechaInicio,
    fechaFin: value.custom?.fechaFin || todayRange.fechaFin,
  }));

  const empresas = useMemo(() => {
    const list = dataUser?.empresas_detalle || [];
    return list.map((e) => ({
      value: String(e.id_empresa),
      label:
        e.nombre_comercial ||
        e.razon_social ||
        e.nombre ||
        `Empresa ${e.id_empresa}`,
    }));
  }, [dataUser]);

  const empresaFiltro =
    value.id_empresa && value.id_empresa !== "all" ? value.id_empresa : null;
  const idEmpresaEfectiva =
    empresaFiltro ||
    (empresas.length <= 1
      ? dataUser?.id_empresa || empresas[0]?.value || null
      : null);

  const { options: unidadesAll = [] } = useUnidadesNegocio();
  const unidades = useMemo(() => {
    if (!empresaFiltro) return unidadesAll;
    return unidadesAll.filter(
      (u) => String(u.id_empresa) === String(empresaFiltro),
    );
  }, [unidadesAll, empresaFiltro]);

  const { departamentos = [] } = useDepartamentosData(idEmpresaEfectiva);
  const rango = rangeFromPreset(value.preset, value.custom);
  const set = (patch) => onChange({ ...value, ...patch });

  useEffect(() => {
    if (value.custom?.fechaInicio || value.custom?.fechaFin) {
      setCustomDraft({
        fechaInicio: value.custom?.fechaInicio || todayRange.fechaInicio,
        fechaFin: value.custom?.fechaFin || todayRange.fechaFin,
      });
    } else if (value.preset !== "custom") {
      setCustomDraft(todayRange);
    }
  }, [
    todayRange,
    value.custom?.fechaFin,
    value.custom?.fechaInicio,
    value.preset,
  ]);

  const customDraftComplete =
    /^\d{4}-\d{2}-\d{2}$/.test(customDraft.fechaInicio || "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(customDraft.fechaFin || "") &&
    customDraft.fechaInicio <= customDraft.fechaFin;
  const customDraftDirty =
    customDraft.fechaInicio !== rango.fechaInicio ||
    customDraft.fechaFin !== rango.fechaFin;

  const selectedUnitOption = unidadesAll.find(
    (u) => u.value === value.id_sucursal_option,
  );
  const selectedDepartment = departamentos.find(
    (d) => String(d.id_departamento) === String(value.id_departamento),
  );

  const reset = () => {
    setCustomDraft(todayRange);
    onChange({
      preset: "hoy",
      custom: {},
      compare: true,
      id_empresa: "all",
      id_sucursal: "all",
      id_sucursal_option: "all",
      id_departamento: "all",
    });
  };

  const selectPreset = (preset) => {
    if (preset === "custom" && value.preset !== "custom") {
      setCustomDraft({
        fechaInicio: value.custom?.fechaInicio || todayRange.fechaInicio,
        fechaFin: value.custom?.fechaFin || todayRange.fechaFin,
      });
    }
    set({ preset });
  };

  const applyCustomRange = () => {
    if (!customDraftComplete) return;
    set({ preset: "custom", custom: customDraft });
  };

  const selectEmpresa = (idEmpresa) =>
    set({
      id_empresa: idEmpresa,
      id_sucursal: "all",
      id_sucursal_option: "all",
      id_departamento: "all",
    });

  const selectUnidad = (optionValue) => {
    if (optionValue === "all") {
      set({ id_sucursal: "all", id_sucursal_option: "all" });
      return;
    }

    const option = unidadesAll.find((u) => u.value === optionValue);
    if (!option) return;

    // La consulta recibe el id numérico real, no el valor compuesto del selector.
    set({
      id_empresa: String(option.id_empresa),
      id_sucursal: String(option.id_sucursal),
      id_sucursal_option: optionValue,
      id_departamento:
        String(value.id_empresa) === String(option.id_empresa)
          ? value.id_departamento
          : "all",
    });
  };

  const controls = (
    <>
      <div className="min-w-0">
        <FieldLabel>Periodo</FieldLabel>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 [scrollbar-width:none]">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={value.preset === p.key}
              onClick={() => selectPreset(p.key)}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                value.preset === p.key
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {value.preset === "custom" && (
        <div className="grid min-w-[310px] grid-cols-2 gap-2">
          <label className="min-w-0">
            <FieldLabel>Desde</FieldLabel>
            <Input
              type="date"
              className="w-full bg-white"
              value={customDraft.fechaInicio}
              max={customDraft.fechaFin || undefined}
              onChange={(e) =>
                setCustomDraft((current) => ({
                  ...current,
                  fechaInicio: e.target.value,
                }))
              }
            />
          </label>
          <label className="min-w-0">
            <FieldLabel>Hasta</FieldLabel>
            <Input
              type="date"
              className="w-full bg-white"
              value={customDraft.fechaFin}
              min={customDraft.fechaInicio || undefined}
              onChange={(e) =>
                setCustomDraft((current) => ({
                  ...current,
                  fechaFin: e.target.value,
                }))
              }
            />
          </label>
          <div className="col-span-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400">
              {customDraftComplete
                ? customDraftDirty
                  ? "Cambios sin aplicar"
                  : "Rango aplicado"
                : "Completa un rango válido"}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={applyCustomRange}
              disabled={!customDraftComplete || !customDraftDirty}
              className="h-8 bg-blue-600 px-3 text-xs hover:bg-blue-700"
            >
              Aplicar rango
            </Button>
          </div>
        </div>
      )}

      {empresas.length > 1 && (
        <div className="min-w-0">
          <FieldLabel>Empresa</FieldLabel>
          <Select value={value.id_empresa} onValueChange={selectEmpresa}>
            <SelectTrigger className="w-full bg-white lg:w-[190px]">
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

      <div className="min-w-0">
        <FieldLabel>Unidad de negocio</FieldLabel>
        <Select
          value={value.id_sucursal_option || "all"}
          onValueChange={selectUnidad}
        >
          <SelectTrigger className="w-full bg-white lg:w-[190px]">
            <SelectValue placeholder="Unidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las unidades</SelectItem>
            {unidades.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
                {!empresaFiltro && u.empresa_nombre
                  ? ` · ${u.empresa_nombre}`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0">
        <FieldLabel>Departamento</FieldLabel>
        <Select
          value={value.id_departamento}
          onValueChange={(id) => set({ id_departamento: id })}
          disabled={!idEmpresaEfectiva}
        >
          <SelectTrigger className="w-full bg-white lg:w-[180px]">
            <SelectValue
              placeholder={
                idEmpresaEfectiva ? "Departamento" : "Selecciona empresa"
              }
            />
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

      <div className="min-w-0">
        <FieldLabel>Comparación</FieldLabel>
        <CompareControl
          active={value.compare !== false}
          onToggle={() => set({ compare: value.compare === false })}
        />
      </div>
    </>
  );

  return (
    <>
      <div className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:block">
        <div className="flex flex-wrap items-end gap-3">
          {controls}
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="ml-auto gap-1.5 text-slate-500"
          >
            <RotateCcw className="size-3.5" /> Restablecer
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <CalendarDays className="size-3.5 text-blue-500" />
            {labelRange(rango)}
          </span>
          <span className="text-slate-300">•</span>
          <span>
            {value.compare !== false
              ? "Comparación con el periodo anterior activa"
              : "Sin comparación de periodo"}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:hidden">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-content-center rounded-xl bg-blue-50 text-blue-600">
            <CalendarDays className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-slate-400">Periodo</p>
            <p className="truncate text-sm font-semibold text-slate-800">
              {labelRange(rango)}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {selectedUnitOption?.label || "Todas las unidades"}
              {selectedDepartment?.nombre
                ? ` · ${selectedDepartment.nombre}`
                : ""}
            </p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="size-3.5" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[92dvh] overflow-y-auto rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <SheetHeader className="mb-5 text-left">
                <SheetTitle>Filtros del dashboard</SheetTitle>
                <SheetDescription>
                  Las métricas y gráficas se actualizan con esta selección.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4">{controls}</div>
              <SheetFooter className="mt-6 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={reset} className="gap-1.5">
                  <RotateCcw className="size-4" /> Restablecer
                </Button>
                <SheetClose asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Ver resultados
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3 [scrollbar-width:none]">
          {empresaFiltro && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
              <Building2 className="size-3" />
              {empresas.find((e) => e.value === empresaFiltro)?.label}
            </span>
          )}
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
            <MapPin className="size-3" />
            {selectedUnitOption?.label || "Todas las unidades"}
          </span>
          {value.compare !== false && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700">
              <GitCompareArrows className="size-3" /> Comparación activa
            </span>
          )}
        </div>
      </div>
    </>
  );
}
