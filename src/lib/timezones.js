export const DEFAULT_COMPANY_TIMEZONE = "America/Mexico_City";

const PRIORITY_TIMEZONES = [
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Guayaquil",
  "America/Panama",
  "America/Caracas",
  "America/Santiago",
  "America/La_Paz",
  "America/Asuncion",
  "America/Argentina/Buenos_Aires",
  "America/Montevideo",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/Madrid",
  "Europe/London",
  "UTC",
];

function normalizeTimeZoneLabel(tz) {
  return String(tz || "").replaceAll("_", " ");
}

function getRuntimeTimeZones() {
  if (typeof Intl === "undefined" || typeof Intl.supportedValuesOf !== "function") {
    return [];
  }
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch (_e) {
    return [];
  }
}

export function getTimeZoneOptions() {
  const merged = new Set([...PRIORITY_TIMEZONES, ...getRuntimeTimeZones()]);
  return [...merged]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((tz) => ({
      value: tz,
      label: normalizeTimeZoneLabel(tz),
    }));
}

