// Primera pantalla del panel (RH, dueño y usuarios con acceso). El login, el middleware y el reloj mandan a /panel y de
// ahí se decide aquí (sin red ni React: probado en scripts/test-comunicados.mjs).
// (27/11/2026, pedido del dueño) El muro tipo Facebook es lo primero que se ve, si la empresa tiene el Centro de
// comunicados y el usuario puede verlo; si no, el Monitor, como antes.
import { rutaPermitida } from "./modulos/menu.mjs";
import { rutaPermitidaAcceso } from "./permisos/permisos.mjs";

export const RUTA_INICIO_MURO = "/panel/muro";
export const RUTA_INICIO_MONITOR = "/panel/monitor";

/** activos: claves activas (null = sin filtro); permisos: los del acceso (null = dueño); opciones: las de rutaPermitida. */
export function rutaInicioPanel({ activos = null, permisos = null, opciones } = {}) {
  const muro = rutaPermitida(RUTA_INICIO_MURO, activos, opciones) && rutaPermitidaAcceso(RUTA_INICIO_MURO, permisos);
  return muro ? RUTA_INICIO_MURO : RUTA_INICIO_MONITOR;
}
