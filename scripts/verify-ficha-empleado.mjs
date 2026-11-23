// Verificación en navegador: ficha del empleado en 5 pestañas (23/11/2026). Backend simulado.
// Revisa: pestañas Personal · Trabajo · Checador y acceso · Pago · Documentos; CURP/RFC/NSS una sola vez; estado civil sin
// «sin-seleccion»; «Cambiar contraseña» en Checador; un error lleva a su pestaña; en teléfono las pestañas llevan nombre.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-ficha-empleado.mjs
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
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true }) : null);

function token() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}

const empresa = { id_empresa: 10, nombre: "Empresa prueba", nombre_empresa: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const emp = { id_empleado: 15, id_empresa: 10, nombre: "Ana", apellido_paterno: "Torres", apellido_materno: "Ruiz", correo: "ana@prueba.mx", estado: "Activo",
  puesto: "Cajera", departamento: "Piso", nip: "1234", telefono: "3312345678", fecha_ingreso: "2025-01-10", nombre_empresa: "Empresa prueba",
  curp: "TORA900101MJCRRN01", rfc: "TORA900101AB1", nss: "12345678901", estado_civil: "sin-seleccion", horarios: [] };
const errores = [];
let exito = false;
const browser = await chromium.launch();

async function abrir(viewport) {
  const ctx = await browser.newContext({ viewport, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p === "/checador/empleados/15") return json(emp);
    if (p === "/checador/empleados") return json({ data: [emp], total: 1, page: 1, totalPages: 1 });
    return json({});
  });
  return page;
}

try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const page = await abrir({ width: 1440, height: 900 });
  await page.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  const editar = page.getByTitle("Editar").first();
  await editar.waitFor({ timeout: 30000 });
  await editar.click();
  const tabs = page.getByRole("tab");
  await page.getByRole("tab", { name: "Personal" }).waitFor();
  assert.deepEqual((await tabs.allInnerTexts()).map((t) => t.trim()), ["Personal", "Trabajo", "Checador y acceso", "Pago", "Documentos"]);
  const panel = page.locator("main");
  await panel.getByText("CURP", { exact: true }).waitFor();
  for (const etiqueta of ["CURP", "RFC"]) assert.equal(await panel.getByText(etiqueta, { exact: true }).count(), 1, `${etiqueta} una sola vez`);
  assert.equal(await page.getByText("sin-seleccion").count(), 0, "estado civil no muestra «sin-seleccion»");
  assert.equal(await page.getByText("Documentos oficiales").count(), 0, "ya no está el bloque repetido");
  await captura(page, "ficha-personal");

  await page.getByRole("tab", { name: "Trabajo" }).click();
  await panel.getByText("Puesto y organización").waitFor();
  assert.equal(await panel.getByText("Método de chequeo").count(), 0, "el checador no sale en Trabajo");
  await captura(page, "ficha-trabajo");

  await page.getByRole("tab", { name: "Checador y acceso" }).click();
  await panel.getByRole("heading", { name: "Checador y acceso" }).or(panel.getByText("Checador y acceso", { exact: true })).first().waitFor();
  await panel.getByRole("button", { name: "Cambiar contraseña" }).waitFor();
  assert.equal(await panel.getByText("Puesto y organización").count(), 0, "el puesto no sale en Checador");
  await captura(page, "ficha-checador");

  await page.getByRole("tab", { name: "Pago" }).click();
  await panel.getByText(/Cuentas bancarias|Cuenta bancaria/).first().waitFor();
  await captura(page, "ficha-pago");

  // Alta: guardar vacío desde «Pago» regresa a «Personal» (el primer error es el nombre).
  await page.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Nuevo empleado" }).first().click();
  await page.getByRole("tab", { name: "Pago" }).click();
  await page.getByRole("button", { name: "Registrar" }).click();
  await page.waitForFunction(() => document.querySelector('[role="tab"][data-state="active"]')?.textContent?.trim() === "Personal", null, { timeout: 5000 });
  assert.equal(await page.getByRole("tab", { name: "Documentos" }).count(), 0, "en alta no hay Documentos sin campos");
  assert.equal(await page.locator("main").getByRole("button", { name: "Cambiar contraseña" }).count(), 0);
  await captura(page, "ficha-alta-error");

  // Teléfono: las pestañas se ven con su nombre (antes solo el ícono).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Checador y acceso" }).waitFor();
  await dormir(500);
  for (const t of ["Personal", "Trabajo"]) assert.equal(await page.getByRole("tab", { name: t }).getByText(t).isVisible(), true, `${t} con nombre en teléfono`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "sin scroll horizontal de la página");
  await captura(page, "ficha-movil");
  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK: ficha en 5 pestañas (sin CURP/RFC repetidos, sin «sin-seleccion», contraseña en Checador, error lleva a su pestaña)");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
