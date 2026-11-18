// Verificación en navegador real (Chromium + Next compilado) de la Fase 1 de Asistencias:
// horas en minutos, turno nocturno (+1 día) y Exportar con el periodo completo.
// Todas las respuestas del backend son sintéticas; ninguna petición sale a internet.
// Uso: npm run build && node scripts/verify-asistencias-fase1.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const ExcelJS = require("exceljs");

const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function token() {
  // Sin id_empresa: el layout de RH no consulta la base de datos (ver panel/layout.jsx).
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}

const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

// 25 registros: 0 = día normal con comida; 1 = nocturno bien guardado; 2 = nocturno viejo (salida mismo día); resto normales.
const registros = Array.from({ length: 25 }, (_, i) => ({
  id: 1000 + i, id_empleado: 200 + i, nombre: `Empleado${i}`, apellido_paterno: "Prueba", apellido_materno: "",
  nip: String(100 + i), departamento: "Operación", unidad_negocio: "Matriz", zona_horaria: "America/Mexico_City",
  fecha: "2026-11-13", tipo_registro_nombre: "Asistencia", id_tipo_permiso: 14, asistencia: 1, correccion: 0,
  estadoAsistencia: "Presente", hrs_comida: 1,
  hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00",
  entrada: "2026-11-13 08:07:00", salida: "2026-11-13 17:20:00",
}));
Object.assign(registros[1], { nombre: "Nocturno", hrs_comida: 0, hora_entrada_programada: "22:00:00", hora_salida_programada: "05:00:00", entrada: "2026-11-13 22:00:00", salida: "2026-11-14 05:00:00" });
Object.assign(registros[2], { nombre: "NocturnoViejo", hrs_comida: 0, hora_entrada_programada: "22:00:00", hora_salida_programada: "05:00:00", entrada: "2026-11-13 22:00:00", salida: "2026-11-13 05:00:00" });
Object.assign(registros[4], { nombre: "Calendario", fecha: "2026-11-16", entrada: "2026-11-16 08:07:00", salida: "2026-11-16 17:20:00", es_domingo: 1, es_festivo: 0 });
Object.assign(registros[3], { nombre: "Editado", correccion: 1, valores_originales: JSON.stringify({ salida: "2026-11-13 13:19:00", id_tipo_permiso: 2 }) });

