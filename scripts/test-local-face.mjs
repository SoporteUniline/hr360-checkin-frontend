import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicKey, verify } from 'node:crypto';
import { MODEL, cosine, matchFace, validateCaptureTime, validateLocalLocation, localAction, deviceIdentity, canonical, signEvent } from '../public/offline-clock/face.mjs';

const descriptor = Array.from({ length: 128 }, (_, i) => i === 0 ? 1 : 0);
const other = Array.from({ length: 128 }, (_, i) => i === 1 ? 1 : 0);
const employee = { id: 1, nombre: 'Ana', descriptor, code_identity: 'code-hash', open: false, cierre_turno: 'Automatico', checar_gps: true, areas: [{ latitud: 0, longitud: 0, radio_metros: 100 }] };
const dataset = () => ({ company: 10, model: MODEL, prepared_at: new Date(Date.now() - 1000).toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), employees: [employee] });

test('historical invalid GPS and code captures neither block nor change the offline turn', () => {
  for (const failure of [{ errorCode: 'CODE_NOT_MATCHED' }, { errorCode: 'GPS_INACCURATE' }, { error: 'Código no encontrado o ambiguo en esta empresa' }]) {
    const invalid = { company: 10, local_employee: 1, action: 'entrada', status: 'review', blocksFollowing: true, captured_at: new Date().toISOString(), ...failure };
    assert.equal(localAction(employee, dataset(), [invalid]), 'entrada');
    assert.equal(localAction({ ...employee, open: true }, dataset(), [invalid]), 'salida');
    assert.equal(invalid.status, 'review');
  }
});

test('a real local comparison identifies the matching reference and refuses unknown or ambiguous faces', () => {
  assert.equal(cosine(descriptor, descriptor), 1);
  assert.equal(cosine(descriptor, other), 0);
  assert.equal(matchFace(descriptor, dataset()).employee.id, 1);
  assert.throws(() => matchFace(other, dataset()), { code: 'FACE_NOT_MATCHED' });
  assert.throws(() => matchFace([1], dataset()), { code: 'FACE_NOT_MATCHED' });
  assert.throws(() => matchFace(descriptor, { ...dataset(), employees: [employee, { ...employee, id: 2 }] }), { code: 'FACE_AMBIGUOUS' });
});

test('a prepared company clock identifies different employees and keeps their offline turns separate throughout the day', () => {
  const prepared = Date.now() - 12 * 3600000;
  const data = { ...dataset(), prepared_at: new Date(prepared).toISOString(), expires_at: new Date(prepared + 7 * 86400000).toISOString(),
    employees: [employee, { ...employee, id: 2, nombre: 'Luis', descriptor: other, code_identity: 'other-code-hash' }] };
  const first = matchFace(descriptor, data).employee;
  const second = matchFace(other, data).employee;
  assert.equal(first.id, 1);
  assert.equal(second.id, 2);
  const queue = [];
  for (const person of [first, second, first, second]) {
    const action = localAction(person, data, queue);
    const captured_at = new Date().toISOString();
    validateCaptureTime(data, captured_at);
    queue.push({ company: 10, local_employee: person.id, action, status: 'pending', captured_at });
  }
  assert.deepEqual(queue.map(event => [event.local_employee, event.action]), [[1, 'entrada'], [2, 'entrada'], [1, 'salida'], [2, 'salida']]);
});

test('missing, expired and incompatible downloads cannot identify an employee offline', () => {
  for (const value of [null, { ...dataset(), model: 'other' }, { ...dataset(), expires_at: new Date(Date.now() - 1).toISOString() }]) assert.throws(() => matchFace(descriptor, value), { code: 'LOCAL_FACE_NOT_READY' });
});

