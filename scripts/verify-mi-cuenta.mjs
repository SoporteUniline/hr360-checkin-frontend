// Verificación en navegador: Mi cuenta del panel rediseñada. Comprueba las 3 pestañas; guardar la información
// básica (PUT /users/:id con { nombre, correo }); foto con vista previa (PUT /users/:id/upload-image); contraseña con
// mostrar/ocultar, recomendaciones en vivo, la validación de siempre y PUT /users/update-password/:id; la empresa
// (PUT /empresas/:id, validación de teléfono); «Guardar» solo con cambios; la guardia de salida que guarda todo lo
// pendiente con «Guardar y salir»; y 1440 y 390 px sin desborde, con objetivos táctiles de 44 px. Backend simulado.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx npm run build
//      && CAPTURAS=/ruta node scripts/verify-mi-cuenta.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
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
const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
// PNG de 1×1 para la foto.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkqPpfDwAE/gH+6bJ6NwAAAABJRU5ErkJggg==", "base64");

// ---- Backend simulado ----
const detalle = [{ id_empresa: 10, nombre: "Empacadora del Norte", estado: "Activo" }, { id_empresa: 11, nombre: "Distribuidora del Sur", estado: "Activo" }];
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Méndez", correo: "laura@empacadora.mx", empresas: [10, 11], empresas_detalle: detalle, zona_horaria: "America/Mexico_City" };
let perfil = { id_usuario: -1, nombre: "Laura Méndez", correo: "laura@empacadora.mx", tipo_usuario: "Recruiter", url_imagen: null };
const empresas = {
  10: { id_empresa: 10, nombre_empresa: "Empacadora del Norte", correo_empresa: "contacto@empacadora.mx", nombre_duenio: "Jorge Salinas", celular: "8112345678",
    giro: "Manufactura", direccion: "Av. Industrial 120, Apodaca, N.L.", zona_horaria: "America/Monterrey", cron_asistencias_activo: 1,
    facebook: "", instagram: "", pagina_web: "https://empacadora.mx", url_imagen: null, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" },
  11: { id_empresa: 11, nombre_empresa: "Distribuidora del Sur", correo_empresa: "hola@sur.mx", nombre_duenio: "Ana Ruiz", celular: "5512345678",
    giro: "Comercio", direccion: "Calle 5 #20, CDMX", zona_horaria: "America/Mexico_City", cron_asistencias_activo: 0, url_imagen: null },
};
const llamadas = []; // { metodo, ruta, cuerpo, tipo }

async function rutas(ctx) {
  await ctx.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (d, s = 200) => route.fulfill({ status: s, contentType: "application/json", headers: cors, body: JSON.stringify(d) });
    const p = url.pathname.replace("/api", "");
    const m = req.method();
    if (m !== "GET") llamadas.push({ metodo: m, ruta: p, cuerpo: req.postData() ?? "", tipo: req.headers()["content-type"] ?? "" });
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p === "/users/-1" && m === "PUT") { perfil = { ...perfil, ...JSON.parse(req.postData()) }; return json(perfil); }
    if (p === "/users/-1") return json(perfil);
    if (p === "/users/-1/upload-image" && m === "PUT") { perfil = { ...perfil, url_imagen: null }; return json({ ok: true }); }
    if (p === "/users/update-password/-1" && m === "PUT") return json({ ok: true });
    if (p === "/empresas/giros") return json({ giros: ["Manufactura", "Comercio"] });
    const e = /^\/empresas\/(\d+)$/.exec(p);
    if (e && m === "PUT") { const { giro, ...resto } = JSON.parse(req.postData()); empresas[e[1]] = { ...empresas[e[1]], ...resto, giro }; return json(empresas[e[1]]); }
    if (e) return json(empresas[e[1]] ?? {});
    return json({});
  });
}

