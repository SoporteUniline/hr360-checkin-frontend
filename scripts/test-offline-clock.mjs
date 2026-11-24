import test from 'node:test';
import assert from 'node:assert/strict';
import { ownEvents, syncEvents, syncCompanyEvents } from '../public/offline-clock/store.mjs';

const profile = { id_empleado: 1, id_empresa: 10 };
const entry = { id: 'entry', employee: 1, company: 10, captured_at: '2026-11-03T14:00:00.000Z', status: 'pending', method: 'codigo', code: '123' };
const exit = { ...entry, id: 'exit', captured_at: '2026-11-03T20:00:00.000Z' };

test('definitively invalid captures preserve evidence and allow later valid events in personal and company clocks', async () => {
  for (const run of [syncEvents, syncCompanyEvents]) {
    for (const code of ['CODE_NOT_MATCHED', 'CODE_NOT_FOUND', 'FACE_NOT_MATCHED', 'GPS_INACCURATE', 'GPS_OUTSIDE_AREA', 'GPS_REQUIRED', 'GPS_REFRESH_REQUIRED', 'AREA_INVALID', 'METHOD_FACIAL_ONLY', 'METHOD_CODE_ONLY']) {
      const sent = [], saved = [];
      await run([entry, exit], async event => {
        sent.push(event.id);
        if (event.id === entry.id) throw { response: { status: 403, data: { code, error: 'Intento rechazado' } } };
        return { id: event.id, status: 'synced' };
      }, async event => saved.push(event));
      assert.deepEqual(sent, ['entry', 'exit'], code);
      assert.equal(saved[0].status, 'review');
      assert.equal(saved[0].blocksFollowing, false);
      assert.equal(saved[0].code, entry.code);
      assert.equal(saved[0].captured_at, entry.captured_at);
      assert.equal(saved[1].status, 'synced');
    }
  }
});

test('historical invalid attempts with blocking flags no longer stop valid captures', async () => {
  for (const failure of [{ errorCode: 'CODE_NOT_MATCHED' }, { errorCode: 'GPS_INACCURATE' }, { error: 'Código no encontrado o ambiguo en esta empresa' }]) {
    const historical = { ...entry, ...failure, status: 'review', blocksFollowing: true };
    const original = structuredClone(historical), sent = [];
    await syncEvents([historical, exit], async event => {
      sent.push(event.id);
      return { id: event.id, status: 'synced' };
    }, async () => {});
    assert.deepEqual(sent, ['exit']);
    assert.deepEqual(historical, original);
  }
});

test('authorization failures and unknown rejections still stop later events', async () => {
  for (const code of ['CLOCK_AUTH_EXPIRED', 'LOCAL_FACE_INVALID', undefined]) {
    const sent = [], saved = [];
    await syncEvents([entry, exit], async event => {
      sent.push(event.id);
      throw { response: { status: 403, data: { code, error: 'No autorizado' } } };
    }, async event => saved.push(event));
    assert.deepEqual(sent, ['entry']);
    assert.equal(saved[0].blocksFollowing, true);
  }
});

test('isolates employee/company queues and preserves chronological order', () => {
  assert.deepEqual(ownEvents([exit, { ...entry, employee: 2 }, { ...entry, company: 11 }, entry], profile), [entry, exit]);
});

test('stops when the first pending event fails, without losing its credentials', async () => {
  const sent = [], saved = [];
  await syncEvents([entry, exit], async event => { sent.push(event.id); throw new Error('Sin red'); }, async event => saved.push(event));
  assert.deepEqual(sent, ['entry']);
  assert.equal(saved[0].status, 'pending');
  assert.equal(saved[0].code, '123');
  assert.equal(saved[0].error, 'Sin red');
});

test('only confirmed events are marked synced and their biometric/code evidence is removed', async () => {
  const sent = [], saved = [];
  await syncEvents([{ ...entry, status: 'synced' }, exit], async event => { sent.push(event.id); return { id: event.id, status: 'synced' }; }, async event => saved.push(event));
  assert.deepEqual(sent, ['exit']);
  assert.equal(saved[0].status, 'synced');
  assert.equal(saved[0].code, undefined);
  assert.equal(saved[0].descriptor, undefined);
});

test('a failed local confirmation stops the queue and leaves the original event retryable', async () => {
  const sent = [], saved = [];
  await syncEvents([entry, exit], async event => { sent.push(event.id); return { id: event.id, status: 'synced' }; }, async event => {
    if (event.status === 'synced') throw new Error('Storage full');
    saved.push(event);
  });
  assert.deepEqual(sent, ['entry']);
  assert.equal(saved[0].status, 'pending');
  assert.equal(saved[0].code, entry.code);
});

test('a response without the matching confirmation cannot clear a pending event', async () => {
  const saved = [];
  await syncEvents([entry], async () => ({ id: 'another-event', status: 'synced' }), async event => saved.push(event));
  assert.equal(saved[0].status, 'pending');
  assert.equal(saved[0].code, entry.code);
});

test('manual closure decisions retain the original ID and time and stop later events', async () => {
  const saved = [], sent = [];
  await syncEvents([entry, exit], async event => { sent.push(event.id); return { requiereDecision: true, empleado: { nombre: 'Empleado' } }; }, async event => saved.push(event));
  assert.deepEqual(sent, ['entry']);
  assert.equal(saved[0].status, 'decision');
  assert.equal(saved[0].id, entry.id);
  assert.equal(saved[0].captured_at, entry.captured_at);
});

