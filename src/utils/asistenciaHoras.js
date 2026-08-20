// utils/asistenciaHoras.js
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TIMEZONE = "America/Mexico_City";

export const calcularHorasDebiaTrabajar = (data) => {
  if (!data.hora_entrada_programada || !data.hora_salida_programada) return 0;

  const entrada = dayjs(`2000-01-01 ${data.hora_entrada_programada}`);
  const salida = dayjs(`2000-01-01 ${data.hora_salida_programada}`);

  return Number((salida.diff(entrada, "minute") / 60).toFixed(2));
};

export const calcularHorasTrabajadas = (data, userTimezone) => {
  if (!data.entrada || !data.salida) return 0;

  const entrada = dayjs.tz(data.entrada, DB_TIMEZONE).tz(userTimezone);
  const salida = dayjs.tz(data.salida, DB_TIMEZONE).tz(userTimezone);
  const comida = Number(data.hrs_comida || 0);

  return Number((salida.diff(entrada, "minute") / 60 - comida).toFixed(2));
};

export const calcularResumenJornada = (data, userTimezone) => {
  const horasDebia = calcularHorasDebiaTrabajar(data);
  const horasTrabajo = calcularHorasTrabajadas(data, userTimezone);

  const diferencia = Number((horasTrabajo - horasDebia).toFixed(2));

  return {
    horasDebia,
    horasTrabajo,
    diferencia,
    jornada: horasDebia ? `${horasTrabajo} / ${horasDebia} Jor.` : "-",
  };
};
