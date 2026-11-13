// Local production build with synthetic browser traffic. No login or real API.
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
const profile = await mkdtemp(join(tmpdir(), 'adamia-native-ui-'));
let browser, socket, id = 0;
const pending = new Map(), errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label) { for (let i = 0; i < 200; i++) { try { if (await fn()) return; } catch {} await sleep(100); } throw Error('Timed out: ' + label); }
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const sequence = ++id, timer = setTimeout(() => { pending.delete(sequence); reject(Error('CDP timeout: ' + method)); }, 20000);
    pending.set(sequence, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    socket.send(JSON.stringify({ id: sequence, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function go(path) {
  await send('Page.navigate', { url: base + path });
  await until(() => evaluate("document.readyState==='complete' && !!document.querySelector('input[type=email]')"), path);
  await sleep(500);
}
try {
  await until(async () => (await fetch(base + '/login')).ok, 'Next startup');
  for (const path of ['/', '/register', '/funcionalidades/reloj-checador', '/politicas']) {
    const response = await fetch(base + path, { headers: { 'User-Agent': 'Android AdamiaAppNative' }, redirect: 'manual' });
    assert.equal(response.status, 307, path);
    assert.equal(new URL(response.headers.get('location'), base).pathname, '/login');
  }
  browser = spawn(process.env.CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-sandbox', '--disable-background-networking', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let debugPort;
  await until(async () => { debugPort = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; return debugPort; }, 'Chrome startup');
  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') {
      const event = message.params;
      void send(event.request.url.startsWith(base) ? 'Fetch.continueRequest' : 'Fetch.failRequest', event.request.url.startsWith(base) ? { requestId: event.requestId } : { requestId: event.requestId, errorReason: 'BlockedByClient' });
      return;
    }
    const task = pending.get(message.id); if (!task) return; pending.delete(message.id);
    if (message.error) task.reject(Error(JSON.stringify(message.error))); else task.resolve(message.result);
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Network.setUserAgentOverride', { userAgent: 'Mozilla/5.0 Android AdamiaAppNative' });
  for (const width of [390, 700]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await go('/login');
    assert(!await evaluate("document.body.innerText.includes('Página principal') || document.body.innerText.includes('Registrarme')"), 'native login hides public navigation');
    assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"), 'no horizontal overflow');
    assert(await evaluate("document.querySelector('input[type=email]').getBoundingClientRect().top<600"), `login visible at ${width}px`);
    assert(await evaluate("document.querySelector('input[type=email]').getBoundingClientRect().height>=44"), 'touch target');
  }
  await go('/recuperacion');
  assert(!await evaluate("document.body.innerText.includes('Página principal')"), 'native recovery hides home');
  assert(await evaluate("document.body.innerText.includes('Iniciar sesión')"), 'recovery keeps login return');
  await send('Network.setUserAgentOverride', { userAgent: 'Mozilla/5.0 Browser' });
  await go('/login');
  assert(await evaluate("document.body.innerText.includes('Página principal') && document.body.innerText.includes('Registrarme')"), 'browser keeps public links');
  assert.deepEqual(errors.filter(error => /hydration|Minified React error #418|Minified React error #423/i.test(error)), [], 'no hydration errors');
  console.log('PASS: native redirects, login at 390/700px, recovery, browser public links and hydration. No real API contacted.');
} finally { socket?.close(); browser?.kill(); server.kill(); }
