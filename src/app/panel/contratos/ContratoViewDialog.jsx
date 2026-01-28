"use client";

import React from "react";
import dayjs from "dayjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";

/**
 * Dialog de solo lectura para ver detalles del contrato.
 * - Relación: se invoca desde `src/app/panel/contratos/page.jsx`
 */
export default function ContratoViewDialog({ open, setOpen, item }) {
  function formatDMY(value) {
    if (!value) return "";
    const d = dayjs(value, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY/MM/DD"], true);
    return d.isValid() ? d.format("DD/MM/YYYY") : String(value);
  }

  function BadgeTipo({ tipo }) {
    const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
    switch (tipo) {
      case "indefinido":
        return <span className={base} style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>Indefinido</span>;
      case "temporal":
        return <span className={base} style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Temporal</span>;
      case "obra_determinada":
        return <span className={base} style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Obra Determinada</span>;
      case "capacitacion":
        return <span className={base} style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Capacitación</span>;
      case "prueba":
        return <span className={base} style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Prueba</span>;
      case "prestacion_servicios":
        return <span className={base} style={{ backgroundColor: "#e9d5ff", color: "#6b21a8" }}>Prestación Servicios</span>;
      default:
        return <span className={base} style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>{tipo || "-"}</span>;
    }
  }

  function BadgeEstatus({ estatus }) {
    const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
    const val = (estatus || "").toLowerCase();
    if (val === "activo") return <span className={base} style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>Activo</span>;
    if (val === "suspendido") return <span className={base} style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Suspendido</span>;
    if (val === "terminado") return <span className={base} style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>Terminado</span>;
    if (val === "cancelado") return <span className={base} style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>Cancelado</span>;
    return <span className={base} style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>{estatus}</span>;
  }

  if (!item) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl p-0 overflow-hidden">
          <DialogHeader className="p-0">
            <div className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] p-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-white text-xl font-bold">
                    Detalle del contrato
                  </DialogTitle>
                  <p className="text-sm text-blue-100">
                    Vista de solo lectura
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 text-sm text-gray-600">Sin información.</div>
        </DialogContent>
      </Dialog>
    );
  }

  const vigencia =
    item.tipo_contrato === "indefinido" || !item.fecha_fin
      ? "Sin fecha de término"
      : formatDMY(item.fecha_fin || item.fechaFin);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="p-0">
          <div className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold">
                  Contrato {item.folio || item.id}
                </DialogTitle>
                <p className="text-sm text-blue-100">Detalle del contrato</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border border-blue-100 rounded-xl p-5">
            <div className="font-semibold mb-4 text-gray-900">Información general</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Empresa:</span> {item.empresa || item.empresa_nombre}</div>
              <div><span className="text-muted-foreground">Empleado:</span> {item.nombre_empleado || item.empleado_nombre || item.nombreEmpleado}</div>
              <div><span className="text-muted-foreground">Puesto:</span> {item.puesto || "-"}</div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tipo:</span> <BadgeTipo tipo={item.tipo_contrato || item.tipoContrato} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Estatus:</span> <BadgeEstatus estatus={item.estatus || "-"} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50 border border-amber-100 rounded-xl p-5">
            <div className="font-semibold mb-4 text-gray-900">Vigencia</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Inicio:</span> {formatDMY(item.fecha_inicio || item.fechaInicio)}</div>
              <div><span className="text-muted-foreground">Fin:</span> {vigencia}</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 via-white to-green-50 border border-green-100 rounded-xl p-5">
            <div className="font-semibold mb-4 text-gray-900">Compensación</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Salario:</span> {item.salario_base ?? item.salarioBase}</div>
              <div><span className="text-muted-foreground">Periodicidad:</span> {item.periodicidad_pago || item.periodicidadPago}</div>
              <div><span className="text-muted-foreground">Moneda:</span> {item.moneda}</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50 border border-orange-100 rounded-xl p-5">
            <div className="font-semibold mb-4 text-gray-900">Jornada</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Tipo:</span> {item.tipo_jornada || item.tipoJornada}</div>
              <div><span className="text-muted-foreground">Horas semanales:</span> {item.horas_semanales ?? item.horasSemanales}</div>
              {item.horario ? (
                <div className="sm:col-span-2"><span className="text-muted-foreground">Horario:</span> {item.horario}</div>
              ) : null}
            </div>
          </div>

          {item.tipo_contrato !== "prestacion_servicios" ? (
            <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50 border border-purple-100 rounded-xl p-5">
              <div className="font-semibold mb-4 text-gray-900">Prestaciones</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Vacaciones:</span> {item.dias_vacaciones ?? item.diasVacaciones} días</div>
                <div><span className="text-muted-foreground">Aguinaldo:</span> {item.aguinaldo_dias ?? item.aguinaldoDias} días</div>
                <div><span className="text-muted-foreground">Prima Vacacional:</span> {(item.prima_vacacional ?? item.primaVacacionalPorcentaje) + "%"} </div>
                {item.prestaciones_superiores || item.prestacionesSuperiores ? (
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Prestaciones Superiores:</span> {item.prestaciones_superiores || item.prestacionesSuperiores}</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {item.notas ? (
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="font-semibold mb-4 text-gray-900">Notas</div>
              <div className="text-sm">{item.notas}</div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}


