// Monitor: tarjetas, grupos y la razón en texto de cada fila, sobre los estados que calcula hoy.mjs (estadoHoy).
// Sin React ni zona del navegador. Probado en scripts/test-monitor.mjs.
//
// Cada persona cae en UN grupo, en este orden de precedencia:
//   1. Requiere atención: lo urgente de estadoHoy (faltó, no ha llegado, salió antes, comida excedida) y llegó tarde.
//   2. Con permiso: permiso de día (permiso, vacaciones, incapacidad) o permiso por horas aprobado para hoy.
//   3. Saldrán tarde: horas extra autorizadas para hoy y todavía no sale.
//   4. En comida → En jornada → Por entrar → Ya salieron → No laboran hoy.
// Las tarjetas cuentan por estado, no por grupo: quien llegó tarde y ya salió sigue en «Llegaron tarde».
import { hora12 } from "../hora12.mjs";
import { duracionHoy, ETIQUETA, horaDe } from "./hoy.mjs";
import { formatearMinutos } from "./jornada.mjs";

export const PERMISO_DIA = ["permiso", "vacaciones", "incapacidad"];
const PENDIENTE_DE_SALIR = ["trabajando", "en_comida", "por_entrar"];

export const conPermisoDia = (r) => PERMISO_DIA.includes(r.estado);
export const conPermisoHoras = (r) => r.dia?.tipo?.clase === "normal" && (r.dia.permisos?.length ?? 0) > 0;
export const conPermiso = (r) => conPermisoDia(r) || conPermisoHoras(r);
export const saldraTarde = (r) => r.salidaExtraHasta != null && PENDIENTE_DE_SALIR.includes(r.estado);
const llegoTardeTrabajando = (r) => r.estado === "trabajando" && r.llegoTarde != null;

const GRUPO_POR_ESTADO = { comida: "comida", trabajando: "jornada", proximos: "proximos", salieron: "salieron", no_laboran: "no_laboran" };

export function grupoMonitor(r) {
  if (r.grupo === "atencion" || llegoTardeTrabajando(r)) return "atencion";
  if (conPermiso(r)) return "permiso";
  if (saldraTarde(r)) return "saldran_tarde";
  return GRUPO_POR_ESTADO[r.grupo] ?? "no_laboran";
}

// `limite`: filas visibles antes de «ver todos» (grupos largos y poco urgentes). `plegado`: empieza cerrado.
export const GRUPOS_MONITOR = [
  { clave: "atencion", titulo: "Requiere atención" },
  { clave: "permiso", titulo: "Con permiso" },
  { clave: "saldran_tarde", titulo: "Saldrán tarde" },
  { clave: "comida", titulo: "En comida" },
  { clave: "jornada", titulo: "En jornada", limite: 8 },
  { clave: "proximos", titulo: "Por entrar" },
  { clave: "salieron", titulo: "Ya salieron", limite: 8 },
  { clave: "no_laboran", titulo: "No laboran hoy", plegado: true },
];

// Dentro de «Requiere atención»: faltó, no ha llegado, salió antes, comida excedida y al final llegó tarde.
const prioridadDe = (r) => (llegoTardeTrabajando(r) ? 4 : r.prioridad ?? 0);

export function agruparMonitor(resultados, nombreDe = () => "") {
  const porNombre = (a, b) => String(nombreDe(a)).localeCompare(String(nombreDe(b)), "es");
  const enGrupo = new Map(GRUPOS_MONITOR.map((g) => [g.clave, []]));
  for (const r of resultados) enGrupo.get(grupoMonitor(r)).push(r);
  return GRUPOS_MONITOR.map((g) => ({
    ...g,
    filas: enGrupo.get(g.clave).sort((a, b) => prioridadDe(a) - prioridadDe(b) || (a.orden ?? 0) - (b.orden ?? 0) || porNombre(a, b)),
  })).filter((g) => g.filas.length);
}

export const TARJETAS_MONITOR = [
  { clave: "jornada", titulo: "En jornada", es: (r) => r.estado === "trabajando" || r.estado === "en_comida" },
  { clave: "tarde", titulo: "Llegaron tarde", es: (r) => r.llegoTarde != null },
  { clave: "no_han_llegado", titulo: "No han llegado", es: (r) => r.estado === "no_ha_llegado" || r.estado === "falto" },
  { clave: "permiso", titulo: "Con permiso", es: conPermiso },
  { clave: "en_comida", titulo: "En comida", es: (r) => r.estado === "en_comida" },
  { clave: "saldran_tarde", titulo: "Saldrán tarde", es: saldraTarde },
  { clave: "por_entrar", titulo: "Por entrar", es: (r) => r.estado === "por_entrar" },
];

const minutosExtra = (r) => r.dia?.salidaExtra?.minutos ?? (r.salidaExtraHasta != null && r.salidaProg != null ? r.salidaExtraHasta - r.salidaProg : 0);

export function resumenMonitor(resultados) {
  const cuenta = Object.fromEntries(TARJETAS_MONITOR.map((t) => [t.clave, resultados.filter(t.es).length]));
  const tardes = resultados.filter((r) => r.llegoTarde != null);
  const porEntrar = resultados.filter((r) => r.estado === "por_entrar").map((r) => r.permisoLlegada ?? r.entradaProg).filter((m) => m != null);
  return {
    cuenta,
    programadosHoy: resultados.filter((r) => r.grupo !== "no_laboran").length,
    promedioTarde: tardes.length ? Math.round(tardes.reduce((t, r) => t + r.llegoTarde, 0) / tardes.length) : null,
    faltaron: resultados.filter((r) => r.estado === "falto").length,
    permisoHoras: resultados.filter(conPermisoHoras).length,
    permisoDia: resultados.filter(conPermisoDia).length,
    comidaExcedida: resultados.filter((r) => r.estado === "en_comida" && r.sePasoComida).length,
    minutosExtra: resultados.filter(saldraTarde).reduce((t, r) => t + Math.max(0, minutosExtra(r)), 0),
    proximaEntrada: porEntrar.length ? Math.min(...porEntrar) : null,
  };
}

