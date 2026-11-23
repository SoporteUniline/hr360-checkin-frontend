// Verificación en navegador del PROTOTIPO de Tareas y Checklists (23/11/2026), datos de ejemplo (sin backend propio):
// RH/jefe en escritorio: tablero (arrastrar, abrir, palomear, crear tarea), proyectos, editor de checklist con peso,
// revisar (marcar «no cumple» recalcula), cumplimiento y Excel. Empleado en celular: tareas, mandar a revisión con foto,
// llenar y enviar el checklist. Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-tareas.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (tipo) => { const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ tipo_usuario: tipo, exp: Math.floor(Date.now() / 1000) + 3600 })}`; return `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`; };
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true }) : null);


const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
async function rutas(ctx, usuario) {
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.pathname.endsWith("/users/verify/token")) return route.fulfill({ json: { user: usuario }, headers: cors });
    return route.fulfill({ json: {}, headers: cors });
  });
}
let exito = false;
const errores = [];
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  // ===== RH / jefe en escritorio =====
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: "es-MX", timezoneId: "America/Mexico_City", acceptDownloads: true });
  await ctx.addCookies([{ name: "token", value: jwt("Recruiter"), url: base }]);
  await rutas(ctx, { id_usuario: -1, tipo_usuario: "Recruiter", nombre: "RH Prueba", empresas: [] });
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));
  await pg.goto(base + "/panel/tareas", { waitUntil: "domcontentloaded" });
  await pg.getByText("Vista previa · datos de ejemplo.").waitFor({ timeout: 30000 });
  const col = (n) => pg.getByRole("region", { name: n, exact: true });
  await col("Por hacer").waitFor();
  await pg.getByRole("complementary", { name: "Mi equipo hoy" }).getByText("Juan no checó hoy y tiene tareas para hoy", { exact: false }).waitFor();
  await captura(pg, "tareas-tablero");

  // Arrastrar «Decorar el comedor» de Por hacer a En proceso.
  const tarjeta = col("Por hacer").getByRole("button", { name: /Decorar el comedor/ });
  await tarjeta.scrollIntoViewIfNeeded();
  await dormir(300);
  const de = await tarjeta.boundingBox();
  const a = await col("En proceso").boundingBox();
  await pg.mouse.move(de.x + de.width / 2, de.y + de.height / 2);
  await pg.mouse.down();
  await pg.mouse.move(de.x + de.width / 2 + 20, de.y + de.height / 2 + 10, { steps: 4 });
  await pg.mouse.move(a.x + a.width / 2, a.y + 60, { steps: 10 });
  await pg.mouse.up();
  if (process.env.DEPURAR) { console.log("EN PROCESO:", (await col("En proceso").innerText()).replace(/\s+/g, " ").slice(0, 300)); console.log("POR HACER:", (await col("Por hacer").innerText()).replace(/\s+/g, " ").slice(0, 300)); }
  await col("En proceso").getByRole("button", { name: /Decorar el comedor/ }).waitFor();
  assert.equal(await col("Por hacer").getByRole("button", { name: /Decorar el comedor/ }).count(), 0);

  // Abrir una tarea en revisión y aprobarla.
  await col("En revisión").getByRole("button", { name: /Permiso de protección civil/ }).click();
  const dlg = pg.getByRole("dialog");
  await dlg.getByText("Ya quedó entregado").waitFor();
  await dlg.getByRole("button", { name: "Aprobar y terminar" }).click();
  await pg.keyboard.press("Escape");
  await col("Hecho").getByRole("button", { name: /Permiso de protección civil/ }).waitFor();

  // Crear una tarea nueva.
  await pg.getByRole("button", { name: "Nueva tarea" }).click();
  await dlg.getByLabel("Qué hay que hacer").fill("Revisar extintores");
  await dlg.getByLabel("Responsable").selectOption({ label: "Juan Pérez · Almacenista" });
  await dlg.getByLabel("Fecha límite").fill(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date()));
  await dlg.getByLabel("Paso 1", { exact: true }).fill("Ver fecha de carga");
  await dlg.getByRole("button", { name: "Crear y asignar" }).click();
  await col("Por hacer").getByRole("button", { name: /Revisar extintores/ }).waitFor();

  // Filtro por proyecto.
  await pg.getByLabel("Proyecto").selectOption({ label: "Temporada navideña" });
  assert.equal(await col("Por hacer").getByRole("button", { name: /Revisar extintores/ }).count(), 0, "la tarea suelta no sale en el proyecto");
  await pg.getByLabel("Proyecto").selectOption("todos");

  // Proyectos: tarjeta con avance y su tablero.
  await pg.getByRole("button", { name: "Proyectos", exact: true }).click();
  await pg.getByRole("button", { name: /Apertura sucursal Norte/ }).click();
  await pg.getByText(/2 de 4 tareas/).first().waitFor();
  await captura(pg, "tareas-proyecto");
  await pg.getByRole("button", { name: "Todos los proyectos" }).click();
  await captura(pg, "tareas-proyectos");

  // Checklists: editor con peso → «Vale» en %.
  await pg.getByRole("button", { name: "Checklists", exact: true }).click();
  await pg.getByRole("button", { name: /Cierre y corte de caja/ }).click();
  await pg.getByText("El peso dice cuánto vale cada punto").waitFor();
  const vale = await pg.locator("tbody tr").first().locator("td").nth(4).innerText();
  assert.equal(vale.trim(), "33.3%", "corte de caja pesa 3 de 9");
  await captura(pg, "tareas-checklist-editor");
  await pg.getByRole("button", { name: "Cancelar" }).click();

  // Revisar: marcar un punto «No cumple» baja la calificación; aprobar.
  await pg.getByRole("button", { name: /^Revisar/ }).click();
  await pg.getByRole("list", { name: "Por revisar" }).waitFor();
  const panelCalif = async () => Number((await pg.locator("p.text-2xl").first().innerText()).replace("%", ""));
  const antes = await panelCalif();
  const grupo = pg.getByRole("group", { name: /¿Cumple/ }).first();
  await grupo.getByRole("button", { name: "Cumple", exact: true }).click();
  const conTodo = await panelCalif();
  await grupo.getByRole("button", { name: "No cumple" }).click();
  const sinUno = await panelCalif();
  assert.ok(sinUno < conTodo, `no cumple baja la calificación (${antes} → ${conTodo} → ${sinUno})`);
  await captura(pg, "tareas-revisar");
  const pendientesAntes = await pg.getByRole("list", { name: "Por revisar" }).getByRole("listitem").count();
  await pg.getByRole("button", { name: /Aprobar con/ }).click();
  await pg.getByText(/Aprobado con/).waitFor();
  assert.equal(await pg.getByRole("list", { name: "Por revisar" }).getByRole("listitem").count(), pendientesAntes - 1);

  // Cumplimiento + Excel.
  await pg.getByRole("button", { name: "Cumplimiento", exact: true }).click();
  await pg.getByRole("cell", { name: /Ana Torres/ }).waitFor();
  await captura(pg, "tareas-cumplimiento");
  const [descarga] = await Promise.all([pg.waitForEvent("download"), pg.getByRole("button", { name: "Exportar a Excel" }).click()]);
  assert.match(descarga.suggestedFilename(), /Cumplimiento checklists.*\.xlsx$/);
  assert.ok(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "sin desborde en escritorio");
  await ctx.close();

  // ===== Empleado en celular =====
  const ce = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: true });
  await ce.addCookies([{ name: "token", value: jwt("Empleado"), url: base }]);
  await rutas(ce, { id_usuario: 15, id_empleado: 15, tipo_usuario: "Empleado", nombre: "Ana Torres", empresas: [7] });
  const pe = await ce.newPage();
  pe.on("pageerror", (e) => errores.push(e.message));
  await pe.goto(base + "/empleado/panel/tareas", { waitUntil: "domcontentloaded" });
  await pe.getByRole("heading", { name: "Mis tareas" }).waitFor({ timeout: 30000 });
  assert.equal(await pe.getByRole("link", { name: "Tareas" }).getAttribute("aria-current"), "page");
  await captura(pe, "app-mis-tareas");

  // Tarea: mandar a revisión.
  await pe.getByRole("button", { name: /Armar turnos extra/ }).click();
  const mandar = pe.getByRole("button", { name: "Mandar a revisión" });
  assert.equal(await mandar.isDisabled(), true);
  await pe.getByText("Te faltan 2 pasos.").waitFor();
  await pe.getByText("Preguntar disponibilidad").click();
  await pe.getByText("Publicar turnos").click();
  await mandar.click();
  await pe.getByText("Listo, tu jefe ya puede revisarla.").waitFor();
  await pe.getByRole("button", { name: "Mis tareas" }).click();

  // Checklist de cierre: obligatorios + foto, y enviar.
  await pe.getByRole("button", { name: /Cierre y corte de caja/ }).click();
  const enviar = pe.getByRole("button", { name: /Enviar terminado/ });
  await pe.getByText("Faltan 3 puntos obligatorios.").waitFor();
  for (const t of ["Corte de caja cuadrado", "Gas cerrado", "Alarma activada", "Basura fuera"]) await pe.getByText(t, { exact: true }).click();
  await pe.getByText("Faltan 1 foto.").waitFor();
  await pe.locator('input[type="file"]').first().setInputFiles({ name: "gas.png", mimeType: "image/png", buffer: PNG });
  await pe.getByRole("img", { name: "Foto de Gas cerrado" }).waitFor();
  assert.match(await enviar.innerText(), /88.9%/, "pesos 3+2+2+1 de 9: cocina limpia sin marcar");
  await captura(pe, "app-checklist");
  assert.ok(await pe.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde en celular");
  await enviar.click();
  await pe.getByText("Checklist enviado").waitFor();
  await ce.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK prototipo tareas: tablero (arrastrar, aprobar, crear, filtro por proyecto), proyectos, checklist con peso, revisar recalcula y aprueba, cumplimiento + Excel; app: mandar a revisión, checklist con obligatorios y foto");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
