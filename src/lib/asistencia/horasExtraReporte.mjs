// Reporte de horas de ley: las horas extra registradas con su horario (backend dias[].ley.horasExtra). Probado en
// scripts/test-horas-extra-dia.mjs. Las horas vienen en la zona de la base, como las checadas del mismo reporte.
import { hora12 } from "../hora12.mjs";
import { formatearMinutos } from "./jornada.mjs";

const ORIGEN = { manual_rh: "capturadas por RH", reloj: "del reloj" };

export function horasExtraDelDia(dia) {
  return Array.isArray(dia?.ley?.horasExtra) ? dia.ley.horasExtra : [];
}

// «Horas extra 4:00 p.m.–7:00 p.m. · 3 h · Inventario · Pago de horas extras · capturadas por RH», una por registro.
export function lineasHorasExtra(dia) {
  return horasExtraDelDia(dia).map((h) => [
    `Horas extra ${hora12(String(h.desde).slice(11, 16))}–${hora12(String(h.hasta).slice(11, 16))}`,
    formatearMinutos(Number(h.minutos) || 0),
    h.motivo,
    h.forma_pago,
    ORIGEN[h.origen] ?? h.origen,
  ].filter(Boolean).join(" · "));
}

// Total del día: con horas extra registradas manda el del servidor (suma lo capturado sin checar); si no, el calculado.
export function totalDelDia(dia, calculado) {
  return horasExtraDelDia(dia).length && dia?.horasHM ? dia.horasHM : calculado;
}
