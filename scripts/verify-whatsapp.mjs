// Verificación en navegador de WhatsApp en ADAMIA (R1): bandeja, control humano/IA, envío, errores, reintento,
// móvil, administración por empresa y enlace de vacante. Backend simulado: nada sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RECRUITMENT_ENABLED=true npm run build
//      CAPTURAS=/ruta/capturas node scripts/verify-whatsapp.mjs
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
const API_ORIGEN = "https://api.prueba.invalid";
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");
const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, [REPO + "/node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { cwd: REPO, stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const firmar = (tipo) => {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
};

// ——— Datos simulados ———
const hace = (min) => {
  const d = new Date(Date.now() - 6 * 3600 * 1000 - min * 60000);
  return d.toISOString().slice(0, 19).replace("T", " ");
};
const reclutadora = {
  id_usuario: 7, tipo_usuario: "Recruiter", esAcceso: true, nombre: "Laura Gómez", correo: "laura@uniline.mx", id_empresa: 10, empresas: [10, 11],
  empresas_detalle: [{ id_empresa: 10, nombre: "Uniline" }, { id_empresa: 11, nombre: "Uniline Norte" }], zona_horaria: "America/Mexico_City",
};
const admin = { id_usuario: 1, tipo_usuario: "Admin", nombre: "Soporte ADAMIA" };
const ENLACE = "https://wa.me/525598765432?text=Hola%2C%20me%20interesa%20la%20vacante%20%5BV-AB12%5D";

function estadoInicial() {
  const conversaciones = [
    { id: 1, id_empresa: 10, contacto: { id: 501, nombre: "Ana Ruiz", telefono: "5215512345678" }, vacante: { id_vacante: 55, titulo: "Operador de montacargas" },
      modo: "ia", control: null, no_leidos: 2, ultimo_mensaje: { texto: "¿Sigue disponible la vacante?", direccion: "entrante", creado_en: hace(3) }, ultimo_entrante_en: hace(3), ventana_abierta: true },
    { id: 2, id_empresa: 10, contacto: { id: 502, nombre: "", telefono: "5214421234567" }, vacante: null,
      modo: "humano", control: { id_usuario: 7, nombre: "Laura Gómez", correo: "laura@uniline.mx" }, no_leidos: 0, ultimo_mensaje: { texto: "Gracias", direccion: "entrante", creado_en: hace(60 * 30) }, ultimo_entrante_en: hace(60 * 30), ventana_abierta: false },
    { id: 3, id_empresa: 10, contacto: { id: 503, nombre: "Carlos Méndez Ortega con un nombre muy largo para probar", telefono: "5218112345678" }, vacante: { id_vacante: 56, titulo: "Auxiliar de almacén turno nocturno" },
      modo: "humano", control: { id_usuario: 7, nombre: "Pedro", correo: "pedro@uniline.mx" }, no_leidos: 0, ultimo_mensaje: { texto: "Te esperamos el lunes", direccion: "saliente", creado_en: hace(60 * 26) }, ultimo_entrante_en: hace(60 * 27), ventana_abierta: true },
  ];
  const mensajes = {
    1: [
      { id: 101, direccion: "entrante", actor: "candidato", tipo: "texto", texto: "Hola, vi la vacante de operador.", estado: "recibido", error: null, creado_en: hace(60 * 25), usuario: null },
      { id: 102, direccion: "saliente", actor: "ia", tipo: "texto", texto: "¡Hola Ana! Claro, te cuento: el turno es de 7 a 15 h. ¿Tienes licencia vigente?", estado: "leido", error: null, creado_en: hace(60 * 25 - 1), usuario: null },
      { id: 103, direccion: "saliente", actor: "reclutador", tipo: "texto", texto: "Te comparto la dirección de la planta.", estado: "fallido", error: "Número no disponible", creado_en: hace(10), usuario: { nombre: "Laura Gómez" } },
      { id: 104, direccion: "entrante", actor: "candidato", tipo: "texto", texto: "¿Sigue disponible la vacante?", estado: "recibido", error: null, creado_en: hace(3), usuario: null },
    ],
    2: [
      { id: 200, direccion: "entrante", actor: "candidato", tipo: "imagen", texto: "", estado: "recibido", error: null, creado_en: hace(60 * 31), usuario: null },
      { id: 201, direccion: "entrante", actor: "candidato", tipo: "texto", texto: "Gracias", estado: "recibido", error: null, creado_en: hace(60 * 30), usuario: null },
    ],
    3: [
      { id: 301, direccion: "entrante", actor: "candidato", tipo: "texto", texto: "Hola", estado: "recibido", error: null, creado_en: hace(60 * 27), usuario: null },
      { id: 302, direccion: "saliente", actor: "sistema", tipo: "texto", texto: "Pedro tomó la conversación.", estado: "enviado", error: null, creado_en: hace(60 * 26 + 1), usuario: null },
      { id: 303, direccion: "saliente", actor: "reclutador", tipo: "texto", texto: "Te esperamos el lunes", estado: "entregado", error: null, creado_en: hace(60 * 26), usuario: { nombre: "Pedro" } },
    ],
  };
  const empresas = [
    { id_empresa: 10, nombre_empresa: "Uniline", modo: "compartido", zernio_account_id: null, numero_whatsapp: "5215598765432", precio_conversacion: 1.5, precio_mensual: 0, conversaciones_mes: 12 },
    { id_empresa: 11, nombre_empresa: "Uniline Norte", modo: "apagado", zernio_account_id: null, numero_whatsapp: null, precio_conversacion: null, precio_mensual: null, conversaciones_mes: 0 },
    { id_empresa: 12, nombre_empresa: "Transportes Sur", modo: "propio", zernio_account_id: "acc_sur", numero_whatsapp: "5213312345678", precio_conversacion: 1, precio_mensual: 499, conversaciones_mes: 87 },
  ];
  return { conversaciones, mensajes, empresas, modo: "compartido", envios: [], siguienteId: 900 };
}

