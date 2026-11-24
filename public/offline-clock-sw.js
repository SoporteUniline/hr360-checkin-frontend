// Retire the production offline worker without deleting locally saved captures.
// Keep this URL available so browsers with an installed worker can update it.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
