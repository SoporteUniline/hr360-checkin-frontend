// Verificación en navegador de «Control de horas extra» (backend simulado, nada sale a internet).
// Uso: npm run build && node scripts/verify-horas-extra.mjs   (CAPTURAS=carpeta para guardar capturas)
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
const token = `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura", apellido_paterno: "Gómez", id_empleado: 7, empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

// Semana fija (lunes 16 – domingo 22 nov 2026), la abre el enlace ?semana=.
const L = "2026-11-16";
const dia = (n) => new Date(Date.parse(`${L}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
let id = 1000;
const reg = (nombre, n, salida, o = {}) => ({
  id: id++, id_empleado: o.id_empleado ?? 200, nombre, apellido_paterno: "Prueba", apellido_materno: "", nip: "1",
  departamento: "Producción", unidad_negocio: "Matriz", zona_horaria: "America/Mexico_City", fecha: dia(n),
  tipo_registro_nombre: "Asistencia", id_tipo_permiso: 14, asistencia: 1, correccion: 0, estadoAsistencia: "Presente", hrs_comida: 0,
  hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00",
  entrada: `${dia(n)} 08:00:00`, salida: `${dia(n)} ${salida}:00`, hrs_extra: 0, ...o,
});
const autorizada = { hrs_extra: 1, extras_autorizadas_por: 9, nombre_extra_autorizador: "Laura", apellido_paterno_extra_autorizador: "Gómez", forma_pago_extras: "Pago de horas extras",
  ultimo_cambio: { nombre_usuario: "Laura Gómez", creado_en: "2026-11-16 19:55:00.000000", origen: "asistencia" } };
const registros = [
  reg("Gabriel", 0, "21:00", autorizada), // 4 h
  reg("Gabriel", 1, "21:00", autorizada), // 4 h
  reg("Gabriel", 2, "22:30", autorizada), // 5 h 30 → más de 4 h; semana 13 h 30 → 4 h 30 al triple
  reg("Hilda", 3, "18:15", { id_empleado: 201 }), // 1 h 15 por autorizar
  reg("Diego", 3, "19:31", { id_empleado: 202 }), // 2 h 31 por autorizar
  reg("Ivan", 2, "17:00", { id_empleado: 203, correccion: 1, valores_originales: JSON.stringify({ salida: `${dia(2)} 23:59:00` }), notas_hrs_extra: `No autorizadas por Laura Gómez · salida del reloj ${dia(2)} 23:59` }),
  reg("Sinextra", 3, "17:05", { id_empleado: 204 }),
];

