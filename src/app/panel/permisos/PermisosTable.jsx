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
import LoadingTable from "@/components/LoadingTable";
import { Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateDMY } from "@/lib/formatDate";
import { calcDiasTotalesYHabiles } from "@/lib/permisosDias";
import styles from "./permisos-theme.module.css";

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
  festivosSet = new Set(),
}) {
  if (loading) return <LoadingTable />;
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-3 opacity-50">📭</div>
        <div className="font-semibold">Sin permisos para mostrar</div>
        <div className="text-sm text-muted-foreground">
          Ajusta los filtros o crea un nuevo permiso.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">#</TableHead>
            <TableHead className="whitespace-nowrap">Empleado</TableHead>
            <TableHead className="whitespace-nowrap">Tipo</TableHead>
            <TableHead className="whitespace-nowrap">Fecha Inicio</TableHead>
            <TableHead className="whitespace-nowrap">Fecha Fin</TableHead>
            <TableHead className="whitespace-nowrap">Días</TableHead>
            <TableHead className="whitespace-nowrap">Días totales</TableHead>
            <TableHead className="whitespace-nowrap">Días hábiles</TableHead>
            <TableHead className="whitespace-nowrap">Estado</TableHead>
            <TableHead className="whitespace-nowrap">Solicitado</TableHead>
            <TableHead className="whitespace-nowrap text-right">
              Acciones
            </TableHead>
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
            // - Se respeta el comportamiento actual: para Vacaciones se muestra el conteo "hábil",
            //   para otros permisos se muestran días naturales.
            const dias = isVacaciones ? diasHabiles : diasNaturales;
            return (
              <TableRow key={row.id} className="hover:bg-accent/40">
                <TableCell className="text-muted-foreground font-semibold">
                  {String(row.id).padStart(3, "0")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
                      {(row.empleado_nombre || "?")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((s) => s[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold leading-tight">
                        {row.empleado_nombre}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID empleado: {row.id_empleado}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
                      "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {row.tipo_permiso_nombre}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatDateDMY(di)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {row.fecha_fin ? formatDateDMY(df) : "-"}
                </TableCell>
                <TableCell>
                  <span className="inline-block px-2 py-1 rounded-md bg-muted font-bold text-sm">
                    {dias}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  <span className="inline-block px-2 py-1 rounded-md bg-muted font-bold text-sm whitespace-nowrap">
                    {diasTotales}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  <span className="inline-block px-2 py-1 rounded-md bg-muted font-bold text-sm whitespace-nowrap">
                    {diasHabiles}
                  </span>
                </TableCell>
                <TableCell>
                  <EstadoBadge estado={row.estado} />
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {row.marca_tiempo
                    ? formatDateDMY(dayjs(row.marca_tiempo))
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]"
                      title="Ver"
                      onClick={() => onView?.(row)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#93c5fd] text-[#2563eb] hover:bg-[#dbeafe] hover:text-[#1e40af]"
                      onClick={() => onEdit(row)}
                    >
                      Editar
                    </Button>
                    {/* Botón eliminar removido por política para evitar errores */}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const base =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold";
  if (estado === "Pendiente")
    return (
      <span className={cn(base, "bg-yellow-100 text-yellow-900")}>
        ⏳ Pendiente
      </span>
    );
  if (estado === "Aprobado")
    return (
      <span className={cn(base, "bg-green-100 text-green-900")}>
        ✅ Aprobado
      </span>
    );
  if (estado === "Rechazado")
    return (
      <span className={cn(base, "bg-red-100 text-red-900")}>❌ Rechazado</span>
    );
  if (estado === "Cancelado")
    return (
      <span className={cn(base, "bg-slate-200 text-slate-700")}>
        ⚪ Cancelado
      </span>
    );
  return (
    <span className={cn(base, "bg-slate-200 text-slate-700")}>
      {estado || "—"}
    </span>
  );
}
