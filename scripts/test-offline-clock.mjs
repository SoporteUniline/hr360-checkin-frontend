import test from 'node:test';
import assert from 'node:assert/strict';
import { ownEvents, syncEvents, syncCompanyEvents } from '../public/offline-clock/store.mjs';

const profile = { id_empleado: 1, id_empresa: 10 };
const entry = { id: 'entry', employee: 1, company: 10, captured_at: '2026-11-03T14:00:00.000Z', status: 'pending', method: 'codigo', code: '123' };
const exit = { ...entry, id: 'exit', captured_at: '2026-11-03T20:00:00.000Z' };

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
