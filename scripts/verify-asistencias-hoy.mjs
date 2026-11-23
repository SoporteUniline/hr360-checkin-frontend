// Verificación en navegador de Asistencias → Hoy (23/11/2026, maqueta aprobada) con hora fija (11:12 CDMX) y backend
// simulado: tarjetas y conteos, filtro por tarjeta (aria-pressed), grupos en orden, «Salió antes» vs «Ya salió» con y
// sin permiso, plegado de «No laboran hoy», «Ver día» → ventana de edición, búsqueda/área, celular 390 px sin
// desborde y sin errores de JS. (Antes: scripts/verify-en-vivo.mjs, la vista de columnas que esta reemplaza.)
// Uso: npm run build && node scripts/verify-asistencias-hoy.mjs   (CAPTURAS=carpeta para guardar capturas)
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
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
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
  entrada_tramo_abierto: abierta ? t(abierta, f) : null, entrada: t(lista[0]?.[0] ?? abierta, f), salida: lista.length && !abierta ? t(lista.at(-1)[1], f) : null, asistencia: 1,
});
const permisoDiego = [{ id: 1, tipo_horas: "sale_antes", hora_inicio: "07:00", hora_fin: "08:00" }];
function datos({ conPermiso = true } = {}) {
  id = 0;
  return [
    reg("Alondra", "Munguía", "Ventas", "07:00", "14:00"), // faltó (mitad 10:30)
    reg("Armando", "González", "Contaduría", "09:00", "18:00"), // no ha llegado, hace 2 h 12 min
    reg("Cristian", "Cano", "Producción", "08:00", "17:00", { ...tramos([["08:00", "10:05"]]), comida_checada: { salida: t("10:05"), regreso: null, minutos: null, minutos_programados: 60 } }),
    reg("Frida", "Serrano", "Marketing", "09:00", "18:00", tramos([], "09:18")), // llegó tarde +18
    reg("Jesús", "Guzmán", "Development", "09:00", "18:00", tramos([], "08:56")),
    reg("Valeria", "Castillo", "Marketing", "09:00", "18:00", tramos([], "08:49")),
    reg("Diego", "León", "Administración", "00:00", "08:00", {
      ...tramos([["00:16", "00:30"], ["00:59", "07:23"]]), comida_checada: { salida: t("00:30"), regreso: t("00:59"), minutos: 29, minutos_programados: 30 },
      permisos_horas_dia: conPermiso ? permisoDiego : [],
    }),
    reg("Rosa", "Pérez", "Ventas", "07:00", "15:00", tramos([["07:00", "10:30"]])), // salió antes
    reg("Beto", "Ruiz", "Ventas", "12:00", "20:00"), // por entrar
    reg("Ana", "López", "Producción", "08:00", "17:00", { ...tramos([["08:00", "11:00"]]), comida_checada: { salida: t("11:00"), regreso: null, minutos: null, minutos_programados: 60 } }),
    reg("Gil", "Prueba", "Planta", null, null, { tipo_registro_nombre: "Día de Descanso" }),
    // Turno nocturno de ayer que sigue abierto (no checó salida): se muestra el de ayer, no el de hoy.
    reg("Nora", "Noche", "Planta", "22:00", "06:00", { fecha: ayer, ...tramos([], "22:05", ayer) }),
    { ...reg("Nora", "Noche", "Planta", "22:00", "06:00"), id_empleado: 12 },
  ];
}
let registros = datos();
let exito = false;
const errores = [];
const browser = await chromium.launch();

async function abrir(viewport) {
  const ctx = await browser.newContext({ viewport, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: viewport.width < 500 });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(AHORA);
  page.on("pageerror", (e) => errores.push(e.message));
  const pedidos = [];
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type" };
    const json = (data) => route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/asistencias")) { pedidos.push(url.search); return json({ registros, total: registros.length, page: 1, aplicarPaginacion: false }); }
    if (p.endsWith("/checador/cuenta-horas")) return json({ ok: true, data: { 2: 90 } });
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  const hoyVista = page.getByRole("region", { name: "Asistencia de hoy" });
  await hoyVista.getByRole("group", { name: "Resumen de hoy" }).waitFor({ timeout: 30000 });
  await hoyVista.locator("[data-estado]").first().waitFor({ timeout: 30000 });
  return { ctx, page, pedidos, hoyVista };
}
const limpio = async (loc) => (await loc.innerText()).replace(/\s+/g, " ").trim();
const cuentaDe = async (vista, titulo) => Number((await vista.getByRole("button", { name: new RegExp(`^${titulo}`) }).locator("span").nth(1).innerText()).trim());

