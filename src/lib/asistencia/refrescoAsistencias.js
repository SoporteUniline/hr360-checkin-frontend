// Refrescador único de asistencias en el navegador (docs/asistencias/refresco.md).
// - Guardados: lib/axios.js avisa aquí cada escritura que cambia asistencias (de cualquier pantalla) y se revalidan TODAS
//   las claves SWR que dependen de ellas (lib/asistencia/refresco.mjs → esClaveAsistencia), no solo la tabla.
// - Otros usuarios / pestañas: hooks/useRefrescoChecadas.js recibe del SSE «checada» y «asistencia» y llama a avisar().
// - Ediciones abiertas: la guardia de cambios sin guardar (components/cambios/CambiosPendientes.jsx) publica
//   window.__adamiaCambiosPendientes y el evento «adamia-cambios-pendientes»; mientras haya cambios sin guardar, lo
//   automático (SSE, foco, sondeo) queda pendiente y se hace al cerrar la edición.
import { mutate } from "swr";
import { crearRefrescador, esEscrituraAsistencia } from "./refresco.mjs";

const editando = () => typeof window !== "undefined" && window.__adamiaCambiosPendientes === true;
const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";

export const refrescador = crearRefrescador({
  mutar: (filtro) => mutate(filtro),
  estado: () => ({ visible: visible(), editando: editando() }),
});

// Para los onGuardado / mutateAsistencia de las pantallas: se une a la recarga que ya arrancó el guardado.
export const refrescarAsistencias = () => refrescador.refrescar("guardado");

// Envoltura del mutate de la tabla: recarga todo (lo de siempre al guardar). Solo un cambio optimista con forma de tabla
// ({ registros: [...] }, o con opciones) va tal cual al mutate de esa clave. Una asistencia suelta —onGuardado(asistencia)
// de la fila o del reloj— NO es la tabla: antes se ponía en el caché de la tabla y provocaba una segunda petición.
const esDatoDeTabla = (args) => args.length > 1 || Array.isArray(args[0]?.registros) || typeof args[0] === "function";
export const conRefrescoAsistencias = (mutateTabla) => (...args) => (args.length && esDatoDeTabla(args) ? mutateTabla?.(...args) : refrescarAsistencias());

// Respuesta 2xx de axios: si fue una escritura de asistencias, se marca y se recarga todo una vez.
export function alResponderAxios(config) {
  if (!config) return;
  const url = String(config.url ?? "");
  const completa = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `${config.baseURL ?? ""}${url}`;
  if (!esEscrituraAsistencia(config.method, completa)) return;
  refrescador.marcarEscritura();
  void refrescador.refrescar("guardado");
}

if (typeof window !== "undefined") {
  window.addEventListener("adamia-cambios-pendientes", () => { if (!editando()) refrescador.reanudar(); });
}
