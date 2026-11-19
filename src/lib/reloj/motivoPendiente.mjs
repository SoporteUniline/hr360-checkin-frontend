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

// ¿El servidor respondió con error? (no es falta de internet). Se reintenta sola, pero hay que avisar a RH
// si no se resuelve: no debe parecer un problema de conexión de la persona.
export const errorDelServidor = (event) => Boolean(event && event.status === 'pending' && event.error && event.httpStatus);

// Texto de la checada confirmada. «ignorada» (19/11/2026): el servidor no registró un movimiento nuevo
// porque la persona ya había checado hace menos de 5 min (candado contra checadas repetidas).
// Pregunta del candado (19/11/2026): «Acabas de registrar tu salida a las 4:49 p.m. ¿Registrar otra vez?».
export function preguntaRepetida(rebote, mensaje) {
  if (rebote?.tipo && rebote?.hora) {
    const [h, m] = String(rebote.hora).split(':').map(Number);
    const hora = Number.isFinite(h) && Number.isFinite(m) ? `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}` : rebote.hora;
    return `Acabas de registrar tu ${rebote.tipo} a las ${hora}`;
  }
  return (mensaje || 'Acabas de registrar hace menos de 5 minutos').replace(/\.$/, '');
}

export function textoChecada(accion, mensaje) {
  if (accion === 'ignorada') return mensaje || 'Ya estaba registrada hace menos de 5 minutos';
  return accion === 'entrada' ? 'Entrada registrada' : 'Salida registrada';
}
