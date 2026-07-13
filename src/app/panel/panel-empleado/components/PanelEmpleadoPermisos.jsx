"use client";

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
  default: "border border-red-100 bg-red-50 text-red-700",
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
      <h3 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-900">
        <CalendarDays className="h-3.5 w-3.5 text-[#2563eb]" />
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

      {/* Filtros */}
      <div className="mb-3 rounded-[10px] border border-gray-200 bg-white p-3 sm:mb-4 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">
              DESDE:
            </label>
            <Input
              type="date"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">
              HASTA:
            </label>
            <Input
              type="date"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={limpiarFiltros} variant="outline" size="sm">
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-[10px] border border-gray-200 bg-white">
        <div className="-mx-2 overflow-x-auto sm:-mx-4 md:mx-0">
          <div className="min-w-[600px] sm:min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Tipo de Permiso
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Fecha Inicio
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Fecha Fin
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Días totales
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Días hábiles
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Motivo
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Estado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permisosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-gray-500"
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
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${pillClass}`}
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

function MiniKpi({ label, value }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-gray-200 bg-white p-3">
      <div className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-lg font-extrabold tabular-nums text-gray-900">
        {value}
      </div>
    </div>
  );
}

function formatearFecha(fechaISO) {
  if (!fechaISO || fechaISO === "N/A") return "N/A";

  try {
    const fecha = new Date(fechaISO + "T00:00:00");
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  } catch (e) {
    return fechaISO;
  }
}
