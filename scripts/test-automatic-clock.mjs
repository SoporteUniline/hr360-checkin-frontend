import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { syncEvents, syncCompanyEvents } from '../public/offline-clock/store.mjs';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const source = (await readFile(new URL('../src/lib/offline-clock.js', import.meta.url), 'utf8')).replace('let storeLoading;', 'let storeLoading = Promise.resolve(fixtureStore);');
const { code } = babel.transformSync(source, { configFile: false, babelrc: false, plugins: [() => ({ visitor: {
  ImportDeclaration(path) { path.remove(); },
  ExportNamedDeclaration(path) { if (path.node.declaration) path.replaceWith(path.node.declaration); else path.remove(); },
} })] });
function fixture({ online = true, failStorage = false, failNetwork = false, decision = false } = {}) {
  const records = new Map(), sent = [], profiles = new Map();
  const profile = { id_empresa: 10, id_empleado: 101, nombre: 'Empleado', session: 'session-current', prepared_at: new Date().toISOString() };
  profiles.set('clock:employee:10:101', profile);
  const store = {
    getValue: async key => profiles.get(key), fingerprint: async value => value, listEvents: async () => [...records.values()],
    saveEvent: async event => { if (failStorage) throw Error('Storage full'); records.set(event.id, event); },
    syncEvents, syncCompanyEvents,
  };
  const context = vm.createContext({ fixtureStore: store, Cookies: { get: () => 'session-current' },
    navigator: { onLine: online }, window: { dispatchEvent() {} }, Event, Date, crypto: webcrypto,
    console, URL, setTimeout, clearTimeout, ensureOfflineCache: async () => null,
    axios: { post: async (_url, event) => {
      sent.push(event);
      if (failNetwork) { failNetwork = false; throw Error('Response lost'); }
      if (decision && event.action === 'auto') return { data: { requiereDecision: true, empleado: { nombre: 'Empleado' } } };
      return { data: { id: event.id, status: 'synced', action: event.action === 'auto' ? 'entrada' : event.action, employee: { nombre: 'Empleado' } } };
    } },
  });
  vm.runInContext(code + '\nglobalThis.clock = { registerClockMovement, synchronizeClockQueue };', context);
  return { records, sent, context, clock: context.clock, profiles };
}
const args = { company: 10, employee: 101 };

test('the regular clock stores before sending and does not claim a save when local storage fails', async () => {
  const fx = fixture({ online: false });
  const result = await fx.clock.registerClockMovement({ codigo: '123' }, args);
  assert.equal(result.data.pending, true);
  assert.equal(fx.sent.length, 0);
  assert.equal([...fx.records.values()][0].action, 'auto');
  const full = fixture({ failStorage: true });
  await assert.rejects(() => full.clock.registerClockMovement({ codigo: '123' }, args), /Storage full/);
  assert.equal(full.sent.length, 0);
});
test('a lost response leaves the same UUID and original timestamp retryable', async () => {
  const fx = fixture({ failNetwork: true });
  await fx.clock.registerClockMovement({ codigo: '123', captured_at: '2026-11-04T16:00:00.000Z' }, args);
  assert.equal([...fx.records.values()][0].status, 'pending');
  await fx.clock.synchronizeClockQueue();
  assert.equal(fx.sent[0].id, fx.sent[1].id);
  assert.equal(fx.sent[1].captured_at, '2026-11-04T16:00:00.000Z');
  assert.equal([...fx.records.values()][0].status, 'synced');
  assert.equal([...fx.records.values()][0].code, undefined);
});
test('manual decisions reuse the UUID/time and do not become an extra movement', async () => {
  const fx = fixture({ decision: true });
  const first = await fx.clock.registerClockMovement({ codigo: '123' }, args);
  assert.equal(first.data.requiereDecision, true);
  assert.equal([...fx.records.values()][0].status, 'decision');
  await fx.clock.registerClockMovement({ codigo: '123', accion: 'cerrar_turno', offline_event: first.data.offline_event }, args);
  assert.equal(fx.records.size, 1);
  assert.equal(fx.sent[0].id, fx.sent[1].id);
  assert.equal(fx.sent[0].captured_at, fx.sent[1].captured_at);
  assert.equal([...fx.records.values()][0].status, 'synced');
});
test('a renewed session can sync its own old pending records but cannot sync a different employee queue', async () => {
  const fx = fixture();
  const old = { id: 'old', captured_at: '2026-11-04T16:00:00.000Z', method: 'codigo', code: '123', company: 10, employee: 101, scope: 'employee', session: 'old-session', status: 'pending' };
  fx.records.set(old.id, old);
  fx.records.set('other', { ...old, id: 'other', employee: 102 });
  await fx.clock.synchronizeClockQueue();
  assert.deepEqual(fx.sent.map(event => event.id), ['old']);
  assert.equal(fx.records.get('old').status, 'synced');
  assert.equal(fx.records.get('other').status, 'pending');
});
