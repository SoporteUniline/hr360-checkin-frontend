import dayjs from "dayjs";

/**
 * Presets de periodo para el Dashboard de RH.
 * - Cada preset se traduce a un rango { fechaInicio, fechaFin } en formato "YYYY-MM-DD".
 * - El rango viaja al backend como query params y también se usa para calcular el
 *   periodo anterior (comparativo de KPIs).
 */
export const PRESETS = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "mes", label: "Mes" },
  { key: "custom", label: "Personalizado" },
];

export function rangeFromPreset(preset, custom = {}) {
  const hoy = dayjs();
  const fmt = (d) => d.format("YYYY-MM-DD");

  switch (preset) {
    case "hoy":
      return { fechaInicio: fmt(hoy), fechaFin: fmt(hoy) };
    case "7d":
      return { fechaInicio: fmt(hoy.subtract(6, "day")), fechaFin: fmt(hoy) };
    case "30d":
      return { fechaInicio: fmt(hoy.subtract(29, "day")), fechaFin: fmt(hoy) };
    case "mes":
      return { fechaInicio: fmt(hoy.startOf("month")), fechaFin: fmt(hoy) };
    case "custom":
      return {
        fechaInicio: custom.fechaInicio || fmt(hoy),
        fechaFin: custom.fechaFin || fmt(hoy),
      };
    default:
      return { fechaInicio: fmt(hoy.subtract(6, "day")), fechaFin: fmt(hoy) };
  }
}

/**
 * Rango del periodo inmediatamente anterior, de la misma longitud.
 * Ej: si el rango es 08–14 (7 días), el anterior es 01–07.
 * Se envía al backend como `fechaInicioPrev` / `fechaFinPrev` para el comparativo.
 */
export function previousRange({ fechaInicio, fechaFin }) {
  const inicio = dayjs(fechaInicio);
  const fin = dayjs(fechaFin);
  const dias = fin.diff(inicio, "day") + 1;
  return {
    fechaInicioPrev: inicio.subtract(dias, "day").format("YYYY-MM-DD"),
    fechaFinPrev: fin.subtract(dias, "day").format("YYYY-MM-DD"),
  };
}

/** Etiqueta legible de un rango: "08 – 14 jul 2026". */
export function labelRange({ fechaInicio, fechaFin }) {
  if (!fechaInicio) return "";
  const a = dayjs(fechaInicio);
  const b = dayjs(fechaFin || fechaInicio);
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  if (a.isSame(b, "day")) {
    return `${a.date()} ${meses[a.month()]} ${a.year()}`;
  }
  const mismoMes = a.month() === b.month() && a.year() === b.year();
  if (mismoMes) {
    return `${a.date()} – ${b.date()} ${meses[b.month()]} ${b.year()}`;
  }
  return `${a.date()} ${meses[a.month()]} – ${b.date()} ${meses[b.month()]} ${b.year()}`;
}

/** Construye un query string omitiendo valores vacíos / "all". */
export function buildQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || v === "all") return;
    usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}
