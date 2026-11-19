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
  const rutas = async (route) => {
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
  };
  await page.route("**/*", rutas);

  // Llega desde Asistencias › Horas con la semana y la persona.
  await page.goto(`${base}/panel/horas-extra?semana=${dia(3)}&empleado=`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Control de horas extra" }).waitFor({ timeout: 30000 });
  // Vista «Por fechas» (predeterminada): días arriba, horas abajo.
  const matriz = page.getByRole("table", { name: "Horas extra por día" });
  await matriz.waitFor({ timeout: 30000 });
  assert.ok(pedidos.some((x) => x.startsWith("asistencias") && x.includes(`fechaInicio=${L}`) && x.includes(`fechaFin=${dia(6)}`)), JSON.stringify(pedidos));
  assert.ok(pedidos.some((x) => x === `jornada ?fecha=${L}`));
  assert.match(await page.getByText(/^16 nov – 22 nov 2026$/).innerText(), /16 nov/);
  assert.match(await matriz.locator("thead").innerText(), /Lun\s*16[\s\S]*Dom\s*22[\s\S]*Total[\s\S]*De 9 h al doble/i);
  // Pendientes primero; solo quien tiene horas extra.
  const nombres = await matriz.locator("tbody tr").evaluateAll((trs) => trs.map((t) => t.getAttribute("aria-label")));
  assert.deepEqual(nombres.slice(0, 2).sort(), ["Diego Prueba", "Hilda Prueba"]);
  assert.ok(!nombres.includes("Sinextra Prueba"));
  const filaG = matriz.getByRole("row", { name: "Gabriel Prueba", exact: true });
  assert.match(await filaG.innerText(), /4:00[\s\S]*4:00[\s\S]*5:30[\s\S]*13 h 30 min[\s\S]*4 h 30 min al triple/);
  assert.match(await matriz.locator("tfoot").innerText(), /Total del día[\s\S]*2 por aut\./);
  if (process.env.CAPTURAS) { await dormir(300); await page.screenshot({ path: process.env.CAPTURAS + "/horas-extra-fechas.png" }); }

  // Clic en un día: sus registros, decidir y el enlace a Asistencias.
  await matriz.getByRole("button", { name: /^Diego Prueba 2026-11-19/ }).click();
  const dlgDia = page.getByRole("dialog");
  await dlgDia.waitFor();
  const textoDia = await dlgDia.innerText();
  assert.match(textoDia, /Diego Prueba[\s\S]*jueves 19 de noviembre 2026[\s\S]*08:00 – 17:00[\s\S]*08:00 → 19:31[\s\S]*2 h 31 min[\s\S]*Por autorizar/i);
  const enlace = await dlgDia.getByRole("link", { name: /Abrir en Asistencias/ }).getAttribute("href");
  assert.match(enlace, /^\/panel\/registro-asistencia\?fecha=2026-11-19&empleado=Diego\+Prueba&abrir=\d+$/);
  if (process.env.CAPTURAS) { await dormir(300); await page.screenshot({ path: process.env.CAPTURAS + "/horas-extra-dia.png" }); }
  await dlgDia.getByRole("button", { name: "Sí", exact: true }).click();
  for (let i = 0; i < 40 && !puts.length; i++) await dormir(100);
  assert.deepEqual(puts[0].cuerpo, { hrs_extra: 1, forma_pago_extras: "Pago de horas extras", extras_autorizadas_por: 7 });
  puts.length = 0;
  await page.keyboard.press("Escape");

  // Tarjeta «Por autorizar» filtra la matriz.
  await page.getByRole("button", { name: /Por autorizar/ }).first().click();
  await page.waitForFunction(() => document.querySelectorAll('table[aria-label="Horas extra por día"] tbody tr').length === 2);
  await page.getByRole("button", { name: /Por autorizar/ }).first().click();

  // Quincena y mes: más columnas.
  await page.getByRole("group", { name: "Periodo" }).getByRole("button", { name: "Mes" }).click();
  await page.getByText(/^1 nov – 30 nov 2026$/).waitFor();
  assert.equal(await matriz.locator("thead th").count(), 1 + 30 + 1);
  await page.getByRole("group", { name: "Periodo" }).getByRole("button", { name: "Semana" }).click();
  await page.getByText(/^16 nov – 22 nov 2026$/).waitFor();

  // «Abrir en Asistencias» abre la ventana de edición de ese registro.
  const p2 = await ctx.newPage();
  p2.on("pageerror", (e) => errores.push(e.message));
  await p2.route("**/*", rutas);
  await p2.goto(base + enlace, { waitUntil: "domcontentloaded" });
  await p2.getByRole("dialog").waitFor({ timeout: 30000 });
  assert.match(await p2.getByRole("dialog").innerText(), /Diego/);
  await p2.close();

  // Vista «Lista»: la tabla de Asistencias con las columnas del control.
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await page.locator("tr", { hasText: "Gabriel Prueba" }).first().waitFor({ timeout: 30000 });

  // Tarjetas.
  const tarjetas = await page.getByRole("group", { name: "Resumen del periodo" }).innerText();
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

  // Teléfono: no desborda la página.
  await page.setViewportSize({ width: 390, height: 844 });
  await dormir(500);
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(ancho <= 1, `la página desborda ${ancho}px en teléfono`);

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK control de horas extra: vista por fechas (días arriba, pendientes primero, totales del día, tope), clic en un día con registros y Sí/No, enlace que abre la edición en Asistencias, filtro por tarjeta, semana/mes, vista Lista con tarjetas, columnas del control y autorizar en bloque, teléfono");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
