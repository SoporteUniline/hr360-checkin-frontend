export const APP_CACHE_VERSION = 'v1';
export const OFFLINE_MAX_AGE = 7 * 86400000;
const PREFIX = 'adamia-app-';
let originalFetch;
let apiBase;
function reportNetwork(offline) {
  window.__adamiaOffline = offline;
  window.dispatchEvent(new CustomEvent('adamia-network', { detail: { offline } }));
}
function decodedHeaders(source) {
  const headers = new Headers(source);
  // fetch() has decoded the body; encoded transport lengths must not be replayed.
  for (const name of ['content-encoding', 'content-length', 'transfer-encoding']) headers.delete(name);
  return headers;
}

export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function cookieToken() {
  try { return decodeURIComponent(document.cookie.split('; ').find(value => value.startsWith('token='))?.slice(6) || ''); }
  catch { return ''; }
}
export function tokenAlive(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch { return false; }
}
export async function ownerKey(token = cookieToken()) { return token && tokenAlive(token) ? digest(token) : null; }
export function cacheName(owner) { return `${PREFIX}${APP_CACHE_VERSION}-${owner}`; }
export async function cacheKey(kind, url, variant = '') {
  const parsed = new URL(url, location.origin);
  parsed.searchParams.delete('_rsc');
  return new Request(`${location.origin}/__offline/${kind}/${await digest(parsed.href + '|' + variant)}`);
}
export async function saveResponse(owner, kind, url, response, variant = '') {
  if (!owner || !response.ok || response.redirected) return;
  const headers = decodedHeaders(response.headers);
  headers.set('x-adamia-saved-at', String(Date.now()));
  headers.delete('set-cookie');
  const saved = new Response(await response.clone().arrayBuffer(), { status: response.status, headers });
  await (await caches.open(cacheName(owner))).put(await cacheKey(kind, url, variant), saved);
}
export async function readResponse(owner, kind, url, variant = '') {
  if (!owner) return null;
  const response = await (await caches.open(cacheName(owner))).match(await cacheKey(kind, url, variant));
  if (!response || Date.now() - Number(response.headers.get('x-adamia-saved-at') || 0) > OFFLINE_MAX_AGE) return null;
  const headers = decodedHeaders(response.headers);
  headers.set('x-adamia-offline', '1');
  return new Response(await response.arrayBuffer(), { status: response.status, headers });
}
export async function clearSession(token = cookieToken()) {
  if (token) await caches.delete(cacheName(await digest(token)));
}
function pageAssets(html) {
  return [...new Set(Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g), match => {
    try { return new URL(match[1].replaceAll('&amp;', '&'), location.origin).href; } catch { return ''; }
  }).filter(value => value.startsWith(location.origin + '/_next/static/')))];
}
async function completePageAssets(html, download) {
  const runtime = await caches.open('adamia-runtime-assets-v1');
  const assets = pageAssets(html);
  const results = await Promise.all(assets.map(async url => {
    if (await runtime.match(url, { ignoreVary: true })) return true;
    if (!download || !originalFetch) return false;
    try {
      const response = await originalFetch(url);
      if (!response.ok) return false;
      await runtime.put(url, response);
      return true;
    } catch { return false; }
  }));
  return results.every(Boolean);
}
export function rscVariant(request) {
  return ['rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-router-segment-prefetch'].map(name => request.headers.get(name) || '').join('|');
}
function eligibleApi(url) {
  return (url.origin === location.origin && url.pathname.startsWith('/api/')) || (apiBase && url.href.startsWith(apiBase + '/'));
}
export function rememberCompany(profile) {
  try {
  const companies = JSON.parse(localStorage.getItem('adamia-offline-companies') || '{}');
  companies[profile.slug] = { id: profile.id_empresa, slug: profile.slug };
  localStorage.setItem('adamia-offline-companies', JSON.stringify(companies));
  } catch { /* Browsing online still works when persistent storage is unavailable. */ }
}
async function publicOwner(url) {
  try {
  const companies = JSON.parse(localStorage.getItem('adamia-offline-companies') || '{}');
  for (const company of Object.values(companies)) {
    const path = url.pathname;
    if (path.endsWith(`/empresas/slug/${encodeURIComponent(company.slug)}`) || path.endsWith(`/empresas/id/${company.id}/slug`) || path === `/api/empresas/check-subscription/${company.id}` || (path.endsWith('/checador/reloj/registros-del-dia') && url.searchParams.get('id_empresa') === String(company.id)) || (path === '/api/empresas/check-status' && url.searchParams.get('id') === String(company.id))) return digest(`company:${company.id}:${company.slug}`);
  }
  } catch { return null; }
  return null;
}
export function installOfflineFetch(base) {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  apiBase = new URL(base, location.origin).href.replace(/\/$/, '');
  if (originalFetch) return;
  originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const isApi = eligibleApi(url);
    const authorization = request.headers.get('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : cookieToken();
    const owner = await ownerKey(token);
    const publicKey = await publicOwner(url);
    const effectiveOwner = owner || publicKey;
    const isRsc = url.origin === location.origin && request.headers.get('rsc') === '1';
    const navigateStoredPage = () => {
      if (!isRsc || request.headers.get('next-router-prefetch') === '1' || request.headers.has('next-router-segment-prefetch')) return null;
      const target = new URL(url); target.searchParams.delete('_rsc');
      if (target.href === location.href) return null;
      reportNetwork(true);
      location.assign(target.href);
      // Let the document navigation replace this page, without feeding a failed
      // or partial RSC patch into the current React tree (notably on Safari).
      return new Promise(() => {});
    };
    let outgoing = request;
    if (isRsc && owner) {
      const headers = new Headers(request.headers);
      headers.set('x-adamia-session', owner);
      outgoing = new Request(request, { headers });
    }
    const get = request.method === 'GET';
    const kind = isRsc ? 'rsc' : 'api';
    const variant = isRsc ? rscVariant(request) : '';
    const read = async () => {
      if (!get) throw new TypeError('Sin conexión. Este cambio necesita internet y no se ha enviado.');
      const cached = (isApi || isRsc) && get ? await readResponse(effectiveOwner, kind, url, variant) : null;
      if (cached) { reportNetwork(true); return cached; }
      throw new TypeError('Sin conexión. Esta información todavía no está guardada en este celular.');
    };
    if ((!navigator.onLine || window.__adamiaOffline === true) && isRsc) {
      const navigation = navigateStoredPage();
      if (navigation) return navigation;
    }
    if (!navigator.onLine && (isApi || isRsc)) return read();
    let timer;
    let cancel;
    if (isApi && get) {
      const controller = new AbortController();
      cancel = () => controller.abort(request.signal.reason);
      if (request.signal.aborted) cancel();
      else request.signal.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(() => controller.abort(new Error('El servidor no responde')), 12000);
      outgoing = new Request(outgoing, { signal: controller.signal });
    }
    try {
      const response = await originalFetch(outgoing);
      if (response.status === 401 || response.status === 403) {
        // An explicit server denial always wins over a stored response.
        if (owner && (response.status === 401 || url.pathname.endsWith('/users/verify/token'))) await caches.delete(cacheName(owner));
        else if (effectiveOwner) await (await caches.open(cacheName(effectiveOwner))).delete(await cacheKey(kind, url, variant)).catch(() => {});
        return response;
      }
      if (response.status >= 500 && get && (isApi || isRsc)) {
        const cached = await readResponse(effectiveOwner, kind, url, variant);
        if (cached) { reportNetwork(true); return cached; }
      }
      if (get && effectiveOwner && response.ok && (isApi || isRsc) && !url.pathname.includes('/offline/')) {
        const type = response.headers.get('content-type') || '';
        if (type.includes('json') || (isRsc && response.headers.get('x-adamia-session') === owner)) {
          await saveResponse(effectiveOwner, kind, url, response, variant).catch(() => {});
          if (publicKey && publicKey !== effectiveOwner) await saveResponse(publicKey, kind, url, response, variant).catch(() => {});
        }
      }
      if (response.ok && isApi) reportNetwork(false);
      return response;
    } catch (error) {
      if (request.signal.aborted) throw error;
      if (isApi || isRsc) {
        reportNetwork(true);
        const navigation = navigateStoredPage();
        if (navigation) return navigation;
        return read();
      }
      throw error;
    } finally {
      clearTimeout(timer);
      if (cancel) request.signal.removeEventListener('abort', cancel);
    }
  };
}

