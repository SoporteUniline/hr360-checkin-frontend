// Verificación en navegador de permisos por horas (R1): etiqueta en Asistencias, «Repone» en horas extra
// cuando el empleado debe horas, alta de un permiso por horas y la cuenta de horas en la ficha.
// Backend simulado, nada sale a internet. Uso: npm run build && node scripts/verify-permisos-horas.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { elegir, textosOpciones, valorDe } from "./lib/desplegable.mjs";

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
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", id_empleado: 7, empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

const base_reg = {
  apellido_paterno: "Prueba", apellido_materno: "", nip: "1", departamento: "Operación", unidad_negocio: "Matriz",
  zona_horaria: "America/Mexico_City", tipo_registro_nombre: "Asistencia", id_tipo_permiso: 14, asistencia: 1, correccion: 0,
  estadoAsistencia: "Presente", hrs_comida: 1, hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00", hrs_extra: 0,
};
const registros = [
  // Juan: permiso de llegar hasta las 11:00 que se repone; llegó 11:00 → por reponer 3 h.
  { ...base_reg, id: 1, id_empleado: 300, nombre: "Juan", fecha: "2026-11-17", entrada: "2026-11-17 11:00:00", salida: "2026-11-17 17:00:00",
    permiso_horas: { id: 5, tipo_horas: "llega_tarde", tratamiento: "repone", hora_inicio: null, hora_fin: "11:00", minutos: 180, estado: "calculado" } },
  // Juan otro día se quedó 2 h de más: como debe horas, «Repone» aparece sugerida.
  { ...base_reg, id: 2, id_empleado: 300, nombre: "Juan", fecha: "2026-11-18", entrada: "2026-11-18 08:00:00", salida: "2026-11-18 19:00:00" },
  // Pedro no debe horas: solo Sí / No.
  { ...base_reg, id: 3, id_empleado: 301, nombre: "Pedro", fecha: "2026-11-18", entrada: "2026-11-18 08:00:00", salida: "2026-11-18 19:00:00" },
];
let cuenta = {
  debe: 180, total_cargos: 180, total_repuesto: 0, total_cerrado: 0,
  cargos: [{ id_solicitud: 5, fecha: "2026-11-17", tipo_horas: "llega_tarde", hora_inicio: null, hora_fin: "11:00", minutos: 180, estado: "calculado" }],
  reposiciones: [], cierres: [],
};

