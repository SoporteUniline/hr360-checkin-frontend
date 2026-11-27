// Verificación en navegador de «la foto se convierte a web al elegirla» (27/11/2026) con el backend simulado, en la
// portada del muro (Moderar el muro → Portada), que es donde se vio el 413 de nginx en producción:
//  1) Una foto JPEG de celular de 4000×3000 (degradado + ruido, EXIF «girar 90°») sale en la petición como WebP de
//     < 900 KB, a lo derecho (1500×2000) y con la vista previa ya convertida.
//  2) Un 413 de nginx en HTML (sin JSON) muestra «El archivo pesa demasiado para subirlo. Prueba con uno más ligero.».
//  3) Un HEIC que Chromium no abre muestra el aviso de Ajustes › Cámara › Formatos › Más compatible y no sube nada.
// Escritorio (1440) y teléfono (390). Imprime los pesos antes/después.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      CAPTURAS=/ruta/capturas PLAYWRIGHT_MODULE_PATH=… node scripts/verify-fotos-web.mjs
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
const API_ORIGEN = "https://api.prueba.invalid";
const require = createRequire(REPO + "/package.json");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const sharp = require("sharp");
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
const ANA_RH = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Ana Torres", correo: "ana@empresa.invalid", id_empresa: 7, empresas: [7], empresas_detalle: [{ id_empresa: 7, nombre: "Empresa Demo", zona_horaria: "America/Mexico_City" }], zona_horaria: "America/Mexico_City" };
const MENSAJE_413 = "El archivo pesa demasiado para subirlo. Prueba con uno más ligero.";
const HTML_413 = "<html>\r\n<head><title>413 Request Entity Too Large</title></head>\r\n<body>\r\n<center><h1>413 Request Entity Too Large</h1></center>\r\n<hr><center>nginx</center>\r\n</body>\r\n</html>\r\n";
const LIMITE = 900_000;

// Foto «de celular»: 4000×3000, degradado con ruido (no se comprime como un color liso) y EXIF Orientation = 6.
async function fotoDeCelular() {
  const w = 4000, h = 3000;
  const crudo = Buffer.alloc(w * h * 3);
  let semilla = 7;
  const azar = () => { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla / 0x7fffffff; };
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 3;
      const ruido = (azar() - 0.5) * 50;
      crudo[i] = Math.max(0, Math.min(255, (x / w) * 200 + 30 + ruido));
      crudo[i + 1] = Math.max(0, Math.min(255, (y / h) * 180 + 40 + ruido));
      crudo[i + 2] = Math.max(0, Math.min(255, 120 + Math.sin(x / 90) * 60 + ruido));
    }
  }
  const jpeg = await sharp(crudo, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 92 }).withExif({ IFD0: { Software: "x" } }).toBuffer();
  // sharp escribe Orientation = 1 en el IFD0; se cambia a 6 («girar 90° a la derecha»), como la cámara de un teléfono.
  const patron = Buffer.from([0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01]);
  const i = jpeg.indexOf(patron);
  assert.ok(i > 0, "EXIF con orientación");
  jpeg[i + 8] = 6;
  assert.equal((await sharp(jpeg).metadata()).orientation, 6);
  return jpeg;
}
const FTYP_HEIC = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.from([0, 0, 0, 0]), Buffer.from("mif1heic"), Buffer.alloc(2048, 7)]);

let pedidos = [];
let responder413 = false;
async function instalarMocks(ctx) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    // Mismo origen en producción (dev.adamia.com.mx/api): el 413 de nginx se puede leer. Aquí el API es otro origen, así
    // que la respuesta simulada lleva CORS para que el navegador la entregue como en producción.
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base) return json({});
    if (url.origin !== API_ORIGEN) return route.abort();
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    if (p === "/users/verify/token") return json({ user: ANA_RH });
    if (!p.startsWith("/checador/comunicados")) return json({});
    const ruta = p.slice("/checador/comunicados".length) || "/";
    if (ruta === "/portada" && req.method() === "PUT") {
      const cuerpo = req.postDataBuffer() ?? Buffer.alloc(0);
      pedidos.push({ ruta, cuerpo, tipo: req.headers()["content-type"] ?? "" });
      if (responder413) return route.fulfill({ status: 413, contentType: "text/html", headers: cors, body: HTML_413 });
      return json({ ok: true, portada: { url: null, titulo: "Portada nueva", enlace: null } });
    }
    if (ruta === "/portada") return json({ ok: true, portada: null });
    if (ruta === "/config") return json({ ok: true, publican_jefes: true, publican_empleados: true, permitir_reacciones: true, permitir_comentarios: true, palabras_bloqueadas: [], umbral_reportes: 3, config: {} });
    if (ruta === "/moderacion") return json({ ok: true, conteos: { reportados: 0, retenidos: 0, ocultos: 0 }, items: [] });
    return json({ ok: true, items: [] });
  });
}

/** La parte «imagen» del multipart → { nombre, tipo, bytes } */
function parteImagen(cuerpo, tipoCabecera) {
  const limite = /boundary=(.+)$/.exec(tipoCabecera)?.[1];
  assert.ok(limite, "multipart con boundary");
  const texto = cuerpo.toString("latin1");
  const inicio = texto.indexOf('name="imagen"');
  assert.ok(inicio > 0, "lleva la imagen");
  const cab = texto.slice(inicio, texto.indexOf("\r\n\r\n", inicio));
  const desde = texto.indexOf("\r\n\r\n", inicio) + 4;
  const hasta = texto.indexOf(`\r\n--${limite}`, desde);
  return { nombre: /filename="([^"]+)"/.exec(cab)?.[1], tipo: /Content-Type: (\S+)/.exec(cab)?.[1], bytes: cuerpo.subarray(desde, hasta) };
}

