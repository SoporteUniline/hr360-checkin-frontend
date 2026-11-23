import test from 'node:test';
import assert from 'node:assert/strict';
const origin = 'https://offline.test';
const cacheStores = new Map();
const memory = new Map();
let offline = false, deny = false, fail = false, hang = false, requests = 0;
globalThis.location = { origin, href: origin + '/panel/empleados', pathname: '/panel/empleados', search: '' };
globalThis.document = { cookie: '' };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { get onLine() { return !offline; } } });
globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
globalThis.caches = {
  open: async name => {
    if (!cacheStores.has(name)) cacheStores.set(name, new Map());
    const entries = cacheStores.get(name);
    return {
      put: async (request, response) => entries.set(typeof request === 'string' ? request : request.url, response.clone()),
      match: async request => entries.get(typeof request === 'string' ? request : request.url)?.clone(),
      delete: async request => entries.delete(typeof request === 'string' ? request : request.url),
      keys: async () => [...entries.keys()].map(url => new Request(url)),
    };
  },
  delete: async name => cacheStores.delete(name),
};
globalThis.window = { caches: globalThis.caches, dispatchEvent() {}, fetch: async request => {
  requests++;
  if (hang) return new Promise((_resolve, reject) => request.signal.addEventListener('abort', () => reject(new TypeError('Timed out')), { once: true }));
  if (fail) throw new TypeError('Network failed');
  if (deny) return new Response('{"error":"Denied"}', { status: deny, headers: { 'content-type': 'application/json' } });
  const url = new URL(typeof request === 'string' ? request : request.url);
  return new Response(JSON.stringify({ path: url.pathname, account: document.cookie }), { headers: { 'content-type': 'application/json' } });
} };
const cache = await import('../public/offline-clock/app-cache.mjs');
cache.installOfflineFetch(origin + '/api');
const tokenExpiresAt = Math.floor(Date.now() / 1000) + 3600;
const token = account => `fixture.${Buffer.from(JSON.stringify({ sub: account, exp: tokenExpiresAt })).toString('base64url')}.fixture`;
const login = account => { document.cookie = `token=${token(account)}`; offline = false; deny = false; fail = false; window.__adamiaOffline = false; };

test('cached API reads are partitioned by the current token and never persist authorization headers', async () => {
  login('A');
  const url = origin + '/api/checador/empleados?empresa=10';
  await window.fetch(url, { headers: { Authorization: `Bearer ${token('A')}` } });
  offline = true;
  const response = await window.fetch(url);
  assert.equal(response.headers.get('x-adamia-offline'), '1');
  assert((await response.json()).account.includes(token('A')));
  assert(Array.from(cacheStores.values()).every(entries => Array.from(entries.keys()).every(key => !key.includes(token('A')) && !key.includes('Authorization'))));
  document.cookie = `token=${token('B')}`;
  await assert.rejects(() => window.fetch(url), /Sin conexión/);
});
test('offline writes and uncached queries fail instead of pretending to save', async () => {
  login('A'); offline = true;
  const before = requests;
  await assert.rejects(() => window.fetch(origin + '/api/checador/empleados', { method: 'POST', body: '{}' }), /Sin conexión/);
  await assert.rejects(() => window.fetch(origin + '/api/not-visited'), /Sin conexión/);
  assert.equal(requests, before);
});
test('network errors recover stored reads but explicit 403/401 responses win and 401 purges the session cache', async () => {
  login('C');
  const url = origin + '/api/users/verify/token';
  await window.fetch(url);
  fail = true;
  assert.equal((await window.fetch(url)).headers.get('x-adamia-offline'), '1');
  fail = false; deny = 403;
  assert.equal((await window.fetch(url)).status, 403);
  offline = true;
  await assert.rejects(() => window.fetch(url));
  offline = false;
  deny = 401;
  assert.equal((await window.fetch(url)).status, 401);
  deny = false; offline = true;
  await assert.rejects(() => window.fetch(url));
});
test('logout removes the cache and expired JWTs cannot reopen stored data', async () => {
  login('D');
  const url = origin + '/api/checador/asistencias';
  await window.fetch(url);
  await cache.clearSession(token('D'));
  offline = true;
  await assert.rejects(() => window.fetch(url));
  assert.equal(cache.tokenAlive('bad-token'), false);
  assert.equal(cache.tokenAlive(`x.${Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url')}.x`), false);
});
test('company public data is available without a login but never authorizes a private API cache', async () => {
  login('E'); document.cookie = '';
  cache.rememberCompany({ id_empresa: 10, slug: 'test-company' });
  const url = origin + '/api/empresas/slug/test-company';
  await window.fetch(url);
  await window.fetch(origin + '/api/users/verify/token');
  offline = true;
  assert.equal((await window.fetch(url)).headers.get('x-adamia-offline'), '1');
  await assert.rejects(() => window.fetch(origin + '/api/users/verify/token'));
});
test('stored reads expire after seven days', async () => {
  login('F');
  const url = origin + '/api/checador/reportes';
  await window.fetch(url);
  const owner = await cache.ownerKey();
  const store = await caches.open(cache.cacheName(owner));
  await store.put(await cache.cacheKey('api', url), new Response('{}', { headers: { 'x-adamia-saved-at': String(Date.now() - 8 * 86400000) } }));
  offline = true;
  await assert.rejects(() => window.fetch(url));
});

