// «Monitor de mi equipo» (app del empleado): el mismo estado de hoy que el Monitor de RH (lib/asistencia/hoy.mjs) a
// partir de los registros de GET /checador/mi-equipo/hoy, y el día de una persona en modo lectura.
// Funciones puras; probado en scripts/test-monitor-equipo.mjs.
import { herramientasHoras } from "./horasEdicion.mjs";
import { ahoraEn, diaDesdeRegistro, diasDeHoy, estadoHoy } from "./hoy.mjs";
import { formatearMinutos } from "./jornada.mjs";
import { hora12 } from "../hora12.mjs";

// Un estado por persona a la hora `fecha`. Cada registro en la zona de su empresa (la base guarda hora de CDMX).
export function resultadosHoy(registros, zona, fecha = new Date()) {
  const porZona = new Map();
  for (const r of registros ?? []) {
    const z = r.zona_horaria || zona;
    if (!porZona.has(z)) porZona.set(z, []);
    const { fechaLocal, horaLocal } = herramientasHoras(r, z);
    porZona.get(z).push({ ...diaDesdeRegistro(r, (v) => `${fechaLocal(v)} ${horaLocal(v)}`), registro: r });
  }
  const salida = [];
  for (const [z, dias] of porZona) {
    const ahora = ahoraEn(z, fecha);
    for (const d of diasDeHoy(dias, ahora.hoy, ahora.abs)) salida.push(estadoHoy(d, ahora.abs));
  }
  return salida;
}

const TIPO_PERMISO = { llega_tarde: "Llega tarde", sale_antes: "Sale antes", sale_regresa: "Sale y regresa" };

// Día de una persona para leer (sin editar): horario, tramos, comida, permisos por horas y horas extra registradas.
export function diaParaLeer(registro, zona) {
  const z = registro?.zona_horaria || zona;
  const { horaLocal } = herramientasHoras(registro, z);
  const ver = (v) => (v ? hora12(horaLocal(v)) : null);
  const corta = (h) => (h ? hora12(String(h).slice(0, 5)) : null);
  const cerrados = Array.isArray(registro?.tramos_checadas) ? registro.tramos_checadas : [];
  const abierto = Number(registro?.tramos_abiertos) > 0 ? registro?.entrada_tramo_abierto ?? (cerrados.length ? null : registro?.entrada) : null;
  const tramos = cerrados.map((t) => ({ entrada: ver(t.entrada), salida: ver(t.salida) }));
  if (abierto) tramos.push({ entrada: ver(abierto), salida: null });
  // Sin checadas del reloj (captura manual): la entrada y salida de la asistencia.
  if (!tramos.length && registro?.entrada) tramos.push({ entrada: ver(registro.entrada), salida: ver(registro.salida) });
  const c = registro?.comida_checada;
  return {
    horario: registro?.hora_entrada_programada ? `${corta(registro.hora_entrada_programada)} – ${corta(registro.hora_salida_programada)}` : "Sin horario",
    tramos,
    comida: c?.salida
      ? { rango: `${ver(c.salida)} – ${c.regreso ? ver(c.regreso) : "…"}`, minutos: c.minutos != null ? formatearMinutos(c.minutos) : null,
        origen: c.manual ? "manual" : "checada en el reloj", agrego: c.manual ? c.agrego?.nombre_usuario ?? null : null }
      : null,
    permisos: (registro?.permisos_horas_dia ?? []).map((p) => `${TIPO_PERMISO[p.tipo_horas] ?? "Permiso"} ${corta(p.hora_inicio) ?? ""}${p.hora_fin ? `–${corta(p.hora_fin)}` : ""}`.trim()),
    horasExtra: (registro?.horas_extra_registradas ?? []).map((h) => ({
      rango: `${ver(h.desde)} – ${ver(h.hasta)}`, minutos: formatearMinutos(Number(h.minutos) || 0), motivo: h.motivo,
    })),
  };
}
