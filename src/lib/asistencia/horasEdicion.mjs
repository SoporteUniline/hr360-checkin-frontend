// Conversión de horas para capturar y editar una asistencia (Asistencias y Nómina usan la misma ventana).
// La base guarda en hora de CDMX; se muestra y captura en la zona de la empresa del empleado.
// Si la salida es menor o igual a la entrada (turno nocturno 22:00 → 05:00), la salida va al día siguiente.
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { salidaEsDiaSiguiente } from "./jornada.mjs";
import { sumarDias } from "../fechaHora.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DB_TIMEZONE = "America/Mexico_City";

export function herramientasHoras(datos, zona) {
  const fechaBase = String(datos?.fecha ?? "").slice(0, 10);
  const horaLocal = (valor) => (valor ? dayjs.tz(valor, DB_TIMEZONE).tz(zona).format("HH:mm") : "");
  const fechaLocal = (valor) => (valor ? dayjs.tz(valor, DB_TIMEZONE).tz(zona).format("YYYY-MM-DD") : "");
  const aBaseDeDatos = (fecha, hora) => dayjs.tz(`${fecha} ${hora}`, zona).tz(DB_TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
  const salidaParaHoras = (horaEntrada, horaSalida) =>
    aBaseDeDatos(horaEntrada && salidaEsDiaSiguiente(horaEntrada, horaSalida) ? sumarDias(fechaBase, 1) : fechaBase, horaSalida);
  const mismaMarca = (a, b) =>
    Boolean(a && b) && dayjs.tz(a, DB_TIMEZONE).format("YYYY-MM-DD HH:mm") === dayjs.tz(b, DB_TIMEZONE).format("YYYY-MM-DD HH:mm");
  const salidaDiaSiguiente = (r) => Boolean(r.salida && r.entrada) && fechaLocal(r.salida) > fechaLocal(r.entrada);
  return { fechaBase, horaLocal, fechaLocal, aBaseDeDatos, salidaParaHoras, mismaMarca, salidaDiaSiguiente };
}
