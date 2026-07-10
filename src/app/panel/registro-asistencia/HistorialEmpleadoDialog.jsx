// src/app/panel/registro-asistencia/HistorialEmpleadoDialog.jsx
import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import useClockCheckData from "@/hooks/useRelojChecador";
import { useAuth, useEmpresaTimezone } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Save, X, Clock } from "lucide-react";
import useEntradaSalida from "@/hooks/useEntradaSalida";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TIMEZONE = "America/Mexico_City";

export default function HistorialEmpleadoDialog({
  isOpen,
  onOpenChange,
  empleado,
  mutateAsistencia,
}) {
  const { dataUser } = useAuth();
  const empresaTimezone = useEmpresaTimezone(dataUser?.id_empresa);
  const page = 1;
  const limit = 10;

  const { data, error, isLoading, mutate } = useClockCheckData(
    isOpen ? dataUser?.id_empresa : null,
    isOpen ? empleado?.fecha : null,
    isOpen ? empleado?.id_empleado : null,
    null,
    page,
    limit,
    null,
    null,
  );

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return "-";
    return dayjs
      .tz(dateTimeString, DB_TIMEZONE)
      .tz(empresaTimezone)
      .format("HH:mm");
  };

  const baseDateForCorrection = dayjs
    .tz(empleado?.entrada, DB_TIMEZONE)
    .tz(empresaTimezone)
    .format("YYYY-MM-DD");

  const {
    editingMovimientoId,
    isSavingMovimiento,
    editingMovimientoData,
    handleEditMovimientoClick,
    handleSaveMovimientoClick,
    handleCancelMovimientoEdit,
    handleMovimientoFieldChange,
  } = useEntradaSalida(mutate);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-full p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6" />
            <div>
              <DialogTitle className="text-white text-lg font-semibold">
                Historial de entradas y salidas
              </DialogTitle>
              <DialogDescription className="text-white/90 text-sm">
                {empleado?.nombre} {empleado?.apellido_paterno} —{" "}
                {dayjs(empleado?.fecha).format("DD/MM/YYYY")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 text-sm">
          {isLoading && (
            <p className="text-center py-6 text-gray-600">Cargando datos...</p>
          )}
          {error && (
            <p className="text-center text-red-600 py-6">
              Error al cargar los datos: {error.message}
            </p>
          )}
          {data?.registros?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                        Entrada
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                        Entrada corregida
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                        Salida
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                        Salida corregida
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                        Estado
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.registros.map((checador, index) => (
                      <TableRow
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <TableCell className="text-center">
                          {checador.entrada
                            ? dayjs
                                .tz(checador.entrada, DB_TIMEZONE)
                                .tz(empresaTimezone)
                                .format("HH:mm:ss")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingMovimientoId === checador.id ? (
                            <Input
                              type="time"
                              value={
                                editingMovimientoData.entrada_corregida
                                  ? dayjs
                                      .tz(
                                        editingMovimientoData.entrada_corregida,
                                        DB_TIMEZONE,
                                      )
                                      .tz(empresaTimezone)
                                      .format("HH:mm")
                                  : ""
                              }
                              max={
                                editingMovimientoData.salida_corregida
                                  ? dayjs
                                      .tz(
                                        editingMovimientoData.salida_corregida,
                                        DB_TIMEZONE,
                                      )
                                      .tz(empresaTimezone)
                                      .format("HH:mm")
                                  : undefined
                              }
                              onChange={(e) => {
                                const hora = e.target.value;
                                const nuevaEntradaCorregida = hora
                                  ? dayjs(
                                      `${baseDateForCorrection} ${hora}`,
                                    ).format("YYYY-MM-DD HH:mm:ss")
                                  : null;
                                handleMovimientoFieldChange(
                                  "entrada_corregida",
                                  nuevaEntradaCorregida,
                                );
                              }}
                              className="max-w-[120px] mx-auto text-center"
                            />
                          ) : (
                            <span>
                              {checador.entrada_corregida
                                ? dayjs
                                    .tz(checador.entrada_corregida, DB_TIMEZONE)
                                    .tz(empresaTimezone)
                                    .format("HH:mm:ss")
                                : "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {checador.salida
                            ? dayjs
                                .tz(checador.salida, DB_TIMEZONE)
                                .tz(empresaTimezone)
                                .format("HH:mm:ss")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingMovimientoId === checador.id ? (
                            <Input
                              type="time"
                              value={
                                editingMovimientoData.salida_corregida
                                  ? dayjs
                                      .tz(
                                        editingMovimientoData.salida_corregida,
                                        DB_TIMEZONE,
                                      )
                                      .tz(empresaTimezone)
                                      .format("HH:mm")
                                  : ""
                              }
                              min={
                                editingMovimientoData.entrada_corregida
                                  ? dayjs
                                      .tz(
                                        editingMovimientoData.entrada_corregida,
                                        DB_TIMEZONE,
                                      )
                                      .tz(empresaTimezone)
                                      .format("HH:mm")
                                  : undefined
                              }
                              onChange={(e) => {
                                const hora = e.target.value;
                                // Combina la fecha base con la hora seleccionada
                                const nuevaSalidaCorregida = hora
                                  ? dayjs(
                                      `${baseDateForCorrection} ${hora}`,
                                    ).format("YYYY-MM-DD HH:mm:ss")
                                  : null;
                                handleMovimientoFieldChange(
                                  "salida_corregida",
                                  nuevaSalidaCorregida,
                                );
                              }}
                              className="max-w-[120px] mx-auto text-center"
                            />
                          ) : (
                            <span>
                              {checador.salida_corregida
                                ? dayjs
                                    .tz(checador.salida_corregida, DB_TIMEZONE)
                                    .tz(empresaTimezone)
                                    .format("HH:mm:ss")
                                : "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-sm text-white ${
                              checador.estado === "Abierto"
                                ? "bg-green-600"
                                : "bg-gray-500"
                            }`}
                          >
                            {checador.estado}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {editingMovimientoId === checador.id ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={async () => {
                                  await handleSaveMovimientoClick();
                                  if (mutateAsistencia) {
                                    await mutateAsistencia();
                                  }
                                }}
                                disabled={isSavingMovimiento}
                                className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                title="Guardar"
                              >
                                <Save className="h-4 w-4 text-[#2563EB]" />
                              </button>
                              <button
                                onClick={() => handleCancelMovimientoEdit()}
                                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                title="Cancelar"
                              >
                                <X className="h-4 w-4 text-gray-700" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                handleEditMovimientoClick(checador)
                              }
                              className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4 text-[#2563EB]" />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {!isLoading && !error && data?.registros?.length === 0 && (
            <p className="text-center py-6 text-gray-500">
              No hay registros de entradas y salidas para este empleado.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
