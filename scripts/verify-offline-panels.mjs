// Real Next/Chrome UI; all API responses are synthetic and external requests blocked.
import assert from 'node:assert/strict';
import { createHmac, createHash, createPublicKey, verify as verifySignature, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
const secret = randomUUID();
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const testPort = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const base = `http://127.0.0.1:${testPort}`;
const profileDir = await mkdtemp(join(tmpdir(), 'adamia-panels-offline-'));
const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(testPort), '-H', '127.0.0.1'], { stdio: 'ignore', windowsHide: true, env: { ...process.env, JWT_SECRET: secret } });
let chrome, socket, sequence = 0, role = 'Recruiter';
const pending = new Map(), receipts = new Map();
const companyReceipts = new Map();
let companyMovementId = 0, companyOpen = false;
const companyState = () => ({ company: 10, employee: 101, movement_id: companyMovementId, revision: companyMovementId ? companyMovementId * 2 + (companyOpen ? 0 : 1) : 0, open: companyOpen, observed_at: new Date().toISOString() });
let referenceDownloads = 0;
const fixtureDevices = new Map();
const fixtureDescriptor = Array.from({ length: 128 }, (_, index) => index === 0 ? 1 : 0);
const coworkerDescriptor = Array.from({ length: 128 }, (_, index) => index === 1 ? 1 : 0);
const fixtureModel = 'face-api-0.22.2-128-cosine-v1';
const workerSessions = new Map();
const pageErrors = [], apiPaths = new Set();
let droppedResponse = false;
let networkOffline = false;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const company = { id_empresa: 10, nombre: 'Empresa fixture', nombre_empresa: 'Empresa fixture', slug: 'fixture-company', estado: 'Activo', zona_horaria: 'America/Mexico_City' };
const employee = { id_empleado: 101, id_empresa: 10, nombre: 'Ana Fixture', apellido_paterno: 'Prueba', estado: 'Activo', nip: '123', departamento: 'Pruebas' };
function user() { return { id_usuario: -123, tipo_usuario: role, esEmpleado: role === 'Empleado', id_empleado: role === 'Empleado' ? 101 : undefined, id_empresa: 10, nombre: role === 'Empleado' ? 'Diego Fixture' : 'RH Fixture', correo: 'fixture@example.invalid', empresas: [10], empresas_detalle: [company], zona_horaria: 'America/Mexico_City' }; }
function token() {
  // No id_empresa in this synthetic JWT: the server RH layout must not access a database.
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: role, id_usuario: -123, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  return `${head}.${payload}.${createHmac('sha256', secret).update(`${head}.${payload}`).digest('base64url')}`;
}
async function until(fn, name, attempts = 300) {
  for (let i = 0; i < attempts; i++) { try { if (await fn()) return; } catch {} await sleep(100); }
  throw new Error('Timed out: ' + name);
}
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 30000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression: `(async()=>(${expression}))()`, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}
async function intercept(event) {
  const { requestId, request } = event;
  const url = new URL(request.url), path = url.pathname;
  if (networkOffline && (path.endsWith('/sincronizar') || path === '/internal/offline-clock/sync' || path === '/api/offline-clock/sync')) {
    return send('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' });
  }
  // Never let the new same-origin server proxy reach a real backend in this
  // synthetic browser suite. Personal foreground uploads are mocked below.
  if (path === '/internal/offline-clock/sync' || path === '/api/offline-clock/sync') return send('Fetch.fulfillRequest', {
    requestId, responseCode: 503, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    body: Buffer.from(JSON.stringify({ error: 'Synthetic background retry' })).toString('base64'),
  });
  if (request.url.startsWith(base) && !path.startsWith('/api/')) return send('Fetch.continueRequest', { requestId });
  if (event.resourceType === 'Script' && !path.startsWith('/api/')) return send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }], body: '' });
  apiPaths.add(path);
  const json = data => send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: base }, { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type,x-adamia-session' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }], body: Buffer.from(JSON.stringify(data)).toString('base64') });
  if (request.method === 'OPTIONS') return json({});
  if (path.endsWith('/users/verify/token')) return json({ user: user() });
  if (path.endsWith('/offline/referencias') || path.endsWith('/offline/empresa/referencias')) {
    referenceDownloads++;
    const body = JSON.parse(request.postData);
    fixtureDevices.set(body.device_id, body.public_key);
    const personal = path.endsWith('/offline/referencias') && !!body.id_empleado;
    if (!personal) assert.equal(body.grant, 'fixture-grant');
    return json({ kind: 'local-face', mode: personal ? 'employee' : 'company', employee: personal ? 101 : null, company: 10, device_id: body.device_id, model: fixtureModel,
      prepared_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), employees: [{ id: 101, nombre: role === 'Empleado' ? 'Diego Fixture' : 'Ana Fixture', descriptor: fixtureDescriptor, reference: 'fixture-reference', grant: 'fixture-local-authorization', code_identity: createHash('sha256').update('123').digest('hex'), open: false, cierre_turno: 'Automatico', checar_gps: false, areas: [] }, ...(!personal ? [{ id: 102, nombre: 'Luis Compañero Fixture', descriptor: coworkerDescriptor, reference: 'coworker-reference', grant: 'coworker-local-authorization', code_identity: 'coworker-code', open: false, cierre_turno: 'Automatico', checar_gps: false, areas: [] }] : [])] });
  }
  if (path.endsWith('/offline/empresa/perfil')) return json({ scope: 'company', id_empresa: 10, slug: company.slug, nombre: company.nombre, grant: 'fixture-grant', prepared_at: new Date().toISOString() });
  if (path.endsWith('/offline/perfil')) return json({ ...employee, nombre: 'Diego Fixture', metodo: 'codigo', cierre_turno: 'Automático', checar_gps: false, prepared_at: new Date().toISOString() });
  if (path.endsWith('/offline/empresa/sincronizar')) {
    const event = JSON.parse(request.postData);
    if (event.local_verification) {
      assert.equal(event.descriptor, undefined);
      assert([101, 102].includes(event.local_employee));
      const proof = event.local_verification;
      const canonical = JSON.stringify([event.id, event.captured_at, event.action, event.method, Number(event.company), Number(event.local_employee), event.latitude ?? null, event.longitude ?? null, event.precision_metros ?? null, event.ubicacion_timestamp ?? null, proof.device_id, proof.model, proof.reference, proof.score, proof.grant]);
      assert(verifySignature('sha256', Buffer.from(canonical), { key: createPublicKey({ key: fixtureDevices.get(proof.device_id), format: 'jwk' }), dsaEncoding: 'ieee-p1363' }, Buffer.from(proof.signature, 'base64url')));
    }
    if (event.local_employee === 102) {
      if (!companyReceipts.has(event.id)) {
        assert.equal(event.action, 'entrada');
        companyReceipts.set(event.id, { id: event.id, status: 'synced', action: 'entrada', employee: { id: 102, nombre: 'Luis Compañero Fixture' }, clock_state: { company: 10, employee: 102, revision: 2, open: true, observed_at: new Date().toISOString() } });
      }
      return json(companyReceipts.get(event.id));
    }
    if (!companyReceipts.has(event.id)) {
      const action = event.action === 'auto' ? (companyOpen ? 'salida' : 'entrada') : event.action;
      assert.equal(action, companyOpen ? 'salida' : 'entrada', 'never silently retarget a frozen offline movement');
      if (action === 'entrada') companyMovementId++;
      companyOpen = action === 'entrada';
      companyReceipts.set(event.id, { id: event.id, status: 'synced', action, clock_state: companyState(), confirmed_at: new Date().toISOString(), employee: { id: 101, nombre: 'Ana Fixture' } });
    }
    return json(companyReceipts.get(event.id));
  }
  if (path.endsWith('/offline/sincronizar')) {
    const event = JSON.parse(request.postData);
    if (event.local_verification) {
      assert.equal(event.descriptor, undefined);
      assert.equal(event.local_employee, 101);
      assert.equal(event.company, 10);
      const proof = event.local_verification;
      const canonical = JSON.stringify([event.id, event.captured_at, event.action, event.method, Number(event.company), Number(event.local_employee), event.latitude ?? null, event.longitude ?? null, event.precision_metros ?? null, event.ubicacion_timestamp ?? null, proof.device_id, proof.model, proof.reference, proof.score, proof.grant]);
      assert(verifySignature('sha256', Buffer.from(canonical), { key: createPublicKey({ key: fixtureDevices.get(proof.device_id), format: 'jwk' }), dsaEncoding: 'ieee-p1363' }, Buffer.from(proof.signature, 'base64url')));
    }
    if (!receipts.has(event.id)) receipts.set(event.id, { id: event.id, status: 'synced', action: receipts.size % 2 ? 'salida' : 'entrada', employee: { id: 101, nombre: 'Diego Fixture' } });
    if (!droppedResponse) { droppedResponse = true; return send('Fetch.failRequest', { requestId, errorReason: 'ConnectionClosed' }); }
    return json(receipts.get(event.id));
  }
  if (path.includes('/check-subscription/') || path.endsWith('/check-status')) return json({ hasActivePlan: true, slug: 'fixture-company' });
  if (path.endsWith('/registros-del-dia-empleado') || path.endsWith('/registros-del-dia')) return json({ registrosHoy: [{ id: 1, entrada: '2026-11-04 09:00:00', salida: null, estado: 'Abierto' }], activosHoy: 1, totalRegistrosHoy: 1, zona_horaria: 'America/Mexico_City' });
  if (path.endsWith('/vacaciones/mi-saldo')) return json({ dias_disponibles: 8, dias_cargados: 12, dias_tomados: 4 });
  if (path.includes('/panel-empleado/101/detalle')) return json({ asistencias: { historial: [] }, entradas_salidas: { registros: [{ id: 1, fecha: '2026-11-03', hora_entrada: '09:00', hora_salida: '18:00', estado: 'A tiempo' }] } });
  if (path.includes('/solicitudes-permiso/empleado/')) return json({ results: [], total: 0 });
  if (path.endsWith('/campos-personalizados')) return json([]);
  if (path.endsWith('/empleados')) return json({ data: [employee], total: 1, totalPages: 1 });
  if (path.endsWith('/reloj/asistencia')) return json({ registros: [{ ...employee, id: 1, entrada: '2026-11-04 09:00:00', salida: null }], total: 1, totalPages: 1 });
  if (path.includes('/empresas/slug/')) return json(company);
  if (path.endsWith('/slug')) return json({ slug: 'fixture-company' });
  if (path.includes('/departamentos') || path.includes('/sucursales') || path.includes('/tiposPermiso')) return json([]);
  if (!request.url.startsWith(base) || path.startsWith('/api/')) return json({ data: [], results: [], total: 0 });
  return send('Fetch.continueRequest', { requestId });
}
async function offline(value) {
  networkOffline = value;
  const conditions = { offline: value, latency: 0, downloadThroughput: value ? 0 : -1, uploadThroughput: value ? 0 : -1 };
  await send('Network.emulateNetworkConditions', conditions);
  const { targetInfos } = await send('Target.getTargets');
  for (const worker of targetInfos.filter(target => target.type === 'service_worker' && target.url.startsWith(base))) {
    let sessionId = workerSessions.get(worker.targetId);
    if (!sessionId) {
      sessionId = (await send('Target.attachToTarget', { targetId: worker.targetId, flatten: true })).sessionId;
      workerSessions.set(worker.targetId, sessionId);
      await send('Network.enable', {}, sessionId);
    }
    await send('Network.emulateNetworkConditions', conditions, sessionId);
  }
}
async function go(path, text) {
  await send('Page.navigate', { url: base + path });
  try { await until(() => evaluate(`document.body?.textContent.includes(${JSON.stringify(text)})`), path + ' content'); }
  catch (error) { console.error({ page: await evaluate('location.pathname'), text: await evaluate('document.body?.innerText.slice(0,1800)'), pageErrors, apiPaths: [...apiPaths] }); throw error; }
}
async function followClockLink(path, text) {
  const selector = `nav[aria-label="Navegación de asistencia"] a[href="${path}"]`;
  await until(() => evaluate(`document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect().width > 0`), 'navigation link ' + path);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await until(() => evaluate(`location.pathname === ${JSON.stringify(path)} && document.body?.textContent.includes(${JSON.stringify(text)})`), 'navigation destination ' + path);
}
async function snapshot() {
  try {
    await until(() => evaluate("(async()=>{const c=await import('/offline-clock/app-cache.mjs');return !!await c.readResponse(await c.ownerKey(),'page',location.href)})()"), 'page snapshot');
  } catch (error) {
    console.error(await evaluate("(async()=>{const c=await import('/offline-clock/app-cache.mjs');let snapshotError;try{await c.snapshotPage()}catch(e){snapshotError=e.message}const r=await fetch(location.href,{headers:{Accept:'text/html'}});return {worker:(await navigator.serviceWorker.getRegistrations()).map(r=>({installing:r.installing?.state,active:r.active?.state})),caches:await caches.keys(),owner:!!await c.ownerKey(),snapshotError,status:r.status,header:!!r.headers.get('x-adamia-session')}})()"));
    throw error;
  }
  await sleep(1200);
}
try {
  await until(async () => (await fetch(base + '/login')).ok, 'Next server', 600);
  chrome = spawn(process.env.CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-sandbox', '--disable-background-networking', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let port;
  await until(async () => { port = (await readFile(join(profileDir, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; return port; }, 'Chrome');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') pageErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') { void intercept(message.params).catch(error => console.error('Fixture interception failed:', error.message)); return; }
    const handler = pending.get(message.id); if (!handler) return; pending.delete(message.id);
    if (message.error) handler.reject(new Error(JSON.stringify(message.error))); else handler.resolve(message.result);
  };
  await send('Page.enable'); await send('Network.enable'); await send('Runtime.enable');
  // This suite verifies the foreground fallback, including browsers/users that
  // deny Background Sync. The dedicated clock suite tests closed-tab uploads.
  await send('Browser.setPermission', { permission: { name: 'background-sync' }, setting: 'denied', origin: base });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(ok,fail){fail({code:1,message:'Fixture GPS denied'})}}});" });
  // A canvas stream makes the synthetic camera independent of host devices.
  // The production panel still acquires, renders and stops a MediaStream.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__cameraRequests=0;
    navigator.mediaDevices.getUserMedia=async()=>{
      window.__cameraRequests++;
      const canvas=document.createElement('canvas'); canvas.width=640; canvas.height=480;
      const draw=()=>{const ctx=canvas.getContext('2d');ctx.fillStyle='#ddd';ctx.fillRect(0,0,640,480)};
      draw(); const stream=canvas.captureStream(10); const timer=setInterval(draw,100);
      for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{clearInterval(timer);stop()}};
      return stream;
    };
  ` });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fixtureFaceEnabled=false; window.__fixtureFaceDescriptor=${JSON.stringify(fixtureDescriptor)}; window.faceapi={nets:{ssdMobilenetv1:{params:true},faceLandmark68Net:{params:true},faceRecognitionNet:{params:true}},detectSingleFace(){return {withFaceLandmarks(){return {withFaceDescriptor:async()=>window.__fixtureFaceEnabled?{descriptor:new Float32Array(window.__fixtureFaceDescriptor)}:null}}}}};` });
  // Fresh browser: nobody has ever logged in on this device.
  await go('/fixture-company', 'Registrar Entrada / Salida');
  await until(() => evaluate("document.body.textContent.includes('Reconocimiento offline preparado en este dispositivo')"), 'public link automatically downloads faces without a login');
  assert(!await evaluate("document.cookie.includes('token=')"));
  await until(() => evaluate("(async()=>!!await(await caches.open('adamia-runtime-assets-v1')).match(location.origin+'/__offline/company/fixture-company'))()"), 'anonymous clock page cached');
  const publicDownloads = referenceDownloads;
  await offline(true);
  await evaluate('window.__fixtureFaceEnabled=true');
  // The facial panel is already open on desktop; no navigation or login needed.
  await until(() => evaluate("(async()=>(await(await import('/offline-clock/store.mjs')).listEvents()).some(event=>event.scope==='company'&&event.local_validated&&event.status==='pending'))()"), 'anonymous public clock recognizes a face when internet disappears');
  await evaluate('window.__fixtureFaceEnabled=false');
  const publicFace = await evaluate("(async()=>(await(await import('/offline-clock/store.mjs')).listEvents())[0])()");
  assert.equal(publicFace.employeeName, 'Ana Fixture');
  assert.equal(publicFace.descriptor, undefined);
  await go('/fixture-company', 'Registrar Entrada / Salida');
  await until(() => evaluate("document.body.textContent.includes('Reconocimiento local listo')"), 'anonymous clock survives an offline reload');
  await offline(false);
  await evaluate("window.dispatchEvent(new Event('online'))");
  await until(() => companyReceipts.has(publicFace.id), 'anonymous facial capture uploads on reconnect');
  await until(() => referenceDownloads > publicDownloads, 'public references refresh on reconnect without login');
  await evaluate("window.dispatchEvent(new Event('online'))");
  await sleep(1200);
  assert.equal(companyReceipts.size, 1);
  // Reset synthetic movements before the existing HR scenarios.
  await evaluate("(async()=>{const store=await import('/offline-clock/store.mjs');await store.transaction('events','readwrite',items=>items.clear())})()");
  companyReceipts.clear(); companyOpen = false; companyMovementId = 0;
  await send('Network.setCookie', { name: 'token', value: token(), url: base, path: '/' });
  await go('/panel/empleados', 'Ana Fixture'); await snapshot();
  await until(() => evaluate("(async()=>{const data=await(await import('/offline-clock/store.mjs')).getValue('faces:company:10');return data?.employees?.length===2})()"), 'global background company roster download');
  assert.equal(await evaluate('location.pathname'), '/panel/empleados');
  const initialDownloads = referenceDownloads;
  await evaluate("(async()=>{const store=await import('/offline-clock/store.mjs');const data=await store.getValue('faces:company:10');await store.setValue('faces:company:10',{...data,prepared_at:new Date(Date.now()-6*60000).toISOString()});document.dispatchEvent(new Event('visibilitychange'))})()");
  await until(() => referenceDownloads > initialDownloads, 'automatic stale reference update from an unrelated screen');
  await go('/panel/registro-de-entradas-y-salidas', 'Entradas'); await snapshot();
  await go('/panel/registro-asistencia', 'Asistencias'); await snapshot();
  await until(() => evaluate("(async()=>!!await(await caches.open('adamia-runtime-assets-v1')).match(location.origin+'/__offline/company/fixture-company'))()"), 'public company clock cached');
  await offline(true);
  await go('/fixture-company', 'Registrar Entrada / Salida');
  await until(() => evaluate("document.body.textContent.includes('Reconocimiento local listo')"), 'clock ready offline after background preparation from another screen');
  assert(!await evaluate("Array.from(document.querySelectorAll('button')).some(button=>button.textContent.includes('Actualizar rostros'))"));
  assert(await evaluate("document.querySelector('nav[aria-label=\"Navegación de asistencia\"]')?.getBoundingClientRect().width===0"));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await until(() => evaluate("(()=>{const links=Array.from(document.querySelectorAll('nav[aria-label=\"Navegación de asistencia\"] a'));return links.length===3 && links.every(link=>link.getBoundingClientRect().width>0) && new Set(links.map(link=>Math.round(link.getBoundingClientRect().top))).size===1})()"), 'mobile navigation has one row');
  await followClockLink('/panel/registro-asistencia', 'Asistencias');
  await followClockLink('/panel/registro-de-entradas-y-salidas', 'Entradas y salidas');
  await followClockLink('/fixture-company', 'Registrar Entrada / Salida');
  await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='Código'&&button.getBoundingClientRect().width>0).click()");
  await evaluate("Array.from(document.querySelectorAll('input')).find(input=>input.placeholder==='Ingresa tu código'&&input.getBoundingClientRect().width>0).focus()");
  await send('Input.insertText', { text: '123' });
  await until(() => evaluate("Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Registrar Entrada / Salida' && !button.disabled && button.getBoundingClientRect().width>0)"), 'company code ready');
  await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Registrar Entrada / Salida'&&button.getBoundingClientRect().width>0).click()");
  await until(() => evaluate("(async()=>{const events=await(await import('/offline-clock/store.mjs')).listEvents();return events.some(event=>event.scope==='company'&&event.status==='pending')})()"), 'company offline capture saved');
  await until(() => evaluate("Array.from(document.querySelectorAll('span')).some(span=>span.textContent.trim()==='Pendiente de subir')"), 'pending confirmation uses upload wording');
  assert(!await evaluate("document.body.textContent.includes('Aún sin validar')"));
  await followClockLink('/panel/registro-de-entradas-y-salidas', 'Entradas y salidas');
  await until(() => evaluate("document.querySelectorAll('tr[data-offline-event]').length===1 && document.querySelector('tr[data-offline-event]').textContent.includes('Pendiente de sincronizar')"), 'pending capture appears inside attendance table');
  assert(!await evaluate("!!document.querySelector('tr[data-offline-event] button')"));
  await go('/panel/registro-de-entradas-y-salidas', 'Entradas y salidas');
  await until(() => evaluate("document.querySelectorAll('tr[data-offline-event]').length===1"), 'pending table row survives offline reload');
  const downloadsBeforeReconnect = referenceDownloads;
  await offline(false);
  await evaluate("window.dispatchEvent(new Event('online'))");
  await until(() => companyReceipts.size === 1, 'company capture synchronized');
  await until(() => referenceDownloads > downloadsBeforeReconnect, 'reconnection refreshes references automatically');
  await until(() => evaluate("document.querySelectorAll('tr[data-offline-event]').length===0 && document.body.textContent.includes('Ana Fixture')"), 'confirmed capture no longer duplicates a local row');
  await offline(true);
  await followClockLink('/fixture-company', 'Registrar Entrada / Salida');
  await until(() => evaluate("document.body.textContent.includes('Reconocimiento local listo')"), 'downloaded facial data available after offline navigation');
  await evaluate("(()=>{window.__fixtureFaceEnabled=true; Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='Rostro'&&button.getBoundingClientRect().width>0).click()})()");
  await until(() => evaluate("(async()=>{const events=await(await import('/offline-clock/store.mjs')).listEvents();return events.some(event=>event.scope==='company'&&event.local_validated&&event.status==='pending'&&event.employeeName==='Ana Fixture'&&!event.descriptor)})()"), 'camera recognized employee locally without uploading a descriptor');
  await evaluate("window.__fixtureFaceEnabled=false");
  await followClockLink('/panel/registro-asistencia', 'Asistencia');
  await until(() => evaluate("document.querySelector('tr[data-offline-event]')?.textContent.includes('Rostro reconocido · Pendiente de subir') && document.querySelector('tr[data-offline-event]')?.textContent.includes('Ana Fixture')"), 'local facial attendance appears in mobile attendance');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await until(() => evaluate("document.querySelectorAll('tr[data-offline-event]').length===1 && document.querySelector('tr[data-offline-event]').textContent.includes('Ana Fixture')"), 'local facial attendance appears in desktop table');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await followClockLink('/panel/registro-de-entradas-y-salidas', 'Entradas y salidas');
  await until(() => evaluate("document.querySelector('tr[data-offline-event]')?.textContent.includes('Rostro reconocido · Pendiente de subir')"), 'local facial movement appears in clock history');
  await go('/panel/registro-de-entradas-y-salidas', 'Entradas y salidas');
  await until(() => evaluate("document.querySelectorAll('tr[data-offline-event]').length===1"), 'signed facial capture survives offline reload');
  assert.equal(companyReceipts.size, 1);
  await offline(false);
  await evaluate("window.dispatchEvent(new Event('online'))");
  await until(() => companyReceipts.size === 2, 'local face signature received without biometric reevaluation');
  await until(() => evaluate("document.querySelectorAll('tr[data-offline-event]').length===0"), 'local facial capture confirmed without a duplicate');
  // A different clock opens a turn after this device downloaded its references.
  companyMovementId++;
  companyOpen = true;
  const historicalConflict = { id: randomUUID(), scope: 'company', company: 10, local_employee: 101, identity: createHash('sha256').update('123').digest('hex'), method: 'facial', action: 'entrada', status: 'review', blocksFollowing: true, captured_at: new Date(Date.now() - 60000).toISOString(), error: 'Ya existe una entrada abierta. Requiere revisión de RH.' };
  await evaluate(`(async()=>{await(await import('/offline-clock/store.mjs')).saveEvent(${JSON.stringify(historicalConflict)})})()`);
  await followClockLink('/fixture-company', 'Registrar Entrada / Salida');
  await until(() => evaluate("document.body.textContent.includes('Reconocimiento offline preparado en este dispositivo')"), 'online facial clock ready');
  await evaluate("(()=>{window.__fixtureFaceEnabled=true; Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='Rostro'&&button.getBoundingClientRect().width>0).click()})()");
  try {
    await until(() => evaluate("Array.from(document.querySelectorAll('span')).some(span=>span.textContent.trim()==='¡Éxito!'&&span.closest('div').classList.contains('bg-green-50')) && !!document.querySelector('.bg-green-500 svg')"), 'online facial capture shows the original green check and success confirmation');
  } catch (error) {
    console.error(await evaluate("(async()=>({text:document.body.innerText,online:navigator.onLine,offline:window.__adamiaOffline,events:await(await import('/offline-clock/store.mjs')).listEvents()}))()"));
    console.error({ companyReceipts: [...companyReceipts.values()], pageErrors });
    throw error;
  }
  await evaluate("window.__fixtureFaceEnabled=false");
  assert.equal(companyReceipts.size, 3);
  assert.equal([...companyReceipts.values()].at(-1).action, 'salida');
  assert(!companyReceipts.has(historicalConflict.id));
  assert(await evaluate(`(async()=>{const event=(await(await import('/offline-clock/store.mjs')).listEvents()).find(event=>event.id===${JSON.stringify(historicalConflict.id)});return event.status==='review'&&event.action==='entrada'&&event.captured_at===${JSON.stringify(historicalConflict.captured_at)}})()`));
  assert(!await evaluate("Array.from(document.querySelectorAll('span')).some(span=>span.textContent.trim()==='Pendiente de subir')"));
  const cameraRequests = await evaluate('window.__cameraRequests');
  assert(cameraRequests > 0);
  for (const disconnected of [true, false]) {
    await offline(disconnected);
    await sleep(1500);
    assert.equal(await evaluate('window.__cameraRequests'), cameraRequests, 'connection changes must not reopen a closed facial camera');
    assert(!await evaluate("Array.from(document.querySelectorAll('video')).some(video=>video.srcObject?.getVideoTracks().some(track=>track.readyState==='live'))"));
  }
  await offline(true);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await followClockLink('/panel/registro-asistencia', 'Asistencia');
  await until(() => evaluate("!!document.querySelector('nav[aria-label=\"Navegación de asistencia\"] a[href=\"/fixture-company\"]')"), 'mobile attendance navigation');
  await followClockLink('/fixture-company', 'Registrar Entrada / Salida');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await go('/panel/empleados', 'Ana Fixture');
  assert(await evaluate("document.body.textContent.includes('Sin conexión')"));
  assert(await evaluate("document.querySelectorAll('nav, [data-sidebar]').length>0"));
  await go('/panel/registro-de-entradas-y-salidas', 'Entradas');
  await send('Network.setCookie', { name: 'token', value: token() + 'different', url: base, path: '/' });
  await go('/panel/empleados', 'Esta pantalla no se ha descargado');
  assert(!await evaluate("document.body.textContent.includes('Ana Fixture')"));
  await send('Network.deleteCookies', { name: 'token', url: base });
  await go('/fixture-company', 'Registrar Entrada / Salida');
  assert(!await evaluate("!!document.querySelector('nav[aria-label=\"Navegación de asistencia\"]')"));
  await offline(false); role = 'Empleado';
  await send('Network.setCookie', { name: 'token', value: token(), url: base, path: '/' });
  await go('/empleado/panel/inicio', 'Hola, Diego'); await snapshot();
  await go('/empleado/panel/asistencias', 'Mis asistencias'); await snapshot();
  await go('/empleado/reloj-checador', 'Registrar Entrada / Salida'); await snapshot();
  await until(() => evaluate("document.body.textContent.includes('Reconocimiento offline preparado en este dispositivo')"), 'employee own facial download');
  assert(!await evaluate("document.body.textContent.includes('Preparar reloj offline')"));
  await offline(true);
  await go('/empleado/panel/inicio', 'Hola, Diego');
  assert(await evaluate("document.body.textContent.includes('8 días')"));
  await go('/empleado/panel/asistencias', 'Mis asistencias');
  await go('/empleado/reloj-checador', 'Registrar Entrada / Salida');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await followClockLink('/empleado/panel/asistencias', 'Mis asistencias');
  assert(!await evaluate("!!document.querySelector('nav[aria-label=\"Navegación de asistencia\"] a[href^=\"/panel/\"]')"));
  await followClockLink('/empleado/reloj-checador', 'Registrar Entrada / Salida');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await until(() => evaluate("document.body.textContent.includes('Sin conexión · Reconocimiento local listo')"), 'offline employee recognition ready');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await until(() => evaluate("Array.from(document.querySelectorAll('button')).some(button=>button.textContent.trim()==='Rostro' && !button.disabled && button.getBoundingClientRect().width>0)"), 'offline mobile facial tab remains available');
  await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='Código'&&button.getBoundingClientRect().width>0).click()");
  for (let i = 0; i < 2; i++) {
    await evaluate("Array.from(document.querySelectorAll('input')).find(input=>input.placeholder==='Ingresa tu código'&&input.getBoundingClientRect().width>0).focus()");
    await send('Input.insertText', { text: '123' });
    await until(() => evaluate("Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Registrar Entrada / Salida' && !button.disabled && button.getBoundingClientRect().width>0)"), 'code input enables registration');
    await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Registrar Entrada / Salida'&&button.getBoundingClientRect().width>0).click()");
    try {
      await until(() => evaluate(`(async()=>{const events=(await(await import('/offline-clock/store.mjs')).listEvents()).filter(event=>event.scope!=='company');return events.length===${i + 1}})()`), 'normal clock pending save');
    } catch (error) {
      console.error(await evaluate("(async()=>({text:document.body.innerText,events:await(await import('/offline-clock/store.mjs')).listEvents(),inputs:Array.from(document.querySelectorAll('input'),input=>({value:input.value,visible:input.getBoundingClientRect().width>0}))}))()"));
      throw error;
    }
    await sleep(1100);
  }
  assert.equal(receipts.size, 0);
  await followClockLink('/empleado/panel/asistencias', 'Mis asistencias');
  await until(() => evaluate("document.querySelectorAll('tr[data-offline-event]').length===2"), 'personal history shows this session offline captures');
  await offline(false);
  await until(() => evaluate("document.body.textContent.includes('pendiente')"), 'queued records visible');
  await evaluate("window.dispatchEvent(new Event('online'))");
  await until(() => evaluate("(async()=>{const events=(await(await import('/offline-clock/store.mjs')).listEvents()).filter(event=>event.scope!=='company');return events.length===2&&events.every(event=>event.status==='synced')})()"), 'automatic sync after lost response', 600);
  assert.equal(receipts.size, 2);
  await followClockLink('/empleado/reloj-checador', 'Registrar Entrada / Salida');
  await until(() => evaluate("document.body.textContent.includes('Reconocimiento offline preparado en este dispositivo')"), 'employee face ready before disconnection');
  await offline(true);
  await evaluate("(()=>{window.__fixtureFaceEnabled=true; Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='Rostro'&&button.getBoundingClientRect().width>0).click()})()");
  await until(() => evaluate("(async()=>{const events=await(await import('/offline-clock/store.mjs')).listEvents();return events.some(event=>event.scope==='company'&&event.local_validated&&event.status==='pending'&&event.employeeName==='Diego Fixture'&&event.local_verification?.signature&&!event.descriptor)})()"), 'employee camera recognizes own face offline and persists a signed capture');
  await evaluate("window.__fixtureFaceEnabled=false");
  const employeeFace = await evaluate("(async()=>(await(await import('/offline-clock/store.mjs')).listEvents()).find(event=>event.scope==='company'&&event.local_validated&&event.status==='pending'))()");
  assert.equal(receipts.size, 2, 'offline face must not reach the server');
  await followClockLink('/empleado/panel/asistencias', 'Mis asistencias');
  await until(() => evaluate("document.querySelector('tr[data-offline-event]')?.textContent.includes('Rostro reconocido · Pendiente de subir') && document.querySelector('tr[data-offline-event]')?.textContent.includes('Diego Fixture')"), 'employee history shows recognized face pending upload');
  await go('/empleado/panel/asistencias', 'Mis asistencias');
  await until(() => evaluate("document.querySelectorAll('tr[data-offline-event]').length===1"), 'employee facial capture survives offline reload');
  await offline(false);
  await evaluate("window.dispatchEvent(new Event('online'))");
  await until(() => companyReceipts.has(employeeFace.id), 'employee signed face synchronized with recognized identity');
  assert.equal(companyReceipts.get(employeeFace.id).action, employeeFace.action);
  await until(() => evaluate("document.querySelectorAll('tr[data-offline-event]').length===0"), 'employee synchronized face no longer duplicates history');
  await evaluate("window.dispatchEvent(new Event('online'))");
  await sleep(1500);
  assert.equal(companyReceipts.size, 4, 'reconnection must not duplicate employee facial attendance');
  await followClockLink('/empleado/reloj-checador', 'Registrar Entrada / Salida');
  await evaluate("(()=>{window.__fixtureFaceEnabled=true; Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='Rostro'&&button.getBoundingClientRect().width>0).click()})()");
  await until(() => evaluate("!!document.querySelector('.bg-green-500 svg')"), 'employee online facial capture shows green confirmation');
  await evaluate("window.__fixtureFaceEnabled=false");
  assert.equal(companyReceipts.size, 5, 'employee success requires a server receipt');
  const employeeCameraRequests = await evaluate('window.__cameraRequests');
  for (const disconnected of [true, false]) {
    await offline(disconnected);
    await sleep(1500);
    assert.equal(await evaluate('window.__cameraRequests'), employeeCameraRequests, 'connection changes must not reopen employee camera');
    assert(!await evaluate("Array.from(document.querySelectorAll('video')).some(video=>video.srcObject?.getVideoTracks().some(track=>track.readyState==='live'))"));
  }
  await offline(true);
  await evaluate(`(()=>{window.__fixtureFaceDescriptor=${JSON.stringify(coworkerDescriptor)};window.__fixtureFaceEnabled=true;Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='Rostro'&&button.getBoundingClientRect().width>0).click()})()`);
  await until(() => evaluate("(async()=>(await(await import('/offline-clock/store.mjs')).listEvents()).some(event=>event.scope==='company'&&event.local_employee===102&&event.employeeName==='Luis Compañero Fixture'&&event.status==='pending'&&event.local_verification?.signature))()"), 'employee clock recognizes a coworker offline under the coworker identity');
  await evaluate('window.__fixtureFaceEnabled=false');
  await followClockLink('/empleado/panel/asistencias', 'Mis asistencias');
  assert.equal(await evaluate("document.querySelectorAll('tr[data-offline-event]').length"), 0, 'coworker attendance must not enter the logged-in employee history');
  await offline(false);
  await evaluate("window.dispatchEvent(new Event('online'))");
  await until(() => [...companyReceipts.values()].some(receipt => receipt.employee.id === 102), 'coworker attendance uploads under the recognized identity');
  assert.equal(companyReceipts.size, 6);
  assert(await evaluate("(async()=>{const store=await import('/offline-clock/store.mjs');await store.clearConfig();const values=await store.allValues();return !values.some(value=>value?.kind==='local-face'&&value.mode==='employee')&&values.some(value=>value?.kind==='local-face'&&value.mode==='company')&&(await store.listEvents()).length===9&&!!(await store.getValue('face:device:v1'))?.privateKey})()"));
  console.log('PASS: Next/Chrome offline navigation, authorized facial download, local face comparison with synthetic camera detections, persistent signed captures in both tables, descriptor-free sync, session isolation and lost-response retry. No real APIs or databases used.');
} finally { socket?.close(); chrome?.kill(); next.kill(); }
