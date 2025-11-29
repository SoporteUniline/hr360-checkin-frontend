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
import { AdministrativeDetailsModal } from "./AdministrativeDetailsModal";

dayjs.locale("es");

export const AdministrativeTable = ({ actas }) => {
  const [selectedActa, setSelectedActa] = useState(null);
  const [open, setOpen] = useState(false);

  const handleRowClick = (acta) => {
    setSelectedActa(acta);
    setOpen(true);
  };

  if (!actas || actas.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No hay registros de actas administrativas.
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-700 shadow-md px-4 py-3 rounded-tl-md rounded-tr-md">
        <h2 className="text-lg font-bold bg-slate-700 text-white">
          Lista de actas administrativas
        </h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-slate-700 text-white">
            <TableHead className="bg-slate-700 text-white">Folio</TableHead>
            <TableHead className="bg-slate-700 text-white">Empleado</TableHead>
            <TableHead className="bg-slate-700 text-white">
              Tipo de acta
            </TableHead>
            <TableHead className="bg-slate-700 text-white">Gravedad</TableHead>
            <TableHead className="bg-slate-700 text-white">
              Fecha incidente
            </TableHead>
            <TableHead className="text-center bg-slate-700 text-white">
              Estatus
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {actas.map((acta) => (
            <TableRow
              key={acta.id_acta}
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => handleRowClick(acta)}
            >
              <TableCell className="font-bold">{acta.folio}</TableCell>
              <TableCell>{acta.nombre_empleado}</TableCell>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AdministrativeDetailsModal
        open={open}
        onClose={() => setOpen(false)}
        acta={selectedActa}
      />
    </>
  );
};

export default AdministrativeTable;
