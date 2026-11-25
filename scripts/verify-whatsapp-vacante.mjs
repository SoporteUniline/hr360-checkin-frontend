// Verificación en navegador de «Pedir información por WhatsApp» (25/11/2026) en /vacante/[slug] y en /bolsa-de-trabajo.
// Backend simulado (nada sale a internet): el navegador pide a https://api.prueba.invalid (interceptado) y el servidor
// de Next pide la vacante a un servidor local (RUTA_BACKEND_SERVIDOR). wa.me también se intercepta.
// Cubre, a 1440 y 390 px: botón visible con el href exacto del API cuando hay enlace y ausente cuando es null; pestaña
// nueva sin opener (rel="noopener noreferrer"); nombre accesible con el título; texto de apoyo según el asistente;
// ≥ 44 px; contraste ≥ 4.5:1; en celular, en la barra fija junto a «Postularme ahora»; enlaces de la API que no son wa.me
// no se muestran; en la bolsa, acceso por tarjeta sin abrir la vacante; sin scroll horizontal.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx \
//      NEXT_PUBLIC_RECRUITMENT_ENABLED=true npx next build
//      CAPTURAS=/ruta/capturas node scripts/verify-whatsapp-vacante.mjs
import { spawn } from "node:child_process";
import { createServer as servidorNet } from "node:net";
import { createServer as servidorHttp } from "node:http";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
if (OUT) mkdirSync(OUT, { recursive: true });
const API_ORIGEN = "https://api.prueba.invalid";
const require = createRequire(REPO + "/package.json");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const puertoLibre = async () => {
  const s = servidorNet();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
};

// ——— Datos simulados ———
const wa = (token, titulo) => `https://wa.me/5215550000000?text=${encodeURIComponent(`Hola, me interesa más información sobre la vacante de ${titulo}. ID: ${token}`)}`;
const base0 = {
  id_empresa: 1, nombre_empresa: "Empacadora del Norte", giro: "Logística", url_imagen: "", estado: "Abierta",
  descripcion: "<p>Reparte <strong>pedidos</strong> en la zona metropolitana con unidad de la empresa.</p>",
  responsabilidades: "<ul><li>Cargar y descargar la unidad</li><li>Entregar a tiempo</li></ul>",
  escolaridad: "<p>Secundaria terminada</p>", experiencia: "<p>1 año manejando unidad de reparto</p>", habilidades: "", idiomas: "",
  horario: "Lunes a viernes de 8:00 a 17:00", direccion: "Av. Constitución 100, Centro", ciudad: "Monterrey", entidad: "Nuevo León", pais: "México",
  modalidad: "Presencial", salario: "$12,000 a $14,000 mensuales", tipo_contrato: "Tiempo completo", tipo_contratacion: "Empleado",
  fecha_publicacion: new Date().toISOString(), puestos_disponibles: 2,
};
const VACANTES = [
  { ...base0, id_vacante: 1, titulo: "Chofer repartidor de ruta foránea", slug: "chofer-wa", whatsapp: { enlace: wa("a1b2c3d4e5f6a1b2c3d4e5f6", "Chofer repartidor de ruta foránea"), asistente: true } },
  { ...base0, id_vacante: 2, titulo: "Cajera de piso", slug: "cajera-sin-asistente", nombre_empresa: "Farmacias Lupita", whatsapp: { enlace: wa("0f0f0f0f0f0f0f0f0f0f0f0f", "Cajera de piso"), asistente: false } },
  { ...base0, id_vacante: 3, titulo: "Auxiliar de almacén", slug: "almacen-sin-wa", nombre_empresa: "Constructora Avance", whatsapp: null },
  { ...base0, id_vacante: 4, titulo: "Recepcionista", slug: "recepcion-enlace-raro", whatsapp: { enlace: "javascript:alert(1)", asistente: true } },
];
const detalle = (v) => ({ ...v, preguntas_formulario: [], version_formulario: 1, recibe_postulaciones: true });

