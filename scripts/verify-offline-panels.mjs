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
let referenceDownloads = 0;
const fixtureDevices = new Map();
const fixtureDescriptor = Array.from({ length: 128 }, (_, index) => index === 0 ? 1 : 0);
const fixtureModel = 'face-api-0.22.2-128-cosine-v1';
const workerSessions = new Map();
const pageErrors = [], apiPaths = new Set();
let droppedResponse = false;
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
  if (request.url.startsWith(base) && !path.startsWith('/api/')) return send('Fetch.continueRequest', { requestId });
  if (event.resourceType === 'Script' && !path.startsWith('/api/')) return send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }], body: '' });
  apiPaths.add(path);
  const json = data => send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: base }, { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type,x-adamia-session' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }], body: Buffer.from(JSON.stringify(data)).toString('base64') });
  if (request.method === 'OPTIONS') return json({});
  if (path.endsWith('/users/verify/token')) return json({ user: user() });
  if (path.endsWith('/offline/referencias')) {
    referenceDownloads++;
    const body = JSON.parse(request.postData);
    fixtureDevices.set(body.device_id, body.public_key);
    return json({ kind: 'local-face', mode: role === 'Empleado' ? 'employee' : 'company', employee: role === 'Empleado' ? 101 : null, company: 10, device_id: body.device_id, model: fixtureModel,
      prepared_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), employees: [{ id: 101, nombre: role === 'Empleado' ? 'Diego Fixture' : 'Ana Fixture', descriptor: fixtureDescriptor, reference: 'fixture-reference', grant: 'fixture-local-authorization', code_identity: createHash('sha256').update('123').digest('hex'), open: false, cierre_turno: 'Automatico', checar_gps: false, areas: [] }] });
  }
  if (path.endsWith('/offline/empresa/perfil')) return json({ scope: 'company', id_empresa: 10, slug: company.slug, nombre: company.nombre, grant: 'fixture-grant', prepared_at: new Date().toISOString() });
  if (path.endsWith('/offline/perfil')) return json({ ...employee, nombre: 'Diego Fixture', metodo: 'codigo', cierre_turno: 'Automático', checar_gps: false, prepared_at: new Date().toISOString() });
  if (path.endsWith('/offline/empresa/sincronizar')) {
    const event = JSON.parse(request.postData);
    if (event.local_verification) {
      assert.equal(event.descriptor, undefined);
      assert.equal(event.local_employee, 101);
      const proof = event.local_verification;
      const canonical = JSON.stringify([event.id, event.captured_at, event.action, event.method, Number(event.company), Number(event.local_employee), event.latitude ?? null, event.longitude ?? null, event.precision_metros ?? null, event.ubicacion_timestamp ?? null, proof.device_id, proof.model, proof.reference, proof.score, proof.grant]);
      assert(verifySignature('sha256', Buffer.from(canonical), { key: createPublicKey({ key: fixtureDevices.get(proof.device_id), format: 'jwk' }), dsaEncoding: 'ieee-p1363' }, Buffer.from(proof.signature, 'base64url')));
    }
    if (!companyReceipts.has(event.id)) companyReceipts.set(event.id, { id: event.id, status: 'synced', action: event.action === 'auto' ? 'entrada' : event.action, employee: { id: 101, nombre: 'Ana Fixture' } });
    return json(companyReceipts.get(event.id));
  }
  if (path.endsWith('/offline/sincronizar')) {
    const event = JSON.parse(request.postData);
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
    if (message.method === 'Fetch.requestPaused') { void intercept(message.params).catch(() => {}); return; }
    const handler = pending.get(message.id); if (!handler) return; pending.delete(message.id);
    if (message.error) handler.reject(new Error(JSON.stringify(message.error))); else handler.resolve(message.result);
  };
  await send('Page.enable'); await send('Network.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(ok,fail){fail({code:1,message:'Fixture GPS denied'})}}});" });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fixtureFaceEnabled=false; window.faceapi={nets:{ssdMobilenetv1:{params:true},faceLandmark68Net:{params:true},faceRecognitionNet:{params:true}},detectSingleFace(){return {withFaceLandmarks(){return {withFaceDescriptor:async()=>window.__fixtureFaceEnabled?{descriptor:new Float32Array(${JSON.stringify(fixtureDescriptor)})}:null}}}}};` });
  await send('Network.setCookie', { name: 'token', value: token(), url: base, path: '/' });
  await go('/panel/empleados', 'Ana Fixture'); await snapshot();
  await until(() => evaluate("(async()=>{const data=await(await import('/offline-clock/store.mjs')).getValue('faces:company:10');return data?.employees?.length===1})()"), 'global background face download without opening a clock');
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
  assert(await evaluate("(async()=>{const store=await import('/offline-clock/store.mjs');await store.clearConfig();const values=await store.allValues();return !values.some(value=>value?.kind==='local-face'&&value.mode==='employee')&&values.some(value=>value?.kind==='local-face'&&value.mode==='company')&&(await store.listEvents()).length===4&&!!(await store.getValue('face:device:v1'))?.privateKey})()"));
  console.log('PASS: Next/Chrome offline navigation, authorized facial download, local face comparison with synthetic camera detections, persistent signed captures in both tables, descriptor-free sync, session isolation and lost-response retry. No real APIs or databases used.');
} finally { socket?.close(); chrome?.kill(); next.kill(); }
