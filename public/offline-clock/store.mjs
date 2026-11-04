const DB_NAME = 'adamia-offline-clock-v1';
let opening;

export function database() {
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('config');
      request.result.createObjectStore('events', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); opening = undefined; };
      resolve(request.result);
    };
    request.onerror = () => { opening = undefined; reject(request.error); };
    request.onblocked = () => { opening = undefined; reject(new Error('Cierra otras ventanas del reloj e intenta de nuevo.')); };
  });
  return opening;
}

export async function transaction(store, mode, operation) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = operation(tx.objectStore(store));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('No se pudo guardar en el celular'));
  });
}

export const getConfig = () => transaction('config', 'readonly', store => store.get('profile'));
export const setConfig = config => transaction('config', 'readwrite', store => store.put(config, 'profile'));
export const clearConfig = () => transaction('config', 'readwrite', store => store.delete('profile'));
export const listEvents = () => transaction('events', 'readonly', store => store.getAll());
export const saveEvent = event => transaction('events', 'readwrite', store => store.put(event));

export function readToken() {
  return document.cookie.split('; ').find(value => value.startsWith('token='))?.slice(6);
}

export async function fingerprint(token) {
  if (!token) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(decodeURIComponent(token)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function ownEvents(events, profile) {
  return events.filter(event => event.employee === profile.id_empleado && event.company === profile.id_empresa)
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at) || a.id.localeCompare(b.id));
}

// Stop at the first unconfirmed event: later exits must never overtake an entry.
export async function syncEvents(events, send, persist) {
  for (const event of events.filter(event => event.status !== 'synced')) {
    try {
      const receipt = await send(event);
      if (receipt?.id !== event.id || receipt?.status !== 'synced') throw new Error('El servidor no confirmó esta checada. Se conservará pendiente.');
      await persist({ ...event, status: 'synced', error: '', code: undefined, descriptor: undefined });
    } catch (error) {
      await persist({ ...event, error: error.message });
      break;
    }
  }
}
