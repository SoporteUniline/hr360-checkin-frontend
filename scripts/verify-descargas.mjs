// Verificación en navegador de «Llévate ADAMIA a casa» (brochure y tríptico en PDF), en la portada (/) y en Cotizar
// (/cotiza), a 1440 y 390 px: las dos tarjetas con miniatura (alt descriptivo, imagen cargada), enlace «Descargar el …
// en PDF» con download = nombre bonito, pestaña nueva de respaldo y botón ≥ 48 px; cada PDF responde 200 con
// application/pdf y el peso anunciado; una descarga real llega con el nombre «ADAMIA - ….pdf»; lugar en el flujo (portada:
// después de «Todos los módulos» y antes de «Ve ADAMIA en acción»; Cotizar: después de las preguntas y antes del cierre);
// lectura (16 px en escritorio, 17 px en celular, títulos 700, secundario no más claro que #4B5563); sin fondos
// degradados; en celular una tarjeta debajo de la otra y sin desborde; la tarjeta se eleva al pasar el cursor y queda
// quieta con «reducir movimiento»; robots.txt no bloquea /descargas/.
// Las llamadas a otros dominios se bloquean (el catálogo de Cotizar se responde vacío: nada sale a internet).
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-descargas.mjs
// CAPTURAS=<carpeta> guarda la sección de cada página a 1440 y 390.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { DESCARGAS } from "../src/components/landing/descargas.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const CAPTURAS = process.env.CAPTURAS || "";
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore" });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
// Solo para las capturas: el asistente comercial y el aviso de cookies flotan encima de todo.
// El encabezado fijo se vuelve estático para que no tape el inicio de la sección.
const SIN_FLOTANTES = '.fixed.bottom-5.right-5, [aria-label="Aviso de cookies"] { display: none !important; } .lh.sitio-fijo, .lh .top { position: static !important; }';
const PAGINAS = [
  { ruta: "/", id: "descargas", antes: "#modulos", despues: "#demo", nombre: "inicio", resumen: true },
  { ruta: "/cotiza", id: "descargas-cotiza", antes: ".cz-faq", despues: ".cz-final", nombre: "cotiza", resumen: false },
];
const lum = (c) => {
  const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const LUM_LIMITE = lum("rgb(75, 85, 99)"); // #4B5563

let exito = false;
// Chromium en Linux con locale C (sin UTF-8) cambia un nombre con acento («Tríptico») por «download»; Windows, macOS y
// Android usan Unicode. Se lanza con UTF-8 para probar lo que ve la gente.
const browser = await chromium.launch({ env: { ...process.env, LANG: "C.UTF-8", LC_ALL: "C.UTF-8" } });
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  // Archivos: 200, application/pdf y el peso que anuncia la tarjeta; miniaturas como imagen.
  for (const d of DESCARGAS) {
    const r = await fetch(base + d.archivo);
    assert.equal(r.status, 200, `${d.archivo}: estado`);
    assert.match(r.headers.get("content-type") || "", /^application\/pdf/, `${d.archivo}: tipo`);
    assert.equal((await r.arrayBuffer()).byteLength, d.bytes, `${d.archivo}: peso`);
    const p = await fetch(base + d.portada.src);
    assert.equal(p.status, 200, `${d.portada.src}: estado`);
    assert.match(p.headers.get("content-type") || "", /^image\/webp/, `${d.portada.src}: tipo`);
  }
  const robots = await (await fetch(base + "/robots.txt")).text();
  const bloqueos = [...robots.matchAll(/^Disallow:\s*(\S+)/gim)].map((m) => m[1]);
  if (bloqueos.includes("/")) console.warn("AVISO: este build no es de producción (robots bloquea todo); se omite la prueba de /descargas/ en robots.txt.");
  else for (const b of bloqueos) assert.ok(!"/descargas/adamia-brochure-comercial.pdf".startsWith(b), `robots.txt bloquea ${b}`);

  for (const ancho of [1440, 390]) {
    for (const reducir of [false, true]) {
      if (reducir && ancho === 390) continue;
      const ctx = await browser.newContext({ viewport: { width: ancho, height: ancho === 390 ? 844 : 900 }, locale: "es-MX", acceptDownloads: true, reducedMotion: reducir ? "reduce" : "no-preference", hasTouch: ancho === 390, isMobile: ancho === 390 });
      await ctx.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.origin === base) return route.continue();
        if (url.hostname === "api.prueba.invalid") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ tipo_planes: [], planes_duracion: [] }) });
        return route.abort();
      });
      for (const pg of PAGINAS) {
        const page = await ctx.newPage();
        const errores = [];
        page.on("pageerror", (e) => errores.push(e.message));
        const tag = `${pg.nombre} ${ancho}${reducir ? " reducir" : ""}`;
        await page.goto(base + pg.ruta, { waitUntil: "networkidle" });
        const sec = page.locator(`#${pg.id}`);
        assert.equal(await sec.count(), 1, `${tag}: sección`);
        // En celular las tarjetas van una debajo de la otra: se recorre cada una para que entre (.reveal) y cargue.
        for (const el of await sec.locator(".reveal").all()) { await el.evaluate((n) => n.scrollIntoView({ block: "center", behavior: "instant" })); await dormir(250); }
        await sec.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
        // Entrada al hacer scroll (.reveal) e imágenes diferidas: esperar a que todo esté visible y cargado.
        await page.waitForFunction((id) => [...document.querySelectorAll(`#${id} .reveal`)].every((el) => getComputedStyle(el).opacity === "1")
          && [...document.querySelectorAll(`#${id} img`)].every((im) => im.complete && im.naturalWidth > 0), pg.id, { timeout: 15_000 })
          .catch(async (e) => {
            const estado = await page.evaluate((id) => ({ reveal: [...document.querySelectorAll(`#${id} .reveal`)].map((el) => `${el.className}:${getComputedStyle(el).opacity}`), img: [...document.querySelectorAll(`#${id} img`)].map((im) => `${im.complete}/${im.naturalWidth}`) }), pg.id);
            throw new Error(`${tag}: la sección no terminó de aparecer ${JSON.stringify(estado)}`, { cause: e });
          });

        // Lugar en el flujo de venta.
        const orden = await page.evaluate(({ id, antes, despues }) => {
          const s = document.getElementById(id), a = document.querySelector(antes), z = document.querySelector(despues);
          return { tras: !!(a.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING), antes: !!(s.compareDocumentPosition(z) & Node.DOCUMENT_POSITION_FOLLOWING) };
        }, pg);
        assert.deepEqual(orden, { tras: true, antes: true }, `${tag}: después de ${pg.antes} y antes de ${pg.despues}`);

        const tarjetas = sec.locator("[data-descarga]");
        assert.equal(await tarjetas.count(), DESCARGAS.length, `${tag}: dos tarjetas`);
        for (const [k, d] of DESCARGAS.entries()) {
          const t = tarjetas.nth(k);
          assert.equal(await t.getAttribute("data-descarga"), d.id);
          assert.equal(await t.locator("h3").textContent(), d.titulo, `${tag} ${d.id}: título`);
          assert.equal(await t.locator("img").getAttribute("alt"), d.portada.alt, `${tag} ${d.id}: alt`);
          assert.equal(await t.locator(".dz-meta").textContent(), `PDF · ${d.paginas} páginas · ${(d.bytes / 1048576).toFixed(1)} MB`);
          assert.equal(await t.getByText(d.resumen).count(), pg.resumen ? 1 : 0, `${tag} ${d.id}: resumen`);
          const a = sec.getByRole("link", { name: `Descargar ${d.enlace} en PDF`, exact: true });
          assert.equal(await a.count(), 1, `${tag} ${d.id}: enlace con nombre accesible`);
          assert.equal(await a.getAttribute("href"), d.archivo);
          assert.equal(await a.getAttribute("download"), d.nombreDescarga);
          assert.equal(await a.getAttribute("target"), "_blank");
          assert.match(await a.getAttribute("rel"), /noopener/);
          // Lo visible es «Descargar PDF»; «el … en» va oculto a la vista (sr-only) pero lo lee el lector de pantalla.
          const visible = await a.evaluate((el) => {
            const oculto = el.querySelector(".sr-only"), cs = getComputedStyle(oculto), r = oculto.getBoundingClientRect();
            const copia = el.cloneNode(true); copia.querySelector(".sr-only").remove();
            return { texto: copia.textContent.replace(/\s+/g, " ").trim(), oculto: cs.position === "absolute" && r.width <= 1 && r.height <= 1 };
          });
          assert.deepEqual(visible, { texto: "Descargar PDF", oculto: true }, `${tag} ${d.id}: texto visible`);
          const caja = await a.boundingBox();
          assert.ok(caja.height >= 48, `${tag} ${d.id}: botón de ${caja.height} px`);
          // La miniatura no se sale de su cuadro blanco (en celular el brochure vertical llegó a desbordar la tarjeta).
          const dentro = await t.evaluate((n) => {
            const b = n.querySelector(".dz-portada").getBoundingClientRect(), i = n.querySelector(".dz-portada img").getBoundingClientRect();
            return i.width > 40 && i.left >= b.left - 0.5 && i.right <= b.right + 0.5 && i.top >= b.top - 0.5 && i.bottom <= b.bottom + 0.5;
          });
          assert.ok(dentro, `${tag} ${d.id}: miniatura dentro de su cuadro`);
        }

        // Lectura, colores y fondos.
        const estilos = await sec.evaluate((s) => {
          const todo = [s, ...s.querySelectorAll("*")];
          return {
            degradados: todo.filter((el) => /gradient/.test(getComputedStyle(el).backgroundImage)).map((el) => el.className),
            textos: [...s.querySelectorAll(".dz-cab p, .dz-cuerpo p")].map((el) => ({ txt: el.textContent.slice(0, 24), px: parseFloat(getComputedStyle(el).fontSize), color: getComputedStyle(el).color })),
            titulos: [...s.querySelectorAll("h2, h3")].map((el) => ({ txt: el.textContent.slice(0, 24), peso: +getComputedStyle(el).fontWeight })),
            boton: parseFloat(getComputedStyle(s.querySelector(".dz-boton")).fontSize),
          };
        });
        assert.deepEqual(estilos.degradados, [], `${tag}: sin fondos degradados`);
        const minimo = ancho === 390 ? 17 : 16;
        for (const t of estilos.textos) {
          assert.ok(t.px >= minimo, `${tag}: «${t.txt}» a ${t.px} px (mínimo ${minimo})`);
          assert.ok(lum(t.color) <= LUM_LIMITE, `${tag}: «${t.txt}» color ${t.color} más claro que #4B5563`);
        }
        assert.ok(estilos.boton >= minimo, `${tag}: botón a ${estilos.boton} px`);
        for (const t of estilos.titulos) assert.equal(t.peso, 700, `${tag}: «${t.txt}» peso ${t.peso}`);

        // Acomodo: lado a lado en la portada de escritorio, una debajo de la otra en celular; sin desborde.
        const [c1, c2] = [await tarjetas.nth(0).boundingBox(), await tarjetas.nth(1).boundingBox()];
        if (ancho === 390) assert.ok(c2.y >= c1.y + c1.height - 1, `${tag}: una tarjeta debajo de la otra`);
        else assert.ok(Math.abs(c1.y - c2.y) < 2 && c2.x > c1.x + c1.width - 1, `${tag}: tarjetas lado a lado`);
        assert.ok(c1.x >= 0 && c2.x + c2.width <= ancho, `${tag}: tarjetas dentro de la pantalla`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), ancho, `${tag}: sin desborde`);

        // Movimiento discreto: sube al pasar el cursor; quieta con reducir movimiento.
        if (ancho === 1440) {
          await tarjetas.nth(0).hover();
          await dormir(400);
          const tr = await tarjetas.nth(0).evaluate((el) => getComputedStyle(el).transform);
          if (reducir) assert.ok(tr === "none" || tr === "matrix(1, 0, 0, 1, 0, 0)", `${tag}: quieta (${tr})`);
          else assert.match(tr, /matrix\(1, 0, 0, 1, 0, -4\)/, `${tag}: se eleva 4 px (${tr})`);
          await page.mouse.move(2, 2);
          await dormir(400);
        }

        // Descarga real con el nombre bonito (una vez por página, en escritorio).
        if (ancho === 1440 && !reducir) {
          for (const d of DESCARGAS) {
            const [descarga] = await Promise.all([page.waitForEvent("download", { timeout: 15_000 }), sec.getByRole("link", { name: `Descargar ${d.enlace} en PDF` }).click()]);
            assert.equal(descarga.suggestedFilename(), d.nombreDescarga, `${tag}: nombre de la descarga`);
            assert.equal((await descarga.failure()) ?? null, null, `${tag}: descarga completa`);
          }
          for (const p of ctx.pages()) if (p !== page) await p.close();
        }

        if (CAPTURAS && !reducir) {
          await page.addStyleTag({ content: SIN_FLOTANTES });
          await page.mouse.move(2, 2);
          await sec.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
          await dormir(500);
          await sec.screenshot({ path: `${CAPTURAS}/descargas-${pg.nombre}-${ancho}.png`, animations: "disabled" });
        }
        assert.deepEqual(errores, [], `${tag}: errores de la página`);
        await page.close();
      }
      await ctx.close();
    }
  }
  exito = true;
  console.log(`OK descargas: ${DESCARGAS.length} PDF (200, application/pdf, peso anunciado) y miniaturas; portada y Cotizar a 1440 y 390 con dos tarjetas, alt, «Descargar … en PDF», download con nombre bonito (descarga real), botón ≥ 48 px, lugar en el flujo, 16/17 px, títulos 700, secundario ≤ #4B5563, sin degradados, apiladas en celular, sin desborde, se elevan al pasar el cursor y quietas con reducir movimiento; robots.txt no bloquea /descargas/`);
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
