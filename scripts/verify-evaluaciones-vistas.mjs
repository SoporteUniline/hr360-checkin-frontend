// Verificación en navegador (23/11/2026): en Evaluación de desempeño cada vista tiene su dirección y su entrada en el
// menú (Campañas, Plantillas, Por responder y Configuración con Valores iniciales · Niveles · Acceso al módulo).
// Revisa: entradas del menú según los permisos del servidor, que cada ruta abra su vista, el resaltado del menú,
// las direcciones viejas y que quien no tiene permiso no vea la entrada ni pueda abrir la ruta. Backend simulado.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx npm run build
//      && node scripts/verify-evaluaciones-vistas.mjs   (CAPTURAS=<carpeta> guarda capturas)
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
// Captura con el grupo del menú a la vista.
const captura = async (pg, nombre) => {
  if (!process.env.CAPTURAS) return;
  await pg.locator("[data-sidebar=\"content\"] div.mt-1\\.5").filter({ hasText: "Evaluación de desempeño" }).first().scrollIntoViewIfNeeded();
  await pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png` });
};

function token(tipo) {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}

const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const empleado = { ...usuario, tipo_usuario: "Empleado", id_empleado: 101, nombre: "Colaborador Prueba" };
// Igual que modules/performance/services/profiles.js del backend.
const SCOPES = {
  hr: ["templates", "catalogs", "levels", "people", "settings", "permissions", "campaigns", "assignments", "team", "results", "dashboard", "plans"],
  direction: ["catalogs", "people", "campaigns", "results", "dashboard", "plans"],
  employee: ["people", "assignments", "results", "plans"],
};
const settings = { employeeScore: true, employeeCategories: true, employeeComments: true, employeePlan: true, managerResults: true, requireApproval: true, requireReceipt: true, anonymousPeers: true, anonymousAscending: true, minimumResponses: 3 };
let perfil = "hr", pendientes = 0, quien = usuario;
let exito = false, pagina = null;
const fallidas = [];
const errores = [];
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  const page = await ctx.newPage();
  pagina = page;
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("requestfailed", (r) => fallidas.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
  if (process.env.DEPURAR) page.on("request", (r) => console.log("pide:", r.method(), r.url()));
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type,idempotency-key", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" };
  const lista = (data) => ({ data, pagination: { page: 1, pageSize: 25, total: data.length } });
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (data) => route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return json({ user: quien });
    const prefijo = "/checador/evaluaciones-desempeno";
    if (!p.startsWith(prefijo)) return json({});
    const e = p.slice(prefijo.length);
    if (e === "/capabilities") return json({ data: {
      profile: perfil, employeeId: perfil === "employee" ? 101 : null, userId: perfil === "employee" ? null : -1, scopes: SCOPES[perfil],
      flags: { canViewCampaigns: perfil !== "employee", canManageCampaigns: perfil === "hr", canManageTemplates: perfil === "hr" },
      settings, limits: { templateName: 160, comment: 4000 } } });
    if (e === "/my/assignments") return json({ data: [], pagination: { page: 1, pageSize: 25, total: pendientes } });
    if (e === "/settings") return json({ data: { config: settings, version: 1, persisted: true } });
    if (e === "/levels") return json({ data: [{ id: 1, name: "Operativo", order: 1 }] });
    if (e === "/dashboard") return json({ data: { summary: { assignments: 0, submitted: 0, average: null } } });
    if (e === "/catalogs") return json({ data: { areas: [], positions: [], branches: [], levels: [], timezone: "America/Mexico_City" } });
    return json(lista([]));
  });
  const menu = page.locator('[data-sidebar="content"]').first();
  // El grupo «Evaluación de desempeño» del menú: su título y sus entradas (hay otra «Plantillas» en Gestión documental).
  const grupo = menu.locator("div.mt-1\\.5").filter({ has: page.getByRole("button", { name: "Evaluación de desempeño", exact: true }) });
  const entradas = async () => (await grupo.locator("[data-sidebar='menu-button']").allInnerTexts()).map((t) => t.trim());
  const entrada = (t) => grupo.getByRole("button", { name: t, exact: true });
  const resaltada = async () => {
    const activas = [];
    for (const t of await entradas()) if (/text-\[#1d4ed8\]/.test(await entrada(t).getAttribute("class"))) activas.push(t);
    return activas;
  };
  const grupoActivo = async () => /text-\[#2563EB\]/.test(await grupo.getByRole("button", { name: "Evaluación de desempeño", exact: true }).getAttribute("class"));
  const pestanas = () => page.locator(".ev-topbar .ev-nav a").allInnerTexts();
  const ir = (ruta) => page.goto(base + ruta, { waitUntil: "domcontentloaded" });
  const titulo = (t) => page.getByRole("heading", { level: 1, name: t, exact: true }).waitFor({ timeout: 30000 });
  // Espera a que el menú ya haya leído los permisos (se oculta lo que no corresponde).
  const esperarEntradas = async (esperadas) => {
    for (let i = 0; i < 100 && JSON.stringify(await entradas()) !== JSON.stringify(esperadas); i++) await dormir(100);
    assert.deepEqual(await entradas(), esperadas);
  };

  // 1) RH sin evaluaciones por responder.
  await ctx.addCookies([{ name: "token", value: token("Recruiter"), url: base }]);
  await ir("/panel/evaluaciones");
  await page.waitForURL("**/panel/evaluaciones/campanas", { timeout: 30000 });
  await titulo("Campañas de evaluación");
  await esperarEntradas(["Campañas", "Plantillas", "Configuración"]);
  assert.deepEqual(await pestanas(), ["Campañas", "Plantillas", "Configuración"]);
  assert.deepEqual(await resaltada(), ["Campañas"]);
  assert.ok(await grupoActivo(), "grupo Evaluación de desempeño activo");
  await captura(page, "evaluaciones-campanas");
  console.log("PASS: la entrada del módulo abre Campañas y el menú muestra Campañas, Plantillas y Configuración");

  // Cada entrada del menú abre su vista y queda resaltada.
  const vistas = [
    ["Plantillas", "/panel/evaluaciones/plantillas", "Plantillas de evaluación"],
    ["Configuración", "/panel/evaluaciones/configuracion", "Configuración de evaluaciones"],
    ["Campañas", "/panel/evaluaciones/campanas", "Campañas de evaluación"],
  ];
  for (const [t, ruta, h1] of vistas) {
    await entrada(t).click();
    await page.waitForURL(`**${ruta}`, { timeout: 30000 });
    await titulo(h1);
    assert.deepEqual(await resaltada(), [t], `${t} resaltada`);
    assert.equal(await page.locator('.ev-topbar .ev-nav a[aria-current="page"]').innerText(), t);
  }
  console.log("PASS: cada entrada del menú abre su vista con su dirección y queda resaltada");

  // Configuración: tres secciones con su dirección; el menú sigue en «Configuración».
  const secciones = [
    ["Valores iniciales", "/panel/evaluaciones/configuracion", "Permisos y confidencialidad", "Guardar preferencias"],
    ["Niveles", "/panel/evaluaciones/configuracion/niveles", "Niveles jerárquicos", "Guardar nivel"],
    ["Acceso al módulo", "/panel/evaluaciones/configuracion/acceso", "Acceso de RH y Dirección", "Asignar permiso"],
  ];
  const sub = page.getByRole("navigation", { name: "Secciones de configuración" });
  for (const [t, ruta, panel, boton] of secciones) {
    await ir(ruta);
    await titulo("Configuración de evaluaciones");
    await page.getByRole("heading", { name: panel, exact: true }).waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: boton, exact: true }).waitFor();
    assert.equal(await sub.locator('a[aria-current="page"]').innerText(), t);
    // Cada sección muestra solo lo suyo.
    for (const [, , otro] of secciones) if (otro !== panel) assert.equal(await page.getByRole("heading", { name: otro, exact: true }).count(), 0, `${otro} no debe verse en ${t}`);
    await esperarEntradas(["Campañas", "Plantillas", "Configuración"]);
    assert.deepEqual(await resaltada(), ["Configuración"]);
    if (t === "Niveles") await captura(page, "evaluaciones-configuracion-niveles");
  }
  await sub.getByRole("link", { name: "Acceso al módulo", exact: true }).click();
  await page.waitForURL("**/configuracion/acceso");
  await sub.getByRole("link", { name: "Valores iniciales", exact: true }).click();
  await page.waitForURL(/\/panel\/evaluaciones\/configuracion$/);
  await page.getByRole("heading", { name: "Permisos y confidencialidad", exact: true }).waitFor();
  await ir("/panel/evaluaciones/configuracion/otra");
  await page.getByText("Vista no encontrada", { exact: true }).waitFor({ timeout: 30000 });
  console.log("PASS: Configuración separada en Valores iniciales, Niveles y Acceso al módulo, cada una con su dirección");

  // Una vista de detalle mantiene resaltada su entrada.
  await ir("/panel/evaluaciones/campanas/nueva");
  await page.locator(".ev-module").waitFor({ timeout: 30000 });
  await esperarEntradas(["Campañas", "Plantillas", "Configuración"]);
  assert.deepEqual(await resaltada(), ["Campañas"]);
  assert.equal(await page.getByText("Vista no encontrada").count(), 0);
  console.log("PASS: el detalle (nueva campaña) resalta Campañas");

  // Direcciones viejas → vista nueva.
  for (const vieja of ["/panel/evaluaciones/tablero", "/panel/evaluaciones/resultados", "/panel/evaluaciones/seguimiento", "/panel/evaluaciones"]) {
    await ir(vieja);
    await page.waitForURL("**/panel/evaluaciones/campanas", { timeout: 30000 });
  }
  console.log("PASS: direcciones viejas (Tablero, Resultados, Seguimiento y la entrada) llevan a Campañas");

  // 2) RH con una evaluación asignada: aparece «Por responder» (menú y pestaña).
  pendientes = 1;
  await ir("/panel/evaluaciones/campanas");
  await titulo("Campañas de evaluación");
  await esperarEntradas(["Campañas", "Plantillas", "Por responder", "Configuración"]);
  await entrada("Por responder").click();
  await page.waitForURL("**/panel/evaluaciones/mis-pendientes");
  await titulo("Por responder");
  assert.deepEqual(await resaltada(), ["Por responder"]);
  assert.deepEqual(await pestanas(), ["Campañas", "Plantillas", "Por responder", "Configuración"]);
  await captura(page, "evaluaciones-por-responder");
  console.log("PASS: con evaluaciones asignadas aparece Por responder en el menú y en las pestañas");

  // 3) Perfil sin permiso de plantillas ni configuración (Dirección, solo consulta): no ve esas entradas ni abre sus rutas.
  perfil = "direction"; pendientes = 0;
  await ir("/panel/evaluaciones/campanas");
  await titulo("Campañas de evaluación");
  await esperarEntradas(["Campañas"]);
  assert.deepEqual(await pestanas(), ["Campañas"]);
  for (const ruta of ["/panel/evaluaciones/plantillas", "/panel/evaluaciones/configuracion", "/panel/evaluaciones/configuracion/niveles", "/panel/evaluaciones/configuracion/acceso"]) {
    await ir(ruta);
    await page.getByText("No tienes acceso a esta sección", { exact: true }).waitFor({ timeout: 30000 });
  }
  console.log("PASS: sin permiso no se ve la entrada ni se abre la ruta (Plantillas y Configuración)");

  // 4) Colaborador (cuenta de empleado): el panel de RH no se abre y en su portal no hay Configuración.
  perfil = "employee"; quien = empleado;
  await ctx.clearCookies();
  await ctx.addCookies([{ name: "token", value: token("Empleado"), url: base }]);
  await ir("/panel/evaluaciones/configuracion");
  await page.waitForURL((u) => !u.pathname.startsWith("/panel"), { timeout: 30000 });
  await ir("/empleado/panel/evaluaciones/configuracion");
  await page.getByText("No tienes acceso a esta sección", { exact: true }).waitFor({ timeout: 30000 });
  assert.deepEqual(await pestanas(), ["Por responder", "Mis resultados"]);
  console.log("PASS: el colaborador no abre el panel de RH ni la configuración en su portal");

  const hidratacion = errores.filter((m) => m.includes("Minified React error #418"));
  if (hidratacion.length) console.log(`AVISO: ${hidratacion.length} error(es) #418 de hidratación del panel (pendiente conocido, ver docs/evaluaciones/menos-vistas.md)`);
  assert.deepEqual(errores.filter((m) => !hidratacion.includes(m)), []);
  exito = true;
  console.log("OK: Evaluación de desempeño con una dirección y una entrada del menú por vista");
} finally {
  // Si algo falla, deja a la vista dónde se quedó la página.
  if (!exito && pagina) console.error("Se quedó en", pagina.url(), "→", (await pagina.locator("main").innerText().catch(() => "")).slice(0, 300), "\nPeticiones fallidas:", fallidas.slice(-10));
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
