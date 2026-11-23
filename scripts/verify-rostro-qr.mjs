// Verificación en navegador (05/12/2026): ficha → «Checador y acceso» en 3 columnas (1440 px) y apilada (390 px), y
// «Continuar desde el celular»: QR + enlace, el celular abre el enlace, acepta el aviso y guarda el rostro, el escritorio
// lo detecta solo, y el enlace usado o vencido muestra el error. Backend simulado; cámara falsa de Chromium y face-api
// simulado en el celular (como scripts/verify-firma-pin.mjs).
// (23/11/2026) Guía en vivo en el celular (sin rostro, fuera del óvalo, bien → botón deshabilitado/habilitado), toma
// inconsistente («La toma no salió bien…»), «✅ Rostro correcto» al terminar y, en la ficha, estado con fecha y origen y
// «Probar rostro» con coincide y no coincide (sin guardar nada). window.__escena elige lo que «ve» el face-api simulado.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx npm run build
//      && CAPTURAS=/ruta node scripts/verify-rostro-qr.mjs
import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
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
  { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, nombre, fullPage = true) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage }) : null);
function jwtRh() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };

// ---- Backend simulado ----
const empresa = { id_empresa: 10, nombre: "Empacadora del Norte", nombre_empresa: "Empacadora del Norte", estado: "Activo" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const emp = { id_empleado: 15, id_empresa: 10, nombre: "Ana", apellido_paterno: "Torres", apellido_materno: "Ruiz", correo: "ana@prueba.mx", estado: "Activo", nip: "1234", horarios: [] };
const enlaces = new Map(); // token → { id, estado }
const porId = (id) => [...enlaces.values()].find((e) => e.id === id);
let guardado = null;
const cambiosRostro = [];
const pedidos = [];
const escrituras = []; // POST/PUT de la ficha (Probar rostro no debe hacer ninguno)

async function rutasRh(ctx) {
  await ctx.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (d, s = 200) => route.fulfill({ status: s, contentType: "application/json", headers: cors, body: JSON.stringify(d) });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (req.method() !== "GET") escrituras.push(`${req.method()} ${p}`);
    if (p === "/checador/empleados/15") return json(guardado ? { ...emp, descriptor_facial: guardado.descriptor_facial } : emp);
    if (p === "/checador/empleados") return json({ data: [emp], total: 1, page: 1, totalPages: 1 });
    if (p === "/checador/firma-digital/solicitudes/documento") return json({ success: true, solicitud: { id: 77, estatus: "firmado", signed_at: "2026-11-23 15:04:00", nombre_firmante: "Ana Torres Ruiz", tiene_documento_firmado: true } });
    if (p === "/checador/mi-espacio/firma/empleado/15") return json({ ok: true, tiene_firma: true, tiene_pin: true, bloqueado_hasta: null, intentos_fallidos: 0, historial: [] });
    if (p === "/checador/mi-espacio/rostro/empleado/15") return json({ ok: true, cambios: cambiosRostro });
    if (p === "/checador/rostro-celular/empleado/15/enlaces" && req.method() === "POST") {
      assert.match(req.headers().authorization ?? "", /^Bearer /, "generar lleva la sesión de RH");
      for (const e of enlaces.values()) if (e.estado === "pendiente") e.estado = "expirado"; // el nuevo invalida al anterior
      const token = randomBytes(32).toString("base64url");
      const id = enlaces.size + 1;
      enlaces.set(token, { id, estado: "pendiente" });
      pedidos.push(`POST enlace ${id}`);
      return json({ ok: true, id, token, expira_en: new Date(Date.now() + 900000).toISOString(), segundos: 900, vigencia_minutos: 15 }, 201);
    }
    const m = /^\/checador\/rostro-celular\/empleado\/15\/enlaces\/(\d+)$/.exec(p);
    if (m) { pedidos.push(`GET estado ${m[1]}`); return json({ ok: true, estado: porId(Number(m[1]))?.estado ?? "expirado" }); }
    return json({});
  });
}

