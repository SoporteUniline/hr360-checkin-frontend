// Horas extra de una asistencia: cuánto trabajó de más, en qué estado está la autorización
// y qué campos se guardan en cada acción. Se prueba con node:test (scripts/test-horas-extra.mjs).
//
// Reglas:
// - Cuenta como hora extra TODO lo trabajado por encima de lo
//   programado (mismo número que «Balance del día»): quedarse después de la salida, llegar antes
//   y no checar la salida a comer. Desde UMBRAL_MINUTOS. La empresa decide o corrige.
// - Estados: "pendiente" (hay tiempo de más sin decidir), "autorizada" (hrs_extra = 1),
//   "no_autorizada" (constancia «No autorizadas por …» en notas_hrs_extra) y "sin".
// - "reposicion": autorizada con forma FORMA_REPOSICION. Ese tiempo
//   cubre horas que el empleado debía (cuenta de horas): NO es hora extra ni suma a dobles/triples.
// - No autorizar NO borra la checada: si salió después de su horario, la salida pagada pasa a la del
//   horario (el backend guarda la original en valores_originales); en todos los casos queda la
//   constancia legible en notas_hrs_extra (quién y hora del reloj).

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { leerOriginales } from "./cambios.mjs";
import { minutosProgramados, minutosTrabajados } from "./jornada.mjs";
import { fechaISO, hhmm, horaAMinutos } from "../fechaHora.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DB_TZ = "America/Mexico_City";
export const UMBRAL_MINUTOS = 15;
export const FORMA_PAGO_DEFAULT = "Pago de horas extras";
export const FORMA_REPOSICION = "Reposición de tiempo por tiempo";
export const FORMAS_PAGO = [
  "Pago de horas extras",
  "Tiempo por tiempo",
  FORMA_REPOSICION,
  "Descuento sobre nómina",
];
export const ETIQUETAS_ESTADO = {
  pendiente: "Por autorizar",
  autorizada: "Autorizadas",
  no_autorizada: "No autorizadas",
  reposicion: "Reposición",
  sin: "Sin horas extra",
};

const PREFIJO_NO = "No autorizadas";
const FORMATO_BD = "YYYY-MM-DD HH:mm:ss";


// Salida del horario en la zona del empleado (dayjs) o null si no hay horario.
export function salidaProgramada(registro, zona = DB_TZ) {
  const fecha = fechaISO(registro?.fecha);
  const sale = hhmm(registro?.hora_salida_programada);
  const entra = hhmm(registro?.hora_entrada_programada);
  if (!fecha || !sale) return null;
  // Turno nocturno (22:00 → 06:00): la salida del horario es al día siguiente.
  const dia = entra && horaAMinutos(sale) <= horaAMinutos(entra)
    ? dayjs.utc(fecha).add(1, "day").format("YYYY-MM-DD")
    : fecha;
  const d = dayjs.tz(`${dia} ${sale}`, zona || DB_TZ);
  return d.isValid() ? d : null;
}

// Minutos entre la salida del horario y una salida guardada en la BD (puede ser negativo).
export function minutosDespuesDelHorario(registro, zona = DB_TZ, salida = registro?.salida) {
  const programada = salidaProgramada(registro, zona);
  if (!programada || !salida) return null;
  const real = dayjs.tz(salida, DB_TZ);
  if (!real.isValid()) return null;
  return Math.round(real.diff(programada, "minute", true));
}

// "No autorizadas por Laura Gómez · salida del reloj 2026-11-18 18:42"
export function notaNoAutorizada(salidaReloj, quien, zona = DB_TZ) {
  const reloj = dayjs.tz(salidaReloj, DB_TZ).tz(zona || DB_TZ).format("YYYY-MM-DD HH:mm");
  return `${PREFIJO_NO}${quien ? ` por ${quien}` : ""} · salida del reloj ${reloj}`;
}

