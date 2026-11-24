// Monitor › «Línea del día» y «Lista» (maqueta aprobada Monitor.dc.html): lo que cada vista agrega sobre el Tablero.
// Los estados (hoy.mjs → estadoHoy), el orden de urgencia y los textos de cada persona (tablero.mjs → columnasTablero,
// fichaTablero) se reutilizan tal cual; aquí solo el eje de horas, la posición de cada tramo y de «ahora», el chip de
// estado y la vista elegida. Sin React ni zona del navegador. Probado en scripts/test-monitor.mjs.
//
// Escala: minutos absolutos de la hora de pared de la empresa (los mismos de estadoHoy). Un turno nocturno de ayer
// queda en minutos negativos respecto a hoy y el eje lo incluye sin trucos (las marcas muestran la hora del día).
import { marcaEnMinutos } from "../fechaHora.mjs";
import { describir, horaDe, VENTANA_COMIDA_ANTES } from "./hoy.mjs";
import { columnasTablero, COLUMNAS_CELULAR, enHoraExtra, enTurno } from "./tablero.mjs";
import { formatearMinutos } from "./jornada.mjs";

const HORA = 60;

// —— Vista elegida (selector Tablero | Línea del día | Lista) ——
export const VISTAS_MONITOR = [
  { clave: "tablero", titulo: "Tablero" },
  { clave: "linea", titulo: "Línea del día" },
  { clave: "lista", titulo: "Lista" },
];
export const VISTA_POR_DEFECTO = "tablero";
// Lo guardado en localStorage (puede venir vacío, viejo o manipulado) → una vista válida.
export const vistaValida = (valor) => (VISTAS_MONITOR.some((v) => v.clave === valor) ? valor : VISTA_POR_DEFECTO);
// Una elección por usuario (mismo navegador, varias cuentas de RH).
export const claveVistaMonitor = (idUsuario) => `adamia.monitor.vista.${idUsuario ?? "anonimo"}`;

// —— Orden de urgencia (el de las secciones del Tablero en celular) ——
// No han llegado → En comida → Trabajando → Por entrar → Ya salieron → Descanso; dentro de cada una, el orden del Tablero.
export function ordenUrgencia(resultados, nombreDe = () => "") {
  const porClave = new Map(columnasTablero(resultados, nombreDe).map((c) => [c.clave, c.personas]));
  return COLUMNAS_CELULAR.flatMap((c) => porClave.get(c.clave) ?? []);
}

// —— Chip de estado (columna derecha de la Línea y de la Lista) ——
// Mismos nombres que la vista de hoy (describir de hoy.mjs), con «Hora extra» del Tablero y sin repetir «Llegó tarde»
// (ya va en los chips). Tonos de tablero.mjs.
export function estadoVista(r, ahora) {
  if (enHoraExtra(r, ahora)) return { texto: "Hora extra", tono: "violeta" };
  if (r.estado === "trabajando")
    return r.debiaSalirHace != null ? { texto: "Sin checar salida", tono: "rojo" } : { texto: "Trabajando", tono: "azul" };
  const { chip } = describir(r);
  const tono =
    {
      en_comida: r.sePasoComida ? "rojo" : "amarillo",
      ya_salio: "gris",
      salio_antes: "rojo",
      por_entrar: "gris",
      no_ha_llegado: "rojo",
      falto: "rojo",
    }[r.estado] ?? "violeta";
  return { texto: chip, tono };
}

// Horario programado en texto («9:00 a.m.–6:00 p.m.»), para la Lista.
export function horarioVista(r) {
  if (r.entradaProg == null || r.salidaProg == null || r.dia?.tipo?.clase !== "normal") return "Sin horario hoy";
  return `${horaDe(r.entradaProg)}–${horaDe(r.salidaProg)}`;
}

