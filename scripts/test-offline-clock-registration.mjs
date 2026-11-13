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

const componentSource = await readFile(new URL('../src/components/RelojChecador.jsx', import.meta.url), 'utf8');
const submitMovementSource = componentSource.match(/const submitMovement = ([^\r\n]+);/)[1];

function harness({ online = true, detectedOffline = false, method = 'ambos', getProfile, save, send, companyClock = false, employeePage = false } = {}) {
  const events = new Map();
  const values = new Map();
  const navigator = { onLine: online };
  let requests = 0;
  const profile = { id_empresa: 10, id_empleado: 2, session: companyClock || employeePage ? null : 'session', grant: companyClock || employeePage ? 'company-permit' : undefined, metodo: method, nombre: 'Prueba', prepared_at: new Date().toISOString() };
  const store = {
    getValue: async key => { if (key.startsWith('clock:')) { getProfile?.(navigator); return profile; } return values.get(key); },
    setValue: async (key, value) => values.set(key, value),
    fingerprint: async () => companyClock ? null : 'session',
    saveEvent: async event => { events.set(event.id, event); save?.(navigator); },
    listEvents: async () => [...events.values()], syncFailure, syncEvents, syncCompanyEvents,
  };
  const context = vm.createContext({
    store, engine, navigator, crypto: webcrypto, Event, URL, setTimeout, clearTimeout, ensureOfflineCache: async () => null,
    idEmpresa: 10, idEmpleado: 2, modoEmpleado: true, companySlug: 'fixture',
    window: { __adamiaOffline: detectedOffline, dispatchEvent() {} },
    Cookies: { get: () => companyClock ? undefined : 'test-session' },
    fetch: async () => ({}),
    axios: { get: async () => ({ data: {} }), post: async (url, body) => { requests++; return send ? send(body, url) : { data: { id: body.id, status: 'synced', action: 'entrada', employee: { nombre: 'Prueba' } } }; } },
  });
  vm.runInContext(source + '\nglobalThis.register = registerClockMovement; globalThis.sync = synchronizeClockQueue; globalThis.prepare = prepareLocalFaces;', context);
  vm.runInContext(`globalThis.pageSubmit = ${submitMovementSource};`, context);
  return { prepare: options => context.prepare({ company: 10, slug: 'fixture', ...options }), register: payload => employeePage ? context.pageSubmit(payload) : context.register(payload, { company: 10, employee: companyClock ? null : 2 }), sync: () => context.sync(), setOnline: value => { navigator.onLine = value; }, store, values, events, requests: () => requests };
}

test('employee page submits coworker codes to the company clock and shows the server resolved identity', async () => {
  const clock = harness({ employeePage: true, method: 'facial', send: async (body, url) => {
    assert.equal(url, '/checador/reloj/offline/empresa/sincronizar');
    assert.equal(body.code, '456');
    assert.equal(body.grant, 'company-permit');
    return { data: { id: body.id, status: 'synced', action: 'entrada', employee: { id: 3, nombre: 'Compañera' } } };
  } });
  const result = await clock.register({ codigo: '456' });
  assert.equal(result.data.empleado.nombre, 'Compañera');
  assert.equal(result.data.pending, undefined);
  const [event] = clock.events.values();
  assert.equal(event.scope, 'company');
  assert.equal(event.employee, undefined);
  assert.equal(event.status, 'synced');
});

test('coworker code captured offline on an employee page keeps time and identity through reconnect and turn decision', async () => {
  let decision = true;
  const clock = harness({ employeePage: true, online: false, method: 'facial', send: async (body, url) => {
    assert.equal(url, '/checador/reloj/offline/empresa/sincronizar');
    assert.equal(body.code, '456');
    if (decision) { decision = false; return { data: { requiereDecision: true, empleado: { nombre: 'Compañera' } } }; }
    assert.equal(body.action, 'cerrar_turno');
    return { data: { id: body.id, status: 'synced', action: 'cerrar_turno', employee: { id: 3, nombre: 'Compañera' } } };
  } });
  const captured_at = new Date().toISOString();
  const result = await clock.register({ codigo: '456', captured_at });
  const original = result.data.offline_event;
  assert.equal(result.data.pending, true);
  assert.equal(original.scope, 'company');
  assert.equal(original.employee, undefined);
  assert.equal(original.alias, 'Código •••456');
  assert.equal(clock.requests(), 0);
  clock.setOnline(true);
  await clock.sync();
  const event = clock.events.get(original.id);
  assert.equal(event.status, 'decision');
  const confirmed = await clock.register({ codigo: '456', accion: 'cerrar_turno', offline_event: event });
  assert.equal(confirmed.data.empleado.nombre, 'Compañera');
  assert.equal(clock.events.size, 1);
  assert.equal(clock.events.get(original.id).captured_at, captured_at);
  assert.equal(clock.events.get(original.id).status, 'synced');
});

