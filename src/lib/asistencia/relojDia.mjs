// «El día se corrige en el reloj» (Asistencias). Lógica pura del modal del reloj y del estado del día:
// - convierte las checadas de GET /checador/asistencias/:id/reloj a renglones editables y de vuelta al cuerpo exacto
//   del PUT (mismo contrato que el backend);
// - calcula en vivo trabajadas, comida, extra y estado (referencia: resumen() del mockup aprobado Main.dc.html);
// - valida cada renglón como errorDe() del mockup (el servidor valida lo mismo y responde errores por renglón);
// - estado del día sin checadas (catálogo tipos_permiso con cuenta_como_asistencia = 0) y acciones masivas.
// Probado en scripts/test-reloj-dia.mjs.
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

import { UMBRAL_EXTRA_MIN, extraDelDia } from "./extraDelDia.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DB_TZ = "America/Mexico_City";
const FORMATO_BD = "YYYY-MM-DD HH:mm:ss";
export const TOLERANCIA_MIN = 10;
export const CONCEPTOS = [["jornada", "Jornada"], ["comida", "Comida"], ["extra", "Hora extra"]];
// «Separar como hora extra» se ofrece desde 30 min (el umbral único de horas extra, extraDelDia.mjs) y solo si hay extra
// por autorizar en el día (regla diaria, 26/11/2026).
const MIN_SEPARAR = UMBRAL_EXTRA_MIN;

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const aMin = (h) => {
  const m = HHMM.exec(String(h ?? ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const aHHMM = (min) => {
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
const corta = (h) => (h ? String(h).slice(0, 5) : null);

// Duración «6 h 20 min» / «45 min» / «—».
export function durTexto(min) {
  if (min == null || !Number.isFinite(min) || min <= 0) return "—";
  const h = Math.floor(min / 60), r = Math.round(min % 60);
  if (!h) return `${r} min`;
  return r ? `${h} h ${String(r).padStart(2, "0")} min` : `${h} h`;
}
// «9:18 a.m.» desde «HH:mm».
export function hora12Txt(h) {
  const m = aMin(h);
  if (m == null) return "—";
  const hh = Math.floor(m / 60), mm = m % 60;
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "a.m." : "p.m."}`;
}
export const fechaTxt = (f) => String(f ?? "").slice(0, 10).split("-").reverse().join("/");

// ——— Horario del día ———
// Turno nocturno: la salida programada es igual o menor que la entrada → la salida cae al día siguiente.
export function horarioMin(horario) {
  const pe = aMin(corta(horario?.entrada));
  let ps = aMin(corta(horario?.salida));
  if (pe == null || ps == null) return null;
  const nocturno = ps <= pe;
  if (nocturno) ps += 1440;
  let sc = aMin(corta(horario?.salida_comida));
  let rc = aMin(corta(horario?.regreso_comida));
  if (sc != null && nocturno && sc < pe) sc += 1440;
  if (rc != null && nocturno && rc < pe) rc += 1440;
  if (sc != null && rc != null && rc <= sc) rc = null;
  return { pe, ps, sc: rc == null ? null : sc, rc, nocturno };
}
export function minutosProgramados(horario) {
  const h = horarioMin(horario);
  if (!h) return null;
  return h.ps - h.pe - (h.sc != null ? h.rc - h.sc : 0);
}

// ——— Renglones: API ⇄ edición ———
// Minuto relativo a la medianoche de `fecha` en la zona de la empresa (puede pasar de 1440: día siguiente).
function aMinDelDia(valor, fecha, zona) {
  if (!valor) return null;
  const d = dayjs.tz(valor, DB_TZ).tz(zona || DB_TZ);
  const dias = Math.round((dayjs.utc(d.format("YYYY-MM-DD")).valueOf() - dayjs.utc(fecha).valueOf()) / 86400000);
  return dias * 1440 + d.hour() * 60 + d.minute();
}
function aBD(fecha, min, zona) {
  const dia = dayjs.utc(fecha).add(Math.floor(min / 1440), "day").format("YYYY-MM-DD");
  return dayjs.tz(`${dia} ${aHHMM(min)}`, zona || DB_TZ).tz(DB_TZ).format(FORMATO_BD);
}

let secuencia = 0;
const nuevaClave = () => `n${++secuencia}`;

// Renglón editable: ini/fin en minutos del día; oIni/oFin lo que marcó el reloj (null si es manual).
export function desdeApi(registros, { fecha, zona } = {}) {
  return (Array.isArray(registros) ? registros : []).map((r) => {
    const ini = aMinDelDia(r.entrada, fecha, zona);
    const fin = aMinDelDia(r.salida, fecha, zona);
    const manual = r.origen === "manual";
    return {
      k: `r${r.id}`, id: r.id, ini, fin,
      oIni: manual ? null : aMinDelDia(r.entrada_reloj ?? r.entrada, fecha, zona),
      oFin: manual ? null : aMinDelDia(r.salida_reloj, fecha, zona),
      // Lo guardado puede venir ya corregido: «editado» compara contra lo que se cargó.
      cIni: ini, cFin: fin,
      concepto: ["jornada", "comida", "extra"].includes(r.concepto) ? r.concepto : "jornada",
      motivo: r.motivo ?? "", origen: manual ? "manual" : "reloj", anulado: Boolean(r.anulado), anuladoAntes: Boolean(r.anulado),
      motivoAntes: r.motivo ?? "", conceptoAntes: ["jornada", "comida", "extra"].includes(r.concepto) ? r.concepto : "jornada",
      autorizaAntes: r.autoriza_no ? "no" : r.id_autoriza != null ? String(r.id_autoriza) : "",
      id_autoriza: r.id_autoriza ?? null, autoriza_no: Boolean(r.autoriza_no),
      // Tramo cerrado con el botón «Salir a comer» del reloj: la pausa que sigue es la comida.
      salioAComer: r.tipo_cierre === "comida",
    };
  });
}

// Comida marcada con «Salir a comer» (sin renglón de comida): la pausa entre ese tramo y la siguiente checada. Es lo
// mismo que ya cuenta el cálculo (minutos_comida); aquí solo se dibuja. Con un renglón «comida» ese manda y no se repite.
export function pausaComidaTras(orden, i) {
  const r = orden?.[i];
  if (!r || !r.salioAComer || r.anulado || r.fin == null) return null;
  if (orden.some((x) => !x.anulado && x.concepto === "comida")) return null;
  const sig = orden.slice(i + 1).find((x) => !x.anulado && x.ini != null);
  const hasta = sig ? sig.ini : null;
  return { desde: r.fin, hasta, minutos: hasta != null ? Math.max(0, hasta - r.fin) : null };
}

export function nuevoRenglon(ini, fin, concepto = "jornada", motivo = "") {
  return { k: nuevaClave(), ini, fin, oIni: null, oFin: null, cIni: null, cFin: null, concepto, motivo, origen: "manual",
    anulado: false, anuladoAntes: false, motivoAntes: "", id_autoriza: null, autoriza_no: false, nuevo: true };
}

// Hora escrita en un campo → minuto del día. La salida antes de la entrada solo pasa al día siguiente en turno nocturno.
export function minDeCampo(valor, { referencia = null, nocturno = false } = {}) {
  const m = aMin(valor);
  if (m == null) return null;
  if (referencia != null && referencia >= 1440) return m + 1440;
  if (referencia != null && nocturno && m <= referencia % 1440) return m + 1440;
  return m;
}

// Motivo de corrección «Otro (escribe el motivo)»: viaja como «otro: <texto>» (motivo_correccion VARCHAR(40) en el
// servidor: 6 + 34 letras como máximo; al menos 5 letras: el mínimo de todo motivo de corrección desde el 27/11/2026,
// lib/asistencia/motivoCorreccion.mjs; antes 3).
export const MAX_TEXTO_OTRO = 34;
export const MIN_LETRAS_OTRO = 5;
export const esMotivoOtro = (m) => /^otro(:|$)/.test(String(m ?? ""));
export const textoMotivoOtro = (m) => String(m ?? "").replace(/^otro:? ?/, "");
export const motivoOtro = (texto) => `otro: ${String(texto ?? "").slice(0, MAX_TEXTO_OTRO)}`;
const motivoFinal = (m) => (esMotivoOtro(m) ? `otro: ${textoMotivoOtro(m).trim()}` : m);
export function errorMotivoOtro(m) {
  if (!esMotivoOtro(m)) return "";
  return (textoMotivoOtro(m).match(/\p{L}/gu) ?? []).length < MIN_LETRAS_OTRO ? `Escribe el motivo (al menos ${MIN_LETRAS_OTRO} letras).` : "";
}

// Cuerpo exacto del PUT /:id/reloj, en el mismo orden en que se ven los renglones (los errores vuelven por índice).
export function cuerpoPut(renglones, { fecha, zona } = {}) {
  return {
    registros: renglones.map((r) => ({
      ...(r.id != null ? { id: r.id } : {}),
      entrada: r.ini == null ? null : aBD(fecha, r.ini, zona),
      salida: r.fin == null ? null : aBD(fecha, r.fin, zona),
      concepto: r.concepto,
      motivo: r.motivo ? motivoFinal(r.motivo) : null,
      anulado: Boolean(r.anulado),
      id_autoriza: r.autoriza_no ? null : r.id_autoriza ?? null,
      autoriza_no: Boolean(r.autoriza_no),
      // «No fue comida»: quita la marca de «Salir a comer» puesta por error (no mueve horas; pide motivo: errorDe).
      ...(r.quitarComida ? { quitar_comida: true } : {}),
    })),
  };
}

// «No fue comida» en la franja de comida: el tramo deja de contar como salida a comer. (27/11/2026) Cambia las horas
// trabajadas: el renglón pide motivo (errorDe), igual que el servidor.
export const quitarComida = (renglones, k) => renglones.map((x) => (x.k === k ? { ...x, salioAComer: false, quitarComida: true } : x));

// Errores 400 del servidor ({ errores: [{ indice, error }] }) → { [clave del renglón]: texto }.
export function erroresPorRenglon(respuesta, renglones) {
  const out = {};
  for (const e of Array.isArray(respuesta?.errores) ? respuesta.errores : []) {
    const r = renglones[Number(e.indice)];
    if (r) out[r.k] = out[r.k] ? `${out[r.k]} ${e.error}` : String(e.error ?? "");
  }
  return out;
}

export const vivos = (regs) => regs.filter((r) => !r.anulado);
export const ordenar = (regs) => regs.slice().sort((a, b) => (a.ini ?? 1e9) - (b.ini ?? 1e9) || String(a.k).localeCompare(String(b.k)));

// ¿Cambió algo que pide motivo? «Separar como extra» no cambia horas: no pide motivo.
export function editado(r) {
  if (r.deSeparar) return false;
  if (r.origen === "manual" && r.nuevo) return true;
  if (r.anulado && !r.anuladoAntes) return true;
  // Cortado con «Separar» (antes de la entrada y/o después de la salida): solo se movió al corte.
  if (r.separado && (r.ini === r.cIni || (r.corteIni != null && r.ini === r.corteIni))
    && (r.fin === r.cFin || (r.corteFin != null && r.fin === r.corteFin))) return false;
  return r.ini !== r.cIni || r.fin !== r.cFin;
}

// Valor del select «¿Quién autoriza?»: "" | "no" | "<id>".
export const autorizaValor = (r) => (r.autoriza_no ? "no" : r.id_autoriza != null ? String(r.id_autoriza) : "");
export const conAutoriza = (valor) => (valor === "no" ? { autoriza_no: true, id_autoriza: null }
  : valor ? { autoriza_no: false, id_autoriza: Number(valor) } : { autoriza_no: false, id_autoriza: null });
const sinAutoriza = (r) => r.id_autoriza == null && !r.autoriza_no;

// ¿El renglón quedó igual que como vino de la base? (espejo de cambioDe/sinCambio del servidor: horas, concepto, motivo,
// anulado, quién autoriza y la marca de comida). A esos no se les vuelve a aplicar la regla de la hora extra.
export function sinCambio(r) {
  return r.id != null && !r.nuevo && r.ini === r.cIni && r.fin === r.cFin && r.concepto === r.conceptoAntes
    && (r.motivo || "") === (r.motivoAntes || "") && r.anulado === r.anuladoAntes && autorizaValor(r) === (r.autorizaAntes ?? "")
    && !r.quitarComida;
}

// (25/11/2026, aprobado por el dueño) La hora extra es tiempo FUERA de la jornada (LFT art. 66): un renglón «extra» vivo no
// puede encimarse con [entrada programada, salida programada). Sin horario ese día no hay jornada que proteger. Turno
// nocturno: horarioMin pone la salida al día siguiente. Sin salida cuenta como abierto hacia adelante. Mismo texto que el
// servidor (services/relojDia.js → errorExtraEnJornada).
export function errorExtraEnJornada(r, horario) {
  const h = horarioMin(horario);
  if (!h || r?.concepto !== "extra" || r.anulado || r.ini == null) return "";
  const fin = r.fin ?? Infinity;
  if (!(r.ini < h.ps && fin > h.pe)) return "";
  const pe = hora12Txt(aHHMM(h.pe)), ps = hora12Txt(aHHMM(h.ps));
  let error = `La hora extra va antes de su entrada (${pe}) o después de su salida (${ps}). Dentro de la jornada usa «Jornada»`;
  if (r.fin != null && r.fin > h.ps) error += `. Lo de después de las ${ps}: ponlo como «Jornada» y usa «Separar … como hora extra»`;
  if (r.ini < h.pe) error += `. Lo de antes de las ${pe}: déjalo en otro registro de hora extra`;
  return error;
}
// Todo el renglón cae dentro de la jornada: «Hora extra» se deshabilita en el concepto (con la explicación).
export function extraTodoEnJornada(r, horario) {
  const h = horarioMin(horario);
  return Boolean(h && r && r.ini != null && r.fin != null && r.ini >= h.pe && r.fin <= h.ps);
}

// `horario` (opcional): para la regla de la hora extra fuera de la jornada.
export function errorDe(r, todos, horario = null) {
  if (errorMotivoOtro(r.motivo)) return errorMotivoOtro(r.motivo);
  // (27/11/2026) Quitar lo agregado a mano también pide motivo (mismo texto que el servidor).
  if (r.anulado) {
    if (r.anuladoAntes || r.motivo) return "";
    return r.origen === "manual" ? "Para quitar un registro agregado a mano elige el motivo." : "Para anular una checada del reloj elige el motivo.";
  }
  // (27/11/2026, toda corrección que cambia horas pide motivo) «No fue comida» (mismo texto que el servidor).
  if (r.quitarComida && !r.motivo) return "Para quitar la comida elige el motivo.";
  if (r.ini == null) return "Falta la entrada.";
  if (r.fin == null && (editado(r) || r.origen === "manual")) return "Falta la salida.";
  if (r.fin != null && r.fin <= r.ini) return "La salida debe ser después de la entrada.";
  const encima = todos.some((o) => o.k !== r.k && !o.anulado && o.ini != null && o.fin != null && r.fin != null
    && r.ini < o.fin && o.ini < r.fin);
  if (encima) return "Se encima con otro registro.";
  const enJornada = sinCambio(r) ? "" : errorExtraEnJornada(r, horario);
  if (enJornada) return enJornada;
  if (editado(r) && !r.motivo) return r.origen === "manual" ? "Registro agregado: elige el motivo." : "Cambiaste la hora: elige el motivo.";
  if (r.concepto === "extra" && sinAutoriza(r)) return "Hora extra: falta quién autoriza.";
  return "";
}
export function errores(regs, horario = null) {
  const out = {};
  for (const r of regs) { const e = errorDe(r, regs, horario); if (e) out[r.k] = e; }
  return out;
}

// Motivo de permiso del catálogo (tipos_permiso con es_permiso = 1) llega como «tp:<id>».
const esPermiso = (motivo) => /^tp:/.test(String(motivo ?? ""));

// Cálculo del día (mockup resumen()). estadoDia: { texto, clave } del día sin checadas (falta, descanso, vacaciones…).
// permiso: { alcance } del «Permiso del día» (tipo parcial): justifica la entrada tarde o la salida antes.
// extraDia: lo que el servidor manda en GET /:id/reloj → extra_dia (registradas fuera del reloj, autorización o constancia
// del día completo y si tiene horario otros días). Horas extra con la regla diaria del servidor (extraDelDia.mjs).
export function resumen(regs, horario, { tolerancia = TOLERANCIA_MIN, estadoDia = null, permiso = null, extraDia = null } = {}) {
  const v = vivos(regs);
  const h = horarioMin(horario);
  const largo = (r) => (r.ini != null && r.fin != null && r.fin > r.ini ? r.fin - r.ini : 0);
  const trabajo = v.filter((r) => r.concepto !== "comida");
  const jornada = v.filter((r) => r.concepto === "jornada");
  const extraReg = v.filter((r) => r.concepto === "extra");
  const entradas = trabajo.map((r) => r.ini).filter((x) => x != null).sort((a, b) => a - b);
  const entrada = entradas.length ? entradas[0] : null;
  const abierto = trabajo.some((r) => r.ini != null && r.fin == null);
  const fines = trabajo.map((r) => r.fin).filter((x) => x != null);
  const salida = abierto || !fines.length ? null : Math.max(...fines);
  const finJ = jornada.map((r) => r.fin).filter((x) => x != null);
  const ultimaJornada = finJ.length ? Math.max(...finJ) : null;
  const iniJ = jornada.map((r) => r.ini).filter((x) => x != null);
  const primeraJornada = iniJ.length ? Math.min(...iniJ) : null;
  const comida = v.filter((r) => r.concepto === "comida").reduce((s, r) => s + largo(r), 0);
  const extraMin = extraReg.reduce((s, r) => s + largo(r), 0);
  const trabajadas = trabajo.reduce((s, r) => s + largo(r), 0);
  // Jornada programada: horario − comida del horario; sin comida en el horario, la comida del día (como el servidor).
  const programadas = h ? h.ps - h.pe - (h.sc != null ? h.rc - h.sc : comida) : null;
  const relojAut = extraReg.filter((r) => r.id_autoriza != null && !r.autoriza_no).reduce((s, r) => s + largo(r), 0);
  const registradasFuera = extraDia?.registradas ?? [];
  const x = extraDelDia({
    trabajados: v.length && !abierto ? trabajadas : null, programados: programadas == null ? null : Math.max(0, programadas),
    conHorarioOtrosDias: extraDia?.con_horario_otros_dias ?? true,
    // El servidor cuenta las del reloj ya registradas (asistencias_horas_extra): aquí son los renglones autorizados en vivo.
    registradas: registradasFuera.length && relojAut ? [...registradasFuera, { minutos: relojAut, forma_pago: "Pago de horas extras" }] : registradasFuera,
    relojAutorizadas: relojAut,
    relojNoAutorizadas: extraReg.filter((r) => r.autoriza_no).reduce((s, r) => s + largo(r), 0),
    hrsExtra: extraDia?.hrs_extra, formaPago: extraDia?.forma_pago_extras, notas: extraDia?.notas_hrs_extra,
  });
  const hayPendiente = x.porAutorizar >= MIN_SEPARAR;
  const sinSeparar = hayPendiente && h && !abierto && ultimaJornada != null && ultimaJornada - h.ps >= MIN_SEPARAR ? ultimaJornada - h.ps : 0;
  const sinSepararAntes = hayPendiente && h && !abierto && primeraJornada != null && h.pe - primeraJornada >= MIN_SEPARAR ? h.pe - primeraJornada : 0;
  const extraPorAutorizar = x.porAutorizar;
  const extraNoAut = x.noAutorizadas;
  const primera = trabajo.slice().sort((a, b) => (a.ini ?? 0) - (b.ini ?? 0))[0];
  const ultima = jornada.slice().sort((a, b) => (b.fin ?? 0) - (a.fin ?? 0))[0];
  let estado;
  if (!v.length) {
    estado = { texto: estadoDia?.texto || "Sin checadas", clave: estadoDia?.clave || "falta" };
  } else if (abierto) {
    estado = { texto: "Sin salida", clave: "sinsalida" };
  } else if (!h) {
    estado = { texto: "Asistió", clave: "ok" };
  } else {
    const retardo = entrada - h.pe;
    const antes = ultimaJornada != null ? h.ps - ultimaJornada : 0;
    const permTarde = (primera && esPermiso(primera.motivo)) || permiso?.alcance === "entrada";
    const permAntes = (ultima && esPermiso(ultima.motivo)) || permiso?.alcance === "salida";
    if (retardo > tolerancia && !permTarde) estado = { texto: `Retardo +${retardo} min`, clave: "retardo" };
    else if (antes > tolerancia && !permAntes) estado = { texto: `Salió antes −${durTexto(antes)}`, clave: "antes" };
    else if (retardo > tolerancia) estado = { texto: "Entró tarde con permiso", clave: "just" };
    else if (antes > tolerancia) estado = { texto: "Salió antes con permiso", clave: "just" };
    else estado = { texto: "Asistió", clave: "ok" };
  }
  return { entrada, salida, abierto, comida, extraMin, extraAutorizada: x.autorizadas, extraPorAutorizar, extraNoAut,
    extraDetectadas: x.detectadas, sinSeparar, sinSepararAntes, trabajadas, estado, hayRegs: v.length > 0,
    programadas: programadas == null ? minutosProgramados(horario) : Math.max(0, programadas) };
}

// ——— Acciones del modal ———
// «Cargar su horario normal»: jornada (y comida si el horario la tiene) como renglones agregados con motivo.
export function horarioNormal(horario, motivo = "") {
  const h = horarioMin(horario);
  if (!h) return [];
  if (h.sc != null && h.sc > h.pe && h.rc < h.ps) {
    return [nuevoRenglon(h.pe, h.sc, "jornada", motivo), nuevoRenglon(h.sc, h.rc, "comida", motivo), nuevoRenglon(h.rc, h.ps, "jornada", motivo)];
  }
  return [nuevoRenglon(h.pe, h.ps, "jornada", motivo)];
}

// «+ Agregar registro»: empieza donde terminó el último; si ya pasó la salida programada, como hora extra.
export function agregarRegistro(regs, horario) {
  const h = horarioMin(horario);
  const cerrados = vivos(regs).filter((r) => r.fin != null);
  if (!cerrados.length) return [...regs, nuevoRenglon(h?.pe ?? 540, h?.ps ?? null, "jornada")];
  const desde = Math.max(...cerrados.map((r) => r.fin));
  return [...regs, nuevoRenglon(desde, null, h && desde >= h.ps ? "extra" : "jornada")];
}

// «+ Comida»: la del horario; si no tiene, una hora a media jornada.
export function agregarComida(regs, horario) {
  const h = horarioMin(horario);
  if (h?.sc != null) return [...regs, nuevoRenglon(h.sc, h.rc, "comida")];
  const mitad = h ? h.pe + Math.round((h.ps - h.pe) / 2 / 30) * 30 : 780;
  return [...regs, nuevoRenglon(mitad, mitad + 60, "comida")];
}
export const puedeComida = (regs) => vivos(regs).length > 0 && !vivos(regs).some((r) => r.concepto === "comida");

// «Separar X después de la salida como hora extra»: parte la última jornada en la salida programada.
export function separarExtra(regs, horario) {
  const h = horarioMin(horario);
  if (!h) return regs;
  const j = vivos(regs).filter((r) => r.concepto === "jornada" && r.fin != null).sort((a, b) => b.fin - a.fin)[0];
  if (!j || j.fin - h.ps < MIN_SEPARAR) return regs;
  const extra = { ...nuevoRenglon(h.ps, j.fin, "extra", ""), deSeparar: true };
  return regs.map((r) => (r.k === j.k ? { ...r, fin: h.ps, separado: true, corteFin: h.ps } : r)).concat([extra]);
}

// (26/11/2026) «Separar X antes de la entrada como hora extra»: parte la primera jornada en la entrada programada (llegó
// temprano). El servidor lo reconoce igual (marcarSeparados): no pide motivo, sí quién autoriza.
export function separarExtraAntes(regs, horario) {
  const h = horarioMin(horario);
  if (!h) return regs;
  const j = vivos(regs).filter((r) => r.concepto === "jornada" && r.ini != null && r.fin != null).sort((a, b) => a.ini - b.ini)[0];
  if (!j || h.pe - j.ini < MIN_SEPARAR || j.fin <= h.pe) return regs;
  const extra = { ...nuevoRenglon(j.ini, h.pe, "extra", ""), deSeparar: true };
  return regs.map((r) => (r.k === j.k ? { ...r, ini: h.pe, separado: true, corteIni: h.pe } : r)).concat([extra]);
}

// Anular (del reloj) / restaurar / quitar (agregado).
export function quitarORestaurar(regs, k) {
  const r = regs.find((x) => x.k === k);
  if (!r) return regs;
  if (r.origen === "manual" && r.nuevo) return regs.filter((x) => x.k !== k);
  return regs.map((x) => (x.k === k ? { ...x, anulado: !x.anulado } : x));
}
// Lo agregado a mano se «quita» (si ya estaba guardado viaja con anulado: true); lo del reloj se anula.
export const etiquetaQuitar = (r) => (r.anulado ? "Restaurar" : r.origen === "manual" ? "Quitar" : "Anular checada");

// Texto bajo la hora: «reloj», «reloj: 9:18 a.m.» o «agregado».
export function origenTexto(r, lado = "ini") {
  if (r.origen === "manual") return lado === "ini" ? "agregado" : "";
  const o = lado === "ini" ? r.oIni : r.oFin;
  const v = lado === "ini" ? r.ini : r.fin;
  if (lado === "fin" && o == null) return v == null ? "" : "reloj: sin salida";
  if (o === v) return lado === "ini" ? "reloj" : "";
  return `reloj: ${hora12Txt(aHHMM(o))}`;
}

// ——— Estado del día sin checadas ———
const num = (v) => Number(v ?? 0);
// Tipos del catálogo para la fila sin checadas. «sinHoras»: no vino (falta, vacaciones, incapacidad…), se guarda directo.
// «conHoras»: vino con permiso (cuenta como asistencia: visita al médico, entrada después de tiempo, salida antes…):
// abre el reloj con ese motivo para poner sus horas. Fuera: «Cerrado por sistema» y «Asistencia» a secas.
const SISTEMA = /cerrado por sistema|^\W*asistencia\W*$/i;
export function tiposEstadoDia(tiposPermiso) {
  return gruposEstadoDia(tiposPermiso).sinHoras;
}
export function gruposEstadoDia(tiposPermiso) {
  const lista = (Array.isArray(tiposPermiso) ? tiposPermiso : tiposPermiso?.tiposPermiso ?? [])
    .filter((t) => !num(t.borrado) && !num(t.eliminado) && !SISTEMA.test(String(t.nombre ?? "").trim()));
  return {
    sinHoras: lista.filter((t) => num(t.cuenta_como_asistencia) === 0),
    conHoras: lista.filter((t) => num(t.cuenta_como_asistencia) === 1),
  };
}
// Qué pide el tipo (igual que el servidor, relojDia.claseTipo): «folio» (incapacidad); nada para falta injustificada,
// sin checar, descanso, festivo o vacaciones; «motivo» para lo demás (falta justificada, suspensión, permisos…).
export function requisitoEstado(tipo) {
  const n = String(`${tipo?.clave ?? ""} ${tipo?.nombre ?? ""}`).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (num(tipo?.descuenta_vacaciones) === 1) return null;
  if (/descanso/.test(n) || num(tipo?.es_festivo) === 1 || /festivo/.test(n)) return null;
  if (/incapacidad/.test(n)) return "folio";
  if (/injustificada|sin checar/.test(n) || /^\W*falta\W*$/.test(String(tipo?.nombre ?? "").toLowerCase())) return null;
  return "motivo";
}
export const checadasVivas = (fila) => (fila?.checadas_vivas != null ? Number(fila.checadas_vivas) : fila?.entrada || fila?.salida ? 1 : 0);
const sinSalida = (fila) => fila?.estado_calculado?.clave === "sinsalida" || (Boolean(fila?.entrada) && !fila?.salida);

// Barra masiva: a quién aplica cada acción y por qué se omite el resto.
export function planMasivo(filas, accion) {
  const aplican = [], omitidos = [];
  for (const f of filas) {
    const vivasN = checadasVivas(f);
    if (accion === "estado") {
      if (vivasN === 0) aplican.push(f); else omitidos.push({ fila: f, razon: "tiene checadas: se corrige en su reloj" });
    } else if (vivasN === 0 || sinSalida(f)) aplican.push(f);
    else omitidos.push({ fila: f, razon: "ya tiene entrada y salida" });
  }
  return { aplican, omitidos };
}

// ——— Lo que se ve en la fila (lo calcula el servidor; respaldo con los campos de siempre) ———
// Claves del servidor: ok | retardo | antes | just | sinsalida | falta (el descanso sale como ok).
const PILLS = {
  ok: "bg-emerald-50 text-emerald-700", retardo: "bg-amber-50 text-amber-800", antes: "bg-rose-50 text-rose-700",
  sinsalida: "bg-amber-50 text-amber-800", just: "bg-violet-50 text-violet-700", falta: "bg-rose-50 text-rose-700",
};
export const claseEstado = (clave) => PILLS[String(clave ?? "")] ?? "bg-slate-100 text-slate-600";
export function estadoFila(fila) {
  if (fila?.estado_calculado?.texto) return { texto: fila.estado_calculado.texto, clave: fila.estado_calculado.clave };
  const e = fila?.estadoAsistencia;
  const clave = { Presente: "ok", Tardanza: "retardo", Ausente: "falta", Vacaciones: "just", Permiso: "just" }[e] ?? "";
  return { texto: e || fila?.tipo_registro_nombre || "—", clave };
}
// Lo que calculó el servidor (GET /:id/reloj → resumen) con la forma de resumen(); null si no vino.
export function resumenServidor(r) {
  if (!r || r.minutos_trabajados === undefined) return null;
  const e = r.estado ?? r.estado_calculado ?? {};
  return { trabajadas: Number(r.minutos_trabajados ?? 0), comida: Number(r.minutos_comida ?? 0), extraAutorizada: Number(r.minutos_extra ?? 0),
    extraPorAutorizar: Number(r.minutos_extra_por_autorizar ?? 0), abierto: Boolean(r.abierto), hayRegs: Number(r.checadas_vivas ?? 0) > 0,
    programadas: r.minutos_programados ?? null,
    estado: { texto: e.texto ?? "—", clave: e.clave ?? "" } };
}
export function diaFila(fila) {
  if (fila?.dia?.tipo) return fila.dia;
  if (Number(fila?.es_festivo)) return { tipo: "festivo_oficial", nombre: "Festivo", pago: "" };
  if (Number(fila?.es_domingo)) return { tipo: "domingo", nombre: "Domingo", pago: "" };
  return { tipo: "normal", nombre: "Día normal", pago: "" };
}
// Columna «Horas extra»: por autorizar (botón que abre el reloj; incluye la que falta separar), autorizadas o nada.
// minutos_extra del servidor cuenta solo la extra autorizada.
export function extraFila(fila) {
  const pend = Number(fila?.minutos_extra_por_autorizar ?? 0);
  const aut = Number(fila?.minutos_extra ?? 0);
  if (pend > 0) return { tipo: "pendiente", texto: `${durTexto(pend)} por autorizar` };
  if (aut > 0) return { tipo: "autorizada", texto: `${durTexto(aut)} autorizadas` };
  return { tipo: "nada", texto: "—" };
}

// Estado como texto con icono, al estilo de la columna «Tipo» de antes («✅ Asistencia», «❌ Sin Checar»), sin cuadro.
// Si el texto ya trae su emoji (nombres del catálogo), no se le pone otro.
const ICONOS_ESTADO = { ok: "✅", falta: "❌", retardo: "🕒", antes: "🕒", sinsalida: "⚠️", just: "📝" };
export function textoConIcono(texto, clave) {
  const t = String(texto ?? "").trim();
  if (!t || /^\p{Extended_Pictographic}/u.test(t)) return t;
  const icono = ICONOS_ESTADO[String(clave ?? "")];
  return icono ? `${icono} ${t}` : t;
}
