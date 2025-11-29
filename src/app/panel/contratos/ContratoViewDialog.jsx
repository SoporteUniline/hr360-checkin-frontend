"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Dialog de solo lectura para ver detalles del contrato.
 * - Relación: se invoca desde `src/app/panel/contratos/page.jsx`
 */
export default function ContratoViewDialog({ open, setOpen, item }) {
  if (!item) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalle del Contrato</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">Sin información.</div>
        </DialogContent>
      </Dialog>
    );
  }

  const vigencia =
    item.tipo_contrato === "indefinido" || !item.fecha_fin
      ? "Sin fecha de término"
      : item.fecha_fin;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📄 Contrato {item.folio || item.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 bg-slate-50">
            <div className="font-semibold text-slate-700 mb-2">📋 Información General</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Empresa:</span> {item.empresa || item.empresa_nombre}</div>
              <div><span className="text-muted-foreground">Empleado:</span> {item.empleado_nombre || item.nombreEmpleado}</div>
              <div><span className="text-muted-foreground">Puesto:</span> {item.puesto || "-"}</div>
              <div><span className="text-muted-foreground">Tipo:</span> {item.tipo_contrato || item.tipoContrato}</div>
              <div><span className="text-muted-foreground">Estatus:</span> {item.estatus || "-"}</div>
            </div>
          </div>

          <div className="rounded-md border p-3 bg-slate-50">
            <div className="font-semibold text-slate-700 mb-2">📅 Vigencia</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Inicio:</span> {item.fecha_inicio || item.fechaInicio}</div>
              <div><span className="text-muted-foreground">Fin:</span> {vigencia}</div>
            </div>
          </div>

          <div className="rounded-md border p-3 bg-slate-50">
            <div className="font-semibold text-slate-700 mb-2">💰 Compensación</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Salario:</span> {item.salario_base ?? item.salarioBase}</div>
              <div><span className="text-muted-foreground">Periodicidad:</span> {item.periodicidad_pago || item.periodicidadPago}</div>
              <div><span className="text-muted-foreground">Moneda:</span> {item.moneda}</div>
            </div>
          </div>

          <div className="rounded-md border p-3 bg-slate-50">
            <div className="font-semibold text-slate-700 mb-2">⏰ Jornada</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Tipo:</span> {item.tipo_jornada || item.tipoJornada}</div>
              <div><span className="text-muted-foreground">Horas semanales:</span> {item.horas_semanales ?? item.horasSemanales}</div>
              {item.horario ? (
                <div className="sm:col-span-2"><span className="text-muted-foreground">Horario:</span> {item.horario}</div>
              ) : null}
            </div>
          </div>

          {item.tipo_contrato !== "prestacion_servicios" ? (
            <div className="rounded-md border p-3 bg-slate-50">
              <div className="font-semibold text-slate-700 mb-2">🎁 Prestaciones</div>
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
            <div className="rounded-md border p-3 bg-slate-50">
              <div className="font-semibold text-slate-700 mb-2">📝 Notas</div>
              <div className="text-sm">{item.notas}</div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}