const face = { descriptor_facial: [0.1, 0.2] };

test('independent offline devices keep separate queues and a conflicting upload is reviewed instead of marked synced', async () => {
  const receipts = new Map();
  const state = { company: 10, employee: 2, revision: 2, open: true };
  const send = async body => {
    if (receipts.has(body.id)) return { data: receipts.get(body.id) };
    if (receipts.size) throw Object.assign(new Error('Entry already open'), {
      response: { status: 409, data: { code: 'CLOCK_ENTRY_ALREADY_OPEN', error: 'Ya existe una entrada abierta. Requiere revisión de RH.', clock_state: state } },
    });
    const receipt = { id: body.id, status: 'synced', action: 'entrada', clock_state: state, employee: { nombre: 'Ana Local' } };
    receipts.set(body.id, receipt);
    return { data: receipt };
  };
  const a = await preparedClock({ online: false, send });
  const b = await preparedClock({ online: false, send });
  const first = await a.clock.register({ descriptor_facial: a.descriptor });
  const second = await b.clock.register({ descriptor_facial: b.descriptor });
  const eventA = first.data.offline_event, eventB = second.data.offline_event;
  assert.notEqual(eventA.id, eventB.id);
  assert.notEqual(eventA.local_verification.device_id, eventB.local_verification.device_id);
  assert.equal(a.clock.events.has(eventB.id), false);
  assert.equal(b.clock.events.has(eventA.id), false);
  assert.equal(first.data.pending, true);
  assert.equal(second.data.pending, true);
  a.clock.setOnline(true);
  await a.clock.sync();
  assert.equal(a.clock.events.get(eventA.id).status, 'synced');
  assert.equal(b.clock.events.get(eventB.id).status, 'pending');
  b.clock.setOnline(true);
  await b.clock.sync();
  const conflict = b.clock.events.get(eventB.id);
  assert.equal(conflict.status, 'review');
  assert.equal(conflict.errorCode, 'CLOCK_ENTRY_ALREADY_OPEN');
  assert.equal(conflict.captured_at, eventB.captured_at);
  assert.equal(conflict.action, 'entrada');
  assert.equal(conflict.clock_state.open, true);
  assert.equal(receipts.size, 1);
  await a.clock.sync();
  await b.clock.sync();
  assert.equal(receipts.size, 1);
  assert.equal(b.clock.events.get(eventB.id).status, 'review');
});

async function preparedClock(options = {}) {
  const clock = harness(options);
  const device = await engine.deviceIdentity(clock.store);
  const descriptor = Array.from({ length: 128 }, (_, i) => i === 0 ? 1 : 0);
  clock.values.set('faces:employee:10:2:session', { company: 10, model: engine.MODEL, device_id: device.id, prepared_at: new Date(Date.now() - 1000).toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), employees: [{ id: 2, nombre: 'Ana Local', descriptor, reference: 'reference', grant: 'authorization', open: false, cierre_turno: 'Automatico', checar_gps: false }] });
  return { clock, descriptor };
}

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

test('a prepared public company clock recognizes offline without a login and uploads the signed capture on reconnect', async () => {
  const clock = harness({ online: false, companyClock: true });
  const device = await engine.deviceIdentity(clock.store);
  const descriptor = Array.from({ length: 128 }, (_, i) => i === 0 ? 1 : 0);
  clock.values.set('faces:company:10', { company: 10, model: engine.MODEL, device_id: device.id, prepared_at: new Date(Date.now() - 12 * 3600000).toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), employees: [{ id: 2, nombre: 'Ana Local', descriptor, reference: 'reference', grant: 'signed-server-permit', open: false, cierre_turno: 'Automatico', checar_gps: false }] });
  const captured_at = new Date().toISOString();
  const result = await clock.register({ descriptor_facial: descriptor, captured_at });
  const event = result.data.offline_event;
  assert.equal(result.data.pending, true);
  assert.equal(event.scope, 'company');
  assert.equal(event.employeeName, 'Ana Local');
  assert.equal(event.local_employee, 2);
  assert.equal(event.descriptor, undefined);
  assert.equal(typeof event.local_verification.signature, 'string');
  assert.equal(clock.requests(), 0);
  clock.setOnline(true);
  await clock.sync();
  assert.equal(clock.events.get(event.id).status, 'synced');
  assert.equal(clock.events.get(event.id).captured_at, captured_at);
  assert.equal(clock.requests(), 1);
  await clock.sync();
  assert.equal(clock.requests(), 1, 'already confirmed captures must not be resent');
});