const pedidos = [];
let S = estadoInicial();

async function instalarMocks(ctx, usuario) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base) return json({});
    if (url.origin !== API_ORIGEN) return route.abort();
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    if (p === "/users/verify/token") return json({ user: usuario });
    if (!p.startsWith("/reclutamiento/whatsapp")) return json({});
    const ruta = p.slice("/reclutamiento/whatsapp".length);
    let cuerpo = null;
    try { cuerpo = req.postData() ? JSON.parse(req.postData()) : null; } catch { cuerpo = req.postData(); }
    pedidos.push({ metodo: req.method(), ruta, params: url.search, cuerpo, token: req.headers().authorization || "" });
    const conv = (id) => S.conversaciones.find((c) => String(c.id) === String(id));
    let m;
    if (ruta === "/estado") return json({ modo: S.modo, numero_whatsapp: S.modo === "apagado" ? null : "5215598765432", conversaciones_mes: 12, puede_usar: S.modo !== "apagado" });
    if (ruta === "/conversaciones") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      const lista = S.conversaciones.filter((c) => !q || `${c.contacto.nombre} ${c.contacto.telefono} ${c.vacante?.titulo ?? ""}`.toLowerCase().includes(q));
      return json({ conversaciones: lista, total: lista.length });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)$/))) {
      const c = conv(m[1]);
      if (!c) return json({ error: "No existe" }, 404);
      c.no_leidos = 0;
      return json({ conversacion: c, mensajes: S.mensajes[c.id] });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/tomar$/))) {
      const c = conv(m[1]); c.modo = "humano"; c.control = { id_usuario: 7, nombre: "Laura Gómez", correo: "laura@uniline.mx" };
      return json({ conversacion: c });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/devolver$/))) {
      const c = conv(m[1]); c.modo = "ia"; c.control = null;
      return json({ conversacion: c });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/mensajes\/(\d+)\/reintentar$/))) {
      const msg = S.mensajes[m[1]].find((x) => String(x.id) === m[2]);
      if (msg.direccion !== "saliente" || msg.estado !== "fallido") return json({ codigo: "WA_NO_REINTENTABLE", error: "No reintentable" }, 409);
      Object.assign(msg, { estado: "enviado", error: null });
      return json({ mensaje: msg });
    }
    if ((m = ruta.match(/^\/conversaciones\/(\d+)\/mensajes$/))) {
      const resp = S.envios.shift() ?? "ok";
      if (resp === "403") return json({ codigo: "WA_SIN_CONTROL", error: "Sin control" }, 403);
      if (resp === "409") return json({ codigo: "WA_VENTANA_CERRADA", error: "Ventana cerrada" }, 409);
      if (resp === "fallido") {
        const msg = { id: S.siguienteId++, direccion: "saliente", actor: "reclutador", tipo: "texto", texto: cuerpo.texto, estado: "fallido", error: "Zernio rechazó el envío", creado_en: hace(0), usuario: { nombre: "Laura Gómez" } };
        S.mensajes[m[1]].push(msg);
        return json({ mensaje: msg });
      }
      await dormir(700); // deja ver el «Enviando…»
      const msg = { id: S.siguienteId++, direccion: "saliente", actor: "reclutador", tipo: "texto", texto: cuerpo.texto, estado: "enviado", error: null, creado_en: hace(0), usuario: { nombre: "Laura Gómez" } };
      S.mensajes[m[1]].push(msg);
      return json({ mensaje: msg });
    }
    if ((m = ruta.match(/^\/vacantes\/(\d+)\/enlace$/))) {
      if (m[1] === "56") return json({ codigo: "WA_APAGADO", error: "Apagado" }, 409);
      return json({ token: "V-AB12", numero: "5215598765432", enlace: ENLACE });
    }
    if (ruta === "/admin/empresas" && req.method() === "GET") return json(S.empresas);
    if ((m = ruta.match(/^\/admin\/empresas\/(\d+)$/)) && req.method() === "PUT") {
      if (cuerpo.zernio_account_id === "acc_sur") return json({ codigo: "WA_CUENTA_DUPLICADA", error: "duplicada" }, 409);
      const e = S.empresas.find((x) => String(x.id_empresa) === m[1]);
      Object.assign(e, cuerpo);
      return json(e);
    }
    return json({ error: "Ruta no simulada" }, 404);
  });
}