test('GPS requirements are decided locally with the downloaded areas and original capture time', () => {
  const time = Date.now();
  const event = { latitude: 0, longitude: 0, precision_metros: 8, ubicacion_timestamp: time, captured_at: new Date(time).toISOString() };
  assert.doesNotThrow(() => validateLocalLocation(employee, event));
  assert.throws(() => validateLocalLocation(employee, { ...event, latitude: null }), { code: 'GPS_REQUIRED' });
  assert.throws(() => validateLocalLocation(employee, { ...event, precision_metros: 80 }), { code: 'GPS_INACCURATE' });
  assert.throws(() => validateLocalLocation(employee, { ...event, ubicacion_timestamp: time - 61000 }), { code: 'GPS_REFRESH_REQUIRED' });
  assert.throws(() => validateLocalLocation(employee, { ...event, latitude: 1 }), { code: 'GPS_OUTSIDE_AREA' });
  assert.throws(() => validateLocalLocation({ ...employee, areas: [] }, event), { code: 'AREA_INVALID' });
  assert.doesNotThrow(() => validateLocalLocation({ ...employee, checar_gps: false }, {}));
});

test('a misconfigured clock is rejected locally rather than creating an attendance that cannot upload', () => {
  const data = dataset();
  assert.doesNotThrow(() => validateCaptureTime(data, new Date().toISOString()));
  assert.throws(() => validateCaptureTime(data, new Date(Date.parse(data.prepared_at) - 300000).toISOString()), { code: 'LOCAL_CLOCK_TIME_INVALID' });
  assert.throws(() => validateCaptureTime(data, 'invalid'), { code: 'LOCAL_CLOCK_TIME_INVALID' });
});

test('the device alternates known entry and exit state without waiting for the server', () => {
  const data = dataset();
  assert.equal(localAction(employee, data, []), 'entrada');
  const entry = { company: 10, local_employee: 1, action: 'entrada', status: 'pending', captured_at: new Date().toISOString() };
  assert.equal(localAction(employee, data, [entry]), 'salida');
  assert.equal(localAction(employee, data, [entry, { ...entry, action: 'salida', captured_at: new Date(Date.now() + 1000).toISOString() }]), 'entrada');
  assert.equal(localAction(employee, data, [{ ...entry, local_employee: 2 }]), 'entrada');
});

test('manual closures and unresolved older captures are handled before storing the next movement', () => {
  assert.equal(localAction({ ...employee, open: true, cierre_turno: 'Manual' }, dataset(), []), 'decision');
  assert.throws(() => localAction(employee, dataset(), [{ company: 10, local_employee: 1, action: 'entrada', status: 'review', captured_at: new Date().toISOString() }]), { code: 'LOCAL_PREVIOUS_REVIEW' });
  assert.throws(() => localAction(employee, dataset(), [], 'salida'), { code: 'LOCAL_TRANSITION_INVALID' });
});

test('pending codes from the same employee contribute to local state without using other employees', () => {
  const entry = { company: 10, identity: 'code-hash', action: 'entrada', status: 'pending', captured_at: new Date().toISOString() };
  assert.equal(localAction(employee, dataset(), [entry]), 'salida');
  assert.equal(localAction(employee, dataset(), [{ ...entry, local_employee: 2 }]), 'entrada');
  assert.throws(() => localAction(employee, dataset(), [{ ...entry, action: 'auto' }]), { code: 'LOCAL_CLOCK_PENDING' });
});

const state = (revision, open, employee = 1, company = 10) => ({ revision, open, employee, company, observed_at: new Date().toISOString() });

test('confirmed state overrides a stale download even when an offline capture predates its preparation time', () => {
  const data = dataset();
  const oldCapture = { company: 10, local_employee: 1, action: 'entrada', resolvedAction: 'entrada', status: 'synced', captured_at: new Date(Date.now() - 3600000).toISOString(), clock_state: state(10, true) };
  assert.equal(localAction({ ...employee, clock_state: state(9, false) }, data, [oldCapture]), 'salida');
  const closed = { ...oldCapture, id: 'exit', action: 'salida', resolvedAction: 'salida', clock_state: state(11, false) };
  assert.equal(localAction({ ...employee, clock_state: state(9, false) }, data, [oldCapture, closed]), 'entrada');
});

