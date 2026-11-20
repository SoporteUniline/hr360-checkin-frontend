// «Control de horas extra» por fechas (maqueta aprobada 19/11/2026): días arriba, horas abajo.
// Periodos (semana legal, quincena, mes, rango) y la matriz persona × día con el estado de cada celda.
// Probado en scripts/test-matriz-horas-extra.mjs.
import { DB_TZ, estadoHorasExtra } from "./horasExtra.mjs";
import { lunesDe } from "./controlHorasExtra.mjs";

const DIA_MS = 86400000;
export const sumarDias = (fecha, n) => new Date(Date.parse(`${fecha}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
const finDeMes = (fecha) => {
  const [a, m] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};

// Periodo que contiene `fecha` según el modo: semana (lunes–domingo), quincena (1–15 / 16–fin), mes.
export function periodoDe(modo, fecha) {
  const f = String(fecha).slice(0, 10);
  if (modo === "mes") return { inicio: `${f.slice(0, 8)}01`, fin: finDeMes(f) };
  if (modo === "quincena") {
    return Number(f.slice(8, 10)) <= 15
      ? { inicio: `${f.slice(0, 8)}01`, fin: `${f.slice(0, 8)}15` }
      : { inicio: `${f.slice(0, 8)}16`, fin: finDeMes(f) };
  }
  const inicio = lunesDe(f);
  return { inicio, fin: sumarDias(inicio, 6) };
}

// Periodo anterior / siguiente del mismo tamaño.
export function moverPeriodo(modo, periodo, n) {
  if (modo === "rango") {
    const largo = Math.round((Date.parse(periodo.fin) - Date.parse(periodo.inicio)) / DIA_MS) + 1;
    return { inicio: sumarDias(periodo.inicio, n * largo), fin: sumarDias(periodo.fin, n * largo) };
  }
  const ref = n < 0 ? sumarDias(periodo.inicio, -1) : sumarDias(periodo.fin, 1);
  return periodoDe(modo, ref);
}

export function diasDelPeriodo({ inicio, fin }) {
  const dias = [];
  for (let f = inicio; f <= fin && dias.length < 93; f = sumarDias(f, 1)) dias.push(f);
  return dias;
}

const nombreDe = (r) => [r.nombre, r.apellido_paterno].filter(Boolean).join(" ").trim() || "Sin nombre";
// Lo que suma al total: por autorizar y autorizadas. Las no autorizadas se muestran tachadas y no suman.
const suma = (estado) => estado === "pendiente" || estado === "autorizada";
// Prioridad del color de la celda cuando un día tiene varios registros.
const PRIORIDAD = { pendiente: 0, autorizada: 1, reposicion: 2, no_autorizada: 3 };

// filas: [{ id, nombre, departamento, celdas: { [fecha]: { minutos, estado, registros } }, total, pendientes }]
export function matrizHorasExtra(registros, { dias, zonaDe = () => DB_TZ, estados = null } = {}) {
  const enPeriodo = new Set(dias);
  const porEmpleado = new Map();
  for (const r of registros ?? []) {
    const fecha = String(r.fecha ?? "").slice(0, 10);
    if (!enPeriodo.has(fecha)) continue;
    const info = estadoHorasExtra(r, zonaDe(r));
    if (info.estado === "sin") continue;
    if (estados?.length && !estados.includes(info.estado)) continue;
    const id = r.id_empleado ?? nombreDe(r);
    if (!porEmpleado.has(id)) porEmpleado.set(id, { id, nombre: nombreDe(r), departamento: r.departamento ?? "", celdas: {}, total: 0, pendientes: 0 });
    const fila = porEmpleado.get(id);
    const celda = fila.celdas[fecha] ?? (fila.celdas[fecha] = { minutos: 0, estado: info.estado, registros: [] });
    const m = Math.max(0, Number(info.minutos) || 0);
    celda.registros.push({ registro: r, info, minutos: m });
    if (suma(info.estado)) fila.total += m;
    if (PRIORIDAD[info.estado] < PRIORIDAD[celda.estado]) celda.estado = info.estado;
    if (info.estado === "pendiente") fila.pendientes += 1;
  }
  // Minutos de la celda al final, ya con todos sus registros: si alguno cuenta, solo los que cuentan;
  // si ninguno cuenta (p. ej. todos pendientes), la suma de todos para que se vea cuánto hay en juego.
  // Antes dependía del orden: un pendiente leído antes que un aprobado inflaba la celda.
  for (const fila of porEmpleado.values()) {
    for (const c of Object.values(fila.celdas)) {
      const cuentan = c.registros.filter((x) => suma(x.info.estado));
      c.minutos = (cuentan.length ? cuentan : c.registros).reduce((t, x) => t + x.minutos, 0);
      c.minutosQueCuentan = cuentan.reduce((t, x) => t + x.minutos, 0);
    }
  }
  const filas = [...porEmpleado.values()].sort((a, b) => b.pendientes - a.pendientes || b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));
  const totalesDia = Object.fromEntries(dias.map((f) => [f, { minutos: 0, pendientes: 0 }]));
  for (const fila of filas) {
    for (const [f, c] of Object.entries(fila.celdas)) {
      totalesDia[f].minutos += c.minutosQueCuentan;
      totalesDia[f].pendientes += c.registros.filter((x) => x.info.estado === "pendiente").length;
    }
  }
  return { filas, totalesDia, total: filas.reduce((t, f) => t + f.total, 0) };
}

// «Abrir en Asistencias»: la lista filtrada a esa persona y ese día, con su ventana de edición abierta.
export function enlaceAsistencia(registro) {
  const p = new URLSearchParams({
    fecha: String(registro.fecha ?? "").slice(0, 10),
    empleado: nombreDe(registro),
    abrir: String(registro.id),
  });
  return `/panel/registro-asistencia?${p.toString()}`;
}

// 270 → "4:30"
export const horaCorta = (min) => {
  const m = Math.max(0, Math.round(Number(min) || 0));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};
