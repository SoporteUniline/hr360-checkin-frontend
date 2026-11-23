// (23/11/2026) Ficha del empleado → «Firma y PIN» para RH: qué se muestra y qué acciones aplican.
// RH nunca ve ni escribe el PIN: solo ve si existe, si está bloqueado, y puede desbloquear o restablecer (borrarlo).
const hora = (iso) => new Date(iso).toLocaleTimeString("es-MX", { timeZone: "America/Mexico_City", hour: "numeric", minute: "2-digit" });

export function estadoPinRh(e, ahora = new Date()) {
  if (!e) return null;
  const bloqueado = e.bloqueado_hasta && new Date(e.bloqueado_hasta) > ahora;
  const intentos = Number(e.intentos_fallidos) || 0;
  let pin;
  if (!e.tiene_pin) pin = { texto: "Sin PIN", detalle: "La persona aún no crea su PIN en su app.", tono: "gris" };
  else if (bloqueado) pin = { texto: "Bloqueado", detalle: `Por intentos fallidos, hasta las ${hora(e.bloqueado_hasta)}.`, tono: "rojo" };
  else if (intentos > 0) pin = { texto: "Activo", detalle: `${intentos} ${intentos === 1 ? "intento fallido" : "intentos fallidos"} reciente${intentos === 1 ? "" : "s"}.`, tono: "ambar" };
  else pin = { texto: "Activo", detalle: "Puede firmar documentos con su PIN.", tono: "verde" };
  return {
    firma: e.tiene_firma ? { texto: "Guardada", tono: "verde" } : { texto: "Sin firma guardada", tono: "gris" },
    pin,
    puedeFirmarConPin: Boolean(e.tiene_firma && e.tiene_pin && !bloqueado),
    puedeDesbloquear: Boolean(e.tiene_pin && (bloqueado || intentos > 0)),
    puedeRestablecer: Boolean(e.tiene_pin),
  };
}

export const ACCION_TEXTO = { desbloquear: "desbloqueó el PIN", restablecer_pin: "restableció el PIN" };
