// Exercises the built Next route and rewrite. Every request is rejected before
// any backend access; no real credentials, API writes or databases are used.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';

const reservation = createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], { stdio: 'ignore', windowsHide: true });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { await fetch(`${origin}/api/health`); ready = true; break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'Next server started');
  const token = 'synthetic-cookie', session = createHash('sha256').update(token).digest('hex');
  const cases = [
    { headers: { Origin: 'https://other.invalid' }, body: {}, status: 403 },
    { headers: { Origin: origin }, body: { session, event: {} }, status: 401 },
    { headers: { Origin: origin, Cookie: `token=${token}` }, body: { session: 'wrong', event: {} }, status: 401 },
    { headers: { Origin: origin, Cookie: `token=${token}` }, body: { session, event: null }, status: 400 },
  ];
  for (const fixture of cases) {
    const response = await fetch(`${origin}/internal/offline-clock/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...fixture.headers }, body: JSON.stringify(fixture.body), redirect: 'manual',
    });
    assert.equal(response.status, fixture.status, await response.text());
  }
  console.log('PASS: built background proxy rewrite, origin check, cookie access, session isolation and invalid event rejection. No backend contacted.');
} finally { server.kill(); }
