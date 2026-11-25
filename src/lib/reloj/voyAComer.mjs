// «Voy a comer» en el reloj (26/11/2026): interruptor discreto que la persona prende ANTES de checar. La siguiente checada
// se manda con accion = "salida_comida" y el interruptor se apaga solo al usarse o a los 30 s. La regla la decide el
// servidor (services/comidaReloj.js del backend): vale en cualquier salida si ese día aún no hay comida; si ya comió,
// responde «Ya registraste tu comida hoy» (cierre automático registra la salida normal; manual pregunta sus opciones).
// En una entrada no cambia nada. Probado en scripts/test-reloj-en-linea.mjs.
export const DURACION_VOY_A_COMER_S = 30;
export const ACCION_COMIDA = "salida_comida";

// La checada con la acción de comida, si el interruptor está prendido y la checada no trae ya una acción elegida
// (las opciones de la pregunta del servidor mandan).
export function conVoyAComer(payload, activo) {
  if (!activo || payload?.accion) return payload;
  return { ...payload, accion: ACCION_COMIDA };
}

// Segundos que le quedan al interruptor (0 = se apaga).
export function segundosRestantes(hasta, ahora = Date.now()) {
  return Math.max(0, Math.ceil((Number(hasta) - Number(ahora)) / 1000));
}
