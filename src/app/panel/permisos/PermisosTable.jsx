"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import LoadingTable from "@/components/LoadingTable";
import { Eye, Inbox, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateDMY } from "@/lib/formatDate";
import { calcDiasTotalesYHabiles } from "@/lib/permisosDias";
import HeaderMultiFilter from "../registro-asistencia/HeaderMultiFilter";
import ActiveFilterChips from "../registro-asistencia/ActiveFilterChips";

/**
 * Tabla de solicitudes de permiso.
 * Relación:
 *  - Usada por `page.jsx` (misma carpeta)
 *  - Acciones de eliminar se delegan al diálogo de confirmación del padre
 */
export default function PermisosTable({
  items,
  filterOptionsRows = [],
  page = 1,
  limit = 10,
  onHeaderFilteringMetaChange,
  loading,
  onCreate,
  onEdit,
  onChanged,
  onView,
  onDelete,
  festivosSet = new Set(),
}) {
  const [unidadSeleccionada, setUnidadSeleccionada] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState([]);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState([]);
  const safeItems = Array.isArray(items) ? items : [];

  const sourceRows = useMemo(
    () =>
      Array.isArray(filterOptionsRows) && filterOptionsRows.length > 0
        ? filterOptionsRows
        : safeItems,
    [filterOptionsRows, safeItems],
  );

  const uniqueOptions = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const unidadOptions = useMemo(
    () =>
      uniqueOptions(
        sourceRows.map(
          (row) =>
            row.unidad_negocio ||
            row.nombre_sucursal ||
            row.sucursal ||
            row.nombre_empresa ||
            row.empresa_nombre,
        ),
      ),
    [sourceRows],
  );
  const empleadoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => row.empleado_nombre)),
    [sourceRows],
  );
  const tipoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => row.tipo_permiso_nombre)),
    [sourceRows],
  );
  const estadoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => row.estado)),
    [sourceRows],
  );

  const filteredRowsAll = useMemo(
    () =>
      sourceRows.filter((row) => {
        const unidad =
          row.unidad_negocio ||
          row.nombre_sucursal ||
          row.sucursal ||
          row.nombre_empresa ||
          row.empresa_nombre;
        const passUnidad =
          unidadSeleccionada.length === 0 || unidadSeleccionada.includes(unidad);
        const passEmpleado =
          empleadoSeleccionado.length === 0 ||
          empleadoSeleccionado.includes(row.empleado_nombre);
        const passTipo =
          tipoSeleccionado.length === 0 ||
          tipoSeleccionado.includes(row.tipo_permiso_nombre);
        const passEstado =
          estadoSeleccionado.length === 0 || estadoSeleccionado.includes(row.estado);
        return passUnidad && passEmpleado && passTipo && passEstado;
      }),
    [
      sourceRows,
      unidadSeleccionada,
      empleadoSeleccionado,
      tipoSeleccionado,
      estadoSeleccionado,
    ],
  );

  const hasActiveHeaderFilters =
    unidadSeleccionada.length > 0 ||
    empleadoSeleccionado.length > 0 ||
    tipoSeleccionado.length > 0 ||
    estadoSeleccionado.length > 0;

  const displayedRows = useMemo(() => {
    if (!hasActiveHeaderFilters) return safeItems;
    const offset = (page - 1) * limit;
    return filteredRowsAll.slice(offset, offset + limit);
  }, [hasActiveHeaderFilters, safeItems, page, limit, filteredRowsAll]);

  useEffect(() => {
    onHeaderFilteringMetaChange?.({
      active: hasActiveHeaderFilters,
      total: filteredRowsAll.length,
    });
  }, [hasActiveHeaderFilters, filteredRowsAll.length, onHeaderFilteringMetaChange]);

  const clearAllHeaderFilters = () => {
    setUnidadSeleccionada([]);
    setEmpleadoSeleccionado([]);
    setTipoSeleccionado([]);
    setEstadoSeleccionado([]);
  };

  if (loading) return <LoadingTable />;
  if (!hasActiveHeaderFilters && safeItems.length === 0) {
    return (
      <Card className="overflow-hidden border-gray-100">
        <CardHeader className="border-b border-gray-100 bg-white pb-4">
          <div className="flex justify-end">
            <Button
              onClick={onCreate}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              <Plus className="h-4 w-4 mr-2" /> Nuevo permiso
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-10 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Inbox className="size-6" />
          </div>
          <div className="text-sm font-semibold text-gray-900">
            Sin permisos para mostrar
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Ajusta los filtros o crea un nuevo permiso.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-gray-100">
      <CardHeader className="border-b border-gray-100 bg-white pb-4">
        <div className="flex justify-end">
          <Button
            onClick={onCreate}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> Nuevo permiso
          </Button>
        </div>
      </CardHeader>
      <ActiveFilterChips
        groups={[
          {
            category: "Unidad de negocio",
            values: unidadSeleccionada,
            options: unidadOptions,
            onChange: setUnidadSeleccionada,
          },
          {
            category: "Empleado",
            values: empleadoSeleccionado,
            options: empleadoOptions,
            onChange: setEmpleadoSeleccionado,
          },
          {
            category: "Tipo",
            values: tipoSeleccionado,
            options: tipoOptions,
            onChange: setTipoSeleccionado,
          },
          {
            category: "Estado",
            values: estadoSeleccionado,
            options: estadoOptions,
            onChange: setEstadoSeleccionado,
          },
        ]}
        onClearAll={clearAllHeaderFilters}
      />
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">#</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
                  <HeaderMultiFilter
                    selected={unidadSeleccionada}
                    onChange={setUnidadSeleccionada}
                    options={unidadOptions}
                    placeholder="Unidad de negocio"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
                  <HeaderMultiFilter
                    selected={empleadoSeleccionado}
                    onChange={setEmpleadoSeleccionado}
                    options={empleadoOptions}
                    placeholder="Empleado"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
                  <HeaderMultiFilter
                    selected={tipoSeleccionado}
                    onChange={setTipoSeleccionado}
                    options={tipoOptions}
                    placeholder="Tipo"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Fecha inicio</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Fecha fin</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Días totales</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Días hábiles</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
                  <HeaderMultiFilter
                    selected={estadoSeleccionado}
                    onChange={setEstadoSeleccionado}
                    options={estadoOptions}
                    placeholder="Estado"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Solicitado</TableHead>
                <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase text-gray-600">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRows.map((row) => {
                const di = dayjs(row.fecha_inicio);
                const df = row.fecha_fin ? dayjs(row.fecha_fin) : di;
                const diasNaturales = Math.max(1, df.diff(di, "day") + 1);
                const isVacaciones = String(row.tipo_permiso_nombre || "")
                  .toLowerCase()
                  .includes("vacacion");

                /**
                 * Totales/Hábiles (nueva columna):
                 * - Relación: `src/lib/permisosDias.js` centraliza el cálculo para que coincida con PDF y otras vistas.
                 * - Nota: el conteo "hábil" en el proyecto excluye domingos + festivos (no sábados).
                 */
                const { diasTotales, diasHabiles } = calcDiasTotalesYHabiles({
                  fechaInicio: row.fecha_inicio,
                  fechaFin: row.fecha_fin,
                  festivosSet,
                });

                // Columna existente "Días":
                // - Se conserva el cálculo para compatibilidad interna, pero en UI se dejó
                //   únicamente "Días totales" y "Días hábiles" para evitar duplicidad.
                // eslint-disable-next-line no-unused-vars
                const dias = isVacaciones ? diasHabiles : diasNaturales;

                return (
                  <TableRow key={row.id} className="hover:bg-zinc-50">
                    <TableCell className="text-gray-500 font-semibold">
                      {String(row.id).padStart(3, "0")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-700">
                        {row.unidad_negocio ||
                          row.nombre_sucursal ||
                          row.sucursal ||
                          row.nombre_empresa ||
                          row.empresa_nombre ||
                          "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-md bg-[#2563EB] text-white font-bold">
                          {(row.empleado_nombre || "?")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((s) => s[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold leading-tight text-gray-900 truncate">
                            {row.empleado_nombre}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID empleado: {row.id_empleado}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800">
                        {row.tipo_permiso_nombre}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{formatDateDMY(di)}</TableCell>
                    <TableCell className="font-mono text-sm">{row.fecha_fin ? formatDateDMY(df) : "-"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      <span className="inline-block whitespace-nowrap rounded-md bg-zinc-100 px-2 py-1 text-sm font-bold text-zinc-800">
                        {diasTotales}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <span className="inline-block whitespace-nowrap rounded-md bg-zinc-100 px-2 py-1 text-sm font-bold text-zinc-800">
                        {diasHabiles}
                      </span>
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={row.estado} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.marca_tiempo ? formatDateDMY(dayjs(row.marca_tiempo)) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Editar"
                          onClick={() => onEdit?.(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          title="Ver"
                          onClick={() => onView?.(row)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          title="Eliminar"
                          onClick={() => onDelete?.(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {displayedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                    No hay permisos para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function EstadoBadge({ estado }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  if (estado === "Pendiente") return <span className={cn(base, "bg-amber-100 text-amber-900")}>Pendiente</span>;
  if (estado === "Aprobado") return <span className={cn(base, "bg-emerald-100 text-emerald-900")}>Aprobado</span>;
  if (estado === "Rechazado") return <span className={cn(base, "bg-red-100 text-red-900")}>Rechazado</span>;
  if (estado === "Cancelado") return <span className={cn(base, "bg-zinc-200 text-zinc-700")}>Cancelado</span>;
  return <span className={cn(base, "bg-zinc-200 text-zinc-700")}>{estado || "—"}</span>;
}
