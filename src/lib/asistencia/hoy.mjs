// Monitor: UN estado por persona a esta hora, en orden de prioridad. Tarjetas, grupos y textos de fila en monitor.mjs.
// Funciones puras (sin React ni zona del navegador). Probado en scripts/test-asistencias-hoy.mjs.
//
// Escala de tiempo: «minutos absolutos» de la hora de pared en la zona de la empresa (fechaHora.minutosAbsolutos):
// el día de hoy a las 09:00 y la checada de ayer a las 22:00 se comparan restando. Así funcionan los turnos nocturnos
// (la salida programada menor o igual a la entrada es al día siguiente) y los días con varios tramos.
//
// Orden de precedencia (cada persona queda en UNO solo):
//   1. Descanso / Vacaciones / Permiso de día / Incapacidad / Festivo / sin horario, SIN checadas → «No laboran hoy».
//      (Si checó en su día de descanso, cuenta lo que checó, sin retardo ni «salió antes»: no tenía horario.)
//   2. Sin checadas: Faltó (ya pasó la mitad de su jornada) → No ha llegado (pasó entrada + tolerancia) → Por entrar.
//      Un permiso «llega tarde» aprobado corre la entrada hasta su hora_fin (y la mitad de la jornada con ella).
//   3. Con checadas: tramo abierto → Trabajando (con «Llegó tarde +N» si su primera entrada pasó la tolerancia).
//      Todo cerrado: si la última salida fue a comer (botón «Salir a comer», o una salida dentro de la comida de su
//      horario) y aún no regresa → En comida (urgente si se pasó). Si ya pasó su hora de salida, esa salida cuenta
//      como la final. Si no: Salió antes (urgente) o Ya salió (salió a su hora, o con permiso «sale antes» /
//      «sale y regresa» que la cubre).
import { fechaISO, hhmm, horaAMinutos, marcaEnMinutos, minutosAbsolutos, minutosAHora, sinAcentos, sumarDias } from "../fechaHora.mjs";
import { hora12 } from "../hora12.mjs";
import { formatearMinutos, minutosComidaHorario, minutosProgramados } from "./jornada.mjs";

const MIN_DIA = 1440;
export const VENTANA_COMIDA_ANTES = 30; // una salida hasta 30 min antes de la comida del horario cuenta como comida
export const AVISO_SIN_SALIDA = 15; // «debía salir hace…» 15 min después de su salida programada

export const NO_LABORAN = ["descanso", "vacaciones", "permiso", "incapacidad", "festivo", "sin_horario"];

