// Verificación en navegador (23/11/2026): la ficha del empleado abre ya editable, «Guardar» solo se activa con cambios,
// y con cambios sin guardar cualquier salida pregunta «Tienes cambios sin guardar. ¿Qué quieres hacer?»:
// «Regresar a la tabla», menú lateral, enlace interno <a>, botón atrás del navegador y beforeunload (recargar/cerrar).
// «Guardar y salir» hace el PUT y sale; si el servidor falla, se queda. Abrir la ficha y recorrer sus pestañas (turno
// asignado, áreas, forma de cálculo) no marca cambios. Teléfono a 390 px. Backend simulado.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx npm run build
//      && CAPTURAS=/ruta node scripts/verify-ficha-guardar.mjs
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
const captura = (pg, nombre, fullPage = false) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage }) : null);
function jwtRh() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };

// ---- Backend simulado ----
const empresa = { id_empresa: 10, nombre: "Empacadora del Norte", nombre_empresa: "Empacadora del Norte", estado: "Activo" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "RH Prueba", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
// Como lo regresa la base: números en texto, fecha con hora, banderas 0/1, horarios por día, GPS activo.
const emp = {
  id_empleado: 15, id_empresa: 10, nombre: "Ana", apellido_paterno: "Torres", apellido_materno: "Ruiz", correo: "ana@prueba.mx",
  estado: "Activo", nip: "1234", puesto: "Supervisora", sucursal: "Centro", departamento: "Operación", telefono: "8112345678",
  fecha_ingreso: "2024-01-15T00:00:00.000Z", fecha_nacimiento: "1990-05-02T00:00:00.000Z",
  periodo_pago: "Quincenal", forma_pago: "Fijo", forma_calculo: "$", sueldo: "12000.00", porcentaje: "10.00",
  hrs_por_dia: "8.00", hrs_de_comida: "1.00", checar_gps: 1, solicitar_gps: 0, enviar_asistencia_automatica: 1, autoriza_horas_extra: 0,
  horarios: dias.map((dia) => ({ dia, entrada: "09:00", salida_comida: "14:00", regreso_comida: "15:00", salida: "18:00" })),
  cuenta_bancaria: { banco: "BBVA", numero_cuenta: "0123456789", tipo_cuenta: "Cuenta" },
  sexo: "F", // dato viejo que no está entre las opciones (24/11/2026)
};
const puts = [];
let fallarPut = false;

async function rutas(ctx) {
  await ctx.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (d, s = 200) => route.fulfill({ status: s, contentType: "application/json", headers: cors, body: JSON.stringify(d) });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p === "/checador/empleados/15" && req.method() === "PUT") {
      if (fallarPut) return json({ error: "El servidor no pudo guardar (prueba)." }, 500);
      puts.push(req.postData() ?? "");
      return json({ ok: true });
    }
    if (p === "/checador/empleados/15") return json(emp);
    if (p === "/checador/empleados") return json({ data: [emp], total: 1, page: 1, totalPages: 1 });
    if (p === "/checador/empleados/validar") return json({});
    if (p === "/checador/empleados/15/turno") return json({ id_turno: 3 });
    if (p === "/checador/turnos") return json({ turnos: [{ id_turno: 3, nombre: "Matutino", activo: 1, id_empresa: 10 }] });
    if (p === "/checador/empleados/area_check/15/areas") return json([{ id_area: 1 }]);
    if (p === "/checador/area_check2") return json({ data: [{ id_area: 1, nombre_area: "Planta", latitud: 25.6, longitud: -100.3 }, { id_area: 2, nombre_area: "Oficina", latitud: 25.7, longitud: -100.2 }] });
    if (p === "/checador/nomina/empleados/15/conceptos") return json({ ok: true, conceptos: [] });
    return json({});
  });
}

const ficha = (pg) => pg.locator("#formulario-empleado");
const botonGuardar = (pg) => pg.locator("[data-boton-guardar]:visible");
const estado = (pg) => pg.locator("[data-estado-cambios]:visible").first().getAttribute("data-estado-cambios");
const dialogo = (pg) => pg.getByRole("alertdialog");
const beforeunloadActivo = (pg) => pg.evaluate(() => {
  const e = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(e);
  return e.defaultPrevented;
});
// Espera a que terminen las animaciones de entrada (para medir y capturar el diálogo ya completo).
const sinAnimaciones = (pg) => pg.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))));
const nombre = (pg) => ficha(pg).locator('input[name="nombre"]');