const puts = [];
const posts = [];
const cierres = [];
const pedidosCuenta = [];
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token, url: base }]);
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/tiposPermiso")) return json({ tiposPermiso: [{ id: 14, nombre: "Asistencia" }, { id: 30, nombre: "Permiso personal", es_permiso: 1, goce_sueldo: 1 }] });
    // (24/11/2026) Motivo del catálogo de motivos (tipos de registro con goce; ver verify-tipos-goce.mjs).
    if (p.endsWith("/checador/motivos-permiso")) return json({ ok: true, motivos: [{ id: 1, nombre: "Visita al médico", global: true }, { id: 6, nombre: "Otro", global: true }] });
    if (p.endsWith("/checador/asistencias") && req.method() === "GET") return json({ registros, total: registros.length, page: 1, aplicarPaginacion: false });
    if (/\/checador\/asistencias\/\d+$/.test(p) && req.method() === "PUT") {
      const cuerpo = JSON.parse(req.postData() || "{}");
      puts.push({ id: Number(p.split("/").pop()), cuerpo });
      Object.assign(registros.find((r) => r.id === Number(p.split("/").pop())), cuerpo);
      return json({ asistencia: {} });
    }
    if (/\/checador\/asistencias\/\d+\/cambios$/.test(p)) return json({ disponible: true, cambios: [] });
    if (p.endsWith("/checador/cuenta-horas") && req.method() === "GET") {
      pedidosCuenta.push(url.searchParams.get("empleados"));
      const repuso = registros.some((r) => r.id === 2 && Number(r.hrs_extra) && r.forma_pago_extras === "Reposición de tiempo por tiempo");
      return json({ ok: true, data: { 300: repuso ? 60 : 180 } });
    }
    if (p.endsWith("/checador/cuenta-horas/300") && req.method() === "GET") return json({ ok: true, data: cuenta });
    if (p.endsWith("/checador/cuenta-horas/300/cierres") && req.method() === "POST") {
      const cuerpo = JSON.parse(req.postData() || "{}");
      cierres.push(cuerpo);
      cuenta = { ...cuenta, debe: cuenta.debe - cuerpo.minutos, total_cerrado: cuerpo.minutos,
        cierres: [{ id: 9, tipo: cuerpo.tipo, minutos: cuerpo.minutos, nota: cuerpo.nota ?? null, creado_por_nombre: "RH Prueba", creado_en: "2026-11-19 10:00:00" }] };
      return json({ ok: true, data: cuenta });
    }
    if (p.endsWith("/checador/empleados/panel-empleado/lista")) {
      return json({ lista_empleados: [{ id_empleado: 300, nombre_completo: "Juan Prueba", puesto: "Operador", departamento: "Operación", estado: "Activo", empresa: "Empresa prueba" }] });
    }
    if (p.endsWith("/checador/empleados/panel-empleado/300/detalle")) {
      return json({ informacion_general: { id_empleado: 300, nombre_completo: "Juan Prueba" }, permisos: { resumen: {}, historial: [] } });
    }
    if (p.endsWith("/checador/empleados/activos")) return json({ data: [{ id_empleado: 300, nombre: "Juan", apellido_paterno: "Prueba" }, { id_empleado: 301, nombre: "Pedro", apellido_paterno: "Prueba" }] });
    if (p.endsWith("/checador/solicitudes-permiso") && req.method() === "POST") { posts.push(JSON.parse(req.postData() || "{}")); return json({ message: "Solicitud creada", id: 99 }); }
    if (p.endsWith("/checador/solicitudes-permiso")) return json({ data: [], total: 0, estadisticas: { total: 0, pendientes: 0, aprobados: 0, rechazados: 0, cancelados: 0 } });
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });

  // 1) Asistencias: etiqueta del permiso.
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Registros" }).click(); // (22/11/2026) Asistencias abre en «Hoy»
  await page.getByText("Juan", { exact: false }).first().waitFor({ timeout: 30000 });
  const filaPermiso = page.locator("tr", { hasText: "Permiso · por reponer 3 h" });
  await filaPermiso.waitFor({ timeout: 15000 });
  assert.equal(await filaPermiso.getByText("Permiso · por reponer 3 h").getAttribute("title"), "Llega tarde · hasta 11:00 a.m. · va a su cuenta de horas");
  // (24/11/2026) «Repone» ya no está en la tabla: las horas extra se deciden en el reloj de cada fila con «¿Quién
  // autoriza?» y dobles/triples/tiempo por tiempo lo decide la ley por semana (ver verify-reloj-dia.mjs).
  assert.equal(await page.getByRole("button", { name: "Repone", exact: true }).count(), 0, "sin «Repone» en la tabla");
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/permiso-horas-asistencias.png" });

  // 2) Permisos › Nuevo permiso › Por horas.
  await page.goto(base + "/panel/permisos", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Nuevo permiso/ }).first().click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("radio", { name: "Por horas" }).click();
  // Sin datos completos no se guarda.
  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await dialogo.getByText("Elige el tipo de permiso por horas.").waitFor({ timeout: 5000 });
  const empresaSel = dialogo.getByRole("combobox").first();
  if (!/Empresa prueba/.test(await empresaSel.innerText())) {
    await empresaSel.click();
    await page.getByRole("option", { name: "Empresa prueba" }).click();
  }
  // (24/11/2026) «Qué pasó» + «Motivo» (verify-quepaso-motivo.mjs): un tipo propio marcado como permiso se sigue pidiendo.
  await elegir(dialogo.getByLabel("Qué pasó"), { label: "Permiso personal" });
  await dialogo.getByText("Juan Prueba").waitFor({ timeout: 10000 });
  await dialogo.getByRole("checkbox").first().check();
  await dialogo.locator('input[type="date"]').fill("2026-11-24");
  await elegir(dialogo.getByLabel("Tipo de permiso por horas"), "sale_regresa");
  await dialogo.getByLabel("Desde qué hora").fill("10:00");
  await dialogo.getByLabel("Hasta qué hora").fill("12:00");
  await dialogo.getByRole("radio", { name: /Se repone/ }).click();
  await elegir(dialogo.getByLabel("Motivo", { exact: true }), { label: "Visita al médico" });
  if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/permiso-horas-form.png" });
  await dialogo.getByRole("button", { name: "Guardar" }).click();
  for (let i = 0; i < 60 && !posts.length; i++) await dormir(100);
  assert.deepEqual(posts[0], {
    id_empleado: 300, id_tipo_permiso: 30, motivo: null, modalidad: "horas", tipo_horas: "sale_regresa", tratamiento: "repone",
    hora_inicio: "10:00", hora_fin: "12:00", fecha_inicio: "2026-11-24", fecha_fin: "2026-11-24",
    id_motivo_permiso: 1, goce: "con",
  });

  // 3) Cuenta de horas en la ficha: debe 3 h, condonar 1 h con nota.
  await page.goto(base + "/panel/panel-empleado?emp=300", { waitUntil: "domcontentloaded" });
  const pestana = page.getByRole("tab", { name: /Permisos/ });
  await pestana.first().waitFor({ timeout: 30000 });
  {
    await pestana.first().click();
    const seccion = page.getByRole("region", { name: "Cuenta de horas" });
    await seccion.waitFor({ timeout: 15000 });
    assert.match(await seccion.innerText(), /Debe 3 h[\s\S]*Llega tarde · hasta 11:00 a\.m\.[\s\S]*\+3 h/);
    await seccion.getByRole("button", { name: "Condonar" }).click();
    await seccion.getByLabel("Horas").fill("1");
    await seccion.getByLabel("Nota").fill("Buen desempeño");
    await seccion.getByRole("button", { name: "Guardar" }).click();
    for (let i = 0; i < 60 && !cierres.length; i++) await dormir(100);
    assert.deepEqual(cierres[0], { tipo: "condonacion", minutos: 60, nota: "Buen desempeño" });
    await seccion.getByText("Debe 2 h", { exact: true }).waitFor({ timeout: 10000 });
    assert.match(await seccion.innerText(), /Condonado[\s\S]*Buen desempeño · por RH Prueba[\s\S]*−1 h/);
    assert.equal(await seccion.getByLabel("Horas").count(), 0, "el formulario se cierra al guardar");
    if (process.env.CAPTURAS) await page.screenshot({ path: process.env.CAPTURAS + "/permiso-horas-cuenta.png" });
  }

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK permisos por horas · etiqueta en Asistencias (sin «Repone»: la extra se decide en el reloj) · alta por horas (sale y regresa, se repone) · cuenta en la ficha (condonar con nota)");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