async function rutasCelular(ctx) {
  await ctx.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (d, s = 200) => route.fulfill({ status: s, contentType: "application/json", headers: cors, body: JSON.stringify(d) });
    const p = url.pathname.replace("/api", "");
    const m = /^\/checador\/rostro-celular\/publico\/([^/]+)$/.exec(p);
    if (!m) return json({}, 404);
    assert.equal(req.headers().authorization, undefined, "la página pública no manda sesión");
    const e = enlaces.get(decodeURIComponent(m[1]));
    const motivo = !e ? [404, "ENLACE_INVALIDO", "Este enlace no es válido."] : e.estado === "usado" ? [410, "ENLACE_USADO", "Este enlace ya se usó."] : e.estado === "expirado" ? [410, "ENLACE_VENCIDO", "Este enlace venció."] : null;
    if (motivo) return json({ ok: false, codigo: motivo[1], error: motivo[2] }, motivo[0]);
    if (req.method() === "GET") return json({ ok: true, nombre: "Ana Torres Ruiz", empresa: "Empacadora del Norte", segundos: 880, intentos_restantes: 5 });
    const b = req.postDataJSON();
    assert.equal(b.acepto_consentimiento, true);
    assert.equal(b.version, "2026-11-21", "misma versión del aviso que Mi espacio");
    assert.ok(Array.isArray(b.descriptor_facial) && b.descriptor_facial.length === 128 && b.descriptor_facial.every(Number.isFinite));
    guardado = b;
    e.estado = "usado";
    cambiosRostro.unshift({ id: 1, origen: "celular", consentimiento_version: b.version, creado_en: "2026-12-05 18:00:00", visto_por_rh: 0 });
    return json({ ok: true });
  });
}

// face-api simulado. window.__escena: "bien" (una cara centrada, de frente), "ninguna", "fuera" (en la esquina),
// "inestable" (las lecturas alternan dos huellas) u "otra" (otra persona). La huella de «bien» es la misma en cada
// lectura, con un ruido mínimo. Cajas y puntos en píxeles del video, como face-api.
const faceapiFalso = () => {
  let n = 0;
  window.__escena = window.__escena ?? "bien";
  const propia = () => Float32Array.from({ length: 128 }, (_, i) => Math.sin(i + 1) * 0.1 + Math.cos(i * ++n) * 0.0005);
  const ajena = () => Float32Array.from({ length: 128 }, (_, i) => Math.cos(i * 3 + 2) * 0.1);
  let lectura = 0;
  const huella = () => (window.__escena === "otra" || (window.__escena === "inestable" && lectura++ % 2) ? ajena() : propia());
  const caras = (input) => {
    const e = window.__escena;
    if (e === "ninguna") return [];
    const vw = input?.videoWidth || 640, vh = input?.videoHeight || 480;
    const w = Math.round(Math.min(vw, vh) * 0.35), h = Math.round(w * 1.1);
    const x = e === "fuera" ? 0 : (vw - w) / 2, y = e === "fuera" ? 0 : (vh - h) / 2;
    const positions = Array.from({ length: 68 }, () => ({ x: x + w / 2, y: y + h * 0.6 }));
    for (let i = 36; i < 42; i++) positions[i] = { x: x + w * 0.3, y: y + h * 0.4 };
    for (let i = 42; i < 48; i++) positions[i] = { x: x + w * 0.7, y: y + h * 0.4 };
    positions[30] = { x: x + w / 2, y: y + h * 0.6 };
    return [{ detection: { box: { x, y, width: w, height: h }, score: 0.9 }, landmarks: { positions } }];
  };
  const tarea = (valor) => ({ then: (ok, mal) => Promise.resolve(valor()).then(ok, mal) });
  window.faceapi = {
    nets: { tinyFaceDetector: { params: {} }, faceLandmark68Net: { params: {}, detectLandmarks: async () => null }, faceRecognitionNet: { params: {}, computeFaceDescriptor: async () => null } },
    TinyFaceDetectorOptions: class {},
    detectSingleFace: async () => null,
    detectAllFaces: (input) => ({
      withFaceLandmarks: () => ({
        ...tarea(() => caras(input)),
        withFaceDescriptors: async () => caras(input).map((c) => ({ ...c, descriptor: huella() })),
      }),
    }),
  };
};

