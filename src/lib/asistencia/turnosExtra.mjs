// Turnos extra: lógica de pantalla (sin React) — probada en scripts/test-turnos-extra.mjs.
// El backend (hr360-checkin-backend/docs/turnos-extra.md) calcula avisos y estado en vivo;
// aquí solo se arma la semana, las etiquetas, los filtros y el resumen de lo elegido.

import { diaSemana, horaAMinutos, marcaEnMinutos, minutosAbsolutos, sinAcentos } from "../fechaHora.mjs";
import { formatearMinutos } from "./jornada.mjs";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const partes = (f) => ({ d: +f.slice(8, 10), m: MESES[+f.slice(5, 7) - 1], a: f.slice(0, 4) });

export function textoSemana({ inicio, fin }) {
  const a = partes(inicio), b = partes(fin);
  return a.m === b.m ? `Semana ${a.d} – ${b.d} ${b.m} ${b.a}` : `Semana ${a.d} ${a.m} – ${b.d} ${b.m} ${b.a}`;
}

export function textoDia(fecha) {
  const p = partes(fecha);
  return `${DIAS[diaSemana(fecha)]} ${p.d} ${p.m}`;
}

// Duración en minutos (si la salida es menor, termina al día siguiente).
export function duracion(inicio, fin) {
  const a = horaAMinutos(inicio), b = horaAMinutos(fin);
  if (a == null || b == null || a === b) return 0;
  return b > a ? b - a : b + 1440 - a;
}

// Fase de un turno de la lista. `ahora` = minutos absolutos en hora local (lo manda el backend).
export function faseTurno(t, ahora) {
  if (t.estado === "cancelado") return "cancelado";
  const ini = minutosAbsolutos(t.fecha, t.hora_inicio);
  // Sin hora de inicio válida no se puede saber la fase (no se toma como medianoche).
  if (ahora == null || ini == null) return "programado";
  const fin = ini + duracion(t.hora_inicio, t.hora_fin);
  return ahora < ini ? "programado" : ahora <= fin ? "en_curso" : "terminado";
}

export const FASES = {
  programado: { texto: "Programado", tono: "gris" },
  en_curso: { texto: "En curso", tono: "azul" },
  terminado: { texto: "Terminado", tono: "verde" },
  cancelado: { texto: "Cancelado", tono: "rojo" },
};

export function estadoPersona(vivo) {
  if (!vivo) return { texto: "—", tono: "gris" };
  if (vivo.llegoTarde && vivo.estado === "trabajando") return { texto: `Llegó ${formatearMinutos(vivo.llegoTarde)} tarde`, tono: "ambar" };
  return {
    programado: { texto: "Programado", tono: "gris" },
    por_llegar: { texto: "Por llegar", tono: "gris" },
    no_se_presento: { texto: "No se ha presentado", tono: "rojo" },
    trabajando: { texto: "Trabajando", tono: "azul" },
    termino: { texto: vivo.llegoTarde ? `Terminó · llegó ${formatearMinutos(vivo.llegoTarde)} tarde` : "Terminó", tono: "verde" },
  }[vivo.estado] ?? { texto: vivo.estado, tono: "gris" };
}

// ¿Salió de su turno el mismo día, poco antes del turno extra? (filtro «Salieron hoy de su turno»).
export function salioAntes(candidato, fecha, horaInicio, margenMin = 8 * 60) {
  const salida = marcaEnMinutos(candidato?.salida_anterior);
  // Sin hora de inicio todavía no hay contra qué comparar (no se toma como medianoche).
  const inicio = minutosAbsolutos(fecha, horaInicio);
  return salida != null && inicio != null && salida <= inicio && inicio - salida <= margenMin;
}


export function filtrarCandidatos(lista, { filtro = "todos", buscar = "", fecha, horaInicio } = {}) {
  const q = sinAcentos(buscar).trim();
  return (lista ?? []).filter((c) => {
    if (q && !sinAcentos(`${c.nombre_empleado} ${c.departamento ?? ""} ${c.puesto ?? ""}`).includes(q)) return false;
    if (filtro === "salieron") return salioAntes(c, fecha, horaInicio);
    if (filtro.startsWith("depto:")) return String(c.departamento ?? "") === filtro.slice(6);
    return true;
  });
}

export function departamentos(lista) {
  const cuenta = new Map();
  for (const c of lista ?? []) if (c.departamento) cuenta.set(c.departamento, (cuenta.get(c.departamento) ?? 0) + 1);
  return [...cuenta].sort((a, b) => b[1] - a[1]).map(([nombre, total]) => ({ nombre, total }));
}

// Resumen de lo elegido: personas, horas programadas, cuántas van al triple y avisos graves.
export function resumenSeleccion(lista, seleccion) {
  const elegidos = (lista ?? []).filter((c) => seleccion.has(c.id_empleado));
  return {
    personas: elegidos.length,
    minutos: elegidos.reduce((t, c) => t + (c.duracion || 0), 0),
    triples: elegidos.reduce((t, c) => t + (c.triples || 0), 0),
    conAvisos: elegidos.filter((c) => c.avisos?.some((a) => a.nivel !== "info")).length,
    graves: elegidos.filter((c) => c.grave),
  };
}
