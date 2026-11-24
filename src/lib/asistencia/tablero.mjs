// Monitor › Tablero (maqueta aprobada Monitor.dc.html, vista «Tablero»): seis columnas por momento del día, siete
// contadores que filtran y el texto de cada tarjeta. Sobre los estados de hoy.mjs (estadoHoy), sin recalcularlos.
// Sin React ni zona del navegador. Probado en scripts/test-monitor.mjs.
//
// `ahora` = minutos absolutos de la hora de pared de la empresa (los mismos de estadoHoy). VistaMonitor lo deja en
// cada resultado (`r.ahora`); si falta, se puede pasar como segundo argumento.
//
// 🧭 Hora extra: sigue trabajando después de su salida programada. Si además ya pasó el aviso «debía salir hace…»
// (15 min después de su salida, o de la hora extra autorizada), no se presume hora extra: se avisa que no ha checado.
import { conPermisoHoras, textoPermisoHoras } from "./monitor.mjs";
import { ETIQUETA, horaDe } from "./hoy.mjs";
import { formatearMinutos } from "./jornada.mjs";
import { minutosAbsolutos } from "../fechaHora.mjs";

const MIN_DIA = 1440;
const SALE_PRONTO = 30; // «sale en …» en su última media hora

const COLUMNA_POR_ESTADO = {
  por_entrar: "por_entrar", trabajando: "trabajando", en_comida: "comida", ya_salio: "salio", salio_antes: "salio",
  no_ha_llegado: "no_ha_llegado", falto: "no_ha_llegado",
};
export const columnaTablero = (r) => COLUMNA_POR_ESTADO[r.estado] ?? "no_laboran";

// Escritorio en este orden; en celular, secciones apiladas por `ordenCelular` (lo urgente primero).
export const COLUMNAS_TABLERO = [
  { clave: "por_entrar", titulo: "Por entrar", ordenCelular: 4 },
  { clave: "trabajando", titulo: "Trabajando", ordenCelular: 3 },
  { clave: "comida", titulo: "En comida", ordenCelular: 2 },
  { clave: "salio", titulo: "Ya salieron", ordenCelular: 5 },
  { clave: "no_ha_llegado", titulo: "No han llegado", ordenCelular: 1 },
  { clave: "no_laboran", titulo: "Descanso / permiso de día", ordenCelular: 6 },
];
export const COLUMNAS_CELULAR = [...COLUMNAS_TABLERO].sort((a, b) => a.ordenCelular - b.ordenCelular);

const ahoraDe = (r, ahora) => ahora ?? r.ahora ?? null;

export function enHoraExtra(r, ahora) {
  const t = ahoraDe(r, ahora);
  return r.estado === "trabajando" && r.salidaProg != null && t != null && t > r.salidaProg && r.debiaSalirHace == null;
}

// Llegó después de su hora de siempre (más tolerancia) pero dentro de un permiso «llega tarde»: no es retardo.
export function tardeConPermiso(r) {
  return r.llegoTarde == null && r.permisoLlegada != null && r.entradaProg != null && r.primeraEntrada != null
    && r.permisoLlegada > r.entradaProg && r.primeraEntrada > r.entradaProg + (r.dia?.toleranciaEntrada ?? 0);
}
export const llegoTardeTablero = (r) => r.llegoTarde != null || tardeConPermiso(r);
// Se fue antes de su hora: sin permiso (salió antes) o con uno que lo cubre.
export const salioAntesTablero = (r) => r.estado === "salio_antes" || (r.estado === "ya_salio" && Boolean(r.conPermiso));

export const CONTADORES_TABLERO = [
  { clave: "trabajando", titulo: "Trabajando", es: (r) => r.estado === "trabajando" },
  { clave: "comida", titulo: "En comida", es: (r) => r.estado === "en_comida" },
  { clave: "salio", titulo: "Ya salieron", es: (r) => columnaTablero(r) === "salio" },
  { clave: "por_entrar", titulo: "Por entrar", es: (r) => r.estado === "por_entrar" },
  { clave: "no_ha_llegado", titulo: "No han llegado", es: (r) => columnaTablero(r) === "no_ha_llegado" },
  { clave: "tarde", titulo: "Llegaron tarde", es: llegoTardeTablero },
  { clave: "permiso", titulo: "Con permiso / día", es: (r) => conPermisoHoras(r) || columnaTablero(r) === "no_laboran" },
];
export const contadorTablero = (clave) => CONTADORES_TABLERO.find((c) => c.clave === clave) ?? null;

