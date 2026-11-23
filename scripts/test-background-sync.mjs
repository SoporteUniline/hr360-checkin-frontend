import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { synchronizeBackground, eventPayload } from '../public/offline-clock/background-sync.mjs';
import { syncEvents, syncCompanyEvents, scheduleBackgroundSync } from '../public/offline-clock/store.mjs';
import { forwardOfflineEvent } from '../src/lib/offline-sync-proxy.mjs';

function fixture({ personal = false, request } = {}) {
  const event = { id: 'fixture-event', scope: personal ? 'employee' : 'company', company: 10, employee: personal ? 2 : undefined,
    identity: 'employee:2', status: 'pending', action: 'entrada', method: 'codigo', code: '123', captured_at: new Date().toISOString(), grant: personal ? undefined : 'company-grant' };
  const records = new Map([[event.id, event]]);
  const profile = { id_empresa: 10, id_empleado: personal ? 2 : undefined, api: 'https://api.example.invalid', session: personal ? 'session-hash' : null };
  const calls = [];
  const store = { listEvents: async () => [...records.values()], getValue: async () => profile, getConfig: async () => null,
    syncEvents, syncCompanyEvents, transaction: async (_name, _mode, operation) => operation({ put: value => records.set(value.id, value) }) };
  return { event, records, calls, run: () => synchronizeBackground({ store, origin: 'https://clock.example.invalid', request: async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return request ? request(url, options) : Response.json({ id: event.id, status: 'synced', action: 'entrada' });
  } }) };
}

test('a public background upload uses its company grant and clears evidence only after confirmation', async () => {
  const fx = fixture(); await fx.run();
  assert.equal(fx.records.get(fx.event.id).status, 'synced');
  assert.equal(fx.records.get(fx.event.id).code, undefined);
  assert.equal(fx.calls[0].body.grant, 'company-grant');
  assert.equal(fx.calls[0].options.credentials, 'omit');
  await fx.run(); assert.equal(fx.calls.length, 1);
});

test('network errors and missing matching receipts retain the original event for browser retry', async () => {
  for (const request of [async () => { throw Error('Offline'); }, async () => Response.json({ id: 'wrong', status: 'synced' })]) {
    const fx = fixture({ request });
    await assert.rejects(fx.run());
    const saved = fx.records.get(fx.event.id);
    assert.equal(saved.status, 'pending');
    assert.equal(saved.code, '123');
    assert.equal(saved.captured_at, fx.event.captured_at);
  }
});

test('a definitive conflict becomes review and is not repeatedly sent in the background', async () => {
  const fx = fixture({ request: async () => Response.json({ code: 'CLOCK_ENTRY_ALREADY_OPEN', error: 'Turno abierto' }, { status: 409 }) });
  await fx.run(); await fx.run();
  assert.equal(fx.records.get(fx.event.id).status, 'review');
  assert.equal(fx.calls.length, 1);
});

test('personal uploads use the same-origin session gate and expired sessions stay pending', async () => {
  const fx = fixture({ personal: true, request: async () => Response.json({}, { status: 401 }) });
  await assert.rejects(fx.run());
  assert.equal(fx.calls[0].url, 'https://clock.example.invalid/internal/offline-clock/sync');
  assert.equal(fx.calls[0].body.session, 'session-hash');
  assert.equal(fx.calls[0].options.headers.Authorization, undefined);
  assert.equal(fx.records.get(fx.event.id).status, 'pending');
});

test('the session gate rejects logout and account changes before contacting the backend', async () => {
  let calls = 0;
  const request = async () => { calls++; return Response.json({}); };
  for (const token of [undefined, 'other-account']) {
    const response = await forwardOfflineEvent({ session: 'previous-session', event: {} }, token, 'https://api.example.invalid', request);
    assert.equal(response.status, 401);
  }
  assert.equal(calls, 0);
});

test('a valid session forwards to the configured backend and preserves its receipt', async () => {
  const token = 'current-session', event = { id: 'capture' };
  const session = createHash('sha256').update(token).digest('hex');
  const response = await forwardOfflineEvent({ session, event, api: 'https://untrusted.invalid' }, token, 'https://api.example.invalid/', async (url, options) => {
    assert.equal(url, 'https://api.example.invalid/checador/reloj/offline/sincronizar');
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    assert.deepEqual(JSON.parse(options.body), event);
    return Response.json({ id: event.id, status: 'synced' });
  });
  assert.equal((await response.json()).id, event.id);
});

test('background payload preserves the signed facial proof and capture GPS without adding a descriptor', () => {
  const event = { id: 'signed', scope: 'company', company: 10, local_employee: 2, method: 'facial', action: 'salida',
    captured_at: '2026-11-13T14:00:00Z', latitude: 19, longitude: -99, precision_metros: 8, ubicacion_timestamp: 123,
    grant: 'company-grant', local_verification: { signature: 'signed-proof', device_id: 'device-a' } };
  const payload = eventPayload(event);
  for (const field of ['id', 'company', 'local_employee', 'method', 'action', 'captured_at', 'latitude', 'longitude', 'precision_metros', 'ubicacion_timestamp', 'grant', 'local_verification']) {
    assert.deepEqual(payload[field], event[field]);
  }
  assert.equal(payload.descriptor, undefined);
});

test('sync registration uses one tag and safely falls back when unsupported or denied', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'serviceWorker');
  try {
    let tag;
    Object.defineProperty(globalThis.navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => ({ sync: { register: async value => { tag = value; } } }) } });
    await scheduleBackgroundSync();
    assert.equal(tag, 'adamia-clock-upload');
    Object.defineProperty(globalThis.navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => ({}) } });
    await scheduleBackgroundSync();
    Object.defineProperty(globalThis.navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => { throw Error('Denied'); } } });
    await scheduleBackgroundSync();
  } finally {
    if (original) Object.defineProperty(globalThis.navigator, 'serviceWorker', original);
    else delete globalThis.navigator.serviceWorker;
  }
});
