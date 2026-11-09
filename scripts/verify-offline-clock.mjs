// Browser test with synthetic local fixtures only; never contacts the real API.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const executable = process.env.CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const userDir = await mkdtemp(join(tmpdir(), 'adamia-offline-browser-'));
const profile = { id_empleado: 101, id_empresa: 10, nombre: 'Empleado de prueba', metodo: 'codigo', cierre_turno: 'Automatico', checar_gps: false, prepared_at: new Date().toISOString() };
const received = new Map();
let disconnected = false;
let rejectSync = false;
const server = createServer(async (req, res) => {
  if (disconnected) return req.socket.destroy();
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/checador/reloj/offline/perfil') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(profile));
  }
  if (path === '/checador/reloj/offline/sincronizar' || path === '/checador/reloj/offline/empresa/sincronizar') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const event = JSON.parse(body);
    res.setHeader('Content-Type', 'application/json');
    if (rejectSync || event.code === '111') { res.statusCode = 409; return res.end(JSON.stringify({ error: 'Conflicto de prueba: requiere revisión de RH' })); }
    received.set(event.id, event);
    return res.end(JSON.stringify({ id: event.id, status: 'synced' }));
  }
  const target = resolve(publicDir, `.${path}`);
  if (!target.startsWith(resolve(publicDir))) { res.statusCode = 403; return res.end(); }
  try {
    if (!(await stat(target)).isFile()) throw new Error('Not a file');
    const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'application/javascript', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css' };
    res.setHeader('Content-Type', types[extname(target)] || 'application/octet-stream');
    res.end(await readFile(target));
  } catch { res.statusCode = 404; res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = spawn(executable, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${userDir}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
let socket;
let nextId = 0;
const pending = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function until(predicate, label) {
  for (let i = 0; i < 150; i++) {
    try { if (await predicate()) return; } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression: `(async () => { return (${expression}); })()`, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

try {
  let debugPort;
  await until(async () => { debugPort = (await readFile(join(userDir, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; return debugPort; }, 'Chrome startup');
  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?${base}/reloj-offline.html`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const callback = pending.get(message.id);
    if (!callback) return;
    pending.delete(message.id);
    if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
    else callback.resolve(message.result);
  };
  await send('Network.enable');
  await until(() => evaluate(`location.origin === ${JSON.stringify(base)} && document.readyState === 'complete'`), 'initial page');
  await evaluate(`(async () => {
    document.cookie = 'token=fixture-only; path=/';
    const store = await import('/offline-clock/store.mjs');
    await store.setConfig({ ...${JSON.stringify(profile)}, api: location.origin, session: await store.fingerprint('fixture-only') });
    await navigator.serviceWorker.register('/offline-clock-sw.js');
    await navigator.serviceWorker.ready;
  })()`);
  await send('Page.reload');
  await until(() => evaluate("document.querySelector('#clock')?.hidden === false && !!navigator.serviceWorker.controller"), 'prepared clock');
  const cachedAssets = await evaluate("(async()=>{const name=(await caches.keys()).find(name=>name.startsWith('adamia-clock-shell-'));return (await(await caches.open(name)).keys()).map(request=>new URL(request.url).pathname)})()");
  for (const asset of ['/reloj-offline.html', '/offline-clock/app.mjs', '/offline-clock/store.mjs']) assert(cachedAssets.includes(asset));
  assert.deepEqual(await evaluate("Array.from(document.querySelector('#method').options,option=>option.value)"), ['codigo']);
  disconnected = true;
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  assert.equal(await evaluate("typeof (await import('/offline-clock/store.mjs?v=6')).saveEvent"), 'function');
  await evaluate("(() => { document.querySelector('#code').value='123'; document.querySelector('#clock').requestSubmit(); })()");
  await until(() => evaluate("document.querySelector('#message').textContent.includes('Checada guardada')"), 'offline save');
  assert.equal(received.size, 0);
  await send('Page.reload');
  await until(() => evaluate("document.querySelector('#events')?.textContent.includes('Pendiente de sincronizar')"), 'offline persistence and shell reload');
  assert.equal(await evaluate("document.querySelector('#clock').hidden"), false);
  disconnected = false;
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await until(() => evaluate("document.querySelector('#events').textContent.includes('Sincronizada')"), 'automatic reconnect sync');
  assert.equal(received.size, 1);
  assert.equal(await evaluate("(await (await import('/offline-clock/store.mjs')).listEvents())[0].code"), undefined);

  // A server rejection stays visible and survives reload; later events wait.
  rejectSync = true;
  await evaluate("(() => { document.querySelector('#action').value='salida'; document.querySelector('#code').value='123'; document.querySelector('#clock').requestSubmit(); })()");
  await until(() => evaluate("document.querySelector('#events').textContent.includes('Conflicto de prueba')"), 'conflict visibility');
  await send('Page.reload');
  await until(() => evaluate("document.querySelector('#events')?.textContent.includes('Conflicto de prueba')"), 'conflict survives reload');
  assert.equal(received.size, 1);

  // A different account cannot view or submit the previous employee's queue.
  await evaluate("document.cookie='token=other-account; path=/'");
  await send('Page.reload');
  await until(() => evaluate("document.querySelector('#message')?.textContent.includes('inicia sesión')"), 'session isolation');
  assert.equal(await evaluate("document.querySelector('#clock').hidden"), true);
  assert.equal(await evaluate("document.querySelector('#events').children.length"), 0);
  assert.equal(await evaluate("(await (await import('/offline-clock/store.mjs')).listEvents()).length"), 2);
  rejectSync = false;
  await evaluate(`(async () => {
    document.cookie='token=; Max-Age=0; path=/';
    await (await import('/offline-clock/store.mjs')).setConfig({scope:'company',id_empresa:10,nombre:'Empresa de prueba',slug:'empresa-test',grant:'fixture',api:location.origin,prepared_at:new Date().toISOString()});
  })()`);
  await send('Page.reload');
  await until(() => evaluate("document.querySelector('#clock')?.hidden === false"), 'company clock without login');
  disconnected = true;
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await evaluate("Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(ok,fail){fail({code:1,message:'Denied'})}}})");
  for (const code of ['111', '222']) {
    await evaluate(`(() => { document.querySelector('#code').value='${code}'; document.querySelector('#clock').requestSubmit(); })()`);
    await until(() => evaluate(`document.querySelector('#code').value==='' && !document.querySelector('#save').disabled`), 'company offline save');
  }
  await send('Page.reload');
  await until(() => evaluate("document.querySelector('#events')?.children.length===2"), 'legacy offline company records survive reload');
  disconnected = false;
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await until(() => evaluate("document.querySelector('#events').textContent.includes('Sincronizada') && document.querySelector('#events').textContent.includes('Conflicto de prueba')"), 'independent company employee queues');
  assert.equal(received.size, 2);
  console.log('PASS: real Chrome service worker installation, cached facial assets, offline save/reload, reconnect sync, evidence cleanup, persistent conflicts and session isolation.');
} finally {
  socket?.close();
  browser.kill();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
