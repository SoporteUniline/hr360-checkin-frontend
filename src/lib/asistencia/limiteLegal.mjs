// Horario contra el límite legal de la semana (catálogo de jornadas legales del backend:
// GET /checador/jornadas-legales/vigente?fecha=AAAA-MM-DD). Solo avisa; nunca bloquea el guardado.
import { formatearMinutos } from "./jornada.mjs";

const aMin = (hora) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hora || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// Minutos de un tramo; si la salida es antes que la entrada, cruza la medianoche.
const tramo = (desde, hasta) => (desde == null || hasta == null ? 0 : hasta >= desde ? hasta - desde : hasta + 1440 - desde);

// Minutos programados de la semana: por día, entrada→salida menos la comida (si trae salida y regreso de comida).
// `horarios`: [{ entrada, salida, salida_comida, regreso_comida, activo? }]; los días con activo === false no cuentan.
export function minutosSemanaHorario(horarios) {
  let total = 0;
  for (const h of horarios ?? []) {
    if (!h || h.activo === false) continue;
    const entrada = aMin(h.entrada);
    const salida = aMin(h.salida);
    if (entrada == null || salida == null) continue;
    const comida = tramo(aMin(h.salida_comida), aMin(h.regreso_comida));
    total += Math.max(0, tramo(entrada, salida) - comida);
  }
  return total;
}

// Fecha de hoy en la Ciudad de México (AAAA-MM-DD), que es desde cuando aplica un horario que se guarda hoy.
export const hoyMexico = (ahora = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);

// Texto del aviso, o null si está dentro del límite o no hay regla.
export function avisoLimiteLegal(minutos, regla) {
  const limite = Number(regla?.minutos_ordinarios_semanales);
  if (!Number.isFinite(limite) || limite <= 0 || !(minutos > limite)) return null;
  const anio = String(regla.vigencia_desde || "").slice(0, 4);
  return `Este horario suma ${formatearMinutos(minutos)} a la semana y el límite legal${anio ? ` de ${anio}` : ""} es ${formatearMinutos(limite)}. Las horas de más se cuentan como extra.`;
}
