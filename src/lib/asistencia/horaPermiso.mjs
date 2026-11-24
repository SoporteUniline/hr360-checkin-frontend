// «Si puse salida temprano, tendría que decirme a qué horas» (Diego, 24/11/2026).
// En «Permiso del día» del reloj, un tipo parcial pide su hora (obligatoria) y ajusta las checadas:
//  · entrada (Entrada tarde)       → «¿A qué hora entró?»: la ENTRADA del primer renglón de jornada pasa a esa hora.
//  · salida  (Salida temprano)     → «¿A qué hora salió?»: la SALIDA del último renglón de jornada pasa a esa hora.
//  · medio   (Salir en medio turno) → «Salió a las» / «Regresó a las»: el renglón que cubre ese rango se parte en dos.
// Sin checadas se carga el horario normal ya ajustado. Los renglones que cambian llevan el motivo de corrección
// `permiso` («Por el permiso del día»), salvo que el usuario haya elegido otro. Si con el tipo parcial no quedan minutos
// no trabajados, o la hora no cae dentro de la jornada programada, no deja guardar.
// Lógica pura (el servidor recalcula al guardar). Probado en scripts/test-reloj-dia.mjs.
import { aHHMM, aMin, hora12Txt, horarioMin, horarioNormal, nuevoRenglon, vivos } from "./relojDia.mjs";

export const MOTIVO_PERMISO = "permiso";
// Campos de hora por alcance: [campo del par, etiqueta].
export const CAMPOS_HORA = {
  entrada: [["hasta", "¿A qué hora entró?"]],
  salida: [["desde", "¿A qué hora salió?"]],
  medio: [["desde", "Salió a las"], ["hasta", "Regresó a las"]],
};

const conHoras = (rs) => rs.filter((r) => r.ini != null && r.fin != null);
// Horas que ya dicen las checadas (para mostrarlas si el usuario aún no escribió ninguna).
export function horasDeChecadas(alcance, regs, horario) {
  const h = horarioMin(horario);
  const v = vivos(regs ?? []).filter((r) => r.ini != null);
  const trabajo = v.filter((r) => r.concepto !== "comida");
  if (!h || !trabajo.length) return {};
  if (alcance === "entrada") {
    const e = Math.min(...trabajo.map((r) => r.ini));
    return e > h.pe ? { hasta: aHHMM(e) } : {};
  }
  const cerrados = conHoras(trabajo);
  if (alcance === "salida") {
    if (!cerrados.length || cerrados.length < trabajo.length) return {};
    const s = Math.max(...cerrados.map((r) => r.fin));
    return s < h.ps ? { desde: aHHMM(s) } : {};
  }
  if (alcance === "medio") {
    const orden = conHoras(v).sort((a, b) => a.ini - b.ini);
    for (let i = 1; i < orden.length; i++) {
      const fin = Math.max(...orden.slice(0, i).map((r) => r.fin));
      if (orden[i].ini > fin && fin > h.pe && orden[i].ini < h.ps) return { desde: aHHMM(fin), hasta: aHHMM(orden[i].ini) };
    }
  }
  return {};
}
// Horas del par (lo escrito; si no, lo que dicen las checadas).
export function horasPermiso(par, alcance, regs, horario) {
  const c = horasDeChecadas(alcance, regs, horario);
  return { desde: par?.desde ?? c.desde ?? "", hasta: par?.hasta ?? c.hasta ?? "" };
}

// ¿Las horas caben en la jornada programada? (entrada: pe < hasta < ps; salida: pe < desde < ps; medio: pe < desde < hasta < ps)
function enJornada(alcance, { desde, hasta }, h) {
  const d = aMin(desde), a = aMin(hasta);
  const dentro = (m) => m != null && m > h.pe && m < h.ps;
  if (alcance === "entrada") return dentro(a);
  if (alcance === "salida") return dentro(d);
  if (alcance === "medio") return dentro(d) && dentro(a) && a > d;
  return true;
}
export function horasValidas(alcance, horas, horario) {
  const h = horarioMin(horario);
  return Boolean(h && !h.nocturno && CAMPOS_HORA[alcance] && enJornada(alcance, horas, h));
}

