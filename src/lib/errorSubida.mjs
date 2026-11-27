// (27/11/2026) Archivo rechazado por pesado ANTES de llegar al backend. En producción nginx corta cualquier petición más
// grande que su `client_max_body_size` con un 413 en HTML (sin JSON), y cada pantalla terminaba en su mensaje genérico
// («No se pudo guardar la portada.»). Una sola regla para todas: un 413 sin mensaje del servidor dice qué pasó.
// El 413 que SÍ trae JSON (p. ej. «La foto pesa más de 8 MB» del backend) conserva su texto.
// Se aplica en el interceptor de lib/axios.js (todas las pantallas) y en los errorDe que no pasan por él.

export const MENSAJE_ARCHIVO_PESADO = "El archivo pesa demasiado para subirlo. Prueba con uno más ligero.";

/** ¿Respuesta 413 sin un mensaje del servidor que mostrar (HTML de nginx, cuerpo vacío o texto)? */
export function esRechazoPorPeso(error) {
  const r = error?.response;
  if (r?.status !== 413) return false;
  const d = r.data;
  if (!d || typeof d !== "object") return true;
  return !(typeof d.error === "string" && d.error) && !(typeof d.mensaje === "string" && d.mensaje);
}

/** Si el error es un 413 sin mensaje, le pone el mensaje claro en `data` ({ error, mensaje, codigo }) para que cualquier
 *  `errorDe` de las pantallas (lea `error` o `mensaje`) lo muestre. Devuelve el mismo error. Nunca lanza. */
export function normalizarRechazoPorPeso(error) {
  try {
    if (esRechazoPorPeso(error)) error.response.data = { ok: false, codigo: "ARCHIVO_GRANDE", error: MENSAJE_ARCHIVO_PESADO, mensaje: MENSAJE_ARCHIVO_PESADO };
  } catch { /* el aviso nunca rompe la respuesta */ }
  return error;
}

/** Mensaje del 413 sin JSON o null (para los errorDe que lo revisan antes de su mensaje por defecto). */
export const mensajeRechazoPorPeso = (error) => (esRechazoPorPeso(error) ? MENSAJE_ARCHIVO_PESADO : null);
