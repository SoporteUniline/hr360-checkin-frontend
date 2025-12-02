"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { formatDateDMY, formatDateDMYTime } from "@/lib/formatDate";
import styles from "./permisos-theme.module.css";
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Dialogo de vista de detalles para una solicitud de permiso.
 * Muestra todos los campos relevantes, incluyendo notas internas y quién aprobó/rechazó.
 */
export default function PermisoViewDialog({ open, setOpen, item }) {
  if (!item) return null;
  const di = item.fecha_inicio ? formatDateDMY(item.fecha_inicio) : "-";
  const df = item.fecha_fin ? formatDateDMY(item.fecha_fin) : "-";
  const created = item.marca_tiempo
    ? formatDateDMYTime(dayjs.tz(item.marca_tiempo, "America/Mexico_City"))
    : "-";
  const updated = item.fecha_actualizacion
    ? formatDateDMYTime(dayjs.tz(item.fecha_actualizacion, "America/Mexico_City"))
    : "-";
  // Cálculo del total de días del permiso.
  // Relación: este valor se muestra en este mismo modal; las fechas provienen
  // de la API de `solicitudes_permiso` preparada en `solicitudPermisoModel.js`.
  const startDate = item.fecha_inicio ? dayjs(item.fecha_inicio) : null;
  // Si no hay fecha_fin, se considera un solo día (inicio == fin)
  const endDate = item.fecha_fin ? dayjs(item.fecha_fin) : startDate;
  const totalDias =
    startDate && endDate
      ? Math.max(endDate.diff(startDate, "day") + 1, 1) // inclusivo
      : 0;

  function EstadoBadge({ estado }) {
    const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
    if (estado === "Pendiente") return <span className={base} style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Pendiente</span>;
    if (estado === "Aprobado") return <span className={base} style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>Aprobado</span>;
    if (estado === "Rechazado") return <span className={base} style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>Rechazado</span>;
    if (estado === "Cancelado") return <span className={base} style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>Cancelado</span>;
    return <span className={base} style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>{estado || "—"}</span>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Ajuste responsivo:
         - max-w-[95vw]: ocupa el 95% del ancho en móviles.
         - sm:max-w-2xl: respeta el ancho grande en pantallas mayores.
         - max-h-[85vh] overflow-y-auto: evita desbordes verticales y permite scroll.
         Relación: abierto desde `src/app/panel/permisos/page.jsx`. */}
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalles del permiso</span>
            <span className="text-sm text-muted-foreground">Folio #{String(item.id).padStart(3, "0")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-md border p-4" style={{ backgroundColor: "#f9fafb" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Empleado</div>
                <div className="font-medium">{item.empleado_nombre || `ID ${item.id_empleado}`}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Tipo de permiso</div>
                <div className="font-medium">{item.tipo_permiso_nombre}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fecha inicio</div>
                <div className="font-medium">{di}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fecha fin</div>
                <div className="font-medium">{df}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total de días</div>
                <div className="font-semibold" style={{ color: "#065f46" }}>{totalDias}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Estado</div>
                <div className="mt-0.5"><EstadoBadge estado={item.estado} /></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Solicitado</div>
                <div className="font-medium">{created}</div>
              </div>
            </div>
          </section>

          <section className="rounded-md border p-4 bg-white">
            <div className="text-xs text-muted-foreground mb-1">Motivo / Observaciones</div>
            <div className="whitespace-pre-wrap">{item.motivo || "—"}</div>
          </section>

          <section className="rounded-md border p-4 bg-white">
            <div className="text-xs text-muted-foreground mb-1">Nota interna</div>
            <div className="whitespace-pre-wrap">{item.notas || "—"}</div>
            <Separator className="my-3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Actualizado por</div>
                <div className="font-medium">
                  {item.actualizado_por_nombre || (item.actualizado_por ? `ID ${item.actualizado_por}` : "—")}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fecha actualización</div>
                <div className="font-medium">{updated}</div>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}


