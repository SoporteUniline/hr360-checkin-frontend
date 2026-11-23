// Verificación en navegador (celular 390 px) de «Mi firma y PIN», firmar un documento con el PIN y «Mi rostro» (22/11/2026),
// con el backend simulado en memoria. La cámara es la falsa de Chromium y face-api se sustituye por uno simulado que
// devuelve siempre la misma cara (no se prueba la detección real, que ya cubre el reloj).
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-firma-pin.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (tipo) => { const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ tipo_usuario: tipo, exp: Math.floor(Date.now() / 1000) + 3600 })}`; return `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`; };
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true }) : null);

// PDF mínimo de una página para el lector del documento.
function pdfMinimo() {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R >>"];
  const contenido = "BT /F1 12 Tf 20 100 Td (Contrato) Tj ET";
  objs.push(`<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
  let out = "%PDF-1.4\n";
  const offs = objs.map((o, i) => { const at = out.length; out += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const estado = { firma: null, pin: null, intentos: 0, firmado: null, rostro: null, llamadas: [] };
const estadoFirma = () => ({ ok: true, tiene_firma: Boolean(estado.firma), tiene_pin: Boolean(estado.pin), firma_actualizada_en: estado.firma ? "2026-11-22 18:00:00" : null, pin_actualizado_en: estado.pin ? "2026-11-22 18:01:00" : null, bloqueado_hasta: null });

async function rutas(ctx) {
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname === "docs.prueba.invalid") return route.fulfill({ status: 200, contentType: "application/pdf", headers: { "Access-Control-Allow-Origin": "*" }, body: pdfMinimo() });
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    const ok = (json, status = 200) => route.fulfill({ status, json, headers: cors });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace("/api", "");
    estado.llamadas.push(`${req.method()} ${p}`);
    if (p.endsWith("/users/verify/token")) return ok({ user: { id_usuario: 15, id_empleado: 15, tipo_usuario: "Empleado", nombre: "Ana Torres", empresas: [7] } });
    if (p === "/checador/mi-espacio/firma" && req.method() === "GET") return ok(estadoFirma());
    if (p === "/checador/mi-espacio/firma" && req.method() === "PUT") {
      const cuerpo = req.postDataBuffer()?.toString("latin1") ?? "";
      if (!/name="firma"; filename="firma.png"\r\nContent-Type: image\/png/.test(cuerpo)) console.error("cuerpo:", cuerpo.slice(0, 300));
      assert.match(cuerpo, /name="firma"; filename="firma.png"\r\nContent-Type: image\/png/, "manda la firma como PNG");
      assert.match(req.headers()["content-type"], /multipart\/form-data/);
      estado.firma = true;
      return ok({ ok: true });
    }
    if (p === "/checador/mi-espacio/firma/imagen") return route.fulfill({ status: 200, contentType: "image/png", headers: cors, body: PNG });
    if (p === "/checador/mi-espacio/pin") {
      const b = req.postDataJSON();
      if (estado.pin) {
        if (b.contrasena) { if (b.contrasena !== "MiClave#1") return ok({ ok: false, error: "La contraseña no es correcta." }, 401); }
        else if (b.actual !== estado.pin) return ok({ ok: false, error: "PIN incorrecto. Te quedan 4 intentos." }, 401);
      }
      estado.pin = b.nuevo;
      return ok({ ok: true });
    }
    if (p === "/checador/mi-espacio/rostro" && req.method() === "GET") return ok({ ok: true, tiene_rostro: Boolean(estado.rostro), actualizado_en: estado.rostro ? "2026-11-22 18:05:00" : null, origen: estado.rostro ? "empleado" : null });
    if (p === "/checador/mi-espacio/rostro" && req.method() === "PUT") { estado.rostro = req.postDataJSON(); return ok({ ok: true }); }
    if (p === "/checador/firma-digital/publica/tok-1") return ok({ success: true, solicitud: { id: 1, nombre_documento: "Contrato Ana", nombre_firmante: "Ana Torres", documento_url: "https://docs.prueba.invalid/contrato.pdf" }, firma_con_pin: { disponible: Boolean(estado.firma && estado.pin), tiene_firma: Boolean(estado.firma), tiene_pin: Boolean(estado.pin), bloqueado_hasta: null } });
    if (p === "/checador/firma-digital/publica/tok-1/firmar") {
      const cuerpo = req.postDataBuffer().toString("latin1");
      const campo = (n) => new RegExp(`name="${n}"\\r\\n\\r\\n([^\\r]*)`).exec(cuerpo)?.[1];
      assert.equal(campo("metodo"), "pin");
      assert.equal(campo("consentimiento"), "true");
      assert.ok(!cuerpo.includes('name="evidencia"'), "con PIN no manda foto");
      if (campo("pin") !== estado.pin) { estado.intentos += 1; return ok({ error: `PIN incorrecto. Te quedan ${5 - estado.intentos} intentos.`, codigo: "PIN_INCORRECTO" }, 401); }
      estado.firmado = "pin";
      return ok({ success: true });
    }
    return ok({});
  });
}

