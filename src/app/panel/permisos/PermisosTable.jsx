"use client";

import React from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingTable from "@/components/LoadingTable";
import { Eye, Inbox, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateDMY } from "@/lib/formatDate";
import { calcDiasTotalesYHabiles } from "@/lib/permisosDias";

/**
 * Tabla de solicitudes de permiso.
 * Relación:
 *  - Usada por `page.jsx` (misma carpeta)
 *  - Acciones de eliminar se delegan al diálogo de confirmación del padre
 */
export default function PermisosTable({
  items,
  loading,
  onEdit,
  onChanged,
  onView,
  onDelete,
  festivosSet = new Set(),
}) {
  if (loading) return <LoadingTable />;
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-10 text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-700">
          <Inbox className="size-6" />
        </div>
        <div className="text-sm font-semibold text-gray-900">Sin permisos para mostrar</div>
        <div className="mt-1 text-sm text-gray-600">Ajusta los filtros o crea un nuevo permiso.</div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-gray-100">
      <CardHeader className="border-b border-gray-100 bg-white pb-4">
        <CardTitle className="text-sm font-bold text-gray-900">Lista de permisos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">#</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Empleado</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Tipo</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Fecha inicio</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Fecha fin</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Días totales</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Días hábiles</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Estado</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">Solicitado</TableHead>
                <TableHead className="whitespace-nowrap text-right text-xs font-semibold uppercase text-gray-600">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => {
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