test('offline programmatic navigation opens the complete stored page instead of rejecting an RSC patch', async () => {
  login('G'); offline = true;
  const targets = [];
  location.assign = value => targets.push(value);
  void window.fetch(origin + '/panel/registro-asistencia?_rsc=nonce', { headers: { rsc: '1' } });
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.deepEqual(targets, [origin + '/panel/registro-asistencia']);
  await assert.rejects(() => window.fetch(origin + '/panel/registro-asistencia?_rsc=prefetch', { headers: { rsc: '1', 'next-router-prefetch': '1' } }));
  assert.equal(targets.length, 1, 'background prefetch must not change the visible page');
  delete location.assign;
});

test('decoded cached bodies do not replay compressed transport headers on Safari', async () => {
  login('H');
  const owner = await cache.ownerKey();
  const url = origin + '/api/decoded-response';
  await cache.saveResponse(owner, 'api', url, new Response('{"ok":true}', { headers: { 'content-encoding': 'gzip', 'content-length': '3' } }));
  const read = await cache.readResponse(owner, 'api', url);
  assert.equal(read.headers.get('content-encoding'), null);
  assert.equal(read.headers.get('content-length'), null);
  assert.equal((await read.json()).ok, true);
});

test('incomplete page downloads do not boot a React tree with missing JavaScript', async () => {
  login('I');
  await window.fetch(origin + '/api/users/verify/token');
  const owner = await cache.ownerKey();
  await (await caches.open(cache.cacheName(owner))).put(origin + '/__offline/last-page', new Response(JSON.stringify({ path: location.pathname, at: Date.now(), api: origin + '/api' })));
  await cache.saveResponse(owner, 'page', location.href, new Response('<html><script src="/_next/static/missing.js"></script></html>'));
  let writes = 0;
  document.open = () => {}; document.close = () => {}; document.write = () => writes++;
  assert.equal(await cache.restorePage(), false);
  assert.equal(writes, 0);
  await (await caches.open('adamia-runtime-assets-v1')).put(origin + '/_next/static/missing.js', new Response('/* downloaded */'));
  assert.equal(await cache.restorePage(), true);
  assert.equal(writes, 1);
});

