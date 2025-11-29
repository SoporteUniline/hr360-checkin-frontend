"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { twMerge } from "tailwind-merge";
import { CardCompact } from "./CardCompact";

dayjs.locale("es");

export const AdministrativeDetailsModal = ({ open, onClose, acta }) => {
  if (!acta) return null;

  const formatSancion = (str) => {
    if (!str) return "";
    return str.replace(/_/g, " ").toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={twMerge("sm:max-w-xl md:max-w-2xl lg:max-w-3xl")}
      >
        <DialogHeader className="border-b-2 pb-2">
          <DialogTitle className="text-md">📋 Acta {acta.folio}</DialogTitle>
        </DialogHeader>

        <div className="text-sm space-y-2 pt-2 max-h-[60vh] overflow-y-auto">
          <CardCompact title="📄 Información General">
            <div className="flex justify-between pb-1 border-b-1">
              <p className="text-gray-500">Folio:</p>
              <p className="font-semibold">{acta.folio}</p>
            </div>

            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Empleado:</p>
              <p className="font-semibold">
                {acta.nombre_empleado} {acta.apellido_paterno_empleado}{" "}
                {acta.apellido_materno_empleado}
              </p>
            </div>

            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Tipo de acta:</p>
              <p className="font-semibold">{acta.nombre_tipo_acta}</p>
            </div>

            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Gravedad:</p>
              <span
                className={twMerge(
                  "px-3 py-1 rounded-2xl text-xs font-semibold",
                  acta.gravedad_tipo === "grave"
                    ? "bg-red-200 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                )}
              >
                {acta.gravedad_tipo?.toUpperCase()}
              </span>
            </div>
          </CardCompact>

          <CardCompact title="📅 Detalles del Incidente">
            <div className="flex justify-between pb-1 border-b-1">
              <p className="text-gray-500">Fecha:</p>
              <p className="font-semibold">
                {dayjs(acta.fecha_incidente).format("DD/MM/YYYY")}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Hora:</p>
              <p className="font-semibold">{acta.hora_incidente}</p>
            </div>
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Lugar:</p>
              <p className="font-semibold">
                {acta.lugar_incidente
                  ? acta.lugar_incidente
                  : "No especificado"}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Descripción:</p>
              <p className="font-semibold">{acta.descripcion_hechos}</p>
            </div>
          </CardCompact>

          <CardCompact title="⚠️ Sanción">
            <div className="flex justify-between pb-1 border-b-1">
              <p className="text-gray-500">Tipo:</p>
              <p className="font-semibold">
                {formatSancion(acta.tipo_sancion)}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Días de suspensión:</p>
              <p className="font-semibold">{acta.dias_suspension}</p>
            </div>
          </CardCompact>

          <CardCompact title="💬 Descargo del Trabajador">
            {acta.descargo_trabajador && (
              <div className="pb-3">{acta.descargo_trabajador}</div>
            )}
            <div className="flex justify-between">
              <p className="text-gray-500">Acepta los hechos:</p>
              <p className="font-semibold">
                {acta.acepta_hechos ? "✅ Sí" : "✖️ No"}
              </p>
            </div>
          </CardCompact>
          <CardCompact title="👤 Información Administrativa">
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Elabora:</p>
              <p className="font-semibold">{acta.nombre_quien_elabora}</p>
            </div>
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Estatus:</p>
              <span
                className={`capitalize px-3 py-1 rounded-2xl text-xs font-semibold ${
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
            </div>
            <div className="flex justify-between pt-2 pb-2 border-b-1">
              <p className="text-gray-500">Reincidencia:</p>
              <p className="font-semibold">
                {acta.es_reincidencia ? "⚠️ SÍ" : "🪪 NO"}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Fecha de creación:</p>
              <p className="font-semibold">
                {dayjs(acta.fecha_creacion).format("DD/MM/YYYY HH:mm")}
              </p>
            </div>
          </CardCompact>
        </div>
      </DialogContent>
    </Dialog>
  );
};
