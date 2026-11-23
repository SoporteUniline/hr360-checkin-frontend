// Verificación en navegador (23/11/2026): firma a pantalla completa en el celular (horizontal, área segura, botón de firmar
// ahí mismo), documento servido por nuestro servidor y «Quién firmó» (foto) para RH en la ficha. Backend simulado y
// cámara simulada de Chromium.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-firma-pantalla.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const { jsPDF } = require("jspdf");

const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png` }) : null);
function token() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const doc = new jsPDF();
doc.text("Consentimiento de prueba", 20, 20);
const PDF = Buffer.from(doc.output("arraybuffer"));
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const cors = (origen) => ({ "Access-Control-Allow-Origin": origen, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" });

const errores = [];
const pedidos = [];
let exito = false;
const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  // ===== 1) El empleado firma desde su celular =====
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: "es-MX", permissions: ["camera"] });
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));
  await pg.route("https://api.prueba.invalid/**", async (route) => {
    const req = route.request(); const p = new URL(req.url()).pathname.replace("/api", "");
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors(base) });
    pedidos.push(`${req.method()} ${p}`);
    if (p === "/checador/firma-digital/publica/tok123") return route.fulfill({ status: 200, contentType: "application/json", headers: cors(base), body: JSON.stringify({ solicitud: { nombre_documento: "Consentimiento de uso del rostro", nombre_firmante: "Ana Torres", documento_url: "https://s3.prueba.invalid/doc.pdf", expires_at: "2099-01-01 00:00:00" }, firma_con_pin: { disponible: false } }) });
    if (p === "/checador/firma-digital/publica/tok123/documento") return route.fulfill({ status: 200, contentType: "application/pdf", headers: cors(base), body: PDF });
    if (p === "/checador/firma-digital/publica/tok123/firmar") {
      const cuerpo = req.postDataBuffer()?.toString("latin1") ?? "";
      assert.match(cuerpo, /name="firma"; filename="firma.png"/);
      assert.match(cuerpo, /name="evidencia"; filename="evidencia.jpg"/);
      return route.fulfill({ status: 200, contentType: "application/json", headers: cors(base), body: JSON.stringify({ success: true }) });
    }
    return route.fulfill({ status: 404, contentType: "application/json", headers: cors(base), body: "{}" });
  });
  await pg.route("https://s3.prueba.invalid/**", (route) => { pedidos.push("S3 directo"); return route.abort(); });
  await pg.goto(base + "/firmar/tok123", { waitUntil: "domcontentloaded" });
  await pg.getByRole("button", { name: /Activar cámara/ }).click({ timeout: 30000 });
  await pg.getByRole("button", { name: /Ver documento/ }).click({ timeout: 15000 });
  await pg.getByRole("button", { name: /Continuar a la firma/ }).click({ timeout: 30000 });
  assert.ok(pedidos.includes("GET /checador/firma-digital/publica/tok123/documento"), "el PDF se pide a nuestro servidor");
  assert.ok(!pedidos.includes("S3 directo"), "no se lee el enlace directo del almacenamiento");

  // Vertical: «Firmar» abre la pantalla completa y pide girar.
  await pg.getByRole("button", { name: "Firmar", exact: true }).click();
  const dlg = pg.getByRole("dialog", { name: "Firma a pantalla completa" });
  await dlg.waitFor();
  await dlg.getByText(/Gira tu celular/).waitFor();
  const caja = await dlg.boundingBox();
  assert.deepEqual([Math.round(caja.width), Math.round(caja.height)], [390, 844], "ocupa toda la pantalla");
  await captura(pg, "firma-vertical");

  assert.equal(await pg.evaluate(() => Boolean(document.fullscreenElement)), true, "pide pantalla completa del navegador");
  await pg.evaluate(() => document.exitFullscreen()); // la prueba necesita salir para simular el giro
  // Girado (horizontal): lienzo amplio y el botón de firmar a la vista.
  await pg.setViewportSize({ width: 844, height: 390 });
  await dormir(400);
  assert.equal(await dlg.getByText(/Gira tu celular/).count(), 0);
  const lienzo = await dlg.locator("canvas").boundingBox();
  assert.ok(lienzo.width > 780 && lienzo.height > 180, `lienzo amplio: ${lienzo.width}×${lienzo.height}`);
  const boton = dlg.getByRole("button", { name: "Firmar documento" });
  const bb = await boton.boundingBox();
  assert.ok(bb.y + bb.height <= 390 && bb.height >= 48, "botón de firmar visible y grande");
  assert.equal(await boton.isDisabled(), true, "sin firma no se puede");
  // Dibuja la firma.
  await pg.mouse.move(lienzo.x + 120, lienzo.y + lienzo.height / 2);
  await pg.mouse.down();
  for (let i = 0; i <= 20; i++) await pg.mouse.move(lienzo.x + 120 + i * 25, lienzo.y + lienzo.height / 2 + Math.sin(i / 2) * 40);
  await pg.mouse.up();
  await dlg.getByRole("checkbox").check();
  await captura(pg, "firma-horizontal");
  assert.equal(await boton.isDisabled(), false);
  await boton.click();
  await pg.getByText(/firmad/i).first().waitFor({ timeout: 15000 });
  assert.equal(await dlg.count(), 0, "se cierra al firmar");
  assert.ok(pedidos.includes("POST /checador/firma-digital/publica/tok123/firmar"));
  await captura(pg, "firma-lista");

  // ===== 2) RH ve «Quién firmó» en la ficha (Checador y acceso) =====
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx2.addCookies([{ name: "token", value: token(), url: base }]);
  const rh = await ctx2.newPage();
  rh.on("pageerror", (e) => errores.push(e.message));
  const empresa = { id_empresa: 10, nombre: "Empresa prueba", nombre_empresa: "Empresa prueba", estado: "Activo" };
  const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
  const emp = { id_empleado: 15, id_empresa: 10, nombre: "Ana", apellido_paterno: "Torres", apellido_materno: "Ruiz", correo: "ana@prueba.mx", estado: "Activo", nip: "1234", horarios: [] };
  let consultas = 0;
  await rh.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors(base) });
    const json = (d, s = 200) => route.fulfill({ status: s, contentType: "application/json", headers: cors(base), body: JSON.stringify(d) });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p === "/checador/empleados/15") return json(emp);
    if (p === "/checador/empleados") return json({ data: [emp], total: 1, page: 1, totalPages: 1 });
    if (p === "/checador/firma-digital/solicitudes/documento") return json({ success: true, solicitud: { id: 77, estatus: "firmado", signed_at: "2026-11-23 15:04:00", nombre_firmante: "Ana Torres Ruiz", tiene_documento_firmado: true } });
    if (p === "/checador/firma-digital/solicitudes/77/evidencia") {
      consultas += 1;
      assert.equal(url.searchParams.get("id_empresa"), "10");
      return json({ success: true, evidencia: { nombre_firmante: "Ana Torres Ruiz", nombre_documento: "Consentimiento de uso del rostro - Ana Torres Ruiz de la Concepción Hernández (expediente completo)", firmado_en: "2026-11-23 15:04:00", metodo: "dibujada", foto: `data:image/png;base64,${PNG}`, dispositivo: "iPhone · Safari", ip: "::ffff:172.19.0.3", consultas: [{ nombre: "RH Prueba", fecha: null, actual: true }, { nombre: "Diego Dueño", fecha: "2026-11-23 16:00:00" }] } });
    }
    return json({});
  });
  await rh.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  await rh.getByTitle("Editar").first().click({ timeout: 30000 });
  await rh.getByRole("tab", { name: "Checador y acceso" }).click();
  await rh.getByRole("button", { name: "Quién firmó" }).click({ timeout: 30000 });
  const d2 = rh.getByRole("dialog", { name: "Quién firmó" });
  await d2.getByRole("img", { name: /Foto de Ana Torres Ruiz al firmar/ }).waitFor();
  await d2.getByText("iPhone · Safari · IP ::ffff:172.19.0.3").waitFor();
  await d2.getByText("Dibujada, con foto").waitFor();
  await d2.getByText(/Diego Dueño/).waitFor();
  assert.equal(consultas, 1);
  // (23/11/2026) Nada se sale de la ventana aunque el nombre del documento sea largo (antes se desbordaba).
  const fuera = await d2.evaluate((dlg) => {
    const caja = dlg.getBoundingClientRect();
    return [...dlg.querySelectorAll("*")].filter((el) => el.getBoundingClientRect().right > caja.right + 1).map((el) => el.textContent.slice(0, 40));
  });
  assert.deepEqual(fuera, [], "elementos fuera de la ventana «Quién firmó»");
  await d2.getByText(/expediente completo/).waitFor();
  await captura(rh, "quien-firmo");

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK: firma a pantalla completa (vertical pide girar, horizontal amplio, botón a la vista), PDF por nuestro servidor, «Quién firmó» con foto para RH");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
