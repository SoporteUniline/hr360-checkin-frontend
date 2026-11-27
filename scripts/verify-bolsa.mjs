// Verificación en navegador de la bolsa de trabajo v2 (27/11/2026): /bolsa-de-trabajo, /vacante/[slug] y la solicitud.
// Backend simulado (nada sale a internet): el navegador pide a https://api.prueba.invalid (interceptado) y el servidor
// de Next pide la vacante a un servidor local (RUTA_BACKEND_SERVIDOR) para el título y el JSON-LD.
// Cubre a 1440, 390 y 360 px: lista + vacante elegida (?v=slug sin recargar, teclado ↑ ↓ y Enter), chips con los
// parámetros exactos del API (ordenar, publicada, sueldo, modalidad, jornada, empresa, sin experiencia, WhatsApp, cerca
// de mí con la ubicación redondeada y nunca en la dirección), hoja «Filtros» del celular (foco atrapado, Esc, «Ver N
// vacantes»), tarjetas (Nueva ≤ 48 h, sueldo o «Sueldo a convenir», distancia, «Postúlate por WhatsApp» solo con
// asistente), acción principal (verde a WhatsApp fija abajo en celular; «Postularme» con QR en computadora), solicitud
// corta (Sí/No, SMS incorrecto y correcto, token, multipart sin CV), JSON-LD JobPosting, vacía/error/no existe, sesión de
// RH, letra base ≥ 17 px en celular (≥ 16 en computadora), botones ≥ 48 px (principal ≥ 56), títulos de peso 700,
// contraste del texto, sin fondos degradados, reducir movimiento y sin desborde horizontal.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx \
//      NEXT_PUBLIC_RECRUITMENT_ENABLED=true npx next build
//      CAPTURAS=/ruta/capturas node scripts/verify-bolsa.mjs
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

// ——— Datos de demostración (ficticios) ———
const ahora = Date.now();
const haceHoras = (h) => new Date(ahora - h * 3600000).toISOString();
const enUnMes = new Date(ahora + 30 * 86400000).toISOString().slice(0, 10);
const enlaceWa = (token, titulo) => `https://wa.me/5215550000000?text=${encodeURIComponent(`Hola, me interesa la vacante de ${titulo}. ID: ${token}`)}`;
const EMPRESAS = [
  { id_empresa: 1, nombre_empresa: "Empacadora del Norte", giro: "Logística", url_imagen: "" },
  { id_empresa: 2, nombre_empresa: "Farmacias Lupita", giro: "Comercio", url_imagen: "" },
  { id_empresa: 3, nombre_empresa: "Constructora Avance", giro: "Construcción", url_imagen: "" },
  { id_empresa: 4, nombre_empresa: "Hotel Costa Alegre", giro: "Turismo", url_imagen: "" },
];
const PUESTOS = ["Chofer repartidor", "Cajera de piso", "Auxiliar de almacén", "Recepcionista bilingüe", "Becario de sistemas", "Operador de montacargas", "Ayudante general"];
const LUGARES = [["Monterrey", "Nuevo León"], ["Guadalajara", "Jalisco"], ["Zapopan", "Jalisco"], ["Querétaro", "Querétaro"]];
const MODAL = ["Presencial", "Presencial", "Híbrida", "Remota"];
const JORN = ["Tiempo completo", "Medio tiempo", "Tiempo completo", "Prácticas profesionales"];
const VACANTES = Array.from({ length: 23 }, (_, i) => {
  const e = EMPRESAS[i % 4];
  const [ciudad, entidad] = LUGARES[i % LUGARES.length];
  const titulo = i === 0 ? "Chofer repartidor" : i === 1 ? "Cajera de piso" : `${PUESTOS[i % PUESTOS.length]} ${i + 1}`;
  const slug = i === 0 ? "chofer-repartidor-monterrey" : i === 1 ? "cajera-de-piso" : `vacante-${i + 1}`;
  const conSueldo = i % 3 !== 2;
  return {
    id_vacante: 100 + i, id_empresa: e.id_empresa, nombre_empresa: e.nombre_empresa, giro: e.giro, url_imagen: e.url_imagen, estado: "Abierta",
    titulo, slug,
    descripcion: i === 0 ? '<p>Reparte <strong>pedidos</strong> en la zona metropolitana.</p><img src=x onerror="window.__xss=1">' : `<p>Únete al equipo de ${e.nombre_empresa}.</p>`,
    responsabilidades: i === 1 ? "<ul><li>Cobrar en caja.</li><li>Atender a los clientes.</li><li>Acomodar los productos.</li></ul>" : "<ul><li>Cargar y descargar la unidad</li><li>Entregar a tiempo</li></ul>",
    escolaridad: "<p>Secundaria terminada</p>", experiencia: i % 2 ? "<p>No necesaria</p>" : "<p>1 año en un puesto parecido</p>", habilidades: "", idiomas: "",
    horario: "Lunes a sábado, 8 a 16 h", direccion: i === 1 ? "Av. Vallarta 1450" : "", ciudad, entidad, pais: "México",
    modalidad: MODAL[i % 4], salario: conSueldo ? null : "No establecido", tipo_contrato: "", tipo_contratacion: JORN[i % 4], tipo_jornada: JORN[i % 4],
    sueldo_desde: conSueldo ? String(8000 + i * 500) : null, sueldo_hasta: conSueldo && i % 2 ? String(10000 + i * 500) : null,
    cierra_el: i === 1 ? enUnMes : null,
    fecha_publicacion: haceHoras(i === 0 ? 2 : i === 1 ? 30 : i * 20), puestos_disponibles: 2,
    distancia: [0.4, 4.2, 12, null][i % 4],
    // Cajera y la 5: asistente encendido; la 3: WhatsApp sin asistente; las demás sin WhatsApp.
    whatsapp: i === 1 || i === 5 ? { enlace: enlaceWa(`${"ab12".repeat(6)}`, titulo), asistente: true } : i === 3 ? { enlace: enlaceWa("cd34".repeat(6), titulo), asistente: false } : null,
  };
});
const PREGUNTAS = [
  { id: "p1", label: "¿Tienes disponibilidad los sábados?", type: "select", required: true, options: ["Sí", "No"] },
  { id: "p2", label: "¿Terminaste la secundaria?", type: "select", required: true, options: ["Sí", "No"] },
  { id: "p3", label: "¿Qué turnos puedes cubrir?", type: "multiselect", required: false, options: ["Mañana", "Tarde"] },
];
const detalle = (v) => {
  const { distancia: _d, ...resto } = v;
  return { ...resto, preguntas_formulario: ["cajera-de-piso", "chofer-repartidor-monterrey"].includes(v.slug) ? PREGUNTAS : [], version_formulario: 1, recibe_postulaciones: true };
};