const puts = [];
const pedidosAsistencias = [];
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));

  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/reloj/asistencia-por-empleado")) return json({ registros: [{ id: 77, entrada: "2026-11-13 08:07:00", entrada_corregida: null, salida: "2026-11-13 13:19:00", salida_corregida: "2026-11-13 17:20:00", estado: "Cerrado" }] });
    if (p.includes("/checador/holidays/")) return json([{ fecha: "2026-11-16", nombre: "Revolución" }]);
    if (p.endsWith("/checador/tiposPermiso")) return json({ tiposPermiso: [{ id: 14, nombre: "Asistencia" }, { id: 2, nombre: "Sin Checar" }] });
    if (p.endsWith("/checador/asistencias") && req.method() === "GET") {
      const limit = Number(url.searchParams.get("limit") || 10);
      const pag = Number(url.searchParams.get("page") || 1);
      pedidosAsistencias.push(limit);
      return json({ registros: registros.slice((pag - 1) * limit, pag * limit), total: registros.length, page: pag, aplicarPaginacion: true });
    }
    if (/\/checador\/asistencias\/\d+$/.test(p) && req.method() === "PUT") {
      puts.push(JSON.parse(req.postData() || "{}"));
      return json({ asistencia: {} });
    }
    if (p.includes("eventos-checada")) return route.abort();
    if (url.origin === base) return json({});
    return json({});
  });

  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByText("Empleado0", { exact: false }).first().waitFor({ timeout: 30000 });

  // 1) Horas en minutos: 08:07–17:20 con 1 h de comida = 8 h 13 min de 8 h programadas → +13 min.
  const fila0 = page.locator("tr", { hasText: "Empleado0" }).first();
  assert.match(await fila0.innerText(), /8 h 13 min \/ 8 h/);
  assert.match(await fila0.innerText(), /\+13 min/);
  // 1b) Entrada y salida sin segundos.
  assert.match(await fila0.innerText(), /\b08:07\b(?!:)/);
  assert.doesNotMatch(await fila0.innerText(), /08:07:00/);
  // 2) Nocturno: 7 h exactas y marca "+1 día"; el registro viejo también da 7 h (antes negativo).
  const noct = page.locator("tr", { hasText: "Nocturno" }).first();
  assert.match(await noct.innerText(), /7 h \/ 7 h/);
  assert.match(await noct.innerText(), /\+1 día/);
  const viejo = page.locator("tr", { hasText: "NocturnoViejo" }).first();
  assert.match(await viejo.innerText(), /7 h \/ 7 h/);

  // 2b) Columna "Editado": etiqueta con número de cambios y detalle antes → después.
  const filaEditada = page.locator("tr", { hasText: "Editado Prueba" }).first();
  await filaEditada.getByRole("button", { name: /Editado/ }).click();
  await page.getByText("Qué cambió").waitFor({ timeout: 10000 });
  const textoDetalle = await page.locator("[data-radix-popper-content-wrapper]").innerText();
  assert.match(textoDetalle, /Salida\s+13\/11 13:19\s*→\s*13\/11 17:20/);
  assert.match(textoDetalle, /Tipo de registro\s+Sin Checar\s*→\s*Asistencia/);
  assert.match(textoDetalle, /Quién y cuándo/);
  assert.match(await filaEditada.innerText(), /Editado\s*·\s*2/);
  assert.match(await page.locator("tr", { hasText: "Empleado0" }).first().innerText(), /\bNo\b/);
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/editado-detalle.png" });
  // Desde el detalle se abren las checadas del reloj: original tachada, corregida resaltada.
  await page.getByRole("button", { name: "Ver checadas del reloj de este día" }).click();
  await page.getByText("Historial de entradas y salidas").waitFor({ timeout: 10000 });
  await page.getByText("Qué cambió").waitFor({ state: "detached", timeout: 5000 }); // el detalle se cierra al abrir el historial
  const historial = page.getByRole("dialog", { name: /Historial de entradas y salidas/ });
  const salidaOriginal = historial.locator("td", { hasText: "13:19" }).first();
  await salidaOriginal.waitFor({ timeout: 10000 });
  assert.match(await salidaOriginal.getAttribute("class"), /line-through/);
  assert.match(await historial.locator("span", { hasText: "17:20" }).first().getAttribute("class"), /bg-amber-50/);
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/editado-checadas.png" });
  await page.keyboard.press("Escape");
  // Al abrir el historial, el detalle "Qué cambió" se cierra solo; con Escape no queda ninguna ventana.
  await page.waitForFunction(() => !document.querySelector("[role=dialog]"), null, { timeout: 10000 });

  // 3) Arranca en "Todos los registros": se ven los 25 con UNA sola descarga del periodo
  //    (sin la segunda descarga para las opciones de filtros).
  assert.equal(await page.locator("tr", { hasText: "Prueba" }).count(), 25, "debe mostrar todo el periodo");
  // Ninguna consulta de conteo (limit=1) ni de periodo aparte: la tabla ya trae todo.
  assert.ok(pedidosAsistencias.every((l) => l === 1000000), `consultas iniciales: ${pedidosAsistencias.join(", ")}`);
  // Con 10 por página se ven 10, y Exportar sigue sacando el periodo completo.
  await page.getByRole("button", { name: "Todos" }).click();
  await page.getByRole("menuitem", { name: "10 por página" }).click();
  await page.waitForFunction(() => document.querySelectorAll("tr").length < 20);
  const visibles = await page.locator("tr", { hasText: "Prueba" }).count();
  assert.ok(visibles <= 10, `la página muestra ${visibles} filas`);
  const [descarga] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.getByRole("button", { name: /Exportar Excel/ }).click(),
  ]);
  const archivo = await descarga.path();
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(archivo);
  const hoja = libro.worksheets[0];
  assert.equal(hoja.rowCount - 1, 25, "el Excel debe traer los 25 registros del periodo");
  assert.equal(hoja.getRow(1).values.includes("Código"), false, "el Excel no debe traer el NIP");
  const cabecera = hoja.getRow(1).values;
  const colJornada = cabecera.indexOf("Jornada");
  const colDif = cabecera.indexOf("Hrs +/-");
  assert.equal(hoja.getRow(2).getCell(colJornada).value, "8 h 13 min / 8 h");
  assert.equal(hoja.getRow(2).getCell(colDif).value, "+13 min");
  const colCambios = cabecera.indexOf("Cambios (antes → después)");
  const filaExcel = hoja.getRows(2, 25).find((row) => row.getCell(cabecera.indexOf("Nombre") > 0 ? cabecera.indexOf("Nombre") : 1).value === "Editado");
  assert.ok(colCambios > 0 && filaExcel, "columna de cambios y fila editada en Excel");
  assert.equal(filaExcel.getCell(colCambios).value, "Salida: 13/11 13:19 → 13/11 17:20; Tipo de registro: Sin Checar → Asistencia");
  await page.getByText("Se exportaron 25 registros del periodo.").waitFor({ timeout: 10000 });

  // 4) Editar el nocturno: salida 06:00 debe guardarse al día siguiente (2026-11-14).
  await noct.getByTitle("Editar").click();
  const filaEdicion = page.locator("tr", { has: page.locator('input[type="time"]') }).first();
  const horas = filaEdicion.locator('input[type="time"]');
  await horas.nth(1).fill("06:00");
  await filaEdicion.getByTitle("Guardar").click();
  for (let i = 0; i < 50 && !puts.length; i++) await dormir(100);
  assert.equal(puts.length, 1, "debe guardarse un cambio");
  assert.match(puts[0].salida, /^2026-11-14 06:00/, `salida enviada: ${puts[0].salida}`);
  assert.equal(Object.hasOwn(puts[0], "entrada"), false, "no debe reenviar la entrada si no cambió");

  // 4b) Calendario: lunes 16 (festivo en catálogo) guardado como domingo y no festivo.
  //     Al editar se corrige solo; Asistió/Goce siguen al tipo (sin botones sueltos).
  const filaCal = page.locator("tr", { hasText: "Calendario Prueba" }).first();
  await filaCal.getByTitle("Editar").click();
  const edicionCal = page.locator("tr", { has: page.locator('input[type="time"]') }).first();
  assert.ok(await edicionCal.locator('[title="Lo define el tipo de registro"]').count() >= 2, "Asistió y Goce fijos según el tipo");
  await edicionCal.getByTitle("Guardar").click();
  for (let i = 0; i < 50 && puts.length < 2; i++) await dormir(100);
  assert.equal(puts.length, 2, "debe guardarse la corrección de calendario");
  assert.equal(Number(puts[1].es_domingo), 0, `es_domingo enviado: ${puts[1].es_domingo}`);
  assert.equal(Number(puts[1].es_festivo), 1, `es_festivo enviado: ${puts[1].es_festivo}`);
  assert.equal(Object.hasOwn(puts[1], "asistencia"), false, "no se toca Asistió");

  // 5) Centro de incidencias: misma regla; horas extra en "h min", no en decimales.
  await page.goto(base + "/panel/incidencias", { waitUntil: "domcontentloaded" });
  const filaInc = page.locator("tr", { hasText: "Empleado0" }).first();
  await filaInc.waitFor({ timeout: 30000 });
  assert.match(await filaInc.innerText(), /13 min/);
  assert.doesNotMatch(await filaInc.innerText(), /0\.22 h/);
  const filaNoct = page.locator("tr", { hasText: "Nocturno" }).first();
  assert.match(await filaNoct.innerText(), /0 min/);

  assert.deepEqual(errores, [], "sin errores de JavaScript en la página");
  exito = true;
  console.log("OK · domingo/festivo corregidos al editar · Asistió fijo por tipo · Excel sin NIP · columna Editado con detalle y Excel · arranca con todos (sin descarga extra para filtros) · horas en minutos · nocturno +1 día · Exportar 25/25 · edición nocturna al día siguiente · incidencias en h/min");
  console.log("Consultas a /checador/asistencias (limit):", pedidosAsistencias.join(", "));
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
