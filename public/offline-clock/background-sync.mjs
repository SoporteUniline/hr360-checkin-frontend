import * as storage from './store.mjs';

export function eventPayload(event) {
  const { id, captured_at, action, method, code, descriptor, latitude, longitude,
    precision_metros, ubicacion_timestamp } = event;
  return { id, captured_at, action, method, code, descriptor, latitude, longitude,
    precision_metros, ubicacion_timestamp,
    ...(event.scope === 'company' ? { grant: event.grant } : {}),
    ...(event.local_verification ? { company: event.company, local_employee: event.local_employee, local_verification: event.local_verification } : {}),
  };
}

export async function synchronizeBackground({ store = storage, request = fetch, origin = globalThis.location.origin } = {}) {
  const groups = new Map();
  for (const event of await store.listEvents()) {
    if (['synced', 'rejected'].includes(event.status)) continue;
    const key = `${event.scope || 'employee'}:${event.company}:${event.employee || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  let retry = false;
  for (const events of groups.values()) {
    events.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
    const first = events[0], company = first.scope === 'company';
    let profile = await store.getValue(company ? `clock:company:${first.company}` : `clock:employee:${first.company}:${first.employee}`);
    if (!profile) profile = await store.getConfig();
    if (!profile || Number(profile.id_empresa) !== first.company || (!company && (Number(profile.id_empleado) !== first.employee || !profile.session))) continue;
    const send = async event => {
      const api = new URL(profile.api, origin);
      if (api.protocol !== 'https:' && api.origin !== origin) throw new Error('La dirección del servidor necesita HTTPS');
      const response = await request(company ? `${api.href.replace(/\/$/, '')}/checador/reloj/offline/empresa/sincronizar` : `${origin}/internal/offline-clock/sync`, {
        method: 'POST', credentials: company ? 'omit' : 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company ? eventPayload(event) : { event: eventPayload(event), session: profile.session }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok) {
        // An expired/logged-out/switched session needs the page to authenticate.
        // Preserve the capture rather than turning an auth failure into rejection.
        if (response.status === 401) throw new Error('Abre la aplicación e inicia sesión para subir esta checada.');
        throw Object.assign(new Error(data.error || 'No se pudo sincronizar'), { response: { status: response.status, data } });
      }
      return data;
    };
    const run = company ? store.syncCompanyEvents : store.syncEvents;
    await run(events, send, async event => {
      // Worker persistence must not register a new sync on every failed attempt.
      await store.transaction('events', 'readwrite', items => items.put(event));
      if (event.status === 'pending') retry = true;
    });
  }
  // Rejecting tells the browser to retry later, subject to its own limits.
  if (retry) throw new Error('Quedan checadas pendientes de sincronización');
}
