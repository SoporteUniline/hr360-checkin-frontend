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
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", id_empleado: 7, empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

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
// Horas extra: por autorizar (18:42), autorizada (19:20) y no autorizada (reloj 18:15 → 17:00).
Object.assign(registros[5], { nombre: "Extra", salida: "2026-11-13 18:42:00" });
Object.assign(registros[6], { nombre: "Autorizada", salida: "2026-11-13 19:20:00", hrs_extra: 1, extras_autorizadas_por: 9,
  nombre_extra_autorizador: "Laura", apellido_paterno_extra_autorizador: "Gómez", forma_pago_extras: "Pago de horas extras", notas_hrs_extra: "Inventario" });
Object.assign(registros[7], { nombre: "NoAut", salida: "2026-11-13 17:00:00", correccion: 1, valores_originales: JSON.stringify({ salida: "2026-11-13 18:15:00" }),
  notas_hrs_extra: "No autorizadas por Laura Gómez · salida del reloj 2026-11-13 18:15" });
// Comida en el horario (13:00–14:00): uno sin salida a comer (un solo tramo) y uno con dos tramos.
const comidaHorario = { hora_salida_comida_programada: "13:00:00", hora_regreso_comida_programada: "14:00:00" };
Object.assign(registros[8], { nombre: "SinComida", ...comidaHorario,
  tramos_checadas: [{ entrada: "2026-11-13 08:07:00", salida: "2026-11-13 17:20:00" }], minutos_trabajados_checadas: 553, minutos_descanso_checadas: 0 });
Object.assign(registros[9], { nombre: "DosTramos", ...comidaHorario,
  tramos_checadas: [{ entrada: "2026-11-13 08:07:00", salida: "2026-11-13 13:00:00" }, { entrada: "2026-11-13 14:00:00", salida: "2026-11-13 17:20:00" }],
  minutos_trabajados_checadas: 493, minutos_descanso_checadas: 60 });
// Comida marcada con «Salir a comer»: columna propia «Comida».
Object.assign(registros[12], { nombre: "ComidaBoton",
  comida_checada: { salida: "2026-11-13 13:00:00", regreso: "2026-11-13 14:05:00", minutos: 65, minutos_programados: 60, excedente: 5 } });
Object.assign(registros[3], { nombre: "Editado", correccion: 1, valores_originales: JSON.stringify({ salida: "2026-11-13 13:19:00", id_tipo_permiso: 2 }) });

