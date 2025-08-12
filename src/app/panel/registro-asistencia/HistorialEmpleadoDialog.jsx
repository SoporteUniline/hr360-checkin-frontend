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
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PencilIcon, SaveIcon, XIcon } from "lucide-react";
import useEntradaSalida from "@/hooks/useEntradaSalida";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Mexico_City");

export default function HistorialEmpleadoDialog({
  isOpen,
  onOpenChange,
  empleado,
  mutateAsistencia,
}) {
  const { dataUser } = useAuth();
  const page = 1;
  const limit = 10;

  // Llama al hook useClockCheckData solo si el modal está abierto
  const { data, error, isLoading, mutate } = useClockCheckData(
    isOpen ? dataUser?.id_empresa : null,
    isOpen ? empleado?.fecha : null,
    isOpen ? empleado?.id_empleado : null,
    page,
    limit
  );

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return "-";
    return dayjs(dateTimeString).format("HH:mm");
  };

  const baseDateForCorrection = dayjs(empleado.entrada).format("YYYY-MM-DD");

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
      <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-full">
        <DialogHeader>
          <DialogTitle>
            Historial de Entradas y Salidas de {empleado.nombre}{" "}
            {empleado.apellido_paterno}
          </DialogTitle>
          <DialogDescription>
            Registros para el día {dayjs(empleado?.fecha).format("DD/MM/YYYY")}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-center p-4">Cargando datos...</p>}
        {error && (
          <p className="text-center text-red-500 p-4">
            Error al cargar los datos: {error.message}
          </p>
        )}
        {data?.registros?.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Entrada</TableHead>
                  <TableHead className="text-center">
                    Entrada Corregida
                  </TableHead>
                  <TableHead className="text-center">Salida</TableHead>
                  <TableHead className="text-center">
                    Salida Corregida
                  </TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.registros.map((checador, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center">
                      {checador.entrada
                        ? dayjs(checador.entrada).format("HH:mm:ss")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {editingMovimientoId === checador.id ? (
                        <Input
                          type="time"
                          value={
                            editingMovimientoData.entrada_corregida
                              ? dayjs(
                                  editingMovimientoData.entrada_corregida
                                ).format("HH:mm")
                              : ""
                          }
                          max={
                            editingMovimientoData.salida_corregida
                              ? dayjs(
                                  editingMovimientoData.salida_corregida
                                ).format("HH:mm")
                              : undefined
                          }
                          onChange={(e) => {
                            const hora = e.target.value;
                            const nuevaEntradaCorregida = hora
                              ? dayjs(
                                  `${baseDateForCorrection} ${hora}`
                                ).format("YYYY-MM-DD HH:mm:ss")
                              : null;
                            handleMovimientoFieldChange(
                              "entrada_corregida",
                              nuevaEntradaCorregida
                            );
                          }}
                          className="max-w-[120px] mx-auto text-center"
                        />
                      ) : (
                        <span>
                          {checador.entrada_corregida
                            ? dayjs(checador.entrada_corregida).format(
                                "HH:mm:ss"
                              )
                            : "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {checador.salida
                        ? dayjs(checador.salida).format("HH:mm:ss")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {editingMovimientoId === checador.id ? (
                        <Input
                          type="time"
                          value={
                            editingMovimientoData.salida_corregida
                              ? dayjs(
                                  editingMovimientoData.salida_corregida
                                ).format("HH:mm")
                              : ""
                          }
                          min={
                            editingMovimientoData.entrada_corregida
                              ? dayjs(
                                  editingMovimientoData.entrada_corregida
                                ).format("HH:mm")
                              : undefined
                          }
                          onChange={(e) => {
                            const hora = e.target.value;
                            // Combina la fecha base con la hora seleccionada
                            const nuevaSalidaCorregida = hora
                              ? dayjs(
                                  `${baseDateForCorrection} ${hora}`
                                ).format("YYYY-MM-DD HH:mm:ss")
                              : null;
                            handleMovimientoFieldChange(
                              "salida_corregida",
                              nuevaSalidaCorregida
                            );
                          }}
                          className="max-w-[120px] mx-auto text-center"
                        />
                      ) : (
                        <span>
                          {checador.salida_corregida
                            ? dayjs(checador.salida_corregida).format(
                                "HH:mm:ss"
                              )
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
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={async () => {
                              await handleSaveMovimientoClick();
                              if (mutateAsistencia) {
                                await mutateAsistencia();
                              }
                            }}
                            disabled={isSavingMovimiento}
                          >
                            <SaveIcon className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleCancelMovimientoEdit()}
                          >
                            <XIcon className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditMovimientoClick(checador)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {!isLoading && !error && data?.registros?.length === 0 && (
          <p className="text-center p-4">
            No hay registros de entradas y salidas para este empleado.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