// Línea de abajo de cada tarjeta.
export function pieTarjeta(clave, s) {
  switch (clave) {
    case "jornada": return `de ${s.programadosHoy} programados`;
    case "tarde": return s.promedioTarde != null ? `promedio +${formatearMinutos(s.promedioTarde)}` : "nadie llegó tarde";
    case "no_han_llegado": return s.faltaron ? `${s.faltaron} ya a media jornada` : "ya pasó su hora";
    case "permiso": return s.permisoHoras || s.permisoDia ? `${s.permisoHoras} por horas · ${s.permisoDia} todo el día` : "nadie con permiso";
    case "en_comida": return s.comidaExcedida ? `${s.comidaExcedida} ${s.comidaExcedida === 1 ? "excedida" : "excedidas"}` : "nadie se ha pasado";
    case "saldran_tarde": return s.minutosExtra ? `${duracionHoy(s.minutosExtra)} extra autorizadas` : "horas extra autorizadas";
    case "por_entrar": return s.proximaEntrada != null ? `la próxima a las ${horaDe(s.proximaEntrada)}` : "nadie más hoy";
    default: return "";
  }
}

const conMotivo = (texto, motivo) => (motivo ? `${texto} · ${motivo}` : texto);
const rangoHoras = (inicio, fin) => `${hora12(inicio)}–${hora12(fin)}`;

export function textoPermisoHoras(p) {
  if (p.tipo === "llega_tarde") return conMotivo(`Permiso para llegar a las ${hora12(p.fin)}`, p.motivo);
  if (p.tipo === "sale_antes") return conMotivo(`Permiso para salir a las ${hora12(p.inicio)}`, p.motivo);
  return conMotivo(p.inicio && p.fin ? `Permiso ${rangoHoras(p.inicio, p.fin)}` : "Permiso por horas", p.motivo);
}

// La razón de la fila en una frase («Llegó 18 min tarde», «En comida 52 de 30 min»…) y su tono de color.
export function razonMonitor(r) {
  const grupo = grupoMonitor(r);
  if (grupo === "atencion") return razonAtencion(r);
  if (grupo === "permiso") {
    if (conPermisoDia(r)) return { texto: r.dia.tipo?.nombre || ETIQUETA[r.estado], tono: "azul" };
    const textos = r.dia.permisos.map(textoPermisoHoras).join(" · ");
    return { texto: r.estado === "ya_salio" ? `${textos} · salió ${horaDe(r.ultimaSalida)}` : textos, tono: "azul" };
  }
  if (grupo === "saldran_tarde") {
    const extra = r.dia.salidaExtra;
    return { texto: conMotivo(`Saldrá ${horaDe(r.salidaExtraHasta)} · ${duracionHoy(minutosExtra(r))} extra`, extra?.motivo), tono: "azul" };
  }
  switch (r.estado) {
    case "en_comida":
      return { texto: `En comida ${r.llevaComida}${r.minutosComida != null ? ` de ${r.minutosComida}` : ""} min`, tono: "amarillo" };
    case "trabajando": {
      const base = r.dia.tipo?.clase === "normal" && r.programados != null ? "A tiempo" : "Trabajando";
      if (r.debiaSalirHace != null) return { texto: `${base} · debía salir hace ${formatearMinutos(r.debiaSalirHace)}`, tono: "naranja" };
      return { texto: base, tono: "verde" };
    }
    case "por_entrar": {
      const entra = horaDe(r.permisoLlegada ?? r.entradaProg);
      if (r.faltan > 0) return { texto: `Entra ${entra} · en ${formatearMinutos(r.faltan)}`, tono: "neutro" };
      return { texto: r.faltan === 0 ? `Entra ${entra} · ahora` : `En su tolerancia · entra ${entra}`, tono: "neutro" };
    }
    case "ya_salio":
      return { texto: `Salió ${horaDe(r.ultimaSalida)}`, tono: "gris" };
    case "sin_horario":
      return { texto: "Sin horario hoy", tono: "neutro" };
    default:
      return { texto: r.dia.tipo?.nombre || ETIQUETA[r.estado] || "No labora hoy", tono: "neutro" };
  }
}

function razonAtencion(r) {
  switch (r.estado) {
    case "falto":
      return { texto: "Faltó · sin checadas a media jornada", tono: "rojo" };
    case "no_ha_llegado":
      return { texto: `No ha llegado · debía entrar hace ${formatearMinutos(r.debiaEntrarHace)}`, tono: "naranja" };
    case "salio_antes":
      return { texto: `Salió antes · ${horaDe(r.ultimaSalida)} · faltaron ${formatearMinutos(r.faltaron)}`, tono: "rosa" };
    case "en_comida":
      return { texto: `En comida ${r.llevaComida}${r.minutosComida != null ? ` de ${r.minutosComida}` : ""} min`, tono: "rojo" };
    default:
      return { texto: `Llegó ${formatearMinutos(r.llegoTarde)} tarde`, tono: "naranja" };
  }
}

// Horario programado «9:00 a.m.–6:00 p.m.» (minutos absolutos de estadoHoy).
export const horarioDe = (r) => (r.entradaProg != null ? `${horaDe(r.entradaProg)}–${horaDe(r.salidaProg)}` : "Sin horario");
