import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { SignJWT, jwtVerify } from 'jose';
const require = createRequire(import.meta.url);
const { NextResponse } = require('next/server');
const { unstable_doesMiddlewareMatch } = require('next/experimental/testing/server');
const source = (await readFile(new URL('../src/middleware.jsx', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, '');
const secret = new TextEncoder().encode('synthetic-native-test-only');
const context = vm.createContext({ NextResponse, jwtVerify, TextEncoder, URL, crypto: globalThis.crypto, process: { env: { JWT_SECRET: 'synthetic-native-test-only' } } });
vm.runInContext(source + '\nglobalThis.api={middleware,config};', context);
const blocked = ['/', '/contratar-plan', '/cotiza', '/alta-empresas', '/register', '/signup', '/funcionalidades', '/quienes-somos', '/contacto', '/blog-y-noticias', '/bolsa-de-trabajo', '/calculadora-aguinaldos', '/capacitacion', '/politicas', '/terminos-condiciones', '/aviso-privacidad'];
async function request(path, { native = true, role, expired = false } = {}) {
  const token = role ? await new SignJWT({ tipo_usuario: role }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(expired ? '0s' : '1h').sign(secret) : null;
  return context.api.middleware({ url: 'https://adamia.test' + path, nextUrl: new URL('https://adamia.test' + path), headers: new Headers({ 'user-agent': native ? 'Android AdamiaAppNative' : 'Browser' }), cookies: { get: () => token ? { value: token } : undefined } });
}
test('every blocked native route and its children are covered by the actual Next matcher', () => {
  for (const path of blocked.flatMap(path => path === '/' ? ['/'] : [path, path + '/nested'])) {
    assert(unstable_doesMiddlewareMatch({ config: context.api.config, nextConfig: {}, url: 'https://adamia.test' + path }), path);
  }
  assert(!unstable_doesMiddlewareMatch({ config: context.api.config, nextConfig: {}, url: 'https://adamia.test/api/health' }));
});
test('native public and registration routes redirect to login without a session', async () => {
  for (const path of blocked) assert.equal((await request(path)).headers.get('location'), 'https://adamia.test/login', path);
});
test('browser public pages remain public with and without an existing session', async () => {
  for (const path of blocked.filter(path => !['/', '/contratar-plan', '/cotiza', '/alta-empresas', '/register'].includes(path))) {
    for (const role of [undefined, 'Recruiter']) assert.equal((await request(path, { native: false, role })).headers.get('x-middleware-next'), '1', path);
  }
});
test('native login, role redirects and protected modules keep their authentication behavior', async () => {
  assert.equal((await request('/login')).headers.get('x-middleware-next'), '1');
  assert.equal((await request('/panel/empleados')).headers.get('location'), 'https://adamia.test/login');
  assert.equal((await request('/panel/empleados', { role: 'Recruiter' })).headers.get('x-middleware-next'), '1');
  assert.equal((await request('/login', { role: 'Empleado' })).headers.get('location'), 'https://adamia.test/empleado');
  assert.equal((await request('/panel/mi-suscripcion', { role: 'Recruiter' })).headers.get('location'), 'https://adamia.test/panel');
  assert.equal((await request('/panel', { role: 'Recruiter', expired: true })).headers.get('location'), 'https://adamia.test/login');
});
