export function formatDateDMY(input) {
  if (!input) return "";

  // Si es dayjs, convertir a Date
  if (typeof input === "object" && typeof input.toDate === "function") {
    input = input.toDate();
  }

  /**
   * Importante (zonas horarias):
   * - Cuando el backend manda fechas "YYYY-MM-DD" (sin hora), `new Date("YYYY-MM-DD")`
   *   se interpreta como UTC por el runtime.
   * - En zonas horarias negativas (ej. México), eso puede verse como "un día antes"
   *   al convertir a hora local.
   *
   * Solución:
   * - Si recibimos un string puro "YYYY-MM-DD", lo tratamos como fecha local
   *   construyendo "YYYY-MM-DDT00:00:00".
   *
   * Relación:
   * - Tabla Permisos: `src/app/panel/permisos/PermisosTable.jsx` usa `formatDateDMY`
   * - Modal "ojito": `src/app/panel/permisos/PermisoViewDialog.jsx` usa `formatDateDMY`
   * - Esto asegura que ambos muestren exactamente el mismo día.
   */
  const isYmd =
    typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.trim());
  const d =
    input instanceof Date
      ? input
      : isYmd
      ? new Date(`${input.trim()}T00:00:00`)
      : new Date(input);

  if (isNaN(d)) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formatea "YYYY-MM-DD" (u otra fecha) como DD/MM/YYYY.
 * Devuelve "N/A" cuando no hay valor o el valor ya es "N/A".
 * Implementación unificada de la función que estaba duplicada, byte a byte,
 * en 7 archivos del Panel de Empleado. Se conserva su comportamiento exacto.
 */
export function formatearFechaCorta(fechaISO) {
  if (!fechaISO || fechaISO === "N/A") return "N/A";

  try {
    const fecha = new Date(fechaISO + "T00:00:00");
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  } catch (e) {
    return fechaISO;
  }
}

// Formatea fecha y hora como dd/mm/aaaa HH:mm
// - Acepta Date, string o dayjs (objeto con .toDate())
export function formatDateDMYTime(input) {
  if (!input) return "";
  if (typeof input === "object" && typeof input.toDate === "function") {
    input = input.toDate();
  }
  // Misma regla de `formatDateDMY`: evitar desfase cuando llega "YYYY-MM-DD" sin hora.
  const isYmd =
    typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.trim());
  const d =
    input instanceof Date
      ? input
      : isYmd
      ? new Date(`${input.trim()}T00:00:00`)
      : new Date(input);
  if (isNaN(d)) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
