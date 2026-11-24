// Verificación en navegador de la bolsa de trabajo pública (rediseño 23/11/2026): /bolsa-de-trabajo y /vacante/[slug].
// Backend simulado (nada sale a internet): el navegador pide a https://api.prueba.invalid (interceptado) y el servidor
// de Next pide la vacante a un servidor local (RUTA_BACKEND_SERVIDOR) para el título y el JSON-LD.
// Cubre: escritorio 1440 y celular 390 sin desborde; buscar y filtrar con los parámetros exactos del API; paginación;
// vacío y error con «Reintentar»; tira de empresas (?bolsa=1); hoja de filtros en celular; abrir una vacante y
// postularse (preguntas propias, CV, OTP incorrecto y correcto, token y multipart); vacante inexistente y error;
// controles de al menos 44 px; y que no aparezca «HR360» en el texto, el título ni las imágenes.
// Carrusel de la portada (24/11/2026): avanza solo de lado a lado, puntos, flechas, teclado, pausa (botón, cursor y
// tocar), deslizar con el dedo, «reducir movimiento», buscador fijo mientras cambian las diapositivas, y el enlace
// «Bolsa de trabajo» del menú del sitio (escritorio y celular) lleva a /bolsa-de-trabajo.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx NEXT_PUBLIC_RECRUITMENT_ENABLED=true npm run build
//      CAPTURAS=/ruta/capturas node scripts/verify-bolsa.mjs
import { spawn } from "node:child_process";
import { createServer as servidorNet } from "node:net";
import { createServer as servidorHttp } from "node:http";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
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
const hoy = new Date();
const diasAtras = (n) => new Date(hoy.getTime() - n * 86400000).toISOString();
const LOGO = (color) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="112" height="44"><rect rx="8" width="112" height="44" fill="${color}"/></svg>`)}`;
const EMPRESAS = [
  { id_empresa: 1, nombre_empresa: "Empacadora del Norte", giro: "Logística", url_imagen: LOGO("#2c56e8") },
  { id_empresa: 2, nombre_empresa: "Farmacias Lupita", giro: "Comercio", url_imagen: LOGO("#5a3cf4") },
  { id_empresa: 3, nombre_empresa: "Constructora Avance", giro: "Construcción", url_imagen: LOGO("#0b1033") },
  { id_empresa: 4, nombre_empresa: "Hotel Costa Alegre", giro: "Turismo", url_imagen: "" },
];
const PUESTOS = ["Chofer repartidor", "Cajera de piso", "Auxiliar de almacén", "Recepcionista bilingüe", "Becario de sistemas", "Operador de montacargas", "Practicante de contabilidad", "Ayudante general"];
const LUGARES = [["Monterrey", "Nuevo León"], ["Guadalajara", "Jalisco"], ["Zapopan", "Jalisco"], ["Autlán de Navarro", "Jalisco"], ["Querétaro", "Querétaro"]];
const VACANTES = Array.from({ length: 23 }, (_, i) => {
  const e = EMPRESAS[i % 4];
  const [ciudad, entidad] = LUGARES[i % LUGARES.length];
  const titulo = i === 0 ? "Chofer repartidor" : `${PUESTOS[i % PUESTOS.length]} ${i + 1}`;
  return {
    id_vacante: 100 + i, id_empresa: e.id_empresa, nombre_empresa: e.nombre_empresa, giro: e.giro, url_imagen: e.url_imagen,
    titulo, slug: i === 0 ? "chofer-repartidor-monterrey" : `vacante-${i + 1}`,
    descripcion: i === 0 ? '<p>Reparte <strong>pedidos</strong> en la zona metropolitana.</p><img src=x onerror="window.__xss=1">' : `<p>Únete al equipo de ${e.nombre_empresa}. Ofrecemos prestaciones de ley, capacitación y crecimiento.</p>`,
    responsabilidades: "<ul><li>Cargar y descargar la unidad</li><li>Entregar a tiempo</li></ul>",
    escolaridad: "<p>Secundaria terminada</p>", experiencia: "<p>1 año manejando unidad de reparto</p>", habilidades: "<ul><li>Orientación a resultados</li></ul>", idiomas: i % 3 ? "Español" : "",
    horario: "Lunes a viernes de 8:00 a 17:00", direccion: i === 0 ? "Av. Constitución 100, Centro" : "", ciudad, entidad, pais: "México",
    modalidad: i % 5 === 0 ? "Remoto" : "Presencial", salario: i % 3 === 0 ? "$12,000 a $14,000 mensuales" : i % 3 === 1 ? "9500" : "No establecido",
    tipo_contrato: "Tiempo completo", tipo_contratacion: /Becario/.test(titulo) ? "Becario" : /Practicante/.test(titulo) ? "Practicante" : "Empleado",
    fecha_publicacion: diasAtras(i), puestos_disponibles: 2,
  };
});
const PREGUNTAS = [
  { id: "p1", label: "¿Tienes licencia de manejo vigente?", type: "select", required: true, options: ["Sí, tipo B", "Sí, tipo C", "No"] },
  { id: "p2", label: "¿Qué turnos puedes cubrir?", type: "multiselect", required: false, options: ["Mañana", "Tarde"] },
  { id: "p3", label: "Cuéntanos de tu último reparto", type: "textarea", required: false },
];
const detalle = (v) => ({ ...v, preguntas_formulario: v.slug === "chofer-repartidor-monterrey" ? PREGUNTAS : [], version_formulario: 1, recibe_postulaciones: true });

const S = { falla: 0, slugFalla: 0, empresas: EMPRESAS };
const filtros = []; // parámetros de cada GET /vacantes/filter
const publicos = []; // demás llamadas públicas (ruta + consulta)
const envios = { otpSend: [], otpVerify: [], create: [] };

