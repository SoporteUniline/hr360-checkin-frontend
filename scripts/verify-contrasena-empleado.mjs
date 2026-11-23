// Verificación en navegador: Empleados → «Cambiar contraseña» (23/11/2026) y títulos de módulo del menú. Backend simulado.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-contrasena-empleado.mjs
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
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png` }) : null);

function token() {
  // Sin id_empresa: el layout de RH no consulta la base de datos (ver panel/layout.jsx).
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}


const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const emp = { id_empleado: 15, id_empresa: 10, nombre: "Ana", apellido_paterno: "Torres", apellido_materno: "", correo: "ana@prueba.mx", estado: "Activo", puesto: "Cajera", departamento: "Piso", nip: "1234", telefono: "3312345678", fecha_ingreso: "2025-01-10", nombre_empresa: "Empresa prueba" };
let exito = false;
const errores = [];
const puts = [];
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
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
    if (p === "/checador/empleados/15/contrasena" && req.method() === "PUT") { puts.push(req.postDataJSON()); return json({ ok: true, correo: "ana@prueba.mx" }); }
    if (p === "/checador/empleados") return json({ data: [emp], total: 1, page: 1, totalPages: 1 });
    return json({});
  });
  await page.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  const llave = page.getByRole("button", { name: "Cambiar contraseña de Ana Torres" });
  await llave.waitFor({ timeout: 30000 });
  await captura(page, "menu-titulos");
  await llave.click();
  const dlg = page.getByRole("dialog", { name: "Cambiar contraseña" });
  await dlg.waitFor();
  await dlg.getByLabel("Nueva contraseña").fill("corta1");
  await dlg.getByText("Al menos 8 caracteres.").waitFor();
  assert.equal(await dlg.getByRole("button", { name: "Cambiar contraseña" }).isDisabled(), true);
  await dlg.getByRole("button", { name: "Generar una segura" }).click();
  const generada = await dlg.getByLabel("Nueva contraseña").inputValue();
  assert.match(generada, /^(?=.*[A-Za-z])(?=.*\d).{10}$/, `generada: ${generada}`);
  await dlg.getByRole("button", { name: "Cambiar contraseña" }).click();
  await dlg.getByText("Listo. Ya puede entrar con:").waitFor();
  await dlg.getByText("ana@prueba.mx").waitFor();
  assert.deepEqual(puts, [{ contrasena: generada }], "solo manda la contraseña");
  await captura(page, "cambiar-contrasena");
  await dlg.getByRole("button", { name: "Cerrar" }).click();
  await dormir(400);
  assert.equal(await page.getByRole("dialog").count(), 0, "no abre la ficha del renglón");
  // Menú: títulos de módulo en texto normal (no MAYÚSCULAS) y el de la página actual resaltado.
  const titulo = page.getByRole("button", { name: "Gestión de personal" });
  await titulo.waitFor();
  assert.match(await titulo.getAttribute("class"), /text-\[#2563EB\]/, "el módulo de Empleados aparece activo");
  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK: cambiar contraseña desde Empleados (reglas, generar, solo manda la contraseña, no abre la ficha) y títulos del menú");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