// face-api simulado: siempre una cara centrada y de frente (caja y puntos en píxeles del video, para la guía en vivo
// del 23/11/2026) con la misma huella (ligeramente distinta en cada lectura).
const faceapiFalso = () => {
  let n = 0;
  const huella = () => Float32Array.from({ length: 128 }, (_, i) => Math.sin(i + 1) * 0.1 + Math.cos(i * ++n) * 0.0005);
  const caras = (input) => {
    const vw = input?.videoWidth || 640, vh = input?.videoHeight || 480;
    const w = Math.round(Math.min(vw, vh) * 0.4), h = Math.round(w * 1.1), x = (vw - w) / 2, y = (vh - h) / 2;
    const positions = Array.from({ length: 68 }, () => ({ x: x + w / 2, y: y + h * 0.6 }));
    for (let i = 36; i < 42; i++) positions[i] = { x: x + w * 0.3, y: y + h * 0.4 };
    for (let i = 42; i < 48; i++) positions[i] = { x: x + w * 0.7, y: y + h * 0.4 };
    return [{ detection: { box: { x, y, width: w, height: h }, score: 0.9 }, landmarks: { positions } }];
  };
  window.faceapi = {
    nets: { tinyFaceDetector: { params: {} }, faceLandmark68Net: { params: {}, detectLandmarks: async () => null }, faceRecognitionNet: { params: {}, computeFaceDescriptor: async () => null } },
    TinyFaceDetectorOptions: class {},
    detectSingleFace: async () => null,
    detectAllFaces: (input) => ({
      withFaceLandmarks: () => ({
        then: (ok, mal) => Promise.resolve(caras(input)).then(ok, mal),
        withFaceDescriptors: async () => caras(input).map((c) => ({ ...c, descriptor: huella() })),
      }),
    }),
  };
};

