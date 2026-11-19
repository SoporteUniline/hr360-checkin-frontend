// Cálculo único de horas de una asistencia, en MINUTOS ENTEROS.
// Lo usan Asistencias (escritorio y celular), Centro de incidencias y Reportes.
// Sin dependencias para poder probarlo con node:test.
//
// Reglas del dueño (18/11/2026). La comida no se paga en ningún caso (Adamia no maneja nómina).
// - Programadas = salida programada − entrada programada (+24 h si cruza medianoche)
//   − comida del horario (salida → regreso de comida). Sin comida en el horario: `hrs_comida`.
// - Trabajadas = SUMA de los tramos checados en el reloj (entrada → salida); los huecos
//   entre tramos son descanso y no cuentan. Lo calcula el backend (`minutos_trabajados_checadas`).
// - Si no marcó salida a comer (un solo tramo) NO se descuenta nada; la vista muestra la
//   alerta «No marcó salida a comer» (ver `sinSalidaAComer`).
// - Sin tramos del backend, o si la entrada/salida se editaron y ya no coinciden con los
//   tramos: salida − entrada, sin descontar comida.
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

// Comida del horario de ese día (salida → regreso de comida); null si el horario no la tiene.
export function minutosComidaHorario(registro) {
  const sale = horaAMinutos(registro?.hora_salida_comida_programada);
  const regresa = horaAMinutos(registro?.hora_regreso_comida_programada);
  if (sale == null || regresa == null) return null;
  const tramo = regresa - sale;
  return tramo > 0 ? tramo : null;
}

// Comida que se descuenta de lo PROGRAMADO: la del horario; si no tiene, `hrs_comida`.
export function minutosComida(registro) {
  const horario = minutosComidaHorario(registro);
  if (horario != null) return horario;
  const horas = Number(registro?.hrs_comida);
  return Number.isFinite(horas) && horas > 0 ? Math.round(horas * 60) : 0;
}

// Tramos del reloj que siguen correspondiendo a la entrada y salida de la asistencia.
function tramosVigentes(registro) {
  const tramos = Array.isArray(registro?.tramos_checadas) ? registro.tramos_checadas : null;
  if (!tramos?.length || !Number.isFinite(Number(registro?.minutos_trabajados_checadas))) return null;
  const primera = marcaEnMinutos(tramos[0].entrada);
  const ultima = marcaEnMinutos(tramos[tramos.length - 1].salida);
  if (primera !== marcaEnMinutos(registro.entrada) || ultima !== marcaEnMinutos(registro.salida)) return null;
  return tramos;
}

// Alerta: su horario tiene comida pero solo checó un tramo (no marcó salida a comer).
export function sinSalidaAComer(registro) {
  const tramos = tramosVigentes(registro);
  return Boolean(tramos && tramos.length === 1 && minutosComidaHorario(registro));
}

// Descanso tomado entre tramos (null si no hay tramos del reloj).
export function minutosDescanso(registro) {
  return tramosVigentes(registro) ? Number(registro.minutos_descanso_checadas) || 0 : null;
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
  if (tramosVigentes(registro)) return Number(registro.minutos_trabajados_checadas);
  const entrada = marcaEnMinutos(registro?.entrada);
  const salida = marcaEnMinutos(registro?.salida);
  if (entrada == null || salida == null) return null;
  let tramo = salida - entrada;
  // Registros anteriores a esta corrección guardaban la salida nocturna con la fecha de entrada.
  if (tramo < 0 && tramo > -MIN_DIA) tramo += MIN_DIA;
  if (tramo <= 0 || tramo > MIN_DIA) return null;
  return tramo;
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
