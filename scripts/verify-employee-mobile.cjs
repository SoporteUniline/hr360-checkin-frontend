// Local UI contract fixtures only. Does not contact or modify real employee records.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const crypto = require('node:crypto');
const secret = 'employee-mobile-fixture-only';
const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const body = Buffer.from(JSON.stringify({ tipo_usuario: 'Empleado', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
const token = `${head}.${body}.${crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`;
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4491';
(async () => {
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '4491', '-H', '127.0.0.1'], { stdio: 'ignore', env: { ...process.env, JWT_SECRET: secret } });
  for (let i = 0; i < 60; i++) {
    try { await fetch(base + '/empleado'); break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  try {
    for (const width of [320, 390, 768, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 780 }, isMobile: true, deviceScaleFactor: 1 });
      await context.addCookies([{ name: 'token', value: token, url: base }]);
      let posts = 0, failHistory = false;
      const requests = [{ id: 1, id_empleado: 101, id_tipo_permiso: 2, tipo_permiso_nombre: 'Vacaciones', fecha_inicio: '2026-11-02', fecha_fin: '2026-11-04', estado: 'Pendiente', motivo: 'Descanso', dias_trabajo: 'Lunes,Martes,Miércoles,Jueves,Viernes', descuenta_vacaciones: 1 }];
      for (let i=2;i<=13;i++) requests.push({ ...requests[0], id:i, estado:i===13?'Rechazado':'Aprobado', motivo:'Solicitud anterior '+i });
      await context.route('**/*', async route => {
        const p = new URL(route.request().url()).pathname;
        const json = data => route.fulfill({ json: data });
        if (p.endsWith('/users/verify/token')) return json({ user: { id_usuario: 1, id_empleado: 101, id_empresa: 10, tipo_usuario: 'Empleado', esEmpleado: true, nombre: 'Diego León', correo: 'fixture@example.test' } });
        if (p.endsWith('/registros-del-dia-empleado')) return json({ registrosHoy: [{ id: 3, entrada: '2026-10-23T15:00:00Z', salida: null, estado: 'Abierto' }], zona_horaria: 'America/Mexico_City' });
        if (p.endsWith('/panel-empleado/101/detalle')) {
          if (failHistory) return route.fulfill({ status: 403, json: { error: 'Sin acceso' } });
          return json({ asistencias: { historial: [{fecha:'2026-10-22',estado:'Presente'}, {fecha:'2026-10-21',estado:'Retardo'}] }, entradas_salidas: { registros: [{ id: 1, fecha: '2026-10-22', hora_entrada: '08:58', hora_salida: '18:02', estado: 'A tiempo' }, { id: 2, fecha: '2026-10-21', hora_entrada: '09:12', hora_salida: '-', estado: 'Retardo' }] } });
        }
        if (p.endsWith('/vacaciones/mi-saldo')) return json({ dias_disponibles: 8, dias_cargados: 12, dias_tomados: 4 });
        if (p.includes('/solicitudes-permiso/empleado/101')) { const pageNo=Number(new URL(route.request().url()).searchParams.get('page') || 1); return json({results:requests.slice((pageNo-1)*5,pageNo*5),total:requests.length}); }
        if(p.includes('/holidays/')) return json({festivos:[]});
        if (p.endsWith('/tiposPermiso')) return json({ tiposPermiso: [{ id: 2, nombre: 'Vacaciones', es_permiso: 0, descuenta_vacaciones: 1 }] });
        if (p.endsWith('/solicitudes-permiso') && route.request().method() === 'POST') {
          posts++;
          const payload = route.request().postDataJSON();
          assert.equal(payload.id_empleado, 101); assert.equal(payload.id_tipo_permiso, 2);
          assert.equal(payload.fecha_inicio, '2026-11-09'); assert.equal(payload.fecha_fin, '2026-11-10');
          await new Promise(resolve => setTimeout(resolve, 400));
          requests.unshift({ ...payload, id: 99, tipo_permiso_nombre: 'Vacaciones' });
          return json({ id: 2 });
        }
        if (!route.request().url().startsWith(base)) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}`);
      await page.goto(`${base}/empleado`);
      await page.getByRole('heading', { name: 'Hola, Diego' }).waitFor();
      await page.getByText('09:00', { exact: true }).waitFor();
      await page.screenshot({ path: `/tmp/employee-home-${width}.png`, fullPage: true });
      await noOverflow();
      await page.getByRole('link', { name: 'Asistencia', exact: true }).click();
      await page.getByLabel('Ir a fecha').fill('2026-10-22');
      await page.getByText('08:58', { exact: true }).waitFor();
      await page.getByLabel('Estado de asistencia').selectOption('Tardanza');
      assert.equal(await page.getByText('08:58', {exact:true}).count(),0);
      await page.getByText('09:12',{exact:true}).waitFor();
      await page.getByLabel('Estado de asistencia').selectOption('Todos');
      await page.locator('summary').first().click();
      await page.getByText('Entrada original: 08:58').waitFor();
      await page.getByRole('button',{name:'Mes',exact:true}).click();
      await page.getByRole('button',{name:'Año',exact:true}).click();
      await page.getByRole('button',{name:'Semana',exact:true}).click();
      await page.getByLabel('Ir a fecha').fill('2026-09-01');
      await page.getByText('No hay registros para estos filtros.').waitFor();
      await page.getByLabel('Ir a fecha').fill('2026-10-22');
      await page.screenshot({path:`/tmp/employee-attendance-v2-${width}.png`,fullPage:true});
      await noOverflow();
      await page.getByRole('link', { name: 'Solicitudes', exact: true }).click();
      await page.getByRole('button', { name: 'Rechazadas 1',exact:true }).click();
      await page.getByText('Solicitud anterior 13',{exact:true}).waitFor();
      assert.equal(await page.getByText('Descanso',{exact:true}).count(),0);
      await page.getByRole('button', { name: 'Todas 13',exact:true }).click();
      await page.getByText('3 días hábiles').first().waitFor();
      await page.screenshot({path:`/tmp/employee-requests-v2-${width}.png`,fullPage:true});
      await page.getByRole('button', { name: 'Nueva solicitud' }).click();
      await page.getByLabel('Tipo de permiso').click();
      await page.getByRole('option', { name: 'Vacaciones' }).click();
      await page.getByLabel('Fecha inicial').fill('2026-11-09');
      await page.getByLabel('Fecha final').fill('2026-11-10');
      await page.getByLabel('Motivo', { exact: true }).fill('Solicitud de prueba');
      const dialog = page.getByRole('dialog');
      const box = await dialog.boundingBox(); assert(box.y >= 0 && box.y + box.height <= 781, 'Dialog exceeds screen');
      await page.getByRole('button', { name: 'Enviar solicitud' }).click();
      await page.getByRole('button', { name: 'Enviando…' }).waitFor();
      assert(await page.getByRole('button', { name: 'Enviando…' }).isDisabled());
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(posts, 1);
      await page.getByText('Solicitud de prueba', { exact: true }).waitFor();
      await noOverflow();
      await page.getByRole('button', { name: 'Ver detalle' }).first().click();
      assert.equal(await page.getByRole('button', { name: 'Enviar solicitud' }).count(), 0);
      await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
      await page.getByRole('link', { name: 'Mi espacio', exact: true }).click();
      await page.getByRole('link', { name: /Mis activos y uniformes/ }).waitFor();
      await noOverflow();
      failHistory = true;
      await page.goto(`${base}/empleado/panel/asistencias`);
      await page.getByRole('alert').filter({ hasText: 'No pudimos consultar esta información' }).waitFor();
      assert.equal(await page.getByText('No hay registros para estos filtros.').count(), 0);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `/tmp/employee-mobile-${width}.png`, fullPage: true });
      await context.close();
      console.log(`PASS ${width}px: home, attendance, month filter, request create/detail, duplicate guard, navigation, API error, no overflow`);
    }
  } finally { await browser.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
