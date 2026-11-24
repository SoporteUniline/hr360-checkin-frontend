// Panel del día → «Horas extra» con su horario (varios días de la semana). Lógica pura, sin React.
// Probado en scripts/test-horas-extra-dia.mjs. Backend: PUT /checador/horas-extra/empleado/:id (docs/horas-extra-horario.md).
//
// Una fila = { clave, id?, fecha, desde: "HH:mm", hasta: "HH:mm", motivo, origen }. Las horas son de pared en la zona de
// la empresa; al guardar se convierten a la de la base con `aBase(fecha, "HH:mm")` (la misma de «Agregar comida»).
// Reglas iguales a las del servidor: hasta > desde, sin encimarse con su jornada ni con otra fila del mismo día, motivo.
// Tope de ley (Art. 66 LFT): 3 h por día y 9 h por semana; se avisa, no se bloquea.
import { diaSemana, horaAMinutos, minutosAHora, semanaDe, sumarDias } from "../fechaHora.mjs";
import { formatearMinutos } from "./jornada.mjs";

export const TOPE_DIA_MIN = 180;
export const TOPE_SEMANA_MIN = 540;
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

let secuencia = 0;
const nuevaClave = () => `f${++secuencia}`;

export const etiquetaDia = (fecha) => `${DIAS[diaSemana(fecha)]} ${Number(String(fecha).slice(8, 10))}`;

// Los 7 días (lunes–domingo) de la semana legal de la fecha.
export function diasDeLaSemana(fecha) {
  const s = semanaDe(fecha);
  return s ? Array.from({ length: 7 }, (_, i) => sumarDias(s.inicio, i)) : [];
}

// Minutos de la fila (null si falta una hora o hasta no es mayor que desde).
export function minutosFila(fila) {
  const a = horaAMinutos(fila?.desde);
  const b = horaAMinutos(fila?.hasta);
  return a == null || b == null || b <= a ? null : b - a;
}

// Fila nueva para un día: empieza a su hora de salida (si la sabemos) y dura 1 h.
export function filaNueva(fecha, salida = null, motivo = "") {
  const inicio = horaAMinutos(salida);
  return { clave: nuevaClave(), id: null, fecha, desde: inicio != null ? minutosAHora(inicio) : "", hasta: inicio != null ? minutosAHora(inicio + 60) : "",
    motivo, origen: "manual_rh" };
}

// Registros del servidor ("YYYY-MM-DD HH:mm:ss" en la zona de la base) → filas. `aLocal(marca)` → "HH:mm" de la empresa.
export function filasDesdeServidor(registros, aLocal = (v) => String(v).slice(11, 16)) {
  return (registros ?? []).map((r) => ({
    clave: `r${r.id}`, id: r.id, fecha: String(r.fecha).slice(0, 10), desde: aLocal(r.desde), hasta: aLocal(r.hasta),
    motivo: r.motivo ?? "", origen: r.origen ?? "manual_rh",
  }));
}

// Propuesta del reloj (checó después de su salida) → fila lista para autorizar.
export function filaDesdePropuesta(p, aLocal = (v) => String(v).slice(11, 16)) {
  return { clave: nuevaClave(), id: null, fecha: String(p.fecha).slice(0, 10), desde: aLocal(p.desde), hasta: aLocal(p.hasta), motivo: "", origen: "reloj" };
}

// «Repetir en otros días»: copia desde, hasta y motivo a cada fecha que aún no tenga esa misma fila.
export function repetirEnDias(fila, fechas, filas = []) {
  return (fechas ?? [])
    .filter((f) => f !== fila.fecha && !filas.some((x) => x.fecha === f && x.desde === fila.desde && x.hasta === fila.hasta))
    .map((fecha) => ({ ...fila, clave: nuevaClave(), id: null, fecha, origen: "manual_rh" }));
}

