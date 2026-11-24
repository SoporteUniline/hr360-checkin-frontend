// Verificación en navegador del Monitor con hora fija (11:12 CDMX) y backend simulado: /panel lleva al Monitor, menú
// («Monitor» arriba en Control de tiempo), tarjetas y pies, grupos en orden con la razón en texto, filtro por tarjeta,
// «ver todos», búsqueda/área, clic en la fila → reloj del día, botón «Reloj checador» (escritorio y celular, 44 px)
// hacia el reloj de la empresa, Asistencias abre en Registros › Tabla sin «Hoy / En vivo» y el enlace viejo
// ?vista=envivo lleva al Monitor; sin desborde a 1440 ni a 390 px y sin errores de JS.
// Uso: npm run build && node scripts/verify-monitor.mjs   (CAPTURAS=carpeta para guardar capturas)
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

function token() {
  // Sin id_empresa: el layout de RH no consulta la base de datos (ver panel/layout.jsx).
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}

const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = {
  id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa],
  zona_horaria: "America/Mexico_City",
};
const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const ayer = new Date(Date.parse(`${hoy}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
// Hora fija del navegador: hoy a las 11:12 en Ciudad de México (17:12 UTC, sin horario de verano).
const AHORA = new Date(`${hoy}T17:12:00Z`);
const t = (h, f = hoy) => `${f} ${h}:00`;
let id = 0;
const reg = (nombre, apellido, area, entra, sale, extra = {}) => ({
  id: ++id, id_empleado: id, nombre, apellido_paterno: apellido, departamento: area, fecha: hoy, zona_horaria: "America/Mexico_City",
  hora_entrada_programada: entra && `${entra}:00`, hora_salida_programada: sale && `${sale}:00`, tolerancia_entrada_min: 10, tolerancia_salida_min: 0,
  // Jornadas de 9 h con 1 h de comida (no se paga): 8 h programadas.
  hrs_comida: [entra, sale].join() === "09:00,18:00" || [entra, sale].join() === "08:00,17:00" ? 1 : 0,
  entrada: null, salida: null, tipo_registro_nombre: "Sin checar", asistencia: 0, ...extra,
});
const tramos = (lista, abierta = null, f = hoy) => ({
  tramos_checadas: lista.map(([e, s]) => ({ entrada: t(e, f), salida: t(s, f) })), tramos_abiertos: abierta ? 1 : 0,
  entrada_tramo_abierto: abierta ? t(abierta, f) : null, entrada: t(lista[0]?.[0] ?? abierta, f),
  salida: lista.length && !abierta ? t(lista.at(-1)[1], f) : null, asistencia: 1,
});
const enComida = (salida) => ({ salida: t(salida), regreso: null, minutos: null, minutos_programados: 60 });
const RELLENO = ["Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete"];
function datos() {
  id = 0;
  return [
    reg("Alondra", "Munguía", "Ventas", "07:00", "14:00"), // faltó (mitad 10:30)
    reg("Armando", "González", "Contaduría", "09:00", "18:00"), // no ha llegado, hace 2 h 12 min
    reg("Cristian", "Cano", "Producción", "08:00", "17:00", { ...tramos([["08:00", "10:05"]]), comida_checada: enComida("10:05") }),
    reg("Frida", "Serrano", "Marketing", "09:00", "18:00", tramos([], "09:18")), // llegó tarde +18
    reg("Jesús", "Guzmán", "Development", "09:00", "18:00", tramos([], "08:56")),
    reg("Valeria", "Castillo", "Marketing", "09:00", "18:00", tramos([], "08:49")),
    reg("Diego", "León", "Administración", "00:00", "08:00", {
      ...tramos([["00:16", "00:30"], ["00:59", "07:23"]]), comida_checada: { salida: t("00:30"), regreso: t("00:59"), minutos: 29, minutos_programados: 30 },
      permisos_horas_dia: [{ id: 1, tipo_horas: "sale_antes", hora_inicio: "07:00", hora_fin: "08:00" }],
    }),
    reg("Rosa", "Pérez", "Ventas", "07:00", "15:00", tramos([["07:00", "10:30"]])), // salió antes
    reg("Beto", "Ruiz", "Ventas", "12:00", "20:00"), // por entrar
    reg("Ana", "López", "Producción", "08:00", "17:00", { ...tramos([["08:00", "11:00"]]), comida_checada: enComida("11:00") }),
    reg("Gil", "Prueba", "Planta", null, null, { tipo_registro_nombre: "Día de Descanso" }),
    // Turno nocturno de ayer que sigue abierto (no checó salida): se muestra el de ayer, no el de hoy.
    reg("Nora", "Noche", "Planta", "22:00", "06:00", { fecha: ayer, ...tramos([], "22:05", ayer) }),
    { ...reg("Nora", "Noche", "Planta", "22:00", "06:00"), id_empleado: 12 },
    reg("Mario", "Gómez", "Almacén", "08:00", "17:00", {
      ...tramos([], "07:51"), horas_extra_autorizadas_dia: { hasta: "20:00", minutos: 180, motivo: "inventario" },
    }),
    reg("Lucía", "Torres", "Oficina", "09:00", "18:00", { tipo_registro_nombre: "Vacaciones" }),
    reg("Bruno", "Ríos", "Reparto", "08:00", "17:00", {
      ...tramos([["07:58", "10:00"]]),
      permisos_horas_dia: [{ id: 2, tipo_horas: "sale_regresa", hora_inicio: "10:00", hora_fin: "12:00", motivo: "cita médica" }],
    }),
    ...RELLENO.map((n) => reg("Paco", n, "Planta", "08:00", "17:00", tramos([], "07:55"))),
  ];
}
const registros = datos();
let exito = false;
const errores = [];
const browser = await chromium.launch();
const capturas = process.env.CAPTURAS;

async function contexto(viewport) {
  const ctx = await browser.newContext({ viewport, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: viewport.width < 500 });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(AHORA);
  page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.pathname === "/api/empresas/check-status") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ hasActivePlan: true, slug: "empresa-prueba" }) });
    }
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = {
      "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
    };
    const json = (data) => route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/asistencias")) return json({ registros, total: registros.length, page: 1, aplicarPaginacion: false });
    if (p.endsWith("/checador/cuenta-horas")) return json({ ok: true, data: { 2: 90 } });
    // Reloj del día (la misma ventana que en Asistencias): sin checadas, ofrece cargar el horario.
    if (/\/checador\/asistencias\/\d+\/reloj$/.test(p)) {
      return json({ ok: true, migracion: true, horario: { entrada: "09:00", salida: "16:00", salida_comida: null, regreso_comida: null },
        dia: { tipo: "normal", nombre: "Día normal", pago: "" }, registros: [], motivos: { permisos: [], correccion: [{ clave: "olvido", nombre: "Olvidó checar" }] },
        autorizadores: [] });
    }
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
  return { ctx, page };
}
async function abrirMonitor(page, ruta = "/panel") {
  await page.goto(base + ruta, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/panel\/monitor$/, { timeout: 30000 });
  const vista = page.getByRole("region", { name: "Asistencia de hoy" });
  await vista.locator("[data-estado]").first().waitFor({ timeout: 30000 });
  return vista;
}
const limpio = async (loc) => (await loc.innerText()).replace(/\s+/g, " ").trim();
const tarjeta = (vista, titulo) => vista.getByRole("group", { name: "Resumen de hoy" }).getByRole("button", { name: new RegExp(`^${titulo}`) });
const cuentaDe = async (vista, titulo) => Number((await tarjeta(vista, titulo).locator("span").nth(1).innerText()).trim());
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }

  // ——— Escritorio 1440 ———
  const { ctx, page } = await contexto({ width: 1440, height: 1100 });
  const vista = await abrirMonitor(page);
  assert.match(await limpio(page.locator("h1").first().locator("..")), /^Monitor .* · 11:12 a\.m\. · se actualiza solo$/);
  assert.equal(await page.getByRole("link", { name: /Ver historial en Asistencias/ }).getAttribute("href"), "/panel/registro-asistencia");

  // Menú: «Monitor» arriba de «Asistencias» en Control de tiempo; el dashboard se llama «Resumen».
  const menu = await page.locator('[data-sidebar="menu-button"]').allInnerTexts();
  const enMenu = menu.map((x) => x.trim());
  assert.ok(enMenu.indexOf("Monitor") >= 0 && enMenu.indexOf("Monitor") < enMenu.indexOf("Asistencias"), `menú: ${enMenu.join(" | ")}`);
  assert.ok(enMenu.includes("Resumen") && !enMenu.includes("Inicio"), "el dashboard es «Resumen»");

  const esperado = { "En jornada": 14, "Llegaron tarde": 2, "No han llegado": 2, "Con permiso": 3, "En comida": 2, "Saldrán tarde": 1, "Por entrar": 1 };
  for (const [titulo, n] of Object.entries(esperado)) assert.equal(await cuentaDe(vista, titulo), n, `tarjeta ${titulo}`);
  const resumen = await limpio(vista.getByRole("group", { name: "Resumen de hoy" }));
  for (const re of [/En jornada 14 de 20 programados/, /Llegaron tarde 2 promedio \+17 min/, /No han llegado 2 1 ya a media jornada/,
    /Con permiso 3 2 por horas · 1 todo el día/, /En comida 2 1 excedida/, /Saldrán tarde 1 3 h extra autorizadas/,
    /Por entrar 1 la próxima a las 12:00 p\.m\./]) {
    assert.match(resumen, re);
  }

  // Grupos en orden, cada fila con la razón en texto.
  const lista = vista.getByRole("region", { name: "Empleados de hoy" });
  const encabezados = (await lista.locator("h3").allInnerTexts()).map((h) => h.replace(/\s+/g, " ").trim());
  assert.deepEqual(encabezados, [
    "REQUIERE ATENCIÓN · 5", "CON PERMISO · 3", "SALDRÁN TARDE · 1", "EN COMIDA · 1", "EN JORNADA · 10 ver todos", "POR ENTRAR · 1",
    "NO LABORAN HOY · 1 Mostrar",
  ]);
  const razones = async (grupo) => lista.getByRole("region", { name: grupo }).locator("[data-estado]").evaluateAll((filas) => filas.map((f) =>
    `${f.querySelector("[data-nombre]").textContent.trim()}: ${f.querySelector("[data-razon]").textContent.trim()}`));
  assert.deepEqual(await razones(/^Requiere atención/), [
    "Alondra Munguía: Faltó · sin checadas a media jornada",
    "Armando González: No ha llegado · debía entrar hace 2 h 12 min",
    "Rosa Pérez: Salió antes · 10:30 a.m. · faltaron 4 h 30 min",
    "Cristian Cano: En comida 67 de 60 min",
    "Frida Serrano: Llegó 18 min tarde",
  ]);
  assert.deepEqual(await razones(/^Con permiso/), [
    "Bruno Ríos: Permiso 10:00 a.m.–12:00 p.m. · cita médica · salió 10:00 a.m.",
    "Diego León: Permiso para salir a las 7:00 a.m. · salió 7:23 a.m.",
    "Lucía Torres: Vacaciones",
  ]);
  assert.deepEqual(await razones(/^Saldrán tarde/), ["Mario Gómez: Saldrá 8:00 p.m. · 3 h extra · inventario"]);
  assert.deepEqual(await razones(/^En comida/), ["Ana López: En comida 12 de 60 min"]);
  assert.match(await limpio(lista.getByRole("region", { name: /^Requiere atención/ })), /Armando González.*debe 1 h 30 min/, "cuenta de horas");
  // «En jornada»: 8 a la vista y «ver todos» muestra los 10; el turno nocturno de ayer sigue en jornada.
  const jornada = lista.getByRole("region", { name: /^En jornada/ });
  assert.equal(await jornada.locator("[data-estado]").count(), 8);
  assert.match((await razones(/^En jornada/))[0], /^Nora Noche: A tiempo · debía salir hace 5 h 12 min$/);
  await jornada.getByRole("button", { name: "ver todos" }).click();
  assert.equal(await jornada.locator("[data-estado]").count(), 10);
  await jornada.getByRole("button", { name: "ver menos" }).click();
  // «No laboran hoy» plegado.
  assert.equal(await lista.getByText("Gil Prueba").count(), 0);
  await lista.getByRole("button", { name: "Mostrar" }).click();
  assert.deepEqual(await razones(/^No laboran hoy/), ["Gil Prueba: Día de Descanso"]);
  assert.ok(await sinDesborde(page), "Monitor 1440 sin desborde");
  if (capturas) await page.screenshot({ path: `${capturas}/monitor-1440.png`, fullPage: true });
  await lista.getByRole("button", { name: "Ocultar" }).click();

  // Tarjeta = filtro: «Con permiso» → solo esas personas; otra vez → todos.
  await tarjeta(vista, "Con permiso").click();
  assert.equal(await tarjeta(vista, "Con permiso").getAttribute("aria-pressed"), "true");
  assert.deepEqual(await lista.locator("[data-estado] [data-nombre]").allInnerTexts(), ["Bruno Ríos", "Diego León", "Lucía Torres"]);
  await tarjeta(vista, "Con permiso").click();
  assert.match(await limpio(vista), /Mostrando: Todos · lo urgente primero/);
  // Búsqueda y área (en pantalla).
  await vista.getByLabel("Buscar empleado").fill("gonza");
  assert.deepEqual(await lista.locator("[data-estado] [data-nombre]").allInnerTexts(), ["Armando González"]);
  await vista.getByLabel("Buscar empleado").fill("");
  await vista.getByLabel("Área").selectOption("Marketing");
  assert.equal(await cuentaDe(vista, "En jornada"), 2, "las tarjetas cuentan con el filtro de área");
  await vista.getByLabel("Área").selectOption("");

  // Clic en la fila: el reloj del día (la misma ventana de Asistencias), sin salir del Monitor.
  await lista.getByRole("button", { name: "Ver día de Armando González" }).click();
  await page.getByRole("dialog", { name: /Armando González/ }).getByRole("button", { name: "Cargar su horario normal" }).waitFor({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
  assert.match(page.url(), /\/panel\/monitor$/);

  // Botón «Reloj checador» en la barra superior → reloj de la empresa (/seleccionar-reloj → /<slug> con una empresa).
  const reloj = page.locator("header").getByRole("link", { name: "Reloj checador" });
  assert.equal(await reloj.getAttribute("href"), "/seleccionar-reloj");
  assert.match(await limpio(reloj), /^Reloj checador$/);
  assert.ok(await page.locator("header").getByRole("button", { name: "Adamia AI" }).count() <= 1);

  // Asistencias: abre en Registros › Tabla, sin «Hoy / En vivo».
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Registros" }).waitFor({ timeout: 30000 });
  assert.deepEqual((await page.getByRole("tab").allInnerTexts()).map((x) => x.trim()), ["Registros", "Horas de ley"]);
  assert.equal(await page.getByRole("tab", { name: "Registros" }).getAttribute("aria-selected"), "true");
  assert.equal(await page.getByRole("group", { name: "Formato de registros" }).getByRole("button", { name: "Tabla" }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.getByText(/En vivo/).count(), 0, "sin «En vivo»");
  await page.getByRole("button", { name: /^Hoy/ }).first().waitFor();
  await page.getByRole("table").getByText("Armando González").first().waitFor({ timeout: 30000 });
  assert.ok(await sinDesborde(page), "Asistencias 1440 sin desborde");
  if (capturas) await page.screenshot({ path: `${capturas}/asistencias-1440.png` });
  await page.getByRole("button", { name: "Matriz" }).click();
  await page.getByRole("button", { name: "Matriz" }).and(page.locator('[aria-pressed="true"]')).waitFor();
  await page.getByText("Vista matriz").waitFor({ timeout: 30000 });
  await dormir(300); // termina la transición de color del botón elegido
  if (capturas) await page.screenshot({ path: `${capturas}/asistencias-matriz-1440.png` });
  // Enlace viejo a «En vivo» → Monitor.
  await abrirMonitor(page, "/panel/registro-asistencia?vista=envivo");

  await reloj.click();
  await page.waitForURL(/\/empresa-prueba$/, { timeout: 30000 });
  await ctx.close();

  // ——— Celular 390 ———
  const movil = await contexto({ width: 390, height: 844 });
  const m = movil.page;
  const vistaM = await abrirMonitor(m);
  assert.ok(await sinDesborde(m), "Monitor 390 sin desborde");
  assert.match(await limpio(m.locator("h1").first().locator("..")), /^Monitor .* · 11:12 a\.m\. · se actualiza solo$/);
  const relojM = m.locator("header").getByRole("link", { name: "Reloj checador" });
  const cajaReloj = await relojM.boundingBox();
  assert.ok(cajaReloj.width >= 44 && cajaReloj.height >= 44, `botón del reloj ≥ 44 px: ${JSON.stringify(cajaReloj)}`);
  assert.equal((await relojM.innerText()).trim(), "", "en celular solo el ícono");
  const grupoTarjetas = vistaM.getByRole("group", { name: "Resumen de hoy" });
  const desborda = await grupoTarjetas.evaluate((el) => ({ scroll: el.scrollWidth > el.clientWidth, overflow: getComputedStyle(el).overflowX }));
  assert.ok(desborda.scroll && desborda.overflow === "auto", `tarjetas se desplazan: ${JSON.stringify(desborda)}`);
  const ordenTarjetas = await grupoTarjetas.locator("button").evaluateAll((bs) => bs
    .map((b) => ({ t: b.querySelector("span").textContent, x: b.getBoundingClientRect().x }))
    .sort((a, b) => a.x - b.x).map((b) => b.t));
  assert.deepEqual(ordenTarjetas.slice(0, 4), ["Llegaron tarde", "No han llegado", "Con permiso", "Saldrán tarde"]);
  for (const b of await grupoTarjetas.locator("button").all()) assert.ok((await b.boundingBox()).height >= 44, "tarjeta ≥ 44 px");
  const fila = vistaM.locator("[data-estado]").first();
  assert.match(await limpio(fila), /^AM Alondra Munguía Ventas · 7:00 a\.m\.–2:00 p\.m\. Faltó · sin checadas a media jornada$/);
  const verDia = fila.getByRole("button", { name: "Ver día de Alondra Munguía" });
  const caja = await verDia.boundingBox();
  const cajaFila = await fila.boundingBox();
  assert.ok(caja.height >= 44 && Math.abs(caja.width - cajaFila.width) <= 2, `toda la tarjeta abre el día ${JSON.stringify([caja, cajaFila])}`);
  if (capturas) await m.screenshot({ path: `${capturas}/monitor-390.png` });
  await verDia.tap();
  await m.getByRole("dialog", { name: /Alondra Munguía/ }).waitFor({ timeout: 15000 });
  await m.keyboard.press("Escape");
  await m.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
  assert.ok(await sinDesborde(m), "sin desborde tras abrir/cerrar el día");

  // Asistencias en celular: Registros › Lista | Matriz y los filtros de siempre.
  await m.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await m.getByRole("heading", { name: "Asistencia", exact: true }).waitFor({ timeout: 30000 });
  assert.deepEqual((await m.getByRole("tab").allInnerTexts()).map((x) => x.trim()), ["Registros", "Horas de ley"]);
  const formato = m.getByRole("group", { name: "Formato de registros" });
  assert.equal(await formato.getByRole("button", { name: "Tabla" }).getAttribute("aria-pressed"), "true");
  for (const b of await formato.getByRole("button").all()) assert.ok((await b.boundingBox()).height >= 44, "Tabla | Matriz ≥ 44 px");
  assert.ok(await sinDesborde(m), "Asistencias 390 sin desborde");
  if (capturas) await m.screenshot({ path: `${capturas}/asistencias-390.png` });
  await formato.getByRole("button", { name: "Matriz" }).tap();
  await m.getByRole("button", { name: /^Periodo: Hoy/ }).waitFor({ timeout: 15000 });
  assert.ok(await sinDesborde(m), "Matriz 390 sin desborde de la página");
  if (capturas) await m.screenshot({ path: `${capturas}/asistencias-matriz-390.png` });
  await movil.ctx.close();

  if (capturas) {
    const largo = await contexto({ width: 390, height: 1900 });
    await abrirMonitor(largo.page);
    await largo.page.screenshot({ path: `${capturas}/monitor-390-completo.png`, fullPage: true });
    await largo.ctx.close();
  }

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK Monitor: /panel → Monitor, menú, 7 tarjetas con pies, grupos y razones, ver todos, no laboran plegado, filtro por tarjeta, "
    + "búsqueda y área, fila → reloj del día, Reloj checador (escritorio y celular 44 px) → reloj de la empresa, Asistencias en Registros › Tabla "
    + "sin «En vivo», ?vista=envivo → Monitor, celular Tabla | Matriz, sin desborde a 1440 y 390, sin errores de JS");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
