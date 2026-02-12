"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil, Eye, Trash2, Mail, Phone, RotateCcw } from "lucide-react";
import EstadoEmpleadoDialog from "./EstadoEmpleadoDialog";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { formatDateDMY } from "@/lib/formatDate";

dayjs.locale("es");

// Función auxiliar para iniciales
const getInitials = (nombreCompleto = "") => {
  const parts = nombreCompleto.split(" ");
  return parts
    .map((p) => p[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("");
};

// Función para generar color de fondo basado en iniciales
const getAvatarColor = (nombreCompleto = "") => {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  const charCode = nombreCompleto.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

export default function EmpleadosTable({
  empleados,
  abrirFormulario,
  mutate,
  page,
  limit,
  resetFilters,
}) {
  if (!empleados || empleados.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
        <div className="text-center text-gray-500">
          No hay empleados o búsqueda sin resultados.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      {/* Header de la tabla */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Lista de empleados
        </h2>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                Nombre
              </TableHead>
              <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                Puesto
              </TableHead>
              <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                Depto.
              </TableHead>
              <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                Contacto
              </TableHead>
              <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                Ingreso
              </TableHead>
              <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                Estado
              </TableHead>
              <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center sticky right-0 bg-gray-50 z-10">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empleados.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-2 text-muted-foreground"
                >
                  No hay empleados o búsqueda sin resultados.
                </TableCell>
              </TableRow>
            ) : (
              empleados.map((emp) => {
                const nombreCompleto = `${emp.nombre} ${
                  emp.apellido_paterno ?? ""
                } ${emp.apellido_materno ?? ""}`.trim();

                return (
                  <TableRow
                    className="cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                    key={emp.id_empleado}
                    onClick={() => abrirFormulario(emp, false, true)}
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                          {emp.foto_perfil ? (
                            <AvatarImage
                              src={emp.foto_perfil}
                              alt={nombreCompleto}
                            />
                          ) : null}
                          <AvatarFallback
                            className={`${getAvatarColor(
                              nombreCompleto,
                            )} text-white font-semibold text-sm`}
                          >
                            {getInitials(nombreCompleto)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {nombreCompleto}
                          </span>
                          {emp?.nip ? (
                            <span className="text-xs text-gray-500">
                              Código: {emp.nip}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700 font-medium">
                      {emp.puesto}
                    </TableCell>
                    <TableCell className="text-center">
                      {emp.departamento ? (
                        <span className="text-sm text-gray-700">
                          {emp.departamento}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {emp?.correo ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                            <a
                              href={`mailto:${emp.correo}`}
                              className="text-[#2563EB] hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {emp.correo}
                            </a>
                          </div>
                        ) : null}
                        {emp?.telefono ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span>{emp.telefono}</span>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {emp.fecha_ingreso
                        ? formatDateDMY(dayjs(emp.fecha_ingreso))
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            emp.estado === "Activo"
                              ? "bg-[#2563EB] text-white"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {emp.estado}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="sticky right-0 bg-white z-10">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirFormulario(emp, true, false);
                          }}
                          className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4 text-[#2563EB]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirFormulario(emp, false, true);
                          }}
                          className="p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4 text-green-600" />
                        </button>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EstadoEmpleadoDialog
                            item={emp}
                            limit={limit}
                            page={page}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