async function abrirFicha(pg, movil = false) {
  await pg.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  if (movil) {
    // En el teléfono la lista abre la ficha en lectura; «Editar» la deja editable.
    await pg.getByRole("button", { name: /Ana Torres/ }).first().click({ timeout: 30000 });
    // (23/11/2026) Regresión: en modo «ver» (solo lectura) también está «Continuar desde el celular».
    await pg.getByRole("tab", { name: "Checador y acceso" }).click({ timeout: 30000 });
    await pg.getByRole("button", { name: "Continuar desde el celular" }).waitFor({ timeout: 30000 });
    await pg.getByRole("button", { name: "Editar" }).first().click({ timeout: 30000 });
  } else {
    await pg.getByTitle("Editar").first().click({ timeout: 30000 });
  }
  await pg.getByRole("tab", { name: "Checador y acceso" }).click();
  await pg.locator("[data-reconocimiento-columnas]").waitFor({ timeout: 30000 });
  await pg.locator("[data-firma-pin-rh]").waitFor({ timeout: 15000 });
  await pg.getByRole("button", { name: "Continuar desde el celular" }).waitFor({ timeout: 30000 });
}
const columnas = (pg) => pg.locator("[data-reconocimiento-columnas] > [data-columna]").evaluateAll((els) => els.map((el) => {
  const r = el.getBoundingClientRect();
  return { col: el.dataset.columna, x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width) };
}));