async function recorrido(browser, { ancho, alto, sufijo, jpeg }) {
  pedidos = [];
  responder413 = false;
  const movil = ancho < 1024;
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-MX", timezoneId: "America/Mexico_City", deviceScaleFactor: movil ? 2 : 1, hasTouch: movil, isMobile: movil });
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await instalarMocks(ctx);
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(base + "/panel/comunicados/moderacion", { waitUntil: "domcontentloaded" });
  const editor = page.locator("[data-portada-editor]");
  await editor.waitFor({ timeout: 60000 });

  // 1) JPEG de 4000×3000 → WebP < 900 KB a lo derecho, con vista previa convertida
  const t0 = Date.now();
  await page.locator("[data-entrada-portada]").setInputFiles({ name: "IMG_2041.jpg", mimeType: "image/jpeg", buffer: jpeg });
  await editor.locator("img[src^='blob:']").waitFor({ timeout: 30000 });
  const msConversion = Date.now() - t0;
  assert.equal(await editor.locator("[data-preparando-foto]").count(), 0, "terminó de preparar");
  const vista = await editor.locator("img[src^='blob:']").evaluate(async (img) => {
    const r = await fetch(img.src); const b = await r.blob();
    return { tipo: b.type, tamano: b.size, ancho: img.naturalWidth, alto: img.naturalHeight };
  });
  assert.equal(vista.tipo, "image/webp", "la vista previa es la foto ya convertida");
  assert.deepEqual([vista.ancho, vista.alto], [1500, 2000], "a lo derecho y con el lado mayor de 2000 px");
  await page.getByLabel("Título (opcional)").fill("Posada 2026");
  if (OUT) await page.screenshot({ path: `${OUT}/fotos-web-portada-${sufijo}.png`, fullPage: true });
  await page.getByRole("button", { name: "Guardar portada" }).click();
  await page.getByText("Portada guardada: ya se ve arriba del muro.").waitFor({ timeout: 15000 });
  const pedido = pedidos.at(-1);
  const img = parteImagen(pedido.cuerpo, pedido.tipo);
  assert.equal(img.tipo, "image/webp", "la petición sale en image/webp");
  assert.equal(img.nombre, "IMG_2041.webp");
  assert.ok(pedido.cuerpo.length < LIMITE, `la petición completa pesa ${pedido.cuerpo.length} bytes (< ${LIMITE})`);
  const meta = await sharp(img.bytes).metadata();
  assert.deepEqual([meta.format, meta.width, meta.height], ["webp", 1500, 2000]);
  assert.ok(!meta.exif, "sin metadatos (GPS, teléfono)");
  const pesos = { antes: jpeg.length, imagen: img.bytes.length, peticion: pedido.cuerpo.length, msConversion };

  // 2) 413 de nginx en HTML → mensaje claro (antes: «No se pudo guardar la portada.»)
  responder413 = true;
  await page.locator("[data-entrada-portada]").setInputFiles({ name: "IMG_2042.jpg", mimeType: "image/jpeg", buffer: jpeg });
  await editor.locator("img[src^='blob:']").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Guardar portada" }).click();
  await editor.getByText(MENSAJE_413).waitFor({ timeout: 15000 });
  assert.equal(await editor.getByText("No se pudo guardar la portada.").count(), 0);
  if (OUT) await page.screenshot({ path: `${OUT}/fotos-web-413-${sufijo}.png`, fullPage: true });

  // 3) HEIC que Chromium no abre → aviso, sin subir
  const antes = pedidos.length;
  await page.locator("[data-entrada-portada]").setInputFiles({ name: "IMG_3001.HEIC", mimeType: "image/heic", buffer: FTYP_HEIC });
  await editor.getByText(/Esta foto está en formato HEIC; en el iPhone ve a Ajustes › Cámara › Formatos › Más compatible, o elige otra\./).waitFor({ timeout: 15000 });
  assert.equal(pedidos.length, antes, "no sube nada");
  if (OUT) await page.screenshot({ path: `${OUT}/fotos-web-heic-${sufijo}.png`, fullPage: true });

  const anchoDoc = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(anchoDoc <= ancho + 1, `sin scroll horizontal (${anchoDoc} > ${ancho})`);
  await ctx.close();
  assert.deepEqual(errores.filter((e) => !/ResizeObserver/i.test(e)), [], `errores de la página: ${errores.join(" | ")}`);
  return pesos;
}

try {
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(base + "/login")).status < 500) break; } catch { /* aún no */ }
    await dormir(500);
  }
  const jpeg = await fotoDeCelular();
  const browser = await chromium.launch();
  for (const [ancho, alto, sufijo] of [[1440, 900, "1440"], [390, 844, "390"]]) {
    const p = await recorrido(browser, { ancho, alto, sufijo, jpeg });
    console.log(`✔ portada ${sufijo}: JPEG 4000×3000 de ${(p.antes / 1024).toFixed(0)} KB → WebP 1500×2000 de ${(p.imagen / 1024).toFixed(0)} KB (petición ${(p.peticion / 1024).toFixed(0)} KB, ${p.msConversion} ms); 413 y HEIC con su mensaje`);
  }
  await browser.close();
  console.log("verify-fotos-web: todo bien");
} finally {
  next.kill("SIGTERM");
}