function salidaRelojDeNota(nota, zona) {
  const m = /salida del reloj (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/.exec(String(nota ?? ""));
  return m ? dayjs.tz(m[1], zona || DB_TZ).tz(DB_TZ).format(FORMATO_BD) : null;
}

// Minutos trabajados de más (trabajado − programado; negativo si trabajó menos). null sin horario o sin checadas.
export function minutosDeMas(registro) {
  const trabajados = minutosTrabajados(registro);
  const programados = minutosProgramados(registro);
  return trabajados == null || programados == null ? null : trabajados - programados;
}

// Horas extra registradas con su horario en el panel del día (horas_extra_registradas): mandan sobre el cálculo.
export function minutosRegistrados(registro) {
  const lista = Array.isArray(registro?.horas_extra_registradas) ? registro.horas_extra_registradas : [];
  return lista.length ? lista.reduce((t, r) => t + (Number(r.minutos) || 0), 0) : null;
}

export function estadoHorasExtra(registro, zona = DB_TZ) {
  const registradas = minutosRegistrados(registro);
  if (registradas != null) {
    const reposicion = registro.horas_extra_registradas.every((r) => r.forma_pago === FORMA_REPOSICION);
    return { estado: reposicion ? "reposicion" : "autorizada", minutos: registradas, registradas: true };
  }
  const minutos = minutosDeMas(registro);
  if (Number(registro?.hrs_extra)) {
    const estado = registro?.forma_pago_extras === FORMA_REPOSICION ? "reposicion" : "autorizada";
    return { estado, minutos: minutos != null && minutos > 0 ? minutos : null };
  }

  // No autorizadas: constancia en las notas (y, si se recortó la salida, la del reloj en valores_originales).
  const nota = String(registro?.notas_hrs_extra ?? "");
  const salidaReloj = leerOriginales(registro)?.salida || (nota.startsWith(PREFIJO_NO) ? salidaRelojDeNota(nota, zona) : null);
  const minutosReloj = salidaReloj ? minutosDeMas({ ...registro, salida: salidaReloj }) : null;
  if (nota.startsWith(PREFIJO_NO)) {
    const m = Math.max(minutos ?? 0, minutosReloj ?? 0);
    return { estado: "no_autorizada", minutos: m || null, salidaReloj };
  }
  if (minutos != null && minutos >= UMBRAL_MINUTOS) return { estado: "pendiente", minutos };
  // Registros anteriores sin constancia: la salida se llevó a la del horario y la del reloj daba extra.
  if (salidaReloj && minutos != null && minutos <= 0 && minutosReloj != null && minutosReloj >= UMBRAL_MINUTOS) {
    return { estado: "no_autorizada", minutos: minutosReloj, salidaReloj };
  }
  return { estado: "sin", minutos };
}

export const etiquetaHorasExtra = (registro, zona) => ETIQUETAS_ESTADO[estadoHorasExtra(registro, zona).estado];

// --- Lo que se guarda en cada acción (solo campos que existen hoy en la BD) ---

export function cambiosAutorizar({ forma, notas, idAutorizador } = {}) {
  const cambios = { hrs_extra: 1, forma_pago_extras: forma || FORMA_PAGO_DEFAULT };
  if (notas !== undefined) cambios.notas_hrs_extra = notas || null;
  if (idAutorizador != null && idAutorizador !== "") cambios.extras_autorizadas_por = Number(idAutorizador);
  return cambios;
}

export function cambiosNoAutorizar(registro, { quien, zona } = {}) {
  if (!registro?.salida) return null;
  const cambios = { hrs_extra: 0, notas_hrs_extra: notaNoAutorizada(registro.salida, quien, zona) };
  // Si se quedó después de su horario, se paga hasta la salida del horario (la del reloj se conserva).
  const programada = salidaProgramada(registro, zona);
  const despues = minutosDespuesDelHorario(registro, zona);
  if (programada && despues != null && despues > 0) cambios.salida = programada.tz(DB_TZ).format(FORMATO_BD);
  return cambios;
}

// Quitar una autorización, o deshacer un «No autorizar» (regresa la salida del reloj).
export function cambiosQuitar(registro, zona) {
  const info = estadoHorasExtra(registro, zona);
  if (info.estado === "autorizada" || info.estado === "reposicion") return { hrs_extra: 0 };
  if (info.estado === "no_autorizada") {
    // Regresa la salida del reloj solo si se había recortado; nunca manda una salida vacía.
    const cambios = { notas_hrs_extra: null };
    if (info.salidaReloj && info.salidaReloj !== registro.salida) cambios.salida = info.salidaReloj;
    return cambios;
  }
  return null;
}

// Valores actuales de los campos que se van a cambiar (para «Deshacer»).
export function valoresPrevios(registro, cambios) {
  // hrs_extra es Sí/No en la BD: nunca se regresa como null.
  return Object.fromEntries(Object.keys(cambios ?? {}).map((k) => [
    k,
    k === "hrs_extra" ? (Number(registro?.[k]) ? 1 : 0) : registro?.[k] ?? null,
  ]));
}

export function resumenHorasExtra(registros, zonaDe = () => DB_TZ) {
  const r = { total: 0, pendientes: 0, autorizadas: 0, noAutorizadas: 0, reposiciones: 0 };
  for (const reg of registros ?? []) {
    const { estado } = estadoHorasExtra(reg, zonaDe(reg));
    if (estado === "sin") continue;
    r.total += 1;
    if (estado === "pendiente") r.pendientes += 1;
    if (estado === "autorizada") r.autorizadas += 1;
    if (estado === "no_autorizada") r.noAutorizadas += 1;
    if (estado === "reposicion") r.reposiciones += 1;
  }
  return r;
}

// Orden de la columna «Horas extra» (de mayor a menor importancia):
// por autorizar → autorizadas → reposición → no autorizadas → sin horas extra; dentro de cada grupo, más minutos primero.
const PRIORIDAD = { pendiente: 0, autorizada: 1, reposicion: 2, no_autorizada: 3, sin: 4 };
export function ordenarPorHorasExtra(registros, { zonaDe = () => DB_TZ, orden = "desc" } = {}) {
  const conInfo = (registros ?? []).map((r, i) => ({ r, i, info: estadoHorasExtra(r, zonaDe(r)) }));
  conInfo.sort((a, b) =>
    PRIORIDAD[a.info.estado] - PRIORIDAD[b.info.estado] ||
    (Math.max(b.info.minutos ?? 0, 0) - Math.max(a.info.minutos ?? 0, 0)) ||
    a.i - b.i,
  );
  const ordenados = conInfo.map((x) => x.r);
  return orden === "asc" ? ordenados.reverse() : ordenados;
}
