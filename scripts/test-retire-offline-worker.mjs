import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('retired worker stops intercepting requests and preserves local captures and caches', async () => {
  const source = await readFile(new URL('../public/offline-clock-sw.js', import.meta.url), 'utf8');
  const handlers = new Map();
  const calls = [];
  vm.runInNewContext(source, {
    self: {
      addEventListener: (name, handler) => handlers.set(name, handler),
      skipWaiting: async () => calls.push('skipWaiting'),
      clients: { claim: async () => calls.push('claim') },
      registration: { unregister: async () => calls.push('unregister') },
    },
  });
  assert.deepEqual([...handlers.keys()], ['install', 'activate']);
  for (const name of ['install', 'activate']) {
    let completion;
    handlers.get(name)({ waitUntil: promise => { completion = promise; } });
    await completion;
  }
  assert.deepEqual(calls, ['skipWaiting', 'claim', 'unregister']);
});