test('opening a public clock downloads all faces without a session and automatically renews stale references', async () => {
  const clock = harness({ companyClock: true, send: (body, url) => {
    assert.equal(url, '/checador/reloj/offline/empresa/referencias');
    assert.equal(body.grant, 'company-permit');
    assert.equal(body.id_empleado, undefined);
    return { data: { kind: 'local-face', mode: 'company', company: 10, model: engine.MODEL, device_id: body.device_id, prepared_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), employees: [{ id: 2 }, { id: 3 }] } };
  } });
  await clock.prepare();
  assert.equal(clock.values.get('faces:company:10').employees.length, 2);
  assert.equal(clock.requests(), 1);
  await clock.prepare();
  assert.equal(clock.requests(), 1);
  clock.values.get('faces:company:10').prepared_at = new Date(Date.now() - 6 * 60000).toISOString();
  await clock.prepare();
  assert.equal(clock.requests(), 2);
  await clock.prepare({ force: true });
  assert.equal(clock.requests(), 3);
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
  const clock = harness({ send: body => { sent.push(body); return { data: { id: body.id, status: 'synced', action: body.action === 'auto' ? 'entrada' : body.action } }; } });
  const device = await engine.deviceIdentity(clock.store);
  const descriptor = Array.from({ length: 128 }, (_, i) => i === 0 ? 1 : 0);
  clock.values.set('faces:employee:10:2:session', { company: 10, model: engine.MODEL, device_id: device.id, prepared_at: new Date(Date.now() - 1000).toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), employees: [{ id: 2, nombre: 'Ana Local', descriptor, reference: 'reference', grant: 'authorization', open: false, cierre_turno: 'Automatico', checar_gps: false }] });
  const result = await clock.register({ descriptor_facial: descriptor });
  assert.equal(result.data.local_validated, true);
  assert.equal(result.data.pending, false);
  assert.equal(result.data.movimiento, 'Entrada registrada');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].descriptor, undefined);
  assert.equal(sent[0].local_employee, 2);
  assert.equal(sent[0].action, 'auto');
  assert.equal(typeof sent[0].local_verification.signature, 'string');
  assert.equal([...clock.events.values()][0].status, 'synced');
});

