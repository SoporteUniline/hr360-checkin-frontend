/**
 * Helpers de formato del Dashboard de RH.
 * Extraídos del server component original para reutilizarlos en los bloques cliente.
 */

const MONTHS_SHORT_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function parseYMD(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

/** "JUL." — mes corto en mayúsculas para las tarjetas de eventos. */
export function monthShortUpperMX(dateStr) {
  const parts = parseYMD(dateStr);
  if (!parts) return "";
  const idx = Math.min(Math.max(parts.m - 1, 0), 11);
  return (MONTHS_SHORT_ES[idx] || "").slice(0, 3).toUpperCase() + ".";
}

/** "08 de jul" */
export function fmtDayMonthDeMX(dateStr) {
  const parts = parseYMD(dateStr);
  if (!parts) return "";
  const day = String(parts.d).padStart(2, "0");
  const mon = (MONTHS_SHORT_ES[parts.m - 1] || "").toLowerCase();
  return `${day} de ${mon}`;
}

/** "14/07/2026" a partir de "YYYY-MM-DD..." o Date. */
export function formatDateDMY(ymd) {
  if (!ymd) return "-";
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try {
    const d = new Date(ymd);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yy = d.getUTCFullYear();
    return `${dd}/${mm}/${yy}`;
  } catch {
    return String(ymd);
  }
}

/** Hora "HH:mm" en zona de México, tolerante a distintos formatos del backend. */
export function formatTimeMexico(datetimeStr) {
  if (!datetimeStr) return "-";
  const hasTZ = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(datetimeStr);
  if (hasTZ) {
    try {
      const d = new Date(datetimeStr);
      return d.toLocaleTimeString("es-MX", {
        timeZone: "America/Mexico_City",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {}
  }
  const m = String(datetimeStr).match(/(\d{2}:\d{2})/);
  if (m) return m[1];
  try {
    const d = new Date(datetimeStr);
    return d.toLocaleTimeString("es-MX", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_) {
    return "-";
  }
}

/** Años de servicio a partir de la fecha de ingreso. */
export function getServiceYears(fechaIngreso) {
  if (!fechaIngreso) return 0;
  const ingreso = new Date(`${String(fechaIngreso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(ingreso.getTime())) return 0;
  const today = new Date();
  let years = today.getUTCFullYear() - ingreso.getUTCFullYear();
  const hasAnniversaryThisYear =
    today.getUTCMonth() > ingreso.getUTCMonth() ||
    (today.getUTCMonth() === ingreso.getUTCMonth() &&
      today.getUTCDate() >= ingreso.getUTCDate());
  if (!hasAnniversaryThisYear) years -= 1;
  return Math.max(years, 0);
}
