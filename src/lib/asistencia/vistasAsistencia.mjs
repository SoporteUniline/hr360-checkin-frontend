// Vistas de Asistencias y enlaces viejos. Probado en scripts/test-monitor.mjs.
export const RUTA_MONITOR = "/panel/monitor";

// «Hoy / En vivo» salió de Asistencias: cualquier ?vista= que la pedía lleva al Monitor.
const EN_VIVO = new Set(["envivo", "en-vivo", "en_vivo", "hoy", "vivo"]);
export const esVistaEnVivo = (vista) => EN_VIVO.has(String(vista ?? "").trim().toLowerCase());