const pestana = (pg, nombre) => pg.getByRole("tab", { name: nombre });
const panel = (pg) => pg.getByRole("tabpanel").filter({ visible: true }).first();
const botonGuardar = (pg) => panel(pg).locator("[data-boton-guardar]");
const estado = (pg) => panel(pg).locator("[data-estado-cambios]").first().getAttribute("data-estado-cambios");
const dialogo = (pg) => pg.getByRole("alertdialog");
const beforeunloadActivo = (pg) => pg.evaluate(() => {
  const ev = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(ev);
  return ev.defaultPrevented;
});
const sinDesborde = async (pg, ancho, donde) => {
  const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(sw <= ancho, `${donde}: sin desborde horizontal (${sw} > ${ancho})`);
};
// Botones, pestañas y campos visibles del contenido principal: al menos 44 px de alto en el teléfono.
const objetivosPequenos = (pg) => pg.evaluate(() => {
  const raiz = document.querySelector("[role=tabpanel]:not([hidden]):not([data-state=inactive])")?.closest("[data-slot=tabs]") ?? document.body;
  return [...raiz.querySelectorAll("button, [role=tab], input:not([type=hidden]):not([type=file]):not([hidden]), a[href], [role=combobox], [class*=-control]")]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; })
    .filter((el) => !el.closest("[role=switch]") && el.getAttribute("role") !== "switch")
    // react-select: el objetivo es su caja (control), no el input interno; inputs ocultos del sistema no cuentan.
    .filter((el) => el.getAttribute("aria-hidden") !== "true" && el.tabIndex !== -1 && !el.id?.startsWith("react-select-"))
    .map((el) => ({ q: (el.getAttribute("aria-label") || el.textContent || el.name || el.id || el.tagName).trim().slice(0, 40), h: Math.round(el.getBoundingClientRect().height) }))
    .filter((x) => x.h < 44);
});