const puts = [];
const pedidos = [];
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City", acceptDownloads: true });
  await ctx.addCookies([{ name: "token", value: token, url: base }]);
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/jornadas-legales/vigente")) { pedidos.push(`jornada ${url.search}`); return json({ ok: true, data: { minutos_ordinarios_semanales: 2880, minutos_extra_transitorios_semanales: 540 } }); }
    if (p.endsWith("/checador/tiposPermiso")) return json({ tiposPermiso: [{ id: 14, nombre: "Asistencia" }] });
    if (p.endsWith("/checador/asistencias") && req.method() === "GET") {
      pedidos.push(`asistencias ${url.search}`);
      return json({ registros, total: registros.length, page: 1, aplicarPaginacion: false });
    }
    if (/\/checador\/asistencias\/\d+$/.test(p) && req.method() === "PUT") { puts.push({ id: p.split("/").pop(), cuerpo: JSON.parse(req.postData() || "{}") }); return json({ asistencia: {} }); }
    if (/\/checador\/asistencias\/\d+\/cambios$/.test(p)) return json({ disponible: true, cambios: [] });
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });

  // Llega desde Asistencias › Horas con la semana y la persona.
  await page.goto(`${base}/panel/horas-extra?semana=${dia(3)}&empleado=`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Control de horas extra" }).waitFor({ timeout: 30000 });
  await page.locator("tr", { hasText: "Gabriel Prueba" }).first().waitFor({ timeout: 30000 });
  assert.ok(pedidos.some((x) => x.startsWith("asistencias") && x.includes(`fechaInicio=${L}`) && x.includes(`fechaFin=${dia(6)}`)), JSON.stringify(pedidos));
  assert.ok(pedidos.some((x) => x === `jornada ?fecha=${L}`));
  assert.match(await page.getByText(/^Semana 16 nov – 22 nov 2026$/).innerText(), /16 nov/);

  // Tarjetas.
  const tarjetas = await page.getByRole("group", { name: "Resumen de la semana" }).innerText();
  assert.match(tarjetas, /Por autorizar\s*3 h 46 min\s*2 registros · 2 personas/i);
  assert.match(tarjetas, /Autorizadas\s*13 h 30 min\s*9 h al doble · 4 h 30 min al triple/i);
  assert.match(tarjetas, /No autorizadas\s*6 h 59 min/i);
  assert.match(tarjetas, /Alertas de ley\s*2/i);

  // Solo quien tiene horas extra; columnas del control.
  const filas = page.locator("tbody tr", { hasText: "Prueba" });
  assert.equal(await filas.count(), 6, "no muestra a quien no tiene horas extra");
  assert.equal(await page.locator("tr", { hasText: "Sinextra" }).count(), 0);
  const filaGab = page.locator("tr", { hasText: "Gabriel Prueba" }).filter({ hasText: "Más de 4 h extra" });
  assert.match(await filaGab.innerText(), /Laura Gómez[\s\S]*13 h 30 min de 9 h[\s\S]*Más de 4 h extra en el día[\s\S]*Pasa de 9 h en la semana: 4 h 30 min al triple/);
  assert.match(await page.locator("tr", { hasText: "Hilda Prueba" }).innerText(), /Pendiente/);
  assert.match(await page.locator("tr", { hasText: "Ivan Prueba" }).innerText(), /Laura Gómez/);
  assert.equal(await page.getByRole("button", { name: /Registrar asistencia masiva/ }).count(), 0);
  assert.equal(await page.getByRole("button", { name: /Exportar Excel/ }).count(), 1);
  if (process.env.CAPTURAS) { await dormir(300); await page.screenshot({ path: process.env.CAPTURAS + "/control-horas-extra.png" }); }

  // La tarjeta «Por autorizar» filtra.
  await page.getByRole("button", { name: /Por autorizar/ }).first().click();
  await page.waitForFunction(() => document.querySelectorAll("tbody tr").length <= 3);
  assert.equal(await filas.count(), 2);
  assert.equal(await page.getByRole("button", { name: /Por autorizar/ }).first().getAttribute("aria-pressed"), "true");

  // Autorizar en bloque a los dos (barra de acciones de Asistencias).
  await page.getByRole("checkbox", { name: "Elegir todos los mostrados" }).check();
  const barra = page.getByRole("region", { name: "Acciones para los seleccionados" });
  assert.match(await barra.innerText(), /2 seleccionados/);
  await barra.getByRole("button", { name: "✓ Horas extra" }).click();
  const dlg = page.getByRole("dialog", { name: "Horas extra" });
  await dlg.getByRole("button", { name: "Aplicar a 2" }).click();
  for (let i = 0; i < 50 && puts.length < 2; i++) await dormir(100);
  assert.deepEqual(puts.map((x) => x.cuerpo.hrs_extra), [1, 1]);
  assert.ok(puts.every((x) => x.cuerpo.extras_autorizadas_por === 7));
  await barra.getByRole("button", { name: "Quitar selección" }).click();

  // Quitar filtro y abrir la ventana de edición al dar clic en una fila.
  await page.getByRole("button", { name: /Por autorizar/ }).first().click();
  await page.waitForFunction(() => document.querySelectorAll("tbody tr").length >= 6);
  await page.locator("tr", { hasText: "Diego Prueba" }).locator("td").nth(3).click();
  await page.getByRole("dialog").waitFor({ timeout: 10000 });
  assert.match(await page.getByRole("dialog").innerText(), /Diego/);
  await page.keyboard.press("Escape");

  // Por persona: agrupa por empleado.
  await page.getByRole("button", { name: "Por persona" }).click();
  assert.equal(await page.getByRole("button", { name: "Por persona" }).getAttribute("aria-pressed"), "true");

  // Teléfono: no desborda la página.
  await page.setViewportSize({ width: 390, height: 844 });
  await dormir(500);
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(ancho <= 1, `la página desborda ${ancho}px en teléfono`);

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK control de horas extra: semana del enlace, tope del catálogo, tarjetas (por autorizar/autorizadas doble-triple/no autorizadas/alertas), solo filas con extra, decidió/semana/alertas, filtro por tarjeta, autorizar en bloque, ventana de edición, por persona, teléfono");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
