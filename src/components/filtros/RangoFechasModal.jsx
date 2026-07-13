"use client";

// Modal de selección de rango de fechas (UX aprobada):
// rail de presets a la izquierda + calendario doble + resumen + Aplicar.
// Devuelve fechas en formato YYYY-MM-DD y una etiqueta legible para el botón.

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

const FMT = "YYYY-MM-DD";

const PRESETS = [
  { n: "Hoy", f: (hoy) => [hoy, hoy] },
  { n: "Ayer", f: (hoy) => [hoy.subtract(1, "day"), hoy.subtract(1, "day")] },
  { n: "Esta semana", f: (hoy) => [hoy.startOf("week"), hoy] },
  {
    n: "Semana pasada",
    f: (hoy) => [
      hoy.subtract(1, "week").startOf("week"),
      hoy.subtract(1, "week").endOf("week"),
    ],
  },
  { n: "Últimos 15 días", f: (hoy) => [hoy.subtract(14, "day"), hoy] },
  { n: "Este mes", f: (hoy) => [hoy.startOf("month"), hoy] },
  {
    n: "Mes pasado",
    f: (hoy) => [
      hoy.subtract(1, "month").startOf("month"),
      hoy.subtract(1, "month").endOf("month"),
    ],
  },
  { n: "Este año", f: (hoy) => [hoy.startOf("year"), hoy] },
];

export function etiquetaDeRango(inicio, fin) {
  if (!inicio && !fin) return "Todo el historial";
  const hoy = dayjs().tz ? dayjs().tz("America/Mexico_City") : dayjs();
  const preset = PRESETS.find(({ f }) => {
    const [s, e] = f(hoy);
    return s.format(FMT) === inicio && e.format(FMT) === fin;
  });
  if (preset) return preset.n;
  if (inicio === fin) return dayjs(inicio).format("DD/MM/YYYY");
  return `${dayjs(inicio).format("DD/MM/YY")} – ${dayjs(fin).format("DD/MM/YY")}`;
}

export default function RangoFechasModal({
  open,
  onOpenChange,
  fechaInicio,
  fechaFin,
  onAplicar,
}) {
  const [range, setRange] = useState(undefined);

  useEffect(() => {
    if (!open) return;
    setRange({
      from: fechaInicio ? dayjs(fechaInicio).toDate() : undefined,
      to: fechaFin ? dayjs(fechaFin).toDate() : undefined,
    });
  }, [open, fechaInicio, fechaFin]);

  const hoy = dayjs().tz ? dayjs().tz("America/Mexico_City") : dayjs();

  const esPresetActivo = (preset) => {
    if (!range?.from || !range?.to) return false;
    const [s, e] = preset.f(hoy);
    return (
      s.isSame(dayjs(range.from), "day") && e.isSame(dayjs(range.to), "day")
    );
  };

  const aplicar = () => {
    if (!range?.from) return;
    const from = dayjs(range.from);
    const to = dayjs(range.to || range.from);
    onAplicar({
      inicio: from.format(FMT),
      fin: to.format(FMT),
      etiqueta: etiquetaDeRango(from.format(FMT), to.format(FMT)),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden gap-0 rounded-2xl">
        <DialogHeader className="px-6 pt-5 pb-4">
          <DialogTitle className="text-base font-extrabold tracking-tight text-gray-900">
            Seleccionar rango de fechas
          </DialogTitle>
        </DialogHeader>
        <div className="h-[2.5px] bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />

        <div className="flex flex-col sm:flex-row">
          {/* Rail de presets */}
          <div className="sm:w-[172px] shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100 bg-[#fafbfe] p-3 flex sm:flex-col flex-wrap gap-1">
            {PRESETS.map((p) => {
              const activo = esPresetActivo(p);
              return (
                <button
                  key={p.n}
                  type="button"
                  onClick={() => {
                    const [s, e] = p.f(hoy);
                    setRange({ from: s.toDate(), to: e.toDate() });
                  }}
                  className={`text-left text-[12.5px] rounded-lg px-3 py-2 transition-colors ${
                    activo
                      ? "bg-gradient-to-br from-[#2563eb] to-[#4f46e5] text-white font-bold shadow-[0_5px_12px_rgba(37,99,235,0.3)]"
                      : "text-gray-700 font-medium hover:bg-blue-50"
                  }`}
                >
                  {p.n}
                </button>
              );
            })}
          </div>

          {/* Calendario doble */}
          <div className="flex-1 flex justify-center p-3">
            <Calendar
              mode="range"
              numberOfMonths={2}
              locale={es}
              selected={range}
              onSelect={setRange}
              defaultMonth={range?.from || hoy.toDate()}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
          <div className="text-[12.5px] font-semibold text-gray-600">
            {range?.from ? (
              <>
                Del{" "}
                <span className="text-[#2563eb] font-bold">
                  {dayjs(range.from).format("DD/MM/YYYY")}
                </span>{" "}
                al{" "}
                <span className="text-[#2563eb] font-bold">
                  {dayjs(range.to || range.from).format("DD/MM/YYYY")}
                </span>
              </>
            ) : (
              "Selecciona la fecha inicial"
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-gray-200 text-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={aplicar}
              disabled={!range?.from}
              className="rounded-xl bg-gradient-to-br from-[#2563eb] to-[#4f46e5] text-white font-semibold shadow-[0_8px_20px_rgba(37,99,235,0.32)] hover:opacity-95"
            >
              Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
