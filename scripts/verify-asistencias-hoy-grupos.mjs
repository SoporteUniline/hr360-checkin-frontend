// Verificación en navegador real (Chromium + Next compilado) de Asistencias › Tabla con el periodo «Hoy» dividida por
// la situación del momento (lib/asistencia/situacionHoy.mjs, la misma clasificación del Monitor):
// encabezados «Requieren atención · N» … «No laboran hoy · N» en orden y cada persona en su grupo; «Agrupar» muestra
// «Situación de hoy» por defecto; «Sin agrupar» los quita; con otro periodo no aparecen y al volver a Hoy regresan;
// Estado / Motivo y el reloj siguen funcionando dentro de un grupo; 1440 y 390 px sin desbordes; sin errores de JS.
// La hora del navegador se fija (page.clock) en el lunes 23/11/2026 a las 2:10 p.m. de CDMX.
// Backend simulado con page.route; ninguna petición sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-asistencias-hoy-grupos.mjs
// CAPTURAS=<carpeta> guarda capturas a 1440 (agrupada, sin agrupar, otro periodo) y 390.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { elegir } from "./lib/desplegable.mjs";

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
const capturas = process.env.CAPTURAS;

function token() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Méndez", id_empleado: 7, empresas: [10],
  empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

const F = "2026-11-23";
const AHORA = new Date(`${F}T20:10:00Z`); // 2:10 p.m. en CDMX
const NORMAL = { tipo: "normal", nombre: "Día normal", pago: "" };
const fila = (id, nombre, apellido, depto, o = {}) => ({
  id, id_empleado: id, id_empresa: 10, nombre, apellido_paterno: apellido, departamento: depto, fecha: F, zona_horaria: "America/Mexico_City",
  hora_entrada_programada: "09:00:00", hora_salida_programada: "16:00:00", hora_salida_comida_programada: "13:00:00",
  hora_regreso_comida_programada: "14:00:00", tolerancia_entrada_min: 10, tipo_registro_nombre: "Asistencia", id_tipo_permiso: 1, asistencia: 1, goce_sueldo: 1,
  entrada: null, salida: null, dia: NORMAL, checadas_vivas: 0, minutos_trabajados: null, minutos_comida: null, minutos_extra: 0,
  minutos_extra_por_autorizar: 0, motivos_resumen: "", estadoAsistencia: "Presente", ...o,
});
const falta = { id_tipo_permiso: 2, tipo_registro_nombre: "Falta injustificada", asistencia: 0, estadoAsistencia: "Ausente",
  estado_calculado: { clave: "falta", texto: "Falta injustificada", atencion: true } };
// Orden en que llegan del servidor (la tabla lo conserva dentro de cada grupo).
const filas = () => [
  fila(510, "Sofía", "Ramos", "Tienda", { id_tipo_permiso: 5, tipo_registro_nombre: "Día de descanso", asistencia: 0,
    estado_calculado: { clave: "descanso", texto: "Día de descanso", atencion: false } }),
  fila(501, "Alondra", "Munguía", "Ventas", { entrada: `${F} 09:18:00`, checadas_vivas: 1, estado_calculado: { clave: "sinsalida", texto: "Sin salida", atencion: true } }),
  fila(502, "Armando", "González", "Contaduría", falta),
  fila(507, "Diego", "León", "Administración", { entrada: `${F} 08:55:00`, checadas_vivas: 1, estado_calculado: { clave: "sinsalida", texto: "Sin salida", atencion: true } }),
  fila(511, "Carla", "Vega", "Ventas", { entrada: `${F} 09:00:00`, salida: `${F} 13:30:00`, checadas_vivas: 2, minutos_trabajados: 270,
    comida_checada: { salida: `${F} 13:30:00`, regreso: null, minutos_programados: 60 }, estado_calculado: { clave: "ok", texto: "Asistió", atencion: false } }),
  fila(503, "Juan", "Pérez", "Producción", falta),
  fila(512, "Pablo", "Ortiz", "Almacén", { hora_entrada_programada: "16:00:00", hora_salida_programada: "22:00:00",
    hora_salida_comida_programada: null, hora_regreso_comida_programada: null }),
  fila(508, "Rosa", "Díaz", "Ventas", { hora_entrada_programada: "06:00:00", hora_salida_programada: "14:00:00",
    hora_salida_comida_programada: null, hora_regreso_comida_programada: null, entrada: `${F} 06:00:00`, salida: `${F} 14:00:00`,
    checadas_vivas: 1, minutos_trabajados: 480, estado_calculado: { clave: "ok", texto: "Asistió", atencion: false } }),
  fila(513, "Tomás", "Ruiz", "Ventas", { tipo_registro_nombre: "Vacaciones", id_tipo_permiso: 6, asistencia: 0,
    estado_calculado: { clave: "vacaciones", texto: "Vacaciones", atencion: false } }),
];
const ESPERADO = [
  ["Requieren atención · 3", ["Alondra Munguía", "Armando González", "Juan Pérez"]],
  ["En comida · 1", ["Carla Vega"]],
  ["Trabajando · 1", ["Diego León"]],
  ["Por entrar · 1", ["Pablo Ortiz"]],
  ["Ya salieron · 1", ["Rosa Díaz"]],
  ["No laboran hoy · 2", ["Sofía Ramos", "Tomás Ruiz"]],
];
const tiposPermiso = [
  { id: 1, nombre: "Asistencia", cuenta_como_asistencia: 1, rol: "asistencia", captura: 1 }, { id: 2, nombre: "Inasistencia", cuenta_como_asistencia: 0, rol: "inasistencia", captura: 1 },
  { id: 4, nombre: "Incapacidad IMSS", cuenta_como_asistencia: 0, fijo_ley: 1 },
  { id: 5, nombre: "Día de descanso", cuenta_como_asistencia: 0, goce_sueldo: 1, fijo_ley: 1 },
  { id: 6, nombre: "Vacaciones", cuenta_como_asistencia: 0, fijo_ley: 1, descuenta_vacaciones: 1 },
];
const motivosPermiso = [{ id: 1, nombre: "Visita al médico", global: true }, { id: 2, nombre: "Permiso personal", global: true }, { id: 6, nombre: "Otro", global: true }];
const motivos = { permisos: [], correccion: [{ clave: "olvido", nombre: "Olvidó checar" }, { clave: "reloj", nombre: "Falla del reloj" }] };
const chec = (id, e, s) => ({ id, entrada: e, salida: s, entrada_reloj: e, salida_reloj: s, concepto: "jornada", motivo: null,
  origen: "reloj", anulado: false, id_autoriza: null, autoriza_no: false });
