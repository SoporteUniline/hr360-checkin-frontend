// Horas extra del día: regla diaria aprobada por el dueño (26/11/2026): «si es de 8 y tengo 10, son 2 extras».
// La fuente de verdad es el SERVIDOR (hr360-checkin-backend → services/horasExtraDia.js): la lista de Asistencias trae
// minutos_extra_por_autorizar, minutos_extra, estado_extra… ya calculados. Este archivo es su ESPEJO EXACTO, solo para
// (1) el cálculo en vivo del reloj mientras se edita y (2) filas que no traen los campos del servidor. Mismos casos de
// prueba en ambos lados (scripts/test-extra-del-dia.mjs ↔ tests/horasExtraDia.test.cjs). Si cambias uno, cambia el otro.
//
// - Detectadas = máx(0, trabajado del día − jornada programada). Trabajado = jornada + hora extra, sin comida.
// - Día sin horario de alguien que tiene horario otros días (descanso): todo lo trabajado se detecta.
// - Autorizadas: registradas (asistencias_horas_extra vigentes); si no hay, renglones «Hora extra» autorizados del reloj; si
//   tampoco, la autorización del día completo (hrs_extra = 1) cubre todo. «Reposición» no es extra.
// - No autorizadas: renglones del reloj «No se autoriza» y la constancia «No autorizadas…» del día.
// - Por autorizar = detectadas − autorizadas − reposición − no autorizadas, solo desde UMBRAL_EXTRA_MIN.

export const UMBRAL_EXTRA_MIN = 30;
export const FORMA_REPOSICION = "Reposición de tiempo por tiempo";
export const PREFIJO_NO_AUTORIZADAS = "No autorizadas";

const suma = (lista) => lista.reduce((t, x) => t + (Number(x) || 0), 0);

export function extraDelDia({ trabajados, programados, conHorarioOtrosDias = true, registradas = [], relojAutorizadas = 0,
  relojNoAutorizadas = 0, hrsExtra = 0, formaPago = null, notas = null, umbral = UMBRAL_EXTRA_MIN } = {}) {
  const t = Number(trabajados);
  const base = Number.isFinite(t) && trabajados != null && t > 0 ? t : 0;
  const detectadas = programados == null ? (conHorarioOtrosDias ? base : 0) : Math.max(0, base - Number(programados));
  const lista = (registradas ?? []).filter((r) => Number(r.minutos) > 0);
  let autorizadas = 0, reposicion = 0;
  if (lista.length) {
    reposicion = suma(lista.filter((r) => r.forma_pago === FORMA_REPOSICION).map((r) => r.minutos));
    autorizadas = suma(lista.filter((r) => r.forma_pago !== FORMA_REPOSICION).map((r) => r.minutos));
  } else if (Number(relojAutorizadas) > 0) {
    autorizadas = Number(relojAutorizadas);
  } else if (Number(hrsExtra)) {
    if (formaPago === FORMA_REPOSICION) reposicion = detectadas;
    else autorizadas = detectadas;
  }
  let noAutorizadas = Math.max(0, Number(relojNoAutorizadas) || 0);
  if (!Number(hrsExtra) && String(notas ?? "").startsWith(PREFIJO_NO_AUTORIZADAS)) {
    noAutorizadas = Math.max(noAutorizadas, detectadas - autorizadas - reposicion);
  }
  const resto = Math.max(0, detectadas - autorizadas - reposicion - noAutorizadas);
  const porAutorizar = resto >= umbral ? resto : 0;
  const estado = porAutorizar > 0 ? "pendiente" : autorizadas > 0 ? "autorizada" : reposicion > 0 ? "reposicion"
    : noAutorizadas > 0 ? "no_autorizada" : "sin";
  return { detectadas, autorizadas, reposicion, noAutorizadas, porAutorizar, estado };
}