const errores = [];
let exito = false;
const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  // ===== 1a) Ficha a 390 px: columnas apiladas, sin desborde, botones de 44 px =====
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City", permissions: ["camera"] });
  await ctxM.addCookies([{ name: "token", value: jwtRh(), url: base }]);
  await rutasRh(ctxM);
  const rm = await ctxM.newPage();
  rm.on("pageerror", (e) => errores.push(`ficha 390: ${e.message}`));
  await abrirFicha(rm, true);
  const cm = await columnas(rm);
  assert.deepEqual(cm.map((c) => c.col), ["documento", "firma", "reconocimiento"]);
  assert.ok(cm.every((c) => c.x === cm[0].x && c.w === cm[0].w), `apiladas a 390 px: ${JSON.stringify(cm)}`);
  assert.ok(cm[0].y < cm[1].y && cm[1].y < cm[2].y, "una debajo de otra");
  assert.ok(await rm.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde horizontal a 390 px");
  const chicos = await rm.locator("[data-reconocimiento-columnas] button").evaluateAll((bs) => bs.filter((b) => b.offsetParent && !b.closest("dl")).map((b) => [b.textContent.trim(), Math.round(b.getBoundingClientRect().height)]).filter(([t, h]) => h < 44 && t));
  assert.deepEqual(chicos, [], "botones de al menos 44 px");
  await captura(rm, "ficha-390-apilada");
  await ctxM.close();

  // ===== 1b) Ficha a 1440 px: 3 columnas alineadas arriba =====
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City", permissions: ["camera", "clipboard-read", "clipboard-write"] });
  await ctx.addInitScript(faceapiFalso); // «Probar rostro» usa el face-api del reloj (window.faceapi)
  await ctx.addCookies([{ name: "token", value: jwtRh(), url: base }]);
  await rutasRh(ctx);
  const rh = await ctx.newPage();
  rh.on("pageerror", (e) => errores.push(`ficha 1440: ${e.message}`));
  await abrirFicha(rh);
  const c3 = await columnas(rh);
  assert.ok(c3[0].x < c3[1].x && c3[1].x < c3[2].x, `3 columnas: ${JSON.stringify(c3)}`);
  // (23/11/2026) El QR del código de acceso (NIP) se genera en el navegador: ningún tercero recibe el NIP.
  const qrNip = rh.getByAltText("QR Empleado").first();
  assert.match(await qrNip.getAttribute("src"), /^data:image\/gif;base64,/, "QR del código generado localmente");
  assert.ok(await qrNip.evaluate((img) => img.complete && img.naturalWidth > 20), "la imagen del QR carga");
  assert.ok(c3.every((c) => Math.abs(c.y - c3[0].y) <= 1), "alineadas arriba");
  assert.ok(c3.every((c) => c.w >= 280), "columnas con ancho útil");
  const ancho = await rh.locator("[data-reconocimiento-columnas]").evaluate((el) => el.getBoundingClientRect().width);
  assert.ok(c3[2].x + c3[2].w - c3[0].x >= ancho - 2, "ocupan el ancho");
  await captura(rh, "ficha-1440-3-columnas");

  // ===== 2) «Continuar desde el celular»: QR grande, enlace y copiar, cuenta regresiva, generar otro =====
  await rh.getByRole("button", { name: "Continuar desde el celular" }).click();
  const dlg = rh.getByRole("dialog", { name: "Registrar el rostro desde el celular" });
  await dlg.waitFor();
  const qr = await dlg.locator("[data-qr]").boundingBox();
  assert.ok(qr.width >= 240 && Math.abs(qr.width - qr.height) < 2, `QR grande y cuadrado: ${qr.width}`);
  const campo = dlg.getByLabel("O comparte el enlace");
  const enlace1 = await campo.inputValue();
  assert.match(enlace1, /^https:\/\/dev\.adamia\.com\.mx\/rostro\/[A-Za-z0-9_-]{43}$/, "dominio de NEXT_PUBLIC_RUTA_DOMAIN");
  assert.match(await dlg.locator("[data-cuenta]").innerText(), /^1[45]:\d\d$/);
  await dlg.getByRole("button", { name: "Copiar" }).click();
  await rh.getByText("Enlace copiado.").waitFor();
  assert.equal(await rh.evaluate(() => navigator.clipboard.readText()), enlace1);
  await dlg.getByRole("button", { name: "Generar otro" }).click();
  await rh.waitForFunction((v) => document.querySelector("#enlace-rostro")?.value !== v, enlace1);
  const enlace = await campo.inputValue();
  const token = enlace.split("/").pop();
  assert.equal(enlaces.get(enlace1.split("/").pop()).estado, "expirado", "el nuevo invalida al anterior");
  await captura(rh, "ficha-dialogo-qr", false);
  // Consulta el estado cada 2.5 s mientras el diálogo está abierto (la cámara de la computadora se apaga al abrirlo).
  for (let i = 0; i < 40 && !pedidos.some((x) => x === "GET estado 2"); i++) await dormir(150);
  assert.ok(pedidos.includes("GET estado 2"), `consulta el estado mientras está abierto: ${pedidos}`);
  assert.equal(await rh.evaluate(() => document.querySelector("[data-columna=reconocimiento] video")?.srcObject ?? null), null, "apaga la cámara de la computadora");

  // ===== 3) El celular abre el enlace, acepta el aviso y guarda el rostro =====
  const ctxC = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", permissions: ["camera"] });
  await ctxC.addInitScript(() => { window.__escena = "ninguna"; });
  await ctxC.addInitScript(faceapiFalso);
  await rutasCelular(ctxC);
  const cel = await ctxC.newPage();
  cel.on("pageerror", (e) => errores.push(`celular: ${e.message}`));
  await cel.goto(`${base}/rostro/${token}`, { waitUntil: "domcontentloaded" });
  await cel.getByRole("heading", { name: "Ana Torres Ruiz" }).waitFor({ timeout: 30000 });
  await cel.getByText("Empacadora del Norte").waitFor();
  assert.equal(await cel.getByText(/ana@prueba\.mx|1234/).count(), 0, "nada más del expediente");
  const continuar = cel.getByRole("button", { name: "Continuar a la cámara" });
  assert.equal(await continuar.isDisabled(), true, "pide aceptar el aviso");
  assert.ok(await cel.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde (aviso)");
  await captura(cel, "celular-1-aviso");
  await cel.getByText("Acepto, de forma expresa").click();
  await continuar.click();
  // Guía en vivo: sin rostro → rojo y botón deshabilitado.
  const registrarBtn = cel.getByRole("button", { name: "Registrar mi rostro" });
  const guiaCel = cel.locator("[data-guia]");
  await cel.getByText("No se detecta rostro").waitFor({ timeout: 20000 });
  assert.equal(await guiaCel.getAttribute("data-guia"), "error");
  assert.equal(await registrarBtn.isDisabled(), true, "sin rostro: botón deshabilitado");
  await cel.getByText("El botón se activa cuando tu rostro esté bien colocado").waitFor();
  await captura(cel, "celular-2a-sin-rostro");
  await cel.evaluate(() => { window.__escena = "fuera"; });
  await cel.getByText("Coloca tu rostro dentro del óvalo").waitFor({ timeout: 10000 });
  assert.equal(await guiaCel.getAttribute("data-guia"), "aviso");
  assert.equal(await registrarBtn.isDisabled(), true, "fuera del óvalo: botón deshabilitado");
  await captura(cel, "celular-2b-fuera-del-ovalo");
  await cel.evaluate(() => { window.__escena = "bien"; });
  await cel.getByText("Rostro detectado ✅").waitFor({ timeout: 10000 });
  assert.equal(await guiaCel.getAttribute("data-guia"), "ok");
  assert.equal(await cel.locator("[data-ovalo]").getAttribute("data-ovalo"), "ok", "el óvalo se pinta de verde");
  await registrarBtn.waitFor({ state: "attached" });
  for (let i = 0; i < 30 && await registrarBtn.isDisabled(); i++) await dormir(100);
  assert.equal(await registrarBtn.isDisabled(), false, "rostro bien colocado: botón habilitado");
  const video = await cel.getByLabel("Vista de tu cámara frontal").boundingBox();
  assert.ok(video.width >= 340 && video.height > video.width, `cámara grande: ${video.width}×${video.height}`);
  const botones = await cel.getByRole("button").evaluateAll((bs) => bs.filter((b) => b.offsetParent).map((b) => Math.round(b.getBoundingClientRect().height)));
  assert.ok(botones.every((h) => h >= 44), `botones ≥ 44 px: ${botones}`);
  assert.ok(await cel.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde (cámara)");
  await captura(cel, "celular-2c-rostro-detectado");
  // Toma inconsistente: no se envía y lo dice.
  await cel.evaluate(() => { window.__escena = "inestable"; });
  await registrarBtn.click();
  await cel.getByText("La toma no salió bien, intenta de nuevo con más luz.").waitFor({ timeout: 20000 });
  assert.equal(guardado, null, "una toma mala no se envía");
  await captura(cel, "celular-2d-toma-mala");
  await cel.evaluate(() => { window.__escena = "bien"; });
  await cel.getByText("Rostro detectado ✅").waitFor({ timeout: 10000 });
  for (let i = 0; i < 30 && await registrarBtn.isDisabled(); i++) await dormir(100);
  await registrarBtn.click();
  await cel.getByRole("heading", { name: "✅ Rostro correcto: quedó bien registrado" }).waitFor({ timeout: 20000 });
  assert.match(await cel.locator("[data-calidad]").innerText(), /^Las 3 lecturas coinciden entre sí \((9[5-9]|100) %\): la toma salió bien\.$/);
  assert.equal(guardado.descriptor_facial.length, 128);
  assert.equal(await cel.evaluate(() => document.querySelector("video")?.srcObject ?? null), null, "apaga la cámara");
  await captura(cel, "celular-3-listo");

  // ===== 4) El escritorio detecta que se guardó, cierra y avisa sin recargar =====
  await dlg.waitFor({ state: "hidden", timeout: 10000 });
  await rh.getByText("Listo, el rostro de Ana quedó registrado desde el celular.").first().waitFor();
  assert.equal(await rh.locator("[data-rostro-estado]").innerText(), "Registrado desde el celular");
  await rh.getByText(/actualizó su rostro desde su celular/).waitFor({ timeout: 10000 });
  await captura(rh, "ficha-1440-registrado");

  // ===== 4b) Estado con fecha y origen, y «Probar rostro»: coincide / no coincide, sin guardar nada =====
  assert.match(await rh.locator("[data-rostro-detalle]").innerText(), /^Registrado desde el celular el 5 dic, \d{1,2}:\d\d [ap]\.m\.$/);
  escrituras.length = 0;
  await rh.evaluate(() => { window.__escena = "bien"; });
  await rh.getByRole("button", { name: "Probar rostro" }).click();
  const prueba = rh.getByRole("dialog", { name: "Probar el rostro de Ana" });
  await prueba.waitFor();
  await prueba.getByText("Rostro detectado ✅").waitFor({ timeout: 20000 });
  const comparar = prueba.getByRole("button", { name: "Comparar" });
  for (let i = 0; i < 30 && await comparar.isDisabled(); i++) await dormir(100);
  await comparar.click();
  await prueba.getByText(/^✅ Coincide: es Ana Torres Ruiz \(similitud (9[5-9]|100) %\)$/).waitFor({ timeout: 20000 });
  await captura(rh, "ficha-probar-coincide", false);
  await rh.evaluate(() => { window.__escena = "otra"; });
  await prueba.getByRole("button", { name: "Probar otra vez" }).click();
  await prueba.getByText(/^❌ No coincide con el rostro registrado \(similitud \d+ %\)\. Vuelve a registrarlo$/).waitFor({ timeout: 20000 });
  await captura(rh, "ficha-probar-no-coincide", false);
  await prueba.getByRole("button", { name: "Cerrar" }).click();
  await prueba.waitFor({ state: "hidden" });
  assert.deepEqual(escrituras, [], "Probar rostro no guarda nada");
  assert.equal(await rh.locator("[data-rostro-estado]").innerText(), "Registrado desde el celular", "no marca captura sin guardar");

  // ===== 5) Enlace usado y enlace vencido muestran el error =====
  await cel.goto(`${base}/rostro/${token}`, { waitUntil: "domcontentloaded" });
  await cel.getByRole("heading", { name: "Este enlace ya se usó" }).waitFor({ timeout: 20000 });
  await cel.getByText(/pide uno nuevo a Recursos Humanos/).waitFor();
  await captura(cel, "celular-4-usado");
  await cel.goto(`${base}/rostro/${enlace1.split("/").pop()}`, { waitUntil: "domcontentloaded" });
  await cel.getByRole("heading", { name: "Este enlace venció" }).waitFor({ timeout: 20000 });
  await captura(cel, "celular-5-vencido");
  // Vencido mientras RH espera: el diálogo lo dice y ofrece generar otro.
  await rh.getByRole("button", { name: "Continuar desde el celular" }).click();
  await dlg.waitFor();
  const t3 = (await campo.inputValue()).split("/").pop();
  enlaces.get(t3).estado = "expirado";
  await dlg.getByText("El enlace venció. Genera otro para continuar.").waitFor({ timeout: 8000 });
  await captura(rh, "ficha-dialogo-vencido", false);

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK rostro QR (guía en vivo: sin rostro/fuera/bien, botón deshabilitado→habilitado; toma mala; «✅ Rostro correcto»; Probar rostro coincide/no coincide sin guardar): ficha en 3 columnas (1440) y apilada (390, sin desborde, botones ≥ 44 px); QR + enlace + copiar + generar otro (invalida el anterior); celular acepta el aviso y guarda el rostro; el escritorio lo detecta y avisa; enlace usado y vencido muestran el error");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