// —— Eje de horas ——
const programaDe = (r) => r.dia?.tipo?.clase === "normal" && r.entradaProg != null && r.salidaProg != null;
const tramosCerrados = (r) =>
  (r.dia?.tramos ?? [])
    .map((t) => ({ desde: marcaEnMinutos(t.entrada), hasta: marcaEnMinutos(t.salida) }))
    .filter((t) => t.desde != null && t.hasta != null && t.hasta > t.desde)
    .sort((a, b) => a.desde - b.desde);
const abiertoDe = (r) => (r.dia?.hayAbierto ? marcaEnMinutos(r.dia.abierto) : null);

// Desde la entrada (programada o real) más temprana hasta la salida (programada, autorizada o real) más tardía o la hora
// actual, con `margen` minutos de cada lado, redondeado a la hora. Marcas cada 1, 2 o 3 h según lo largo del día.
// → { desde, hasta, paso, horas: [{ abs, texto, pos }] }
export function ejeLineaDia(resultados, ahora, { margen = 30 } = {}) {
  const puntos = ahora != null ? [ahora] : [];
  for (const r of resultados ?? []) {
    if (programaDe(r)) puntos.push(r.entradaProg, r.salidaProg);
    if (r.salidaExtraHasta != null) puntos.push(r.salidaExtraHasta);
    for (const t of tramosCerrados(r)) puntos.push(t.desde, t.hasta);
    const abierto = abiertoDe(r);
    if (abierto != null) puntos.push(abierto);
  }
  const validos = puntos.filter(Number.isFinite);
  if (!validos.length) return null;
  let desde = Math.floor((Math.min(...validos) - margen) / HORA) * HORA;
  let hasta = Math.ceil((Math.max(...validos) + margen) / HORA) * HORA;
  if (hasta - desde < 4 * HORA) {
    // un día casi vacío: al menos 4 h para que se lea
    const falta = 4 * HORA - (hasta - desde);
    desde -= Math.floor(falta / 2 / HORA) * HORA;
    hasta = desde + 4 * HORA;
  }
  const largo = hasta - desde;
  const paso = largo <= 12 * HORA ? HORA : largo <= 24 * HORA ? 2 * HORA : 3 * HORA;
  const horas = [];
  for (let m = Math.ceil(desde / paso) * paso; m <= hasta; m += paso) {
    horas.push({ abs: m, texto: horaDe(m).replace(":00", ""), pos: posicionEnEje(m, { desde, hasta }) });
  }
  return { desde, hasta, paso, horas };
}

// Minuto absoluto → % del eje (0–100, recortado a los bordes). Sin eje o sin minuto → null.
export function posicionEnEje(abs, eje) {
  if (abs == null || !eje || eje.hasta <= eje.desde) return null;
  const p = ((abs - eje.desde) / (eje.hasta - eje.desde)) * 100;
  return Math.round(Math.min(100, Math.max(0, p)) * 100) / 100;
}
const caja = (desde, hasta, eje) => {
  const izq = posicionEnEje(desde, eje);
  return { izq, ancho: Math.max(0, Math.round((posicionEnEje(hasta, eje) - izq) * 100) / 100) };
};

// ¿El hueco entre dos tramos fue la comida? Botón «Salir a comer» (salida a ±1 min) o salida dentro de la comida del
// horario (o hasta 30 min antes): el mismo criterio que estadoHoy.
function esComida(r, salida) {
  const c = r.dia?.comida;
  if (c?.salida && Math.abs(marcaEnMinutos(c.salida) - salida) <= 1) return true;
  if (r.dia?.tipo?.clase !== "normal") return false;
  const desde = enTurno(r, r.dia.comidaSaleProg);
  const hasta = enTurno(r, r.dia.comidaRegresaProg);
  return desde != null && hasta != null && hasta > desde && salida >= desde - VENTANA_COMIDA_ANTES && salida <= hasta;
}

const TITULO_TRAMO = {
  trabajo: "Trabajó",
  extra: "Hora extra",
  sin_salida: "Sin checar salida",
  comida: "Comida",
  comida_excedida: "Se pasó de comida",
};

