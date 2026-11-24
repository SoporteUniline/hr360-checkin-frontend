// Si fetch se rechaza con un DOMException, AxiosError.from lee propiedades del prototipo y el navegador lanza
// («DOMException.message getter…» / «Illegal invocation»). Este fetch los convierte antes en un Error normal.

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
