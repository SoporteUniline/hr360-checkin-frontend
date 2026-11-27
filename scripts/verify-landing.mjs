// Verificación en navegador de la página de inicio: portada sincronizada (la checada pasa por
// rostro → GPS → registro y la fila llega al panel), números que cuentan desde 0, reporte semanal con
// notificaciones, secciones nuevas (reclutador con IA en WhatsApp, clima con IA, tablero y muro: cada escena arranca al
// verse, llega a su final, se pausa con su botón y con «reducir movimiento» ya está completa), enlaces que existen,
// sin errores, sin desbordes en celular y sin animaciones vivas al salir de la página.
// Las llamadas a otros dominios se bloquean (nada sale a internet).
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-landing.mjs
// (con NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx también se prueba que robots.txt bloquee).
// CAPTURAS=<carpeta> guarda cada sección nueva en su estado final a 1440 y 390 y una secuencia del chat.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { TARJETAS } from "../src/components/landing/home/mosaico.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore" });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const CAPTURAS = process.env.CAPTURAS || "";
if (CAPTURAS) (await import("node:fs")).mkdirSync(CAPTURAS, { recursive: true });
const NUEVAS = ["reclutador-ia", "clima-ia", "tablero", "muro"];
// Solo para las capturas: el asistente comercial y el aviso de cookies flotan encima de todo.
const SIN_FLOTANTES = '.fixed.bottom-5.right-5, [aria-label="Aviso de cookies"] { display: none !important; }';
// El HTML trae cada escena en su final; al verse vuelve al inicio (paso < total) y luego llega otra vez al final.
async function escenaCompleta(pg, id, ms = 90_000) {
  const sel = `#${id} [data-total]`;
  await pg.locator(`#${id}`).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await pg.waitForFunction((s) => { const e = document.querySelector(s); return +e.dataset.paso < +e.dataset.total; }, sel, { timeout: 20_000 });
  await pg.waitForFunction((s) => document.querySelector(s).hasAttribute("data-fin"), sel, { timeout: ms });
  await dormir(900); // última transición
}
// Lo que flota nunca está «estable» para Playwright: se lleva a la vista con scrollIntoView directo (instantáneo: la
// página tiene scroll suave y un recorrido rápido se saltaría tarjetas).
const ver = (loc) => loc.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
// Valores finales de los contadores del mosaico, en orden del documento (mini pantallas de MinisMosaico.jsx).
const CONTADORES = ["41", "58%", "16", "12", "38", "92%", "148", "92%", "23", "86%", "34", "31"];
// Contraste WCAG entre dos colores rgb()/rgba() ya calculados por el navegador.
function contraste(a, b) {
  const lum = (c) => { const [r, g, bl] = c.match(/[\d.]+/g).slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
// Texto de cada tarjeta del mosaico con el color de fondo detrás (en las de degradado, el color del degradado a la altura
// del texto) para medir el contraste; también tamaño del beneficio y peso de los títulos.
const textosMosaico = (pg) => pg.evaluate(() => {
  const rgb = (t) => t.match(/[\d.]+/g).slice(0, 3).map(Number);
  const fondo = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage.startsWith("linear-gradient")) {
        const paradas = [...cs.backgroundImage.matchAll(/rgba?\(([^)]+)\)\s*([\d.]+)%/g)].map((m) => [rgb(m[1]), +m[2] / 100]);
        const caja = n.getBoundingClientRect(), r = el.getBoundingClientRect();
        // Peor caso: el renglón más bajo del texto (donde el degradado se aclara).
        const y = Math.min(1, Math.max(0, (r.bottom - caja.top) / caja.height));
        let k = paradas.findIndex(([, p]) => p >= y); if (k <= 0) k = Math.max(1, k === -1 ? paradas.length - 1 : 1);
        const [[c0, p0], [c1, p1]] = [paradas[k - 1], paradas[k]], f = p1 > p0 ? Math.min(1, Math.max(0, (y - p0) / (p1 - p0))) : 0;
        return `rgb(${c0.map((v, i) => Math.round(v + (c1[i] - v) * f)).join(", ")})`;
      }
      if (cs.backgroundColor !== "rgba(0, 0, 0, 0)") return cs.backgroundColor;
    }
    return "rgb(255, 255, 255)";
  };
  return [...document.querySelectorAll("#modulos-adamia .mz-cab h4, #modulos-adamia .mz-sub, #modulos-adamia .mz-cab p, #modulos-adamia .mz-grupo-cab h3, #modulos-adamia .mz-grupo-cab p")]
    .filter((el) => el.getClientRects().length)
    .map((el) => { const cs = getComputedStyle(el); return { tag: el.tagName, txt: el.textContent.slice(0, 30), color: cs.color, fondo: fondo(el), px: parseFloat(cs.fontSize), peso: +cs.fontWeight }; });
});

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
  // Mosaico de módulos (27/11/2026: los 24 módulos en producción, en 5 grupos): cada tarjeta con título, submarca,
  // beneficio, mini pantalla decorativa y flecha con nombre a su página; la lista sale de mosaico.mjs.
  const mosaico = page.locator("#modulos-adamia");
  await mosaico.getByRole("heading", { name: "Todo el día de tu equipo, en una sola plataforma." }).waitFor();
  assert.deepEqual(await mosaico.locator(".mz-m h4").evaluateAll((hs) => hs.map((h) => h.firstChild.textContent.trim())), TARJETAS.map((c) => c.nombre));
  assert.deepEqual(await mosaico.locator(".mz-grupo-cab h3").allInnerTexts(), ["Nómina y dinero", "Tiempo", "Personas", "Talento y cultura", "Plataforma"]);
  for (const c of TARJETAS) {
    const art = mosaico.locator(`[data-tarjeta="${c.id}"]`);
    assert.equal(await art.locator(".mz-sub").innerText(), `adamia ${c.sub}.`, `${c.id}: submarca`);
    assert.equal(await art.locator(".mz-cab p").innerText(), c.texto, `${c.id}: beneficio`);
    assert.equal(await art.getByRole("link", { name: `Conocer ${c.aria}` }).getAttribute("href"), c.href, `${c.id}: flecha`);
    if (c.estilo !== "ia") assert.equal(await art.locator(".mz-mini").getAttribute("aria-hidden"), "true", `${c.id}: mini pantalla decorativa`);
  }
  assert.equal(await mosaico.getByRole("link", { name: /^Conocer / }).count(), TARJETAS.length);
  assert.ok(!(await mosaico.innerText()).toLowerCase().includes("inducción"), "el mosaico no anuncia Inducción digital");
  assert.equal(await page.locator(".mz-vertodos").isVisible(), false, "en escritorio no hay «Ver todos»: se ven todas");
  // Pantallas que flotan: el panel de la portada corre mientras se ve; las tarjetas del mosaico entran al bajar.
  const juego = (sel) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).animationPlayState);
  await page.waitForFunction(() => document.querySelector(".hero .dash").classList.contains("en-vista"));
  assert.equal(await juego(".hero .dash"), "running");
  assert.ok(await page.locator("#modulos-adamia .mz-m.pre").count() > 0, "las tarjetas de abajo esperan su entrada");
  for (const art of await mosaico.locator(".mz-m").all()) { await ver(art); await dormir(300); }
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
  // Cada barra llega a su valor (--v) y cada contador a su cifra final.
  await page.waitForFunction((f) => [...document.querySelectorAll(".mz-barra > i")].every((i) => eval(f)(i) === (+i.style.getPropertyValue("--v")).toFixed(2)), escala.toString(), { timeout: 5000 });
  assert.equal(await mosaico.locator(".mz-barra > i").count(), 8);
  assert.deepEqual(await mosaico.locator(".mz-num").allInnerTexts(), CONTADORES);
  // Ciclos (solicitud que se aprueba, monitor que suma llegadas…): corren mientras se ven y se detienen fuera de vista.
  const ciclo = mosaico.locator('[data-tarjeta="monitor"] .mz-ciclo');
  await ver(ciclo);
  const pasos = new Set();
  for (let i = 0; i < 12; i++) { pasos.add(await ciclo.getAttribute("data-paso")); await dormir(500); }
  assert.ok(pasos.size >= 2, `el monitor cambia mientras se ve (${[...pasos]})`);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await dormir(600);
  const quieto1 = await ciclo.getAttribute("data-paso");
  await dormir(3000);
  assert.equal(await ciclo.getAttribute("data-paso"), quieto1, "fuera de vista el ciclo se pausa");
  await ver(mosaico.locator('[data-tarjeta="rutas"] .mz-mini'));
  await dormir(800);
  assert.equal(await mosaico.locator('[data-tarjeta="rutas"] .mz-ruta').evaluate((el) => el.getAnimations()[0]?.playState), "running", "la ruta se dibuja mientras se ve");
  // Lectura: beneficio de 16 px o más, títulos en 700 (nada en 800+), contraste de 4.5:1 o más (también en el degradado).
  for (const t of await textosMosaico(page)) {
    const c = contraste(t.color, t.fondo);
    assert.ok(c >= 4.5, `contraste ${c.toFixed(2)} en «${t.txt}» (${t.color} sobre ${t.fondo})`);
    if (t.tag === "P") assert.ok(t.px >= 16, `«${t.txt}» a ${t.px}px`);
    if (/^H/.test(t.tag)) assert.equal(t.peso, 700, `«${t.txt}»: peso ${t.peso}`);
  }
  // Sin saltos de diseño: el alto de la sección no cambia mientras los ciclos y contadores corren.
  const alto1 = await mosaico.evaluate((el) => el.getBoundingClientRect().height);
  await dormir(3500);
  assert.equal(await mosaico.evaluate((el) => el.getBoundingClientRect().height), alto1, "el mosaico no cambia de alto con el movimiento");
  if (CAPTURAS) {
    const estilo = await page.addStyleTag({ content: SIN_FLOTANTES });
    await page.locator('[data-tarjeta="ia"] .mz-listo').waitFor();
    await mosaico.screenshot({ path: `${CAPTURAS}/mosaico-completo-1440.png`, animations: "disabled" });
    await estilo.evaluate((el) => el.remove()); // el asistente comercial se revisa más abajo
  }
  await mosaico.locator(".mz-listo").waitFor();
  await page.waitForFunction(() => !document.querySelector(".mz-tecleando") && getComputedStyle(document.querySelector(".mz-pie")).opacity === "1");
  assert.match(await mosaico.locator(".mz-ai .sr-only").innerText(), /^Le tocan 16 días de vacaciones pagadas/);
  assert.equal(await mosaico.locator(".mz-capas").getAttribute("aria-hidden"), "true");

  // Portada: el título y las fotos.
  await page.getByRole("heading", { level: 1, name: /Tu gente checa\.\s*Tú tienes el control\./ }).waitFor();
  assert.equal(await page.locator('img[src^="/landing/"]').count() >= 6, true, "fotos de /public/landing");

  // Checada: rostro (malla) → GPS (la distancia baja hasta 38 m) → registro; la fila llega al panel y suben los presentes.
  // (27/11/2026) El mosaico creció a 9 tarjetas: al volver arriba la checada puede ir en otra vuelta (Ana, Raúl o
  // Karla, cada 8.2 s), así que se revisa la persona de esa vuelta con su distancia, en lugar de exigir la primera.
  const scr = page.locator("#h-scr");
  await page.waitForFunction(() => document.getElementById("h-scr").classList.contains("mesh-on"), null, { timeout: 10000 });
  await page.waitForFunction(() => document.getElementById("h-scr").classList.contains("gps"), null, { timeout: 10000 });
  await page.waitForFunction(() => document.getElementById("h-scr").classList.contains("done"), null, { timeout: 10000 });
  const quien = (await scr.locator("#h-ok-who").innerText()).replace(/^Entrada registrada · /, "");
  const distancia = { "Ana Torres": "38", "Raúl Pérez": "61", "Karla Romero": "24" }[quien];
  assert.ok(distancia, `persona de la checada: ${quien}`);
  assert.equal(await page.locator("#h-dist").innerText(), distancia, "la distancia baja hasta la de esa persona");
  const presentes = +(await page.locator("#k-pres-n").innerText());
  await page.waitForFunction((q) => document.querySelector("#h-rows .trow b").textContent === q, quien, { timeout: 3000 });
  assert.equal(+(await page.locator("#k-pres-n").innerText()), presentes + 1, "suben los presentes");

  // Carrusel: pasa solo a la siguiente diapositiva y se puede pausar.
  const slideActual = () => page.evaluate(() => [...document.querySelectorAll(".carr .slide")].findIndex((d) => d.classList.contains("on")));
  // Va en la diapositiva que toque según el tiempo transcurrido (el recorrido de arriba tarda más con el mosaico nuevo).
  const s0 = await slideActual();
  assert.ok(s0 >= 0);
  await page.waitForFunction((s) => { const d = document.querySelectorAll(".carr .slide"); return d[(s + 1) % d.length].classList.contains("on"); }, s0, { timeout: 8000 });
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

  // Módulos: la cifra del título es la de la lista (src/lib/sitio/modulos.js), con las novedades y sin lo que no
  // está en producción (Inducción digital) ni el checador «sin internet».
  await page.locator("#allm").scrollIntoViewIfNeeded();
  const totalModulos = await page.locator("#allm li").count();
  assert.ok(totalModulos >= 45, `módulos en la lista: ${totalModulos}`);
  await page.waitForFunction((n) => document.querySelector(".cnt").textContent === String(n), totalModulos, { timeout: 4000 });
  const lista = (await page.locator("#allm").innerText()).toLowerCase();
  for (const t of ["reclutador ia por whatsapp", "clima laboral con ia", "muro y comunicados", "centro de ayuda", "monitor en vivo"]) assert.ok(lista.includes(t), `la lista incluye «${t}»`);
  const textoPagina = (await page.locator("main").innerText()).toLowerCase();
  for (const t of ["inducción", "sin internet", "sin conexión"]) assert.ok(!textoPagina.includes(t), `la página no anuncia «${t}»`);
  assert.equal(await page.locator(".allm-ayuda a").getAttribute("href"), "/ayuda");

  // El asistente comercial de antes sigue en la página.
  await page.getByText("asistente comercial de ADAMIA").first().waitFor({ timeout: 4000 });

  // Encabezado (27/11/2026): solo «Iniciar sesión» (fondo azul) y «Contratar» (contorno azul); sin «Probar demo».
  assert.equal(await page.locator(".top-actions a.btn-primary").getAttribute("href"), "/login");
  assert.equal(await page.locator(".top-actions").getByText("Probar demo").count(), 0, "sin «Probar demo» en el encabezado");
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
  // Al navegar del lado del cliente la etiqueta de la página anterior puede tardar en irse: se espera a que quede una.
  await page.waitForFunction(() => document.querySelectorAll("link[rel=canonical]").length === 1, null, { timeout: 5000 });
  assert.match(await page.locator("link[rel=canonical]").getAttribute("href"), /\/blog\/registro-electronico-jornada-2027$/);
  const mapa = await (await fetch(base + "/sitemap.xml")).text();
  assert.match(mapa, /blog\/multas-registro-jornada-laboral/);
  // robots.txt depende del dominio con que se compiló (NEXT_PUBLIC_RUTA_DOMAIN): solo un build de Dev debe pedir
  // «no indexar». Con el build de producción (o sin dominio, que cae en adamia.com.mx, como en CI) esa prueba no
  // aplica: se omite y se avisa, y solo se revisa que el panel siga fuera de los buscadores.
  const robots = await (await fetch(base + "/robots.txt")).text();
  if (/Sitemap: https:\/\/adamia\.com\.mx\//.test(robots)) {
    console.log("OMITIDA robots «no indexar»: build de producción (adamia.com.mx); compila con NEXT_PUBLIC_RUTA_DOMAIN de Dev para probarla");
    assert.match(robots, /Disallow: \/panel/, "producción: el panel no se indexa");
  } else {
    assert.match(robots, /Disallow: \/\s*$/m, "fuera de producción no se indexa");
  }
  assert.equal((await fetch(base + "/blog/no-existe")).status, 404);
  await page.goto(base + "/blog-y-noticias");
  await page.waitForURL("**/blog");

  // ===== Secciones nuevas (27/11/2026) =====
  const pn = await ctx.newPage();
  pn.on("pageerror", (e) => errores.push(e.message));
  await pn.goto(base + "/", { waitUntil: "domcontentloaded" });
  if (CAPTURAS) await pn.addStyleTag({ content: SIN_FLOTANTES });
  for (const [id, titulo] of [["reclutador-ia", "Tu reclutador con IA en WhatsApp."], ["clima-ia", "Clima laboral con IA."], ["tablero", "Todo tu equipo en un tablero."], ["muro", "El muro de tu empresa."]]) {
    await pn.locator(`#${id}`).getByRole("heading", { level: 2, name: titulo }).waitFor();
    const esc = pn.locator(`#${id} [data-total]`);
    assert.equal(await esc.getAttribute("aria-hidden"), "true", `${id}: la maqueta es decorativa`);
    assert.ok((await pn.locator(`#${id} p.sr-only`).innerText()).length > 80, `${id}: texto alterno cerca`);
  }
  // Sin el logotipo de WhatsApp: ningún archivo ni ícono con ese nombre en las secciones nuevas.
  assert.equal(await pn.locator('#reclutador-ia img, #reclutador-ia [class*="logo"]').count(), 0);

  // WhatsApp: arranca al verse, aparece «escribiendo…», un botón se toca, las palomitas pasan a azul y llega al último
  // mensaje; la bandeja de RH termina con la candidata calificada, la cita confirmada y otro candidato que pide atención.
  const wa = pn.locator("#nv-wa-escena");
  await wa.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await pn.waitForFunction(() => +document.querySelector("#nv-wa-escena").dataset.paso < 4, null, { timeout: 20_000 });
  await pn.getByText("escribiendo…").waitFor({ timeout: 10_000 });
  const cuadros = [8, 16, 26];
  for (const [k, n] of cuadros.entries()) {
    await pn.waitForFunction((n) => +document.querySelector("#nv-wa-escena").dataset.paso >= n, n, { timeout: 40_000 });
    if (CAPTURAS) await pn.locator("#nv-wa-escena .nv-tel").screenshot({ path: `${CAPTURAS}/whatsapp-cuadro-${k + 1}.png`, animations: "disabled" });
  }
  await pn.waitForFunction(() => document.querySelector("#nv-wa-escena").hasAttribute("data-fin"), null, { timeout: 60_000 });
  await dormir(900);
  if (CAPTURAS) await pn.locator("#nv-wa-escena .nv-tel").screenshot({ path: `${CAPTURAS}/whatsapp-cuadro-4.png`, animations: "disabled" });
  const ultimo = wa.locator(".nv-wa-msg").last();
  assert.match(await ultimo.innerText(), /¡Gracias por confirmar! Te esperamos el jueves 3 de diciembre/);
  assert.ok(await wa.locator(".nv-wa-palomitas.leido").count() >= 5, "mensajes de la candidata leídos");
  assert.ok(await wa.locator(".nv-wa-boton").count() >= 10, "botones de respuesta rápida");
  assert.equal(await wa.locator(".nv-wa-quien small").innerText(), "en línea");
  assert.equal(await wa.locator(".nv-rh .nv-chip.verde").first().innerText(), "Califica");
  await wa.locator(".nv-rh-cita").getByText("Confirmada").waitFor();
  assert.match(await wa.locator(".nv-rh-atn.on").innerText(), /necesita atención/);
  if (CAPTURAS) await pn.locator("#reclutador-ia").screenshot({ path: `${CAPTURAS}/reclutador-ia-1440.png`, animations: "disabled" });

  // Clima: el botón real pausa la escena (el paso no avanza), la reanuda y termina con las 3 sugerencias en el plan.
  await pn.locator("#nv-cl-escena").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await pn.waitForFunction(() => { const e = document.querySelector("#nv-cl-escena"); return +e.dataset.paso >= 2 && +e.dataset.paso < +e.dataset.total - 2; }, null, { timeout: 20_000 });
  await pn.locator("#clima-ia .nv-control").click();
  const pausado = await pn.locator("#nv-cl-escena").getAttribute("data-paso");
  await dormir(3000);
  assert.equal(await pn.locator("#nv-cl-escena").getAttribute("data-paso"), pausado, "en pausa no avanza");
  assert.equal(await pn.locator("#clima-ia .nv-control").getAttribute("data-control"), "Reanudar animación");
  await pn.locator("#clima-ia .nv-control").click();
  await pn.waitForFunction(() => document.querySelector("#nv-cl-escena").hasAttribute("data-fin"), null, { timeout: 30_000 });
  await dormir(900);
  assert.equal(await pn.locator("#nv-cl-escena .nv-cl-sug li.agregada").count(), 3);
  assert.equal(await pn.locator("#nv-cl-escena .nv-cl-pct").innerText(), "86%");
  if (CAPTURAS) await pn.locator("#clima-ia").screenshot({ path: `${CAPTURAS}/clima-ia-1440.png`, animations: "disabled" });

  // Tablero: llegan 4 checadas (22 trabajando), lo pendiente y Adamia AI cita la ley.
  await escenaCompleta(pn, "tablero", 40_000);
  assert.equal(await pn.locator("#nv-tb-escena .nv-tb-fila.on:not(.th)").count(), 6);
  assert.equal(await pn.locator("#nv-tb-escena .nv-tb-kpi b").first().innerText(), "22");
  assert.equal(await pn.locator("#nv-tb-escena .nv-tb-cita.on").innerText(), "Arts. 74 y 75 LFT");
  if (CAPTURAS) await pn.locator("#tablero").screenshot({ path: `${CAPTURAS}/tablero-1440.png`, animations: "disabled" });

  // Muro: me gusta sube a 48, llegan 2 comentarios y al confirmar de leído el avance pasa a 31 de 42.
  await escenaCompleta(pn, "muro", 40_000);
  assert.equal(await pn.locator("#nv-mu-escena .nv-mu-conteos .nv-cifra").innerText(), "48");
  assert.equal(await pn.locator("#nv-mu-escena .nv-mu-com.on").count(), 2);
  assert.match(await pn.locator("#nv-mu-escena .nv-mu-avance").innerText(), /31 de 42 confirmaron/);
  await pn.locator("#nv-mu-escena .nv-mu-confirmar.hecho").waitFor();
  if (CAPTURAS) await pn.locator("#muro").screenshot({ path: `${CAPTURAS}/muro-1440.png`, animations: "disabled" });
  if (CAPTURAS) await pn.locator("#modulos-adamia").screenshot({ path: `${CAPTURAS}/mosaico-1440.png`, animations: "disabled" });
  if (CAPTURAS) { await pn.locator("#modulos").evaluate((el) => el.scrollIntoView()); await dormir(2000); await pn.locator("#modulos").screenshot({ path: `${CAPTURAS}/modulos-1440.png`, animations: "disabled" }); }

  // Enlaces de las secciones nuevas, del mosaico y de la lista: todos existen (sin 404).
  const hrefs = await pn.evaluate((ids) => [...new Set([...ids.map((id) => `#${id} a`), "#modulos-adamia a", "#allm a", ".allm-ayuda a"]
    .flatMap((s) => [...document.querySelectorAll(s)].map((a) => a.getAttribute("href"))))], NUEVAS);
  for (const h of hrefs) {
    const ruta = h.split("#")[0] || "/";
    assert.equal((await fetch(base + ruta)).status, 200, `enlace ${h}`);
    if (h.includes("#") && ruta === "/") assert.ok(await pn.locator(`#${h.split("#")[1]}`).count(), `ancla ${h}`);
  }
  await pn.close();

  // Celular (360 y 390): el mosaico muestra 8 tarjetas y «Ver todos los módulos (24)»; al tocarlo aparecen todas, el foco
  // pasa a la primera que estaba oculta y sus datos vivos arrancan. Sin desbordes horizontales antes ni después.
  for (const ancho of [360, 390]) {
    const pm = await ctx.newPage();
    pm.on("pageerror", (e) => errores.push(e.message));
    await pm.setViewportSize({ width: ancho, height: 800 });
    await pm.goto(base + "/", { waitUntil: "domcontentloaded" });
    await dormir(1500);
    const visibles = () => pm.locator("#modulos-adamia .mz-m").evaluateAll((as) => as.filter((a) => a.getClientRects().length).map((a) => a.dataset.tarjeta));
    assert.deepEqual(await visibles(), TARJETAS.filter((c) => c.movil).map((c) => c.id), `${ancho}: primero 8 tarjetas`);
    const boton = pm.getByRole("button", { name: `Ver todos los módulos (${TARJETAS.length})` });
    await ver(boton);
    assert.equal(await boton.getAttribute("aria-expanded"), "false");
    assert.equal(await pm.evaluate(() => document.documentElement.scrollWidth), ancho, `${ancho}: sin desborde (plegado)`);
    await boton.click();
    await pm.waitForFunction((n) => [...document.querySelectorAll("#modulos-adamia .mz-m")].filter((a) => a.getClientRects().length).length === n, TARJETAS.length);
    assert.equal(await pm.getByRole("button", { name: /Ver todos los módulos/ }).count(), 0, "el botón se va al abrir");
    assert.equal(await pm.evaluate(() => document.activeElement?.getAttribute("aria-label")), `Conocer ${TARJETAS.find((c) => !c.movil).aria}`, "foco en la primera tarjeta nueva");
    for (const art of await pm.locator("#modulos-adamia .mz-m").all()) {
      await ver(art); await dormir(250);
      const der = await art.evaluate((el) => Math.max(el.getBoundingClientRect().right, ...[...el.querySelectorAll("*")].map((n) => n.getBoundingClientRect().right)));
      assert.ok(der <= ancho, `${ancho}: «${await art.getAttribute("data-tarjeta")}» cabe (${der})`);
    }
    await dormir(1800);
    assert.deepEqual(await pm.locator("#modulos-adamia .mz-num").allInnerTexts(), CONTADORES, `${ancho}: contadores de las tarjetas abiertas`);
    assert.equal(await pm.evaluate(() => document.documentElement.scrollWidth), ancho, `${ancho}: sin desborde con el mosaico abierto y en movimiento`);
    for (const t of await textosMosaico(pm)) assert.ok(contraste(t.color, t.fondo) >= 4.5, `${ancho}: contraste en «${t.txt}»`);
    if (CAPTURAS && ancho === 390) {
      await pm.addStyleTag({ content: SIN_FLOTANTES });
      await pm.locator('[data-tarjeta="ia"] .mz-listo').waitFor();
      await pm.locator("#modulos-adamia").screenshot({ path: `${CAPTURAS}/mosaico-completo-390.png`, animations: "disabled" });
    }
    await pm.close();
  }
  const movil = await ctx.newPage();
  movil.on("pageerror", (e) => errores.push(e.message));
  await movil.setViewportSize({ width: 390, height: 844 });
  await movil.goto(base + "/", { waitUntil: "domcontentloaded" });
  await dormir(1500);
  assert.equal(await movil.evaluate(() => document.documentElement.scrollWidth), 390, "sin desborde en celular");
  if (CAPTURAS) await movil.addStyleTag({ content: SIN_FLOTANTES });
  for (const id of NUEVAS) {
    await escenaCompleta(movil, id);
    assert.equal(await movil.evaluate(() => document.documentElement.scrollWidth), 390, `sin desborde en celular: ${id}`);
    const ancho = await movil.locator(`#${id} [data-total]`).evaluate((el) => el.getBoundingClientRect().right);
    assert.ok(ancho <= 390, `${id}: la maqueta cabe en 390 px (${ancho})`);
    if (CAPTURAS) await movil.locator(`#${id}`).screenshot({ path: `${CAPTURAS}/${id}-390.png`, animations: "disabled" });
  }
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
  assert.deepEqual(await pq.locator(".mz-num").allInnerTexts(), CONTADORES);
  // Cuadros finales: cada ciclo del mosaico en su último estado y sin moverse; nada del mosaico tiene animación viva.
  for (const art of await pq.locator("#modulos-adamia .mz-m").all()) { await ver(art); await dormir(80); }
  await dormir(3200);
  assert.deepEqual(await pq.locator("#modulos-adamia .mz-ciclo").evaluateAll((cs) => cs.filter((c) => +c.dataset.paso !== +c.dataset.n - 1).map((c) => c.closest("[data-tarjeta]").dataset.tarjeta)), [], "ciclos en su último estado");
  const vivasMz = await pq.locator("#modulos-adamia").evaluate((el) => [...el.querySelectorAll("*")].flatMap((n) => n.getAnimations().filter((a) => a.playState === "running").map(() => n.className.baseVal ?? n.className)));
  assert.deepEqual(vivasMz, [], "nada del mosaico se anima con reducir movimiento");
  assert.equal(await pq.locator("#modulos-adamia .mz-ruta").evaluate((el) => getComputedStyle(el).strokeDashoffset), "0px", "la ruta ya está dibujada");
  // Secciones nuevas: cada escena ya está en su estado final (último mensaje del chat incluido), sin botón de pausa
  // y sin nada que se mueva, aunque se vean.
  for (const id of NUEVAS) {
    const esc = pq.locator(`#${id} [data-total]`);
    await esc.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await dormir(1500);
    assert.equal(await esc.getAttribute("data-paso"), await esc.getAttribute("data-total"), `${id}: final con reducir movimiento`);
    assert.equal(await esc.getAttribute("data-fin"), "", `${id}: marcada como final`);
    assert.equal(await pq.locator(`#${id} .nv-control`).count(), 0, `${id}: sin botón de pausa`);
    const vivas = await esc.evaluate((el) => [el, ...el.querySelectorAll("*")].flatMap((n) => n.getAnimations().filter((a) => a.playState === "running")).length);
    assert.equal(vivas, 0, `${id}: nada se anima`);
  }
  assert.match(await pq.locator("#nv-wa-escena .nv-wa-msg").last().innerText(), /¡Gracias por confirmar!/);
  assert.equal(await pq.locator("#nv-cl-escena .nv-cl-sug li.agregada").count(), 3);
  assert.equal(await pq.locator(".mz-pie").evaluate((el) => getComputedStyle(el).opacity), "1");
  await quieto.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log(`OK mosaico: ${TARJETAS.length} tarjetas con submarca, beneficio, flecha sin 404 y mini pantalla decorativa; contraste ≥ 4.5 y lectura (16 px, títulos 700); ciclos que corren a la vista y se pausan fuera; sin cambio de alto; celular 360/390 con «Ver todos» (8 → ${TARJETAS.length}) y sin desborde; cuadros finales con reducir movimiento`);
  console.log("OK efectos: pantallas que flotan (pausadas fuera de vista), reloj, barras, contadores, Adamia AI y tarjetas al bajar");
  console.log("OK secciones nuevas: reclutador con IA en WhatsApp (chat hasta el último mensaje y bandeja de RH), clima con IA (pausa real y plan), tablero y muro; enlaces sin 404; final inmediato con reducir movimiento; 390 px sin desborde");
  console.log("OK página de inicio y blog: carrusel, ley con multa animada, blog con datos estructurados, sitemap, checada rostro → GPS → registro sincronizada con el panel, cifras desde 0, reporte semanal con notificaciones, lista de módulos desde modulos.js, enlaces, celular y reducir movimiento");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
