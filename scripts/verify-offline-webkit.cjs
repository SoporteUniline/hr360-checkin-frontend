// WebKit/iPhone menu regression. Uses only synthetic APIs and no real database.
const assert = require('node:assert/strict');
const { createHmac, randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const { createServer: createHttpServer } = require('node:http');
const { webkit, devices } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const base = `http://127.0.0.1:${port}`, secret = randomUUID();
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
  const body = Buffer.from(JSON.stringify({ tipo_usuario: 'Recruiter', id_usuario: -123, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const token = `${head}.${body}.${createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], { stdio: 'ignore', windowsHide: true, env: { ...process.env, JWT_SECRET: secret } });
  let browser, page, apiServer;
  const errors = [], warnings = [];
  try {
    for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/login')).ok) break; } catch {} await sleep(200); }
    browser = await webkit.launch({ headless: true });
    const context = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'allow' });
    await context.addCookies([{ name: 'token', value: token, url: base }]);
    const employee = { id: 1, id_empleado: 101, id_empresa: 10, nombre: 'Ana Fixture', apellido_paterno: 'Prueba', apellido_materno: '', nombre_empleado: 'Ana Fixture Prueba', fecha: '2026-11-04', entrada: '2026-11-04 09:00:00', salida: '2026-11-04 18:00:00', asistencia: 1, goce_sueldo: 1, estadoAsistencia: 'Presente', estado_asistencia: 'Presente', tipo_registro_nombre: 'Asistencia', estado: 'Cerrado', departamento: 'Pruebas', nip: '123' };
    const accepted = new Map();
    apiServer = createHttpServer(async (req, res) => {
      const path = new URL(req.url, base).pathname;
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || base);
      res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type,x-adamia-session');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
      if (path.endsWith('/eventos-checada')) { res.setHeader('Content-Type', 'text/event-stream'); return res.end(': fixture\n\n'); }
      res.setHeader('Content-Type', 'application/json');
      const json = value => res.end(JSON.stringify(value));
      if (path.endsWith('/offline/empresa/sincronizar')) {
        let input = ''; for await (const chunk of req) input += chunk;
        const event = JSON.parse(input);
        if (event.method === 'facial') { res.statusCode = 403; return json({ error: 'Rostro no reconocido en la prueba', code: 'FACE_NOT_MATCHED' }); }
        if (!accepted.has(event.id)) accepted.set(event.id, { id: event.id, status: 'synced', action: 'entrada', employee: { id: 101, nombre: 'Ana Fixture' } });
        return json(accepted.get(event.id));
      }
      if (path.endsWith('/users/verify/token')) return json({ user: { id_usuario: -123, id_empresa: 10, tipo_usuario: 'Recruiter', nombre: 'RH Fixture', empresas: [10], empresas_detalle: [{ id_empresa: 10, nombre: 'Fixture', zona_horaria: 'America/Mexico_City' }] } });
      if (path.endsWith('/empleados')) return json({ data: [employee], total: 1 });
      if (path.endsWith('/asistencias') || path.endsWith('/reloj/asistencia')) return json({ registros: [employee], total: 1, page: 1, total_empleados: 1, total_presentes: 1 });
      if (path.endsWith('/campos-personalizados') || path.includes('/departamentos') || path.includes('/tiposPermiso')) return json([]);
      return json({ data: [], total: 0 });
    });
    await new Promise(resolve => apiServer.listen(4561, '127.0.0.1', resolve));
    let offline = false;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      if (url.origin === 'http://127.0.0.1:4561') return route.continue();
      if (url.origin === base && !path.startsWith('/api/')) return route.continue();
      if (offline) return route.abort('internetdisconnected');
      if (request.resourceType() === 'script') return route.fulfill({ contentType: 'application/javascript', body: '' });
      const json = data => route.fulfill({ json: data, headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Headers': 'authorization,content-type,x-adamia-session', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' } });
      if (request.method() === 'OPTIONS') return json({});
      if (path.endsWith('/users/verify/token')) return json({ user: { id_usuario: -123, id_empresa: 10, tipo_usuario: 'Recruiter', nombre: 'RH Fixture', empresas: [10], empresas_detalle: [{ id_empresa: 10, nombre: 'Fixture', zona_horaria: 'America/Mexico_City' }] } });
      if (path.endsWith('/empleados')) return json({ data: [employee], total: 1 });
      if (path.endsWith('/asistencias') || path.endsWith('/reloj/asistencia')) return json({ registros: [employee], total: 1, page: 1, total_empleados: 1, total_presentes: 1 });
      if (path.endsWith('/campos-personalizados') || path.includes('/departamentos') || path.includes('/tiposPermiso')) return json([]);
      return json({ data: [], total: 0 });
    });
    page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') warnings.push(message.text().slice(0, 400)); });
    async function snapshot(path, marker) {
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      await page.getByText(marker, { exact: false }).first().waitFor({ timeout: 30000 });
      await page.waitForFunction(async () => {
        const module = await import('/offline-clock/app-cache.mjs');
        return !!await module.readResponse(await module.ownerKey(), 'page', location.href);
      }, { timeout: 60000 });
      await sleep(1500);
    }
    await snapshot('/panel/registro-asistencia', 'Ana Fixture');
    await snapshot('/panel/registro-de-entradas-y-salidas', 'Ana Fixture');
    offline = true;
    await context.setOffline(true);
    for (const [label, path] of [['Asistencias', '/panel/registro-asistencia'], ['Entradas y salidas', '/panel/registro-de-entradas-y-salidas']]) {
      await page.getByRole('button', { name: 'Toggle Sidebar', exact: true }).last().click();
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.waitForURL(base + path, { timeout: 20000 });
      await page.getByText('Ana Fixture', { exact: false }).first().waitFor({ timeout: 20000 });
      assert(!await page.locator('body').innerText().then(text => text.includes('Application error')));
    }
    assert.deepEqual(errors.filter(error => !error.includes('eventos-checada') && !error.includes('offline-clock-sw.js due to access control checks')), []);
    offline = false;
    await context.setOffline(false);
    const ids = await page.evaluate(async () => {
      const store = await import('/offline-clock/store.mjs?v=4');
      const common = { company: 10, scope: 'company', action: 'auto', captured_at: new Date().toISOString(), latitude: null, longitude: null, grant: 'fixture-only', status: 'pending', error: '' };
      const face = { ...common, id: crypto.randomUUID(), method: 'facial', identity: 'facial', descriptor: Array(128).fill(0.1), alias: 'Rostro por validar' };
      const code = { ...common, id: crypto.randomUUID(), method: 'codigo', identity: 'code:123', code: '123', alias: 'Código •••123' };
      await store.saveEvent(face); await store.saveEvent(code);
      window.dispatchEvent(new Event('adamia-queue')); window.dispatchEvent(new Event('online'));
      return { face: face.id, code: code.id, captured_at: face.captured_at };
    });
    await page.getByText('1 para revisión', { exact: false }).first().click({ timeout: 30000 });
    await page.getByText('No aceptada · Se conserva para revisión', { exact: true }).waitFor();
    await page.getByText('Rostro no reconocido en la prueba', { exact: true }).waitFor();
    assert.equal(await page.getByText('Request failed with status code 403', { exact: true }).count(), 0);
    const records = await page.evaluate(async () => (await import('/offline-clock/store.mjs?v=4')).listEvents());
    const face = records.find(event => event.id === ids.face);
    assert.equal(face.status, 'review'); assert.equal(face.captured_at, ids.captured_at); assert.equal(face.descriptor.length, 128);
    assert.equal(records.find(event => event.id === ids.code).status, 'synced');
    assert.equal(accepted.size, 1);
    console.log(JSON.stringify({ status: 'PASS', browser: 'WebKit/iPhone', checks: ['mobile attendance with rows', 'mobile movements with rows', 'offline sidebar button navigation', 'cached rows visible', 'no client exceptions', 'facial 403 shows real reason and review status', 'facial evidence retained', 'code still syncs'] }));
  } catch (error) {
    if (page) console.error(JSON.stringify({ url: page.url(), text: (await page.locator('body').innerText()).slice(0, 1800), errors, warnings: warnings.slice(-8) }));
    console.error(error.stack);
    throw error;
  } finally { await browser?.close(); server.kill(); if (apiServer) { apiServer.closeAllConnections(); await new Promise(resolve => apiServer.close(resolve)); } }
})().catch(() => { process.exitCode = 1; });
