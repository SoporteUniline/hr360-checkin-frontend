// Acciones masivas de Asistencias.
// Cada «plan» recibe las filas elegidas y las opciones del formulario y devuelve:
//   { aplicar: [{ registro, cambios?, comida?, antes, despues }], omitir: [{ registro, motivo }] }
// `cambios` se guarda con PUT /checador/asistencias/:id (mismos campos que la edición de una fila,
// con historial y checada original). `comida` va a POST /checador/asistencias/:id/comida.
// Probado en scripts/test-masivo-asistencia.mjs.
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import {
  DB_TZ, cambiosAutorizar, cambiosNoAutorizar, estadoHorasExtra, salidaProgramada,
} from "./horasExtra.mjs";
import { minutosComidaHorario, sinSalidaAComer } from "./jornada.mjs";
import { hhmm } from "../fechaHora.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

const FORMATO_BD = "YYYY-MM-DD HH:mm:ss";
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const fechaDe = (r) => String(r?.fecha ?? "").slice(0, 10);
const enZona = (valor, zona) => (valor ? dayjs.tz(valor, DB_TZ).tz(zona || DB_TZ) : null);
const local = (valor, zona) => (valor ? enZona(valor, zona).format("HH:mm") : "—");
const aBD = (fecha, hora, zona) => dayjs.tz(`${fecha} ${hora}`, zona || DB_TZ).tz(DB_TZ).format(FORMATO_BD);
const sumarDia = (fecha) => dayjs.utc(fecha).add(1, "day").format("YYYY-MM-DD");
const minutos = (valor) => (valor ? dayjs.tz(valor, DB_TZ).valueOf() / 60000 : null);

function resultado(filas, fn) {
  const aplicar = [], omitir = [];
  for (const registro of filas) {
    const r = fn(registro);
    if (r?.motivo) omitir.push({ registro, motivo: r.motivo });
    else if (r) aplicar.push({ registro, ...r });
  }
  return { aplicar, omitir };
}