// Tipo de registro del día → clase. «Sin checar» y «Asistencia» son días normales de trabajo.
export function tipoDelDia(registro) {
  const texto = sinAcentos(`${registro?.tipo_registro_clave ?? ""} ${registro?.tipo_registro_nombre ?? ""}`);
  const nombre = String(registro?.tipo_registro_nombre ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim() || null;
  if (/incapacidad/.test(texto)) return { clase: "incapacidad", nombre: nombre ?? "Incapacidad" };
  if (/vacacion/.test(texto)) return { clase: "vacaciones", nombre: nombre ?? "Vacaciones" };
  if (/descanso/.test(texto)) return { clase: "descanso", nombre: nombre ?? "Descanso" };
  if (/festivo/.test(texto)) return { clase: "festivo", nombre: nombre ?? "Festivo" };
  if (/permiso|licencia/.test(texto)) return { clase: "permiso", nombre: nombre ?? "Permiso de día" };
  return { clase: "normal", nombre };
}

// Registro de /checador/asistencias → día normalizado. `aLocal` convierte una marca de la base («YYYY-MM-DD HH:mm:ss»,
// hora de CDMX) a la hora de pared de la empresa («YYYY-MM-DD HH:mm»); por defecto la deja igual (empresa en CDMX).
export function diaDesdeRegistro(r, aLocal = (v) => v) {
  const local = (v) => (v ? aLocal(v) : null);
  const fecha = fechaISO(r?.fecha);
  const abiertos = Number(r?.tramos_abiertos) || 0;
  const lista = Array.isArray(r?.tramos_checadas) ? r.tramos_checadas : null;
  const conTramos = Boolean(lista && (lista.length || abiertos));
  let tramos;
  let abierto = null;
  let hayAbierto;
  if (conTramos) {
    tramos = lista.map((t) => ({ entrada: local(t.entrada), salida: local(t.salida) }));
    hayAbierto = abiertos > 0;
    // Sin tramos cerrados, el abierto es la entrada del día; si ya hubo tramos, la manda el backend.
    if (hayAbierto) abierto = local(r.entrada_tramo_abierto) ?? (tramos.length ? null : local(r.entrada));
  } else {
    // Sin checadas del reloj (captura manual): la entrada y salida de la asistencia.
    tramos = r?.entrada && r?.salida ? [{ entrada: local(r.entrada), salida: local(r.salida) }] : [];
    hayAbierto = Boolean(r?.entrada && !r?.salida);
    if (hayAbierto) abierto = local(r.entrada);
  }
  const horasFicha = Number(r?.hrs_comida);
  const permisos = Array.isArray(r?.permisos_horas_dia) && r.permisos_horas_dia.length
    ? r.permisos_horas_dia
    : r?.permiso_horas ? [r.permiso_horas] : [];
  return {
    id: r?.id ?? `${r?.id_empleado}-${fecha}`,
    idEmpleado: r?.id_empleado,
    fecha,
    entradaProg: hhmm(r?.hora_entrada_programada),
    salidaProg: hhmm(r?.hora_salida_programada),
    comidaSaleProg: hhmm(r?.hora_salida_comida_programada),
    comidaRegresaProg: hhmm(r?.hora_regreso_comida_programada),
    programados: minutosProgramados(r),
    minutosComida: r?.comida_checada?.minutos_programados
      ?? minutosComidaHorario(r)
      ?? (Number.isFinite(horasFicha) && horasFicha > 0 ? Math.round(horasFicha * 60) : null),
    toleranciaEntrada: Math.max(0, Number(r?.tolerancia_entrada_min) || 0),
    toleranciaSalida: Math.max(0, Number(r?.tolerancia_salida_min) || 0),
    tipo: tipoDelDia(r),
    tramos,
    hayAbierto,
    abierto,
    comida: r?.comida_checada ? { salida: local(r.comida_checada.salida), regreso: local(r.comida_checada.regreso), minutos: r.comida_checada.minutos ?? null } : null,
    permisos: permisos
      .filter((p) => ["llega_tarde", "sale_antes", "sale_regresa"].includes(p?.tipo_horas))
      .map((p) => ({ tipo: p.tipo_horas, inicio: hhmm(p.hora_inicio), fin: hhmm(p.hora_fin), motivo: textoOpcional(p.motivo) })),
    salidaExtra: salidaExtraDe(r?.horas_extra_autorizadas_dia),
  };
}

const textoOpcional = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

// Horas extra autorizadas del día («se queda hasta las 20:00»), tal como las manda /checador/asistencias en
// `horas_extra_autorizadas_dia`: { hasta: "HH:mm", minutos?, motivo? } o null.
export function salidaExtraDe(valor) {
  const hasta = hhmm(valor?.hasta);
  if (!hasta) return null;
  const minutos = Number(valor.minutos);
  return { hasta, minutos: Number.isFinite(minutos) && minutos > 0 ? Math.round(minutos) : null, motivo: textoOpcional(valor.motivo) };
}

// Estado del día a la hora `ahora` (minutos absolutos en la zona de la empresa).
export function estadoHoy(dia, ahora) {
  const tieneHorario = dia.entradaProg != null && dia.salidaProg != null;
  const entradaProg = tieneHorario ? minutosAbsolutos(dia.fecha, dia.entradaProg) : null;
  let salidaProg = tieneHorario ? minutosAbsolutos(dia.fecha, dia.salidaProg) : null;
  const nocturno = tieneHorario && salidaProg <= entradaProg;
  if (nocturno) salidaProg += MIN_DIA;
  // Una hora del día dentro del turno (en turno nocturno, la madrugada es del día siguiente).
  const enTurno = (hora) => {
    const m = hora ? minutosAbsolutos(dia.fecha, hora) : null;
    return m != null && nocturno && m < entradaProg ? m + MIN_DIA : m;
  };
  const normal = dia.tipo?.clase === "normal" && tieneHorario;
  const programados = tieneHorario ? dia.programados : null;
  const llegaTarde = normal ? dia.permisos.find((p) => p.tipo === "llega_tarde" && p.fin) : null;
  const llegaHasta = llegaTarde ? Math.max(entradaProg, enTurno(llegaTarde.fin)) : null;
  const entradaEsperada = llegaHasta ?? entradaProg;
  let salidaExtraHasta = normal && dia.salidaExtra ? enTurno(dia.salidaExtra.hasta) : null;
  if (salidaExtraHasta != null && salidaExtraHasta <= salidaProg) salidaExtraHasta += MIN_DIA; // pasa de medianoche
  if (salidaExtraHasta != null && salidaExtraHasta - salidaProg >= MIN_DIA) salidaExtraHasta = null; // hora ilegible

  const tramos = dia.tramos
    .map((t) => ({ desde: marcaEnMinutos(t.entrada), hasta: marcaEnMinutos(t.salida) }))
    .filter((t) => t.desde != null && t.hasta != null && t.hasta > t.desde)
    .sort((a, b) => a.desde - b.desde);
  const abierto = dia.hayAbierto ? marcaEnMinutos(dia.abierto) : null;
  const checo = tramos.length > 0 || dia.hayAbierto;
  const base = { dia, entradaProg, salidaProg, programados, permisoLlegada: llegaHasta, salidaExtraHasta };

  if (!checo) {
    if (!normal) return { ...base, estado: dia.tipo?.clase !== "normal" ? dia.tipo.clase : "sin_horario", grupo: "no_laboran" };
    const mitad = entradaEsperada + Math.max(0, salidaProg - entradaEsperada) / 2;
    if (ahora >= mitad) return { ...base, estado: "falto", grupo: "atencion", urgente: true, prioridad: 0, orden: -(ahora - entradaEsperada) };
    if (ahora > entradaEsperada + dia.toleranciaEntrada) {
      const hace = ahora - entradaEsperada;
      return { ...base, estado: "no_ha_llegado", grupo: "atencion", urgente: true, prioridad: 1, debiaEntrarHace: hace, orden: -hace };
    }
    return { ...base, estado: "por_entrar", grupo: "proximos", faltan: entradaEsperada - ahora, orden: entradaEsperada };
  }

  const primeraEntrada = Math.min(...[tramos[0]?.desde, abierto].filter((m) => m != null));
  const cerrados = tramos.reduce((t, x) => t + (x.hasta - x.desde), 0);
  const trabajados = cerrados + (abierto != null ? Math.max(0, ahora - abierto) : 0);
  const retardo = normal && Number.isFinite(primeraEntrada) ? primeraEntrada - entradaEsperada : null;
  const llegoTarde = retardo != null && retardo > dia.toleranciaEntrada ? retardo : null;
  const conChecadas = { ...base, primeraEntrada: Number.isFinite(primeraEntrada) ? primeraEntrada : null, trabajados, llegoTarde };

  if (dia.hayAbierto) {
    // Con horas extra autorizadas, el aviso «debía salir» cuenta desde la hora autorizada y no desde su horario.
    const limite = salidaExtraHasta ?? salidaProg;
    const debiaSalirHace = limite != null && ahora > limite + AVISO_SIN_SALIDA ? ahora - limite : null;
    return { ...conChecadas, estado: "trabajando", grupo: "trabajando", debiaSalirHace, orden: primeraEntrada };
  }

  const ultimaSalida = tramos[tramos.length - 1].hasta;
  const antesDeSuSalida = salidaProg == null || ahora < salidaProg;
  // ¿Salió a comer y no ha regresado?
  const comidaBoton = dia.comida && !dia.comida.regreso && Math.abs(marcaEnMinutos(dia.comida.salida) - ultimaSalida) <= 1;
  const desdeComida = normal ? enTurno(dia.comidaSaleProg) : null;
  const hastaComida = normal ? enTurno(dia.comidaRegresaProg) : null;
  const comidaHorario = desdeComida != null && hastaComida != null && hastaComida > desdeComida
    && ultimaSalida >= desdeComida - VENTANA_COMIDA_ANTES && ultimaSalida <= hastaComida;
  if ((comidaBoton || comidaHorario) && antesDeSuSalida) {
    const lleva = Math.max(0, ahora - ultimaSalida);
    const de = dia.minutosComida ?? null;
    const sePaso = de != null && lleva > de;
    return {
      ...conChecadas, estado: "en_comida", grupo: sePaso ? "atencion" : "comida", urgente: sePaso, prioridad: 3,
      salioAComer: ultimaSalida, llevaComida: lleva, minutosComida: de, sePasoComida: sePaso, orden: ultimaSalida,
    };
  }

  // Salida final.
  const comidaTomada = dia.comida?.regreso
    ? { desde: marcaEnMinutos(dia.comida.salida), hasta: marcaEnMinutos(dia.comida.regreso) }
    : null;
  const salida = { ...conChecadas, ultimaSalida, comidaTomada, diferencia: programados != null ? trabajados - programados : null };
  if (!normal) return { ...salida, estado: "ya_salio", grupo: "salieron", orden: -ultimaSalida };
  // Trabajó todo antes de su entrada programada (p. ej. turno de la tarde que vino en la mañana): lo que le falta
  // es su jornada menos lo trabajado, no «hasta su hora de salida».
  if (ultimaSalida <= entradaProg && programados != null) {
    const fuera = { ...salida, fueraDeHorario: true };
    const falta = Math.max(0, programados - trabajados);
    if (falta <= dia.toleranciaSalida) return { ...fuera, estado: "ya_salio", grupo: "salieron", orden: -ultimaSalida };
    return { ...fuera, estado: "salio_antes", grupo: "atencion", urgente: true, prioridad: 2, faltaron: falta, orden: -falta };
  }
  const limite = salidaProg - dia.toleranciaSalida;
  if (ultimaSalida >= limite) return { ...salida, estado: "ya_salio", grupo: "salieron", orden: -ultimaSalida };
  const cubre = dia.permisos.find((p) => {
    const inicio = enTurno(p.inicio);
    if (inicio == null || ultimaSalida < inicio - dia.toleranciaSalida) return false;
    if (p.tipo === "sale_antes") return true;
    if (p.tipo !== "sale_regresa") return false;
    const fin = enTurno(p.fin);
    // Sale y regresa: cubre mientras dura el permiso (y su tolerancia de regreso), o si termina con su jornada.
    return fin != null && ultimaSalida <= fin && (ahora <= fin + dia.toleranciaEntrada || fin >= limite);
  });
  if (cubre) return { ...salida, estado: "ya_salio", grupo: "salieron", conPermiso: cubre.tipo, orden: -ultimaSalida };
  return { ...salida, estado: "salio_antes", grupo: "atencion", urgente: true, prioridad: 2, faltaron: salidaProg - ultimaSalida, orden: -(salidaProg - ultimaSalida) };
}

// Un día por persona: el turno nocturno de ayer mientras siga (tramo abierto o aún no llega su hora de salida);
// si no, el de hoy. `hoy` = «YYYY-MM-DD» en la zona de la empresa.
export function diasDeHoy(dias, hoy, ahora) {
  const ayer = sumarDias(hoy, -1);
  const porPersona = new Map();
  for (const d of dias) {
    if (d.fecha !== hoy && d.fecha !== ayer) continue;
    const clave = String(d.idEmpleado);
    const previo = porPersona.get(clave) ?? {};
    porPersona.set(clave, { ...previo, [d.fecha === hoy ? "hoy" : "ayer"]: d });
  }
  const elegidos = [];
  for (const { hoy: deHoy, ayer: deAyer } of porPersona.values()) {
    let usarAyer = false;
    if (deAyer?.entradaProg && deAyer.salidaProg && horaAMinutos(deAyer.salidaProg) <= horaAMinutos(deAyer.entradaProg)) {
      const salida = minutosAbsolutos(sumarDias(deAyer.fecha, 1), deAyer.salidaProg);
      usarAyer = deAyer.hayAbierto || ahora < salida;
    }
    const d = usarAyer ? deAyer : deHoy;
    if (d) elegidos.push(d);
  }
  return elegidos;
}

// —— Presentación ——

const minutoDelDia = (abs) => ((Math.round(abs) % MIN_DIA) + MIN_DIA) % MIN_DIA;
export const horaDe = (abs) => (abs == null ? "" : hora12(minutosAHora(minutoDelDia(abs))));

// «2 h 05», «45 min», «8 h» (barra de jornada, como la maqueta).
export function duracionHoy(min, { signo = false } = {}) {
  if (min == null || !Number.isFinite(min)) return "—";
  const a = Math.abs(Math.round(min));
  const t = a < 60 ? `${a} min` : `${Math.floor(a / 60)} h${a % 60 ? ` ${String(a % 60).padStart(2, "0")}` : ""}`;
  if (min < 0 && a) return `−${t}`;
  return signo && a ? `+${t}` : t;
}

export const ETIQUETA = {
  falto: "Faltó", no_ha_llegado: "No ha llegado", por_entrar: "Por entrar", en_comida: "En comida",
  salio_antes: "Salió antes", ya_salio: "Salió", trabajando: "Trabajando",
  descanso: "Descanso", vacaciones: "Vacaciones", permiso: "Permiso de día", incapacidad: "Incapacidad", festivo: "Festivo",
  sin_horario: "Sin horario hoy",
};

// Textos del renglón: { chip, tono (del chip), detalle, detalleTono, resaltado, jornada, avance (0–1) }.
export function describir(r) {
  const tono = {
    falto: "rojo", no_ha_llegado: "naranja", por_entrar: "azul", en_comida: "amarillo", salio_antes: "rosa",
    ya_salio: "gris", trabajando: r.llegoTarde != null ? "naranja" : "verde",
  }[r.estado] ?? "neutro";
  let chip = ETIQUETA[r.estado] ?? r.estado;
  if (NO_LABORAN.includes(r.estado) && r.estado !== "sin_horario" && r.dia.tipo?.nombre) chip = r.dia.tipo.nombre;
  if (r.estado === "trabajando" && r.llegoTarde != null) chip = "Llegó tarde";
  if (r.estado === "en_comida" && r.sePasoComida) chip = "En comida · se pasó";
  if (r.estado === "ya_salio" && r.conPermiso) chip = "Salió con permiso";
  const permisoLlega = r.permisoLlegada != null && r.permisoLlegada > r.entradaProg ? `Permiso hasta ${horaDe(r.permisoLlegada)} · ` : "";
  let detalle = "";
  let detalleTono = "normal";
  let resaltado = null;
  switch (r.estado) {
    case "falto":
      detalle = `${permisoLlega}Sin checadas · pasó la mitad de su jornada`;
      break;
    case "no_ha_llegado":
      detalle = `${permisoLlega}Debía entrar hace ${formatearMinutos(r.debiaEntrarHace)}`;
      detalleTono = "naranja";
      break;
    case "por_entrar":
      detalle = r.faltan > 0
        ? `${permisoLlega ? "Llega con permiso" : "Entra"} ${horaDe(r.permisoLlegada ?? r.entradaProg)} · en ${formatearMinutos(r.faltan)}`
        : r.faltan === 0
          ? `Entra ${horaDe(r.permisoLlegada ?? r.entradaProg)} · ahora`
          : `${permisoLlega}En su tolerancia · debía entrar hace ${formatearMinutos(-r.faltan)}`;
      break;
    case "en_comida":
      detalle = `Salió a comer ${horaDe(r.salioAComer)} · lleva ${r.llevaComida}${r.minutosComida != null ? ` de ${r.minutosComida}` : ""} min`;
      detalleTono = r.sePasoComida ? "amarillo" : "normal";
      break;
    case "salio_antes":
      detalle = r.fueraDeHorario
        ? `Checó fuera de su horario · trabajó ${formatearMinutos(r.trabajados)} de ${formatearMinutos(r.programados)}`
        : `Salió ${horaDe(r.ultimaSalida)} · faltaron ${formatearMinutos(r.faltaron)}`;
      detalleTono = "rosa";
      break;
    case "ya_salio": {
      const comida = r.comidaTomada ? ` · comida ${horaDe(r.comidaTomada.desde)}–${horaDe(r.comidaTomada.hasta)}` : "";
      const permiso = r.conPermiso ? ` · con permiso (${r.conPermiso === "sale_antes" ? "sale antes" : "sale y regresa"})` : "";
      detalle = `${horaDe(r.primeraEntrada)} → ${horaDe(r.ultimaSalida)}${comida}${permiso}`;
      break;
    }
    case "trabajando":
      if (r.llegoTarde != null) resaltado = `+${formatearMinutos(r.llegoTarde)}`;
      detalle = `Entró ${horaDe(r.primeraEntrada)}${r.llegoTarde != null ? "" : r.programados != null && r.dia.tipo?.clase === "normal" ? " · a tiempo" : ""}`;
      if (r.debiaSalirHace != null) detalle += ` · debía salir hace ${formatearMinutos(r.debiaSalirHace)}`;
      break;
    default:
      detalle = r.estado === "sin_horario" ? "No tiene horario para hoy" : "No labora hoy";
  }
  const conJornada = ["trabajando", "en_comida", "salio_antes", "ya_salio"].includes(r.estado);
  let jornada = null;
  let avance = null;
  if (conJornada) {
    const de = r.programados != null ? ` de ${duracionHoy(r.programados)}` : "";
    const dif = r.estado === "ya_salio" || r.estado === "salio_antes"
      ? r.diferencia ? ` · ${duracionHoy(r.diferencia, { signo: true })}` : ""
      : "";
    jornada = `${duracionHoy(r.trabajados)}${de}${dif}`;
    avance = r.programados ? Math.min(1, Math.max(0, r.trabajados / r.programados)) : null;
  }
  return { chip, tono, detalle, detalleTono, resaltado, jornada, avance };
}

// Hora actual en la zona de la empresa: { hoy: «YYYY-MM-DD», hora: «HH:mm», abs: minutos absolutos }.
export function ahoraEn(zona, fecha = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(fecha).map((x) => [x.type, x.value]));
  const hoy = `${p.year}-${p.month}-${p.day}`;
  const hora = `${String(Number(p.hour) % 24).padStart(2, "0")}:${p.minute}`;
  return { hoy, hora, abs: minutosAbsolutos(hoy, hora) };
}

