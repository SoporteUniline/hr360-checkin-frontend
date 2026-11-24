// Cálculo único de horas de una asistencia, en MINUTOS ENTEROS.
// Lo usan Asistencias (escritorio y celular), Centro de incidencias y Reportes.
// Duraciones (formatearMinutos, duracionCorta) viven aquí; fechas y horas del día en ../fechaHora.mjs.
//
// Reglas de negocio. La comida no se paga en ningún caso (Adamia no maneja nómina).
// - Programadas = salida programada − entrada programada (+24 h si cruza medianoche)
//   − comida del horario (salida → regreso de comida). Sin comida en el horario: `hrs_comida`.
// - Trabajadas = SUMA de los tramos checados en el reloj (entrada → salida); los huecos
//   entre tramos son descanso y no cuentan. Lo calcula el backend (`minutos_trabajados_checadas`).
// - Si no marcó salida a comer (un solo tramo) NO se descuenta nada; la vista muestra la
//   alerta «No marcó salida a comer» (ver `sinSalidaAComer`).
// - Sin tramos del backend, o si la entrada/salida se editaron y ya no coinciden con los
//   tramos: salida − entrada, sin descontar comida.
// - Si falta entrada o salida, trabajadas y diferencia quedan en null (no se inventan).

import { horaAMinutos, marcaEnMinutos } from "../fechaHora.mjs";

const MIN_DIA = 24 * 60;

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

// Alerta: su horario tiene comida pero solo checó un tramo (no marcó salida a comer). Si está en comida o ya
// regresó no hay alerta: mientras come solo existe el tramo de la mañana.
export function sinSalidaAComer(registro) {
  if (registro?.comida_checada?.salida) return false;
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
export function formatearMinutos(valor, { signo = false } = {}) {
  // Acepta también números que llegan como texto ("540"); vacío o ilegible → "—".
  const minutos = valor == null || valor === "" ? NaN : Number(valor);
  if (!Number.isFinite(minutos)) return "—";
  const negativo = minutos < 0;
  const abs = Math.abs(Math.round(minutos));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const texto = h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
  if (negativo) return `−${texto}`;
  return signo && abs > 0 ? `+${texto}` : texto;
}

// Duración compacta para celdas de tabla: 570 → "9:30", −45 → "−0:45", 0 o vacío → "—" (o `cero`).
export function duracionCorta(minutos, { cero = "—" } = {}) {
  const m = Math.round(Number(minutos) || 0);
  if (!m) return cero;
  const abs = Math.abs(m);
  return `${m < 0 ? "−" : ""}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

// Para capturar horas: ¿la salida cae al día siguiente de la entrada?
// Entrada 22:00 y salida 05:00 → sí. Misma hora o salida menor → día siguiente.
export function salidaEsDiaSiguiente(horaEntrada, horaSalida) {
  const e = horaAMinutos(horaEntrada);
  const s = horaAMinutos(horaSalida);
  return e != null && s != null && s <= e;
}