const mockPort = await puertoLibre();
const mock = servidorHttp((req, res) => {
  const slug = decodeURIComponent((req.url.match(/^\/api\/vacantes\/slug\/([^?]+)/) || [])[1] || "");
  const v = VACANTES.find((x) => x.slug === slug);
  res.writeHead(v ? 200 : 404, { "content-type": "application/json" });
  res.end(JSON.stringify(v ? detalle(v) : { error: "Vacante no encontrada" }));
});
await new Promise((r) => mock.listen(mockPort, "127.0.0.1", r));

const port = await puertoLibre();
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, [REPO + "/node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { cwd: REPO, stdio: "ignore", env: { ...process.env, JWT_SECRET: randomUUID(), RUTA_BACKEND_SERVIDOR: `http://127.0.0.1:${mockPort}/api` } });

async function instalarMocks(ctx) {
  await ctx.addInitScript(() => { try { localStorage.setItem("adamia_cookies_publicidad", "rechazadas"); } catch { /* sin almacenamiento */ } });
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base || url.protocol === "data:") return route.continue();
    if (url.hostname === "wa.me") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>WhatsApp</title><p>wa.me simulado</p>" });
    if (url.origin !== API_ORIGEN) return route.abort();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    if (p === "/vacantes/filter") return json({ total: VACANTES.length, page: 1, limit: 10, data: VACANTES });
    if (p === "/empresas/activas") return json({ total: 0, page: 1, limit: 4, data: [] });
    if (p === "/vacantes/entidades") return json({ entidades: ["Nuevo León"], ciudades: ["Monterrey"], paises: ["México"] });
    if (p === "/empresas/giros") return json({ giros: ["Logística"] });
    if (p.startsWith("/vacantes/slug/")) {
      const v = VACANTES.find((x) => x.slug === decodeURIComponent(p.slice("/vacantes/slug/".length)));
      return v ? json(detalle(v)) : json({ error: "Vacante no encontrada" }, 404);
    }
    if (p.startsWith("/vacantes/check-positions/")) return json({ available: true });
    if (p === "/users/verify/token") return json({ error: "Sin sesión" }, 401);
    return json({});
  });
}

// Contraste WCAG entre el color del texto y el fondo efectivo del elemento.
const contraste = (pg, loc) => loc.evaluate((el) => {
  const rgb = (c) => c.match(/[\d.]+/g).slice(0, 4).map(Number);
  let fondo = null;
  for (let n = el; n && !fondo; n = n.parentElement) {
    const c = rgb(getComputedStyle(n).backgroundColor);
    if (c.length < 4 || c[3] > 0) fondo = c;
  }
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [a, b] = [lum(rgb(getComputedStyle(el).color)), lum(fondo ?? [255, 255, 255])].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
});
const sinScrollHorizontal = (pg) => pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const etiqueta = (t) => `Pedir información por WhatsApp sobre la vacante ${t} (se abre en otra pestaña)`;

async function abreSinOpener(ctx, pg, loc, esperado) {
  const [popup] = await Promise.all([ctx.waitForEvent("page"), loc.click()]);
  await popup.waitForLoadState("domcontentloaded");
  assert.equal(popup.url(), esperado, "abre el enlace exacto");
  assert.equal(await popup.evaluate(() => window.opener), null, "sin opener (noopener)");
  await popup.close();
}

const resultados = [];
const ok = (m) => { resultados.push(m); console.log(`  ✓ ${m}`); };

