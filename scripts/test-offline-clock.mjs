import test from 'node:test';
import assert from 'node:assert/strict';
import { ownEvents, syncEvents } from '../public/offline-clock/store.mjs';

const profile = { id_empleado: 1, id_empresa: 10 };
const entry = { id: 'entry', employee: 1, company: 10, captured_at: '2026-11-03T14:00:00.000Z', status: 'pending', code: '123' };
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
