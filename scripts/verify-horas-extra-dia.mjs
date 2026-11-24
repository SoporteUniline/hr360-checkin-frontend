// (24/11/2026) En Asistencias el día ya se corrige en el reloj (verify-reloj-dia.mjs); esta ventana sigue abriéndose
// desde el Monitor («Ver día de …»), así que la verificación entra por ahí con el reloj del navegador fijo en el lunes 23.
// Verificación en navegador real (Chromium + Next compilado) del panel del día: comida manual (se ve como manual, con
// quién la agregó, Editar y Quitar), «+ Agregar comida» no se ofrece con comida o pausa, y horas extra con horario
// (propuesta del reloj, varios días, repetir, tope de la semana, validación y guardado con el botón Guardar).
// Backend simulado; ninguna petición sale a internet. Uso: npm run build && node scripts/verify-horas-extra-dia.mjs
// CAPTURAS=<carpeta> guarda capturas a 1440 y 390.
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
const capturas = process.env.CAPTURAS;

function token() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Méndez", id_empleado: 7, empresas: [10],
  empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

// Lunes 23 nov 2026, horario 09:00–16:00 con comida 14:00–14:30.
const dia = {
  fecha: "2026-11-23", tipo_registro_nombre: "Asistencia", id_tipo_permiso: 14, asistencia: 1, goce_sueldo: 1, correccion: 1, estadoAsistencia: "Presente",
  departamento: "Ventas", zona_horaria: "America/Mexico_City", hrs_comida: 0.5, apellido_materno: "",
  hora_entrada_programada: "09:00:00", hora_salida_programada: "16:00:00",
  hora_salida_comida_programada: "14:00:00", hora_regreso_comida_programada: "14:30:00",
};
const alondra = { ...dia, id: 501, id_empleado: 15, nombre: "Alondra", apellido_paterno: "Munguía",
  entrada: "2026-11-23 09:18:00", salida: "2026-11-23 16:08:00",
  tramos_checadas: [{ entrada: "2026-11-23 09:18:00", salida: "2026-11-23 14:00:00" }, { entrada: "2026-11-23 14:30:00", salida: "2026-11-23 16:08:00" }],
  minutos_trabajados_checadas: 380, minutos_descanso_checadas: 30,
  comida_checada: { salida: "2026-11-23 14:00:00", regreso: "2026-11-23 14:30:00", minutos: 30, minutos_programados: 30, excedente: 0,
    manual: true, id_movimiento: 91,
    agrego: { nombre_usuario: "Laura Méndez", creado_en: "2026-11-23 17:12:00.000000" } } };
const beto = { ...dia, id: 502, id_empleado: 16, nombre: "Beto", apellido_paterno: "Ruiz", correccion: 0,
  entrada: "2026-11-23 09:00:00", salida: "2026-11-23 18:40:00",
  tramos_checadas: [{ entrada: "2026-11-23 09:00:00", salida: "2026-11-23 18:40:00" }], minutos_trabajados_checadas: 580, minutos_descanso_checadas: 0 };
const registros = [alondra, beto];
const semana = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"];
const jornadaDia = (i) => (i < 5 ? { entrada: "09:00", salida: "16:00" } : i === 5 ? { entrada: "09:00", salida: "14:00" } : null);
const jornadas = Object.fromEntries(semana.map((f, i) => [f, jornadaDia(i)]));