try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base)).status) break; } catch { /* arrancando */ } await dormir(300); }
  const browser = await chromium.launch();
  for (const [ancho, alto] of [[1440, 900], [390, 844]]) {
    const movil = ancho < 600;
    const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil, locale: "es-MX" });
    await instalarMocks(ctx);
    const pg = await ctx.newPage();
    const errores = [];
    pg.on("pageerror", (e) => errores.push(String(e)));

    // ——— Vacante con enlace y asistente ———
    const v1 = VACANTES[0];
    await pg.goto(`${base}/vacante/${v1.slug}`, { waitUntil: "networkidle" });
    await pg.locator(".vc-lado h1, .vc-cab h1").first().waitFor();
    const tarjeta = pg.locator(".vc-wa-bloque .vc-wa");
    await tarjeta.waitFor({ state: "visible" });
    assert.equal(await tarjeta.getAttribute("href"), v1.whatsapp.enlace, "href exacto del API");
    assert.equal(await tarjeta.getAttribute("target"), "_blank");
    assert.deepEqual((await tarjeta.getAttribute("rel")).split(/\s+/).sort(), ["noopener", "noreferrer"]);
    assert.equal(await tarjeta.getAttribute("aria-label"), etiqueta(v1.titulo));
    assert.equal(await pg.getByRole("link", { name: etiqueta(v1.titulo) }).first().getAttribute("href"), v1.whatsapp.enlace);
    assert.equal((await tarjeta.innerText()).trim(), "Pedir información por WhatsApp");
    assert.equal(await pg.locator("#vc-wa-apoyo").innerText(), "Te responde nuestro asistente en minutos.");
    assert.equal(await tarjeta.getAttribute("aria-describedby"), "vc-wa-apoyo");
    const cajaT = await tarjeta.boundingBox();
    assert.ok(cajaT.height >= 44 && cajaT.width >= 44, `tamaño táctil ${cajaT.width}x${cajaT.height}`);
    const cr = await contraste(pg, tarjeta);
    assert.ok(cr >= 4.5, `contraste ${cr.toFixed(2)}`);
    assert.ok(await tarjeta.locator("svg").isVisible(), "con icono");
    const postular = pg.locator(".vc-btn-postular");
    const barra = pg.locator(".vc-postular .vc-wa-barra");
    if (movil) {
      await barra.waitFor({ state: "visible" });
      assert.equal(await barra.getAttribute("href"), v1.whatsapp.enlace);
      assert.equal(await barra.getAttribute("aria-label"), etiqueta(v1.titulo));
      const cb = await barra.boundingBox();
      const cp = await postular.boundingBox();
      assert.ok(cb.height >= 44, `barra ${cb.height}px`);
      assert.ok(cb.y + cb.height <= alto && cb.y >= alto - 110, `al alcance del pulgar (y=${cb.y})`);
      assert.ok(Math.abs(cb.y - cp.y) < 4 && cb.x > cp.x, "junto a «Postularme ahora», en la misma fila");
      assert.ok(cb.x + cb.width <= ancho, "no se sale de la pantalla");
      assert.ok((await contraste(pg, barra)) >= 4.5);
      assert.equal((await barra.innerText()).trim(), "WhatsApp");
      ok(`${ancho}: barra fija con «Postularme ahora» + WhatsApp (${Math.round(cb.width)}x${Math.round(cb.height)}, y=${Math.round(cb.y)})`);
    } else {
      assert.equal(await barra.isVisible(), false, "en escritorio no hay barra");
      const cp = await postular.boundingBox();
      assert.ok(cajaT.y > cp.y && cajaT.y - (cp.y + cp.height) < 24, "justo debajo de «Postularme»");
    }
    assert.ok(await sinScrollHorizontal(pg), "sin scroll horizontal");
    ok(`${ancho}: /vacante/${v1.slug} botón visible, href exacto, aria-label, ${Math.round(cajaT.height)}px, contraste ${cr.toFixed(2)}:1, apoyo del asistente`);
    if (OUT) {
      await pg.screenshot({ path: `${OUT}/vacante-con-wa-${ancho}.png` });
      await pg.locator(".vc-tarjeta").screenshot({ path: `${OUT}/vacante-con-wa-tarjeta-${ancho}.png` });
    }
    await abreSinOpener(ctx, pg, movil ? barra : tarjeta, v1.whatsapp.enlace);
    assert.equal(new URL(pg.url()).pathname, `/vacante/${v1.slug}`, "la página se queda donde estaba");
    ok(`${ancho}: abre wa.me en pestaña nueva sin opener`);

    // ——— Sin asistente: otro texto de apoyo ———
    await pg.goto(`${base}/vacante/${VACANTES[1].slug}`, { waitUntil: "networkidle" });
    await pg.locator(".vc-wa-bloque .vc-wa").waitFor();
    assert.equal(await pg.locator("#vc-wa-apoyo").innerText(), "Te responde el equipo de reclutamiento.");
    ok(`${ancho}: sin agente encendido → «Te responde el equipo de reclutamiento.»`);

    // ——— Sin enlace (null) y enlace que no es wa.me: no se muestra ———
    for (const v of [VACANTES[2], VACANTES[3]]) {
      await pg.goto(`${base}/vacante/${v.slug}`, { waitUntil: "networkidle" });
      await postular.waitFor({ state: "visible" });
      await dormir(300);
      assert.equal(await pg.locator(".vc-wa, #vc-wa-apoyo").count(), 0, `${v.slug}: sin botón`);
      assert.equal(await pg.locator('a[href^="https://wa.me/"], a[href^="javascript:"]').count(), 0);
      assert.ok(await sinScrollHorizontal(pg));
      if (OUT && v === VACANTES[2]) await pg.screenshot({ path: `${OUT}/vacante-sin-wa-${ancho}.png` });
    }
    ok(`${ancho}: whatsapp null y enlace «javascript:» → no hay botón`);

    // ——— Bolsa ———
    await pg.goto(`${base}/bolsa-de-trabajo`, { waitUntil: "networkidle" });
    await pg.locator(".bt-vac").first().waitFor();
    const accesos = pg.locator(".bt-vac-wa");
    assert.equal(await accesos.count(), 2, "solo las tarjetas con enlace wa.me");
    for (const v of VACANTES) {
      const t = pg.locator(`.bt-vac[data-vacante="${v.slug}"] .bt-vac-wa`);
      if (v.whatsapp?.enlace?.startsWith("https://wa.me/")) {
        assert.equal(await t.getAttribute("href"), v.whatsapp.enlace, `${v.slug}: href exacto`);
        assert.equal(await t.getAttribute("aria-label"), etiqueta(v.titulo));
        assert.deepEqual((await t.getAttribute("rel")).split(/\s+/).sort(), ["noopener", "noreferrer"]);
        const c = await t.boundingBox();
        assert.ok(c.height >= 44, `${v.slug}: ${c.height}px`);
        assert.ok(c.x + c.width <= ancho);
        assert.ok((await contraste(pg, t)) >= 4.5, `${v.slug}: contraste`);
      } else {
        assert.equal(await t.count(), 0, `${v.slug}: sin acceso`);
      }
    }
    assert.ok(await sinScrollHorizontal(pg), "bolsa sin scroll horizontal");
    if (OUT) {
      await pg.locator(".bt-lista").screenshot({ path: `${OUT}/bolsa-${ancho}.png` });
      await pg.screenshot({ path: `${OUT}/bolsa-pantalla-${ancho}.png` });
    }
    // Tocar WhatsApp no abre la vacante (queda por encima del enlace de toda la tarjeta).
    await abreSinOpener(ctx, pg, pg.locator(`.bt-vac[data-vacante="${VACANTES[0].slug}"] .bt-vac-wa`), VACANTES[0].whatsapp.enlace);
    await dormir(300);
    assert.equal(new URL(pg.url()).pathname, "/bolsa-de-trabajo", "la tarjeta no navegó");
    ok(`${ancho}: bolsa con 2 accesos discretos (href exacto, ≥44 px, contraste), ninguno en null/«javascript:», no abre la vacante`);

    assert.deepEqual(errores, [], "sin errores en la página");
    await ctx.close();
  }
  await browser.close();
  console.log(`\nverify-whatsapp-vacante: ${resultados.length} comprobaciones correctas`);
} finally {
  next.kill();
  mock.close();
}
