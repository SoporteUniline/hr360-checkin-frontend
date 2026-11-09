import test from 'node:test';
import assert from 'node:assert/strict';
import { selectLocalClockEvents } from '../src/lib/local-clock-events.mjs';

const hr = { tipo_usuario: 'Recruiter', empresas: [10], empresas_detalle: [{ id_empresa: 10, zona_horaria: 'America/Mexico_City' }] };
const employee = { tipo_usuario: 'Empleado', id_empleado: 2, id_empresa: 10 };
const pending = { id: 'local-1', scope: 'company', company: 10, action: 'auto', method: 'codigo', code: '00123', alias: 'Código •••123', captured_at: '2026-11-10T01:00:00.000Z', status: 'pending' };
const select = (events, options = {}) => selectLocalClockEvents(events, { user: hr, session: 'session-a', ...options });

test('only unresolved captures appear; confirmed and discarded events never duplicate server rows', () => {
  const events = ['pending', 'review', 'decision', 'synced', 'rejected'].map(status => ({ ...pending, id: status, status }));
  assert.deepEqual(select(events).map(event => event.id).sort(), ['decision', 'pending', 'review']);
});

test('HR only sees shared clock events from assigned companies', () => {
  assert.deepEqual(select([pending, { ...pending, company: 11 }, { ...pending, scope: 'employee', employee: 2, session: 'session-a' }]), [pending]);
  assert.deepEqual(select([pending], { company: 11 }), []);
  assert.deepEqual(select([pending], { company: 'all' }), [pending]);
});

test('anonymous and unrelated roles cannot read local captures', () => {
  assert.deepEqual(select([pending], { user: null }), []);
  assert.deepEqual(select([pending], { session: null }), []);
  assert.deepEqual(select([pending], { user: { tipo_usuario: 'Admin', empresas: [10] } }), []);
});

test('employee events require the same account, company and session; public captures are not exposed', () => {
  const own = { ...pending, scope: 'employee', employee: 2, session: 'session-a' };
  assert.deepEqual(select([own, pending, { ...own, employee: 3 }, { ...own, company: 11 }, { ...own, session: 'session-b' }], { user: employee }), [own]);
  assert.deepEqual(select([own], { user: employee, session: 'session-b' }), []);
});

test('date filters use the company local day rather than UTC, including midnight boundaries', () => {
  assert.deepEqual(select([pending], { from: '2026-11-09', to: '2026-11-09' }), [pending]);
  assert.deepEqual(select([pending], { from: '2026-11-10', to: '2026-11-10' }), []);
  assert.deepEqual(select([{ ...pending, captured_at: 'invalid' }]), []);
});

test('search can find a masked code or known name without changing the stored capture', () => {
  assert.deepEqual(select([pending], { search: '00123' }), [pending]);
  const named = { ...pending, employeeName: 'Ana Prueba' };
  assert.deepEqual(select([named], { search: 'ANA' }), [named]);
  assert.deepEqual(select([pending], { search: 'otro' }), []);
  assert.equal(pending.action, 'auto');
  assert.equal(pending.captured_at, '2026-11-10T01:00:00.000Z');
});

test('company details also authorize assigned companies and invalid timezone settings have a safe fallback', () => {
  assert.deepEqual(select([pending], { user: { tipo_usuario: 'User', empresas_detalle: [{ id_empresa: '10', zona_horaria: 'invalid' }] }, from: '2026-11-09', to: '2026-11-09' }), [pending]);
});

test('captures are ordered by their original timestamp without modifying the source queue', () => {
  const later = { ...pending, id: 'later', captured_at: '2026-11-10T01:01:00.000Z' };
  const events = [pending, later];
  assert.deepEqual(select(events).map(event => event.id), ['later', 'local-1']);
  assert.deepEqual(events.map(event => event.id), ['local-1', 'later']);
});
