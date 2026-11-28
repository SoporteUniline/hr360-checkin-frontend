import { descargarFaceApi, loadBrowserFaceApi } from "./faceapi-browser";

// (INC-011) Solo descarga: espera a que el panel termine de arrancar (sus datos y las pantallas que precarga Next) para
// que los ~7 MB no compitan con ellos en una red celular. Si antes se abre el reloj, este los baja y prepara solo.
export const ESPERA_DESCARGA_MS = 10000;

// Let the initial screen render before downloading and initializing the models.
// soloDescarga (INC-011): baja los archivos a la caché sin preparar el reconocimiento (no bloquea el hilo principal).
export function scheduleFaceApiPreload({ soloDescarga = false } = {}) {
  let id;
  let idle;
  const preload = () => {
    // Recognition can retry normally if this optional preparation fails.
    (soloDescarga ? descargarFaceApi() : loadBrowserFaceApi()).catch(() => {});
  };
  const enReposo = () => {
    if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(preload, { timeout: 1500 });
    else id = window.setTimeout(preload, 250);
  };

  if (soloDescarga) id = window.setTimeout(enReposo, ESPERA_DESCARGA_MS);
  else enReposo();
  return () => {
    if (idle !== undefined) window.cancelIdleCallback(idle);
    if (id !== undefined) window.clearTimeout(id);
  };
}
