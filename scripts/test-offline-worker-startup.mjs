import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../src/lib/offline-clock.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/\bexport /g, '')
  .replace(/import\(.*?['"]\/offline-clock\/store\.mjs\?v=\d+['"]\)/, 'loadStoreModule()');

function startup(active, update) {
  const failure = new Error('Internet unavailable');
  const registration = { active, update: update ?? (async () => { throw failure; }) };
  const store = {};
  const context = vm.createContext({
    window: { isSecureContext: true },
    navigator: { onLine: true, serviceWorker: { register: async () => registration } },
    loadStoreModule: async () => store,
    setTimeout, clearTimeout,
  });
  vm.runInContext(source + '\nglobalThis.install = installOfflineWorker; globalThis.openStore = clockStore;', context);
  return { install: context.install, openStore: context.openStore, store, registration, failure };
}

test('a stalled worker update does not block access to stored check-ins', async () => {
  let finishUpdate;
  const updating = new Promise(resolve => { finishUpdate = resolve; });
  const clock = startup({ state: 'activated' }, () => updating);
  const installation = clock.install();
  try {
    const result = await Promise.race([clock.openStore(), new Promise(resolve => setImmediate(resolve))]);
    assert.equal(result, clock.store);
  } finally {
    finishUpdate();
    await installation;
  }
});

test('a prepared clock starts when checking for worker updates fails without internet', async () => {
  const clock = startup({ state: 'activated' });
  assert.equal(await clock.install(), clock.registration);
});

test('a first installation still reports failure instead of claiming offline readiness', async () => {
  const clock = startup(null);
  await assert.rejects(clock.install(), clock.failure);
  // Failed initialization can be retried after connectivity returns.
  clock.registration.update = async () => {};
  clock.registration.active = { state: 'activated' };
  assert.equal(await clock.install(), clock.registration);
});