test('online local recognition waits for acknowledgement before showing successful attendance', async () => {
  let release;
  const { clock, descriptor } = await preparedClock({ send: body => new Promise(resolve => { release = () => resolve({ data: { id: body.id, status: 'synced', action: 'entrada' } }); }) });
  let finished = false;
  const registration = clock.register({ descriptor_facial: descriptor }).then(result => { finished = true; return result; });
  for (let attempt = 0; attempt < 40 && !release; attempt++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(typeof release, 'function');
  assert.equal(finished, false);
  release();
  const result = await registration;
  assert.equal(result.data.pending, false);
  assert.equal(result.data.movimiento, 'Entrada registrada');
});

test('a failed online upload retains the recognized attendance and displays pending upload', async () => {
  const { clock, descriptor } = await preparedClock({ send: () => { throw new Error('Network unavailable'); } });
  const result = await clock.register({ descriptor_facial: descriptor });
  assert.equal(result.data.pending, true);
  const event = [...clock.events.values()][0];
  assert.equal(event.status, 'pending');
  assert.equal(event.local_validated, true);
  assert.equal(event.descriptor, undefined);
  assert.equal(typeof event.local_verification.signature, 'string');
});

test('a definitive server denial is reported instead of presenting a green check or a queued success', async () => {
  const { clock, descriptor } = await preparedClock({ send: () => { throw Object.assign(new Error('Authorization expired'), { response: { status: 403, data: { error: 'Authorization expired', code: 'LOCAL_FACE_AUTH_EXPIRED' } } }); } });
  await assert.rejects(clock.register({ descriptor_facial: descriptor }), /Authorization expired/);
  assert.equal([...clock.events.values()][0].status, 'review');
});

test('an acknowledgement for another UUID cannot produce the online success confirmation', async () => {
  const { clock, descriptor } = await preparedClock({ send: () => ({ data: { id: 'other-event', status: 'synced', action: 'entrada' } }) });
  const result = await clock.register({ descriptor_facial: descriptor });
  assert.equal(result.data.pending, true);
  assert.equal([...clock.events.values()][0].status, 'pending');
});

test('a capture created during an older background pass still uploads before showing online success', async () => {
  let release, calls = 0;
  const { clock, descriptor } = await preparedClock({ online: false, send: body => {
    calls++;
    const receipt = { data: { id: body.id, status: 'synced', action: body.action === 'auto' ? (calls === 1 ? 'entrada' : 'salida') : body.action } };
    return calls === 1 ? new Promise(resolve => { release = () => resolve(receipt); }) : receipt;
  } });
  await clock.register({ codigo: '123' });
  clock.setOnline(true);
  const background = clock.sync();
  for (let attempt = 0; attempt < 40 && !release; attempt++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(typeof release, 'function');
  const registration = clock.register({ descriptor_facial: descriptor });
  for (let attempt = 0; attempt < 40 && clock.events.size < 2; attempt++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(clock.events.size, 2);
  release();
  await background;
  const result = await registration;
  assert.equal(result.data.pending, false);
  assert.equal(result.data.movimiento, 'Salida registrada');
  assert.equal(clock.requests(), 2);
  assert([...clock.events.values()].every(event => event.status === 'synced'));
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

test('background refresh callers await the same queue upload instead of reading an outdated turn snapshot', async () => {
  let release;
  const clock = harness({ online: false, send: body => new Promise(resolve => { release = () => resolve({ data: { id: body.id, status: 'synced', action: 'entrada' } }); }) });
  await clock.register({ codigo: '123' });
  clock.setOnline(true);
  const first = clock.sync();
  let secondFinished = false;
  const second = clock.sync().then(() => { secondFinished = true; });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(clock.requests(), 1);
  assert.equal(secondFinished, false);
  release();
  await Promise.all([first, second]);
  assert.equal(secondFinished, true);
  assert.equal([...clock.events.values()][0].status, 'synced');
});

test('online automatic facial capture uses the current server turn despite a stale closed local snapshot', async () => {
  const { clock, descriptor } = await preparedClock({ send: body => {
    assert.equal(body.action, 'auto');
    assert.equal(body.descriptor, undefined);
    return { data: { id: body.id, status: 'synced', action: 'salida', clock_state: { company: 10, employee: 2, revision: 11, open: false } } };
  } });
  const result = await clock.register({ descriptor_facial: descriptor });
  assert.equal(result.data.pending, false);
  assert.equal(result.data.movimiento, 'Salida registrada');
  assert.equal([...clock.events.values()][0].clock_state.revision, 11);
});

test('the previously rejected entry does not block a fresh online check and remains preserved for RH', async () => {
  const { clock, descriptor } = await preparedClock({ send: body => ({ data: { id: body.id, status: 'synced', action: 'salida', clock_state: { company: 10, employee: 2, revision: 11, open: false } } }) });
  const rejected = { id: 'historical-conflict', scope: 'employee', company: 10, employee: 2, local_employee: 2, identity: 'employee:2', action: 'entrada', captured_at: new Date(Date.now() - 60000).toISOString(), status: 'review', blocksFollowing: true, error: 'Ya existe una entrada abierta. Requiere revisión de RH.' };
  await clock.store.saveEvent(rejected);
  const result = await clock.register({ descriptor_facial: descriptor });
  assert.equal(result.data.pending, false);
  assert.equal(result.data.movimiento, 'Salida registrada');
  assert.equal(clock.events.get(rejected.id).status, 'review');
  assert.equal(clock.events.get(rejected.id).captured_at, rejected.captured_at);
  assert.equal(clock.requests(), 1);
  clock.setOnline(false);
  const next = await clock.register({ descriptor_facial: descriptor });
  assert.equal(next.data.offline_event.action, 'entrada');
});