try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  // ——— Escritorio 1440 ———
  const { ctx, page, pedidos, hoyVista } = await abrir({ width: 1440, height: 1060 });
  assert.equal(await page.getByRole("tab", { name: "Hoy" }).getAttribute("aria-selected"), "true", "abre en Hoy");
  assert.ok(pedidos.some((q) => q.includes(`fechaInicio=${ayer}`) && q.includes(`fechaFin=${hoy}`)), `pide ayer y hoy: ${pedidos.join(" | ")}`);
  assert.match(await limpio(page.locator("h1").first().locator("..")), /Asistencias .*· actualizado 11:12 a\.m\. · se refresca solo/);

  const esperado = { Trabajando: 4, "Llegaron tarde": 2, "No han llegado": 1, "En comida": 2, "Ya salieron": 1, "Salieron antes": 1, Faltaron: 1 };
  for (const [titulo, n] of Object.entries(esperado)) assert.equal(await cuentaDe(hoyVista, titulo), n, `tarjeta ${titulo}`);
  const resumen = await limpio(hoyVista.getByRole("group", { name: "Resumen de hoy" }));
  assert.match(resumen, /Trabajando 4 de 11 programados hoy/);
  assert.match(resumen, /Llegaron tarde 2 promedio \+17 min/);
  assert.match(resumen, /En comida 2 1 ya se pasó/);
  assert.match(resumen, /Ya salieron 1 1 con permiso/);

  // Grupos en orden; dentro de «Requieren atención»: Faltó, No ha llegado, Salió antes, comida pasada.
  const lista = hoyVista.getByRole("region", { name: "Empleados de hoy" });
  const encabezados = await lista.locator("h3").allInnerTexts();
  assert.deepEqual(encabezados.map((h) => h.replace(/\s+/g, " ").trim()), [
    "REQUIEREN ATENCIÓN · 4", "EN COMIDA · 1", "TRABAJANDO · 4", "PRÓXIMOS · 1", "YA SALIERON · 1", "NO LABORAN HOY · 1 Mostrar",
  ]);
  const atencion = await limpio(lista.getByRole("region", { name: /Requieren atención/ }));
  assert.match(atencion, /Alondra Munguía.*Faltó.*Sin checadas · pasó la mitad de su jornada.*Armando González.*No ha llegado.*Debía entrar hace 2 h 12 min.*Rosa Pérez.*Salió antes.*Salió 10:30 a\.m\. · faltaron 4 h 30 min.*Cristian Cano.*En comida · se pasó.*Salió a comer 10:05 a\.m\. · lleva 67 de 60 min/);
  assert.match(atencion, /Armando González.*debe 1 h 30 min/, "cuenta de horas (antes columna «Debe tiempo»)");
  const trabajando = await limpio(lista.getByRole("region", { name: /^Trabajando/ }));
  assert.match(trabajando, /Frida Serrano.*Llegó tarde.*Entró 9:18 a\.m\. · \+18 min/);
  assert.match(trabajando, /Jesús Guzmán.*Trabajando.*Entró 8:56 a\.m\. · a tiempo.*2 h 16 de 8 h/);
  assert.match(trabajando, /Nora Noche.*Entró 10:05 p\.m\..*debía salir hace 5 h 12 min/, "turno nocturno de ayer abierto");
  const salieron = await limpio(lista.getByRole("region", { name: /^Ya salieron/ }));
  assert.match(salieron, /Diego León.*Salió con permiso.*12:16 a\.m\. → 7:23 a\.m\. · comida 12:30 a\.m\.–12:59 a\.m\. · con permiso \(sale antes\).*6 h 38 de 8 h · −1 h 22/);
  // «No laboran hoy» plegado; se abre con su botón.
  assert.equal(await lista.getByText("Gil Prueba").count(), 0, "No laboran hoy empieza plegado");
  const plegar = lista.getByRole("button", { name: /NO LABORAN HOY/ });
  assert.equal(await plegar.getAttribute("aria-expanded"), "false");
  await plegar.click();
  await lista.getByText("Gil Prueba").waitFor();
  assert.match(await limpio(lista.getByRole("region", { name: /No laboran hoy/ })), /Gil Prueba.*Día de Descanso/);
  if (process.env.CAPTURAS) await page.screenshot({ path: `${process.env.CAPTURAS}/hoy-escritorio-1440.png`, fullPage: true });
  await plegar.click();

  // Filtro por tarjeta: «Llegaron tarde» → Frida (trabajando) y Diego (entró 12:16 a.m., ya salió); otra vez → todos.
  const tarde = hoyVista.getByRole("button", { name: /^Llegaron tarde/ });
  await tarde.click();
  assert.equal(await tarde.getAttribute("aria-pressed"), "true");
  assert.deepEqual(await lista.locator("[data-estado] [data-nombre]").allInnerTexts(), ["Frida Serrano", "Diego León"]);
  assert.match(await limpio(hoyVista), /Mostrando: Llegaron tarde/);
  if (process.env.CAPTURAS) await page.screenshot({ path: `${process.env.CAPTURAS}/hoy-escritorio-filtro-tarde.png` });
  await tarde.click();
  assert.equal(await tarde.getAttribute("aria-pressed"), "false");
  assert.match(await limpio(hoyVista), /Mostrando: Todos · lo urgente primero/);
  // «Salieron antes» → Rosa.
  await hoyVista.getByRole("button", { name: /^Salieron antes/ }).click();
  assert.deepEqual(await lista.locator("[data-estado] [data-nombre]").allInnerTexts(), ["Rosa Pérez"]);
  await hoyVista.getByRole("button", { name: /^Salieron antes/ }).click();

  // Búsqueda y área (en pantalla).
  await hoyVista.getByLabel("Buscar empleado").fill("gonza");
  assert.deepEqual(await lista.locator("[data-estado] [data-nombre]").allInnerTexts(), ["Armando González"]);
  await hoyVista.getByLabel("Buscar empleado").fill("");
  await hoyVista.getByLabel("Área").selectOption("Marketing");
  assert.deepEqual((await lista.locator("[data-estado] [data-nombre]").allInnerTexts()).sort(), ["Frida Serrano", "Valeria Castillo"]);
  assert.equal(await cuentaDe(hoyVista, "Trabajando"), 2, "las tarjetas cuentan con el filtro de área");
  await hoyVista.getByLabel("Área").selectOption("");

  // «Ver día»: la ventana de edición de ese día, sin salir de Hoy.
  await lista.getByRole("button", { name: "Ver día de Armando González" }).click();
  await page.getByRole("dialog", { name: /Armando González/ }).getByLabel("Entrada").waitFor({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });

  // «Salió antes» vs «Ya salió»: el mismo Diego sin permiso «sale antes» pasa a Requieren atención.
  registros = datos({ conPermiso: false });
  await page.reload({ waitUntil: "domcontentloaded" });
  await hoyVista.locator("[data-estado]").first().waitFor({ timeout: 30000 });
  assert.equal(await cuentaDe(hoyVista, "Salieron antes"), 2);
  assert.equal(await cuentaDe(hoyVista, "Ya salieron"), 0);
  assert.match(await limpio(lista.getByRole("region", { name: /Requieren atención/ })), /Diego León.*Salió antes.*Salió 7:23 a\.m\. · faltaron 37 min/);
  registros = datos();

  // Al pasar a «Registros» el rango regresa a «Hoy».
  await page.getByRole("tab", { name: "Registros" }).click();
  await page.getByRole("button", { name: /^Hoy/ }).first().waitFor();
  await ctx.close();

  // ——— Celular 390 ———
  const movil = await abrir({ width: 390, height: 844 });
  const m = movil.page;
  const vistaM = movil.hoyVista;
  assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= 391), "sin desborde horizontal de la página");
  const tabs = await m.getByRole("tab").all();
  assert.equal(tabs.length, 3, "Hoy / Registros / Horas de ley");
  for (const tab of tabs) assert.ok((await tab.boundingBox()).height >= 44, "pestaña ≥ 44 px");
  // Tarjetas: fila con desplazamiento horizontal; lo urgente primero.
  const grupoTarjetas = vistaM.getByRole("group", { name: "Resumen de hoy" });
  const desborda = await grupoTarjetas.evaluate((el) => ({ scroll: el.scrollWidth > el.clientWidth, overflow: getComputedStyle(el).overflowX }));
  assert.ok(desborda.scroll && desborda.overflow === "auto", `tarjetas se desplazan: ${JSON.stringify(desborda)}`);
  const ordenTarjetas = await grupoTarjetas.locator("button").evaluateAll((bs) => bs.map((b) => ({ t: b.querySelector("span").textContent, x: b.getBoundingClientRect().x })).sort((a, b) => a.x - b.x).map((b) => b.t));
  assert.deepEqual(ordenTarjetas.slice(0, 4), ["Trabajando", "No han llegado", "Llegaron tarde", "En comida"]);
  for (const b of await grupoTarjetas.locator("button").all()) assert.ok((await b.boundingBox()).height >= 44, "tarjeta ≥ 44 px");
  // Renglones como tarjetas: toda la tarjeta abre el día (≥ 44 px), con horario junto al área.
  const fila = vistaM.locator("[data-estado]").first();
  assert.match(await limpio(fila), /Alondra Munguía Ventas · 7:00 a\.m\. – 2:00 p\.m\. Faltó Sin checadas · pasó la mitad de su jornada/);
  const verDia = fila.getByRole("button", { name: "Ver día de Alondra Munguía" });
  const caja = await verDia.boundingBox();
  const cajaFila = await fila.boundingBox();
  assert.ok(caja.height >= 44 && Math.abs(caja.width - cajaFila.width) <= 2, `la tarjeta completa (sin el borde) es el botón «Ver día» ${JSON.stringify([caja, cajaFila])}`);
  if (process.env.CAPTURAS) await m.screenshot({ path: `${process.env.CAPTURAS}/hoy-telefono-390.png` });
  await m.getByRole("button", { name: /^En comida/ }).tap();
  assert.equal(await m.getByRole("button", { name: /^En comida/ }).getAttribute("aria-pressed"), "true");
  assert.deepEqual((await vistaM.locator("[data-estado] [data-nombre]").allInnerTexts()).sort(), ["Ana López", "Cristian Cano"]);
  if (process.env.CAPTURAS) await m.screenshot({ path: `${process.env.CAPTURAS}/hoy-telefono-390-en-comida.png` });
  await m.getByRole("button", { name: /^En comida/ }).tap();
  await verDia.tap();
  await m.getByRole("dialog", { name: /Alondra Munguía/ }).waitFor({ timeout: 15000 });
  await m.keyboard.press("Escape");
  assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= 391), "sin desborde tras abrir/cerrar");
  // Registros en celular: la vista móvil de siempre, con las pestañas arriba.
  await m.getByRole("tab", { name: "Registros" }).tap();
  await m.getByRole("heading", { name: "Asistencia", exact: true }).waitFor({ timeout: 15000 });
  assert.equal(await m.getByRole("tab", { name: "Registros" }).getAttribute("aria-selected"), "true");
  assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= 391), "Registros sin desborde");
  await m.getByRole("tab", { name: "Hoy" }).tap();
  await vistaM.locator("[data-estado]").first().waitFor({ timeout: 15000 });
  await movil.ctx.close();

  // Captura del teléfono a lo largo (toda la lista).
  if (process.env.CAPTURAS) {
    const largo = await abrir({ width: 390, height: 1700 });
    await largo.page.screenshot({ path: `${process.env.CAPTURAS}/hoy-telefono-390-completo.png` });
    await largo.ctx.close();
  }

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK Hoy: ayer y hoy, 7 tarjetas y conteos, filtro por tarjeta (aria-pressed), grupos en orden, faltó / no ha llegado / salió antes / comida pasada, trabajando y llegó tarde, turno nocturno, salió con permiso vs salió antes, no laboran plegado, búsqueda y área, Ver día → ventana, regreso a Registros, celular 390 (tarjetas desplazables, renglones-tarjeta ≥ 44 px, sin desborde), sin errores de JS");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