const S = { falla: 0, slugFalla: 0, sesion: null };
const filtros = []; // consulta de cada GET /vacantes/filter
const publicos = []; // demás llamadas públicas
const envios = { otpSend: [], otpVerify: [], create: [] };

function filtrar(q) {
  const like = (campo, v) => !v || String(campo ?? "").toLowerCase().includes(v.toLowerCase());
  const pref = { presencial: "presencial", remoto: "remot", hibrido: "híbrid" };
  const jor = { "tiempo-completo": ["Tiempo completo"], "medio-tiempo": ["Medio tiempo"], "por-proyecto": ["Por proyecto"], practicas: ["Prácticas profesionales", "Becario", "Practicante"] };
  const dias = { hoy: 1, "3d": 3, "7d": 7, "30d": 30 }[q.get("publicada")];
  const cerca = q.get("orden") === "cerca" && q.get("lat");
  let lista = VACANTES.filter((v) => like(v.titulo, q.get("titulo")) && like(v.entidad, q.get("entidad")) && like(v.ciudad, q.get("ciudad"))
    && (!q.get("id_empresa") || String(v.id_empresa) === q.get("id_empresa"))
    && (!q.get("sueldo_min") || Number(v.sueldo_hasta ?? v.sueldo_desde ?? 0) >= Number(q.get("sueldo_min")))
    && (!q.get("modalidad") || v.modalidad.toLowerCase().startsWith(pref[q.get("modalidad")]))
    && (!q.get("jornada") || jor[q.get("jornada")].includes(v.tipo_jornada))
    && (!dias || ahora - Date.parse(v.fecha_publicacion) <= dias * 86400000)
    && (q.get("sin_experiencia") !== "1" || /no necesaria/i.test(v.experiencia))
    && (q.get("whatsapp") !== "1" || v.whatsapp?.asistente === true))
    .map((v) => ({ ...detalle(v), preguntas_formulario: undefined, recibe_postulaciones: undefined, distancia_km: cerca ? v.distancia : null }));
  if (q.get("orden") === "sueldo") lista = lista.sort((a, b) => Number(b.sueldo_hasta ?? b.sueldo_desde ?? -1) - Number(a.sueldo_hasta ?? a.sueldo_desde ?? -1));
  if (cerca) lista = lista.sort((a, b) => (a.distancia_km ?? 1e9) - (b.distancia_km ?? 1e9));
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
    if (url.hostname === "wa.me") return route.fulfill({ status: 200, contentType: "text/html", body: "<title>WhatsApp</title>" });
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
    if (p === "/empresas/activas") return json({ total: EMPRESAS.length, page: 1, limit: 50, data: EMPRESAS });
    if (p === "/vacantes/entidades") return json({ entidades: ["Jalisco", "Nuevo León", "Querétaro"], ciudades: ["Guadalajara", "Monterrey", "Querétaro", "Zapopan"], paises: ["México"] });
    if (p.startsWith("/vacantes/slug/")) {
      if (S.slugFalla > 0) { S.slugFalla -= 1; return json({ error: "Error interno" }, 500); }
      const v = VACANTES.find((x) => x.slug === decodeURIComponent(p.slice("/vacantes/slug/".length)));
      return v ? json(detalle(v)) : json({ error: "Vacante no encontrada" }, 404);
    }
    if (p.startsWith("/vacantes/check-positions/")) return json({ available: true });
    if (p === "/users/verify/token") return S.sesion ? json({ user: S.sesion, modulos: null }) : json({ error: "Sin sesión" }, 401);
    if (p.startsWith("/postulaciones/by-correo/")) return json({ error: "No tienes permiso sobre este registro." }, 403);
    if (p === "/otp/send") { envios.otpSend.push(req.postDataJSON()); return json({ message: "Código de verificación enviado" }); }
    if (p === "/otp/verify") {
      const b = req.postDataJSON();
      envios.otpVerify.push(b);
      return b.code === "123456" ? json({ message: "Teléfono verificado", verification_token: "tok-verificado-1" }) : json({ error: "El código no es correcto." }, 400);
    }
    if (p === "/postulaciones/create") {
      envios.create.push({ tipo: req.headers()["content-type"] || "", cuerpo: (req.postDataBuffer() || Buffer.alloc(0)).toString("latin1") });
      return json({ message: "Postulación enviada exitosamente" }, 201);
    }
    return json({});
  });
}

const errores = [];
const problemas = [];
const hechos = [];
const ok = (m) => { hechos.push(m); console.log(`  ✓ ${m}`); };
const ultimo = () => filtros[filtros.length - 1] || "";
async function esperarFiltro(predicado, msg, desde = 0) {
  for (let i = 0; i < 100; i++) { if (filtros.slice(desde).some(predicado)) return; await dormir(100); }
  throw new Error(`No llegó la consulta esperada: ${msg}. Última: ${ultimo()}`);
}
const q = (s) => new URLSearchParams(s);
const BASE_Q = "giro=&ciudad=&entidad=&pais=&titulo=&id_empresa=&tipo_contratacion=&page=1&limit=10";