function filtrar(q) {
  const like = (campo, v) => !v || String(campo ?? "").toLowerCase().includes(v.toLowerCase());
  const lista = VACANTES.filter((v) => like(v.titulo, q.get("titulo")) && like(v.entidad, q.get("entidad")) && like(v.ciudad, q.get("ciudad"))
    && like(v.pais, q.get("pais")) && like(v.tipo_contratacion, q.get("tipo_contratacion")) && like(v.giro, q.get("giro"))
    && (!q.get("id_empresa") || String(v.id_empresa) === q.get("id_empresa")));
  const limit = Number(q.get("limit")) || 10;
  const page = Number(q.get("page")) || 1;
  if (!lista.length) return { message: "No se encontraron vacantes activas con esos filtros.", total: 0, page: 1, limit: 0, data: [] };
  return { total: lista.length, page, limit, data: lista.slice((page - 1) * limit, page * limit) };
}

// Servidor local para las peticiones del servidor de Next (metadatos y JSON-LD).
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
  // Aviso de cookies ya contestado («Solo necesarias»): no tapa la barra fija ni las capturas.
  await ctx.addInitScript(() => { try { localStorage.setItem("adamia_cookies_publicidad", "rechazadas"); } catch { /* sin almacenamiento */ } });
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.protocol === "data:") return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin !== API_ORIGEN) return route.abort();
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    if (p === "/vacantes/filter") {
      filtros.push(url.search.slice(1));
      if (S.falla > 0) { S.falla -= 1; return json({ error: "Request failed with status code 500" }, 500); }
      return json(filtrar(url.searchParams));
    }
    publicos.push({ ruta: p, params: url.search });
    if (p === "/empresas/activas") return json({ total: S.empresas.length, page: 1, limit: 4, data: S.empresas });
    if (p === "/vacantes/entidades") return json({ entidades: ["Jalisco", "Nuevo León", "Querétaro"], ciudades: ["Autlán de Navarro", "Guadalajara", "Monterrey", "Querétaro", "Zapopan"], paises: ["México"] });
    if (p === "/empresas/giros") return json({ giros: ["Comercio", "Construcción", "Logística", "Turismo"] });
    if (p.startsWith("/vacantes/slug/")) {
      if (S.slugFalla > 0) { S.slugFalla -= 1; return json({ error: "Error interno" }, 500); }
      const v = VACANTES.find((x) => x.slug === decodeURIComponent(p.slice("/vacantes/slug/".length)));
      return v ? json(detalle(v)) : json({ error: "Vacante no encontrada" }, 404);
    }
    if (p.startsWith("/vacantes/check-positions/")) return json({ available: true });
    if (p === "/otp/send") { envios.otpSend.push(req.postDataJSON()); return json({ message: "Código de verificación enviado" }); }
    if (p === "/otp/verify") {
      const b = req.postDataJSON();
      envios.otpVerify.push(b);
      return b.code === "123456" ? json({ message: "Teléfono verificado", verification_token: "tok-verificado-1" }) : json({ error: "El código no es correcto." }, 400);
    }
    if (p === "/postulaciones/create") {
      envios.create.push({ tipo: req.headers()["content-type"] || "", cuerpo: (req.postDataBuffer() || Buffer.alloc(0)).toString("latin1") });
      return json({ message: "Postulación enviada exitosamente" });
    }
    return json({});
  });
}

const errores = [];
const problemas = [];
const ultimo = () => filtros[filtros.length - 1] || "";
async function esperarFiltro(predicado, msg) {
  for (let i = 0; i < 100; i++) { if (filtros.some(predicado)) return; await dormir(100); }
  throw new Error(`No llegó la consulta esperada: ${msg}. Última: ${ultimo()}`);
}
const q = (s) => new URLSearchParams(s);

