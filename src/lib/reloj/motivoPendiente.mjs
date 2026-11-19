// Por qué una checada sigue en el dispositivo (se muestra en el reloj y en «Capturas en este dispositivo»).
export function motivoPendiente(event, online = typeof navigator === 'undefined' || navigator.onLine) {
  if (!event || event.status !== 'pending') return '';
  if (!online || (typeof window !== 'undefined' && window.__adamiaOffline === true)) return 'Sin conexión: se sube sola al volver internet.';
  if (event.error) {
    const detalle = [event.httpStatus ? `HTTP ${event.httpStatus}` : 'sin respuesta del servidor', event.errorCode].filter(Boolean).join(' · ');
    return `${event.error} (${detalle})`;
  }
  return 'En espera: antes debe subir otra checada anterior de esta persona.';
}
