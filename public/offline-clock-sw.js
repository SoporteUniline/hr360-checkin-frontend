import { synchronizeBackground } from './offline-clock/background-sync.mjs';
const CACHE = 'adamia-clock-shell-v12';
const RUNTIME = 'adamia-runtime-assets-v1';
const MAX_AGE = 7 * 86400000;
const ASSETS = [
  '/app-offline.html', '/offline-clock/app-cache.mjs', '/offline-clock/background-sync.mjs',
  '/reloj-offline.html', '/offline-clock/app.mjs', '/offline-clock/store.mjs', '/offline-clock/face.mjs', '/offline-clock/turn-state.mjs', '/offline-clock/style.css',
  '/vendor/face-api/face-api-0.22.2.min.js',
  '/models/face_landmark_68_model-weights_manifest.json', '/models/face_landmark_68_model-shard1',
  '/models/face_recognition_model-weights_manifest.json', '/models/face_recognition_model-shard1', '/models/face_recognition_model-shard2',
  '/models/ssd_mobilenetv1_model-weights_manifest.json', '/models/ssd_mobilenetv1_model-shard1', '/models/ssd_mobilenetv1_model-shard2',
];
const staticAsset = url => url.origin === self.location.origin && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/assets/') || (url.pathname === '/_next/image' && url.searchParams.get('url')?.startsWith('/assets/')));
self.addEventListener('sync', event => {
  if (event.tag === 'adamia-clock-upload') event.waitUntil(synchronizeBackground().finally(async () => {
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => client.postMessage({ type: 'CLOCK_QUEUE_UPDATED' }));
  }));
});
async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function key(kind, input, variant = '') {
  const url = new URL(input); url.searchParams.delete('_rsc');
  return new Request(`${self.location.origin}/__offline/${kind}/${await digest(url.href + '|' + variant)}`);
}
const appCache = owner => caches.open(`adamia-app-v1-${owner}`);
async function save(owner, kind, request, response, variant = '') {
  if (!/^[a-f0-9]{64}$/.test(owner || '') || !response.ok || response.redirected) return;
  const headers = new Headers(response.headers); headers.set('x-adamia-saved-at', String(Date.now())); headers.delete('set-cookie');
  for (const name of ['content-encoding', 'content-length', 'transfer-encoding']) headers.delete(name);
  await (await appCache(owner)).put(await key(kind, request.url, variant), new Response(await response.clone().arrayBuffer(), { status: response.status, headers }));
  if (kind === 'page') {
    const url = new URL(request.url);
    const path = url.pathname + url.search;
    await (await appCache(owner)).put(`${self.location.origin}/__offline/page-index/${await digest(path)}`, Response.json({ path, at: Date.now() }));
  }
}
async function read(owner, kind, request, variant = '') {
  if (!/^[a-f0-9]{64}$/.test(owner || '')) return null;
  const response = await (await appCache(owner)).match(await key(kind, request.url, variant));
  if (!response || Date.now() - Number(response.headers.get('x-adamia-saved-at') || 0) >= MAX_AGE) return null;
  const headers = new Headers(response.headers);
  for (const name of ['content-encoding', 'content-length', 'transfer-encoding']) headers.delete(name);
  return new Response(await response.arrayBuffer(), { status: response.status, headers });
}
async function companyInfo(path) {
  const response = await (await caches.open(RUNTIME)).match(`${self.location.origin}/__offline/company${path.replace(/\/$/, '')}`);
  return response && response.json();
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(name => name.startsWith('adamia-clock-shell-') && name !== CACHE).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  const data = event.data;
  if (data?.type === 'SCHEDULE_CLOCK_SYNC' && self.registration.sync) event.waitUntil(
    self.registration.sync.register('adamia-clock-upload').catch(() => {})
  );
  if (data?.type === 'WARM_ASSETS') event.waitUntil((async () => {
    const cache = await caches.open(RUNTIME);
    await Promise.allSettled((data.urls || []).slice(0, 300).map(async value => {
      const url = new URL(value, self.location.origin);
      if (staticAsset(url) && !await cache.match(url.href)) await cache.add(url.href);
    }));
  })());
  if (data?.type === 'WARM_COMPANY') event.waitUntil((async () => {
    if (typeof data.slug !== 'string' || !/^[\w-]{1,150}$/.test(data.slug) || !Number.isInteger(data.company)) return;
    const path = '/' + encodeURIComponent(data.slug);
    const response = await fetch(path);
    if (!response.ok || response.redirected || !response.headers.get('content-type')?.includes('text/html')) return;
    const html = await response.clone().text();
    const assets = [...new Set(Array.from(html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g), match => new URL(match[1].replaceAll('&amp;', '&'), self.location.origin).href))];
    const cache = await caches.open(RUNTIME);
    await Promise.all(assets.map(async href => {
      const url = new URL(href);
      if (staticAsset(url) && !await cache.match(href, { ignoreVary: true })) await cache.add(href);
    }));
    const owner = await digest(`company:${data.company}:${data.slug}`);
    await save(owner, 'page', new Request(self.location.origin + path), response);
    await (await caches.open(RUNTIME)).put(`${self.location.origin}/__offline/company${path}`, new Response(JSON.stringify({ owner })));
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (ASSETS.includes(url.pathname) && (!url.search || (url.searchParams.size === 1 && /^\d+$/.test(url.searchParams.get('v') || '')))) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.origin + url.pathname, { ignoreVary: true })) || fetch(request)));
    return;
  }
  if (staticAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(request, { ignoreVary: true }); if (cached) return cached;
      let response;
      try { response = await fetch(request); }
      catch (error) {
        if (request.destination === 'image' || url.pathname === '/_next/image') return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>', { headers: { 'content-type': 'image/svg+xml' } });
        throw error;
      }
      if (response.ok) await cache.put(request, response.clone()).catch(() => {});
      return response;
    })());
    return;
  }
  const rsc = request.headers.get('rsc') === '1';
  if (rsc || request.mode === 'navigate') event.respondWith((async () => {
    const kind = rsc ? 'rsc' : 'page';
    const variant = rsc ? ['rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-router-segment-prefetch'].map(name => request.headers.get(name) || '').join('|') : '';
    try {
      const response = await fetch(request, { signal: AbortSignal.timeout(8000) });
      if (response.status >= 500) throw new Error('El servidor no está disponible');
      await save(response.headers.get('x-adamia-session'), kind, request, response, variant).catch(() => {});
      return response;
    } catch {
      if (rsc) return (await read(request.headers.get('x-adamia-session'), kind, request, variant)) || Response.error();
      const info = await companyInfo(url.pathname);
      const company = info && await read(info.owner, 'page', request);
      if (company) return company;
      // The generic gate reads the actual cookie before opening a private cache.
      return (await caches.match('/app-offline.html')) || Response.error();
    }
  })());
});