const puts = [];
const autorizacionMasivo = [];
const comidas = [];
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
    // ComidaBoton: dos tramos, el primero cerrado con «Salir a comer» → la ventana marca la comida.
    if (p.endsWith("/checador/reloj/asistencia-por-empleado") && url.searchParams.get("empleado") === String(registros[12].id_empleado)) {
      return json({ registros: [
        { id: 91, entrada: "2026-11-13 08:00:00", salida: "2026-11-13 13:00:00", estado: "Cerrado", tipo_cierre: "comida" },
        { id: 92, entrada: "2026-11-13 14:05:00", salida: "2026-11-13 17:00:00", estado: "Cerrado" },
      ] });
    }
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
    if (/\/checador\/asistencias\/\d+\/comida$/.test(p) && req.method() === "POST") {
      comidas.push({ cuerpo: JSON.parse(req.postData() || "{}"), token: req.headers().authorization || "", ruta: p });
      return json({ asistencia: {} });
    }
    if (/\/checador\/asistencias\/1003\/cambios$/.test(p)) {
      return json({ disponible: true, cambios: [{ campo: "salida", valor_antes: "2026-11-13 13:19:00", valor_despues: "2026-11-13 17:20:00",
        origen: "reloj", nombre_usuario: "Laura Gómez", tipo_usuario: "Recruiter", creado_en: "2026-11-18 19:45:12.000000" }] });
    }
    if (p.endsWith("/checador/bulk-incident/register")) {
      autorizacionMasivo.push(req.headers().authorization || "");
      return json({ message: "ok" });
    }
    if (p.includes("eventos-checada")) return route.abort();
    if (url.origin === base) return json({});
    return json({});
  });

  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Registros" }).click(); // (22/11/2026) Asistencias abre en «Hoy»
  await page.getByText("Empleado0", { exact: false }).first().waitFor({ timeout: 30000 });
  // (24/11/2026) Con «Hoy» la tabla se divide por situación; esta prueba revisa columnas y orden, así que va sin agrupar
  // (la división se verifica en verify-asistencias-hoy-grupos.mjs).
  await page.getByRole("combobox").filter({ has: page.locator("svg.lucide-layers") }).click();
  await page.getByRole("option", { name: "Sin agrupar", exact: true }).click();
  await page.locator("tr[data-grupo]").first().waitFor({ state: "detached", timeout: 10000 });

  // (24/11/2026) «El día se corrige en el reloj»: la tabla ya no tiene Tipo, Editado, Balance, Asistió/Goce, pagos ni
  // botones de horas extra; las horas se corrigen en el reloj de cada fila y los masivos son «Marcar como…» y «Cargar
  // horario normal…». Eso se verifica en verify-reloj-dia.mjs; aquí queda lo que sigue vigente de la Fase 1.
  // 1) Horas en minutos: sin tramos del reloj, 08:07–17:20 = 9 h 13 min (la comida no checada no se descuenta);
  //    programado 8 h (horario 9 h − 1 h de comida).
  const fila0 = page.locator("tr", { hasText: "Empleado0" }).first();
  assert.match(await fila0.innerText(), /9 h 13 min\s*de 8 h\b/);
  assert.match(await fila0.locator("td").first().getAttribute("class"), /sticky left-0/);
  // Horas en 12 h con a.m./p.m., sin segundos.
  assert.match(await fila0.innerText(), /\b8:07 a\.m\./);
  assert.doesNotMatch(await fila0.innerText(), /08:07:00/);
  // 2) Nocturno: 7 h exactas y marca "+1 día"; el registro viejo también da 7 h (antes negativo).
  const noct = page.locator("tr", { hasText: "Nocturno Prueba" }).first();
  assert.match(await noct.innerText(), /7 h\s*de 7 h\b/);
  assert.match(await noct.innerText(), /\+1 día/);
  const viejo = page.locator("tr", { hasText: "NocturnoViejo" }).first();
  assert.match(await viejo.innerText(), /7 h\s*de 7 h\b/);
  // Cada fila tiene su reloj; el nombre sigue siendo enlace a la ficha.
  assert.equal(await noct.getByRole("button", { name: "Abrir el reloj de Nocturno Prueba" }).count(), 1);
  assert.equal(await noct.locator("td").first().getByRole("link").count(), 1, "el nombre abre la ficha");
  assert.equal(await page.getByRole("button", { name: /Registrar asistencia masiva/ }).count(), 0, "sin registro masivo en Asistencias");

  // 2d) Ordenar por «Horas extra»: primero las por autorizar con más minutos (Extra: 2 h 35 min).
  await page.getByRole("button", { name: /^HORAS EXTRA/ }).click();
  await page.waitForFunction(() => /Extra Prueba/.test(document.querySelector("tbody tr:not([data-grupo])")?.innerText || ""), null, { timeout: 15000 });
  await page.getByRole("button", { name: /^HORAS EXTRA/ }).click(); // ascendente: las sin horas extra primero
  await page.waitForFunction(() => /Nocturno/.test(document.querySelector("tbody tr:not([data-grupo])")?.innerText || ""), null, { timeout: 15000 });
  await page.locator("th", { hasText: /^Fecha$/i }).first().click(); // regresa al orden por fecha

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
  const colDif = cabecera.indexOf("Balance del día");
  assert.equal(hoja.getRow(2).getCell(colJornada).value, "9 h 13 min / 8 h");
  assert.equal(hoja.getRow(2).getCell(colDif).value, "+1 h 13 min");
  const colSinComida = cabecera.indexOf("No marcó salida a comer");
  assert.ok(colSinComida > 0, "columna de la alerta de comida en el Excel");
  const colCambios = cabecera.indexOf("Cambios (antes → después)");
  const filaExcel = hoja.getRows(2, 25).find((row) => row.getCell(cabecera.indexOf("Nombre") > 0 ? cabecera.indexOf("Nombre") : 1).value === "Editado");
  assert.ok(colCambios > 0 && filaExcel, "columna de cambios y fila editada en Excel");
  assert.equal(filaExcel.getCell(colCambios).value, "Salida: 13/11 13:19 → 13/11 17:20; Tipo de registro: Sin Checar → Asistencia");
  await page.getByText("Se exportaron 25 registros del periodo.").waitFor({ timeout: 10000 });

  // 5) Centro de incidencias: misma regla; horas extra en "h min", no en decimales.
  await page.goto(base + "/panel/incidencias", { waitUntil: "domcontentloaded" });
  const filaInc = page.locator("tr", { hasText: "Empleado0" }).first();
  await filaInc.waitFor({ timeout: 30000 });
  // Misma regla que Asistencias: lo trabajado de más (08:07–17:20 sin checar comida = 9 h 13 min de 8 h) = 1 h 13 min.
  assert.match(await filaInc.innerText(), /1 h 13 min/);
  assert.doesNotMatch(await filaInc.innerText(), /0\.\d+ h/);
  // Autorizar desde Incidencias manda solo los campos de horas extra (sin correccion ni registro completo).
  puts.length = 0;
  await filaInc.locator("td").nth(1).getByRole("button").click();
  await page.getByRole("button", { name: "Autorizar horas extra" }).first().click();
  for (let i = 0; i < 50 && !puts.length; i++) await dormir(100);
  assert.deepEqual(puts[0], { hrs_extra: 1, forma_pago_extras: "Pago de horas extras", extras_autorizadas_por: 7 });
  const filaNoct = page.locator("tr", { hasText: "Nocturno Prueba" }).first();
  assert.match(await filaNoct.innerText(), /0 min/);

  assert.deepEqual(errores, [], "sin errores de JavaScript en la página");
  exito = true;
  console.log("OK · horas en minutos (de X programado) · 12 h sin segundos · nocturno +1 día · reloj por fila · sin registro masivo · orden por horas extra · Excel sin NIP con cambios · arranca con todos (sin descarga extra para filtros) · Exportar 25/25 · incidencias en h/min");
  console.log("Consultas a /checador/asistencias (limit):", pedidosAsistencias.join(", "));
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