// Número, pie y si pide atención (en rojo) de cada contador.
export function resumenTablero(resultados, ahora) {
  const de = (clave) => resultados.filter(contadorTablero(clave).es);
  const pies = {
    trabajando: (xs) => `${xs.filter((r) => enHoraExtra(r, ahora)).length} en hora extra`,
    comida: (xs) => {
      const n = xs.filter((r) => r.sePasoComida).length;
      return n ? `${n} ya se pasó` : "nadie se ha pasado";
    },
    salio: (xs) => `${xs.filter(salioAntesTablero).length} salió antes`,
    por_entrar: (xs) => {
      const proximas = xs.filter((r) => r.faltan > 0).map((r) => r.permisoLlegada ?? r.entradaProg).filter((m) => m != null);
      if (proximas.length) return `el próximo a las ${horaDe(Math.min(...proximas))}`;
      return xs.length ? "ya es su hora" : "nadie más hoy";
    },
    no_ha_llegado: (xs) => (xs.length ? "ya pasó su hora" : "todos llegaron"),
    tarde: (xs) => `${xs.filter(tardeConPermiso).length} con permiso`,
    permiso: (xs) => `${xs.filter(conPermisoHoras).length} por horas · ${xs.filter((r) => columnaTablero(r) === "no_laboran").length} de día`,
  };
  return Object.fromEntries(CONTADORES_TABLERO.map(({ clave }) => {
    const xs = de(clave);
    const alerta = (clave === "no_ha_llegado" && xs.length > 0) || (clave === "comida" && xs.some((r) => r.sePasoComida));
    return [clave, { n: xs.length, pie: pies[clave](xs), alerta }];
  }));
}

// En «Ya salieron» el `orden` de estadoHoy mezcla escalas (salió antes: lo que faltó; ya salió: la hora): aquí, por hora.
const ordenEn = (columna, r) => (columna === "salio" ? -(r.ultimaSalida ?? 0) : r.orden ?? 0);

// Personas de cada columna (con el filtro ya aplicado), por hora: quien entra antes, quien lleva más esperando, etc.
export function columnasTablero(resultados, nombreDe = () => "") {
  const porNombre = (a, b) => String(nombreDe(a)).localeCompare(String(nombreDe(b)), "es");
  const grupos = new Map(COLUMNAS_TABLERO.map((c) => [c.clave, []]));
  for (const r of resultados) grupos.get(columnaTablero(r)).push(r);
  return COLUMNAS_TABLERO.map((c) => ({
    ...c,
    personas: grupos.get(c.clave).sort((a, b) => ordenEn(c.clave, a) - ordenEn(c.clave, b) || porNombre(a, b)),
  }));
}

// Una hora del horario en minutos absolutos; en turno nocturno, la madrugada es del día siguiente.
export const enTurno = (r, hora) => {
  const m = hora && r.dia?.fecha ? minutosAbsolutos(r.dia.fecha, hora) : null;
  if (m == null || r.entradaProg == null || r.salidaProg == null) return m;
  return m < r.entradaProg && m + MIN_DIA <= r.salidaProg ? m + MIN_DIA : m;
};
const dur = (m) => formatearMinutos(Math.max(0, m ?? 0));

