// «Control de horas extra» (maqueta aprobada 19/11/2026): resumen de la semana legal,
// acumulado de extra autorizadas por persona contra el tope al doble (LFT) y quién decidió.
// Probado en scripts/test-control-horas-extra.mjs.
import { DB_TZ, estadoHorasExtra } from "./horasExtra.mjs";
import { leerOriginales } from "./cambios.mjs";
import { formatearMinutos } from "./jornada.mjs";

const sumarDias = (fecha, n) => new Date(Date.parse(`${fecha}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export const lunesDe = (fecha) => {
  const f = String(fecha ?? "").slice(0, 10);
  const d = new Date(`${f}T00:00:00Z`).getUTCDay();
  return sumarDias(f, -((d + 6) % 7));
};
export const semanaDe = (fecha) => { const inicio = lunesDe(fecha); return { inicio, fin: sumarDias(inicio, 6) }; };
export const moverSemana = (semana, n) => semanaDe(sumarDias(semana.inicio, 7 * n));

// Tope semanal al doble si no hay catálogo (mismo respaldo que el backend: jornadas_legales).
export function topeRespaldo(fecha) {
  const a = Number(String(fecha).slice(0, 4));
  if (a >= 2030) return 720;
  if (a === 2029) return 660;
  if (a === 2028) return 600;
  return 540;
}

const claveSemana = (r) => `${r.id_empleado}|${lunesDe(r.fecha)}`;

// Resumen de los registros con horas extra (los demás se ignoran).
// `contexto` (19/11/2026): registros de los días de la semana que quedan FUERA del periodo (quincena o mes que
// empieza o termina a media semana). Solo cuentan para el tope semanal: las dobles/triples se reparten en
// orden de fecha dentro de cada semana y al periodo solo se le suma lo de sus propios registros.
export function resumenControl(registros, { zonaDe = () => DB_TZ, tope = 540, contexto = [] } = {}) {
  const res = {
    pendiente: { minutos: 0, registros: 0, personas: new Set() },
    autorizada: { minutos: 0, registros: 0, dobles: 0, triples: 0 },
    no_autorizada: { minutos: 0, registros: 0 },
    alertas: 0,
    porSemana: new Map(),
  };
  const autorizadas = [];
  const sumar = (r, delPeriodo) => {
    const { estado, minutos } = estadoHorasExtra(r, zonaDe(r));
    if (estado === "sin") return;
    const m = Math.max(0, Number(minutos) || 0);
    if (estado === "autorizada") {
      res.porSemana.set(claveSemana(r), (res.porSemana.get(claveSemana(r)) ?? 0) + m);
      autorizadas.push({ r, m, delPeriodo });
    }
    if (!delPeriodo) return;
    const b = res[estado];
    b.minutos += m;
    b.registros += 1;
    if (estado === "pendiente") b.personas.add(r.id_empleado);
    if (estado !== "no_autorizada" && m > 240) res.alertas += 1; // más de 4 h extra en el día
  };
  for (const r of registros ?? []) sumar(r, true);
  for (const r of contexto ?? []) sumar(r, false);
  // Reparto en orden de fecha: las primeras horas de la semana son dobles hasta el tope; lo demás, triples.
  const acumulado = new Map();
  autorizadas.sort((a, b) => String(a.r.fecha).localeCompare(String(b.r.fecha)));
  for (const { r, m, delPeriodo } of autorizadas) {
    const antes = acumulado.get(claveSemana(r)) ?? 0;
    acumulado.set(claveSemana(r), antes + m);
    if (!delPeriodo) continue;
    const dobles = Math.min(m, Math.max(0, tope - antes));
    res.autorizada.dobles += dobles;
    res.autorizada.triples += m - dobles;
  }
  for (const total of res.porSemana.values()) if (total > tope) res.alertas += 1; // pasa del tope semanal al doble
  res.pendiente.personas = res.pendiente.personas.size;
  return res;
}

// Acumulado de extra autorizadas de la persona en la semana del registro.
export function semanaExtra(registro, resumen, tope = 540) {
  const acumulado = resumen?.porSemana?.get(claveSemana(registro)) ?? 0;
  return { acumulado, tope, triples: Math.max(0, acumulado - tope) };
}

// Quién decidió: autorizador (autorizada), «No autorizadas por X» (no autorizada) o pendiente.
export function quienDecidio(registro, zona = DB_TZ) {
  const { estado } = estadoHorasExtra(registro, zona);
  if (estado === "pendiente") return { estado, nombre: null };
  if (estado === "autorizada") {
    const nombre = [registro.nombre_extra_autorizador, registro.apellido_paterno_extra_autorizador].filter(Boolean).join(" ");
    return { estado, nombre: nombre || null };
  }
  if (estado === "no_autorizada") {
    const m = /^No autorizadas por (.+?) · salida del reloj/.exec(String(registro.notas_hrs_extra ?? ""));
    return { estado, nombre: m?.[1] ?? null, salidaReloj: leerOriginales(registro)?.salida ?? null };
  }
  return { estado, nombre: null };
}

// Alertas del día para la columna «Alertas».
export function alertasDia(registro, resumen, { zona = DB_TZ, tope = 540 } = {}) {
  const { estado, minutos } = estadoHorasExtra(registro, zona);
  const alertas = [];
  if (estado !== "no_autorizada" && estado !== "sin" && Number(minutos) > 240) alertas.push("Más de 4 h extra en el día");
  const s = semanaExtra(registro, resumen, tope);
  if (estado === "autorizada" && s.triples > 0) alertas.push(`Pasa de ${formatearMinutos(tope)} en la semana: ${formatearMinutos(s.triples)} al triple`);
  return alertas;
}