let exito = false;
const errores = [];
const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", hasTouch: true, permissions: ["camera"] });
  await ctx.addCookies([{ name: "token", value: jwt("Empleado"), url: base }]);
  await ctx.addInitScript(faceapiFalso);
  await rutas(ctx);
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));
  const sinDesborde = async (donde) => assert.ok(await pg.evaluate(() => document.documentElement.scrollWidth <= 390), `sin desborde en ${donde}`);

  // (23/11/2026) Celular ya en horizontal: pantalla completa SIN rotar.
  const ctxH = await browser.newContext({ viewport: { width: 844, height: 390 }, locale: "es-MX", hasTouch: true });
  await ctxH.addCookies([{ name: "token", value: jwt("Empleado"), url: base }]);
  await rutas(ctxH);
  const ph = await ctxH.newPage();
  await ph.goto(base + "/empleado/panel/mi-firma", { waitUntil: "domcontentloaded" });
  await ph.getByRole("button", { name: "Registrar firma" }).click({ timeout: 20000 });
  assert.equal(await ph.locator("[data-firma-pantalla] [data-rotado]").getAttribute("data-rotado"), "no", "en horizontal no se rota");
  const cajaH = await ph.locator("[data-firma-pantalla]").evaluate((el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height, innerWidth, innerHeight]; });
  assert.deepEqual(cajaH.slice(0, 4).map(Math.round), [0, 0, cajaH[4], cajaH[5]], "cubre toda la pantalla en horizontal");
  await ph.screenshot({ path: `${process.env.CAPTURAS || "/tmp"}/firma-horizontal-pantalla.png` });
  await captura(ph, "firma-horizontal-celular");
  await ctxH.close();
  // (23/11/2026) Computadora: el lienzo se queda en la página (sin pantalla completa).
  const ctxPc = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-MX" });
  await ctxPc.addCookies([{ name: "token", value: jwt("Empleado"), url: base }]);
  await rutas(ctxPc);
  const pc = await ctxPc.newPage();
  await pc.goto(base + "/empleado/panel/mi-firma", { waitUntil: "domcontentloaded" });
  await pc.getByLabel("Dibuja tu firma con el dedo o el mouse").waitFor({ timeout: 20000 });
  assert.equal(await pc.getByRole("button", { name: "Registrar firma" }).count(), 0, "en computadora no hay botón de pantalla completa");
  await ctxPc.close();
  // 1) Mi espacio → Mi firma y PIN: dibujar y guardar la firma.
  await pg.goto(base + "/empleado/panel/mi-espacio", { waitUntil: "domcontentloaded" });
  await pg.getByRole("link", { name: /Mi firma y PIN/ }).click();
  await pg.getByRole("heading", { name: "Mi firma y PIN" }).waitFor({ timeout: 20000 });
  // (23/11/2026) En celular: botón «Registrar firma» → pantalla completa (horizontal) con «Borrar» y «Guardar firma».
  assert.equal(await pg.getByLabel("Dibuja tu firma con el dedo o el mouse").count(), 0, "en celular el lienzo no está en la página");
  await pg.getByRole("button", { name: "Registrar firma" }).click();
  const pantalla = pg.getByRole("dialog", { name: "Mi firma a pantalla completa" });
  await pantalla.waitFor();
  const caja = await pantalla.boundingBox();
  assert.ok(caja.width >= 389 && caja.height >= 843, "ocupa toda la pantalla");
  const guardar = pantalla.getByRole("button", { name: "Guardar firma" });
  assert.equal(await guardar.isDisabled(), true, "sin trazo no se guarda");
  // iPhone en vertical: la firma se muestra rotada 90° (al girar el celular queda horizontal).
  assert.equal(await pantalla.locator("[data-rotado]").getAttribute("data-rotado"), "si", "en vertical se rota");
  const lienzo = await pantalla.getByLabel("Dibuja tu firma con el dedo o el mouse").boundingBox();
  assert.ok(lienzo.height > 500, "lienzo grande (a lo largo de la pantalla)");
  // Trazo vertical en la pantalla = horizontal en el lienzo rotado. Se comprueba el píxel donde pasó el dedo.
  const x0 = lienzo.x + lienzo.width * 0.5;
  await pg.mouse.move(x0, lienzo.y + 120);
  await pg.mouse.down();
  for (let k = 1; k <= 20; k++) await pg.mouse.move(x0 + Math.sin(k) * 4, lienzo.y + 120 + k * 20);
  await pg.mouse.up();
  const tinta = await pantalla.getByLabel("Dibuja tu firma con el dedo o el mouse").evaluate((c, { x, y }) => {
    const r = c.getBoundingClientRect();
    // Mismo cálculo que el lienzo rotado: x a lo largo (hacia abajo en pantalla), y hacia la izquierda.
    const lx = ((y - r.top) / r.height) * c.width;
    const ly = ((r.right - x) / r.width) * c.height;
    const d = c.getContext("2d").getImageData(Math.round(lx) - 3, Math.round(ly) - 3, 7, 7).data;
    let oscuro = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 120 && d[i + 1] < 120) oscuro += 1;
    return oscuro;
  }, { x: x0, y: lienzo.y + 320 });
  assert.ok(tinta > 0, "el trazo quedó donde pasó el dedo (lienzo rotado)");
  await captura(pg, "firma-pantalla-completa");
  await guardar.click();
  await pantalla.waitFor({ state: "hidden" });
  await pg.getByText("Listo, tu firma quedó guardada.").waitFor();
  await pg.getByRole("img", { name: "Tu firma guardada" }).waitFor();

  // 2) Crear el PIN: avisa de series y de PIN distintos; luego lo crea.
  const nuevo = pg.getByLabel("Nuevo PIN (6 dígitos)");
  await nuevo.fill("123456");
  await pg.getByText("Elige un PIN que no sea una serie").waitFor();
  await nuevo.fill("48a2913");
  assert.equal(await nuevo.inputValue(), "482913", "solo dígitos, máximo 6");
  await pg.getByLabel("Escríbelo otra vez").fill("482910");
  await pg.getByText("Los dos PIN no coinciden.").waitFor();
  assert.equal(await pg.getByRole("button", { name: "Crear PIN" }).isDisabled(), true);
  await pg.getByLabel("Escríbelo otra vez").fill("482913");
  await pg.getByRole("button", { name: "Crear PIN" }).click();
  await pg.getByText("Listo, tu PIN quedó creado.").waitFor();
  assert.equal(estado.pin, "482913");
  await pg.getByText("elige «Firmar con mi PIN»").waitFor();
  await sinDesborde("Mi firma y PIN");
  await captura(pg, "mi-firma-pin");

  // 3) Cambiarlo porque lo olvidó: con la contraseña de su cuenta.
  await pg.getByRole("button", { name: "Cambiar mi PIN" }).click();
  await pg.getByRole("button", { name: "Olvidé mi PIN" }).click();
  await pg.getByLabel("Contraseña de tu cuenta").fill("otra");
  await pg.getByLabel("Nuevo PIN (6 dígitos)").fill("731905");
  await pg.getByLabel("Escríbelo otra vez").fill("731905");
  await pg.getByRole("button", { name: "Cambiar PIN" }).click();
  await pg.getByText("La contraseña no es correcta.").waitFor();
  await pg.getByLabel("Contraseña de tu cuenta").fill("MiClave#1");
  await pg.getByRole("button", { name: "Cambiar PIN" }).click();
  await pg.getByText("Listo, cambiaste tu PIN.").waitFor();
  assert.equal(estado.pin, "731905");

  // 4) Firmar un documento con el PIN (sin cámara): PIN equivocado avisa; el correcto firma.
  await pg.goto(base + "/firmar/tok-1", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { name: "¿Cómo quieres firmar?" }).waitFor({ timeout: 20000 });
  await sinDesborde("elegir método");
  await captura(pg, "firmar-metodo");
  await pg.getByRole("button", { name: /Firmar con mi PIN/ }).click();
  await pg.getByRole("heading", { name: "Revisa tu documento" }).waitFor();
  const continuar = pg.getByRole("button", { name: "Continuar a la firma" });
  await pg.waitForFunction(() => ![...document.querySelectorAll("button")].find((b) => b.textContent.includes("Continuar a la firma"))?.disabled, null, { timeout: 30000 });
  await continuar.click();
  await pg.getByRole("heading", { name: "Tu PIN, el último paso" }).waitFor();
  const firmar = pg.getByRole("button", { name: "Firmar documento" });
  await pg.getByLabel("Tu PIN secreto").fill("111222");
  assert.equal(await firmar.isDisabled(), true, "sin confirmar no firma");
  await pg.getByText("lo firmo con mi firma guardada y mi PIN").click();
  await firmar.click();
  await pg.getByText("PIN incorrecto. Te quedan 4 intentos.").waitFor();
  assert.equal(await pg.getByLabel("Tu PIN secreto").inputValue(), "", "borra el PIN equivocado");
  await pg.getByLabel("Tu PIN secreto").fill("731905");
  await sinDesborde("PIN");
  await captura(pg, "firmar-pin");
  await firmar.click();
  await pg.getByText("Tu firma guardada se estampó con tu PIN.").waitFor();
  assert.equal(estado.firmado, "pin");
  assert.ok(!estado.llamadas.some((l) => l.includes("evidencia")));

  // 5) Mi rostro: sin aceptar el aviso no abre la cámara; aceptado, lee 3 veces y guarda la huella con la versión.
  await pg.goto(base + "/empleado/panel/mi-rostro", { waitUntil: "domcontentloaded" });
  await pg.getByText("Aún no registras tu rostro").waitFor({ timeout: 20000 });
  const abrir = pg.getByRole("button", { name: "Registrar mi rostro" });
  assert.equal(await abrir.isDisabled(), true, "pide aceptar el aviso");
  await pg.getByText("Acepto, de forma expresa").click();
  await abrir.click();
  // (23/11/2026) Guía en vivo: con la cara bien colocada dice «Rostro detectado ✅» y habilita el botón.
  await pg.getByText("Rostro detectado ✅").waitFor({ timeout: 20000 });
  for (let i = 0; i < 30 && await pg.getByRole("button", { name: "Registrar mi rostro" }).isDisabled(); i++) await dormir(100);
  await sinDesborde("Mi rostro");
  await captura(pg, "mi-rostro-camara");
  await pg.getByRole("button", { name: "Registrar mi rostro" }).click();
  await pg.getByText("Listo, tu rostro quedó registrado.").waitFor({ timeout: 20000 });
  assert.equal(estado.rostro.acepto_consentimiento, true);
  assert.equal(estado.rostro.version, "2026-11-21");
  assert.equal(estado.rostro.descriptor_facial.length, 128);
  await pg.getByText("Tu rostro está registrado").waitFor();
  assert.equal(await pg.evaluate(() => document.querySelector("video")?.srcObject ?? null), null, "apaga la cámara");
  await captura(pg, "mi-rostro-listo");

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK firma y PIN: guardar firma (celular: pantalla completa; computadora: en la página), crear PIN (reglas), cambiarlo con contraseña, firmar con PIN sin foto (PIN equivocado avisa), registrar rostro con aviso aceptado");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
