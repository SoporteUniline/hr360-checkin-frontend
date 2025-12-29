import dayjs from "dayjs";

/**
 * Calcula días "totales" y "hábiles" de un permiso en un rango inclusivo.
 *
 * Definición de negocio ACTUAL (consistencia del proyecto):
 * - "Totales": días naturales en rango (incluye inicio y fin).
 * - "Hábiles": excluye DOMINGOS y días FESTIVOS de la empresa (según `festivosSet`).
 *
 * Importante:
 * - NO excluye sábados, porque el módulo de Permisos y el calendario actualmente
 *   consideran sábado como día laboral (ver `src/app/panel/permisos/page.jsx`,
 *   y la lógica previa en `src/app/panel/permisos/PermisosTable.jsx`).
 *
 * Relación:
 * - UI tabla: `src/app/panel/permisos/PermisosTable.jsx` (nueva columna Tot/Háb).
 * - PDF: `src/app/panel/permisos/PermisoViewDialog.jsx` (se imprime en el documento).
 *
 * @param {object} params
 * @param {string|Date|dayjs.Dayjs|null} params.fechaInicio
 * @param {string|Date|dayjs.Dayjs|null} params.fechaFin
 * @param {Set<string>} params.festivosSet - Set de fechas "YYYY-MM-DD" (festivos de la empresa)
 * @returns {{ diasTotales: number, diasHabiles: number }}
 */
export function calcDiasTotalesYHabiles({ fechaInicio, fechaFin, festivosSet = new Set() }) {
  // Si no hay fechaInicio, no hay rango posible.
  if (!fechaInicio) return { diasTotales: 0, diasHabiles: 0 };

  // Normalizar fechas (si no hay fechaFin, se asume un solo día).
  const start = dayjs(fechaInicio);
  const end = fechaFin ? dayjs(fechaFin) : start;

  // Días naturales (rango inclusivo).
  const diasTotales = Math.max(1, end.diff(start, "day") + 1);

  // Días hábiles (rango inclusivo): excluye domingo + festivo.
  let diasHabiles = 0;
  for (
    let d = start.startOf("day");
    d.isBefore(end.endOf("day")) || d.isSame(end, "day");
    d = d.add(1, "day")
  ) {
    const esDomingo = d.day() === 0;
    const esFestivo = festivosSet?.has(d.format("YYYY-MM-DD"));
    if (!esDomingo && !esFestivo) diasHabiles++;
  }
  diasHabiles = Math.max(1, diasHabiles);

  return { diasTotales, diasHabiles };
}


