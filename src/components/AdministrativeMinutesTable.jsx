"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import dayjs from "dayjs";
import "dayjs/locale/es";
import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";

dayjs.locale("es");

/**
 * Tabla de Actas Administrativas.
 *
 * Relación:
 * - Usada por `src/app/panel/actas-administrativas/page.jsx`.
 * - Los botones "Ver/Editar/Eliminar" se manejan en el padre para centralizar modales y refetch.
 */
export const AdministrativeTable = ({
  actas,
  limpiarFiltros,
  onView,
  onEdit,
  onDelete,
}) => {
  const hasRows = Array.isArray(actas) && actas.length > 0;
  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Lista de actas administrativas
          </h2>
          <Button
            onClick={limpiarFiltros}
            variant="outline"
            className="border-gray-300 w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpiar filtros
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  Folio
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  Empleado
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  Tipo de acta
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  Gravedad
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  Fecha incidente
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  Estado
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!hasRows ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-gray-500 py-10"
                  >
                    No hay registros de actas administrativas.
                  </TableCell>
                </TableRow>
              ) : null}

              {(actas || []).map((acta) => (
                <TableRow
                  key={acta.id_acta}
                  className="hover:bg-gray-50 border-b border-gray-100"
                >
              <TableCell className="font-bold">{acta.folio}</TableCell>
              <TableCell>
                {acta.nombre_empleado} {acta.apellido_paterno_empleado}{" "}
                {acta.apellido_materno_empleado}
              </TableCell>
              <TableCell>{acta.nombre_tipo_acta}</TableCell>
              <TableCell>
                <span
                  className={`px-3 py-1 rounded-2xl text-xs font-semibold ${
                    acta.gravedad_tipo === "grave"
                      ? "bg-red-200 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {acta.gravedad_tipo?.toUpperCase()}
                </span>
              </TableCell>
              <TableCell>
                {dayjs(acta.fecha_incidente).format("DD/MM/YYYY")}
              </TableCell>
              <TableCell className="capitalize text-center">
                <span
                  className={`px-3 py-1 rounded-2xl text-xs font-semibold ${
                    acta.estatus === "elaborada"
                      ? "bg-blue-200 text-blue-800"
                      : acta.estatus === "cerrada"
                      ? "bg-red-200 text-red-800"
                      : acta.estatus === "notificada"
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-purple-200 text-purple-800"
                  }`}
                >
                  {acta.estatus}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {/*
                  Botones estilo "Finiquitos y liquidaciones":
                  - Ver (Eye)
                  - Editar (Edit3)
                  - Eliminar (Trash2)

                  Relación:
                  - UX equivalente a `src/app/panel/finiquitos-y-liquidaciones/page.jsx`
                */}
                <div className="flex justify-end items-center gap-2">
                  <button
                    onClick={() => onEdit?.(acta)}
                    className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4 text-[#2563EB]" />
                  </button>
                  <button
                    onClick={() => onView?.(acta)}
                    className="p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    title="Ver"
                  >
                    <Eye className="h-4 w-4 text-green-600" />
                  </button>
                  <button
                    onClick={() => onDelete?.(acta)}
                    className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default AdministrativeTable;