const peticiones = { comida: [], horas: [] };
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date("2026-11-23T18:00:00Z")); // lunes 23, 12:00 en CDMX
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base,
      "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" },
      body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/reloj/asistencia-por-empleado")) {
      return json({ registros: url.searchParams.get("empleado") === "15"
        ? [{ id: 91, entrada: "2026-11-23 09:18:00", salida: "2026-11-23 16:08:00", salida_corregida: "2026-11-23 14:00:00", estado: "Cerrado",
          tipo_cierre: "comida" },
          { id: 92, entrada: null, salida: null, entrada_corregida: "2026-11-23 14:30:00", salida_corregida: "2026-11-23 16:08:00", estado: "Cerrado" }]
        : [{ id: 93, entrada: "2026-11-23 09:00:00", salida: "2026-11-23 18:40:00", estado: "Cerrado" }] });
    }
    if (p.endsWith("/checador/tiposPermiso")) return json({ tiposPermiso: [{ id: 14, nombre: "Asistencia" }] });
    if (p.endsWith("/checador/empleados")) {
      const lista = [{ id_empleado: 7, nombre: "Laura", apellido_paterno: "Méndez" }, { id_empleado: 15, nombre: "Alondra", apellido_paterno: "Munguía" }];
      return json({ data: lista, total: 2 });
    }
    if (p.endsWith("/checador/asistencias") && req.method() === "GET") return json({ registros, total: registros.length, page: 1, aplicarPaginacion: true });
    if (/\/checador\/asistencias\/\d+\/comida\/\d+$/.test(p)) {
      peticiones.comida.push({ metodo: req.method(), ruta: p, cuerpo: req.postData() ? JSON.parse(req.postData()) : null });
      return json({ asistencia: {} });
    }
    if (/\/checador\/horas-extra\/empleado\/\d+$/.test(p)) {
      if (req.method() === "PUT") {
        peticiones.horas.push({ ruta: p, cuerpo: JSON.parse(req.postData() || "{}") });
        return json({ ok: true, registros: [], avisos: [] });
      }
      const esBeto = p.endsWith("/16");
      return json({ ok: true, jornadas, avisos: [], semana: [], registros: esBeto ? [] : [
        { id: 70, fecha: "2026-11-26", desde: "2026-11-26 16:00:00", hasta: "2026-11-26 18:00:00", minutos: 120, motivo: "Entrega a cliente",
          id_autoriza: 7, forma_pago: "Pago de horas extras", origen: "manual_rh" }],
      propuestas: esBeto ? [{ fecha: "2026-11-23", desde: "2026-11-23 16:00:00", hasta: "2026-11-23 18:40:00", minutos: 160, origen: "reloj" }] : [] });
    }
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });

  await page.goto(base + "/panel/monitor", { waitUntil: "domcontentloaded" });
  const verDia = (n) => page.getByRole("button", { name: `Ver día de ${n}` });
  await verDia("Alondra Munguía").waitFor({ timeout: 30000 });

  // 1) Comida manual: se ve como manual, con quién la agregó; Editar y Quitar. No se ofrece agregar otra.
  await verDia("Alondra Munguía").click();
  const panel = page.getByRole("dialog", { name: /Alondra Munguía/ });
  const comida = panel.locator('[data-pausa="comida"]');
  await comida.waitFor({ timeout: 10000 });
  assert.match(await comida.innerText(), /Comida[\s\S]*manual[\s\S]*2:00 p\.m\. → 2:30 p\.m\.[\s\S]*agregó Laura M\. · 23\/11 5:12 p\.m\./i);
  assert.equal(await panel.getByRole("button", { name: "+ Agregar comida" }).count(), 0, "ya tiene comida: no se ofrece otra");
  // Horas extra ya guardadas (jueves) se ven como fila.
  await panel.locator('[data-fila-extra="2026-11-26"]').waitFor({ timeout: 10000 });
  if (capturas) { await dormir(500); await page.screenshot({ path: `${capturas}/1440-panel-comida-manual.png` }); }
  await comida.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Salió a comer").fill("13:30");
  await page.getByLabel("Regresó de comer").fill("14:00");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  for (let i = 0; i < 50 && !peticiones.comida.length; i++) await dormir(100);
  assert.deepEqual(peticiones.comida[0], { metodo: "PUT", ruta: "/api/checador/asistencias/501/comida/91",
    cuerpo: { salida_comida: "2026-11-23 13:30:00", regreso_comida: "2026-11-23 14:00:00" } });
  await comida.getByRole("button", { name: "Quitar" }).click();
  await page.getByRole("button", { name: "Quitar comida" }).click();
  for (let i = 0; i < 50 && peticiones.comida.length < 2; i++) await dormir(100);
  assert.deepEqual([peticiones.comida[1].metodo, peticiones.comida[1].ruta], ["DELETE", "/api/checador/asistencias/501/comida/91"]);
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "hidden", timeout: 10000 });

  // 2) Horas extra: propuesta del reloj → Autorizar; + Agregar día; Repetir; tope; validación; Guardar.
  await verDia("Beto Ruiz").click();
  const p2 = page.getByRole("dialog", { name: /Beto Ruiz/ });
  const propuesta = p2.locator("[data-propuesta-reloj]");
  await propuesta.waitFor({ timeout: 10000 });
  assert.match(await propuesta.innerText(), /Lun 23: checó en el reloj 2 h 40 min después de su salida/);
  await propuesta.getByRole("button", { name: "Autorizar" }).click();
  const lunes = p2.locator('[data-fila-extra="2026-11-23"]');
  assert.equal(await lunes.getByLabel("Desde").inputValue(), "16:00");
  assert.equal(await lunes.getByLabel("Hasta").inputValue(), "18:40");
  await lunes.getByLabel("Motivo").fill("Inventario de fin de mes");
  await p2.getByText("Cambios sin guardar").waitFor();
  // Repetir el lunes en jueves y sábado; el sábado se corrige a su horario (sale 2:00 p.m.).
  await p2.getByRole("button", { name: "Repetir en otros días…" }).click();
  await page.getByRole("checkbox", { name: "Jue 26" }).check();
  await page.getByRole("checkbox", { name: "Sáb 28" }).check();
  await page.getByRole("button", { name: "Repetir", exact: true }).click();
  const sabado = p2.locator('[data-fila-extra="2026-11-28"]');
  await sabado.getByLabel("Desde").fill("14:00");
  await sabado.getByLabel("Hasta").fill("17:00");
  const jueves = p2.locator('[data-fila-extra="2026-11-26"]');
  await jueves.getByLabel("Hasta").fill("18:00");
  const resumen = p2.locator("[data-resumen-semana]");
  assert.match(await resumen.innerText(), /7 h 40 min extra[\s\S]*esta semana · lun 2 h 40 min, jue 2 h, sáb 3 h[\s\S]*Quedan 1 h 20 min de las 9 h/);
  // + Agregar día: con «hasta» antes que «desde» no se guarda y se dice por qué.
  await p2.getByRole("button", { name: "+ Agregar día" }).click();
  const martes = p2.locator('[data-fila-extra="2026-11-24"]');
  await martes.getByLabel("Hasta").fill("15:00");
  await martes.getByLabel("Motivo").fill("Auditoría");
  await p2.getByLabel("Autoriza", { exact: true }).selectOption("7");
  await p2.getByLabel("Se pagan como").selectOption("Tiempo por tiempo");
  if (capturas) { await dormir(400); await page.screenshot({ path: `${capturas}/1440-panel-horas-extra.png` }); }
  await p2.getByRole("button", { name: "Guardar" }).click();
  await martes.getByRole("alert").waitFor({ timeout: 5000 });
  assert.match(await martes.getByRole("alert").innerText(), /mayor que «desde»/);
  assert.equal(peticiones.horas.length, 0, "con errores no se manda nada");
  // Ahora el martes 18:00–21:00: pasa de 9 h → aviso del tope, pero sí se guarda.
  await martes.getByLabel("Desde").fill("18:00");
  await martes.getByLabel("Hasta").fill("21:00");
  assert.match(await resumen.innerText(), /semana suma 10 h 40 min; la ley permite 9 h/);
  await p2.getByRole("button", { name: "Guardar" }).click();
  for (let i = 0; i < 50 && !peticiones.horas.length; i++) await dormir(100);
  const cuerpo = peticiones.horas[0].cuerpo;
  assert.equal(peticiones.horas[0].ruta, "/api/checador/horas-extra/empleado/16");
  assert.deepEqual(cuerpo.registros.map((r) => [r.fecha, r.desde, r.hasta, r.motivo, r.origen]), [
    ["2026-11-23", "2026-11-23 16:00:00", "2026-11-23 18:40:00", "Inventario de fin de mes", "reloj"],
    ["2026-11-26", "2026-11-26 16:00:00", "2026-11-26 18:00:00", "Inventario de fin de mes", "manual_rh"],
    ["2026-11-28", "2026-11-28 14:00:00", "2026-11-28 17:00:00", "Inventario de fin de mes", "manual_rh"],
    ["2026-11-24", "2026-11-24 18:00:00", "2026-11-24 21:00:00", "Auditoría", "manual_rh"],
  ]);
  assert.deepEqual([cuerpo.id_autoriza, cuerpo.forma_pago, cuerpo.quitar], [7, "Tiempo por tiempo", []]);
  await p2.waitFor({ state: "hidden", timeout: 10000 });

  // 3) Celular (390): el Monitor abre el mismo panel del día.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/panel/monitor", { waitUntil: "domcontentloaded" });
  await verDia("Alondra Munguía").click();
  const p3 = page.getByRole("dialog", { name: /Alondra Munguía/ });
  await p3.locator('[data-fila-extra="2026-11-26"]').waitFor({ timeout: 15000 });
  const sobra = await p3.evaluate((el) => el.scrollWidth - el.clientWidth);
  assert.ok(sobra <= 1, `sin desplazamiento horizontal en 390 (sobran ${sobra}px)`);
  for (const fila of await p3.locator("[data-fila-extra]").all()) {
    const caja = await fila.boundingBox();
    assert.ok(caja.width <= 390, "cada fila cabe en 390");
  }
  if (capturas) {
    await p3.locator('[data-pausa="comida"]').scrollIntoViewIfNeeded();
    await dormir(400);
    await page.screenshot({ path: `${capturas}/390-panel-comida-manual.png` });
    await p3.locator("[data-horas-extra-dia]").scrollIntoViewIfNeeded();
    await dormir(300);
    await page.screenshot({ path: `${capturas}/390-panel-horas-extra.png` });
  }

  // #418 (texto distinto al hidratar): el servidor pinta con la fecha real y el navegador con el reloj fijo en el 23.
  assert.deepEqual(errores.filter((e) => !/Minified React error #418/.test(e)), [], "sin errores de JavaScript");
  exito = true;
  console.log("OK (desde el Monitor) · comida manual (manual, quién, Editar → PUT, Quitar → DELETE, sin «Agregar comida») · horas extra con horario "
    + "(propuesta del reloj, repetir, tope 9 h, validación, Guardar → PUT con varios días, autoriza y forma) · 390 sin desbordar");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