// Errores por fila (clave → mensaje). `jornadaDe(fecha)` → { entrada: "HH:mm", salida: "HH:mm" } o null.
export function validarFilas(filas, { jornadaDe = () => null } = {}) {
  const errores = {};
  const validas = [];
  for (const f of filas ?? []) {
    const a = horaAMinutos(f.desde);
    const b = horaAMinutos(f.hasta);
    if (a == null || b == null) { errores[f.clave] = "Indica desde y hasta."; continue; }
    if (b <= a) { errores[f.clave] = "«Hasta» debe ser mayor que «desde»."; continue; }
    const j = jornadaDe(f.fecha);
    const entra = horaAMinutos(j?.entrada);
    const sale = horaAMinutos(j?.salida);
    if (entra != null && sale != null) {
      const fin = sale > entra ? sale : sale + 1440;
      if (a < fin && b > entra) { errores[f.clave] = "Se encima con su jornada: van antes de su entrada o después de su salida."; continue; }
    }
    if (validas.some((v) => v.fecha === f.fecha && a < horaAMinutos(v.hasta) && horaAMinutos(v.desde) < b)) {
      errores[f.clave] = "Se encima con otra fila del mismo día.";
      continue;
    }
    if (!String(f.motivo ?? "").trim()) { errores[f.clave] = "Escribe el motivo."; continue; }
    validas.push(f);
  }
  return errores;
}

// Total de la semana contra el tope: { total, quedan, porDia: [[fecha, min]], avisos: [texto] }.
// `otras`: registros vigentes de la semana que no están en las filas (otros días ya guardados), con { fecha, minutos }.
export function resumenSemana(filas, otras = []) {
  const porDia = new Map();
  for (const f of [...(filas ?? []).map((x) => ({ fecha: x.fecha, minutos: minutosFila(x) ?? 0 })), ...(otras ?? [])]) {
    porDia.set(f.fecha, (porDia.get(f.fecha) ?? 0) + (Number(f.minutos) || 0));
  }
  const dias = [...porDia].filter(([, m]) => m > 0).sort(([a], [b]) => a.localeCompare(b));
  const total = dias.reduce((t, [, m]) => t + m, 0);
  const avisos = dias.filter(([, m]) => m > TOPE_DIA_MIN)
    .map(([f, m]) => `${etiquetaDia(f)}: ${formatearMinutos(m)} extra; la ley permite ${formatearMinutos(TOPE_DIA_MIN)} por día.`);
  if (total > TOPE_SEMANA_MIN) avisos.push(`La semana suma ${formatearMinutos(total)}; la ley permite ${formatearMinutos(TOPE_SEMANA_MIN)}. Se avisa, no se bloquea.`);
  return { total, quedan: Math.max(0, TOPE_SEMANA_MIN - total), porDia: dias, avisos };
}

const firma = (f) => `${f.id ?? ""}|${f.fecha}|${f.desde}|${f.hasta}|${String(f.motivo ?? "").trim()}|${f.origen}`;

// ¿Algo distinto a lo guardado? (filas nuevas, editadas o quitadas, o cambió quién autoriza / cómo se pagan).
export function hayCambiosFilas(filas, originales, { autoriza, forma, autorizaOriginal, formaOriginal } = {}) {
  const a = (filas ?? []).map(firma).sort().join("\n");
  const b = (originales ?? []).map(firma).sort().join("\n");
  if (a !== b) return true;
  return (filas ?? []).length > 0 && (String(autoriza ?? "") !== String(autorizaOriginal ?? "") || String(forma ?? "") !== String(formaOriginal ?? ""));
}

// Cuerpo del PUT. `aBase(fecha, "HH:mm")` → "YYYY-MM-DD HH:mm:ss" en la zona de la base.
export function cuerpoGuardar(filas, originales, { autoriza, forma, aBase }) {
  const vigentes = new Set((filas ?? []).filter((f) => f.id).map((f) => Number(f.id)));
  return {
    registros: (filas ?? []).map((f) => ({
      ...(f.id ? { id: f.id } : {}), fecha: f.fecha, desde: aBase(f.fecha, f.desde), hasta: aBase(f.fecha, f.hasta),
      motivo: String(f.motivo ?? "").trim(), origen: f.origen,
    })),
    quitar: (originales ?? []).filter((o) => o.id && !vigentes.has(Number(o.id))).map((o) => o.id),
    id_autoriza: autoriza ? Number(autoriza) : null,
    forma_pago: forma || null,
  };
}
