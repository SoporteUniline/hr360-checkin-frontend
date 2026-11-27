// Centro de comunicados (27/11/2026): notificaciones Web Push del muro.
// Se registra con alcance propio (/comunicados-push/) para no tocar el registro de «/» (offline-clock-sw.js se retira
// solo). No intercepta peticiones (sin «fetch»): solo muestra la notificación y abre ADAMIA al tocarla.
// El texto se muestra tal cual: las notificaciones del sistema no interpretan HTML.
const MURO = '/empleado/panel/muro';

function destino(url) {
  try {
    const u = new URL(url || MURO, self.location.origin);
    return u.origin === self.location.origin ? u.href : new URL(MURO, self.location.origin).href;
  } catch {
    return new URL(MURO, self.location.origin).href;
  }
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; }
  catch { datos = { cuerpo: event.data ? event.data.text() : '' }; }
  const titulo = String(datos.titulo || datos.title || 'ADAMIA').slice(0, 120);
  const opciones = {
    body: String(datos.cuerpo || datos.body || '').slice(0, 300),
    icon: '/assets/adamia-isotipo.png',
    badge: '/favicon.ico',
    tag: datos.id != null ? `comunicado-${datos.id}` : undefined,
    data: { url: destino(datos.url) },
  };
  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = destino(event.notification.data && event.notification.data.url);
  event.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const misma = abiertas.find(c => c.url === url && 'focus' in c);
    if (misma) return misma.focus();
    return self.clients.openWindow(url);
  })());
});
