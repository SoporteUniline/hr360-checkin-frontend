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

  // Checklists: el peso de cada pregunta se ve en % del total.
  await pg.getByRole("button", { name: "Checklists", exact: true }).click();
  await pg.getByRole("button", { name: /Cierre y corte de caja/ }).click();
  await pg.getByText("= 33.3% del checklist").waitFor(); // corte de caja: peso 3 de 9
  await pg.getByRole("button", { name: "Cancelar" }).click();

  // Crear un checklist nuevo con varios tipos de pregunta.
  await pg.getByRole("button", { name: "Nuevo checklist" }).first().click();
  await pg.getByRole("button", { name: "Empezar en blanco" }).click();
  await pg.getByRole("button", { name: "Guardar y asignar" }).click();
  await pg.getByText("Ponle nombre al checklist.").waitFor();
  await pg.getByText("Escribe la pregunta.").waitFor();
  await pg.getByLabel("Nombre del checklist").fill("Revisión de baños");
  await pg.getByLabel("Pregunta 1", { exact: true }).fill("¿El área está ordenada?");
  const agregar = (tipo) => pg.getByRole("region", { name: "Preguntas" }).getByRole("button", { name: tipo, exact: true }).last().click(); // botones «Agregar pregunta» (los últimos)
  await agregar("Una opción");
  await pg.getByLabel("Pregunta 2", { exact: true }).fill("¿Cómo está el área B?");
  await agregar("Varias opciones");
  await pg.getByLabel("Pregunta 3", { exact: true }).fill("¿Qué tiene el baño?");
  await pg.getByLabel("Opción 1", { exact: true }).last().fill("Papel");
  await pg.getByLabel("Opción 2", { exact: true }).last().fill("Jabón");
  await agregar("Número");
  await pg.getByLabel("Pregunta 4", { exact: true }).fill("Temperatura del agua");
  await pg.getByLabel("Mínimo de la pregunta 4").fill("30");
  await pg.getByLabel("Máximo de la pregunta 4").fill("40");
  await pg.getByLabel("Unidad de la pregunta 4").fill("°C");
  await agregar("Texto largo");
  await pg.getByLabel("Pregunta 5", { exact: true }).fill("Observaciones");
  await agregar("Estrellas");
  await pg.getByLabel("Pregunta 6", { exact: true }).fill("¿Qué tan limpio se ve?");
  await agregar("Fecha");
  await pg.getByLabel("Pregunta 7", { exact: true }).fill("Caducidad del jabón");
  await pg.getByText("Solo se registra; no cuenta en el %.").first().waitFor();
  assert.equal(await pg.getByLabel("Peso de la pregunta 7").count(), 0, "una fecha no tiene peso");
  // Una opción sin 100 %: no deja guardar.
  await pg.getByLabel("Valor de la opción 1").first().fill("80");
  await pg.getByRole("button", { name: "Guardar y asignar" }).click();
  await pg.getByText("Alguna opción debe valer 100 % (la respuesta ideal).").waitFor();
  await pg.getByLabel("Valor de la opción 1").first().fill("100");
  // Vista previa: se contesta de prueba y da su %.
  const previa = pg.getByRole("complementary", { name: "Vista previa en el celular" });
  const pr = (texto) => previa.getByRole("listitem").filter({ hasText: texto });
  await pr("¿El área está ordenada?").getByRole("button", { name: "Sí", exact: true }).click();
  await pr("¿Cómo está el área B?").getByRole("button", { name: "Sucia", exact: true }).click();
  await pr("¿Qué tiene el baño?").getByRole("button", { name: "Papel" }).click();
  await pr("¿Qué tiene el baño?").getByRole("button", { name: "Jabón" }).click();
  await pr("Temperatura del agua").getByRole("spinbutton").fill("35");
  await pr("Caducidad del jabón").locator('input[type="date"]').fill("2026-12-31");
  await pr("¿Qué tan limpio se ve?").getByRole("radio", { name: "4 estrellas" }).click();
  await previa.getByText("76%", { exact: true }).waitFor(); // 5 de peso 1: 100+0+100+100+80 = 380/5; la fecha no cuenta
  await captura(pg, "tareas-checklist-editor");
  await pg.getByRole("button", { name: "Guardar y asignar" }).click();
  await pg.getByText("«Revisión de baños» quedó creado y asignado.").waitFor();
  await pg.getByRole("button", { name: /Revisión de baños/ }).waitFor();

  // Revisar: corregir una respuesta (decisión A) recalcula y queda el historial.
  await pg.getByRole("button", { name: /^Revisar/ }).click();
  await pg.getByRole("list", { name: "Por revisar" }).waitFor();
  const calif = async () => Number((await pg.locator("[data-calificacion]").innerText()).replace("%", ""));
  const antes = await calif();
  await pg.getByRole("button", { name: "Corregir «¿Cómo está el comedor?»" }).click();
  await pg.getByRole("button", { name: "Sucio", exact: true }).click();
  await pg.getByText(/tú lo corriges a «Sucio»/).waitFor();
  const despues = await calif();
  assert.ok(despues < antes || antes === 0, `corregir a «Sucio» baja la calificación (${antes} → ${despues})`);
  await pg.getByText(/con tus correcciones/).waitFor();
  await captura(pg, "tareas-revisar");
  const pendientesAntes = await pg.getByRole("list", { name: "Por revisar" }).getByRole("listitem").count();
  await pg.getByRole("button", { name: /Aprobar con/ }).click();
  await pg.getByText(/Aprobado con .*corregiste 1/).waitFor();
  assert.equal(await pg.getByRole("list", { name: "Por revisar" }).getByRole("listitem").count(), pendientesAntes - 1);

  // Cumplimiento + Excel.
  await pg.getByRole("button", { name: "Cumplimiento", exact: true }).click();
  await pg.getByRole("cell", { name: /Ana Torres/ }).waitFor();
  const fallas = pg.getByRole("region", { name: "Preguntas que más fallan" });
  await fallas.getByRole("cell", { name: "¿Cómo está el comedor?" }).waitFor();
  await pg.getByLabel("Sucursal").selectOption("Norte");
  assert.equal(await pg.getByRole("cell", { name: /Ana Torres/ }).count(), 0, "filtra por sucursal");
  await pg.getByLabel("Sucursal").selectOption("todas");
  await captura(pg, "tareas-cumplimiento");
  const [descargaPreguntas] = await Promise.all([pg.waitForEvent("download"), fallas.getByRole("button", { name: "Exportar preguntas" }).click()]);
  assert.match(descargaPreguntas.suggestedFilename(), /^Fallas por pregunta .*\.xlsx$/);
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

  // Checklist de cierre: preguntas de varios tipos, obligatorias y foto; la calificación se ve en vivo.
  await pe.getByRole("button", { name: /Cierre y corte de caja/ }).click();
  const enviar = pe.getByRole("button", { name: /Enviar terminado/ });
  await pe.getByText("Faltan 4 preguntas obligatorias.").waitFor();
  const preg = (t) => pe.getByRole("listitem").filter({ hasText: t });
  await preg("¿El corte de caja cuadró?").getByRole("button", { name: "Sí", exact: true }).click();
  await preg("Foto de las llaves del gas").locator('input[type="file"]').setInputFiles({ name: "gas.png", mimeType: "image/png", buffer: PNG });
  await preg("¿Cómo quedó la cocina?").getByRole("button", { name: "Limpia", exact: true }).click();
  await pe.getByText("Faltan 2 preguntas obligatorias y 1 foto.").waitFor();
  await preg("¿Cómo quedó la cocina?").locator('input[type="file"]').setInputFiles({ name: "cocina.png", mimeType: "image/png", buffer: PNG });
  await preg("¿Hay basura dentro del local?").getByRole("button", { name: "No", exact: true }).click();
  await preg("¿Quedó activada la alarma?").getByRole("button", { name: "Sí", exact: true }).click();
  // Firma con el dedo (obligatoria).
  const lienzo = preg("Firma de quien entrega la caja").getByLabel("Firma: Firma de quien entrega la caja");
  await lienzo.scrollIntoViewIfNeeded();
  const cf = await lienzo.boundingBox();
  await pe.mouse.move(cf.x + 30, cf.y + 60); await pe.mouse.down();
  for (let k = 1; k <= 10; k++) await pe.mouse.move(cf.x + 30 + k * 22, cf.y + 60 + Math.sin(k) * 25);
  await pe.mouse.up();
  await preg("Firma de quien entrega la caja").getByRole("button", { name: "Listo, firmar" }).click();
  await preg("Firma de quien entrega la caja").getByRole("img", { name: /Firma:/ }).waitFor();
  assert.match(await enviar.innerText(), /100%/);
  await preg("¿Cómo quedó la cocina?").getByRole("button", { name: "Regular", exact: true }).click();
  assert.match(await enviar.innerText(), /94\.4%/, "cocina «Regular» (50 %) con peso 1 de 9");
  await captura(pe, "app-checklist");
  assert.ok(await pe.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde en celular");
  await enviar.click();
  await pe.getByText("Checklist enviado").waitFor();
  await ce.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK prototipo tareas: tablero (arrastrar, aprobar, crear, filtro), proyectos, crear checklist con 7 tipos (validación y vista previa 76 % con estrellas), revisar corrigiendo una respuesta, cumplimiento por sucursal + preguntas que más fallan + Excel; app: mandar a revisión, checklist con tipos, obligatorias, fotos, firma y % en vivo");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