// «Lunes 23 de noviembre» · corto: «Lun 23 nov».
export function textoFechaHoy(zona, fecha = new Date(), { corto = false } = {}) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("es-MX", {
    timeZone: zona, weekday: corto ? "short" : "long", day: "numeric", month: corto ? "short" : "long",
  }).formatToParts(fecha).map((x) => [x.type, x.value]));
  const dia = String(p.weekday ?? "").replace(/\.$/, "");
  const mes = String(p.month ?? "").replace(/\.$/, "");
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${p.day}${corto ? " " : " de "}${mes}`;
}

// Columnas Entrada / Salida / Comida de la vista Hoy: horas reales del día.
// - Entrada: la primera checada de entrada.
// - Salida: la última salida, solo si ya no tiene un tramo abierto ni está en comida (la salida a comer no es su salida).
// - Comida: solo el tiempo («26 min»), si sigue en comida y si se pasó; las horas en `detalle` (tooltip).
export function checadasDelDia(r) {
  const d = r.dia;
  const h = (v) => (v ? horaDe(marcaEnMinutos(v)) : null);
  const entrada = h(d.tramos[0]?.entrada ?? d.abierto);
  const enComida = Boolean(d.comida?.salida && !d.comida.regreso);
  const salida = d.hayAbierto || enComida || r.estado === "en_comida" ? null : h(d.tramos.at(-1)?.salida);
  // Comida: solo el tiempo y si se pasó (misma celda que Registros: { texto, excedida, enCurso, detalle }).
  let comida = null;
  if (d.comida?.salida) {
    const de = Number(d.minutosComida) || null;
    const detalle = `${h(d.comida.salida)}–${d.comida.regreso ? h(d.comida.regreso) : "…"}${de ? ` · de ${de} min` : ""}`;
    if (enComida) {
      const lleva = r.estado === "en_comida" && r.llevaComida != null ? r.llevaComida : null;
      comida = lleva == null
        ? { texto: "En comida", excedida: false, enCurso: true, detalle }
        : { texto: formatearMinutos(lleva), excedida: Boolean(r.sePasoComida), enCurso: true, detalle };
    } else {
      const minutos = d.comida.minutos == null ? null : Number(d.comida.minutos);
      comida = Number.isFinite(minutos)
        ? { texto: formatearMinutos(minutos), excedida: de != null && minutos > de, enCurso: false, detalle }
        : null;
    }
  }
  return { entrada, salida, comida, enComida };
}