// Legibilidad y tamaño: letra base, botones ≥ 48 px (principal ≥ 56), títulos 700, contraste del texto y sin desborde.
async function revisar(pg, pantalla, ancho) {
  const r = await pg.evaluate(() => {
    const visible = (el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[aria-hidden=true]"); };
    const raices = [...document.querySelectorAll(".bt2")];
    const todos = [...new Set(raices.flatMap((r) => [...r.querySelectorAll("button, a.bt2-btn, a.bt2-regresar, select, input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]), textarea, .bt2-opcion span, .bt2-boton-op span, .bt2-casilla, .bt2-casilla-op, .bt2-acepto, .bt2-empresa a")]))].filter(visible);
    const chicos = todos.map((el) => ({ el, b: el.getBoundingClientRect() })).filter(({ b }) => b.height < 47.5)
      .map(({ el, b }) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} «${(el.getAttribute("aria-label") || el.textContent || el.name || "").trim().slice(0, 40)}» ${Math.round(b.width)}×${Math.round(b.height)}`);
    const principales = [...document.querySelectorAll("[data-boton-principal]")].filter(visible).map((el) => ({ t: el.textContent.trim(), h: el.getBoundingClientRect().height }));
    const titulos = [...document.querySelectorAll(".bt2 h1, .bt2 h2, .bt2 h3")].filter(visible).map((h) => ({ t: h.textContent.trim().slice(0, 30), w: Number(getComputedStyle(h).fontWeight) })).filter((h) => h.w !== 700);
    const rgb = (c) => (c.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    const lum = ([R, G, B]) => [R, G, B].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const fondoDe = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const m = rgb(b); const a = (b.match(/rgba\([^)]*,\s*([\d.]+)\)/) || [])[1]; if (b !== "rgba(0, 0, 0, 0)" && (a === undefined || Number(a) > 0.9) && !getComputedStyle(e).backgroundImage.includes("gradient")) return m; if (getComputedStyle(e).backgroundImage.includes("gradient")) return null; } return [255, 255, 255]; };
    const bajos = [];
    for (const el of raices.flatMap((r) => [...r.querySelectorAll("p, li, dt, dd, span, b, label, a, h1, h2, h3")])) {
      if (!visible(el) || !el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const f = fondoDe(el);
      if (!f) continue;
      const [a, b] = [lum(rgb(getComputedStyle(el).color)), lum(f)].sort((x, y) => y - x);
      const c = (a + 0.05) / (b + 0.05);
      if (c < 4.5) bajos.push(`«${el.textContent.trim().slice(0, 30)}» ${c.toFixed(2)}:1`);
    }
    const letra = raices.length ? parseFloat(getComputedStyle(raices[0]).fontSize) : 0;
    const chicaLetra = raices.flatMap((r) => [...r.querySelectorAll("p, li, dd, dt, label, a, button, span")]).filter(visible)
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !el.closest(".sr-only")).map((el) => parseFloat(getComputedStyle(el).fontSize)).filter((t) => t < 14);
    // El dueño (27/11/2026): «jamás fondos degradados». Ningún elemento de la bolsa lleva gradiente.
    const degradados = [...document.querySelectorAll(".bt2, .bt2 *")].filter((el) => /gradient/.test(getComputedStyle(el).backgroundImage)).map((el) => String(el.className).slice(0, 40));
    return { degradados, ancho: document.documentElement.scrollWidth, chicos, principales, titulos, bajos, letra, chicaLetra: chicaLetra.length, texto: document.body.innerText };
  });
  for (const d of r.degradados) problemas.push(`${pantalla}: fondo degradado en «${d}»`);
  if (r.ancho > ancho) problemas.push(`${pantalla}: desborde horizontal (${r.ancho} px > ${ancho})`);
  for (const c of r.chicos) problemas.push(`${pantalla}: control de menos de 48 px ${c}`);
  for (const p of r.principales) if (p.h < 55.5) problemas.push(`${pantalla}: acción principal «${p.t}» de ${Math.round(p.h)} px (< 56)`);
  for (const t of r.titulos) problemas.push(`${pantalla}: título «${t.t}» con peso ${t.w} (debe ser 700)`);
  for (const b of r.bajos.slice(0, 5)) problemas.push(`${pantalla}: contraste bajo ${b}`);
  if (r.chicaLetra) problemas.push(`${pantalla}: ${r.chicaLetra} textos de menos de 14 px`);
  const minimo = ancho < 1024 ? 17 : 16;
  if (r.letra < minimo) problemas.push(`${pantalla}: letra base ${r.letra}px (< ${minimo})`);
  if (/hr\s?360/i.test(r.texto)) problemas.push(`${pantalla}: aparece «HR360»`);
  if (/Request failed|status code|undefined|NaN/i.test(r.texto)) problemas.push(`${pantalla}: texto crudo en pantalla`);
  return r;
}
const foto = (pg, nombre, completa = true) => (OUT ? pg.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: completa }) : null);
const enfocado = (pg) => pg.evaluate(() => ({ texto: document.activeElement?.textContent?.trim().slice(0, 60), clase: document.activeElement?.className, enDialogo: Boolean(document.activeElement?.closest("[role=dialog]")) }));

// Solicitud corta: datos → SMS incorrecto → correcto → «¡Listo!». Devuelve el cuerpo multipart.
async function postularConFormulario(pg, dialogo, { telefono, nombre, slug }) {
  const antesCreate = envios.create.length;
  const antesSms = envios.otpSend.length;
  await dialogo.getByRole("button", { name: "Enviar postulación" }).click();
  await dialogo.getByText("Revisa lo que está marcado en rojo.").waitFor();
  assert.equal(envios.otpSend.length, antesSms, "sin datos no se manda el SMS");
  await pg.waitForFunction(() => document.activeElement?.id === "sol-nombre", null, { timeout: 3000 }).catch(() => { throw new Error("el foco no fue al primer campo marcado"); });
  await dialogo.getByLabel("Nombre completo").fill(nombre);
  await dialogo.getByLabel("Celular").fill(telefono);
  await dialogo.getByRole("group", { name: "¿Tienes disponibilidad los sábados?" }).getByRole("radio", { name: "Sí" }).click();
  await dialogo.getByRole("group", { name: "¿Terminaste la secundaria?" }).getByRole("radio", { name: "No" }).click();
  await dialogo.getByRole("checkbox", { name: "Mañana" }).check();
  await dialogo.getByRole("checkbox", { name: /aviso de privacidad/ }).check();
  await dialogo.getByRole("button", { name: "Enviar postulación" }).click();
  await dialogo.getByText("Te mandamos un código de 6 números").waitFor({ timeout: 15000 });
  assert.deepEqual(envios.otpSend.at(-1), { telefono: telefono.replace(/\D/g, "").slice(-10) });
  await pg.waitForFunction(() => document.activeElement?.id === "sol-codigo", null, { timeout: 3000 }).catch(() => { throw new Error("el foco no fue al código"); });
  return async () => {
    await dialogo.getByLabel("Código del SMS").fill("111111");
    await dialogo.getByRole("button", { name: "Confirmar y enviar" }).click();
    await dialogo.getByText("El código no es correcto.").waitFor({ timeout: 10000 });
    assert.equal(envios.create.length, antesCreate, "código incorrecto: no se envía");
    await dialogo.getByLabel("Código del SMS").fill("123456");
    await dialogo.getByRole("button", { name: "Confirmar y enviar" }).click();
    await dialogo.getByRole("heading", { name: "¡Listo! Enviamos tu postulación" }).waitFor({ timeout: 15000 });
    assert.equal(envios.create.length, antesCreate + 1);
    const { tipo, cuerpo } = envios.create.at(-1);
    assert.match(tipo, /multipart\/form-data/);
    const campo = (n) => (cuerpo.match(new RegExp(`name="${n}"\\r\\n\\r\\n([^\\r]*)`)) || [])[1];
    const v = VACANTES.find((x) => x.slug === slug);
    assert.equal(campo("id_vacante"), String(v.id_vacante));
    assert.equal(Buffer.from(campo("nombre_completo"), "latin1").toString("utf8"), nombre);
    assert.equal(campo("telefono"), telefono.replace(/\D/g, "").slice(-10));
    assert.equal(campo("correo"), "", "correo opcional vacío");
    assert.equal(campo("telefono_verificacion_token"), "tok-verificado-1");
    assert.deepEqual(JSON.parse(Buffer.from(campo("respuestas"), "latin1").toString("utf8")), { p1: "Sí", p2: "No", p3: ["Mañana"] });
    assert.doesNotMatch(cuerpo, /name="cv"/, "sin CV (opcional)");
    return cuerpo;
  };
}

let browser;
try {
  for (let i = 0; i < 120; i++) { try { const r = await fetch(base + "/bolsa-de-trabajo"); if (r.ok) break; } catch { /* aún arranca */ } await dormir(500); }
  browser = await chromium.launch();

  // ═════════ Escritorio 1440 ═════════
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City",
    permissions: ["geolocation"], geolocation: { latitude: 20.676543, longitude: -103.347891 } });
  await instalarMocks(ctx);
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));
  pg.on("dialog", (d) => { errores.push(`diálogo inesperado: ${d.message()}`); d.dismiss(); });
  await pg.goto(base + "/bolsa-de-trabajo", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { level: 1, name: "Bolsa de trabajo" }).waitFor({ timeout: 30000 });
  await pg.getByRole("link", { name: "Chofer repartidor", exact: true }).waitFor({ timeout: 20000 });
  assert.equal(await pg.title(), "Bolsa de trabajo | ADAMIA");
  assert.match(await pg.locator('link[rel="canonical"]').getAttribute("href"), /^https:\/\/[^/]+\/bolsa-de-trabajo$/);
  assert.equal(filtros[0], `${BASE_Q}&orden=recientes`, "primera consulta: la de antes + orden");
  assert.equal(await pg.locator(".bt2-tarjeta").count(), 10);
  assert.equal(await pg.locator(".bt2-conteo b").innerText(), "23 vacantes abiertas");
  // Tarjetas: lo que hay en el API y nada más.
  const t1 = await pg.locator('[data-vacante="chofer-repartidor-monterrey"]').innerText();
  for (const t of ["Nueva", "Empacadora del Norte · Monterrey, Nuevo León", "$8,000 al mes", "Presencial", "Tiempo completo", "Hace 2 horas"]) assert.ok(t1.includes(t), `tarjeta sin «${t}»: ${t1}`);
  assert.ok(!t1.includes("WhatsApp"), "sin asistente no dice «Postúlate por WhatsApp»");
  const t2 = await pg.locator('[data-vacante="cajera-de-piso"]').innerText();
  for (const t of ["Nueva", "$8,500 a $10,500 al mes", "Postúlate por WhatsApp", "Medio tiempo"]) assert.ok(t2.includes(t), `tarjeta cajera sin «${t}»: ${t2}`);
  assert.ok((await pg.locator('[data-vacante="vacante-3"]').innerText()).includes("Sueldo a convenir"));
  assert.ok(!(await pg.locator('[data-vacante="vacante-4"]').innerText()).includes("WhatsApp"), "WhatsApp sin asistente: sin la insignia");
  assert.ok(!(await pg.locator('[data-vacante="vacante-4"]').innerText()).includes("Nueva"), "60 h: ya no es nueva");
  assert.ok(!/se postularon|inmediata/i.test(await pg.locator(".bt2-lista").innerText()), "sin datos que el API no da");
  assert.ok(publicos.some((x) => x.ruta === "/empresas/activas" && x.params === "?bolsa=1&limit=50&page=1"), "empresas de la bolsa (?bolsa=1)");
  ok("1440: lista con datos reales del API (Nueva ≤ 48 h, sueldo o «Sueldo a convenir», WhatsApp solo con asistente)");

  // Lista + vacante elegida: la primera se ve a la derecha; elegir otra cambia ?v= sin recargar.
  const panel = pg.locator(".bt2-panel");
  await panel.getByRole("heading", { level: 2, name: "Chofer repartidor" }).waitFor();
  await panel.locator("[data-acciones-postular]").waitFor();
  await pg.evaluate(() => { window.__sinRecargar = 1; });
  await pg.getByRole("link", { name: "Cajera de piso", exact: true }).click();
  await panel.getByRole("heading", { level: 2, name: "Cajera de piso" }).waitFor();
  assert.equal(new URL(pg.url()).pathname, "/bolsa-de-trabajo");
  assert.equal(new URL(pg.url()).searchParams.get("v"), "cajera-de-piso");
  assert.equal(await pg.evaluate(() => window.__sinRecargar), 1, "sin navegación completa");
  assert.equal(await pg.getByRole("link", { name: "Cajera de piso", exact: true }).getAttribute("aria-current"), "true");
  const ptexto = await panel.innerText();
  for (const t of ["Farmacias Lupita", "$8,500 a $10,500 al mes", "Av. Vallarta 1450, Guadalajara, Jalisco", "Lunes a sábado, 8 a 16 h", "No necesaria", "Qué harás", "Cobrar en caja.", "Cómo postularte", "Toca el botón verde", "Ver más vacantes de esta empresa"]) assert.ok(ptexto.includes(t), `panel sin «${t}»`);
  ok("1440: elegir una vacante la muestra a la derecha y cambia ?v=cajera-de-piso sin recargar");
  await panel.locator("[data-acciones-postular]").waitFor();
  await revisar(pg, "bolsa 1440", 1440);
  await foto(pg, "bolsa-1440", false);
  if (OUT) await pg.screenshot({ path: `${OUT}/bolsa-escritorio-portada.png` });

  // Teclado: ↓ pasa a la siguiente tarjeta y Enter la elige.
  await pg.getByRole("link", { name: "Chofer repartidor", exact: true }).focus();
  await pg.keyboard.press("ArrowDown");
  assert.equal((await enfocado(pg)).texto, "Cajera de piso");
  await pg.keyboard.press("ArrowDown");
  await pg.keyboard.press("Enter");
  await pg.waitForFunction(() => new URLSearchParams(location.search).get("v") === "vacante-3");
  await panel.getByRole("heading", { level: 2, name: "Auxiliar de almacén 3" }).waitFor();
  await pg.keyboard.press("End");
  assert.match((await enfocado(pg)).texto, /10$/, "Fin: la última tarjeta");
  await pg.keyboard.press("Home");
  assert.equal((await enfocado(pg)).texto, "Chofer repartidor");
  ok("1440: lista con teclado (↓ ↑ Inicio Fin, Enter elige)");

  // Chips con menú: sueldo, publicada, modalidad, jornada, empresa; Esc cierra y devuelve el foco.
  const chips = pg.getByRole("group", { name: "Filtros" });
  await chips.getByRole("button", { name: "Sueldo" }).click();
  const menu = pg.locator(".bt2-menu");
  await menu.waitFor();
  if (OUT) await pg.screenshot({ path: `${OUT}/bolsa-1440-menu-sueldo.png` });
  await menu.getByRole("radio", { name: "Desde $10,000 al mes", exact: true }).click();
  await esperarFiltro((s) => q(s).get("sueldo_min") === "10000", "sueldo_min=10000");
  await menu.waitFor({ state: "detached" });
  await chips.getByRole("button", { name: "Sueldo: desde $10,000 al mes" }).waitFor();
  assert.match(pg.url(), /sueldo=10000/);
  await chips.getByRole("button", { name: "Publicada" }).click();
  await menu.waitFor();
  await pg.keyboard.press("Escape");
  await menu.waitFor({ state: "detached" });
  await pg.waitForFunction(() => document.activeElement?.textContent?.trim() === "Publicada", null, { timeout: 3000 }).catch(() => { throw new Error("Esc no devolvió el foco al chip"); });
  await chips.getByRole("button", { name: "Publicada" }).click();
  await menu.getByRole("radio", { name: "Esta semana", exact: true }).click();
  await esperarFiltro((s) => q(s).get("publicada") === "7d" && q(s).get("sueldo_min") === "10000", "publicada=7d");
  await chips.getByRole("button", { name: "Modalidad" }).click();
  await menu.getByRole("radio", { name: "Presencial", exact: true }).click();
  await esperarFiltro((s) => q(s).get("modalidad") === "presencial", "modalidad=presencial");
  await chips.getByRole("button", { name: "Jornada" }).click();
  await menu.getByRole("radio", { name: "Medio tiempo", exact: true }).click();
  await esperarFiltro((s) => q(s).get("jornada") === "medio-tiempo" && q(s).get("modalidad") === "presencial", "jornada=medio-tiempo");
  await pg.getByRole("heading", { name: "No hay vacantes con esos filtros" }).or(pg.locator(".bt2-tarjeta").first()).first().waitFor();
  await chips.getByRole("button", { name: "Limpiar filtros" }).click();
  await pg.waitForFunction(() => !location.search.replace(/[?&]v=[^&]*/, "") && document.querySelectorAll(".bt2-tarjeta").length === 10);
  await chips.getByRole("button", { name: "Empresa" }).click();
  await menu.getByRole("radio", { name: "Farmacias Lupita", exact: true }).click();
  await esperarFiltro((s) => q(s).get("id_empresa") === "2", "id_empresa=2");
  await pg.locator(".bt2-activos").getByRole("button", { name: "Quitar filtro Farmacias Lupita" }).click();
  await pg.waitForFunction(() => !/empresa=/.test(location.search));
  // Interruptores de un toque.
  const sinExp = chips.getByRole("button", { name: "Sin experiencia" });
  await sinExp.click();
  await esperarFiltro((s) => q(s).get("sin_experiencia") === "1", "sin_experiencia=1");
  assert.equal(await sinExp.getAttribute("aria-pressed"), "true");
  await chips.getByRole("button", { name: "Postúlate por WhatsApp" }).click();
  await esperarFiltro((s) => q(s).get("whatsapp") === "1" && q(s).get("sin_experiencia") === "1", "whatsapp=1");
  await pg.waitForFunction(() => document.querySelectorAll(".bt2-tarjeta").length === 2);
  assert.match(pg.url(), /whatsapp=1&sinexp=1/);
  await chips.getByRole("button", { name: "Limpiar filtros" }).click();
  await pg.waitForFunction(() => document.querySelectorAll(".bt2-tarjeta").length === 10);
  // Ordenar: mejor sueldo y más cerca (ubicación del navegador redondeada, nunca en la dirección).
  await chips.getByRole("button", { name: "Ordenar" }).click();
  await menu.getByRole("radio", { name: "Mejor sueldo", exact: true }).click();
  await esperarFiltro((s) => q(s).get("orden") === "sueldo", "orden=sueldo");
  await chips.getByRole("button", { name: "Ordenar: Mejor sueldo" }).click();
  await menu.getByRole("radio", { name: "Más cerca de mí", exact: true }).click();
  await esperarFiltro((s) => q(s).get("orden") === "cerca" && q(s).get("lat") === "20.68" && q(s).get("lng") === "-103.35", "orden=cerca&lat=20.68&lng=-103.35");
  await pg.waitForFunction(() => document.querySelector(".bt2-tarjeta")?.innerText.includes("a menos de 1 km"));
  assert.ok((await pg.locator(".bt2-lista").innerText()).includes("a 4.2 km"));
  assert.ok(!/lat|lng|cerca/.test(new URL(pg.url()).search), `la ubicación no va en la dirección: ${pg.url()}`);
  await chips.getByRole("button", { name: "Limpiar filtros" }).click();
  ok("1440: chips (sueldo, publicada, modalidad, jornada, empresa, sin experiencia, WhatsApp, mejor sueldo, cerca de mí) con los parámetros exactos y Esc");

  // Buscar por puesto y lugar; paginación.
  await pg.getByRole("searchbox", { name: "Puesto" }).fill("chofer");
  await esperarFiltro((s) => q(s).get("titulo") === "chofer", "titulo=chofer");
  await pg.getByRole("combobox", { name: "Lugar" }).selectOption("estado:Nuevo León");
  await esperarFiltro((s) => q(s).get("titulo") === "chofer" && q(s).get("entidad") === "Nuevo León", "entidad=Nuevo León");
  assert.match(pg.url(), /q=chofer&estado=Nuevo\+Le%C3%B3n|q=chofer&estado=Nuevo%20Le%C3%B3n/);
  await pg.locator(".bt2-activos").getByRole("button", { name: "Quitar filtro «chofer»" }).click();
  await pg.locator(".bt2-activos").getByRole("button", { name: "Quitar filtro Nuevo León" }).click();
  await pg.waitForFunction(() => document.querySelectorAll(".bt2-tarjeta").length === 10 && !document.querySelector(".bt2-activos"));
  assert.equal(await pg.getByRole("searchbox", { name: "Puesto" }).inputValue(), "");
  await pg.getByRole("button", { name: "Página 2" }).click();
  await esperarFiltro((s) => q(s).get("page") === "2", "page=2");
  await pg.getByRole("button", { name: "Siguiente" }).click();
  await esperarFiltro((s) => q(s).get("page") === "3", "page=3");
  await pg.waitForFunction(() => document.querySelectorAll(".bt2-tarjeta").length === 3);
  assert.match(pg.url(), /pagina=3/);
  ok("1440: búsqueda por puesto y lugar, quitar filtros y paginación");

  // Postular desde el panel: vacante con asistente → diálogo con QR y «Abrir WhatsApp» + formulario corto.
  await pg.goto(base + "/bolsa-de-trabajo?v=cajera-de-piso", { waitUntil: "domcontentloaded" });
  await panel.getByRole("heading", { level: 2, name: "Cajera de piso" }).waitFor({ timeout: 20000 });
  const accionesP = panel.locator("[data-acciones-postular] .solo-escritorio");
  await accionesP.getByRole("button", { name: "Postularme", exact: true }).click();
  const dlg = pg.getByRole("dialog", { name: "O con un formulario corto" });
  await dlg.waitFor();
  const qr = dlg.getByRole("img", { name: "Código QR para abrir WhatsApp en tu celular" });
  assert.match(await qr.getAttribute("src"), /^data:image\/gif;base64,/, "QR hecho en el navegador");
  assert.ok((await qr.boundingBox()).width >= 170);
  const abrirWa = dlg.getByRole("link", { name: "Abrir WhatsApp" });
  assert.equal(await abrirWa.getAttribute("href"), VACANTES[1].whatsapp.enlace, "el enlace wa.me exacto del API");
  assert.equal(await abrirWa.getAttribute("target"), "_blank");
  assert.match(await abrirWa.getAttribute("rel"), /noopener/);
  await revisar(pg, "postular 1440", 1440);
  if (OUT) await pg.screenshot({ path: `${OUT}/postular-1440-whatsapp-qr.png` });
  const terminar = await postularConFormulario(pg, dlg, { telefono: "33 1234 5678", nombre: "Rosa Martínez Peña", slug: "cajera-de-piso" });
  if (OUT) await pg.screenshot({ path: `${OUT}/postular-1440-codigo.png` });
  await terminar();
  if (OUT) await pg.screenshot({ path: `${OUT}/postular-1440-listo.png` });
  await pg.keyboard.press("Escape");
  await dlg.waitFor({ state: "detached" });
  await panel.getByText("Ya enviamos tu postulación").waitFor();
  ok("1440: «Postularme» abre el diálogo con QR + «Abrir WhatsApp» (href exacto) y la solicitud corta (SMS, token, sin CV)");

  // Vacante sin asistente: solo el formulario; «Preguntar por WhatsApp» aparte cuando hay WhatsApp sin asistente.
  await pg.goto(base + "/bolsa-de-trabajo?v=vacante-4", { waitUntil: "domcontentloaded" });
  await panel.getByRole("heading", { level: 2, name: "Recepcionista bilingüe 4" }).waitFor({ timeout: 20000 });
  await panel.locator("[data-acciones-postular]").waitFor();
  assert.equal(await panel.locator("[data-acciones-postular] .solo-escritorio").getByRole("button").count(), 1, "una sola acción: Postularme");
  const dudas = panel.getByRole("link", { name: /Pedir información por WhatsApp sobre la vacante Recepcionista bilingüe 4/ });
  assert.equal(await dudas.getAttribute("href"), VACANTES[3].whatsapp.enlace);
  assert.ok((await panel.innerText()).includes("Te responde el equipo de reclutamiento."));
  await panel.locator("[data-acciones-postular] .solo-escritorio").getByRole("button", { name: "Postularme" }).click();
  const dlg2 = pg.getByRole("dialog", { name: "Postularme a Recepcionista bilingüe 4" });
  await dlg2.waitFor();
  assert.equal(await dlg2.locator("[data-postular-whatsapp]").count(), 0, "sin asistente no hay lado de WhatsApp");
  await pg.keyboard.press("Escape");
  await dlg2.waitFor({ state: "detached" });
  ok("1440: sin asistente, «Postularme» abre solo el formulario y «Preguntar por WhatsApp» queda aparte");

  // Vacía, error y reintentar.
  await pg.goto(base + "/bolsa-de-trabajo?q=astronauta", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { name: "No hay vacantes con esos filtros" }).waitFor({ timeout: 20000 });
  await foto(pg, "bolsa-1440-vacia", false);
  S.falla = 1;
  await pg.goto(base + "/bolsa-de-trabajo", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { name: "No pudimos cargar las vacantes" }).waitFor({ timeout: 20000 });
  await revisar(pg, "bolsa error 1440", 1440);
  await pg.getByRole("button", { name: "Reintentar" }).click();
  await pg.getByRole("link", { name: "Chofer repartidor", exact: true }).waitFor({ timeout: 15000 });
  ok("1440: sin resultados con «Limpiar filtros», error con «Reintentar»");

  // Página de la vacante en computadora: JSON-LD JobPosting válido, sin ejecutar el HTML de la vacante.
  await pg.goto(base + "/vacante/cajera-de-piso", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { level: 1, name: "Cajera de piso" }).waitFor({ timeout: 30000 });
  assert.equal(await pg.title(), "Cajera de piso en Farmacias Lupita | Bolsa de trabajo | ADAMIA");
  assert.match(await pg.locator('link[rel="canonical"]').getAttribute("href"), /^https:\/\/[^/]+\/vacante\/cajera-de-piso$/);
  const ld = JSON.parse(await pg.locator('script[type="application/ld+json"]').textContent());
  for (const k of ["title", "description", "datePosted", "hiringOrganization", "jobLocation", "validThrough", "baseSalary"]) assert.ok(ld[k], `JobPosting sin ${k}`);
  assert.equal(ld["@type"], "JobPosting");
  assert.equal(ld.hiringOrganization.name, "Farmacias Lupita");
  assert.deepEqual(ld.baseSalary, { "@type": "MonetaryAmount", currency: "MXN", value: { "@type": "QuantitativeValue", minValue: 8500, maxValue: 10500, unitText: "MONTH" } });
  assert.equal(ld.validThrough, `${enUnMes}T23:59:59-06:00`);
  assert.equal(ld.employmentType, "PART_TIME");
  assert.equal(ld.jobLocation.address.addressRegion, "Jalisco");
  assert.match(ld.datePosted, /^\d{4}-\d{2}-\d{2}$/);
  await revisar(pg, "vacante 1440", 1440);
  await foto(pg, "vacante-1440");
  await pg.goto(base + "/vacante/chofer-repartidor-monterrey", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { level: 1, name: "Chofer repartidor" }).waitFor({ timeout: 30000 });
  assert.equal(await pg.evaluate(() => window.__xss), undefined, "el HTML de la vacante no ejecuta código");
  assert.equal(JSON.parse(await pg.locator('script[type="application/ld+json"]').textContent()).validThrough, undefined, "sin fecha de cierre no se inventa");
  // No existe y error.
  await pg.goto(base + "/vacante/ya-no-existe", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { name: "Esta vacante ya no está disponible" }).waitFor({ timeout: 20000 });
  assert.equal(await pg.title(), "Vacante no disponible | ADAMIA");
  S.slugFalla = 1;
  await pg.goto(base + "/vacante/cajera-de-piso", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { name: "No pudimos cargar la vacante" }).waitFor({ timeout: 20000 });
  await pg.getByRole("button", { name: "Reintentar" }).click();
  await pg.getByRole("heading", { level: 1, name: "Cajera de piso" }).waitFor({ timeout: 15000 });
  // Con sesión de RH abierta (sus «mis postulaciones» dan 403) la vacante se ve, sin botón de postularse.
  S.sesion = { id_usuario: 5, tipo_usuario: "Recruiter", correo: "rh@prueba.invalid", nombre: "RH" };
  await ctx.addCookies([{ name: "token", value: "sesion-rh-prueba", url: base }]);
  await pg.goto(base + "/vacante/chofer-repartidor-monterrey", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { level: 1, name: "Chofer repartidor" }).waitFor({ timeout: 20000 });
  await dormir(800);
  assert.equal(await pg.locator("[data-acciones-postular]").count(), 0, "RH no ve «Postularme»");
  await ctx.clearCookies();
  S.sesion = null;
  ok("1440: /vacante/[slug] con JSON-LD JobPosting (requeridos, sueldo, validThrough), canonical, no existe, error y sesión de RH");

  // Menú del sitio: «Bolsa de trabajo».
  await pg.goto(base + "/", { waitUntil: "domcontentloaded" });
  const enlaceEsc = pg.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: "Bolsa de trabajo" });
  await enlaceEsc.waitFor({ timeout: 30000 });
  await enlaceEsc.click();
  await pg.waitForURL(/\/bolsa-de-trabajo$/, { timeout: 20000 });
  await pg.getByRole("heading", { level: 1, name: "Bolsa de trabajo" }).waitFor({ timeout: 20000 });
  await ctx.close();

  // ═════════ Reducir movimiento ═════════
  const cr = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", reducedMotion: "reduce", isMobile: true, hasTouch: true });
  await instalarMocks(cr);
  const pr = await cr.newPage();
  pr.on("pageerror", (e) => errores.push(e.message));
  await pr.goto(base + "/bolsa-de-trabajo", { waitUntil: "domcontentloaded" });
  await pr.getByRole("link", { name: "Chofer repartidor", exact: true }).waitFor({ timeout: 30000 });
  await pr.getByRole("button", { name: /^Filtros/ }).click();
  const hojaR = pr.getByRole("dialog", { name: "Filtros" });
  await hojaR.waitFor();
  const duracion = await hojaR.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration) || 0);
  assert.ok(duracion < 0.01, `con reducir movimiento la hoja no se anima (${duracion}s)`);
  await cr.close();
  ok("390: con «reducir movimiento» la hoja de filtros no se anima");

  // ═════════ Celular 390 y 360 ═════════
  for (const ancho of [390, 360]) {
    const cm = await browser.newContext({ viewport: { width: ancho, height: 800 }, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: true, isMobile: true, deviceScaleFactor: 2,
      permissions: ["geolocation"], geolocation: { latitude: 25.6866, longitude: -100.3161 } });
    await instalarMocks(cm);
    const pm = await cm.newPage();
    pm.on("pageerror", (e) => errores.push(e.message));
    pm.on("dialog", (d) => { errores.push(`diálogo inesperado: ${d.message()}`); d.dismiss(); });
    await pm.goto(base + "/bolsa-de-trabajo", { waitUntil: "domcontentloaded" });
    await pm.getByRole("link", { name: "Chofer repartidor", exact: true }).waitFor({ timeout: 30000 });
    assert.equal(await pm.locator(".bt2-panel").isVisible(), false, "en celular no hay panel derecho");
    assert.equal(publicos.filter((x) => x.ruta === "/vacantes/slug/chofer-repartidor-monterrey" && x.params === "").length >= 0, true);
    assert.equal(await pm.getByRole("group", { name: "Filtros", exact: true }).isVisible(), false, "chips de escritorio ocultos");
    const r = await revisar(pm, `bolsa ${ancho}`, ancho);
    assert.ok(r.letra >= 17, `letra base ${r.letra}px`);
    await foto(pm, `bolsa-${ancho}`, false);
    if (OUT && ancho === 390) await pm.screenshot({ path: `${OUT}/bolsa-celular.png`, fullPage: true });
    // Chips rápidos: cerca de mí y WhatsApp.
    const rapidos = pm.getByRole("group", { name: "Filtros rápidos" });
    const n0 = filtros.length; // solo cuentan las consultas de este ancho
    await rapidos.getByRole("button", { name: "Cerca de mí" }).click();
    await esperarFiltro((s) => q(s).get("orden") === "cerca" && q(s).get("lat") === "25.69" && q(s).get("lng") === "-100.32", `cerca ${ancho}`, n0);
    assert.equal(await rapidos.getByRole("button", { name: "Cerca de mí" }).getAttribute("aria-pressed"), "true");
    await rapidos.getByRole("button", { name: "Cerca de mí" }).click();
    await rapidos.getByRole("button", { name: "Por WhatsApp" }).click();
    await esperarFiltro((s) => q(s).get("whatsapp") === "1" && q(s).get("orden") === "recientes", `whatsapp ${ancho}`, n0);
    await rapidos.getByRole("button", { name: "Por WhatsApp" }).click();
    await pm.waitForFunction(() => !/whatsapp/.test(location.search));
    // Hoja «Filtros»: foco atrapado, Esc, opción y «Ver N vacantes».
    const abrirHoja = rapidos.getByRole("button", { name: /^Filtros/ });
    await abrirHoja.click();
    const hoja = pm.getByRole("dialog", { name: "Filtros" });
    await hoja.waitFor();
    for (let i = 0; i < 40; i++) await pm.keyboard.press("Tab");
    assert.equal((await enfocado(pm)).enDialogo, true, "el foco no sale de la hoja");
    await pm.keyboard.press("Escape");
    await hoja.waitFor({ state: "detached" });
    await pm.waitForFunction(() => /^Filtros/.test(document.activeElement?.textContent?.trim() ?? ""), null, { timeout: 3000 }).catch(() => { throw new Error("al cerrar, el foco no volvió a «Filtros»"); });
    await abrirHoja.click();
    await hoja.waitFor();
    await hoja.getByRole("radio", { name: "Desde casa", exact: true }).click();
    await esperarFiltro((s) => q(s).get("modalidad") === "remoto", `modalidad=remoto (hoja ${ancho})`, n0);
    await hoja.getByRole("checkbox", { name: "Sin experiencia" }).check();
    await esperarFiltro((s) => q(s).get("modalidad") === "remoto" && q(s).get("sin_experiencia") === "1", "hoja: sin experiencia", n0);
    const esperado = filtrar(q(filtros.at(-1))).total;
    const ver = hoja.getByRole("button", { name: esperado === 1 ? "Ver 1 vacante" : `Ver ${esperado} vacantes` });
    await ver.waitFor();
    await revisar(pm, `hoja de filtros ${ancho}`, ancho);
    await dormir(300);
    if (OUT) await pm.screenshot({ path: `${OUT}/bolsa-${ancho}-filtros.png` });
    await ver.click();
    await hoja.waitFor({ state: "detached" });
    await rapidos.getByRole("button", { name: "Filtros · 2" }).waitFor();
    await hoja.waitFor({ state: "detached" });
    await abrirHoja.click();
    await hoja.getByRole("button", { name: "Limpiar" }).click();
    await pm.waitForFunction(() => !location.search);
    await pm.keyboard.press("Escape");
    ok(`${ancho}: chips rápidos (cerca de mí, WhatsApp) y hoja «Filtros» (foco atrapado, Esc, «Ver N vacantes», Limpiar)`);

    // Tocar una tarjeta abre la página de la vacante (con asistente): botón verde fijo abajo + «No tengo WhatsApp».
    await pm.getByRole("link", { name: "Cajera de piso", exact: true }).click();
    await pm.waitForURL(/\/vacante\/cajera-de-piso$/, { timeout: 20000 });
    await pm.getByRole("heading", { level: 1, name: "Cajera de piso" }).waitFor({ timeout: 20000 });
    const verde = pm.locator(".bt2-acciones.barra .solo-movil").getByRole("link", { name: "Postularme por WhatsApp" });
    await verde.waitFor();
    const caja = await verde.boundingBox();
    assert.ok(caja.height >= 56, `botón verde de ${caja.height}px`);
    assert.ok(caja.y + caja.height <= 800 && caja.y > 800 - 160, `fijo abajo (y=${Math.round(caja.y)})`);
    assert.equal(await verde.getAttribute("href"), VACANTES[1].whatsapp.enlace, "el enlace wa.me exacto del agente");
    assert.equal(await verde.evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(21, 128, 61)");
    const [popup] = await Promise.all([cm.waitForEvent("page"), verde.click()]);
    await popup.waitForLoadState("domcontentloaded");
    assert.equal(popup.url(), VACANTES[1].whatsapp.enlace);
    assert.equal(await popup.evaluate(() => window.opener), null, "sin opener");
    await popup.close();
    const vtexto = await pm.locator(".bt2-ficha").innerText();
    for (const t of ["Sueldo", "Dónde", "Horario", "Experiencia", "No necesaria", "Qué harás", "Cómo postularte", "Toca el botón verde «Postularme por WhatsApp».", "Te damos día y hora de entrevista."]) assert.ok(vtexto.includes(t), `vacante sin «${t}»`);
    await pm.getByRole("link", { name: "Regresar a las vacantes" }).waitFor();
    await revisar(pm, `vacante ${ancho}`, ancho);
    await foto(pm, `vacante-${ancho}`, false);
    if (OUT && ancho === 390) await pm.screenshot({ path: `${OUT}/vacante-${ancho}-completa.png`, fullPage: true });
    // «No tengo WhatsApp: llenar formulario» → solicitud a pantalla completa.
    await pm.getByRole("button", { name: "No tengo WhatsApp: llenar formulario" }).click();
    const dm = pm.getByRole("dialog", { name: "Postularme a Cajera de piso" });
    await dm.waitFor();
    assert.equal(await dm.locator("[data-postular-whatsapp]").count(), 0, "en celular el formulario va solo");
    const cajaD = await dm.boundingBox();
    assert.ok(cajaD.width >= ancho - 1, "a pantalla completa");
    const terminarM = await postularConFormulario(pm, dm, { telefono: "+52 81 5555 0101", nombre: "Ana Torres Ruiz", slug: "cajera-de-piso" });
    await revisar(pm, `código ${ancho}`, ancho);
    if (OUT) await pm.screenshot({ path: `${OUT}/vacante-${ancho}-codigo.png` });
    if (OUT && ancho === 390) await pm.screenshot({ path: `${OUT}/vacante-celular-otp.png` });
    await terminarM();
    await revisar(pm, `enviada ${ancho}`, ancho);
    if (OUT) await pm.screenshot({ path: `${OUT}/vacante-${ancho}-enviada.png` });
    await dm.getByRole("button", { name: "Cerrar" }).click();
    await pm.locator(".bt2-acciones").getByText("Ya enviamos tu postulación").waitFor();
    ok(`${ancho}: tarjeta → página; verde «Postularme por WhatsApp» fijo abajo (wa.me exacto, sin opener) y «No tengo WhatsApp» → solicitud con SMS`);

    // Sin asistente: la acción principal es «Postularme» (formulario), también fija abajo.
    await pm.goto(base + "/vacante/chofer-repartidor-monterrey", { waitUntil: "domcontentloaded" });
    await pm.getByRole("heading", { level: 1, name: "Chofer repartidor" }).waitFor({ timeout: 20000 });
    const postular = pm.locator(".bt2-acciones.barra .solo-movil").getByRole("button", { name: "Postularme" });
    await postular.waitFor();
    assert.ok((await postular.boundingBox()).height >= 56);
    assert.equal(await pm.getByRole("link", { name: "Postularme por WhatsApp" }).count(), 0);
    assert.ok((await pm.locator(".bt2-ficha").innerText()).includes("Confirma con el código que te llega por SMS."));
    await postular.click();
    const dm2 = pm.getByRole("dialog", { name: "Postularme a Chofer repartidor" });
    await dm2.waitFor();
    await revisar(pm, `solicitud ${ancho}`, ancho);
    if (OUT) await pm.screenshot({ path: `${OUT}/vacante-${ancho}-formulario.png` });
    await pm.keyboard.press("Escape");
    await dm2.waitFor({ state: "detached" });
    ok(`${ancho}: sin asistente, «Postularme» fijo abajo abre la solicitud corta`);
    await cm.close();
  }

  assert.deepEqual(errores, [], `errores en la página: ${errores.join(" | ")}`);
  assert.deepEqual(problemas, [], `problemas:\n${problemas.join("\n")}`);
  console.log(`OK verify-bolsa: ${hechos.length} comprobaciones, ${filtros.length} consultas a /vacantes/filter, ${envios.create.length} postulaciones con SMS; 1440, 390 y 360 sin desborde.`);
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