test('company queues isolate other companies and personal employee queues', () => {
  const companyEvent = { ...entry, scope: 'company' };
  assert.deepEqual(ownEvents([companyEvent, entry, { ...companyEvent, company: 11 }], { scope: 'company', id_empresa: 10 }), [companyEvent]);
  assert.deepEqual(ownEvents([companyEvent, entry], profile), [entry]);
});

test('a rejected employee does not block other company codes, but cannot be overtaken by its own exit', async () => {
  const a = { ...entry, id: 'a1', code: '111' }, a2 = { ...exit, id: 'a2', code: '111' };
  const b = { ...entry, id: 'b1', code: '222' }, b2 = { ...exit, id: 'b2', code: '222' };
  const sent = [], saved = [];
  await syncCompanyEvents([a, b, a2, b2], async event => {
    sent.push(event.id);
    if (event.code === '111') throw Error('Código rechazado');
    return { id: event.id, status: 'synced', employee: { nombre: 'Empleado B' } };
  }, async event => saved.push(event));
  assert.deepEqual(sent, ['a1', 'b1', 'b2']);
  assert.equal(saved[0].status, 'pending');
  assert.equal(saved[2].status, 'synced');
  assert.equal(saved[2].employeeName, 'Empleado B');
});

test('facial 403 preserves evidence for review and displays the server reason rather than a generic HTTP error', async () => {
  const face = { ...entry, method: 'facial', code: undefined, descriptor: [0.1, 0.2], grant: 'original-grant', identity: 'facial' };
  const saved = [];
  const denied = Object.assign(new Error('Request failed with status code 403'), { response: { status: 403, data: { error: 'No se encontró coincidencia facial', code: 'FACE_NOT_MATCHED' } } });
  await syncEvents([face], async () => { throw denied; }, async event => saved.push(event));
  assert.equal(saved[0].status, 'review');
  assert.equal(saved[0].error, 'No se encontró coincidencia facial');
  assert.equal(saved[0].errorCode, 'FACE_NOT_MATCHED');
  assert.deepEqual(saved[0].descriptor, face.descriptor);
  assert.equal(saved[0].id, face.id);
  assert.equal(saved[0].captured_at, face.captured_at);
  assert.equal(saved[0].grant, face.grant);
});

test('an unrecognized face does not block a later valid face or a code check-in', async () => {
  const first = { ...entry, id: 'face1', identity: 'facial', method: 'facial' };
  const next = { ...exit, id: 'face2', identity: 'facial', method: 'facial' };
  const saved = [], sent = [];
  await syncCompanyEvents([first, next, { ...entry, id: 'code', identity: 'code:123' }], async event => {
    sent.push(event.id);
    if (event.id === 'face1') throw Object.assign(new Error('403'), { response: { status: 403, data: { error: 'Rostro no reconocido', code: 'FACE_NOT_MATCHED' } } });
    return { id: event.id, status: 'synced' };
  }, async event => saved.push(event));
  assert.deepEqual(sent, ['face1', 'face2', 'code']);
  assert.equal(saved[0].status, 'review');
  assert.equal(saved[1].status, 'synced');
  assert.equal(saved[2].status, 'synced');
});

test('historical transition conflicts do not block a new automatic online movement or get rewritten', async () => {
  const conflict = { ...entry, action: 'entrada', id: 'conflict', status: 'review', blocksFollowing: true, error: 'Ya existe una entrada abierta. Requiere revisión de RH.' };
  const next = { ...exit, id: 'next', action: 'auto' };
  const sent = [], saved = [];
  await syncEvents([conflict, next], async event => { sent.push(event.id); return { id: event.id, status: 'synced', action: 'salida', clock_state: { company: 10, employee: 1, revision: 11, open: false } }; }, async event => saved.push(event));
  assert.deepEqual(sent, ['next']);
  assert.equal(conflict.status, 'review');
  assert.equal(conflict.action, 'entrada');
  assert.equal(saved[0].clock_state.open, false);
  assert.equal(saved[0].clock_state.revision, 11);
});

test('a genuine offline conflict preserves its action and timestamp while allowing later independent attempts', async () => {
  const first = { ...entry, id: 'entry-conflict' }, next = { ...exit, id: 'later', action: 'auto' };
  const saved = [];
  await syncEvents([first, next], async event => {
    if (event.id === first.id) throw { response: { status: 409, data: { error: 'Ya existe una entrada abierta. Requiere revisión de RH.', code: 'CLOCK_ENTRY_ALREADY_OPEN', clock_state: { company: 10, employee: 1, revision: 10, open: true } } } };
    return { id: event.id, status: 'synced', action: 'salida' };
  }, async event => saved.push(event));
  assert.equal(saved[0].status, 'review');
  assert.equal(saved[0].action, first.action);
  assert.equal(saved[0].captured_at, first.captured_at);
  assert.equal(saved[0].blocksFollowing, false);
  assert.equal(saved[0].clock_state.open, true);
  assert.equal(saved[1].status, 'synced');
});