// Tarjeta de una persona: { tono (avatar), linea, barra: { avance 0–1, tono } | null, chips: [{ texto, tono }] }.
// Tonos: azul, violeta, amarillo, rojo, naranja, celeste, gris.
export function fichaTablero(r, ahoraArg) {
  const ahora = ahoraDe(r, ahoraArg);
  const chips = [];
  let linea = "";
  let barra = null;
  let tono = "gris";
  const extra = enHoraExtra(r, ahora);
  switch (r.estado) {
    case "trabajando": {
      tono = extra ? "violeta" : "azul";
      const sale = r.salidaProg != null ? ` · sale ${horaDe(r.salidaProg)}` : "";
      linea = `Entró ${horaDe(r.primeraEntrada)}${sale} · lleva ${dur(r.trabajados)}`;
      if (r.programados) barra = { avance: Math.min(1, Math.max(0, r.trabajados / r.programados)), tono };
      if (extra) chips.push({ texto: `Hora extra desde ${horaDe(r.salidaProg)}`, tono: "violeta" });
      else if (r.debiaSalirHace != null) chips.push({ texto: `Sin checar salida · debía salir hace ${dur(r.debiaSalirHace)}`, tono: "rojo" });
      else if (r.salidaProg != null && ahora != null && r.salidaProg - ahora > 0 && r.salidaProg - ahora <= SALE_PRONTO) {
        chips.push({ texto: `Sale en ${dur(r.salidaProg - ahora)}`, tono: "celeste" });
      }
      if (r.salidaExtraHasta != null && !extra && r.debiaSalirHace == null) {
        chips.push({ texto: `Extra autorizada hasta ${horaDe(r.salidaExtraHasta)}`, tono: "violeta" });
      }
      const come = r.dia?.tipo?.clase === "normal" && !r.dia.comida ? enTurno(r, r.dia.comidaSaleProg) : null;
      if (come != null && ahora != null && ahora < come) chips.push({ texto: `Come ${horaDe(come)}`, tono: "amarillo" });
      break;
    }
    case "en_comida": {
      tono = "amarillo";
      const de = r.minutosComida;
      linea = `Salió a comer ${horaDe(r.salioAComer)} · lleva ${dur(r.llevaComida)}${de != null ? ` de ${dur(de)}` : ""}`;
      if (de) barra = { avance: Math.min(1, r.llevaComida / de), tono: r.sePasoComida ? "rojo" : "amarillo" };
      if (r.sePasoComida) chips.push({ texto: `Se pasó ${dur(r.llevaComida - de)}`, tono: "rojo" });
      else if (de != null) chips.push({ texto: `Regresa a las ${horaDe(r.salioAComer + de)}`, tono: "amarillo" });
      break;
    }
    case "ya_salio":
    case "salio_antes":
      tono = "gris";
      linea = `Salió ${horaDe(r.ultimaSalida)} · trabajó ${dur(r.trabajados)}`;
      if (r.estado === "salio_antes") chips.push({ texto: `Salió antes −${dur(r.faltaron)}`, tono: "rojo" });
      else if (r.conPermiso) chips.push({ texto: "Salió antes con permiso", tono: "violeta" });
      break;
    case "por_entrar": {
      tono = "gris";
      const entra = horaDe(r.permisoLlegada ?? r.entradaProg);
      linea = r.faltan > 0 ? `Entra ${entra} · en ${dur(r.faltan)}` : r.faltan === 0 ? `Entra ${entra} · ya es su hora` : `Entra ${entra} · en su tolerancia`;
      if (r.permisoLlegada != null && r.permisoLlegada > r.entradaProg) chips.push({ texto: "Llega tarde con permiso", tono: "violeta" });
      break;
    }
    case "no_ha_llegado":
    case "falto": {
      tono = "rojo";
      const debia = r.permisoLlegada ?? r.entradaProg;
      linea = `Debía entrar ${horaDe(debia)} · van ${dur(ahora != null ? ahora - debia : r.debiaEntrarHace)}`;
      if (r.estado === "falto") linea += " · media jornada";
      chips.push({ texto: "Sin checar", tono: "rojo" });
      break;
    }
    default:
      tono = "violeta";
      linea = r.estado === "sin_horario" ? "Sin horario hoy" : r.dia?.tipo?.nombre || ETIQUETA[r.estado] || "No labora hoy";
  }
  if (r.llegoTarde != null) chips.unshift({ texto: `Llegó tarde +${dur(r.llegoTarde)}`, tono: "naranja" });
  else if (tardeConPermiso(r)) chips.unshift({ texto: "Llegó tarde con permiso", tono: "violeta" });
  // Permiso por horas que no se haya dicho ya en otro chip (con su motivo).
  if (conPermisoHoras(r) && !chips.some((c) => /permiso/i.test(c.texto))) {
    for (const p of r.dia.permisos) chips.push({ texto: textoPermisoHoras(p), tono: "violeta", largo: true });
  }
  return { tono, linea, barra, chips, columna: columnaTablero(r) };
}
