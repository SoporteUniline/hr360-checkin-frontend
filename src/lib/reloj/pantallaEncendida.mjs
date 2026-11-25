// «Mantener encendido» del reloj de la empresa (26/11/2026): con el interruptor prendido la cámara se queda lista para la
// siguiente persona y se pide al navegador que no apague la pantalla (Screen Wake Lock). El navegador suelta el candado al
// ocultar la pestaña: se vuelve a pedir al regresar. Sin soporte o si lo niega, no truena (la cámara sigue fija igual).
// Probado en scripts/test-pantalla-encendida.mjs.
export function crearPantallaEncendida({ nav = globalThis.navigator, doc = globalThis.document } = {}) {
  let candado = null;
  let querido = false;
  let pidiendo = false;

  const pedir = async () => {
    if (!querido || candado || pidiendo || doc?.visibilityState === "hidden") return false;
    if (typeof nav?.wakeLock?.request !== "function") return false;
    pidiendo = true;
    try {
      const c = await nav.wakeLock.request("screen");
      if (!querido) { try { await c?.release?.(); } catch { /* nada */ } return false; }
      candado = c;
      c?.addEventListener?.("release", () => { if (candado === c) candado = null; });
      return true;
    } catch {
      return false; // sin permiso, batería baja o pestaña oculta
    } finally {
      pidiendo = false;
    }
  };
  const alVolver = () => { if (doc?.visibilityState === "visible") void pedir(); };

  return {
    get soportado() { return typeof nav?.wakeLock?.request === "function"; },
    get activo() { return Boolean(candado); },
    async fijar(valor) {
      querido = Boolean(valor);
      if (querido) {
        doc?.addEventListener?.("visibilitychange", alVolver);
        return pedir();
      }
      doc?.removeEventListener?.("visibilitychange", alVolver);
      const c = candado;
      candado = null;
      try { await c?.release?.(); } catch { /* ya estaba suelto */ }
      return false;
    },
    // Para los avisos de los navegadores que no conceden el candado sin un toque: se reintenta en el siguiente.
    reintentar: () => pedir(),
  };
}