const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const tamano = async (loc) => { const b = await loc.boundingBox(); return b ? Math.min(b.width, b.height) : 0; };
const cuenta = (filtro) => pedidos.filter(filtro).length;

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch { /* aún no arranca */ } if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];

  // ——— 1. Bandeja en escritorio ———
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City", permissions: ["clipboard-read", "clipboard-write"] });
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctx, reclutadora);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  const lista = page.getByRole("list", { name: "Conversaciones" });
  await lista.waitFor({ timeout: 30000 });
  assert.equal(await page.getByRole("heading", { name: "Conversaciones de WhatsApp" }).count(), 1);
  assert.match(await page.locator('[data-estado-wa="compartido"]').innerText(), /Activo · número compartido de ADAMIA[\s\S]*\+52 55 9876 5432[\s\S]*12 conversaciones este mes/);
  assert.equal(await page.getByLabel("Empresa").filter({ visible: true }).count(), 1, "selector de empresa con 2 empresas");
  const items = lista.getByRole("listitem");
  assert.equal(await items.count(), 3);
  const anaItem = page.getByRole("button", { name: "Ana Ruiz, 2 sin leer" });
  assert.match(await anaItem.innerText(), /Ana Ruiz[\s\S]*hace 3 min[\s\S]*Operador de montacargas[\s\S]*¿Sigue disponible la vacante\?[\s\S]*2[\s\S]*IA/);
  assert.match(await items.nth(1).innerText(), /\+52 442 123 4567[\s\S]*Sin vacante[\s\S]*Tú tienes el control/);
  assert.match(await items.nth(2).innerText(), /Atiende Pedro/);
  const listaInicial = pedidos.find((x) => x.ruta === "/conversaciones");
  assert.match(listaInicial.params, /empresa=10/);
  assert.match(listaInicial.token, /^Bearer .+/);
  // Menú lateral: entrada real fuera del demo.
  const entradaMenu = page.getByRole("button", { name: "Conversaciones (WhatsApp)" });
  assert.equal(await entradaMenu.count(), 1, "entrada en el menú de reclutamiento");
  assert.equal(await page.getByText("Usa datos ficticios.").count(), 0, "no usa el layout demo");
  if (OUT) await page.screenshot({ path: OUT + "/01-bandeja-escritorio.png" });

  // ——— 2. Abrir conversación: GET la marca leída ———
  await anaItem.click();
  await page.waitForURL(/\/panel\/whatsapp\?c=1$/);
  const hilo = page.getByRole("region", { name: "Conversación" });
  await hilo.getByText("Hola, vi la vacante de operador.").waitFor();
  assert.ok(cuenta((x) => x.metodo === "GET" && x.ruta === "/conversaciones/1") >= 1, "GET del hilo");
  await page.getByRole("button", { name: "Ana Ruiz", exact: true }).waitFor({ timeout: 5000 }); // sin «2 sin leer»
  assert.match(await hilo.locator('[data-mensaje="102"]').innerText(), /Asistente IA[\s\S]*Leído/);
  assert.match(await hilo.locator('[data-mensaje="103"]').innerText(), /Laura Gómez[\s\S]*No enviado: Número no disponible[\s\S]*Reintentar/);
  const composer = hilo.getByRole("textbox", { name: "Mensaje" });
  assert.equal(await composer.isDisabled(), true, "con IA no se escribe");
  assert.match(await hilo.innerText(), /La IA está atendiendo esta conversación/);
  // Sondeo del hilo cada 3 s.
  const getsAntes = cuenta((x) => x.ruta === "/conversaciones/1");
  await dormir(3600);
  assert.ok(cuenta((x) => x.ruta === "/conversaciones/1") > getsAntes, "el hilo se refresca solo");

  // ——— 3. Tomar control → escribir y enviar ———
  await hilo.getByRole("button", { name: "Tomar control" }).click();
  await hilo.getByRole("button", { name: "Devolver a IA" }).waitFor();
  assert.equal(cuenta((x) => x.metodo === "POST" && x.ruta === "/conversaciones/1/tomar"), 1);
  assert.equal(await composer.isDisabled(), false, "con el control sí se escribe");
  assert.match(await hilo.innerText(), /Tú tienes el control/);
  // Shift+Enter hace salto de línea y no envía.
  await composer.fill("Línea uno");
  await composer.press("Shift+Enter");
  await composer.pressSequentially("Línea dos");
  assert.equal(await composer.inputValue(), "Línea uno\nLínea dos");
  assert.equal(cuenta((x) => x.ruta === "/conversaciones/1/mensajes"), 0);
  await composer.fill("Hola Ana, ¿puedes venir mañana a las 10?");
  await composer.press("Enter");
  await hilo.getByText("Enviando…").first().waitFor({ timeout: 2000 });
  assert.equal(await composer.inputValue(), "", "el cuadro se limpia al enviar");
  await hilo.getByText("Enviando…").first().waitFor({ state: "detached", timeout: 5000 });
  const envio = pedidos.find((x) => x.metodo === "POST" && x.ruta === "/conversaciones/1/mensajes");
  assert.deepEqual(envio.cuerpo, { texto: "Hola Ana, ¿puedes venir mañana a las 10?" });
  assert.match(await hilo.locator('[data-mensaje="900"]').innerText(), /Hola Ana, ¿puedes venir mañana a las 10\?[\s\S]*Enviado/);
  assert.equal(await hilo.locator('[data-mensaje="900"]').count(), 1, "sin duplicados tras el sondeo");

  // ——— 4. Errores 403 y 409 ———
  S.envios.push("403");
  await composer.fill("Mensaje sin control");
  await hilo.getByRole("button", { name: "Enviar mensaje" }).click();
  await hilo.getByRole("alert").filter({ hasText: "Otra persona tiene el control" }).waitFor();
  assert.equal(await composer.inputValue(), "Mensaje sin control", "el texto no se pierde");
  S.envios.push("409");
  await composer.press("Enter");
  await hilo.getByRole("alert").filter({ hasText: "Pasaron más de 24 h" }).waitFor();
  assert.equal(await composer.inputValue(), "Mensaje sin control");
  // Zernio rechaza: el API responde 200 con estado «fallido» → «No enviado» + Reintentar.
  S.envios.push("fallido");
  await composer.fill("Mensaje que Zernio rechaza");
  await composer.press("Enter");
  await hilo.locator('[data-mensaje="901"]').getByText("No enviado: Zernio rechazó el envío").waitFor();
  await hilo.locator('[data-mensaje="901"]').getByRole("button", { name: "Reintentar" }).click();
  await hilo.locator('[data-mensaje="901"]').getByRole("button", { name: "Reintentar" }).waitFor({ state: "detached" });
  await composer.fill("");

  // ——— 5. Mensaje fallido → Reintentar ———
  await hilo.locator('[data-mensaje="103"]').getByRole("button", { name: "Reintentar" }).click();
  await hilo.locator('[data-mensaje="103"]').getByRole("button", { name: "Reintentar" }).waitFor({ state: "detached" });
  assert.equal(cuenta((x) => x.metodo === "POST" && x.ruta === "/conversaciones/1/mensajes/103/reintentar"), 1);
  assert.match(await hilo.locator('[data-mensaje="103"]').innerText(), /Enviado/);
  if (OUT) await page.screenshot({ path: OUT + "/02-hilo-escritorio.png" });

  // ——— 6. Enlace de la vacante: copiar ———
  await hilo.getByRole("button", { name: "Enlace de WhatsApp" }).click();
  const dialogo = page.getByRole("dialog", { name: "Enlace de WhatsApp" });
  await dialogo.getByRole("textbox", { name: "Enlace de WhatsApp de la vacante" }).waitFor();
  assert.equal(await dialogo.getByRole("textbox").inputValue(), ENLACE);
  assert.equal(await dialogo.getByRole("link", { name: "Abrir" }).getAttribute("href"), ENLACE);
  assert.equal(await dialogo.getByRole("link", { name: "Abrir" }).getAttribute("target"), "_blank");
  await dialogo.getByRole("button", { name: "Copiar enlace" }).click();
  await dialogo.getByRole("button", { name: "Copiado" }).waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), ENLACE);
  assert.equal(cuenta((x) => x.ruta === "/vacantes/55/enlace"), 1);
  if (OUT) await page.screenshot({ path: OUT + "/03-enlace-vacante.png" });
  await page.keyboard.press("Escape");

  // ——— 7. Devolver a IA ———
  await hilo.getByRole("button", { name: "Devolver a IA" }).click();
  await hilo.getByRole("button", { name: "Tomar control" }).waitFor();
  assert.equal(cuenta((x) => x.metodo === "POST" && x.ruta === "/conversaciones/1/devolver"), 1);
  assert.equal(await composer.isDisabled(), true);

  // ——— 8. Ventana de 24 h cerrada y control de otra persona ———
  await page.getByRole("button", { name: "+52 442 123 4567" }).click();
  await hilo.getByText("Gracias").first().waitFor();
  assert.match(await hilo.locator('[data-mensaje="200"]').innerText(), /\[Archivo: imagen\] \(se mostrará en una siguiente etapa\)/);
  assert.match(await hilo.innerText(), /Pasaron más de 24 h desde el último mensaje del candidato: WhatsApp no permite escribirle libremente\. Las plantillas para reabrir el chat llegan en una siguiente etapa\./);
  assert.equal(await hilo.getByRole("textbox", { name: "Mensaje" }).isDisabled(), true);
  await page.getByRole("button", { name: /^Carlos Méndez/ }).click();
  await hilo.getByText("Te esperamos el lunes").first().waitFor();
  assert.match(await hilo.innerText(), /Pedro tiene el control de esta conversación\./);
  assert.match(await hilo.locator('[data-mensaje="302"]').innerText(), /Sistema/);
  assert.equal(await hilo.getByRole("textbox", { name: "Mensaje" }).isDisabled(), true);
  assert.equal(await hilo.getByRole("button", { name: "Devolver a IA" }).count(), 0, "invitado con el mismo id pero otro correo: no controla ni devuelve");
  // Vacante con WhatsApp apagado → 409 WA_APAGADO.
  await hilo.getByRole("button", { name: "Enlace de WhatsApp" }).click();
  await page.getByRole("dialog").getByText("WhatsApp no está activado para tu empresa. Pídele a ADAMIA que lo active.").waitFor();
  await page.keyboard.press("Escape");
  // Búsqueda: manda q al API.
  await page.getByRole("searchbox", { name: "Buscar conversación" }).fill("montacargas");
  await page.waitForFunction(() => document.querySelectorAll('[aria-label="Conversaciones"] li').length === 1);
  assert.ok(pedidos.some((x) => x.ruta === "/conversaciones" && /q=montacargas/.test(x.params)));
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  // Cambiar de empresa consulta el estado y la lista de esa empresa y cierra el chat abierto.
  await page.getByLabel("Empresa").filter({ visible: true }).selectOption("11");
  await page.waitForURL(/\/panel\/whatsapp$/);
  for (let i = 0; i < 50 && !pedidos.some((x) => x.ruta === "/conversaciones" && /empresa=11/.test(x.params)); i++) await dormir(100);
  assert.ok(pedidos.some((x) => x.ruta === "/estado" && /empresa=11/.test(x.params)), "estado de la otra empresa");
  assert.ok(pedidos.some((x) => x.ruta === "/conversaciones" && /empresa=11/.test(x.params)), "lista de la otra empresa");
  await page.close();

  // ——— 9. Teléfono 390 px ———
  const movil = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await movil.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(movil, reclutadora);
  const tel = await movil.newPage();
  tel.on("pageerror", (e) => errores.push(e.message));
  await tel.goto(base + "/panel/whatsapp", { waitUntil: "domcontentloaded" });
  await tel.getByRole("list", { name: "Conversaciones" }).waitFor({ timeout: 30000 });
  assert.ok(await sinScrollHorizontal(tel), "lista sin scroll horizontal");
  assert.equal(await tel.getByLabel("Empresa").filter({ visible: true }).count(), 1, "selector de empresa visible en teléfono");
  assert.ok(await tamano(tel.getByRole("button", { name: "Ana Ruiz" })) >= 44);
  if (OUT) await tel.screenshot({ path: OUT + "/04-movil-lista.png", fullPage: true });
  await tel.getByRole("button", { name: "Ana Ruiz" }).tap();
  await tel.waitForURL(/\?c=1$/);
  const hiloTel = tel.getByRole("region", { name: "Conversación" });
  await hiloTel.getByText("Hola, vi la vacante de operador.").waitFor();
  assert.equal(await tel.getByRole("list", { name: "Conversaciones" }).isVisible(), false, "el chat ocupa la pantalla");
  const caja = await hiloTel.boundingBox();
  assert.ok(caja.x === 0 && caja.width === 390 && caja.height >= 840, `chat a pantalla completa: ${JSON.stringify(caja)}`);
  const enviarBtn = hiloTel.getByRole("button", { name: "Enviar mensaje" });
  const cajaEnviar = await enviarBtn.boundingBox();
  assert.ok(cajaEnviar.y + cajaEnviar.height <= 844 && cajaEnviar.y > 700, "el cuadro para escribir queda abajo");
  assert.ok(await tamano(enviarBtn) >= 44 && await tamano(hiloTel.getByRole("button", { name: "Volver a la lista" })) >= 44 && await tamano(hiloTel.getByRole("button", { name: "Tomar control" })) >= 40);
  assert.ok(await sinScrollHorizontal(tel), "chat sin scroll horizontal");
  await hiloTel.getByRole("button", { name: "Tomar control" }).tap();
  await hiloTel.getByRole("button", { name: "Devolver a IA" }).waitFor();
  await hiloTel.getByRole("textbox", { name: "Mensaje" }).fill("Desde el teléfono");
  if (OUT) await tel.screenshot({ path: OUT + "/05-movil-chat.png" });
  await hiloTel.getByRole("button", { name: "Volver a la lista" }).tap();
  await tel.waitForURL(/\/panel\/whatsapp$/);
  await tel.getByRole("list", { name: "Conversaciones" }).waitFor({ state: "visible" });
  assert.equal(await tel.getByRole("region", { name: "Conversación" }).count(), 0);

  // ——— 10. WhatsApp apagado para la empresa ———
  S.modo = "apagado";
  await tel.reload({ waitUntil: "domcontentloaded" });
  await tel.getByRole("heading", { name: "WhatsApp aún no está activo para tu empresa" }).waitFor({ timeout: 30000 });
  assert.match(await tel.locator('[data-estado-wa="apagado"]').innerText(), /Pídele a ADAMIA que lo active/);
  assert.equal(await tel.getByRole("list", { name: "Conversaciones" }).count(), 0);
  if (OUT) await tel.screenshot({ path: OUT + "/06-movil-apagado.png" });
  S.modo = "compartido";
  await movil.close();

  // ——— 11. Administración por empresa ———
  const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctxAdmin.addCookies([{ name: "token", value: firmar("Admin"), url: base }]);
  await instalarMocks(ctxAdmin, admin);
  const adm = await ctxAdmin.newPage();
  adm.on("pageerror", (e) => errores.push(e.message));
  await adm.goto(base + "/dashboard/whatsapp", { waitUntil: "domcontentloaded" });
  await adm.getByRole("heading", { name: "WhatsApp (reclutamiento)" }).waitFor({ timeout: 30000 });
  await adm.getByRole("cell", { name: "Transportes Sur", exact: true }).waitFor();
  assert.equal(await adm.getByRole("button", { name: "WhatsApp (reclutamiento)" }).count(), 1, "entrada en el menú de administración");
  assert.match(await adm.getByRole("row").filter({ hasText: "Transportes Sur" }).innerText(), /Número propio[\s\S]*acc_sur[\s\S]*\+52 33 1234 5678[\s\S]*\$1\.00[\s\S]*\$499\.00[\s\S]*87/);
  await adm.getByRole("searchbox", { name: "Buscar empresa" }).fill("norte");
  assert.equal(await adm.getByRole("row").count(), 2, "encabezado + 1 empresa");
  if (OUT) await adm.screenshot({ path: OUT + "/07-admin-escritorio.png" });
  await adm.getByRole("button", { name: "Editar WhatsApp de Uniline Norte" }).click();
  const dlg = adm.getByRole("dialog", { name: "WhatsApp de Uniline Norte" });
  await dlg.getByLabel("Modo").selectOption("propio");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await dlg.getByText("Con número propio, escribe el ID de la cuenta de Zernio.").waitFor();
  assert.match(await dlg.innerText(), /Con número propio, escribe el número de WhatsApp\./);
  assert.equal(cuenta((x) => x.metodo === "PUT"), 0, "no manda si falta lo obligatorio");
  await dlg.getByLabel("ID de cuenta de Zernio").fill("acc_sur");
  await dlg.getByLabel("Número de WhatsApp").fill("+52 81 5555 0000");
  await dlg.getByLabel("Precio por conversación (MXN)").fill("1.25");
  await dlg.getByLabel("Precio mensual (MXN)").fill("$1,200");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await dlg.getByRole("alert").filter({ hasText: "Esa cuenta de Zernio ya la usa otra empresa." }).waitFor();
  if (OUT) await adm.screenshot({ path: OUT + "/08-admin-dialogo.png" });
  await dlg.getByLabel("ID de cuenta de Zernio").fill("acc_norte");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await dlg.waitFor({ state: "detached" });
  const puts = pedidos.filter((x) => x.metodo === "PUT");
  assert.equal(puts.length, 2);
  assert.equal(puts[1].ruta, "/admin/empresas/11");
  assert.deepEqual(puts[1].cuerpo, { modo: "propio", zernio_account_id: "acc_norte", numero_whatsapp: "528155550000", precio_conversacion: 1.25, precio_mensual: 1200 });
  await adm.getByRole("row").filter({ hasText: "Uniline Norte" }).getByText("acc_norte").waitFor();
  await adm.setViewportSize({ width: 390, height: 844 });
  await adm.getByRole("searchbox", { name: "Buscar empresa" }).fill("");
  assert.ok(await sinScrollHorizontal(adm), "administración sin scroll horizontal en teléfono");
  if (OUT) await adm.screenshot({ path: OUT + "/09-admin-movil.png", fullPage: true });
  await ctxAdmin.close();

  assert.deepEqual(errores, [], "sin errores de JavaScript");
  exito = true;
  console.log("OK whatsapp · lista con no leídos y control · abrir chat lo marca leído (GET) · sondeo 3 s · tomar control habilita y envía {texto} con «Enviando…» · Shift+Enter · 403/409 con texto conservado · envío rechazado (200 «fallido») y reintentos · archivos como «[Archivo: tipo]» · invitado con mismo id y otro correo no controla · devolver a IA · ventana 24 h y control ajeno · enlace de vacante copiado y 409 apagado · búsqueda q · móvil a pantalla completa con volver · apagado · admin valida, muestra 409 y manda PUT");
} finally { await browser.close(); next.kill(); if (!exito) process.exitCode = 1; }
