// Verificación DE PUNTA A PUNTA de Tareas y Checklists (23/11/2026): navegador → frontend → backend real
// (/api/checador/tareas contra MariaDB de prueba; solo sesión y S3 simulados, ver backend scripts/servidor-prueba-tareas.cjs).
// Uso:
//   NEXT_PUBLIC_RUTA_BACKEND=http://127.0.0.1:4010/api npm run build
//   BACKEND_DIR=../hr360-checkin-backend TAREAS_TEST_DB=tareas_e2e NOMINA_TEST_USER=u NOMINA_TEST_PASSWORD=p node scripts/verify-tareas-real.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const BACKEND_DIR = path.resolve(process.env.BACKEND_DIR || "../hr360-checkin-backend");
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true }) : null);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (payload) => { const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 })}`; return `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`; };
const DUENO = { tipo_usuario: "Recruiter", id_usuario: 1, nombre: "Dueño Prueba", empresas: [7], empresas_detalle: [{ id_empresa: 7, nombre: "Restaurante Prueba" }] };
const ANA = { tipo_usuario: "Empleado", id_empleado: 15, id_usuario: 15, nombre: "Ana Torres", id_empresa: 7, empresas: [7] };

const backend = spawn(process.execPath, ["scripts/servidor-prueba-tareas.cjs"], { cwd: BACKEND_DIR, env: { ...process.env, PUERTO: "4010", ORIGEN: base, DISABLE_CRONS: "true" }, stdio: ["ignore", "pipe", "pipe"] });
let salidaBackend = "";
backend.stdout.on("data", (d) => { salidaBackend += d; });
backend.stderr.on("data", (d) => { salidaBackend += d; });
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });

let exito = false;
const errores = [];
const browser = await chromium.launch();
try {
  for (let i = 0; !salidaBackend.includes("LISTO"); i++) { if (i > 150) throw new Error(`El backend de prueba no arrancó:\n${salidaBackend}`); await dormir(100); }
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: "es-MX", timezoneId: "America/Mexico_City", acceptDownloads: true });
  await ctx.addCookies([{ name: "token", value: jwt(DUENO), url: base }]);
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));

  // 1) El dueño activa el módulo.
  await pg.goto(base + "/panel/tareas", { waitUntil: "domcontentloaded" });
  await pg.getByText("Tareas y Checklists no está activo en esta empresa").waitFor({ timeout: 30000 });
  await pg.getByRole("button", { name: "Activar Tareas y Checklists" }).click();
  await pg.getByText("Aún no hay tareas.").waitFor({ timeout: 15000 });

  // 2) Proyecto y tareas.
  await pg.getByRole("navigation", { name: "Secciones de tareas" }).getByRole("link", { name: "Proyectos", exact: true }).click();
  await pg.getByRole("button", { name: "Nuevo proyecto" }).first().click();
  await pg.getByLabel("Nombre").fill("Apertura sucursal Norte");
  await pg.getByRole("button", { name: "Crear proyecto" }).click();
  await pg.getByRole("button", { name: /Apertura sucursal Norte/ }).click();
  await pg.getByRole("button", { name: "Tarea en este proyecto" }).click();
  const dlg = pg.getByRole("dialog");
  await dlg.getByLabel("Qué hay que hacer").fill("Revisar extintores");
  await dlg.getByLabel("Responsable").selectOption({ label: "Ana Torres · Encargado de turno" });
  await dlg.getByLabel("Fecha límite").fill(hoy);
  await dlg.getByLabel("Paso 1", { exact: true }).fill("Ver fecha de carga");
  await dlg.getByRole("button", { name: "Agregar paso" }).click();
  await dlg.getByLabel("Paso 2", { exact: true }).fill("Firmar bitácora");
  await dlg.getByText("Pide foto de evidencia").click();
  await dlg.getByRole("button", { name: "Crear y asignar" }).click();
  await pg.getByRole("region", { name: "Por hacer", exact: true }).getByRole("button", { name: /Revisar extintores/ }).waitFor({ timeout: 15000 });
  await pg.getByText("1 de 1 tareas").or(pg.getByText("0 de 1 tareas")).first().waitFor();

  // 3) Checklist con preguntas de varios tipos, asignado al puesto de encargado.
  await pg.goto(base + "/panel/checklists", { waitUntil: "domcontentloaded" }); // otro módulo (23/11/2026)
  await pg.getByRole("button", { name: "Nuevo checklist" }).first().click();
  await pg.getByRole("button", { name: "Empezar en blanco" }).click();
  await pg.getByLabel("Nombre del checklist").fill("Apertura");
  await pg.getByLabel("A quién 1").selectOption({ label: "Encargado de turno" });
  await pg.getByLabel("Pregunta 1", { exact: true }).fill("¿Se abrió la cortina?");
  const agregar = (tipo) => pg.getByRole("region", { name: "Preguntas" }).getByRole("button", { name: tipo, exact: true }).last().click();
  await agregar("Una opción");
  await pg.getByLabel("Pregunta 2", { exact: true }).fill("¿Cómo está el comedor?");
  await pg.getByText("Pide foto de evidencia").nth(1).click();
  await agregar("Firma");
  await pg.getByLabel("Pregunta 3", { exact: true }).fill("Firma de quien abre");
  await pg.getByRole("button", { name: "Guardar y asignar" }).click();
  await pg.getByText("«Apertura» quedó creado y asignado.").waitFor({ timeout: 15000 });
  await pg.getByText("Hoy: 0 de 2 enviados").waitFor({ timeout: 15000 }); // Ana y Beto son encargados
  await captura(pg, "real-checklists");

  // ===== Ana en su celular =====
  const ce = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: true });
  await ce.addCookies([{ name: "token", value: jwt(ANA), url: base }]);
  const pe = await ce.newPage();
  pe.on("pageerror", (e) => errores.push(e.message));
  await pe.goto(base + "/empleado/panel/tareas", { waitUntil: "domcontentloaded" });
  const tarjetaCk = pe.getByRole("button", { name: /^Apertura Antes de las/ });
  await tarjetaCk.waitFor({ timeout: 30000 });
  await tarjetaCk.click();
  const preg = (t) => pe.getByRole("listitem").filter({ hasText: t });
  await pe.getByText("Faltan 3 preguntas obligatorias.").waitFor();
  await preg("¿Se abrió la cortina?").getByRole("button", { name: "Sí", exact: true }).click();
  await preg("¿Cómo está el comedor?").getByRole("button", { name: "Regular", exact: true }).click();
  await preg("¿Cómo está el comedor?").locator('input[type="file"]').setInputFiles({ name: "comedor.png", mimeType: "image/png", buffer: PNG });
  await preg("¿Cómo está el comedor?").getByRole("img", { name: "Foto de evidencia" }).waitFor({ timeout: 15000 }); // ya subida y servida por el backend
  const lienzo = preg("Firma de quien abre").getByLabel("Firma: Firma de quien abre");
  await lienzo.evaluate((el) => el.scrollIntoView({ block: "center" })); // que no quede bajo la barra fija de «Enviar»
  await dormir(200);
  const cf = await lienzo.boundingBox();
  await pe.mouse.move(cf.x + 30, cf.y + 60); await pe.mouse.down();
  for (let k = 1; k <= 10; k++) await pe.mouse.move(cf.x + 30 + k * 22, cf.y + 60 + Math.sin(k) * 25);
  await pe.mouse.up();
  await preg("Firma de quien abre").getByRole("button", { name: "Listo, firmar" }).click();
  await preg("Firma de quien abre").getByRole("img", { name: /Firma:/ }).waitFor({ timeout: 15000 });
  const enviar = pe.getByRole("button", { name: /Enviar terminado/ });
  assert.match(await enviar.innerText(), /75%/, "Sí 100 + Regular 50 → 75 %");
  await captura(pe, "real-app-checklist");
  await enviar.click();
  await pe.getByText("Checklist enviado").waitFor({ timeout: 15000 });
  await pe.getByRole("button", { name: "Mis tareas" }).click();

  // Ana: tarea con pasos y foto → a revisión.
  await pe.getByRole("button", { name: /Revisar extintores/ }).click();
  const mandar = pe.getByRole("button", { name: "Mandar a revisión" });
  await pe.getByText("Te faltan 2 pasos.").waitFor();
  await pe.getByText("Ver fecha de carga").click();
  await pe.getByText("Firmar bitácora").click();
  await pe.getByText("Sube la foto de evidencia.").waitFor({ timeout: 15000 });
  await pe.locator('input[type="file"]').setInputFiles({ name: "ext.png", mimeType: "image/png", buffer: PNG });
  await pe.getByRole("img", { name: "Evidencia 1" }).waitFor({ timeout: 15000 });
  await mandar.click();
  await pe.getByText("Listo, tu jefe ya puede revisarla.").waitFor({ timeout: 15000 });
  assert.ok(await pe.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde en celular");

  // ===== El jefe revisa =====
  await pg.getByRole("navigation", { name: "Secciones de checklists" }).getByRole("link", { name: /^Revisar/ }).click();
  await pg.getByRole("list", { name: "Por revisar" }).getByText("Ana Torres").waitFor({ timeout: 15000 });
  await pg.getByRole("img", { name: "Foto: ¿Cómo está el comedor?" }).waitFor({ timeout: 15000 });
  await pg.getByRole("img", { name: "Firma: Firma de quien abre" }).waitFor();
  await pg.getByRole("button", { name: "Corregir «¿Cómo está el comedor?»" }).click();
  await pg.getByRole("button", { name: "Opción 3", exact: true }).or(pg.getByRole("button", { name: "Sucia", exact: true })).first().click();
  await pg.getByText(/tú lo corriges a/).waitFor();
  await captura(pg, "real-revisar");
  await pg.getByRole("button", { name: /Aprobar con/ }).click();
  await pg.getByText(/Aprobado con 50%.*corregiste 1/).waitFor({ timeout: 15000 });

  await pg.goto(base + "/panel/tareas", { waitUntil: "domcontentloaded" });
  await pg.getByRole("region", { name: "En revisión", exact: true }).getByRole("button", { name: /Revisar extintores/ }).click();
  await dlg.getByRole("img", { name: "Evidencia 1" }).waitFor({ timeout: 15000 });
  await dlg.getByRole("button", { name: "Aprobar y terminar" }).click();
  await pg.keyboard.press("Escape");
  await pg.getByRole("region", { name: "Hecho", exact: true }).getByRole("button", { name: /Revisar extintores/ }).waitFor({ timeout: 15000 });

  await pg.goto(base + "/panel/checklists/cumplimiento", { waitUntil: "domcontentloaded" });
  await pg.getByRole("cell", { name: /Ana Torres/ }).waitFor({ timeout: 15000 });
  const filaAna = (await pg.getByRole("row", { name: /Ana Torres/ }).innerText()).replace(/\s+/g, " ");
  assert.match(filaAna, /50%/, `Ana: ${filaAna}`);
  await pg.getByRole("region", { name: "Preguntas que más fallan" }).getByRole("cell", { name: "¿Cómo está el comedor?" }).waitFor();
  await captura(pg, "real-cumplimiento");

  // Ana ve su checklist aprobado con la corrección.
  await pe.reload({ waitUntil: "domcontentloaded" });
  await pe.getByText("Aprobado · 50%").waitFor({ timeout: 20000 });

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK de punta a punta: activar módulo, proyecto y tarea, checklist con opción+foto+firma, la persona lo llena (75 %) y manda su tarea con foto, el jefe corrige (50 %) y aprueba, tarea hecha, cumplimiento y fallas, la persona ve el aprobado");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  backend.kill();
  if (!exito) process.exitCode = 1;
}