// Barra de una persona sobre el eje: lo programado (tenue) y lo real encima.
// → { programada: { desde, hasta, izq, ancho } | null, extraAutorizada: {…} | null,
//     tramos: [{ tipo, tono, desde, hasta, izq, ancho, titulo }], ahora: % }
// Tipos: trabajo (tono del estado: azul si sigue en su jornada, gris si ya salió), extra (después de su salida
// programada, violeta), sin_salida (🧭 pasó el aviso «debía salir» sin checar: no se presume hora extra, rojo),
// comida (ámbar) y comida_excedida (lo que pasó de su comida, rojo).
export function lineaDia(r, eje, ahoraArg) {
  const ahora = ahoraArg ?? r.ahora ?? null;
  const conHorario = programaDe(r);
  const programada = conHorario ? { desde: r.entradaProg, hasta: r.salidaProg, ...caja(r.entradaProg, r.salidaProg, eje) } : null;
  const extraAutorizada =
    conHorario && r.salidaExtraHasta != null && r.salidaExtraHasta > r.salidaProg
      ? { desde: r.salidaProg, hasta: r.salidaExtraHasta, ...caja(r.salidaProg, r.salidaExtraHasta, eje) }
      : null;
  const tonoTrabajo = ["trabajando", "en_comida"].includes(r.estado) ? "azul" : "gris";

  const trabajo = tramosCerrados(r);
  const abierto = abiertoDe(r);
  if (abierto != null && ahora != null && ahora > abierto) trabajo.push({ desde: abierto, hasta: ahora, abierto: true });
  trabajo.sort((a, b) => a.desde - b.desde);

  const tramos = [];
  const poner = (tipo, desde, hasta, enCurso = false) => {
    if (hasta <= desde) return;
    const tono = { trabajo: tonoTrabajo, extra: "violeta", sin_salida: "rojo", comida: "ambar", comida_excedida: "rojo" }[tipo];
    const fin = enCurso ? "ahora" : horaDe(hasta);
    const nombre = tipo === "trabajo" && enCurso ? "Trabajando" : TITULO_TRAMO[tipo];
    tramos.push({
      tipo,
      tono,
      desde,
      hasta,
      ...caja(desde, hasta, eje),
      titulo: `${nombre} ${horaDe(desde)}–${fin} · ${formatearMinutos(hasta - desde)}`,
    });
  };
  const comida = (desde, hasta, enCurso = false) => {
    const de = Number(r.dia?.minutosComida) || null;
    if (de && hasta - desde > de) {
      poner("comida", desde, desde + de);
      poner("comida_excedida", desde + de, hasta, enCurso);
    } else poner("comida", desde, hasta, enCurso);
  };
  // Trabajo partido en su salida programada: lo de después es hora extra (o, si no checó salida, «sin salida»).
  const limiteExtra = r.salidaExtraHasta ?? r.salidaProg;
  for (const [i, t] of trabajo.entries()) {
    const vivo = Boolean(t.abierto);
    if (!conHorario || t.hasta <= r.salidaProg) poner("trabajo", t.desde, t.hasta, vivo);
    else {
      const inicioExtra = Math.max(t.desde, r.salidaProg);
      poner("trabajo", t.desde, inicioExtra);
      if (vivo && r.debiaSalirHace != null) {
        const corte = Math.min(t.hasta, Math.max(inicioExtra, limiteExtra));
        poner("extra", inicioExtra, corte);
        poner("sin_salida", corte, t.hasta, true);
      } else poner("extra", inicioExtra, t.hasta, vivo);
    }
    const sig = trabajo[i + 1];
    if (sig && sig.desde > t.hasta && esComida(r, t.hasta)) comida(t.hasta, sig.desde);
  }
  if (r.estado === "en_comida" && r.salioAComer != null && ahora != null) comida(r.salioAComer, Math.max(r.salioAComer, ahora), true);
  tramos.sort((a, b) => a.desde - b.desde);
  return { programada, extraAutorizada, tramos, ahora: posicionEnEje(ahora, eje) };
}
