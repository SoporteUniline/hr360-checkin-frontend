import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { syncFailure, syncEvents, syncCompanyEvents } from '../public/offline-clock/store.mjs';
import * as engine from '../public/offline-clock/face.mjs';

const source = (await readFile(new URL('../src/lib/offline-clock.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/^export const clockStore = .*;$/m, 'const clockStore = async () => store;')
  .replace(/^export const faceEngine = .*;$/m, 'const faceEngine = async () => engine;')
  .replace(/\bexport /g, '');

function harness({ online = true, detectedOffline = false, method = 'ambos', getProfile, save, send } = {}) {
  const events = new Map();
  const values = new Map();
  const navigator = { onLine: online };
  let requests = 0;
  const profile = { id_empresa: 10, id_empleado: 2, session: 'session', metodo: method, nombre: 'Prueba', prepared_at: new Date().toISOString() };
  const store = {
    getValue: async key => { if (key.startsWith('clock:')) { getProfile?.(navigator); return profile; } return values.get(key); },
    setValue: async (key, value) => values.set(key, value),
    fingerprint: async () => 'session',
    saveEvent: async event => { events.set(event.id, event); save?.(navigator); },
    listEvents: async () => [...events.values()], syncFailure, syncEvents, syncCompanyEvents,
  };
  const context = vm.createContext({
    store, engine, navigator, crypto: webcrypto, Event, URL, setTimeout, clearTimeout,
    window: { __adamiaOffline: detectedOffline, dispatchEvent() {} },
    Cookies: { get: () => 'test-session' },
    axios: { post: async (_url, body) => { requests++; return send ? send(body) : { data: { id: body.id, status: 'synced', action: 'entrada', employee: { nombre: 'Prueba' } } }; } },
  });
  vm.runInContext(source + '\nglobalThis.register = registerClockMovement;', context);
  return { register: payload => context.register(payload, { company: 10, employee: 2 }), store, values, events, requests: () => requests };
}

const face = { descriptor_facial: [0.1, 0.2] };

test('unprepared offline facial captures fail without storing an unidentified face', async () => {
  for (const options of [{ online: false }, { detectedOffline: true }, { getProfile: navigator => { navigator.onLine = false; } }]) {
    const clock = harness(options);
    await assert.rejects(clock.register(face), { code: 'LOCAL_FACE_NOT_READY' });
    assert.equal(clock.events.size, 0);
    assert.equal(clock.requests(), 0);
  }
});

test('a connection lost while saving cancels an unsent facial capture', async () => {
  const clock = harness({ save: navigator => { navigator.onLine = false; } });
  await assert.rejects(clock.register(face), { code: 'LOCAL_FACE_NOT_READY' });
  const [event] = clock.events.values();
  assert.equal(event.status, 'rejected');
  assert.equal(event.descriptor, undefined);
  assert.equal(clock.requests(), 0);
});

test('prepared offline recognition stores a named signed attendance with no raw descriptor or request', async () => {
  const clock = harness({ online: false });
  const device = await engine.deviceIdentity(clock.store);
  const descriptor = Array.from({ length: 128 }, (_, i) => i === 0 ? 1 : 0);
  clock.values.set('faces:employee:10:2:session', { company: 10, model: engine.MODEL, device_id: device.id, prepared_at: new Date(Date.now() - 1000).toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), employees: [{ id: 2, nombre: 'Ana Local', descriptor, reference: 'reference', grant: 'signed-server-permit', code_identity: 'code-hash', open: false, cierre_turno: 'Automatico', checar_gps: false }] });
  const captured_at = new Date().toISOString();
  const result = await clock.register({ descriptor_facial: descriptor, captured_at });
  const event = result.data.offline_event;
  assert.equal(event.employeeName, 'Ana Local');
  assert.equal(event.local_employee, 2);
  assert.equal(event.action, 'entrada');
  assert.equal(event.descriptor, undefined);
  assert.equal(event.local_validated, true);
  assert.equal(event.captured_at, captured_at);
  assert.equal(typeof event.local_verification.signature, 'string');
  assert.equal(clock.requests(), 0);
  const next = await clock.register({ descriptor_facial: descriptor });
  assert.equal(next.data.offline_event.action, 'salida');
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

test('an offline manual closure is decided locally with the same UUID and original time', async () => {
  const clock = harness({ online: false });
  const device = await engine.deviceIdentity(clock.store);
  const descriptor = Array.from({ length: 128 }, (_, i) => i === 0 ? 1 : 0);
  clock.values.set('faces:employee:10:2:session', { company: 10, model: engine.MODEL, device_id: device.id, prepared_at: new Date(Date.now() - 1000).toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), employees: [{ id: 2, nombre: 'Ana Local', descriptor, reference: 'reference', grant: 'authorization', open: true, cierre_turno: 'Manual', checar_gps: false }] });
  const first = await clock.register({ descriptor_facial: descriptor });
  assert.equal(first.data.requiereDecision, true);
  const event = first.data.offline_event;
  const result = await clock.register({ offline_event: event, accion: 'cerrar_turno' });
  assert.equal(result.data.offline_event.id, event.id);
  assert.equal(result.data.offline_event.captured_at, event.captured_at);
  assert.equal(result.data.offline_event.action, 'cerrar_turno');
  assert.equal(result.data.offline_event.descriptor, undefined);
  assert.equal(clock.events.size, 1);
  assert.notEqual(result.data.offline_event.local_verification.signature, event.local_verification.signature);
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

test('a prepared online device also uploads only its signed local result and never resubmits the face', async () => {
  const sent = [];
  const clock = harness({ send: body => { sent.push(body); return { data: { id: body.id, status: 'synced', action: body.action } }; } });
  const device = await engine.deviceIdentity(clock.store);
  const descriptor = Array.from({ length: 128 }, (_, i) => i === 0 ? 1 : 0);
  clock.values.set('faces:employee:10:2:session', { company: 10, model: engine.MODEL, device_id: device.id, prepared_at: new Date(Date.now() - 1000).toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), employees: [{ id: 2, nombre: 'Ana Local', descriptor, reference: 'reference', grant: 'authorization', open: false, cierre_turno: 'Automatico', checar_gps: false }] });
  const result = await clock.register({ descriptor_facial: descriptor });
  assert.equal(result.data.local_validated, true);
  for (let attempt = 0; attempt < 20 && [...clock.events.values()][0]?.status !== 'synced'; attempt++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].descriptor, undefined);
  assert.equal(sent[0].local_employee, 2);
  assert.equal(sent[0].action, 'entrada');
  assert.equal(typeof sent[0].local_verification.signature, 'string');
  assert.equal([...clock.events.values()][0].status, 'synced');
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
