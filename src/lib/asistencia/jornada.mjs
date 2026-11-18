// Cálculo único de horas de una asistencia, en MINUTOS ENTEROS.
// Lo usan Asistencias (escritorio y celular), Centro de incidencias y Reportes.
// Sin dependencias para poder probarlo con node:test.
//
// Reglas:
// - Programadas = salida programada − entrada programada (+24 h si cruza medianoche) − comida.
// - Trabajadas  = salida real − entrada real − comida (la comida nunca resta más que lo trabajado).
// - `hrs_comida` es el tiempo de comida NO pagado; se descuenta en ambos lados para que
//   un día completo dé diferencia 0 (antes solo se restaba en trabajadas: −1 h diario).
// - Si falta entrada o salida, trabajadas y diferencia quedan en null (no se inventan).

const MIN_DIA = 24 * 60;

// "08:30", "08:30:00" → 510
export function horaAMinutos(hora) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hora ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// Fecha y hora → minutos desde época. Ambas marcas vienen en la misma zona (la de la BD),
// así que la diferencia entre dos marcas es exacta (México no tiene horario de verano).
function marcaEnMinutos(valor) {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : Math.floor(valor.getTime() / 60000);
  const s = String(valor).trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : Math.floor(t / 60000);
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000);
}

export function minutosComida(registro) {
  const horas = Number(registro?.hrs_comida);
  return Number.isFinite(horas) && horas > 0 ? Math.round(horas * 60) : 0;
}

export function minutosProgramados(registro) {
  const entrada = horaAMinutos(registro?.hora_entrada_programada);
  const salida = horaAMinutos(registro?.hora_salida_programada);
  if (entrada == null || salida == null) return null;
  let tramo = salida - entrada;
  if (tramo <= 0) tramo += MIN_DIA; // turno nocturno: 22:00 → 05:00
  return Math.max(0, tramo - minutosComida(registro));
}

export function minutosTrabajados(registro) {
  const entrada = marcaEnMinutos(registro?.entrada);
  const salida = marcaEnMinutos(registro?.salida);
  if (entrada == null || salida == null) return null;
  let tramo = salida - entrada;
  // Registros anteriores a esta corrección guardaban la salida nocturna con la fecha de entrada.
  if (tramo < 0 && tramo > -MIN_DIA) tramo += MIN_DIA;
  if (tramo <= 0 || tramo > MIN_DIA) return null;
  return tramo - Math.min(minutosComida(registro), tramo);
}

export function resumenJornada(registro) {
  const programados = minutosProgramados(registro);
  const trabajados = minutosTrabajados(registro);
  const diferencia = programados != null && trabajados != null ? trabajados - programados : null;
  return {
    minutosProgramados: programados,
    minutosTrabajados: trabajados,
    minutosDiferencia: diferencia,
    jornada: programados != null
      ? `${formatearMinutos(trabajados)} / ${formatearMinutos(programados)}`
      : "-",
  };
}

// 510 → "8 h 30 min" · 480 → "8 h" · 45 → "45 min" · null → "—"
// signo: true → "+10 min" / "−10 min" (con signo menos tipográfico).
export function formatearMinutos(minutos, { signo = false } = {}) {
  if (minutos == null || !Number.isFinite(minutos)) return "—";
  const negativo = minutos < 0;
  const abs = Math.abs(Math.round(minutos));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const texto = h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
  if (negativo) return `−${texto}`;
  return signo && abs > 0 ? `+${texto}` : texto;
}

// Para capturar horas: ¿la salida cae al día siguiente de la entrada?
// Entrada 22:00 y salida 05:00 → sí. Misma hora o salida menor → día siguiente.
export function salidaEsDiaSiguiente(horaEntrada, horaSalida) {
  const e = horaAMinutos(horaEntrada);
  const s = horaAMinutos(horaSalida);
  return e != null && s != null && s <= e;
}

// "2026-11-13" + 1 → "2026-11-14" (sin zonas horarias: solo calendario).
export function sumarDias(fecha, dias) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fecha ?? ""));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + dias));
  return d.toISOString().slice(0, 10);
}