const relojes = {
  508: { horario: { entrada: "06:00", salida: "14:00", salida_comida: null, regreso_comida: null }, registros: [chec(7401, `${F} 06:00:00`, `${F} 14:00:00`)] },
};

const pet = { reloj: [], estado: [], asistencias: [] };
const errores = [];
let exito = false;
const browser = await chromium.launch();

async function simular(page) {
  page.on("pageerror", (e) => errores.push(e.message));
  await page.clock.setFixedTime(AHORA);
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base,
      "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    const cuerpo = () => JSON.parse(req.postData() || "{}");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/tiposPermiso")) return json({ tiposPermiso });
    if (p.endsWith("/checador/motivos-permiso")) return json({ ok: true, motivos: motivosPermiso });
    if (p.endsWith("/checador/empleados")) return json({ data: [{ id_empleado: 7, nombre: "Laura", apellido_paterno: "Méndez" }], total: 1 });
    if (p.endsWith("/checador/asistencias") && req.method() === "GET") {
      pet.asistencias.push(Object.fromEntries(url.searchParams));
      const regs = filas();
      return json({ registros: regs, total: regs.length, page: 1, aplicarPaginacion: true });
    }
    let m = /\/checador\/asistencias\/(\d+)\/reloj$/.exec(p);
    if (m) {
      const idA = Number(m[1]);
      const f = filas().find((x) => x.id === idA);
      if (req.method() === "PUT") {
        pet.reloj.push({ id: idA, cuerpo: cuerpo() });
        return json({ ok: true, asistencia: f });
      }
      const r = relojes[idA] ?? { horario: { entrada: "09:00", salida: "16:00", salida_comida: "13:00", regreso_comida: "14:00" }, registros: [] };
      return json({ ok: true, asistencia: { id: idA, id_empleado: idA, nombre: `${f.nombre} ${f.apellido_paterno}`, departamento: f.departamento, fecha: f.fecha },
        horario: r.horario, dia: NORMAL, registros: r.registros, motivos, autorizadores: [{ id: 3, nombre: "Laura Méndez (RH)" }],
        resumen: { minutos_trabajados: f.minutos_trabajados ?? 0, minutos_comida: 0, minutos_extra: 0, minutos_extra_por_autorizar: 0,
          checadas_vivas: f.checadas_vivas, abierto: false, estado: f.estado_calculado, estado_calculado: f.estado_calculado },
        migracion: true });
    }
    m = /\/checador\/asistencias\/(\d+)\/estado-dia$/.exec(p);
    if (m && req.method() === "PUT") {
      pet.estado.push({ id: Number(m[1]), cuerpo: cuerpo() });
      return json({ ok: true, asistencia: filas().find((x) => x.id === Number(m[1])) });
    }
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
}

