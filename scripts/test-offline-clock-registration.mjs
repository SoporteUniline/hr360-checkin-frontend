import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { syncFailure } from '../public/offline-clock/store.mjs';

const source = (await readFile(new URL('../src/lib/offline-clock.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/^export const clockStore = .*;$/m, 'const clockStore = async () => store;')
  .replace(/\bexport /g, '');

function harness({ online = true, detectedOffline = false, method = 'ambos', getProfile, save, send } = {}) {
  const events = new Map();
  const navigator = { onLine: online };
  let requests = 0;
  const profile = { id_empresa: 10, id_empleado: 2, session: 'session', metodo: method, nombre: 'Prueba', prepared_at: new Date().toISOString() };
  const store = {
    getValue: async () => { getProfile?.(navigator); return profile; },
    fingerprint: async () => 'session',
    saveEvent: async event => { events.set(event.id, event); save?.(navigator); },
    listEvents: async () => [...events.values()], syncFailure,
  };
  const context = vm.createContext({
    store, navigator, crypto: webcrypto, Event, URL, setTimeout, clearTimeout,
    window: { __adamiaOffline: detectedOffline, dispatchEvent() {} },
    Cookies: { get: () => 'test-session' },
    axios: { post: async (_url, body) => { requests++; return send ? send(body) : { data: { id: body.id, status: 'synced', action: 'entrada', employee: { nombre: 'Prueba' } } }; } },
  });
  vm.runInContext(source + '\nglobalThis.register = registerClockMovement;', context);
  return { register: payload => context.register(payload, { company: 10, employee: 2 }), events, requests: () => requests };
}

const face = { descriptor_facial: [0.1, 0.2] };

test('new facial captures are blocked before storage when offline or connectivity was lost', async () => {
  for (const options of [{ online: false }, { detectedOffline: true }, { getProfile: navigator => { navigator.onLine = false; } }]) {
    const clock = harness(options);
    await assert.rejects(clock.register(face), { code: 'FACIAL_REQUIRES_CONNECTION' });
    assert.equal(clock.events.size, 0);
    assert.equal(clock.requests(), 0);
  }
});

test('a connection lost while saving cancels an unsent facial capture', async () => {
  const clock = harness({ save: navigator => { navigator.onLine = false; } });
  await assert.rejects(clock.register(face), { code: 'FACIAL_REQUIRES_CONNECTION' });
  const [event] = clock.events.values();
  assert.equal(event.status, 'rejected');
  assert.equal(event.descriptor, undefined);
  assert.equal(clock.requests(), 0);
});

test('offline codes retain their original capture time and remain pending', async () => {
  const clock = harness({ online: false });
  const captured_at = '2026-11-09T12:00:00.000Z';
  const result = await clock.register({ codigo: '123', captured_at });
  assert.equal(result.data.pending, true);
  const [event] = clock.events.values();
  assert.equal(event.method, 'codigo');
  assert.equal(event.code, '123');
  assert.equal(event.captured_at, captured_at);
  assert.equal(event.status, 'pending');
  assert.equal(clock.requests(), 0);
});

test('a facial-only personal profile cannot enqueue an offline code', async () => {
  const clock = harness({ online: false, method: 'facial' });
  await assert.rejects(clock.register({ codigo: '123' }), /solo permite reconocimiento facial/);
  assert.equal(clock.events.size, 0);
});

test('online facial recognition still sends and removes confirmed biometric evidence', async () => {
  const clock = harness();
  await clock.register(face);
  const [event] = clock.events.values();
  assert.equal(event.status, 'synced');
  assert.equal(event.descriptor, undefined);
  assert.equal(clock.requests(), 1);
});

test('a lost response retains the facial UUID for reconciliation instead of losing evidence', async () => {
  const clock = harness({ send: () => { throw new Error('Lost response'); } });
  const result = await clock.register(face);
  const [event] = clock.events.values();
  assert.equal(result.data.offline_event.id, event.id);
  assert.equal(event.status, 'pending');
  assert.deepEqual(event.descriptor, face.descriptor_facial);
});

test('previous facial events can still be resumed offline with their original identity and time', async () => {
  const clock = harness({ online: false });
  await clock.register({ ...face, offline_event: { id: 'previous-id', captured_at: '2026-11-09T12:00:00.000Z' } });
  const [event] = clock.events.values();
  assert.equal(event.id, 'previous-id');
  assert.equal(event.captured_at, '2026-11-09T12:00:00.000Z');
  assert.equal(event.status, 'pending');
});
