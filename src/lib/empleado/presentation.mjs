import { isoDate, addDays, normalize, formatDate, nextWorkday, isVacation } from '../solicitudes-equipo/model.mjs';

export function periodRange(anchor, period) {
  const day = isoDate(anchor);
  if (!day) return null;
  const date = new Date(`${day}T12:00:00Z`);
  const year = date.getUTCFullYear(), month = date.getUTCMonth();
  if (period === 'year') return { from: `${year}-01-01`, to: `${year}-12-31` };
  if (period === 'month') return { from: `${day.slice(0, 7)}-01`, to: new Date(Date.UTC(year, month + 1, 0, 12)).toISOString().slice(0, 10) };
  const from = addDays(day, -((date.getUTCDay() + 6) % 7));
  return { from, to: addDays(from, 6) };
}
export function movePeriod(anchor, period, direction) {
  const range = periodRange(anchor, period);
  if (!range) return anchor;
  return direction > 0 ? addDays(range.to, 1) : addDays(range.from, -1);
}
export function attendanceStatus(row) {
  const status = normalize(row.estado_asistencia || row.estado);
  if (['ausente', 'falta'].includes(status)) return 'Ausente';
  if (['tardanza', 'retardo'].includes(status)) return 'Tardanza';
  if (['presente', 'completo', 'a tiempo'].includes(status)) return 'Presente';
  return 'Sin clasificar';
}
// Keep clock state separate from attendance status. Never infer absences from missing punches.
export function attendanceRows(detail) {
  const punches = detail?.entradas_salidas?.registros || [];
  const attendance = detail?.asistencias?.historial;
  if (!Array.isArray(attendance)) return punches.map(row => ({ ...row, attendanceStatus: attendanceStatus(row) }));
  const byDate = new Map();
  for (const row of attendance) {
    const date = isoDate(row.fecha);
    if (!date) continue;
    const list = byDate.get(date) || []; list.push(row); byDate.set(date, list);
  }
  const result = punches.map(row => {
    const matches = byDate.get(isoDate(row.fecha)) || [];
    const statuses = [...new Set(matches.map(attendanceStatus))];
    return { ...row, attendanceStatus: statuses.length === 1 ? statuses[0] : 'Sin clasificar', attendanceDetails: matches };
  });
  const punchDates = new Set(punches.map(row => isoDate(row.fecha)));
  for (const row of attendance) if (!punchDates.has(isoDate(row.fecha))) result.push({ ...row, attendanceStatus: attendanceStatus(row) });
  return result;
}
// Compact Spanish labels keep real dates readable in narrow request cards.
export function compactRequestDate(value, { year = true, month = true } = {}) {
  const date = isoDate(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).formatToParts(new Date(`${date}T12:00:00Z`));
  const part = type => parts.find(item => item.type === type)?.value.replace(/\./g, '') || '';
  const weekday = part('weekday');
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${part('day')}${month ? ` ${part('month')}` : ''}${year ? ` ${part('year')}` : ''}`;
}
export function requestDates(row, holidays = null) {
  const from = isoDate(row.fecha_inicio), to = isoDate(row.fecha_fin || row.fecha_inicio);
  if (!from || !to || to < from) return { range: 'Fechas no disponibles', duration: null, back: null };
  const range = from === to ? compactRequestDate(from) : `${compactRequestDate(from, { year: from.slice(0,4) !== to.slice(0,4), month: from.slice(0,7) !== to.slice(0,7) })} – ${compactRequestDate(to)}`;
  const days = Math.round((new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / 86400000) + 1;
  const weekdays = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  const working = new Set(String(row.dias_trabajo || '').split(',').map(normalize).filter(day => weekdays.includes(day)));
  let count = days, business = false;
  if (isVacation(row) && working.size && holidays !== null && days <= 3660) {
    business = true; count = 0;
    const excluded = new Set(holidays);
    for (let i = 0; i < days; i++) {
      const day = addDays(from, i);
      if (working.has(weekdays[new Date(`${day}T12:00:00Z`).getUTCDay()]) && !excluded.has(day)) count++;
    }
  }
  const duration = `${count} ${count === 1 ? 'día' : 'días'} ${business ? (count === 1 ? 'hábil' : 'hábiles') : 'naturales'}`;
  const back = isVacation(row) && normalize(row.estado) === 'aprobado' && working.size && holidays !== null ? nextWorkday(row, holidays, true) : null;
  return { range, duration, back: back ? compactRequestDate(back, { year: back.slice(0,4) !== to.slice(0,4) }) : null };
}
export async function fetchAllRequests(fetcher, employeeId) {
  const rows = [], ids = new Set();
  for (let page = 1; page <= 200; page++) {
    const response = await fetcher(`/checador/solicitudes-permiso/empleado/${employeeId}?page=${page}&limit=100`);
    const batch = Array.isArray(response?.results) ? response.results : response?.results?.data;
    if (!Array.isArray(batch)) throw new Error('Respuesta de solicitudes inválida');
    let added = 0;
    for (const row of batch) if (!ids.has(String(row.id))) { ids.add(String(row.id)); rows.push(row); added++; }
    const total = response.total == null ? null : Number(response.total);
    if (total !== null && rows.length >= total) return rows;
    if (!batch.length && total === null) return rows;
    if (!added) throw new Error('No se pudo completar el historial de solicitudes');
  }
  throw new Error('El historial es demasiado grande para cargarlo completo');
}
