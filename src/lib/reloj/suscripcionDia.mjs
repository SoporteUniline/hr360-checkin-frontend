// Validación de suscripción del reloj una vez al día (pedido del 21/11/2026: «que valide una vez al día y ya entre directo»).
// Se guarda en el dispositivo solo un resultado ACTIVO y solo para hoy (día en Ciudad de México): mañana vuelve a validar.
// Un resultado inactivo no se guarda, así que al reactivar la suscripción el reloj funciona de inmediato.
// Si el almacenamiento no está disponible (modo privado), simplemente se valida como antes.
const PREFIJO = "adamia-reloj-suscripcion:";

export function hoyMx(ahora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(ahora);
}

const almacen = (a) => a ?? (typeof localStorage !== "undefined" ? localStorage : null);

// Devuelve lo guardado hoy (p. ej. { idEmpresa, nombre }) o null si hay que validar.
export function validadaHoy(clave, { ahora = new Date(), storage } = {}) {
  try {
    const crudo = almacen(storage)?.getItem(PREFIJO + clave);
    if (!crudo) return null;
    const dato = JSON.parse(crudo);
    return dato?.activa === true && dato.fecha === hoyMx(ahora) ? dato : null;
  } catch {
    return null;
  }
}

// (22/11/2026) Para no esperar: si este aparato la validó ACTIVA en los últimos `dias` días, el reloj abre de inmediato
// y se vuelve a validar en segundo plano (si resultó inactiva, se bloquea en ese momento). Devuelve lo guardado o null.
export function validadaReciente(clave, { dias = 7, ahora = new Date(), storage } = {}) {
  try {
    const crudo = almacen(storage)?.getItem(PREFIJO + clave);
    if (!crudo) return null;
    const dato = JSON.parse(crudo);
    if (dato?.activa !== true || !/^\d{4}-\d{2}-\d{2}$/.test(String(dato.fecha))) return null;
    const diferencia = (Date.parse(`${hoyMx(ahora)}T00:00:00Z`) - Date.parse(`${dato.fecha}T00:00:00Z`)) / 86400000;
    return diferencia >= 0 && diferencia <= dias ? dato : null;
  } catch {
    return null;
  }
}

export function guardarValidada(clave, datos = {}, { ahora = new Date(), storage } = {}) {
  try {
    almacen(storage)?.setItem(PREFIJO + clave, JSON.stringify({ ...datos, activa: true, fecha: hoyMx(ahora) }));
  } catch {
    // Sin almacenamiento: la próxima vez se valida otra vez.
  }
}

export function olvidarValidada(clave, { storage } = {}) {
  try { almacen(storage)?.removeItem(PREFIJO + clave); } catch { /* nada que hacer */ }
}