// 1) Corregir entrada, salida o ambas: la del horario u otra hora.
//    opciones: { campo: "salida" | "entrada" | "ambas", modo: "horario" | "otra", hora, horaEntrada, horaSalida, zonaDe }
//    Sin checada de entrada no se manda solo la salida: el backend crea la checada del reloj
//    únicamente cuando recibe la entrada (sola o con la salida). Se pide «Entrada y salida».
export function planHora(filas, { campo = "salida", modo = "horario", hora, horaEntrada, horaSalida, zonaDe = () => DB_TZ, ahora = Date.now() } = {}) {
  const otra = modo === "otra";
  if (otra && campo !== "ambas" && !HORA.test(String(hora ?? ""))) return { aplicar: [], omitir: [], error: "Escribe la hora (HH:MM)." };
  if (otra && campo === "ambas" && (!HORA.test(String(horaEntrada ?? "")) || !HORA.test(String(horaSalida ?? "")))) {
    return { aplicar: [], omitir: [], error: "Escribe la hora de entrada y la de salida (HH:MM)." };
  }
  return resultado(filas, (r) => {
    const zona = zonaDe(r);
    const fecha = fechaDe(r);
    const hEntrada = campo === "salida" ? null : otra ? (campo === "ambas" ? horaEntrada : hora) : hhmm(r.hora_entrada_programada);
    if (campo !== "salida" && !hEntrada) return { motivo: "no tiene horario ese día" };
    const nuevaEntrada = hEntrada ? aBD(fecha, hEntrada, zona) : null;

    let nuevaSalida = null;
    if (campo !== "entrada") {
      if (!otra) {
        const p = salidaProgramada(r, zona);
        if (!p) return { motivo: "no tiene horario ese día" };
        nuevaSalida = p.tz(DB_TZ).format(FORMATO_BD);
      } else {
        // Si la salida es menor o igual que la entrada, es del día siguiente (turno nocturno).
        const hSalida = campo === "ambas" ? horaSalida : hora;
        const refEntrada = hEntrada ?? (r.entrada ? local(r.entrada, zona) : null);
        nuevaSalida = aBD(refEntrada && hSalida <= refEntrada ? sumarDia(fecha) : fecha, hSalida, zona);
      }
      if (campo === "salida" && !r.entrada) return { motivo: "no tiene entrada: usa «Entrada y salida»" };
    }

    const cambios = {};
    const actual = (c) => (r[c] ? dayjs.tz(r[c], DB_TZ).format(FORMATO_BD) : null);
    if (nuevaEntrada && actual("entrada") !== nuevaEntrada) cambios.entrada = nuevaEntrada;
    if (nuevaSalida && actual("salida") !== nuevaSalida) cambios.salida = nuevaSalida;
    if (!Object.keys(cambios).length) {
      return { motivo: campo === "ambas" ? "ya tiene esa entrada y salida" : `ya tiene ${campo} ${local(nuevaEntrada ?? nuevaSalida, zona)}` };
    }
    const entrada = cambios.entrada ?? r.entrada;
    const salida = cambios.salida ?? r.salida;
    // Una hora que todavía no llega deja una checada «en el futuro» y el reloj rechaza
    // cualquier checada nueva de esa persona («Existe una checada posterior…») hasta esa hora.
    const ahoraMin = Math.floor(ahora / 60000);
    const futura = [cambios.entrada, cambios.salida].find((v) => v && minutos(v) > ahoraMin);
    if (futura) return { motivo: `esa hora (${local(futura, zona)}) aún no llega: su turno sigue abierto` };
    if (entrada && salida && minutos(salida) <= minutos(entrada)) {
      return { motivo: `la salida quedaría antes de la entrada (${local(entrada, zona)})` };
    }
    const sufijo = otra ? "" : " (horario)";
    if (campo === "ambas") {
      return {
        cambios,
        antes: `${local(r.entrada, zona)} – ${local(r.salida, zona)}`,
        despues: `${local(entrada, zona)} – ${local(salida, zona)}${sufijo}`,
      };
    }
    const etiqueta = campo === "salida" ? "Salida" : "Entrada";
    return {
      cambios,
      antes: `${etiqueta} ${local(r[campo], zona)}`,
      despues: `${etiqueta} ${local(cambios[campo], zona)}${sufijo}`,
    };
  });
}

const unirNota = (actual, texto) => {
  const a = String(actual ?? "").trim();
  return a ? `${a} · ${texto}` : texto;
};

// 2) Tipo de registro. opciones: { tipo: { id, nombre, cuenta_como_asistencia, goce_sueldo }, nota }
export function planTipo(filas, { tipo, nota } = {}) {
  if (!tipo?.id) return { aplicar: [], omitir: [], error: "Elige el tipo de registro." };
  const texto = String(nota ?? "").trim();
  return resultado(filas, (r) => {
    if (Number(r.id_tipo_permiso) === Number(tipo.id)) return { motivo: `ya es ${tipo.nombre}` };
    const cambios = {
      id_tipo_permiso: Number(tipo.id),
      asistencia: Number(tipo.cuenta_como_asistencia) ? 1 : 0,
      goce_sueldo: Number(tipo.goce_sueldo) ? 1 : 0,
    };
    if (texto) cambios.notas = unirNota(r.notas, texto);
    return {
      cambios,
      antes: r.tipo_registro_nombre || "—",
      despues: `${tipo.nombre}${texto ? ` · «${texto}»` : ""}`,
    };
  });
}

