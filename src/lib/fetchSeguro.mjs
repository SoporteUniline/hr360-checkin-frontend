// (23/11/2026) «The DOMException.message getter can only be used on instances of DOMException» al checar entrada.
// Causa: cuando fetch se rechaza con un DOMException (petición cancelada, almacenamiento bloqueado en Safari,
// permisos…), axios lo copia con AxiosError.from, que lee las propiedades del PROTOTIPO de DOMException y el navegador
// truena (Safari con ese mensaje; Chrome «Illegal invocation»). Se le da a axios un fetch que convierte esos errores en
// un Error normal con el mismo nombre y mensaje, antes de que axios los toque.

export function errorNormal(error) {
  const esDomException = typeof DOMException !== "undefined" && error instanceof DOMException;
  if (!esDomException) return error;
  const normal = new Error(error.message || "No se pudo conectar. Intenta de nuevo.");
  normal.name = error.name;
  if (error.code) normal.codigoDom = error.code;
  return normal;
}

// Llama al fetch vigente en cada petición (así respeta el fetch sin conexión que se instala después).
export const fetchSeguro = (...args) => globalThis.fetch(...args).catch((error) => { throw errorNormal(error); });
