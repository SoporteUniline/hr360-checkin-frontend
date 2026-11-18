// utils/asistenciaHoras.js
// Envoltura de compatibilidad: el cálculo vive en src/lib/asistencia/jornada.mjs
// (minutos enteros, turnos nocturnos, comida descontada en ambos lados).
// Se conservan los nombres y campos en horas para quien aún los use.
import {
  formatearMinutos,
  minutosProgramados,
  minutosTrabajados,
  resumenJornada,
} from "@/lib/asistencia/jornada.mjs";

export { formatearMinutos };

const aHoras = (minutos) => (minutos == null ? 0 : Number((minutos / 60).toFixed(2)));

export const calcularHorasDebiaTrabajar = (data) => aHoras(minutosProgramados(data));

export const calcularHorasTrabajadas = (data) => aHoras(minutosTrabajados(data));

// La zona horaria ya no cambia el resultado: entrada y salida vienen en la misma zona.
export const calcularResumenJornada = (data) => {
  const r = resumenJornada(data);
  return {
    ...r,
    horasDebia: aHoras(r.minutosProgramados),
    horasTrabajo: aHoras(r.minutosTrabajados),
    diferencia: r.minutosDiferencia == null ? null : aHoras(r.minutosDiferencia),
  };
};