// 3) Agregar comida a quien no checó salida a comer.
//    opciones: { modo: "horario" | "otra", de: "HH:mm", a: "HH:mm", zonaDe }
export function planComida(filas, { modo = "horario", de, a, zonaDe = () => DB_TZ } = {}) {
  if (modo === "otra" && (!HORA.test(String(de ?? "")) || !HORA.test(String(a ?? "")) || a <= de)) {
    return { aplicar: [], omitir: [], error: "El regreso de comida debe ser después de la salida a comer." };
  }
  return resultado(filas, (r) => {
    if (!sinSalidaAComer(r)) {
      return { motivo: minutosComidaHorario(r) ? "ya marcó su comida o no tiene checadas del reloj" : "su horario no tiene comida" };
    }
    const zona = zonaDe(r);
    const sale = modo === "horario" ? hhmm(r.hora_salida_comida_programada) : de;
    const regresa = modo === "horario" ? hhmm(r.hora_regreso_comida_programada) : a;
    if (!sale || !regresa || regresa <= sale) return { motivo: "su horario no tiene comida" };
    // Fecha de la comida: la de la entrada en su zona (turno nocturno: puede ser el día siguiente).
    const fechaEntrada = enZona(r.entrada, zona)?.format("YYYY-MM-DD") ?? fechaDe(r);
    let fecha = fechaEntrada;
    if (local(r.entrada, zona) > sale) fecha = sumarDia(fechaEntrada);
    const comida = { salida_comida: aBD(fecha, sale, zona), regreso_comida: aBD(fecha, regresa, zona) };
    if (minutos(comida.salida_comida) <= minutos(r.entrada) || minutos(comida.regreso_comida) >= minutos(r.salida)) {
      return { motivo: `la comida ${sale}–${regresa} queda fuera de su jornada` };
    }
    return { comida, antes: "Sin salida a comer", despues: `Comida ${sale}–${regresa}` };
  });
}

// 4) Observación. opciones: { texto, modo: "agregar" | "reemplazar" }
export function planNota(filas, { texto, modo = "agregar" } = {}) {
  const t = String(texto ?? "").trim();
  if (!t) return { aplicar: [], omitir: [], error: "Escribe la observación." };
  return resultado(filas, (r) => {
    const actual = String(r.notas ?? "").trim();
    const nueva = modo === "reemplazar" ? t : unirNota(actual, t);
    if (nueva === actual || (modo === "agregar" && actual.includes(t))) return { motivo: "ya tiene esa observación" };
    return { cambios: { notas: nueva }, antes: actual || "—", despues: nueva };
  });
}

// 5) Horas extra por decidir. opciones: { decision: "autorizar" | "no", forma, nota, idAutorizador, quien, zonaDe }
export function planHorasExtra(filas, { decision = "autorizar", forma, nota, idAutorizador, quien, zonaDe = () => DB_TZ } = {}) {
  return resultado(filas, (r) => {
    const zona = zonaDe(r);
    if (estadoHorasExtra(r, zona).estado !== "pendiente") return { motivo: "no tiene horas extra por decidir" };
    if (decision === "no") {
      const cambios = cambiosNoAutorizar(r, { quien, zona });
      if (!cambios) return { motivo: "no tiene salida registrada" };
      return {
        cambios,
        antes: `Por autorizar · salida ${local(r.salida, zona)}`,
        despues: cambios.salida ? `No autorizadas · salida ${local(cambios.salida, zona)}` : "No autorizadas · salida sin cambio",
      };
    }
    return {
      cambios: cambiosAutorizar({ forma, notas: String(nota ?? "").trim() || undefined, idAutorizador }),
      antes: "Por autorizar",
      despues: `Autorizadas · ${forma || "Pago de horas extras"}`,
    };
  });
}

export const ACCIONES_MASIVAS = {
  hora: { titulo: "Corregir entrada / salida", plan: planHora },
  tipo: { titulo: "Cambiar tipo de registro", plan: planTipo },
  comida: { titulo: "Agregar comida", plan: planComida },
  nota: { titulo: "Agregar observación", plan: planNota },
  extra: { titulo: "Horas extra", plan: planHorasExtra },
};
