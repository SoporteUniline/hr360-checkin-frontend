// Reglas del lado del navegador para los pop-ups de venta (docs/popups-sitio.md del backend).
// Puras: se prueban con scripts/test-popups.mjs.

export const CLAVE_HISTORIAL = "adamia_popups_vistos";
const DIA_MS = 86400000;
const ANCHO_CELULAR = 768;

// Página pública → nombre de la regla. Fuera de inicio y blog no se muestran pop-ups.
export function paginaDe(ruta) {
  const r = String(ruta ?? "").replace(/\/+$/, "") || "/";
  if (r === "/") return "inicio";
  if (r === "/blog") return "blog";
  if (r.startsWith("/blog/")) return "articulos";
  return null;
}

export function dispositivoAplica(popup, ancho) {
  if (popup.dispositivos === "escritorio") return ancho >= ANCHO_CELULAR;
  if (popup.dispositivos === "celular") return ancho < ANCHO_CELULAR;
  return true;
}

// ¿Ya lo vio dentro de su frecuencia? 0 días = puede volver a salir en otra visita.
export function vistoReciente(popup, historial, ahora) {
  const visto = Number(historial?.[popup.id]);
  const dias = Number(popup.frecuencia_dias) || 0;
  if (!Number.isFinite(visto) || dias <= 0) return false;
  return ahora - visto < dias * DIA_MS;
}

// El primero (ya vienen por prioridad) que aplique al dispositivo, no visto en su frecuencia ni en esta visita.
export function elegirPopup(popups, { ancho, historial = {}, vistosEnVisita = [], ahora = Date.now() }) {
  return (popups ?? []).find(
    (p) => dispositivoAplica(p, ancho) && !vistoReciente(p, historial, ahora) && !vistosEnVisita.includes(p.id),
  ) ?? null;
}

// Segundos de espera del disparador «tiempo» (mínimo 3: nunca encima de la página al entrar).
export const esperaSegundos = (popup) => Math.max(3, Number(popup?.segundos) || 8);

// Enlace interno (se navega en la misma pestaña) o externo https (nueva pestaña).
export const esEnlaceExterno = (url) => /^https:\/\//i.test(String(url ?? ""));

export function leerHistorial(almacen) {
  try {
    const datos = JSON.parse(almacen?.getItem(CLAVE_HISTORIAL) ?? "{}");
    return datos && typeof datos === "object" && !Array.isArray(datos) ? datos : {};
  } catch {
    return {};
  }
}

export function guardarVisto(almacen, id, ahora = Date.now()) {
  try {
    const historial = leerHistorial(almacen);
    historial[id] = ahora;
    almacen?.setItem(CLAVE_HISTORIAL, JSON.stringify(historial));
  } catch {
    // Sin almacenamiento (incógnito, bloqueado): se limita a una vez por visita.
  }
}
