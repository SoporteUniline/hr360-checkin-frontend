// Verificación en navegador de la página de inicio (21/11/2026): portada sincronizada (la checada pasa por
// rostro → GPS → registro y la fila llega al panel), números que cuentan desde 0, reporte semanal con
// notificaciones, sin errores, sin desbordes en celular y sin animaciones vivas al salir de la página.
// Las llamadas a otros dominios se bloquean (nada sale a internet). Uso: npm run build && node scripts/verify-landing.mjs
import assert from "node:assert/strict";
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
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore" });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX" });
  await ctx.route("**/*", (route) => (new URL(route.request().url()).origin === base ? route.continue() : route.abort()));
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });

  // Portada: el título y las fotos.
  await page.getByRole("heading", { level: 1, name: /Tu gente checa\.\s*Tú tienes el control\./ }).waitFor();
  assert.equal(await page.locator('img[src^="/landing/"]').count() >= 6, true, "fotos de /public/landing");

  // Checada: rostro (malla) → GPS (la distancia baja hasta 38 m) → registro; la fila llega al panel y suben los presentes.
  const scr = page.locator("#h-scr");
  await page.waitForFunction(() => document.getElementById("h-scr").classList.contains("mesh-on"), null, { timeout: 4000 });
  await page.waitForFunction(() => document.getElementById("h-scr").classList.contains("gps"), null, { timeout: 4000 });
  await page.waitForFunction(() => document.getElementById("h-dist").textContent === "38", null, { timeout: 4000 });
  await page.waitForFunction(() => document.getElementById("h-scr").classList.contains("done"), null, { timeout: 4000 });
  assert.match(await scr.locator("#h-ok-who").innerText(), /Entrada registrada · Ana Torres/);
  await page.waitForFunction(() => document.querySelector("#h-rows .trow b").textContent === "Ana Torres", null, { timeout: 3000 });
  assert.equal(await page.locator("#k-pres-n").innerText(), "22");

  // Horas extra: las cifras arrancan en 0 y llegan a 13 h 30 min autorizadas.
  const hx = page.locator("#hx-block .stats b").first();
  assert.equal(await hx.innerText(), "0 h", "antes de verse empieza en 0");
  await page.locator("#hx-block").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("#hx-block .stats b").textContent === "13 h 30 min", null, { timeout: 4000 });

  // Reporte semanal: avanza a sábado y llegan las notificaciones (correo y alertas del panel).
  await page.locator("#wk").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.getElementById("wk-day").textContent === "Sábado", null, { timeout: 12000 });
  await page.getByText("Ana Torres pasó del límite semanal").waitFor();
  await page.getByText("Correo · Regla de aviso").first().waitFor();
  assert.equal(await page.locator(".wk-row.ex").count(), 2, "Ana y Carlos exceden 46 h");

  // Módulos: 36 herramientas en 5 grupos.
  await page.locator("#allm").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".cnt").textContent === "36", null, { timeout: 4000 });
  assert.equal(await page.locator("#allm li").count(), 36);

  // El asistente comercial de antes sigue en la página.
  await page.getByText("asistente comercial de ADAMIA").first().waitFor({ timeout: 4000 });

  // Enlaces: demo → /contacto, sesión → /login. Al salir no quedan animaciones vivas (sin errores).
  assert.equal(await page.locator(".top-actions a.btn").getAttribute("href"), "/contacto");
  await page.locator(".top-actions .login").click();
  await page.waitForURL("**/login");
  await dormir(3000);

  // Celular: sin desbordes horizontales.
  const movil = await ctx.newPage();
  movil.on("pageerror", (e) => errores.push(e.message));
  await movil.setViewportSize({ width: 390, height: 844 });
  await movil.goto(base + "/", { waitUntil: "domcontentloaded" });
  await dormir(1500);
  assert.equal(await movil.evaluate(() => document.documentElement.scrollWidth), 390, "sin desborde en celular");

  // Reducir movimiento: todo queda en su estado final.
  const quieto = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  await quieto.route("**/*", (route) => (new URL(route.request().url()).origin === base ? route.continue() : route.abort()));
  const pq = await quieto.newPage();
  pq.on("pageerror", (e) => errores.push(e.message));
  await pq.goto(base + "/", { waitUntil: "domcontentloaded" });
  await pq.waitForFunction(() => document.querySelector("#hx-block .stats b").textContent === "13 h 30 min", null, { timeout: 4000 });
  await quieto.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK página de inicio: checada rostro → GPS → registro sincronizada con el panel, cifras desde 0, reporte semanal con notificaciones, 36 módulos, enlaces, celular y reducir movimiento");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