// ——— Carrusel ———
const CARR = 'section[aria-roledescription="carrusel"]';
const slideActual = (pg) => pg.evaluate((sel) => [...document.querySelectorAll(`${sel} .slide`)].findIndex((d) => d.classList.contains("on")), CARR);
const esperarSlide = (pg, n, timeout = 4000) => pg.waitForFunction(([sel, i]) => document.querySelectorAll(`${sel} .slide`)[i]?.classList.contains("on"), [CARR, n], { timeout });
// Desplazamiento horizontal (px) de cada diapositiva cuando termina la transición.
const posiciones = (pg) => pg.evaluate((sel) => [...document.querySelectorAll(`${sel} .slide`)].map((d) => Math.round(new DOMMatrixReadOnly(getComputedStyle(d).transform).m41)), CARR);
const cajaBuscador = async (pg) => { const b = await pg.locator(".bt-buscar").boundingBox(); return `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.width)},${Math.round(b.height)}`; };
async function deslizar(pg, dx) {
  await pg.evaluate(([sel, d]) => {
    const el = document.querySelector(`${sel} .slide.on .slide-txt`);
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + 20;
    const t = (cx) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: y });
    el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true, touches: [t(x)], changedTouches: [t(x)] }));
    el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true, touches: [], changedTouches: [t(x + d)] }));
  }, [CARR, dx]);
}
async function revisarCarrusel(pg, ancho) {
  const carr = pg.locator(CARR);
  assert.equal(await carr.getAttribute("aria-label"), "Bolsa de trabajo de ADAMIA");
  assert.equal(await carr.locator(".slide").count(), 4, "4 diapositivas");
  assert.equal(await carr.locator('.slide[aria-roledescription="diapositiva"]').count(), 4);
  for (const n of ["Anterior", "Siguiente", "Pausar"]) await carr.getByRole("button", { name: n }).waitFor();
  assert.equal(await carr.getByRole("tab").count(), 4, "un punto por diapositiva");
  // Solo la diapositiva visible está expuesta y sus botones se alcanzan con el tabulador.
  assert.equal(await carr.locator('.slide[aria-hidden="false"]').count(), 1);
  assert.equal(await carr.locator('.slide[aria-hidden="true"] a[tabindex="0"]').count(), 0);
  // No hay imágenes externas: todas vienen de /landing o /assets.
  for (const src of await carr.locator("img").evaluateAll((im) => im.map((i) => i.getAttribute("src")))) assert.match(src, /^\/(landing|assets)\//, `imagen externa en el carrusel: ${src}`);
  const caja = await cajaBuscador(pg);
  // Avanza solo (cursor fuera) y de lado a lado: la anterior queda a la izquierda y la siguiente a la derecha.
  await pg.mouse.move(ancho - 5, 880 > ancho ? 830 : 880);
  await pg.locator("body").evaluate(() => document.activeElement?.blur());
  assert.equal(await slideActual(pg), 0);
  await esperarSlide(pg, 1, 9000);
  await dormir(1000);
  const pos = await posiciones(pg);
  assert.ok(pos[0] < 0 && pos[1] === 0 && pos[2] > 0, `se recorre de lado a lado: ${pos.join(", ")}`);
  assert.equal(await cajaBuscador(pg), caja, "el buscador no se mueve con las diapositivas");
  // Flechas (con vuelta al inicio) y puntos.
  await carr.getByRole("button", { name: "Siguiente" }).click();
  await esperarSlide(pg, 2);
  await carr.getByRole("button", { name: "Anterior" }).click();
  await esperarSlide(pg, 1);
  await carr.getByRole("tab", { name: /^Ir a 4: ¿Tu empresa contrata\?/ }).click();
  await esperarSlide(pg, 3);
  assert.equal(await carr.getByRole("tab", { name: /^Ir a 4/ }).getAttribute("aria-selected"), "true");
  const s4 = carr.locator(".slide.on");
  assert.equal(await s4.getByRole("link", { name: /Solicitar demo/ }).getAttribute("href"), "/contacto");
  assert.equal(await s4.getByRole("link", { name: "Contratar" }).getAttribute("href"), "/contratar-plan");
  await carr.getByRole("button", { name: "Siguiente" }).click();
  await esperarSlide(pg, 0);
  await carr.getByRole("button", { name: "Anterior" }).click();
  await esperarSlide(pg, 3);
  // Teclado: flechas sobre el carrusel.
  await carr.getByRole("tab", { name: /^Ir a 2/ }).focus();
  await pg.keyboard.press("ArrowRight");
  await esperarSlide(pg, 0);
  await pg.keyboard.press("ArrowLeft");
  await esperarSlide(pg, 3);
  // Pausa con el botón: no avanza aunque pase el tiempo; «Reanudar» lo vuelve a mover.
  await carr.getByRole("button", { name: "Pausar" }).click();
  await carr.getByRole("button", { name: "Reanudar" }).waitFor();
  await pg.mouse.move(ancho - 5, 600);
  await pg.locator("body").evaluate(() => document.activeElement?.blur());
  assert.match(await carr.getAttribute("class"), /parado/);
  await dormir(6800);
  assert.equal(await slideActual(pg), 3, "pausado no avanza");
  await carr.getByRole("button", { name: "Reanudar" }).click();
  await pg.mouse.move(ancho - 5, 880 > ancho ? 830 : 880);
  await pg.locator("body").evaluate(() => document.activeElement?.blur());
  await esperarSlide(pg, 0, 9000);
  return caja;
}

// Sin desborde horizontal, controles de al menos 44 px (casillas: 24 px) y sin rastro de HR360 en texto ni imágenes.
async function revisar(pg, pantalla, ancho) {
  const r = await pg.evaluate(() => {
    const visible = (el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0" && el.getAttribute("aria-hidden") !== "true"; };
    const raices = [...document.querySelectorAll(".lh.bt, .lh.vc, [role=dialog]")];
    const ctrls = [...new Set(raices.flatMap((r) => [...r.querySelectorAll("button, a[href], select, input:not([type=hidden]):not([type=file]), textarea")]))]
      .filter(visible)
      .filter((el) => !el.classList.contains("bt-vac-link") && !el.closest(".vc-acepto-txt") && !el.closest("[data-input-otp-container]") && !(el.tagName === "INPUT" && el.type === "radio")
        // Casilla nativa dentro de una etiqueta de 44 px: el objetivo táctil es la etiqueta.
        && !(el.tagName === "INPUT" && el.type === "checkbox" && (el.closest("label")?.getBoundingClientRect().height ?? 0) >= 43.5));
    const chicos = ctrls.map((el) => ({ el, b: el.getBoundingClientRect() }))
      .filter(({ el, b }) => (el.getAttribute("role") === "checkbox" ? b.height < 23.5 : b.height < 43.5))
      .map(({ el, b }) => `${el.tagName.toLowerCase()} «${(el.getAttribute("aria-label") || el.textContent || el.name || "").trim().slice(0, 40)}» ${Math.round(b.width)}×${Math.round(b.height)}`);
    const imagenes = [...document.querySelectorAll("img")].map((i) => i.currentSrc || i.src)
      .concat([...document.querySelectorAll("*")].map((el) => getComputedStyle(el).backgroundImage).filter((b) => b && b !== "none"));
    return { ancho: document.documentElement.scrollWidth, chicos, texto: document.body.innerText, titulo: document.title, imagenes, descripcion: document.querySelector('meta[name="description"]')?.content || "" };
  });
  if (r.ancho > ancho) problemas.push(`${pantalla}: desborde horizontal (${r.ancho} px > ${ancho})`);
  for (const c of r.chicos) problemas.push(`${pantalla}: control chico ${c}`);
  if (/hr\s?360/i.test(r.texto + r.titulo + r.descripcion)) problemas.push(`${pantalla}: aparece «HR360» en el texto o el título`);
  for (const src of r.imagenes) if (/hr360|bg_bolsa_trabajo|logo2\.png|favicon10/i.test(src)) problemas.push(`${pantalla}: imagen de HR360 (${src.slice(0, 80)})`);
  if (/Request failed|status code|Ops, hubo un error/i.test(r.texto)) problemas.push(`${pantalla}: error crudo en pantalla`);
  return r;
}
const foto = (pg, nombre) => (OUT ? pg.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: true }) : null);
const cerrarCookies = async (pg) => {
  const b = pg.getByRole("button", { name: "Solo necesarias" });
  if (await b.isVisible({ timeout: 2500 }).catch(() => false)) await b.click();
};