test('a snapshot already containing a confirmed code entry is not toggled a second time', () => {
  const confirmed = { company: 10, local_employee: 1, action: 'auto', resolvedAction: 'entrada', status: 'synced', captured_at: new Date().toISOString(), clock_state: state(10, true) };
  assert.equal(localAction({ ...employee, open: true, clock_state: state(10, true) }, dataset(), [confirmed]), 'salida');
  assert.equal(localAction({ ...employee, clock_state: state(11, false) }, dataset(), [confirmed]), 'entrada');
});

test('a rejected entry is retained for review but never changes or blocks a known current turn', () => {
  const review = { company: 10, local_employee: 1, action: 'entrada', status: 'review', captured_at: new Date().toISOString(), errorCode: 'CLOCK_ENTRY_ALREADY_OPEN', clock_state: state(10, true) };
  assert.equal(localAction(employee, dataset(), [review]), 'salida');
  assert.equal(review.status, 'review');
  assert.equal(review.action, 'entrada');
  const legacy = { ...review, errorCode: undefined, clock_state: undefined, error: 'Ya existe una entrada abierta. Requiere revisión de RH.' };
  assert.throws(() => localAction(employee, dataset(), [legacy]), { code: 'LOCAL_CLOCK_STATE_REQUIRED' });
  assert.equal(localAction({ ...employee, clock_state: state(10, true) }, dataset(), [legacy]), 'salida');
});

test('state receipts from another employee or company cannot alter the local projection', () => {
  const confirmed = { company: 10, local_employee: 1, action: 'entrada', status: 'synced', captured_at: new Date(Date.now() - 3600000).toISOString(), clock_state: state(100, true, 2) };
  assert.equal(localAction(employee, dataset(), [confirmed]), 'entrada');
  assert.equal(localAction(employee, dataset(), [{ ...confirmed, clock_state: state(100, true, 1, 11) }]), 'entrada');
});

test('device keys are persistent, nonextractable and created once during concurrent preparation', async () => {
  const values = new Map();
  const store = { getValue: async key => values.get(key), setValue: async (key, value) => values.set(key, structuredClone(value)) };
  const [first, second] = await Promise.all([deviceIdentity(store), deviceIdentity(store)]);
  assert.equal(first.id, second.id);
  assert.equal((await deviceIdentity(store)).id, first.id);
  assert.equal(first.privateKey.extractable, false);
  await assert.rejects(crypto.subtle.exportKey('jwk', first.privateKey));
});

test('WebCrypto result signatures verify with the server Node format and bind all original data', async () => {
  const values = new Map();
  const store = { getValue: async key => values.get(key), setValue: async (key, value) => values.set(key, value) };
  const device = await deviceIdentity(store);
  const original = { id: crypto.randomUUID(), captured_at: new Date().toISOString(), action: 'entrada', method: 'facial', company: 10, local_employee: 1, latitude: null, longitude: null, local_verification: { device_id: device.id, model: MODEL, reference: 'hash', score: 1, grant: 'authorization' } };
  const event = await signEvent(original, store);
  const key = createPublicKey({ key: device.publicKey, format: 'jwk' });
  const signature = Buffer.from(event.local_verification.signature, 'base64url');
  assert(verify('sha256', Buffer.from(canonical(event)), { key, dsaEncoding: 'ieee-p1363' }, signature));
  assert(!verify('sha256', Buffer.from(canonical({ ...event, action: 'salida' })), { key, dsaEncoding: 'ieee-p1363' }, signature));
  assert.equal(event.captured_at, original.captured_at);
  const decided = await signEvent({ ...event, action: 'cerrar_turno' }, store);
  assert.equal(decided.id, original.id);
  assert.equal(decided.captured_at, original.captured_at);
  assert(verify('sha256', Buffer.from(canonical(decided)), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(decided.local_verification.signature, 'base64url')));
});
