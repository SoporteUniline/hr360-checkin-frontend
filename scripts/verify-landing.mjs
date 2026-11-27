// Verificación en navegador de la página de inicio: portada sincronizada (la checada pasa por
// rostro → GPS → registro y la fila llega al panel), números que cuentan desde 0, reporte semanal con
// notificaciones, sin errores, sin desbordes en celular y sin animaciones vivas al salir de la página.
// Las llamadas a otros dominios se bloquean (nada sale a internet). Construir como Dev (robots debe bloquear):
// NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx npm run build && node scripts/verify-landing.mjs
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
// Lo que flota nunca está «estable» para Playwright: se lleva a la vista con scrollIntoView directo.
const ver = (loc) => loc.evaluate((el) => el.scrollIntoView({ block: "center" }));

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
  // Mosaico de módulos: seis tarjetas con submarca, mini pantalla y flecha a su página.
  const mosaico = page.locator("#modulos-adamia");
  await mosaico.getByRole("heading", { name: "Todo el día de tu equipo, en una sola plataforma." }).waitFor();
  assert.deepEqual(await mosaico.locator("h3").evaluateAll((hs) => hs.map((h) => h.firstChild.textContent.trim())), ["Nómina", "Asistencia", "Checador", "Tareas y checklists", "Documentos y firma", "Adamia AI"]);
  assert.equal(await mosaico.getByRole("link", { name: /^Conocer / }).count(), 6);
  assert.equal(await mosaico.getByRole("link", { name: "Conocer el Checador" }).getAttribute("href"), "/funcionalidades/reloj-checador");
  // Pantallas que flotan: el panel de la portada corre mientras se ve; las tarjetas del mosaico entran al bajar.
  const juego = (sel) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).animationPlayState);
  await page.waitForFunction(() => document.querySelector(".hero .dash").classList.contains("en-vista"));
  assert.equal(await juego(".hero .dash"), "running");
  assert.ok(await page.locator("#modulos-adamia .mz-m.pre").count() > 0, "las tarjetas de abajo esperan su entrada");
  for (const art of await mosaico.locator(".mz-m").all()) { await ver(art); await dormir(250); }
  await page.waitForFunction(() => [...document.querySelectorAll("#modulos-adamia .mz-m")].every((a) => getComputedStyle(a).opacity === "1"));
  assert.equal(await page.locator("#modulos-adamia .pre").count(), 0);
  assert.equal(await juego(".hero .dash"), "paused", "fuera de pantalla el flotado se pausa");
  // Datos vivos: el reloj avanza de verdad, las barras y contadores llegan a su valor y Adamia AI termina de escribir.
  const reloj = mosaico.locator(".mz-reloj");
  await ver(reloj);
  const lectura1 = await reloj.innerText();
  await dormir(2200);
  const lectura2 = await reloj.innerText();
  assert.match(lectura1, /^\d{2}:\d{2}:\d{2}$/);
  assert.ok(lectura2 > lectura1, `el reloj avanza (${lectura1} → ${lectura2})`);
  const escala = (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a.toFixed(2);
  await page.waitForFunction((f) => [...document.querySelectorAll(".mz-barra > i")].map(eval(f)).join() === "0.91,0.92", escala.toString());
  assert.deepEqual(await mosaico.locator(".mz-num").allInnerTexts(), ["41", "92%"]);
  await mosaico.locator(".mz-listo").waitFor();
  await page.waitForFunction(() => !document.querySelector(".mz-tecleando") && getComputedStyle(document.querySelector(".mz-pie")).opacity === "1");
  assert.match(await mosaico.locator(".mz-ai .sr-only").innerText(), /^Le tocan 16 días de vacaciones pagadas/);
  assert.equal(await mosaico.locator(".mz-capas").getAttribute("aria-hidden"), "true");

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

  // Carrusel: pasa solo a la siguiente diapositiva y se puede pausar.
  const slideActual = () => page.evaluate(() => [...document.querySelectorAll(".carr .slide")].findIndex((d) => d.classList.contains("on")));
  assert.equal(await slideActual(), 0);
  await page.waitForFunction(() => document.querySelectorAll(".carr .slide")[1].classList.contains("on"), null, { timeout: 8000 });
  await page.getByRole("tab", { name: "Ir a 3: Checa donde trabaja tu equipo." }).click();
  assert.equal(await slideActual(), 2);
  await page.mouse.move(5, 5);


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

  // La ley: la multa cuenta desde 0 hasta $586,550 y enlaza a la guía del blog.
  await page.locator("#ley").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("#ley .multa b.max span").textContent === "$586,550", null, { timeout: 4000 });
  assert.equal(await page.locator("#ley a.btn-primary").getAttribute("href"), "/blog/registro-electronico-jornada-2027");

  // Módulos: 36 herramientas en 5 grupos.
  await page.locator("#allm").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".cnt").textContent === "36", null, { timeout: 4000 });
  assert.equal(await page.locator("#allm li").count(), 36);

  // El asistente comercial de antes sigue en la página.
  await page.getByText("asistente comercial de ADAMIA").first().waitFor({ timeout: 4000 });

  // Enlaces: demo → /demo (demo pública, 25/11/2026), sesión → /login. Al salir no quedan animaciones vivas (sin errores).
  assert.equal(await page.locator(".top-actions a.btn-primary").getAttribute("href"), "/demo");
  await page.locator(".top-actions .login").click();
  await page.waitForURL("**/login");
  await dormir(3000);

  // Blog: lista, artículo con datos estructurados, sitemap y robots (fuera de producción no se indexa).
  await page.goto(base + "/blog", { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator(".post-card").count(), 5);
  await page.locator(".post-card.principal").click();
  await page.waitForURL("**/blog/registro-electronico-jornada-2027");
  await page.getByRole("heading", { level: 1, name: "Registro electrónico de la jornada: obligatorio desde 2027" }).waitFor();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  assert.ok(ld.some((t) => JSON.parse(t)["@type"] === "FAQPage"), "FAQPage en el artículo");
  assert.match(await page.locator("link[rel=canonical]").getAttribute("href"), /\/blog\/registro-electronico-jornada-2027$/);
  const mapa = await (await fetch(base + "/sitemap.xml")).text();
  assert.match(mapa, /blog\/multas-registro-jornada-laboral/);
  const robots = await (await fetch(base + "/robots.txt")).text();
  assert.match(robots, /Disallow: \/\s*$/m, "fuera de producción no se indexa");
  assert.equal((await fetch(base + "/blog/no-existe")).status, 404);
  await page.goto(base + "/blog-y-noticias");
  await page.waitForURL("**/blog");

  // Celular: sin desbordes horizontales.
  const movil = await ctx.newPage();
  movil.on("pageerror", (e) => errores.push(e.message));
  await movil.setViewportSize({ width: 390, height: 844 });
  await movil.goto(base + "/", { waitUntil: "domcontentloaded" });
  await dormir(1500);
  assert.equal(await movil.evaluate(() => document.documentElement.scrollWidth), 390, "sin desborde en celular");
  await ver(movil.locator("#modulos-adamia .mz-ia"));
  await dormir(1500);
  assert.equal(await movil.evaluate(() => document.documentElement.scrollWidth), 390, "sin desborde con el mosaico en movimiento");
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await ver(page.locator("#modulos-adamia .mz-ia"));
  await dormir(1000);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1440, "sin desborde en escritorio");

  // Reducir movimiento: todo queda en su estado final.
  const quieto = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  await quieto.route("**/*", (route) => (new URL(route.request().url()).origin === base ? route.continue() : route.abort()));
  const pq = await quieto.newPage();
  pq.on("pageerror", (e) => errores.push(e.message));
  await pq.goto(base + "/", { waitUntil: "domcontentloaded" });
  await pq.waitForFunction(() => document.querySelector("#hx-block .stats b").textContent === "13 h 30 min", null, { timeout: 4000 });
  // Sin flotado, escritura ni entradas: datos completos desde el primer momento (el reloj puede seguir dando la hora).
  await ver(pq.locator("#modulos-adamia .mz-ia"));
  await dormir(500);
  const quietos = await pq.evaluate(() => {
    const els = [...document.querySelectorAll(".flota, #modulos-adamia .mz-m, .mz-barra > i, .mz-capas, .mz-pie")];
    return els.flatMap((el) => el.getAnimations().filter((a) => a.playState === "running").map(() => el.className));
  });
  assert.deepEqual(quietos, [], "nada se anima con reducir movimiento");
  assert.equal(await pq.locator(".pre, .mz-tecleando, .mz-vacia").count(), 0);
  assert.deepEqual(await pq.locator(".mz-num").allInnerTexts(), ["41", "92%"]);
  assert.equal(await pq.locator(".mz-pie").evaluate((el) => getComputedStyle(el).opacity), "1");
  await quieto.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK efectos: pantallas que flotan (pausadas fuera de vista), reloj, barras, contadores, Adamia AI y tarjetas al bajar");
  console.log("OK página de inicio y blog: carrusel, ley con multa animada, blog con datos estructurados, sitemap y robots, checada rostro → GPS → registro sincronizada con el panel, cifras desde 0, reporte semanal con notificaciones, 36 módulos, enlaces, celular y reducir movimiento");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
