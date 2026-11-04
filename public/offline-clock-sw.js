const CACHE = 'adamia-clock-shell-v2';
const ASSETS = [
  '/reloj-offline.html', '/offline-clock/app.mjs', '/offline-clock/store.mjs', '/offline-clock/style.css',
  '/vendor/face-api/face-api-0.22.2.min.js',
  '/models/face_landmark_68_model-weights_manifest.json', '/models/face_landmark_68_model-shard1',
  '/models/face_recognition_model-weights_manifest.json', '/models/face_recognition_model-shard1', '/models/face_recognition_model-shard2',
  '/models/ssd_mobilenetv1_model-weights_manifest.json', '/models/ssd_mobilenetv1_model-shard1', '/models/ssd_mobilenetv1_model-shard2',
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('adamia-clock-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
  } else if (event.request.mode === 'navigate') {
    // Private HTML/API responses are never cached.
    event.respondWith(fetch(event.request).catch(async () => {
      if (url.pathname === '/login' || url.pathname === '/empleado' || url.pathname.startsWith('/empleado/') || url.pathname === '/seleccionar-reloj') return caches.match('/reloj-offline.html');
      const profile = await new Promise(resolve => {
        const request = indexedDB.open('adamia-offline-clock-v1', 1);
        request.onerror = () => resolve(null);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('config')) { db.close(); return resolve(null); }
          const read = db.transaction('config').objectStore('config').get('profile');
          read.onsuccess = () => { db.close(); resolve(read.result); };
          read.onerror = () => { db.close(); resolve(null); };
        };
      });
      if (profile?.scope === 'company' && (url.pathname === '/reloj-publico' || url.pathname.replace(/\/$/, '') === '/' + encodeURIComponent(profile.slug))) return caches.match('/reloj-offline.html');
      return Response.error();
    }));
  }
});