let browser;
try {
  for (let i = 0; i < 120; i++) { try { const r = await fetch(base + "/bolsa-de-trabajo"); if (r.ok) break; } catch { /* aún arranca */ } await dormir(500); }
  browser = await chromium.launch();

  // ═════════ Escritorio 1440 ═════════
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await instalarMocks(ctx);
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));
  pg.on("dialog", (d) => { errores.push(`diálogo inesperado: ${d.message()}`); d.dismiss(); });
  await pg.goto(base + "/bolsa-de-trabajo", { waitUntil: "domcontentloaded" });
  await cerrarCookies(pg);
  await pg.getByRole("heading", { level: 1, name: "Encuentra tu próximo trabajo" }).waitFor({ timeout: 30000 });
  await pg.getByRole("link", { name: "Chofer repartidor", exact: true }).waitFor({ timeout: 20000 });
  assert.equal(await pg.title(), "Bolsa de trabajo | ADAMIA");
  assert.match(await pg.locator('meta[name="description"]').getAttribute("content"), /Encuentra tu próximo trabajo/);
  assert.equal(await pg.locator(".bt-conteo b").innerText(), "23 vacantes abiertas");
  assert.match(await pg.locator(".bt-conteo").innerText(), /en 3 estados/);
  assert.equal(filtros[0], "giro=&ciudad=&entidad=&pais=&titulo=&id_empresa=&tipo_contratacion=&page=1&limit=10", "primera consulta igual que antes");
  assert.equal(await pg.locator(".bt-vac").count(), 10);
  // Tarjeta: puesto, empresa, ubicación, modalidad, sueldo y fecha.
  const t1 = await pg.locator('[data-vacante="chofer-repartidor-monterrey"]').innerText();
  for (const t of ["Empacadora del Norte", "Monterrey, Nuevo León", "Remoto", "Empleado", "$12,000 a $14,000 mensuales", "Publicada hoy", "Nueva"]) assert.ok(t1.includes(t), `tarjeta sin «${t}»: ${t1}`);
  assert.ok((await pg.locator('[data-vacante="vacante-2"]').innerText()).includes("$9,500"), "sueldo numérico formateado");
  assert.ok(!(await pg.locator('[data-vacante="vacante-3"]').innerText()).includes("No establecido"), "sin sueldo no se muestra «No establecido»");
  // Tira de empresas (?bolsa=1, nunca la lista global).
  await pg.getByRole("heading", { name: "Empresas que están contratando" }).waitFor();
  assert.ok(publicos.some((x) => x.ruta === "/empresas/activas" && x.params === "?bolsa=1&limit=4&page=1"));
  assert.equal(publicos.filter((x) => x.ruta === "/empresas/activas" && !/bolsa=1/.test(x.params)).length, 0);
  assert.equal(await pg.locator(".bt-logo").count(), 4);
  await revisar(pg, "bolsa escritorio", 1440);
  await foto(pg, "bolsa-escritorio");
  if (OUT) await pg.screenshot({ path: `${OUT}/bolsa-escritorio-portada.png` });

  // Carrusel: avanza, flechas, puntos, teclado y pausa; el buscador queda fijo. Pausa con el cursor encima.
  await revisarCarrusel(pg, 1440);
  await pg.locator(CARR).hover();
  assert.match(await pg.locator(CARR).getAttribute("class"), /parado/, "el cursor encima pausa");
  const quieta = await slideActual(pg);
  await dormir(6800);
  assert.equal(await slideActual(pg), quieta, "con el cursor encima no avanza");
  await pg.mouse.move(1435, 880);
  await pg.locator(CARR).getByRole("tab", { name: /^Ir a 4/ }).click();
  await esperarSlide(pg, 3);
  await dormir(1000);
  if (OUT) await pg.screenshot({ path: `${OUT}/bolsa-escritorio-empresas.png` });
  await pg.locator(CARR).getByRole("tab", { name: /^Ir a 1/ }).click();
  await esperarSlide(pg, 0);
  // «Ver vacantes» baja a la lista.
  await pg.locator(`${CARR} .slide.on`).getByRole("link", { name: /Ver vacantes/ }).click();
  await pg.waitForFunction(() => { const b = document.getElementById("vacantes").getBoundingClientRect(); return b.top >= 0 && b.top < 200; }, null, { timeout: 5000 });
  await pg.evaluate(() => window.scrollTo(0, 0));

  await pg.getByRole("button", { name: "Ver vacantes de Farmacias Lupita" }).click();
  await esperarFiltro((s) => q(s).get("id_empresa") === "2" && q(s).get("page") === "1", "id_empresa=2");
  await pg.getByRole("button", { name: "Quitar filtro: Farmacias Lupita" }).waitFor();
  assert.equal(await pg.locator(".bt-logo[aria-pressed=true]").count(), 1);
  await pg.locator(".bt-activos").getByRole("button", { name: "Quitar filtro Farmacias Lupita" }).waitFor();
  assert.match(await pg.locator("#bt-res-titulo + p").innerText(), /6 vacantes con tu búsqueda/);
  await pg.getByRole("button", { name: "Quitar filtro: Farmacias Lupita" }).click();
  // Volver a una consulta ya pedida usa la caché de SWR (no siempre hay petición nueva): se revisa la pantalla.
  await pg.waitForFunction(() => !document.querySelector(".bt-logo[aria-pressed=true]") && document.querySelectorAll(".bt-vac").length === 10 && !location.search);

  // Buscar por puesto (con pausa al escribir) y por ubicación; tipo de contratación y giro en la columna.
  await pg.getByRole("searchbox", { name: "Puesto" }).fill("chofer");
  await esperarFiltro((s) => q(s).get("titulo") === "chofer", "titulo=chofer");
  await pg.waitForFunction(() => document.querySelectorAll(".bt-vac").length === 3);
  assert.match(pg.url(), /\?q=chofer$/);
  await pg.getByRole("combobox", { name: "Estado o ciudad" }).selectOption("estado:Nuevo León");
  await esperarFiltro((s) => q(s).get("titulo") === "chofer" && q(s).get("entidad") === "Nuevo León" && q(s).get("ciudad") === "", "entidad=Nuevo León");
  await pg.getByRole("combobox", { name: "Estado o ciudad" }).selectOption("ciudad:Zapopan");
  await esperarFiltro((s) => q(s).get("ciudad") === "Zapopan" && q(s).get("entidad") === "", "ciudad=Zapopan sin entidad");
  await pg.locator(".bt-lateral").getByText("Becario", { exact: true }).click();
  await esperarFiltro((s) => q(s).get("tipo_contratacion") === "Becario" && q(s).get("ciudad") === "Zapopan", "tipo_contratacion=Becario");
  // Sin resultados: estado vacío con «Limpiar filtros».
  await pg.getByRole("heading", { name: "No hay vacantes con esos filtros" }).waitFor();
  await foto(pg, "bolsa-vacio");
  await pg.locator(".bt-estado").getByRole("button", { name: "Limpiar filtros" }).click();
  await pg.waitForFunction(() => !location.search && document.querySelectorAll(".bt-vac").length === 10 && !document.querySelector(".bt-activos"));
  assert.equal(await pg.getByRole("searchbox", { name: "Puesto" }).inputValue(), "");
  await pg.locator(".bt-lateral").getByText("Logística", { exact: true }).click();
  await esperarFiltro((s) => q(s).get("giro") === "Logística", "giro=Logística");
  await pg.locator(".bt-activos").getByRole("button", { name: "Quitar filtro Logística" }).click();
  await pg.waitForFunction(() => !location.search && !document.querySelector(".bt-activos"));
  await pg.waitForFunction(() => document.querySelectorAll(".bt-vac").length === 10);

  // Paginación: 23 vacantes = 3 páginas.
  await pg.getByRole("button", { name: "Página 2" }).click();
  await esperarFiltro((s) => q(s).get("page") === "2" && q(s).get("limit") === "10", "page=2");
  await pg.locator('.bt-pag button[aria-current="page"]').filter({ hasText: "2" }).waitFor();
  await pg.getByRole("button", { name: "Página siguiente" }).click();
  await esperarFiltro((s) => q(s).get("page") === "3", "page=3");
  await pg.waitForFunction(() => document.querySelectorAll(".bt-vac").length === 3);
  assert.equal(await pg.getByRole("button", { name: "Página siguiente" }).isDisabled(), true);
  assert.match(pg.url(), /pagina=3/);

  // Error del API: mensaje amable y «Reintentar».
  S.falla = 1;
  await pg.goto(base + "/bolsa-de-trabajo", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { name: "No pudimos cargar las vacantes" }).waitFor({ timeout: 20000 });
  await revisar(pg, "bolsa error", 1440);
  await foto(pg, "bolsa-error");
  await pg.getByRole("button", { name: "Reintentar" }).click();
  await pg.getByRole("link", { name: "Chofer repartidor", exact: true }).waitFor({ timeout: 15000 });

  // La búsqueda vive en la dirección: volver de una vacante la conserva.
  const antes = filtros.length;
  await pg.goto(base + "/bolsa-de-trabajo?q=chofer&estado=Nuevo%20Le%C3%B3n", { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 100 && !filtros.slice(antes).some((s) => q(s).get("titulo") === "chofer" && q(s).get("entidad") === "Nuevo León"); i++) await dormir(100);
  assert.ok(filtros.slice(antes).some((s) => q(s).get("titulo") === "chofer" && q(s).get("entidad") === "Nuevo León"), "filtros desde la dirección");
  assert.equal(filtros.slice(antes).filter((s) => q(s).get("titulo") === "").length, 0, "no se pide primero la lista sin filtros");
  assert.equal(await pg.getByRole("searchbox", { name: "Puesto" }).inputValue(), "chofer");
  assert.equal(await pg.getByRole("combobox", { name: "Estado o ciudad" }).inputValue(), "estado:Nuevo León");

  // Sin empresas publicadas: no hay tira.
  S.empresas = [];
  const p2 = await ctx.newPage();
  await p2.goto(base + "/bolsa-de-trabajo", { waitUntil: "domcontentloaded" });
  await p2.getByRole("link", { name: "Chofer repartidor", exact: true }).waitFor({ timeout: 20000 });
  await dormir(400);
  assert.equal(await p2.getByRole("heading", { name: "Empresas que están contratando" }).count(), 0, "sin empresas, sin tira");
  await p2.close();
  S.empresas = EMPRESAS;

  // CTA para empresas.
  await pg.locator(".bt-cta").getByRole("heading", { name: "¿Tu empresa contrata? Publica tus vacantes con ADAMIA." }).waitFor();
  assert.equal(await pg.locator(".bt-cta").getByRole("link", { name: /Solicitar demo/ }).getAttribute("href"), "/contacto");
  assert.equal(await pg.locator(".bt-cta").getByRole("link", { name: "Contratar" }).getAttribute("href"), "/contratar-plan");

  // ═════════ Vacante (escritorio) ═════════
  await pg.goto(base + "/vacante/chofer-repartidor-monterrey", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { level: 1, name: "Chofer repartidor" }).waitFor({ timeout: 30000 });
  assert.equal(await pg.title(), "Chofer repartidor en Empacadora del Norte | Bolsa de trabajo | ADAMIA");
  const ld = JSON.parse(await pg.locator('script[type="application/ld+json"]').textContent());
  assert.equal(ld["@type"], "JobPosting");
  assert.equal(ld.title, "Chofer repartidor");
  assert.equal(ld.hiringOrganization.name, "Empacadora del Norte");
  assert.equal(ld.jobLocation.address.addressRegion, "Nuevo León");
  assert.equal(ld.baseSalary.value.unitText, "MONTH");
  assert.equal(ld.url, "https://dev.adamia.com.mx/vacante/chofer-repartidor-monterrey");
  assert.equal(await pg.evaluate(() => window.__xss), undefined, "el HTML de la vacante no ejecuta código");
  const vtexto = await pg.locator(".vc").innerText();
  for (const t of ["Descripción del puesto", "Actividades y responsabilidades", "Lo que buscamos", "$12,000 a $14,000 mensuales", "Lunes a viernes", "Av. Constitución 100", "Compartir vacante"]) assert.ok(vtexto.includes(t), `vacante sin «${t}»`);
  await revisar(pg, "vacante escritorio", 1440);
  await foto(pg, "vacante-escritorio");

  // Vacante inexistente y error del API.
  await pg.goto(base + "/vacante/ya-no-existe", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { name: "Esta vacante ya no está disponible" }).waitFor({ timeout: 20000 });
  assert.equal(await pg.getByRole("link", { name: "Ver vacantes" }).getAttribute("href"), "/bolsa-de-trabajo");
  assert.equal(await pg.title(), "Vacante no disponible | ADAMIA");
  S.slugFalla = 1;
  await pg.goto(base + "/vacante/vacante-2", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { name: "No pudimos cargar la vacante" }).waitFor({ timeout: 20000 });
  await revisar(pg, "vacante error", 1440);
  await pg.getByRole("button", { name: "Reintentar" }).click();
  await pg.getByRole("heading", { level: 1, name: /Cajera de piso/ }).waitFor({ timeout: 15000 });

  // ═════════ Menú del sitio: «Bolsa de trabajo» desde el inicio (escritorio) ═════════
  await pg.goto(base + "/", { waitUntil: "domcontentloaded" });
  const navEsc = pg.getByRole("navigation", { name: "Secciones" });
  const enlaceEsc = navEsc.getByRole("link", { name: "Bolsa de trabajo" });
  await enlaceEsc.waitFor({ timeout: 30000 });
  assert.deepEqual(await navEsc.getByRole("link").allInnerTexts(), ["Funciones", "Cotizar", "Ley 2027", "Blog", "Bolsa de trabajo", "Nosotros"]);
  await enlaceEsc.click();
  await pg.waitForURL(/\/bolsa-de-trabajo$/, { timeout: 20000 });
  await pg.getByRole("heading", { level: 1, name: "Encuentra tu próximo trabajo" }).waitFor({ timeout: 20000 });
  assert.equal(await pg.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: "Bolsa de trabajo" }).getAttribute("aria-current"), "page");
  // El menú con un enlace más cabe en anchos intermedios (antes de pasar al menú ☰ en 980 px).
  for (const w of [1440, 1280, 1100, 1024, 990]) {
    await pg.setViewportSize({ width: w, height: 900 });
    await dormir(150);
    const m = await pg.evaluate(() => {
      const nav = document.querySelector(".top .nav").getBoundingClientRect();
      const acc = document.querySelector(".top .top-actions").getBoundingClientRect();
      const altos = [...document.querySelectorAll(".top .nav a")].map((a) => a.getBoundingClientRect().height);
      return { navDer: nav.right, accIzq: acc.left, ancho: document.documentElement.scrollWidth, alto: Math.max(...altos) };
    });
    if (m.navDer > m.accIzq + 0.5) problemas.push(`encabezado ${w}: el menú se encima con los botones (${Math.round(m.navDer)} > ${Math.round(m.accIzq)})`);
    if (m.ancho > w) problemas.push(`encabezado ${w}: desborde horizontal (${m.ancho})`);
    if (m.alto > 30) problemas.push(`encabezado ${w}: un enlace del menú se parte en dos líneas`);
  }
  await pg.setViewportSize({ width: 1440, height: 900 });
  await ctx.close();

  // ═════════ Reducir movimiento: no avanza solo ═════════
  const cr = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", reducedMotion: "reduce" });
  await instalarMocks(cr);
  const pr = await cr.newPage();
  pr.on("pageerror", (e) => errores.push(e.message));
  await pr.goto(base + "/bolsa-de-trabajo", { waitUntil: "domcontentloaded" });
  await pr.locator(CARR).waitFor({ timeout: 30000 });
  await pr.mouse.move(1435, 880);
  await pr.waitForFunction((sel) => document.querySelector(sel).classList.contains("parado"), CARR);
  await dormir(6800);
  assert.equal(await slideActual(pr), 0, "con reducir movimiento no avanza solo");
  assert.equal(await pr.locator(`${CARR} .slide`).first().evaluate((d) => getComputedStyle(d).transitionDuration.split(",").every((t) => parseFloat(t) < 0.01)), true, "sin transición al cambiar");
  await pr.locator(CARR).getByRole("button", { name: "Siguiente" }).click();
  await esperarSlide(pr, 1);
  await cr.close();

  // ═════════ Celular 390 ═════════
  const cm = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await instalarMocks(cm);
  const pm = await cm.newPage();
  pm.on("pageerror", (e) => errores.push(e.message));
  pm.on("dialog", (d) => { errores.push(`diálogo inesperado: ${d.message()}`); d.dismiss(); });
  await pm.goto(base + "/bolsa-de-trabajo", { waitUntil: "domcontentloaded" });
  await cerrarCookies(pm);
  await pm.getByRole("link", { name: "Chofer repartidor", exact: true }).waitFor({ timeout: 30000 });
  await pm.getByRole("heading", { name: "Empresas que están contratando" }).waitFor();
  assert.equal(await pm.locator(".bt-lateral").isVisible(), false, "en celular la columna de filtros se oculta");
  await pm.locator(".bt-pag .movil").getByText("Página 1 de 3").waitFor();
  await revisar(pm, "bolsa celular", 390);
  await foto(pm, "bolsa-celular");
  if (OUT) await pm.screenshot({ path: `${OUT}/bolsa-celular-portada.png` });
  // Carrusel en celular: deslizar con el dedo cambia de diapositiva y tocar lo pausa; el buscador no se mueve.
  const cajaM = await cajaBuscador(pm);
  assert.equal(await slideActual(pm), 0);
  await deslizar(pm, -120);
  await esperarSlide(pm, 1);
  assert.equal(await pm.locator(CARR).getByRole("button", { name: "Reanudar" }).count(), 1, "tocar pausa el avance");
  await deslizar(pm, -120);
  await esperarSlide(pm, 2);
  await deslizar(pm, 120);
  await esperarSlide(pm, 1);
  await deslizar(pm, -15); // un toque sin arrastrar no cambia
  await dormir(300);
  assert.equal(await slideActual(pm), 1);
  await dormir(1000);
  assert.equal(await cajaBuscador(pm), cajaM, "el buscador no se mueve con las diapositivas (celular)");
  const anchoM = await pm.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(anchoM <= 390, `sin desborde con el carrusel recorrido (${anchoM})`);
  if (OUT) await pm.screenshot({ path: `${OUT}/bolsa-celular-diapositiva-2.png` });
  await pm.locator(CARR).getByRole("tab", { name: /^Ir a 4/ }).tap();
  await esperarSlide(pm, 3);
  await dormir(1000);
  await revisar(pm, "bolsa celular empresas", 390);
  if (OUT) await pm.screenshot({ path: `${OUT}/bolsa-celular-empresas.png` });
  // El buscador sigue funcionando en celular.
  await pm.getByRole("searchbox", { name: "Puesto" }).fill("cajera");
  await pm.getByRole("button", { name: "Buscar", exact: true }).tap();
  await esperarFiltro((s) => q(s).get("titulo") === "cajera", "titulo=cajera (celular)");
  await pm.waitForFunction(() => /q=cajera/.test(location.search));
  await pm.getByRole("searchbox", { name: "Puesto" }).fill("");
  await pm.waitForFunction(() => !location.search, null, { timeout: 5000 });
  await pm.evaluate(() => window.scrollTo(0, 0));
  await pm.getByRole("button", { name: /^Filtros/ }).click();
  const hojaF = pm.getByRole("dialog", { name: "Filtros" });
  await hojaF.waitFor();
  await hojaF.getByText("Practicante", { exact: true }).click();
  await esperarFiltro((s) => q(s).get("tipo_contratacion") === "Practicante", "tipo_contratacion=Practicante (hoja)");
  await hojaF.getByRole("button", { name: /^Ver \d+ vacantes?$/ }).waitFor();
  await revisar(pm, "hoja de filtros", 390);
  await dormir(400); // termina la transición de la píldora elegida
  if (OUT) await pm.screenshot({ path: `${OUT}/bolsa-celular-filtros.png` });
  await hojaF.getByRole("button", { name: /^Ver \d+ vacantes?$/ }).click();
  await hojaF.waitFor({ state: "detached" });
  await pm.getByRole("button", { name: /Filtros\s*1/ }).waitFor();
  await pm.locator(".bt-activos").getByRole("button", { name: "Quitar filtro Practicante" }).click();
  await pm.waitForFunction(() => !location.search && !document.querySelector(".bt-activos"));

  // Abrir la vacante desde la lista y postularse.
  await pm.getByRole("link", { name: "Chofer repartidor", exact: true }).click();
  await pm.waitForURL(/\/vacante\/chofer-repartidor-monterrey$/);
  await pm.getByRole("heading", { level: 1, name: "Chofer repartidor" }).waitFor({ timeout: 20000 });
  await cerrarCookies(pm);
  const boton = pm.getByRole("button", { name: "Postularme ahora" });
  await boton.waitFor();
  const caja = await boton.boundingBox();
  assert.ok(caja.y + caja.height <= 844 && caja.y > 844 - 110, `«Postularme ahora» fijo abajo en celular (y=${Math.round(caja.y)})`);
  await revisar(pm, "vacante celular", 390);
  await foto(pm, "vacante-celular");
  await boton.click();
  const hoja = pm.getByRole("dialog", { name: "Solicitud de empleo" });
  await hoja.waitFor();
  const llenar = (n, v) => hoja.locator(`[name="${n}"]`).fill(v);
  await llenar("nombre_completo", "Ana María García López");
  await llenar("correo", "ana.g@x.mx");
  await llenar("telefono", "3312345678");
  await llenar("sexo", "Mujer");
  await hoja.getByRole("combobox").filter({ hasText: "Selecciona uno" }).click();
  await pm.getByRole("option", { name: "Soltero(a)" }).click();
  await llenar("curp", "GAPA900101MJCRRN09");
  await hoja.getByRole("combobox").filter({ hasText: "Selecciona un nivel" }).click();
  await pm.getByRole("option", { name: "Preparatoria" }).click();
  await llenar("institucion", "CBTIS 1");
  await llenar("carrera", "Técnico");
  for (const [n, v] of [["ultimo_puesto", "Repartidora"], ["empresa_anterior", "Tienda"], ["duracion_puesto", "2 años"], ["ultimo_salario", "10000"], ["motivo_salida", "Crecer"]]) await llenar(n, v);
  await hoja.getByRole("checkbox", { name: /Acepto los Términos y condiciones/ }).click();
  // 1) Sin CV: aviso. 2) Con CV pero sin la pregunta obligatoria: aviso junto a la pregunta.
  await hoja.getByRole("button", { name: "Enviar solicitud" }).click();
  await pm.getByText("CV es obligatorio").waitFor();
  await hoja.locator('input[type="file"]').setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 prueba") });
  await hoja.getByText("cv.pdf").waitFor();
  await hoja.getByRole("button", { name: "Enviar solicitud" }).click();
  await hoja.getByText("Responde esta pregunta.").waitFor();
  assert.equal(envios.otpSend.length, 0, "sin responder no se manda el SMS");
  await hoja.getByLabel("¿Tienes licencia de manejo vigente? *").selectOption("Sí, tipo B");
  await hoja.getByRole("checkbox", { name: "Mañana" }).check();
  await hoja.getByLabel("Cuéntanos de tu último reparto").fill("Repartí en la zona centro.");
  await revisar(pm, "solicitud celular", 390);
  if (OUT) await pm.screenshot({ path: `${OUT}/vacante-celular-solicitud.png` });
  await hoja.getByRole("button", { name: "Enviar solicitud" }).click();
  await hoja.getByText("Ingresa el código para continuar").waitFor({ timeout: 15000 });
  assert.deepEqual(envios.otpSend, [{ telefono: "3312345678" }]);
  await revisar(pm, "verificación OTP", 390);
  await dormir(700); // la verificación se desplaza sola a la vista
  if (OUT) await pm.screenshot({ path: `${OUT}/vacante-celular-otp.png` });
  const otp = hoja.locator('input[autocomplete="one-time-code"], input[data-input-otp]').first();
  await otp.fill("111111");
  await hoja.getByRole("button", { name: "Verificar código" }).dispatchEvent("click");
  await pm.getByText("El código no es correcto.").waitFor({ timeout: 10000 });
  assert.equal(envios.create.length, 0, "código incorrecto: no se envía la postulación");
  await otp.fill("123456");
  await hoja.getByRole("button", { name: "Verificar código" }).dispatchEvent("click");
  await pm.getByText("Postulación enviada exitosamente").waitFor({ timeout: 15000 });
  assert.deepEqual(envios.otpVerify.map((x) => x.code), ["111111", "123456"]);
  assert.equal(envios.create.length, 1);
  const { tipo, cuerpo } = envios.create[0];
  assert.match(tipo, /multipart\/form-data/);
  const campo = (n) => (cuerpo.match(new RegExp(`name="${n}"\\r\\n\\r\\n([^\\r]*)`)) || [])[1];
  assert.equal(campo("id_vacante"), "100");
  assert.equal(campo("telefono"), "3312345678");
  assert.equal(campo("curp"), "GAPA900101MJCRRN09");
  assert.equal(campo("telefono_verificacion_token"), "tok-verificado-1");
  assert.deepEqual(JSON.parse(Buffer.from(campo("respuestas"), "latin1").toString("utf8")), { p1: "Sí, tipo B", p2: ["Mañana"], p3: "Repartí en la zona centro." });
  assert.match(cuerpo, /name="cv"; filename="cv.pdf"/);
  await pm.getByText("Enviamos tu postulación").waitFor({ timeout: 10000 });
  assert.equal(await pm.getByRole("button", { name: "Postularme ahora" }).count(), 0, "después de enviar ya no se ofrece postularse otra vez");
  await revisar(pm, "vacante enviada", 390);
  await foto(pm, "vacante-celular-enviada");

  // Menú ☰ del celular: «Bolsa de trabajo» desde el inicio.
  await pm.goto(base + "/", { waitUntil: "domcontentloaded" });
  await pm.getByRole("button", { name: "Abrir menú" }).waitFor({ timeout: 30000 });
  assert.equal(await pm.getByRole("navigation", { name: "Secciones" }).isVisible(), false, "en celular el menú va dentro de ☰");
  await pm.getByRole("button", { name: "Abrir menú" }).tap();
  const menuM = pm.locator("#menu-movil");
  await menuM.getByRole("link", { name: "Bolsa de trabajo" }).waitFor();
  if (OUT) await pm.screenshot({ path: `${OUT}/menu-celular.png` });
  await menuM.getByRole("link", { name: "Bolsa de trabajo" }).tap();
  await pm.waitForURL(/\/bolsa-de-trabajo$/, { timeout: 20000 });
  await pm.getByRole("heading", { level: 1, name: "Encuentra tu próximo trabajo" }).waitFor({ timeout: 20000 });
  assert.equal(await pm.locator("#menu-movil").count(), 0, "el menú se cierra al navegar");
  await cm.close();

  assert.deepEqual(errores, [], `errores en la página: ${errores.join(" | ")}`);
  assert.deepEqual(problemas, [], `problemas:\n${problemas.join("\n")}`);
  console.log(`OK verify-bolsa: ${filtros.length} consultas a /vacantes/filter, postulación con OTP y preguntas, carrusel (avance, flechas, puntos, teclado, pausa, dedo y reducir movimiento), menú «Bolsa de trabajo» en escritorio y celular, escritorio 1440 y celular 390 sin desborde.`);
} catch (e) {
  console.error(e);
  if (problemas.length) console.error(problemas.join("\n"));
  if (errores.length) console.error(errores.join("\n"));
  process.exitCode = 1;
} finally {
  await browser?.close();
  next.kill("SIGTERM");
  mock.close();
}
