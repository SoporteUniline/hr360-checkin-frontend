"use client";

import MiniKpi from "./MiniKpi";
import { formatearFechaCorta as formatearFecha } from "@/lib/formatDate";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { CalendarDays, Info } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calcDiasTotalesYHabiles } from "@/lib/permisosDias";

// Pills de estado homologadas (Adamia)
const PILL_ESTADO = {
  Aprobado: "border border-emerald-100 bg-emerald-50 text-emerald-700",
  Pendiente: "border border-amber-100 bg-amber-50 text-amber-700",
  default: "border border-red-100 bg-rose-50 text-rose-700",
};

/**
 * Componente para mostrar los permisos del empleado
 * Relacionado con: src/app/panel/panel-empleado/page.jsx
 */
export default function PanelEmpleadoPermisos({
  datosEmpleado,
  festivosSet = new Set(),
}) {
  if (!datosEmpleado) return null;

  const resumen = datosEmpleado.permisos?.resumen || {};
  const permisos = datosEmpleado.permisos?.historial || [];

  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  const permisosFiltrados = useMemo(() => {
    return permisos.filter((p) => {
      if (filtroDesde && p.fecha_inicio < filtroDesde) return false;
      if (filtroHasta && p.fecha_fin > filtroHasta) return false;
      return true;
    });
  }, [permisos, filtroDesde, filtroHasta]);

  const limpiarFiltros = () => {
    setFiltroDesde("");
    setFiltroHasta("");
  };

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900">
        <CalendarDays className="h-3.5 w-3.5 text-brand" />
        Historial de permisos
      </h3>

      {/* Mini-KPIs homologados */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <MiniKpi label="Total permisos" value={resumen.total || 0} />
        <MiniKpi label="Aprobados" value={resumen.aprobados || 0} />
        <MiniKpi label="Pendientes" value={resumen.pendientes || 0} />
        <MiniKpi label="Rechazados" value={resumen.rechazados || 0} />
      </div>

      {resumen.pendientes > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-blue-100 bg-blue-50 px-3 py-2.5 text-[12.5px] text-blue-800">
          <Info className="h-4 w-4 flex-shrink-0" />
          <span>
            El empleado tiene{" "}
            <strong>{resumen.pendientes} permiso(s) pendiente(s)</strong> de
            aprobación.
          </span>
        </div>
      )}

      {/* Superficie operacional: filtros + tabla */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/40 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-[210px]">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Desde
              </label>
              <Input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                className="h-9 rounded-xl border-slate-200 bg-white text-sm shadow-none"
              />
            </div>

            <div className="w-full sm:w-[210px]">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Hasta
              </label>
              <Input
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
                className="h-9 rounded-xl border-slate-200 bg-white text-sm shadow-none"
              />
            </div>

            <Button
              onClick={limpiarFiltros}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-slate-200 bg-white px-4 font-semibold text-slate-600 shadow-none hover:bg-slate-50"
            >
              Limpiar
            </Button>
          </div>
        </div>

        <div className="-mx-2 overflow-x-auto sm:-mx-4 md:mx-0">
          <div className="min-w-[600px] sm:min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Tipo de Permiso
                  </TableHead>
                  <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Fecha Inicio
                  </TableHead>
                  <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Fecha Fin
                  </TableHead>
                  <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Días totales
                  </TableHead>
                  <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Días hábiles
                  </TableHead>
                  <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Motivo
                  </TableHead>
                  <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    Estado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permisosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-slate-500"
                    >
                      No hay permisos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  permisosFiltrados.map((p) => {
                    /**
                     * Días totales/hábiles:
                     * - Totales: naturales (rango inclusivo).
                     * - Hábiles: excluye domingos + festivos (empresa).
                     * Relación:
                     * - Festivos vienen desde `src/app/panel/panel-empleado/page.jsx`.
                     * - Regla compartida en `src/lib/permisosDias.js` (igual que Permisos y PDF).
                     */
                    const { diasTotales, diasHabiles } =
                      calcDiasTotalesYHabiles({
                        fechaInicio: p.fecha_inicio,
                        fechaFin: p.fecha_fin,
                        festivosSet,
                      });

                    const pillClass =
                      PILL_ESTADO[p.estado] || PILL_ESTADO.default;

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-semibold sm:text-sm">
                          {p.tipo_permiso}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {formatearFecha(p.fecha_inicio)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {formatearFecha(p.fecha_fin)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold sm:text-sm">
                          {diasTotales}
                        </TableCell>
                        <TableCell className="text-xs font-semibold sm:text-sm">
                          {diasHabiles}
                        </TableCell>
                        <TableCell className="max-w-[150px] break-words text-xs sm:max-w-none sm:text-sm">
                          {p.motivo}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${pillClass}`}
                          >
                            {p.estado}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
