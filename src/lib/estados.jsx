import { cn } from "@/lib/utils";

/**
 * Fuente ÚNICA de estilos por estado en toda la app.
 *
 * Homologa el color de los estados que hoy cada módulo redefine a mano
 * (permisos: EstadoBadge; asistencia: EstadoPill; contratos: badgeEstatus x2;
 * empleados: estado Activo/Baja; vacaciones: aprobado/planeado/…).
 *
 * Uso:
 *   import { EstadoBadge, estiloEstado } from "@/lib/estados";
 *   <EstadoBadge estado="Aprobado" />
 *   const { bg, text, dot } = estiloEstado(registro.estado);
 */

// Semántica -> clases Tailwind. Un solo lugar para ajustar la paleta.
const OK = { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500", solid: "bg-emerald-600" };
const WARN = { bg: "bg-amber-100", text: "text-amber-900", dot: "bg-amber-500", solid: "bg-amber-500" };
const INFO = { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500", solid: "bg-blue-600" };
const PLAN = { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-500", solid: "bg-violet-600" };
const BAD = { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500", solid: "bg-rose-600" };
const NEUTRAL = { bg: "bg-zinc-200", text: "text-zinc-700", dot: "bg-zinc-500", solid: "bg-zinc-500" };
const DEFAULT = { bg: "bg-zinc-100", text: "text-zinc-600", dot: "bg-zinc-400", solid: "bg-zinc-400" };

// Se indexa por el texto del estado normalizado (case-insensitive).
export const ESTILO_ESTADO = {
  // Solicitudes / permisos / vacaciones
  aprobado: OK,
  pendiente: WARN,
  solicitado: WARN,
  planeado: PLAN,
  rechazado: BAD,
  cancelado: NEUTRAL,
  // Asistencia
  presente: OK,
  tardanza: WARN,
  retardo: WARN,
  permiso: INFO,
  ausente: BAD,
  // Contratos
  activo: OK,
  suspendido: WARN,
  terminado: NEUTRAL,
  // Empleados
  baja: NEUTRAL,
  inactivo: NEUTRAL,
  vacante: NEUTRAL,
};

export function estiloEstado(estado) {
  const key = String(estado || "").trim().toLowerCase();
  return ESTILO_ESTADO[key] || DEFAULT;
}

/**
 * Badge redondeado con punto de color. Estilo homologado de la app.
 */
export function EstadoBadge({ estado, className }) {
  const e = estiloEstado(estado);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        e.bg,
        e.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", e.dot)} />
      {estado || "—"}
    </span>
  );
}

// Alias por compatibilidad con nombres previos (asistencia usaba "EstadoPill").
export const EstadoPill = EstadoBadge;
