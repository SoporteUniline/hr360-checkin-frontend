"use client";

import React from "react";
import dayjs from "dayjs";
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
      : formatDMY(item.fecha_fin || item.fechaFin);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📄 Contrato {item.folio || item.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3" style={{ backgroundColor: "#f9fafb" }}>
            <div className="font-semibold mb-2" style={{ color: "#2c3e50" }}>📋 Información General</div>
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

          <div className="rounded-md border p-3" style={{ backgroundColor: "#f9fafb" }}>
            <div className="font-semibold mb-2" style={{ color: "#2c3e50" }}>📅 Vigencia</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Inicio:</span> {formatDMY(item.fecha_inicio || item.fechaInicio)}</div>
              <div><span className="text-muted-foreground">Fin:</span> {vigencia}</div>
            </div>
          </div>

          <div className="rounded-md border p-3" style={{ backgroundColor: "#f9fafb" }}>
            <div className="font-semibold mb-2" style={{ color: "#2c3e50" }}>💰 Compensación</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Salario:</span> {item.salario_base ?? item.salarioBase}</div>
              <div><span className="text-muted-foreground">Periodicidad:</span> {item.periodicidad_pago || item.periodicidadPago}</div>
              <div><span className="text-muted-foreground">Moneda:</span> {item.moneda}</div>
            </div>
          </div>

          <div className="rounded-md border p-3" style={{ backgroundColor: "#f9fafb" }}>
            <div className="font-semibold mb-2" style={{ color: "#2c3e50" }}>⏰ Jornada</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Tipo:</span> {item.tipo_jornada || item.tipoJornada}</div>
              <div><span className="text-muted-foreground">Horas semanales:</span> {item.horas_semanales ?? item.horasSemanales}</div>
              {item.horario ? (
                <div className="sm:col-span-2"><span className="text-muted-foreground">Horario:</span> {item.horario}</div>
              ) : null}
            </div>
          </div>

          {item.tipo_contrato !== "prestacion_servicios" ? (
            <div className="rounded-md border p-3" style={{ backgroundColor: "#f9fafb" }}>
              <div className="font-semibold mb-2" style={{ color: "#2c3e50" }}>🎁 Prestaciones</div>
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
            <div className="rounded-md border p-3" style={{ backgroundColor: "#f9fafb" }}>
              <div className="font-semibold mb-2" style={{ color: "#2c3e50" }}>📝 Notas</div>
              <div className="text-sm">{item.notas}</div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}


