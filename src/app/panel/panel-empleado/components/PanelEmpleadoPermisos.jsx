"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calcDiasTotalesYHabiles } from "@/lib/permisosDias";

/**
 * Componente para mostrar los permisos del empleado
 * Relacionado con: src/app/panel/panel-empleado/page.jsx
 */
export default function PanelEmpleadoPermisos({ datosEmpleado, festivosSet = new Set() }) {
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
      <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        🎫 Historial de Permisos
      </h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {resumen.total || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Total permisos
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {resumen.aprobados || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Aprobados
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {resumen.pendientes || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Pendientes
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {resumen.rechazados || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Rechazados
            </div>
          </CardContent>
        </Card>
      </div>

      {resumen.pendientes > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded flex items-center gap-3">
          <span>ℹ️</span>
          <span className="text-sm">
            El empleado tiene <strong>{resumen.pendientes} permiso(s) pendiente(s)</strong> de aprobación.
          </span>
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-3 sm:mb-4">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">
                DESDE:
              </label>
              <Input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">
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
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-2 sm:-mx-4 md:mx-0">
            <div className="min-w-[600px] sm:min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Tipo de Permiso</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Fecha Inicio</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Fecha Fin</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Días totales</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Días hábiles</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Motivo</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Estado</TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {permisosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                  const { diasTotales, diasHabiles } = calcDiasTotalesYHabiles({
                    fechaInicio: p.fecha_inicio,
                    fechaFin: p.fecha_fin,
                    festivosSet,
                  });

                  const badgeClass =
                    p.estado === "Aprobado"
                      ? "bg-green-100 text-green-800"
                      : p.estado === "Pendiente"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800";
                  const icono =
                    p.estado === "Aprobado"
                      ? "✅"
                      : p.estado === "Pendiente"
                      ? "⏳"
                      : "❌";

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-xs sm:text-sm">{p.tipo_permiso}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{formatearFecha(p.fecha_inicio)}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{formatearFecha(p.fecha_fin)}</TableCell>
                      <TableCell className="text-xs sm:text-sm font-semibold">{diasTotales}</TableCell>
                      <TableCell className="text-xs sm:text-sm font-semibold">{diasHabiles}</TableCell>
                      <TableCell className="text-xs sm:text-sm break-words max-w-[150px] sm:max-w-none">{p.motivo}</TableCell>
                      <TableCell>
                        <Badge className={`${badgeClass} text-[10px] sm:text-xs`}>
                          {icono} {p.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
            </div>
          </div>
        </CardContent>
      </Card>
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

