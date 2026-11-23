// Reglas puras del calendario de entrevistas tipo Google Calendar (semana / día, minicalendario del mes, línea de «ahora»,
// posición de citas y horarios libres en la rejilla de 30 min). Fechas como texto «YYYY-MM-DD HH:mm» en hora de México.
// Se prueban con node --test (scripts/test-whatsapp-calendario.mjs).
import { diasDeSemana, fechaHoraCorta, inicioSemana, minutosDelDia, partesTexto, sumarDias } from "./agenda.mjs";

export const MINUTOS_FILA = 30;
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Días que muestra la vista: la semana (lunes a domingo) del día elegido, o solo ese día.
export function diasDeVista(modo, dia) {
  if (!partesTexto(dia)) return [];
  return modo === "dia" ? diasDeSemana(dia).slice(0, 1) : diasDeSemana(inicioSemana(dia));
}
// ‹ › : una semana o un día.
export const moverVista = (modo, dia, direccion) => sumarDias(dia, direccion * (modo === "dia" ? 1 : 7));

// Horas visibles: de 8 a 19 h, ampliadas para que quepan citas y horarios libres (fin redondeado hacia arriba).
export function rangoAgenda(citas = [], horarios = [], { desde = 8, hasta = 19 } = {}) {
  let min = desde;
  let max = hasta;
  for (const x of [...(citas ?? []), ...(horarios ?? [])]) {
    const ini = partesTexto(x?.inicio);
    if (!ini) continue;
    min = Math.min(min, ini.hora);
    const fin = x?.fin && partesTexto(x.fin) ? minutosDelDia(x.fin) : minutosDelDia(x.inicio) + MINUTOS_FILA;
    max = Math.max(max, Math.ceil((fin || 0) / 60));
  }
  return { desde: Math.max(0, min), hasta: Math.min(24, Math.max(max, min + 1)) };
}

// Posición vertical (px) de un bloque en la rejilla: `altoHora` px por hora desde la hora `desde`. Mínimo 15 min de alto.
export function posicionBloque(inicio, fin, desde, altoHora) {
  const ini = minutosDelDia(inicio);
  const f = fin && partesTexto(fin) ? minutosDelDia(fin) : ini + MINUTOS_FILA;
  const dur = Math.max(15, f - ini);
  return { top: ((ini - desde * 60) / 60) * altoHora, alto: (dur / 60) * altoHora, minutos: dur };
}

// Fecha y hora actuales en México (para «hoy» y la línea roja).
export function ahoraMx(ahora = new Date()) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(ahora).map((p) => [p.type, p.value]));
  return { dia: `${partes.year}-${partes.month}-${partes.day}`, minutos: Number(partes.hour) * 60 + Number(partes.minute) };
}
// Línea roja de «ahora» dentro de la columna de hoy; null si no se ve (otro día o fuera del rango de horas).
export function lineaAhora(ahora, dia, desde, hasta, altoHora) {
  const a = ahoraMx(ahora);
  if (a.dia !== dia || a.minutos < desde * 60 || a.minutos > hasta * 60) return null;
  return ((a.minutos - desde * 60) / 60) * altoHora;
}

// Minicalendario: semanas (lunes a domingo) que cubren el mes del día dado; los días de otros meses van marcados.
export function mesCalendario(dia) {
  const p = partesTexto(dia);
  if (!p) return { titulo: "", primero: "", semanas: [] };
  const primero = `${p.anio}-${String(p.mes + 1).padStart(2, "0")}-01`;
  let cursor = inicioSemana(primero);
  const semanas = [];
  do {
    semanas.push(Array.from({ length: 7 }, (_, i) => {
      const c = sumarDias(cursor, i);
      const q = partesTexto(c);
      return { clave: c, numero: q.dia, delMes: q.mes === p.mes };
    }));
    cursor = sumarDias(cursor, 7);
  } while (partesTexto(cursor).mes === p.mes);
  return { titulo: `${MESES_LARGOS[p.mes]} ${p.anio}`, primero, semanas };
}
// Mes anterior / siguiente (primer día).
export function moverMes(dia, direccion) {
  const p = partesTexto(dia);
  if (!p) return "";
  const d = new Date(Date.UTC(p.anio, p.mes + direccion, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
export function nombreDia(dia) {
  const p = partesTexto(dia);
  return p ? `${DIAS_LARGOS[p.semana]} ${p.dia} de ${MESES_LARGOS[p.mes]}` : "";
}

// Título de la barra: «noviembre 2026» en semana (o «nov – dic 2026» si cruza), el día completo en vista de día.
export function tituloVista(modo, dia) {
  const p = partesTexto(dia);
  if (!p) return "";
  if (modo === "dia") return `${nombreDia(dia)} de ${p.anio}`;
  const ini = partesTexto(inicioSemana(dia));
  const fin = partesTexto(sumarDias(inicioSemana(dia), 6));
  if (ini.mes === fin.mes) return `${MESES_LARGOS[ini.mes]} ${ini.anio}`;
  return ini.anio === fin.anio ? `${MESES_LARGOS[ini.mes]} – ${MESES_LARGOS[fin.mes]} ${fin.anio}` : `${MESES_LARGOS[ini.mes]} ${ini.anio} – ${MESES_LARGOS[fin.mes]} ${fin.anio}`;
}

// Colores por estado (también la leyenda). Las canceladas se ven tachadas.
export const LEYENDA = [
  { estado: "agendada", texto: "Agendada", tono: "azul" },
  { estado: "confirmada", texto: "Confirmada", tono: "verde" },
  { estado: "asistio", texto: "Asistió", tono: "verde" },
  { estado: "no_asistio", texto: "No asistió", tono: "rojo" },
  { estado: "cancelada", texto: "Cancelada", tono: "gris" },
];
export const sePuedeMover = (cita) => cita?.estado === "agendada" || cita?.estado === "confirmada";

// ¿El horario libre acepta la cita? Debe quedar lugar y no ser el mismo inicio.
export const aceptaCita = (horario, cita) => !!horario && Number(horario.libres) > 0 && String(horario.inicio) !== String(cita?.inicio ?? "");

export function textoConfirmarMover(cita, inicio) {
  const quien = cita?.candidato?.nombre || "el candidato";
  return `¿Mover la entrevista de ${quien} del ${fechaHoraCorta(cita?.inicio)} al ${fechaHoraCorta(inicio)}? El agente le avisa del cambio por WhatsApp.`;
}

// Cita con el horario nuevo mientras se guarda (se pinta en su lugar nuevo; si el API falla, vuelve a donde estaba).
export function aplicarMovimiento(citas, movida) {
  if (!movida) return citas;
  return (citas ?? []).map((c) => {
    if (String(c.id) !== String(movida.id)) return c;
    const dur = c.fin ? Math.max(15, minutosDelDia(c.fin) - minutosDelDia(c.inicio)) : MINUTOS_FILA;
    const finMin = minutosDelDia(movida.inicio) + dur;
    const fin = `${movida.inicio.slice(0, 10)} ${String(Math.floor(finMin / 60)).padStart(2, "0")}:${String(finMin % 60).padStart(2, "0")}`;
    return { ...c, inicio: movida.inicio, fin, moviendo: true };
  });
}
