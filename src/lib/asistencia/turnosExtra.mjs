// Turnos extra: lógica de pantalla (sin React) — probada en scripts/test-turnos-extra.mjs.
// El backend (hr360-checkin-backend/docs/turnos-extra.md) calcula avisos y estado en vivo;
// aquí solo se arma la semana, las etiquetas, los filtros y el resumen de lo elegido.

const DIA_MS = 86400000;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function sumarDias(fecha, n) {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
}

// Semana legal lunes–domingo que contiene la fecha.
export function semanaDe(fecha) {
  const d = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  const inicio = sumarDias(fecha, d === 0 ? -6 : 1 - d);
  return { inicio, fin: sumarDias(inicio, 6) };
}

const partes = (f) => ({ d: +f.slice(8, 10), m: MESES[+f.slice(5, 7) - 1], a: f.slice(0, 4) });

export function textoSemana({ inicio, fin }) {
  const a = partes(inicio), b = partes(fin);
  return a.m === b.m ? `Semana ${a.d} – ${b.d} ${b.m} ${b.a}` : `Semana ${a.d} ${a.m} – ${b.d} ${b.m} ${b.a}`;
}

export function textoDia(fecha) {
  const p = partes(fecha);
  return `${DIAS[new Date(`${fecha}T00:00:00Z`).getUTCDay()]} ${p.d} ${p.m}`;
}

export function horaMin(h) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(h ?? ""));
  return m ? +m[1] * 60 + +m[2] : null;
}

// Duración en minutos (si la salida es menor, termina al día siguiente).
export function duracion(inicio, fin) {
  const a = horaMin(inicio), b = horaMin(fin);
  if (a == null || b == null || a === b) return 0;
  return b > a ? b - a : b + 1440 - a;
}

export function textoMin(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  const h = Math.floor(m / 60), r = m % 60;
  return h && r ? `${h} h ${r} min` : h ? `${h} h` : `${r} min`;
}

// Fase de un turno de la lista. `ahora` = minutos absolutos en hora local (lo manda el backend).
export function faseTurno(t, ahora) {
  if (t.estado === "cancelado") return "cancelado";
  const ini = Math.floor(Date.parse(`${t.fecha}T00:00:00Z`) / 60000) + horaMin(t.hora_inicio);
  const fin = ini + duracion(t.hora_inicio, t.hora_fin);
  if (ahora == null) return "programado";
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
  if (vivo.llegoTarde && vivo.estado === "trabajando") return { texto: `Llegó ${textoMin(vivo.llegoTarde)} tarde`, tono: "ambar" };
  return {
    programado: { texto: "Programado", tono: "gris" },
    por_llegar: { texto: "Por llegar", tono: "gris" },
    no_se_presento: { texto: "No se ha presentado", tono: "rojo" },
    trabajando: { texto: "Trabajando", tono: "azul" },
    termino: { texto: vivo.llegoTarde ? `Terminó · llegó ${textoMin(vivo.llegoTarde)} tarde` : "Terminó", tono: "verde" },
  }[vivo.estado] ?? { texto: vivo.estado, tono: "gris" };
}

// ¿Salió de su turno el mismo día, poco antes del turno extra? (filtro «Salieron hoy de su turno»).
export function salioAntes(candidato, fecha, horaInicio, margenMin = 8 * 60) {
  const s = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(String(candidato?.salida_anterior ?? ""));
  if (!s) return false;
  const salida = Math.floor(Date.parse(`${s[1]}T00:00:00Z`) / 60000) + +s[2] * 60 + +s[3];
  const inicio = Math.floor(Date.parse(`${fecha}T00:00:00Z`) / 60000) + horaMin(horaInicio);
  return salida <= inicio && inicio - salida <= margenMin;
}

const sinAcentos = (v) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

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
