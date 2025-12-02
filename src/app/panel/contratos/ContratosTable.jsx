"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import { Eye } from "lucide-react";
import styles from "./contratos-theme.module.css";

function formatDMY(value) {
  if (!value) return "";
  const d = dayjs(value, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY/MM/DD"], true);
  return d.isValid() ? d.format("DD/MM/YYYY") : String(value);
}

function diasRestantes(fechaFin) {
  if (!fechaFin) return null;
  const fin = dayjs(fechaFin, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
  if (!fin.isValid()) return null;
  const diff = fin.startOf("day").diff(dayjs().startOf("day"), "day");
  return diff;
}

function alertaVigencia(fechaFin) {
  const d = diasRestantes(fechaFin);
  if (d === null) return <span className="text-xs text-muted-foreground">Sin fecha de término</span>;
  if (d < 0) return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles.hrPulse2s}`} style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>VENCIDO</span>;
  if (d === 0) return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles.hrPulse2s}`} style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>VENCE HOY</span>;
  if (d <= 7) return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles.hrPulse2s}`} style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>{d} días</span>;
  if (d <= 15) return <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: "#fed7aa", color: "#9a3412" }}>{d} días</span>;
  if (d <= 30) return <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: "#fef3c7", color: "#78350f" }}>{d} días</span>;
  return <span className="text-xs text-muted-foreground">{d} días</span>;
}

function badgeTipo(tipo) {
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

function badgeEstatus(estatus) {
  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
  const val = (estatus || "").toLowerCase();
  if (val === "activo") return <span className={base} style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>Activo</span>;
  if (val === "suspendido") return <span className={base} style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Suspendido</span>;
  if (val === "terminado") return <span className={base} style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>Terminado</span>;
  if (val === "cancelado") return <span className={base} style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>Cancelado</span>;
  return <span className={base} style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>{estatus}</span>;
}

/**
 * Tabla de Contratos.
 * - Con badges de tipo/estatus y alerta de vigencia (similar a Vacaciones.html)
 */
export default function ContratosTable({ items = [], loading, onEdit, onDelete, onDuplicate, onView }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Cargando contratos…</CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">No hay contratos registrados</CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full border-collapse">
        <thead className="bg-slate-50 border-b">
          <tr className="text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Folio</th>
            <th className="px-3 py-2">Empleado</th>
            <th className="px-3 py-2">Puesto</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Inicio</th>
            <th className="px-3 py-2">Vigencia</th>
            <th className="px-3 py-2">Estatus</th>
            <th className="px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const vigenciaNodo = c.tipo_contrato === "indefinido" || !c.fecha_fin ? (
              <span className="text-xs text-muted-foreground">Sin fecha de término</span>
            ) : (
              <div className="flex flex-col gap-1">
                <span>{formatDMY(c.fecha_fin)}</span>
                {alertaVigencia(c.fecha_fin)}
              </div>
            );
            return (
              <tr key={`ctr-${c.id || c.folio}`} className="border-b hover:bg-slate-50">
                <td className="px-3 py-2 font-semibold">{c.folio || c.id}</td>
                <td className="px-3 py-2">
                  <div>{c.nombre_empleado || c.empleado_nombre || c.nombreEmpleado}</div>
                  <div className="text-xs text-muted-foreground">{c.empresa || c.empresa_nombre}</div>
                </td>
                <td className="px-3 py-2">{c.puesto}</td>
                <td className="px-3 py-2">{badgeTipo(c.tipo_contrato || c.tipoContrato)}</td>
                <td className="px-3 py-2">{formatDMY(c.fecha_inicio || c.fechaInicio)}</td>
                <td className="px-3 py-2">{vigenciaNodo}</td>
                <td className="px-3 py-2">{badgeEstatus(c.estatus)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]"
                      onClick={() => onView?.(c)}
                      title="Ver"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="border-[#93c5fd] text-[#2563eb] hover:bg-[#dbeafe] hover:text-[#1e40af]" onClick={() => onEdit?.(c)}>Editar</Button>
                    <Button size="sm" variant="outline" className="border-[#86efac] text-[#10b981] hover:bg-[#d1fae5]" onClick={() => onDuplicate?.(c)}>📋 Duplicar</Button>
                    <Button size="sm" variant="outline" className="border-[#fca5a5] text-[#dc2626] hover:bg-[#fee2e2]" onClick={() => onDelete?.(c)}>Eliminar</Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