const errores = [];
const pasos = [];
let exito = false;
let ultima = null;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: jwtRh(), url: base }]);
  await rutas(ctx);
  const pg = await ctx.newPage();
  ultima = pg;
  pg.on("pageerror", (e) => errores.push(`1440: ${e.message}`));
  if (process.env.DEPURAR) pg.on("console", (msg) => { if (msg.type() === "error") console.error("consola:", msg.text().slice(0, 2000)); });
  await pg.goto(base + "/panel/cuenta", { waitUntil: "domcontentloaded" });

  // 1) Tres pestañas; identidad con nombre, correo, rol y empresa; «Guardar» deshabilitado sin cambios.
  await pestana(pg, "Mi cuenta").waitFor({ timeout: 30000 });
  assert.deepEqual((await pg.getByRole("tab").allInnerTexts()).map((t) => t.trim()), ["Mi cuenta", "Seguridad", "Mi empresa"]);
  const nombre = pg.locator('input[name="nombre"]');
  await pg.waitForFunction(() => document.querySelector('input[name="nombre"]')?.value === "Laura Méndez", null, { timeout: 30000 });
  const identidad = pg.locator("[data-tarjeta-identidad]");
  for (const t of ["Laura Méndez", "laura@empacadora.mx", "Administrador del panel", "Empacadora del Norte"]) await identidad.getByText(t, { exact: true }).waitFor();
  assert.equal(await estado(pg), "sin-cambios");
  assert.equal(await botonGuardar(pg).innerText(), "Guardar");
  assert.equal(await botonGuardar(pg).isDisabled(), true, "Guardar deshabilitado sin cambios");
  assert.equal(await beforeunloadActivo(pg), false, "sin cambios no hay aviso al recargar");
  await sinDesborde(pg, 1440, "1440 mi cuenta");
  // 2 columnas en escritorio: la identidad queda a la izquierda del formulario.
  const cajaId = await identidad.boundingBox();
  const cajaForm = await nombre.boundingBox();
  assert.ok(cajaForm.x > cajaId.x + cajaId.width, "escritorio en 2 columnas");
  await captura(pg, "1440-mi-cuenta");
  pasos.push("1 pestañas e identidad");

  // 2) Guardar información básica: PUT /users/-1 con { nombre, correo }.
  await nombre.fill("Laura Méndez Ortiz");
  assert.equal(await estado(pg), "pendientes");
  assert.equal(await botonGuardar(pg).isEnabled(), true);
  assert.equal(await beforeunloadActivo(pg), true, "con cambios avisa al recargar");
  await nombre.fill("Laura Méndez");
  assert.equal(await estado(pg), "sin-cambios", "regresar al valor original no cuenta como cambio");
  await nombre.fill("Laura Méndez Ortiz");
  await botonGuardar(pg).click();
  await pg.waitForFunction(() => document.querySelector("[role=tabpanel]:not([hidden]) [data-estado-cambios]")?.getAttribute("data-estado-cambios") === "sin-cambios", null, { timeout: 10000 });
  const putInfo = llamadas.filter((l) => l.metodo === "PUT" && l.ruta === "/users/-1");
  assert.equal(putInfo.length, 1);
  assert.deepEqual(JSON.parse(putInfo[0].cuerpo), { nombre: "Laura Méndez Ortiz", correo: "laura@empacadora.mx" });
  await identidad.getByText("Laura Méndez Ortiz", { exact: true }).waitFor({ timeout: 10000 });
  pasos.push("2 info básica PUT");

  // 3) Foto con vista previa: cancelar no sube; guardar sube con PUT /users/-1/upload-image.
  await pg.locator("[data-input-foto]").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
  await pg.locator("[data-foto-pendiente]").waitFor();
  assert.equal(await beforeunloadActivo(pg), true, "foto sin guardar avisa");
  await captura(pg, "1440-mi-cuenta-vista-previa", false);
  await pg.getByRole("button", { name: "Cancelar" }).click();
  await pg.locator("[data-foto-pendiente]").waitFor({ state: "detached" });
  assert.equal(llamadas.filter((l) => l.ruta.endsWith("/upload-image")).length, 0);
  await pg.locator("[data-input-foto]").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
  await pg.getByRole("button", { name: "Guardar foto" }).click();
  await pg.locator("[data-foto-pendiente]").waitFor({ state: "detached", timeout: 10000 });
  const subida = llamadas.filter((l) => l.ruta === "/users/-1/upload-image");
  assert.equal(subida.length, 1);
  assert.match(subida[0].tipo, /multipart\/form-data/);
  assert.match(subida[0].cuerpo, /name="imagen"/);
  pasos.push("3 foto");

  // 4) Seguridad: mostrar/ocultar, recomendaciones en vivo, validación de siempre y PUT /users/update-password/-1.
  await pestana(pg, "Seguridad").click();
  const nueva = pg.locator("#password");
  const repetir = pg.locator("#confirmPassword");
  await nueva.waitFor();
  const cambiar = () => panel(pg).getByRole("button", { name: "Cambiar contraseña" });
  assert.equal(await cambiar().isDisabled(), true, "sin escribir, deshabilitado");
  await sinDesborde(pg, 1440, "1440 seguridad");
  await captura(pg, "1440-seguridad");
  await nueva.fill("abc");
  assert.equal(await nueva.getAttribute("type"), "password");
  await pg.getByRole("button", { name: "Mostrar nueva contraseña" }).click();
  assert.equal(await nueva.getAttribute("type"), "text", "mostrar");
  await pg.getByRole("button", { name: "Ocultar nueva contraseña" }).click();
  assert.equal(await nueva.getAttribute("type"), "password", "ocultar");
  const cumple = () => pg.locator("[data-recomendaciones] li[data-cumple]").evaluateAll((ls) => ls.map((l) => l.dataset.cumple));
  assert.deepEqual(await cumple(), ["no", "no", "no"]);
  // Solo un campo: la validación de siempre.
  await cambiar().click();
  await pg.locator("[data-error-contrasena]").getByText("Por favor completa ambos campos.").waitFor();
  await repetir.fill("abd");
  await pg.locator('[data-confirmacion="no-coincide"]').waitFor();
  await cambiar().click();
  await pg.locator("[data-error-contrasena]").getByText("Las contraseñas no coinciden.").waitFor();
  assert.equal(llamadas.filter((l) => l.ruta.startsWith("/users/update-password")).length, 0, "con error no se envía");
  await nueva.fill("Segura#2026");
  await repetir.fill("Segura#2026");
  await pg.locator('[data-confirmacion="coincide"]').waitFor();
  assert.deepEqual(await cumple(), ["si", "si", "si"]);
  await captura(pg, "1440-seguridad-escribiendo");
  await cambiar().click();
  await pg.waitForFunction(() => document.querySelector("#password")?.value === "", null, { timeout: 10000 });
  const putPass = llamadas.filter((l) => l.ruta === "/users/update-password/-1");
  assert.equal(putPass.length, 1);
  assert.equal(putPass[0].metodo, "PUT");
  assert.deepEqual(JSON.parse(putPass[0].cuerpo), { password: "Segura#2026", confirmPassword: "Segura#2026" });
  pasos.push("4 contraseña");

  // 5) Mi empresa: secciones, validación de teléfono, PUT /empresas/10 (giro como texto, sin createdAt/updatedAt).
  await pestana(pg, "Mi empresa").click();
  const empresa = pg.locator('input[name="nombre_empresa"]');
  await pg.waitForFunction(() => document.querySelector('input[name="nombre_empresa"]')?.value === "Empacadora del Norte", null, { timeout: 30000 });
  await dormir(600); // deja llegar el giro
  for (const g of ["Datos generales", "Contacto", "Redes sociales", "Registro automático de asistencias"]) await panel(pg).getByText(g, { exact: true }).waitFor();
  await panel(pg).getByText("Módulos de tu empresa").waitFor();
  assert.equal(await estado(pg), "sin-cambios", "abrir la empresa no marca cambios");
  assert.equal(await botonGuardar(pg).isDisabled(), true);
  await sinDesborde(pg, 1440, "1440 empresa");
  await captura(pg, "1440-mi-empresa");
  await captura(pg, "1440-mi-empresa-pantalla", false); // barra de guardado fija visible sin desplazarse
  const celular = pg.locator('input[name="celular"]');
  await celular.fill("123");
  assert.equal(await estado(pg), "pendientes");
  await botonGuardar(pg).click();
  await panel(pg).getByText("Teléfono no válido").waitFor();
  assert.equal(llamadas.filter((l) => l.ruta === "/empresas/10").length, 0, "teléfono inválido no se envía");
  // Cambiar de empresa con cambios pregunta antes.
  await pg.getByRole("button", { name: /Distribuidora del Sur/ }).click();
  await dialogo(pg).getByText("Tienes cambios sin guardar").waitFor({ timeout: 10000 });
  await dialogo(pg).getByRole("button", { name: "Seguir editando" }).click();
  await dialogo(pg).waitFor({ state: "detached" });
  assert.equal(await celular.inputValue(), "123", "seguir editando conserva lo escrito");
  await celular.fill("8119998877");
  await empresa.fill("Empacadora del Norte SA");
  await botonGuardar(pg).click();
  await pg.waitForFunction(() => document.querySelector("[role=tabpanel]:not([hidden]) [data-estado-cambios]")?.getAttribute("data-estado-cambios") === "sin-cambios", null, { timeout: 10000 });
  const putEmp = llamadas.filter((l) => l.metodo === "PUT" && l.ruta === "/empresas/10");
  assert.equal(putEmp.length, 1);
  const cuerpoEmp = JSON.parse(putEmp[0].cuerpo);
  assert.equal(cuerpoEmp.celular, "8119998877");
  assert.equal(cuerpoEmp.nombre_empresa, "Empacadora del Norte SA");
  assert.equal(cuerpoEmp.giro, "Manufactura", "giro como texto");
  assert.equal(cuerpoEmp.zona_horaria, "America/Monterrey");
  assert.equal("createdAt" in cuerpoEmp || "updatedAt" in cuerpoEmp, false);
  assert.equal(await empresa.inputValue(), "Empacadora del Norte SA", "lo guardado queda en el formulario");
  pasos.push("5 empresa PUT");

  // 6) Cambiar de pestaña no pierde lo escrito; «Guardar y salir» guarda TODO lo pendiente (info + contraseña) y sale.
  await pestana(pg, "Mi cuenta").click();
  await nombre.fill("Laura M. Ortiz");
  await pestana(pg, "Seguridad").click();
  await nueva.fill("Otra#2027x");
  await repetir.fill("Otra#2027x");
  await pestana(pg, "Mi cuenta").click();
  assert.equal(await nombre.inputValue(), "Laura M. Ortiz", "la pestaña conserva lo escrito");
  const antes = llamadas.length;
  await pg.evaluate(() => { const a = document.createElement("a"); a.href = "/panel/modulos"; a.id = "enlace-prueba"; a.textContent = "ir"; a.style.cssText = "position:fixed;right:8px;bottom:8px;z-index:99999;padding:12px;background:#fff"; document.body.appendChild(a); });
  await pg.locator("#enlace-prueba").click();
  await dialogo(pg).getByText("Tienes cambios sin guardar").waitFor({ timeout: 10000 });
  await dialogo(pg).getByRole("button", { name: "Guardar y salir" }).click();
  await pg.waitForURL(/\/panel\/modulos/, { timeout: 15000 });
  const nuevas = llamadas.slice(antes).map((l) => l.ruta);
  assert.ok(nuevas.includes("/users/-1"), `guardó la info: ${nuevas}`);
  assert.ok(nuevas.includes("/users/update-password/-1"), `guardó la contraseña: ${nuevas}`);
  pasos.push("6 guardia guarda todo y sale");
  await ctx.close();

  // 7) Teléfono a 390 px: una columna, sin desborde, objetivos táctiles de 44 px; capturas de cada pestaña.
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctxM.addCookies([{ name: "token", value: jwtRh(), url: base }]);
  await rutas(ctxM);
  const m = await ctxM.newPage();
  ultima = m;
  m.on("pageerror", (e) => errores.push(`390: ${e.message}`));
  await m.goto(base + "/panel/cuenta", { waitUntil: "domcontentloaded" });
  await m.waitForFunction(() => document.querySelector('input[name="nombre"]')?.value, null, { timeout: 30000 });
  const idM = await m.locator("[data-tarjeta-identidad]").boundingBox();
  const formM = await m.locator('input[name="nombre"]').boundingBox();
  assert.ok(formM.y > idM.y + idM.height, "teléfono en una columna");
  for (const [tab, archivo] of [["Mi cuenta", "390-mi-cuenta"], ["Seguridad", "390-seguridad"], ["Mi empresa", "390-mi-empresa"]]) {
    await pestana(m, tab).click();
    if (tab === "Mi empresa") {
      await m.waitForFunction(() => document.querySelector('input[name="nombre_empresa"]')?.value, null, { timeout: 30000 });
      await dormir(600);
    } else await dormir(300);
    await sinDesborde(m, 390, `390 ${tab}`);
    const pequenos = await objetivosPequenos(m);
    assert.deepEqual(pequenos, [], `390 ${tab}: objetivos de 44 px`);
    await captura(m, archivo);
  }
  await m.locator('input[name="celular"]').fill("8110000000");
  const alto = (await botonGuardar(m).boundingBox()).height;
  assert.ok(alto >= 44, `Guardar de 44 px: ${alto}`);
  pasos.push("7 teléfono 390 px");
  await ctxM.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log(`OK mi cuenta: ${pasos.join(" · ")}`);
} finally {
  if (!exito && ultima) { console.error("errores de página:", errores); console.error("llamadas:", llamadas.map((l) => `${l.metodo} ${l.ruta}`)); await captura(ultima, "falla", true)?.catch(() => {}); }
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