async function abrirDesdeTabla(pg) {
  await pg.getByRole("cell", { name: /Ana/ }).first().click({ timeout: 30000 });
  await nombre(pg).waitFor({ timeout: 30000 });
  await pg.waitForFunction(() => document.querySelector('#formulario-empleado input[name="nombre"]')?.value === "Ana");
  await pg.locator("[data-estado-cambios]:visible").first().waitFor();
}
async function preguntaVisible(pg) {
  await dialogo(pg).waitFor({ timeout: 10000 });
  await dialogo(pg).getByText("Tienes cambios sin guardar").waitFor();
  await dialogo(pg).getByText("¿Qué quieres hacer?").waitFor();
  const botones = await dialogo(pg).getByRole("button").allInnerTexts();
  assert.deepEqual(botones.map((t) => t.trim()), ["Guardar y salir", "Salir sin guardar", "Seguir editando"]);
}
async function enTabla(pg) {
  await ficha(pg).waitFor({ state: "detached", timeout: 15000 });
  await pg.getByText("Total empleados").first().waitFor({ timeout: 15000 });
}

const errores = [];
const pasos = [];
let exito = false;
let ultima = null; // página en curso, para la captura si algo falla
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: jwtRh(), url: base }]);
  await rutas(ctx);
  const pg = await ctx.newPage();
  ultima = pg;
  pg.on("pageerror", (e) => errores.push(`1440: ${e.message}`));
  if (process.env.DEPURAR) pg.on("console", (msg) => { if (msg.type() === "error") console.error("consola:", msg.text().slice(0, 3000)); });
  await pg.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });

  // 1) Desde la tabla abre editable: sin «Editar», sin «Ver detalles», campos habilitados.
  assert.equal(await pg.getByTitle("Ver detalles").count(), 0, "ya no hay «ver» de solo lectura");
  await abrirDesdeTabla(pg);
  assert.equal(await nombre(pg).isEditable(), true, "abre editable");
  assert.equal(await pg.getByRole("button", { name: "Editar", exact: true }).count(), 0, "sin botón «Editar»");
  assert.equal(await pg.getByRole("button", { name: "Actualizar" }).count(), 0, "ya no dice «Actualizar»");
  pasos.push("1 abre editable");

  // 2) Sin cambios: «Guardar» deshabilitado, «Sin cambios», sin beforeunload; recorrer pestañas no marca cambios.
  for (const t of ["Trabajo", "Checador y acceso", "Pago", "Personal"]) {
    await pg.getByRole("tab", { name: t }).click();
    await dormir(900); // deja llegar turno, áreas y la limpieza de la forma de cálculo
    assert.equal(await estado(pg), "sin-cambios", `pestaña ${t} sin cambios`);
  }
  assert.equal(await botonGuardar(pg).innerText(), "Guardar");
  assert.equal(await botonGuardar(pg).isDisabled(), true, "Guardar deshabilitado sin cambios");
  assert.equal(await beforeunloadActivo(pg), false, "beforeunload inactivo sin cambios");
  const largoSinCambios = await pg.evaluate(() => history.length);
  await captura(pg, "1440-sin-cambios");
  pasos.push("2 sin cambios: Guardar deshabilitado");

  // 3) Cambiar un campo activa «Guardar» y el aviso; volver al valor original lo apaga.
  await nombre(pg).fill("Ana María");
  assert.equal(await estado(pg), "pendientes");
  assert.equal(await botonGuardar(pg).isEnabled(), true, "Guardar activo con cambios");
  await pg.locator("[data-estado-cambios]:visible", { hasText: "Cambios sin guardar" }).waitFor();
  assert.equal(await beforeunloadActivo(pg), true, "beforeunload activo con cambios");
  await captura(pg, "1440-con-cambios");
  await nombre(pg).fill("Ana");
  await pg.waitForFunction(() => document.querySelector("[data-estado-cambios]")?.dataset.estadoCambios === "sin-cambios");
  assert.equal(await beforeunloadActivo(pg), false);
  await dormir(400);
  assert.equal(await pg.evaluate(() => history.state?.__cambiosPendientes ?? false), false, "sin entrada extra en el historial");
  await nombre(pg).fill("Ana María");
  pasos.push("3 cambiar activa Guardar · 8 beforeunload");

  // 4 y 5) «Regresar a la tabla» pregunta: Seguir editando se queda; Salir sin guardar sale sin PUT.
  await pg.getByRole("button", { name: "Regresar a la tabla" }).click();
  await preguntaVisible(pg);
  await sinAnimaciones(pg);
  await dormir(300);
  await captura(pg, "1440-dialogo");
  await dialogo(pg).getByRole("button", { name: "Seguir editando" }).click();
  await dialogo(pg).waitFor({ state: "hidden" });
  assert.equal(await nombre(pg).inputValue(), "Ana María", "se queda con lo escrito");
  await pg.getByRole("button", { name: "Regresar a la tabla" }).click();
  await preguntaVisible(pg);
  await dialogo(pg).getByRole("button", { name: "Salir sin guardar" }).click();
  await enTabla(pg);
  assert.equal(await ficha(pg).count(), 0, "salió de la ficha");
  assert.equal(puts.length, 0, "Salir sin guardar no hace PUT");
  assert.equal(await beforeunloadActivo(pg), false);
  pasos.push("4 Regresar pregunta · 5a Seguir editando · 5b Salir sin guardar");

  // 5c) «Guardar y salir» con error del servidor: se queda. Luego bien: hace el PUT y sale.
  await abrirDesdeTabla(pg);
  await nombre(pg).fill("Ana María");
  fallarPut = true;
  await pg.getByRole("button", { name: "Regresar a la tabla" }).click();
  await preguntaVisible(pg);
  await dialogo(pg).getByRole("button", { name: "Guardar y salir" }).click();
  await dialogo(pg).waitFor({ state: "hidden" });
  await pg.getByText("El servidor no pudo guardar (prueba).").first().waitFor();
  assert.equal(await nombre(pg).inputValue(), "Ana María", "si falla, se queda en la ficha");
  assert.equal(await estado(pg), "pendientes");
  fallarPut = false;
  await pg.getByRole("button", { name: "Regresar a la tabla" }).click();
  await preguntaVisible(pg);
  await dialogo(pg).getByRole("button", { name: "Guardar y salir" }).click();
  await enTabla(pg);
  assert.equal(puts.length, 1, "Guardar y salir hace el PUT");
  assert.match(puts[0], /Ana María/);
  pasos.push("5c Guardar y salir: falla → se queda; bien → PUT y sale");

  // 6) Menú lateral pregunta antes de navegar.
  await abrirDesdeTabla(pg);
  await nombre(pg).fill("Ana Lucía");
  const inicio = pg.locator('[data-sidebar="menu-button"]', { hasText: "Inicio" }).first();
  await inicio.click();
  await preguntaVisible(pg);
  await dialogo(pg).getByRole("button", { name: "Seguir editando" }).click();
  assert.match(pg.url(), /\/panel\/empleados/);
  assert.equal(await nombre(pg).inputValue(), "Ana Lucía");
  // Enlace interno <a> (como <Link>): también pregunta.
  await pg.evaluate(() => {
    const a = document.createElement("a");
    a.href = "/panel/vacaciones"; a.textContent = "Ir a vacaciones (prueba)"; a.id = "enlace-prueba";
    a.style.cssText = "position:fixed;bottom:8px;left:300px;z-index:40;background:#fff";
    document.body.appendChild(a);
  });
  await pg.locator("#enlace-prueba").click();
  await preguntaVisible(pg);
  await dialogo(pg).getByRole("button", { name: "Seguir editando" }).click();
  assert.match(pg.url(), /\/panel\/empleados/, "el enlace no navegó");
  await pg.evaluate(() => document.getElementById("enlace-prueba")?.remove());
  await inicio.click();
  await preguntaVisible(pg);
  await dialogo(pg).getByRole("button", { name: "Salir sin guardar" }).click();
  await pg.waitForURL(/\/panel\/dashboard/, { timeout: 15000 });
  assert.equal(puts.length, 1, "sin PUT al salir sin guardar");
  pasos.push("6 menú lateral y enlace <a> preguntan");

  // 7) Botón atrás del navegador pregunta; «Seguir editando» se queda; «Salir sin guardar» regresa de verdad.
  await pg.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  await abrirDesdeTabla(pg);
  await nombre(pg).fill("Ana Sofía");
  await pg.waitForFunction(() => history.state?.__cambiosPendientes === true);
  await pg.evaluate(() => history.back());
  await preguntaVisible(pg);
  assert.match(pg.url(), /\/panel\/empleados/, "no se fue");
  await dialogo(pg).getByRole("button", { name: "Seguir editando" }).click();
  assert.equal(await nombre(pg).inputValue(), "Ana Sofía");
  await pg.evaluate(() => history.back());
  await preguntaVisible(pg);
  await dialogo(pg).getByRole("button", { name: "Salir sin guardar" }).click();
  await pg.waitForURL(/\/panel\/dashboard/, { timeout: 15000 });
  pasos.push("7 botón atrás pregunta");

  // 9) Guardar limpia el estado (y no deja entrada extra en el historial).
  await pg.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  await abrirDesdeTabla(pg);
  const largoAntes = await pg.evaluate(() => history.length);
  await nombre(pg).fill("Ana Paula");
  await botonGuardar(pg).click();
  await pg.getByText("Cambios guardados").first().waitFor({ timeout: 15000 });
  assert.equal(puts.length, 2);
  assert.match(puts[1], /Ana Paula/);
  await pg.waitForFunction(() => document.querySelector("[data-estado-cambios]")?.dataset.estadoCambios === "sin-cambios");
  assert.equal(await botonGuardar(pg).isDisabled(), true, "tras guardar, Guardar vuelve a deshabilitarse");
  assert.equal(await beforeunloadActivo(pg), false);
  assert.equal(await nombre(pg).inputValue(), "Ana Paula", "se queda en la ficha con lo guardado");
  await pg.waitForFunction(() => !history.state?.__cambiosPendientes);
  assert.ok(await pg.evaluate(() => history.length) >= largoAntes);
  await pg.getByRole("button", { name: "Regresar a la tabla" }).click();
  await enTabla(pg);
  assert.equal(await dialogo(pg).count(), 0, "sin cambios no pregunta");
  assert.ok(largoSinCambios > 0);
  pasos.push("9 guardar limpia");

  // 11) (23/11/2026) Fechas que llegan con hora se ven en el campo; el turno elegido no se pierde al cambiar de pestaña.
  await abrirDesdeTabla(pg);
  await pg.getByRole("tab", { name: "Personal" }).click();
  await pg.waitForFunction(() => document.querySelector('#formulario-empleado input[name="fecha_nacimiento"]')?.value === "1990-05-02", null, { timeout: 5000 })
    .catch(async () => assert.fail(`fecha de nacimiento visible: «${await ficha(pg).locator('input[name="fecha_nacimiento"]').inputValue()}»`));
  await pg.getByRole("tab", { name: "Trabajo" }).click();
  const ingreso = ficha(pg).locator('input[name="fecha_ingreso"]');
  if (await ingreso.count()) assert.equal(await ingreso.inputValue(), "2024-01-15", "fecha de ingreso visible");
  await dormir(900);
  assert.equal(await estado(pg), "sin-cambios", "fechas normalizadas no cuentan como cambio");
  const personalizado = ficha(pg).getByRole("button", { name: /Horario personalizado/ });
  const marcado = (b) => b.evaluate((el) => el.className.includes("border-brand"));
  assert.equal(await marcado(ficha(pg).getByRole("button", { name: /Turno existente/ })), true, "abre con su turno");
  await personalizado.click();
  assert.equal(await marcado(personalizado), true);
  assert.equal(await estado(pg), "pendientes");
  await pg.getByRole("tab", { name: "Personal" }).click();
  await dormir(500);
  await pg.getByRole("tab", { name: "Trabajo" }).click();
  await dormir(1200); // tiempo de sobra para que llegue el turno del servidor
  assert.equal(await marcado(ficha(pg).getByRole("button", { name: /Horario personalizado/ })), true, "el cambio de turno se conserva al volver a la pestaña");
  assert.equal(await estado(pg), "pendientes", "sigue contando como cambio sin guardar");
  await pg.getByRole("button", { name: "Regresar a la tabla" }).click();
  await preguntaVisible(pg);
  await dialogo(pg).getByRole("button", { name: "Salir sin guardar" }).click();
  await enTabla(pg);
  pasos.push("11 fechas con hora y turno al cambiar de pestaña");

  // 12) (24/11/2026, «no he movido nada y dice cambios sin guardar») Abrir por enlace directo (?id=) a alguien con un
  // dato que no está en la lista (sexo «F»): no marca cambios y el dato se conserva y se manda tal cual al guardar.
  await pg.goto(base + "/panel/empleados?id=15", { waitUntil: "domcontentloaded" });
  await nombre(pg).waitFor({ timeout: 30000 });
  await dormir(2500);
  assert.equal(await estado(pg), "sin-cambios", `abrir no marca cambios (${await pg.locator("[data-estado-cambios]:visible").first().getAttribute("data-campos-cambiados")})`);
  assert.match(await ficha(pg).locator("button[role=combobox]", { hasText: /^F$/ }).first().innerText(), /^F$/, "el sexo guardado se ve");
  const antesPut = puts.length;
  await nombre(pg).fill("Ana Sofía");
  assert.equal(await pg.locator("[data-estado-cambios]:visible").first().getAttribute("data-campos-cambiados"), "nombre", "solo cuenta lo que se tocó");
  await botonGuardar(pg).click();
  await pg.getByText("Cambios guardados").first().waitFor({ timeout: 15000 });
  assert.equal(puts.length, antesPut + 1);
  assert.match(puts.at(-1), /"sexo":"F"|name="sexo"\r\n\r\nF\r\n/, "no borra el sexo al guardar");
  await pg.waitForFunction(() => document.querySelector("[data-estado-cambios]")?.dataset.estadoCambios === "sin-cambios");
  await nombre(pg).fill("Ana");
  assert.equal(await estado(pg), "pendientes", "tras guardar, volver al valor anterior sí es un cambio");
  await nombre(pg).fill("Ana Sofía");
  await pg.waitForFunction(() => document.querySelector("[data-estado-cambios]")?.dataset.estadoCambios === "sin-cambios");
  pasos.push("12 enlace directo con dato fuera de lista: sin cambios falsos y sin perder el dato");
  await ctx.close();

  // 10) Teléfono a 390 px: abre editable desde la lista; barra inferior con Guardar; el diálogo cabe.
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctxM.addCookies([{ name: "token", value: jwtRh(), url: base }]);
  await rutas(ctxM);
  const m = await ctxM.newPage();
  ultima = m;
  m.on("pageerror", (e) => errores.push(`390: ${e.message}`));
  await m.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  await m.getByRole("button", { name: /Ana Torres/ }).first().click({ timeout: 30000 });
  await nombre(m).waitFor({ timeout: 30000 });
  await m.waitForFunction(() => document.querySelector('#formulario-empleado input[name="nombre"]')?.value === "Ana");
  assert.equal(await nombre(m).isEditable(), true, "en el teléfono también abre editable");
  assert.equal(await m.getByRole("button", { name: "Editar", exact: true }).count(), 0);
  assert.equal(await botonGuardar(m).isDisabled(), true);
  assert.equal(await estado(m), "sin-cambios");
  await nombre(m).fill("Ana María");
  assert.equal(await botonGuardar(m).isEnabled(), true);
  assert.equal(await estado(m), "pendientes");
  const alto = (await botonGuardar(m).boundingBox()).height;
  assert.ok(alto >= 44, `Guardar de al menos 44 px: ${alto}`);
  assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde horizontal");
  await captura(m, "390-con-cambios");
  await m.locator("#formulario-empleado").evaluate(() => {});
  await m.locator("button:visible", { hasText: "Ana Torres" }).first().click(); // flecha de regresar del encabezado
  await preguntaVisible(m);
  await sinAnimaciones(m); // termina la animación de entrada (zoom 95 % → 100 %)
  await dormir(300);
  const caja = await dialogo(m).boundingBox();
  assert.ok(caja.x >= 0 && caja.x + caja.width <= 390, `el diálogo cabe: ${JSON.stringify(caja)}`);
  const altos = await dialogo(m).getByRole("button").evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().height)));
  assert.ok(altos.every((h) => h >= 44), `botones de 44 px: ${altos}`);
  await captura(m, "390-dialogo");
  await dialogo(m).getByRole("button", { name: "Salir sin guardar" }).click();
  await m.getByRole("button", { name: /Ana Torres/ }).first().waitFor({ timeout: 15000 });
  pasos.push("10 teléfono 390 px");
  await ctxM.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log(`OK ficha guardar: ${pasos.join(" · ")}`);
} finally {
  if (!exito && ultima) { console.error("errores de página:", errores); await captura(ultima, "falla", true)?.catch(() => {}); }
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
