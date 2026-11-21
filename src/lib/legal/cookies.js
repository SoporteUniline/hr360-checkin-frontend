// Consentimiento de cookies de publicidad (Pixel de Meta). Se guarda en el navegador; si el navegador lo bloquea,
// se trata como «sin decidir» (no se carga el Pixel y el aviso vuelve a salir).
export const CLAVE_COOKIES = "adamia_cookies_publicidad";
export const EVENTO_COOKIES = "adamia:cookies";

export function leerConsentimiento() {
  try {
    const v = window.localStorage.getItem(CLAVE_COOKIES);
    return v === "aceptadas" || v === "rechazadas" ? v : null;
  } catch {
    return null;
  }
}

export function guardarConsentimiento(valor) {
  try {
    window.localStorage.setItem(CLAVE_COOKIES, valor);
  } catch {
    // Sin almacenamiento: la decisión vale solo para esta visita.
  }
  window.dispatchEvent(new CustomEvent(EVENTO_COOKIES, { detail: valor }));
}
