// Fechas de calendario y horas del día: ÚNICO lugar de estas cuentas en el frontend. Probado en scripts/test-fecha-hora.mjs.
//
// - Las fechas son texto "YYYY-MM-DD" y se tratan como días de calendario (en UTC, sin zona horaria):
//   así sumar días nunca se corre por la zona del navegador.
// - Las horas del día son texto "HH:mm" o "HH:mm:ss" (como vienen de la base y de <input type="time">).
// - Lo que no se puede leer regresa null (nunca lanza error).
// - Mostrar una hora en 12 h es de hora12.mjs; mostrar duraciones es de asistencia/jornada.mjs.

export const DIA_MS = 86400000;

// "2026-11-13", "2026-11-13 08:00:00" o "2026-11-13T08:00" → "2026-11-13"; lo demás → null.
export function fechaISO(valor) {
  return /^(\d{4}-\d{2}-\d{2})/.exec(String(valor ?? ""))?.[1] ?? null;
}

// "2026-11-13" + 1 → "2026-11-14" (también negativos y cambio de mes/año).
export function sumarDias(fecha, dias) {
  const f = fechaISO(fecha);
  if (!f || !Number.isFinite(dias)) return null;
  return new Date(Date.parse(`${f}T00:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10);
}

// 0 = domingo … 6 = sábado.
export function diaSemana(fecha) {
  const f = fechaISO(fecha);
  return f ? new Date(`${f}T00:00:00Z`).getUTCDay() : null;
}

// Lunes de la semana legal (lunes–domingo) que contiene la fecha.
export function lunesDe(fecha) {
  const d = diaSemana(fecha);
  return d == null ? null : sumarDias(fecha, -((d + 6) % 7));
}

// Semana legal que contiene la fecha: { inicio: lunes, fin: domingo }.
export function semanaDe(fecha) {
  const inicio = lunesDe(fecha);
  return inicio ? { inicio, fin: sumarDias(inicio, 6) } : null;
}

// Fecha y hora → minutos desde época. Las marcas de la base vienen en la misma zona (la de la BD),
// así que la diferencia entre dos marcas es exacta (México no tiene horario de verano).
// Acepta "YYYY-MM-DD HH:mm[:ss]", ISO con zona ("…Z", "…-06:00") y Date. Ilegible → null.
export function marcaEnMinutos(valor) {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : Math.floor(valor.getTime() / 60000);
  const s = String(valor).trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : Math.floor(t / 60000);
  }
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})/.exec(s);
  return m ? minutosAbsolutos(m[1], m[2]) : null;
}

// Día "YYYY-MM-DD" + hora "HH:mm" → minutos desde época (misma escala que marcaEnMinutos). Ilegible → null.
export function minutosAbsolutos(fecha, hora) {
  const f = fechaISO(fecha);
  const h = horaAMinutos(hora);
  return f && h != null ? Date.parse(`${f}T00:00:00Z`) / 60000 + h : null;
}

// "08:30" / "8:30:00" → 510. Fuera de rango o ilegible → null.
export function horaAMinutos(hora) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hora ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h > 23 || min > 59 ? null : h * 60 + min;
}

// 510 → "08:30"; 1500 → "01:00" (da la vuelta al día). Para llenar <input type="time">.
export function minutosAHora(minutos) {
  if (!Number.isFinite(minutos)) return null;
  const m = ((Math.round(minutos) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// "8:30:00" → "08:30" (la hora sin segundos, siempre con dos dígitos). Ilegible → null.
export function hhmm(hora) {
  const m = horaAMinutos(hora);
  return m == null ? null : minutosAHora(m);
}

// Para comparar textos sin importar acentos ni mayúsculas: "Miércoles" → "miercoles".
export function sinAcentos(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}
