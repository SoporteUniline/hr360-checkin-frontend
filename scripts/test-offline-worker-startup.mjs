import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../src/lib/offline-clock.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/\bexport /g, '');

function startup(active) {
  const failure = new Error('Internet unavailable');
  const registration = { active, update: async () => { throw failure; } };
  const context = vm.createContext({
    window: { isSecureContext: true },
    navigator: { serviceWorker: { register: async () => registration } },
    setTimeout, clearTimeout,
  });
  vm.runInContext(source + '\nglobalThis.install = installOfflineWorker;', context);
  return { install: context.install, registration, failure };
}

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
