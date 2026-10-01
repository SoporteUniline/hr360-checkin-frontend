// Fechas civiles: no convertir una fecha de vacaciones a la zona horaria del navegador.
export const isoDate = (value) => {
  const text = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T12:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === text
    ? text
    : null;
};
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const isVacation = (row) =>
  Number(row.descuenta_vacaciones) === 1 ||
  normalize(row.tipo_permiso_nombre).includes("vacacion");
export const isPending = (row) => normalize(row.estado) === "pendiente";
export const isApproved = (row) => normalize(row.estado) === "aprobado";
export const isCalendarRequest = (row) =>
  isVacation(row) && (isPending(row) || isApproved(row));
export const addDays = (value, days) => {
  const date = new Date(`${isoDate(value)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
export const formatDate = (value, options = {}) =>
  isoDate(value)
    ? new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
        ...options,
      }).format(new Date(`${isoDate(value)}T12:00:00Z`))
    : "No informado";
export const formatRange = (row) =>
  `${formatDate(row.fecha_inicio)} – ${formatDate(row.fecha_fin || row.fecha_inicio)}`;
export const employeeName = (person) =>
  person.nombre_completo ||
  person.empleado_nombre ||
  [person.nombre, person.apellido_paterno, person.apellido_materno]
    .filter(Boolean)
    .join(" ") ||
  `Colaborador ${person.id_empleado}`;
export const numberOrNull = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value))
    ? Number(value)
    : null;
export const monthKey = (year, month) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;
export function monthCells(year, month) {
  const first = `${monthKey(year, month)}-01`;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  const start = addDays(first, -((weekday + 6) % 7));
  const end = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const count = Math.ceil((((weekday + 6) % 7) + end) / 7) * 7;
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}
export function overlaps(row, from, to) {
  const start = isoDate(row.fecha_inicio),
    end = isoDate(row.fecha_fin || row.fecha_inicio);
  return Boolean(start && end && start <= to && end >= from);
}
export function nextWorkday(row, holidays, holidaysAvailable = true) {
  if (
    !holidaysAvailable ||
    !row.dias_trabajo ||
    !isoDate(row.fecha_fin || row.fecha_inicio)
  )
    return null;
  const weekdays = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];
  const working = new Set(
    String(row.dias_trabajo)
      .split(",")
      .map(normalize)
      .filter((day) => weekdays.includes(day)),
  );
  if (!working.size) return null;
  const excluded = new Set(holidays);
  for (let i = 1; i <= 370; i++) {
    const day = addDays(row.fecha_fin || row.fecha_inicio, i);
    if (
      working.has(weekdays[new Date(`${day}T12:00:00Z`).getUTCDay()]) &&
      !excluded.has(day)
    )
      return day;
  }
  return null;
}
export function lastVacation(rows, employeeId, today, excludedId) {
  return (
    rows
      .filter(
        (row) =>
          String(row.id_empleado) === String(employeeId) &&
          String(row.id) !== String(excludedId) &&
          isVacation(row) &&
          isApproved(row) &&
          isoDate(row.fecha_fin) &&
          row.fecha_fin < today,
      )
      .sort((a, b) => b.fecha_fin.localeCompare(a.fecha_fin))[0] || null
  );
}
export function canReview(employee, requesterId, row) {
  if (String(employee.id_empleado) === String(requesterId)) return false;
  const authorizer = isVacation(row)
    ? employee.id_autoriza_vacaciones
    : employee.id_autoriza_permisos;
  return Boolean(authorizer && String(authorizer) === String(requesterId));
}
export function csvText(rows) {
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return "\ufeff" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