export async function snapshotPage(path = location.pathname + location.search) {
  const owner = await ownerKey();
  if (!owner || !navigator.onLine || !originalFetch) return;
  const response = await originalFetch(new URL(path, location.origin), { headers: { Accept: 'text/html', 'x-adamia-snapshot': '1' }, credentials: 'same-origin', cache: 'no-store' });
  if (response.headers.get('x-adamia-session') !== owner || !response.ok || response.redirected || !response.headers.get('content-type')?.includes('text/html')) return;
  if (!await completePageAssets(await response.clone().text(), true)) return;
  await saveResponse(owner, 'page', new URL(path, location.origin), response);
  await (await caches.open(cacheName(owner))).put(new Request(`${location.origin}/__offline/last-page`), new Response(JSON.stringify({ path, at: Date.now(), api: apiBase })));
}

export async function restorePage() {
  const owner = await ownerKey();
  let path = location.pathname + location.search;
  const saved = owner && await (await caches.open(cacheName(owner))).match(`${location.origin}/__offline/last-page`);
  const last = saved && await saved.json();
  if (!last?.api || !await readResponse(owner, 'api', last.api + '/users/verify/token')) return false;
  if (location.pathname === '/login' && owner) {
    if (last && Date.now() - last.at < OFFLINE_MAX_AGE) { path = last.path; history.replaceState(null, '', path); }
  }
  const response = await readResponse(owner, 'page', location.href);
  if (!response) return false;
  const html = await response.text();
  if (!await completePageAssets(html, false)) return false;
  // The cache partition is derived from the current cookie, never from a stored
  // "last user". Cached HTML is not written until the session lease is checked.
  document.open(); document.write(html); document.close();
  return !!path;
}
