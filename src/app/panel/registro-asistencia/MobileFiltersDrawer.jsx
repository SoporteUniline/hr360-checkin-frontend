"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";

const DATE_PRESETS = [
  { label: "Hoy", key: "today" },
  { label: "Esta semana", key: "week" },
  { label: "Mes", key: "month" },
  { label: "Quincena", key: "quincena" },
  { label: "Personalizado", key: "custom" },
];

export default function MobileFiltersDrawer({
  open,
  onOpenChange,
  fechaInicio,
  fechaFin,
  setFechaInicio,
  setFechaFin,
  filtroEstadoAsistencia,
  setFiltroEstadoAsistencia,
  filtroDepartamento,
  setFiltroDepartamento,
  soloPresentes,
  setSoloPresentes,
  setPage,
  data,
  departamentos = [],
  onResetFilters,
}) {
  const [showAllDepts, setShowAllDepts] = useState(false);
  const today = dayjs().format("YYYY-MM-DD");

  const detectPreset = () => {
    const now = dayjs();
    if (fechaInicio === today && fechaFin === today) return "today";
    if (
      fechaInicio === now.startOf("week").format("YYYY-MM-DD") &&
      fechaFin === now.endOf("week").format("YYYY-MM-DD")
    )
      return "week";
    if (
      fechaInicio === now.startOf("month").format("YYYY-MM-DD") &&
      fechaFin === now.endOf("month").format("YYYY-MM-DD")
    )
      return "month";
    return "custom";
  };

  const applyPreset = (key) => {
    const now = dayjs();
    let ini, fin;
    switch (key) {
      case "today":
        ini = fin = today;
        break;
      case "week":
        ini = now.startOf("week").format("YYYY-MM-DD");
        fin = now.endOf("week").format("YYYY-MM-DD");
        break;
      case "month":
        ini = now.startOf("month").format("YYYY-MM-DD");
        fin = now.endOf("month").format("YYYY-MM-DD");
        break;
      case "quincena":
        if (now.date() <= 15) {
          ini = now.startOf("month").format("YYYY-MM-DD");
          fin = now.date(15).format("YYYY-MM-DD");
        } else {
          ini = now.date(16).format("YYYY-MM-DD");
          fin = now.endOf("month").format("YYYY-MM-DD");
        }
        break;
      default:
        return;
    }
    setFechaInicio(ini);
    setFechaFin(fin);
    setPage(1);
  };

  const activePreset = detectPreset();

  const totalPresentes = data?.total_presentes ?? 0;
  const totalTardanzas = data?.total_tardanzas ?? 0;
  const totalAusencias = data?.total_ausencias ?? 0;
  const totalEmpleados = data?.total_empleados ?? 0;
  const totalPendientes = Math.max(
    0,
    totalEmpleados - totalPresentes - totalTardanzas - totalAusencias,
  );

  const estadoOptions = [
    {
      value: "Presente",
      label: "Presente",
      count: totalPresentes,
      dotClass: "bg-green-500",
    },
    {
      value: "Tardanza",
      label: "Tarde",
      count: totalTardanzas,
      dotClass: "bg-amber-500",
    },
    {
      value: "Pendiente",
      label: "Pendiente",
      count: totalPendientes,
      dotClass: "bg-slate-400",
    },
    {
      value: "Ausente",
      label: "Ausente",
      count: totalAusencias,
      dotClass: "bg-red-500",
    },
  ];

  const MAX_DEPTS = 6;
  const visibleDepts = showAllDepts
    ? departamentos
    : departamentos.slice(0, MAX_DEPTS);
  const hiddenDepts = departamentos.length - MAX_DEPTS;

  const activeFiltersCount = [
    filtroEstadoAsistencia,
    Array.isArray(filtroDepartamento) && filtroDepartamento.length > 0,
    soloPresentes,
    fechaInicio !== today || fechaFin !== today,
  ].filter(Boolean).length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] flex flex-col bg-white rounded-t-3xl">
        <div className="w-10 h-1.5 rounded-full bg-gray-300 mx-auto mt-3 shrink-0" />

        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle className="text-xl font-bold text-gray-900">
                Filtros
              </DrawerTitle>
              <DrawerDescription className="text-sm text-gray-500 mt-0.5">
                {totalEmpleados} empleados · {activeFiltersCount} filtros
                activos
              </DrawerDescription>
            </div>

            <button
              onClick={() => {
                onResetFilters?.();
                setShowAllDepts(false);
              }}
              className="text-sm font-medium text-blue-600"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-10">
          {/* Rango de fechas */}
          <section className="mt-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Rango de fechas
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                  Desde
                </p>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => {
                    setFechaInicio(e.target.value);
                    setPage(1);
                  }}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900"
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                  Hasta
                </p>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => {
                    setFechaFin(e.target.value);
                    setPage(1);
                  }}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                    activePreset === p.key
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* Estado de asistencia */}
          <section className="mt-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Estado de Asistencia
            </p>
            <div className="flex flex-wrap gap-2">
              {estadoOptions.map((opt) => {
                const isSelected = filtroEstadoAsistencia === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setFiltroEstadoAsistencia(isSelected ? "" : opt.value);
                      setPage(1);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                      isSelected
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700",
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        opt.dotClass,
                      )}
                    />
                    {opt.label} {opt.count}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Departamento */}
          {departamentos.length > 0 && (
            <section className="mt-6">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Departamento
              </p>
              <div className="flex flex-wrap gap-2">
                {visibleDepts.map((dept) => {
                  const deptValue = `${dept.empresa_nombre}||${dept.nombre}`;
                  const selectedDepts = Array.isArray(filtroDepartamento)
                    ? filtroDepartamento
                    : [];
                  const isSelected = selectedDepts.includes(deptValue);

                  return (
                    <button
                      key={`${dept.empresa_nombre}-${dept.id_departamento}`}
                      onClick={() => {
                        setFiltroDepartamento((prev) => {
                          const current = Array.isArray(prev) ? prev : [];

                          if (current.includes(deptValue)) {
                            return current.filter((item) => item !== deptValue);
                          }

                          return [...current, deptValue];
                        });

                        setPage(1);
                      }}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                        isSelected
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700",
                      )}
                    >
                      {dept.nombre} ({dept.empresa_nombre})
                    </button>
                  );
                })}

                {!showAllDepts && hiddenDepts > 0 && (
                  <button
                    onClick={() => setShowAllDepts(true)}
                    className="px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700"
                  >
                    + {hiddenDepts} más
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Opciones */}
          <section className="mt-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Opciones
            </p>
            <div className="flex items-center justify-between py-3 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Solo con entrada registrada
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Oculta los pendientes
                </p>
              </div>
              <Switch
                checked={soloPresentes}
                onCheckedChange={(val) => {
                  setSoloPresentes(val);
                  setPage(1);
                }}
              />
            </div>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