async function sinDesborde(loc, etiqueta) {
  const sobra = await loc.evaluate((el) => el.scrollWidth - el.clientWidth);
  assert.ok(sobra <= 1, `${etiqueta}: desplazamiento horizontal (${sobra}px)`);
}
async function esperar(cond, texto) {
  for (let i = 0; i < 80; i++) { if (cond()) return; await dormir(100); }
  throw new Error(`No llegó: ${texto}`);
}
// Tabla → [[«Encabezado · N», [personas…]], …] en el orden en que se ven.
const leerGrupos = (page) => page.locator("tbody").first().evaluate((tb, nombres) => {
  const salida = [];
  for (const tr of tb.querySelectorAll(":scope > tr")) {
    if (tr.hasAttribute("data-grupo")) { salida.push([tr.innerText.replace(/\s+/g, " ").trim(), []]); continue; }
    const quien = nombres.find((n) => tr.innerText.includes(n));
    if (quien && salida.length) salida.at(-1)[1].push(quien);
  }
  return salida;
}, ESPERADO.flatMap(([, ns]) => ns));
const agruparCombo = (page) => page.getByRole("combobox").filter({ has: page.locator("svg.lucide-layers") });
async function elegirAgrupar(page, texto) {
  await agruparCombo(page).click();
  await page.getByRole("option", { name: texto, exact: true }).click();
}
async function elegirPeriodo(page, preset) {
  await page.locator("button:has(> svg.lucide-calendar-days):has(> svg.lucide-chevron-down.ml-1)").click(); // el botón del periodo
  const dlg = page.getByRole("dialog", { name: "Seleccionar rango de fechas" });
  await dlg.getByRole("button", { name: preset, exact: true }).click();
  await dlg.getByRole("button", { name: "Aplicar" }).click();
  await dlg.waitFor({ state: "detached" });
}

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  await simular(page);

  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Registros" }).click();
  const filaDe = (n) => page.locator("tr", { hasText: n }).first();
  await filaDe("Alondra Munguía").waitFor({ timeout: 30000 });
  assert.equal(pet.asistencias.at(-1).fechaInicio ?? pet.asistencias.at(-1).fecha_inicio ?? F, F, "consulta del día de hoy");

  // 1) Con Hoy: encabezados con su número, en orden, y cada persona en su grupo (orden de la tabla dentro del grupo).
  await page.locator("tr[data-grupo]").first().waitFor({ timeout: 10000 });
  assert.deepEqual(await leerGrupos(page), ESPERADO);
  assert.match(await agruparCombo(page).innerText(), /Situación de hoy/, "«Agrupar» por defecto en Hoy");
  // Mismo estilo de encabezado que la agrupación existente; sin «% asistencia».
  assert.equal(await page.locator("tr[data-grupo]", { hasText: "% asistencia" }).count(), 0);
  // Las columnas siguen iguales.
  const columnas = (await page.locator("thead th").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim().toUpperCase()).filter(Boolean);
  for (const c of ["EMPLEADO", "ENTRADA", "SALIDA", "ESTADO", "MOTIVO", "RELOJ"]) assert.ok(columnas.some((h) => h.startsWith(c)), `falta la columna ${c}`);
  await sinDesborde(page.locator("html"), "página 1440 agrupada");
  const cortadas = await page.locator("tbody").first().evaluate((tb) => [...tb.querySelectorAll("tr[data-grupo] td")].filter((td) => td.scrollWidth > td.clientWidth + 1).map((td) => td.innerText));
  assert.deepEqual(cortadas, [], "encabezados de grupo sin recortar");
  if (capturas) { await dormir(400); await page.screenshot({ path: `${capturas}/1440-hoy-agrupada.png`, fullPage: true }); }

  // 2) Edición en fila dentro de un grupo: Estado / Motivo de Juan («Requieren atención»).
  await elegir(page.getByLabel("Motivo de Juan Pérez"), { label: "Otro…" });
  await filaDe("Juan Pérez").getByLabel("Escribe el motivo").fill("Cita médica con comprobante");
  await filaDe("Juan Pérez").getByRole("button", { name: "OK" }).click();
  await esperar(() => pet.estado.length === 1, "PUT estado-dia");
  assert.deepEqual(pet.estado[0], { id: 503, cuerpo: { id_tipo_permiso: 2, id_motivo: 6, motivo_permiso: "Cita médica con comprobante", goce: "sin" } });
  await elegir(page.getByLabel("Qué pasó de Armando González"), "5");
  await filaDe("Armando González").getByRole("button", { name: "OK" }).click();
  await esperar(() => pet.estado.length === 2, "PUT estado-dia descanso");
  assert.deepEqual(pet.estado[1], { id: 502, cuerpo: { id_tipo_permiso: 5 } });

  // 3) El reloj desde una fila de «Ya salieron»: cambiar la entrada exige motivo y guarda.
  await page.getByRole("button", { name: "Abrir el reloj de Rosa Díaz" }).click();
  const dlg = page.getByRole("dialog", { name: /Rosa Díaz/ });
  const r1 = dlg.locator('[data-renglon="1"]');
  await r1.waitFor({ timeout: 10000 });
  await r1.getByLabel("Entrada").fill("06:05");
  assert.equal(await r1.getByRole("alert").innerText(), "Cambiaste la hora: elige el motivo.");
  await elegir(r1.getByLabel("Motivo"), "olvido");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await dlg.waitFor({ state: "detached", timeout: 10000 });
  assert.equal(pet.reloj.length, 1);
  assert.equal(pet.reloj[0].id, 508);
  assert.equal(pet.reloj[0].cuerpo.registros[0].entrada, `${F} 06:05:00`);
  assert.equal(pet.reloj[0].cuerpo.registros[0].motivo, "olvido");
  // Después de guardar, la tabla sigue dividida.
  assert.deepEqual((await leerGrupos(page)).map(([g]) => g), ESPERADO.map(([g]) => g));

  // 4) «Sin agrupar»: desaparecen los encabezados y se respeta.
  await elegirAgrupar(page, "Sin agrupar");
  await page.locator("tr[data-grupo]").first().waitFor({ state: "detached", timeout: 10000 });
  assert.equal(await filaDe("Tomás Ruiz").isVisible(), true);
  assert.match(await agruparCombo(page).innerText(), /Sin agrupar/);
  await dormir(1200);
  assert.equal(await page.locator("tr[data-grupo]").count(), 0, "«Sin agrupar» se respeta en Hoy");
  if (capturas) await page.screenshot({ path: `${capturas}/1440-hoy-sin-agrupar.png` });

  // 5) Otro periodo: no se divide y «Situación de hoy» no se ofrece.
  await elegirPeriodo(page, "Últimos 15 días"); // el 23/11 es lunes: «Esta semana» sería solo hoy
  await filaDe("Alondra Munguía").waitFor({ timeout: 10000 });
  await dormir(500);
  assert.equal(await page.locator("tr[data-grupo]").count(), 0, "15 días sin grupos de situación");
  await agruparCombo(page).click();
  const opciones = await page.getByRole("option").allInnerTexts();
  assert.ok(!opciones.some((o) => /Situación de hoy/.test(o)), `opciones en 15 días: ${opciones.join(" | ")}`);
  await page.keyboard.press("Escape");
  if (capturas) await page.screenshot({ path: `${capturas}/1440-otro-periodo.png` });
  await elegirPeriodo(page, "Este mes");
  await dormir(800);
  assert.equal(await page.locator("tr[data-grupo]").count(), 0, "mes sin grupos de situación");
  // Una agrupación normal en otro periodo sigue igual (por departamento, con «empleados»).
  await elegirAgrupar(page, "Departamento");
  await page.locator('tr[data-grupo="Ventas"]').waitFor({ timeout: 10000 });
  assert.match(await page.locator('tr[data-grupo="Ventas"]').innerText(), /4 empleados/);
  await elegirAgrupar(page, "Sin agrupar");

  // 6) De vuelta a Hoy: vuelve el valor por defecto.
  await elegirPeriodo(page, "Hoy");
  await page.locator("tr[data-grupo]").first().waitFor({ timeout: 10000 });
  assert.deepEqual((await leerGrupos(page)).map(([g]) => g), ESPERADO.map(([g]) => g));

  // 7) Celular (390): sin desbordes.
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctxM.addCookies([{ name: "token", value: token(), url: base }]);
  const pm = await ctxM.newPage();
  await simular(pm);
  await pm.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await pm.getByRole("tab", { name: "Registros" }).click();
  await pm.getByText("Alondra Munguía").first().waitFor({ timeout: 30000 });
  await dormir(500);
  await sinDesborde(pm.locator("html"), "página 390");
  await sinDesborde(pm.locator("body"), "body 390");
  if (capturas) await pm.screenshot({ path: `${capturas}/390-hoy.png` });

  assert.deepEqual(errores, [], "sin errores de JavaScript en la página");
  exito = true;
  console.log("OK Hoy dividida en 6 grupos con su número y cada persona en su grupo · «Situación de hoy» por defecto · Estado / Motivo y reloj dentro de un grupo · «Sin agrupar» los quita · últimos 15 días y mes sin grupos · al volver a Hoy regresan · 1440 y 390 sin desbordes · sin errores de JS");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
