import { cn } from "@/lib/utils";

/**
 * Tarjeta KPI compacta del Panel del Empleado.
 *
 * Fuente única: antes cada pestaña (General, Asistencias, Vacaciones,
 * Contratos, Permisos, Entradas/Salidas) redefinía este mismo bloque.
 *
 * @param {string} label  Etiqueta superior (se muestra en mayúsculas).
 * @param {*}      value  Valor destacado.
 * @param {boolean} nowrap  Evita el salto de línea del valor (útil para horas).
 */
export default function MiniKpi({ label, value, nowrap = false }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-gray-200 bg-white p-3">
      <div className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div
        className={cn(
          "text-lg font-extrabold tabular-nums text-gray-900",
          nowrap && "whitespace-nowrap",
        )}
      >
        {value}
      </div>
    </div>
  );
}