// Error en vivo: «Salida temprano: indica a qué hora salió (debe ser antes de las 4:00 p.m.)». "" si está bien.
export function errorHoraPermiso({ nombre, alcance, horas, horario, minutos }) {
  const h = horarioMin(horario);
  if (!h || !CAMPOS_HORA[alcance]) return "";
  const ini = hora12Txt(aHHMM(h.pe)), fin = hora12Txt(aHHMM(h.ps));
  const texto = {
    entrada: `${nombre}: indica a qué hora entró (debe ser después de las ${ini})`,
    salida: `${nombre}: indica a qué hora salió (debe ser antes de las ${fin})`,
    medio: `${nombre}: indica a qué hora salió y a qué hora regresó (entre las ${ini} y las ${fin})`,
  }[alcance];
  if (!h.nocturno && !enJornada(alcance, horas, h)) return texto;
  return Number(minutos) > 0 ? "" : texto;
}

// El renglón ajustado lleva «permiso» salvo que el usuario haya elegido otro motivo (o ya tuviera uno guardado).
const conMotivo = (r) => (r.motivoElegido || (r.motivo && !r.nuevo && r.motivo === r.motivoAntes) ? r : { ...r, motivo: MOTIVO_PERMISO });
const quitar = (r) => (r.origen === "manual" && r.nuevo ? null : conMotivo({ ...r, anulado: true }));

// Checadas ajustadas a la hora del permiso. `regs`: las de antes del ajuste (así cambiar la hora no acumula ajustes).
export function ajustarPorPermiso(regs, alcance, horas, horario) {
  if (!horasValidas(alcance, horas, horario)) return regs;
  const base = vivos(regs).length ? regs : [...regs, ...horarioNormal(horario, MOTIVO_PERMISO)];
  const d = alcance === "entrada" ? -Infinity : aMin(horas.desde);
  const a = alcance === "salida" ? Infinity : aMin(horas.hasta);
  const out = [];
  for (const r of base) {
    if (r.anulado || r.concepto === "extra" || r.ini == null || r.fin == null) { out.push(r); continue; }
    if (r.ini < d && r.fin > a) out.push(conMotivo({ ...r, fin: d }), nuevoRenglon(a, r.fin, r.concepto, MOTIVO_PERMISO));
    else if (r.ini >= d && r.fin <= a) { const q = quitar(r); if (q) out.push(q); }
    else if (r.ini < d && r.fin > d) out.push(conMotivo({ ...r, fin: d }));
    else if (r.ini < a && r.fin > a) out.push(conMotivo({ ...r, ini: a }));
    else out.push(r);
  }
  // Si las checadas no llegaban a la hora (entró a las 9:10 y el reloj dice 9:18), se mueve la primera / última jornada.
  const jornada = out.filter((r) => !r.anulado && r.concepto === "jornada" && r.ini != null);
  if (alcance === "entrada" && jornada.length) {
    const p = jornada.reduce((x, y) => (y.ini < x.ini ? y : x));
    const primerIni = Math.min(...out.filter((r) => !r.anulado && r.ini != null).map((r) => r.ini));
    if (p.ini > a && primerIni > a && (p.fin == null || p.fin > a)) return out.map((r) => (r === p ? conMotivo({ ...r, ini: a }) : r));
  }
  if (alcance === "salida" && jornada.length) {
    const u = jornada.filter((r) => r.fin != null).reduce((x, y) => (y.fin > x.fin ? y : x), { fin: -Infinity });
    const ultimoFin = Math.max(...out.filter((r) => !r.anulado && r.fin != null).map((r) => r.fin));
    if (u.ini != null && u.fin < d && ultimoFin < d) return out.map((r) => (r === u ? conMotivo({ ...r, fin: d }) : r));
  }
  return out;
}
