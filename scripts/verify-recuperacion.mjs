// Verificación en navegador de la recuperación de contraseña: el código se verifica con el
// correo y el cambio de contraseña lleva el token de recuperación que da el backend.
// Backend simulado, nada sale a internet. Uso: npm run build && node scripts/verify-recuperacion.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { stdio: "ignore", env: { ...process.env, JWT_SECRET: randomUUID() } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const pedidos = {};
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: "es-MX" });
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (p.endsWith("/otp/send")) { pedidos.enviar = JSON.parse(req.postData() || "{}"); return json({ success: true }); }
    if (p.endsWith("/otp/verify")) { pedidos.verificar = JSON.parse(req.postData() || "{}"); return json({ success: true, message: "Verificación exitosa", recovery_token: "token-de-recuperacion" }); }
    if (p.includes("/users/update-password-recovery/")) { pedidos.cambiar = { ruta: decodeURIComponent(p), cuerpo: JSON.parse(req.postData() || "{}") }; return json({ email: "ana@empresa.mx" }); }
    return json({});
  });

  await page.goto(base + "/recuperacion", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("ejemplo@empresa.com").fill("ana@empresa.mx");
  await page.getByPlaceholder("10 dígitos (ej. 5512345678)").fill("3312345678");
  await page.getByRole("button", { name: "Enviar código" }).click();
  await page.getByRole("button", { name: "Verificar código" }).waitFor({ timeout: 15000 });
  await page.locator("input[data-input-otp]").first().fill("123456");
  await page.getByRole("button", { name: "Verificar código" }).click();
  for (let i = 0; i < 60 && !pedidos.verificar; i++) await dormir(100);
  assert.deepEqual(pedidos.verificar, { telefono: "3312345678", code: "123456", recovery: true, correo: "ana@empresa.mx" });

  await page.getByPlaceholder("Ingresa tu nueva contraseña").fill("corta");
  await page.getByPlaceholder("Repite la nueva contraseña").fill("corta");
  await page.locator('button[type="submit"]').last().click();
  await page.getByText("La contraseña debe tener al menos 8 caracteres.").waitFor({ timeout: 5000 });
  assert.equal(pedidos.cambiar, undefined, "no se manda una contraseña corta");

  await page.getByPlaceholder("Ingresa tu nueva contraseña").fill("NuevaSegura2026");
  await page.getByPlaceholder("Repite la nueva contraseña").fill("NuevaSegura2026");
  await page.locator('button[type="submit"]').last().click();
  for (let i = 0; i < 60 && !pedidos.cambiar; i++) await dormir(100);
  assert.match(pedidos.cambiar.ruta, /update-password-recovery\/ana@empresa\.mx$/);
  assert.deepEqual(pedidos.cambiar.cuerpo, { password: "NuevaSegura2026", confirmPassword: "NuevaSegura2026", recovery_token: "token-de-recuperacion" });
  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK recuperación: verifica con correo, exige 8 caracteres y manda el token de recuperación");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