async function preparedSession(account, path, role = 'Recruiter') {
  login(account);
  const owner = await cache.ownerKey();
  await cache.saveResponse(owner, 'api', origin + '/api/users/verify/token', Response.json({ user: { tipo_usuario: role } }));
  const store = await caches.open(cache.cacheName(owner));
  await store.put(origin + '/__offline/last-page', Response.json({ path, at: Date.now(), api: origin + '/api' }));
  await store.put(origin + '/__offline/pages', Response.json([{ path }]));
  await cache.saveResponse(owner, 'page', origin + path, new Response('<html>Saved page</html>'));
  return owner;
}
function at(path) {
  const url = new URL(path, origin);
  Object.assign(location, { href: url.href, pathname: url.pathname, search: url.search });
  globalThis.history = { replaceState: (_state, _unused, target) => at(target) };
}

test('root restores the cached role home or the last prepared screen without redirect loops', async () => {
  const owner = await preparedSession('root-user', '/panel/empleados');
  let writes = 0;
  document.write = () => writes++;
  at('/'); offline = true;
  assert.equal(await cache.restorePage(), true);
  assert.equal(location.pathname, '/panel/empleados');
  await cache.saveResponse(owner, 'page', origin + '/panel/dashboard', new Response('<html>Home</html>'));
  at('/panel');
  assert.equal(await cache.restorePage(), true);
  assert.equal(location.pathname, '/panel/dashboard');
  assert.equal(writes, 2);
});

test('an uncached route offers cached destinations, isolated from a different account', async () => {
  await preparedSession('navigation-owner', '/panel/empleados');
  at('/panel/not-downloaded'); offline = true;
  assert.equal(await cache.restorePage(), false);
  assert((await cache.availableOfflinePages()).some(page => page.path === '/panel/empleados' && !page.public));
  login('different-navigation-user'); offline = true;
  assert(!(await cache.availableOfflinePages()).some(page => !page.public));
  assert.equal(await cache.restorePage(), false);
});

test('anonymous root can recover a prepared public clock without opening a private page', async () => {
  document.cookie = ''; memory.clear();
  at('/public-clock');
  cache.rememberCompany({ id_empresa: 19, slug: 'public-clock' });
  const owner = await cache.digest('company:19:public-clock');
  await cache.saveResponse(owner, 'page', origin + '/public-clock', new Response('<html>Public clock</html>'));
  at('/'); offline = true;
  assert.equal(await cache.restorePage(), true);
  assert.equal(location.pathname, '/public-clock');
  at('/panel');
  assert.equal(await cache.restorePage(), false);
  assert.deepEqual(await cache.availableOfflinePages(), [{ path: '/public-clock', public: true }]);
});

test('stalled router requests fall back to document navigation within a bounded timeout', async () => {
  login('stalled-router'); at('/panel/empleados');
  const destinations = [];
  location.assign = target => destinations.push(target);
  const realSetTimeout = globalThis.setTimeout;
  let timeout;
  globalThis.setTimeout = (callback, ms) => { timeout = ms; return realSetTimeout(callback, 0); };
  hang = true;
  try {
    void window.fetch(origin + '/panel/registro-asistencia?_rsc=stalled', { headers: { rsc: '1' } });
    await new Promise(resolve => realSetTimeout(resolve, 25));
    assert.equal(timeout, 8000);
    assert.deepEqual(destinations, [origin + '/panel/registro-asistencia']);
  } finally { hang = false; globalThis.setTimeout = realSetTimeout; delete location.assign; }
});

test('simultaneous page downloads retain both destinations while incomplete pages are excluded', async () => {
  const owner = await preparedSession('parallel-pages', '/panel/empleados');
  await Promise.all([
    cache.saveResponse(owner, 'page', origin + '/panel/turnos', new Response('<html>Turnos</html>')),
    cache.saveResponse(owner, 'page', origin + '/panel/permisos', new Response('<html>Permisos</html>')),
    cache.saveResponse(owner, 'page', origin + '/panel/incomplete', new Response('<script src="/_next/static/not-downloaded-navigation.js"></script>')),
  ]);
  const pages = await cache.availableOfflinePages();
  assert(pages.some(page => page.path === '/panel/turnos'));
  assert(pages.some(page => page.path === '/panel/permisos'));
  assert(!pages.some(page => page.path === '/panel/incomplete'));
});
