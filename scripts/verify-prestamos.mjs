// Verificación en navegador de Préstamos (Nómina R2) con el backend simulado en memoria:
// RH ve la solicitud de Ana, la aprueba ajustando en cuántos pagos, registra un abono en efectivo; registra otro préstamo
// en su PÁGINA (no ventana) «¿En cuántos pagos?» con el plan al centavo, el calendario, el aviso del tope («Usar N
// quincenas») y la opción «Prefiero poner cuánto por nómina»; el empleado ve su saldo y calendario, firma su acuerdo y no
// puede pedir otro mientras tenga uno abierto; otra persona pide uno en quincenas.
// (27/11/2026) Los dos formularios (RH y Mi espacio) a 1440 y 390: letra ≥ 16 px en escritorio y ≥ 17 px en celular,
// botones y campos de 48 px o más, títulos en 700, sin fondos degradados y sin desborde horizontal.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-prestamos.mjs
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

// Plan simulado con la MISMA regla del servidor (services/nominaPrestamos.js): centavos enteros, el último lleva el resto.
const TOPE_QUINCENA = 382.32; // Carla: $6,000 a la quincena → (6000 − 315.04 × 15) × 30 %
function planSimulado({ monto, num_pagos, abono }) {
  const total = Math.round(monto * 100);
  let n = num_pagos;
  let a;
  if (n) a = Math.floor(total / n);
  else { a = Math.round(abono * 100); n = total - a <= 99 ? 1 : 1 + Math.ceil((total - a - 99) / a); }
  return { num_pagos: n, abono: a / 100, ultimo: (total - a * (n - 1)) / 100, pagos_restantes: n, ultimo_restante: (total - a * (n - 1)) / 100, num_pagos_calculado: false, periodo_pago: "Quincenal" };
}
const calendarioDe = (n) => ({ primero: { inicio: "2026-12-01", fin: "2026-12-15" }, ultimo: n === 6 ? { inicio: "2027-02-16", fin: "2027-02-28" } : { inicio: "2027-06-16", fin: "2027-06-30" }, aproximado: false, pagos: n });
function simulacion(b, alEmpleado = false) {
  const plan = planSimulado(b);
  const alto = Math.max(plan.abono, plan.ultimo);
  const minimos = Math.ceil((b.monto * 100) / (TOPE_QUINCENA * 100));
  const avisos = alto > TOPE_QUINCENA ? [`El abono de $${alto.toFixed(2)} pasa del tope de la ley para cada quincena ($382.32: 30 % de ${alEmpleado ? "lo que ganas" : "lo que gana"} arriba del salario mínimo). Con ${minimos} quincenas o más sí cabe.`] : [];
  if (b.monto > 12000) avisos.unshift("Pasa de un mes de salario ($12,000.00). La ley no permite exigir más de un mes.");
  return { ok: true, plazo: plan.num_pagos, ...plan, avisos, tope_periodo: TOPE_QUINCENA, pagos_minimos: alto > TOPE_QUINCENA ? minimos : null, plan, calendario: calendarioDe(plan.num_pagos) };
}

// Backend simulado (nombres ficticios).
const estado = {
  posts: [],
  prestamos: [
    { id: 3, id_empresa: 7, id_empleado: 15, empleado: "Ana Torres", puesto: "Empacadora", monto: 3000, abono: 500, saldo: 3000, motivo: "Consulta médica", origen: "empleado", estado: "solicitado", version: 1, firma_estatus: null, creado_en: "2026-11-21T16:00:00Z", solicitado_por_nombre: "Ana Torres", num_pagos: 6 },
    { id: 2, id_empresa: 7, id_empleado: 16, empleado: "Beto Ruiz", puesto: null, monto: 1000, abono: 250, saldo: 500, motivo: null, origen: "rh", estado: "vigente", version: 4, firma_estatus: "firmado", creado_en: "2026-10-01T16:00:00Z", solicitado_por_nombre: "RH Prueba", num_pagos: null },
  ],
  movimientos: { 2: [{ id: 1, tipo: "abono_nomina", importe: 250, saldo_despues: 750, periodo_inicio: "2026-11-02", periodo_fin: "2026-11-08", registrado_por_nombre: "Dueño", creado_en: "2026-11-09T18:00:00Z" }, { id: 2, tipo: "abono_nomina", importe: 250, saldo_despues: 500, periodo_inicio: "2026-11-09", periodo_fin: "2026-11-15", registrado_por_nombre: "Dueño", creado_en: "2026-11-16T18:00:00Z" }] },
};
const planDe = (pr) => {
  const n = pr.num_pagos ?? Math.ceil(pr.monto / pr.abono);
  const restantes = Math.ceil(Math.round(pr.saldo * 100) / Math.round(pr.abono * 100));
  return { num_pagos: n, abono: pr.abono, ultimo: Math.round(pr.monto * 100 - pr.abono * 100 * (n - 1)) / 100, pagos_restantes: restantes, ultimo_restante: Math.round(pr.saldo * 100 - pr.abono * 100 * (restantes - 1)) / 100, num_pagos_calculado: pr.num_pagos == null, periodo_pago: pr.id_empleado === 16 ? "Semanal" : "Quincenal" };
};
async function rutas(ctx, usuario) {
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    const ok = (json, status = 200) => route.fulfill({ status, json, headers: cors });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return ok({ user: usuario() });
    if (p === "/checador/nomina/prestamos" && req.method() === "GET") { assert.equal(url.searchParams.get("empresa"), "7"); return ok({ ok: true, prestamos: estado.prestamos, puede_cancelar_vigente: false }); }
    if (p === "/checador/nomina/prestamos" && req.method() === "POST") {
      const b = req.postDataJSON();
      estado.posts.push({ accion: b.simular ? "simular" : "crear", ...b });
      if (b.simular) return ok(simulacion(b));
      const plan = planSimulado(b);
      estado.prestamos.unshift({ id: 4, id_empresa: 7, id_empleado: b.id_empleado, empleado: "Carla Paz", monto: b.monto, abono: plan.abono, num_pagos: plan.num_pagos, saldo: b.monto, motivo: b.motivo, origen: "rh", estado: "por_firmar", version: 1, firma_estatus: "pendiente", creado_en: "2026-11-21T18:00:00Z", solicitado_por_nombre: "RH Prueba" });
      return ok({ ok: true, id: 4, plazo: plan.num_pagos, avisos: [], aviso_acuerdo: null }, 201);
    }
    const m = /^\/checador\/nomina\/prestamos\/(\d+)(?:\/(\w+))?$/.exec(p);
    if (m) {
      const pr = estado.prestamos.find((x) => x.id === Number(m[1]));
      if (!m[2]) { const plan = planDe(pr); return ok({ ok: true, prestamo: pr, movimientos: estado.movimientos[pr.id] ?? [], avisos: [], plazo: plan.num_pagos, plan, calendario: calendarioDe(plan.pagos_restantes), puede_cancelar_vigente: false }); }
      const b = req.postDataJSON() ?? {};
      estado.posts.push({ accion: m[2], id: pr.id, ...b });
      assert.equal(b.version, pr.version, "manda la versión que vio");
      pr.version += 1;
      if (m[2] === "aprobar") { const plan = b.num_pagos || b.abono ? planSimulado({ monto: b.monto ?? pr.monto, num_pagos: b.num_pagos, abono: b.abono }) : null; Object.assign(pr, { estado: "por_firmar", firma_estatus: "pendiente", ...(plan ? { abono: plan.abono, num_pagos: plan.num_pagos } : {}), monto: b.monto ?? pr.monto, saldo: b.monto ?? pr.saldo }); }
      if (m[2] === "abono") {
        pr.saldo -= b.importe;
        (estado.movimientos[pr.id] ??= []).push({ id: 9, tipo: "abono_efectivo", importe: b.importe, saldo_despues: pr.saldo, nota: b.nota, registrado_por_nombre: "RH Prueba", creado_en: "2026-11-21T18:00:00Z" });
        return ok({ ok: true, saldo: pr.saldo });
      }
      return ok({ ok: true, aviso_acuerdo: null });
    }
    if (p === "/checador/empleados") return ok({ data: [{ id_empleado: 17, nombre: "Carla", apellido_paterno: "Paz", puesto: "Cajera" }, { id_empleado: 15, nombre: "Ana", apellido_paterno: "Torres" }], total: 2 });
    if (p === "/checador/nomina/mis-prestamos" && req.method() === "GET") {
      const yo = usuario().id_empleado;
      const suyos = estado.prestamos.filter((x) => x.id_empleado === yo).map((x) => ({ ...x, movimientos: [], plan: planDe(x), calendario: calendarioDe(planDe(x).pagos_restantes) }));
      return ok({ ok: true, periodo_pago: "Quincenal", prestamos: suyos });
    }
    if (p === "/checador/nomina/mis-prestamos" && req.method() === "POST") {
      const b = req.postDataJSON();
      estado.posts.push({ accion: b.simular ? "mi-simular" : "pedir", ...b });
      if (b.simular) return ok(simulacion(b, true));
      if (usuario().id_empleado === 15) return ok({ ok: false, error: "Ya tienes un préstamo abierto." }, 409);
      return ok({ ok: true, id: 8, avisos: [] }, 201);
    }
    if (p === "/checador/firma-digital/solicitudes/documento") {
      assert.equal(url.searchParams.get("tipo_documento"), "PRESTAMO_NOMINA");
      assert.equal(url.searchParams.get("referencia_id"), "3");
      return ok({ success: true, solicitud: { estatus: "pendiente", url_firma: "/firmar/tok-prestamo" } });
    }
    return ok([]);
  });
}

// Legibilidad del formulario (regla del dueño): letra, botones/campos de 48 px, títulos 700, sin degradados ni desborde.
async function revisarFormulario(page, ancho, nombre) {
  const r = await page.evaluate(({ minimo }) => {
    const form = document.querySelector("[data-formulario-prestamo]");
    if (!form) return { falta: true };
    const visible = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const chicas = [];
    for (const el of form.querySelectorAll("*")) {
      if (!visible(el) || el.closest("[data-chico]")) continue;
      const conTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const control = ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);
      if ((conTexto || control) && parseFloat(getComputedStyle(el).fontSize) < minimo) chicas.push(`${el.tagName} ${parseFloat(getComputedStyle(el).fontSize)}px «${(el.textContent || el.value || "").trim().slice(0, 40)}»`);
    }
    const controles = [...form.querySelectorAll("button, input, select, a"), ...document.querySelectorAll("[data-barra-movil] button, [data-barra-movil] a")].filter(visible);
    const bajos = controles.filter((el) => el.getBoundingClientRect().height < 47.5).map((el) => `${el.tagName} ${Math.round(el.getBoundingClientRect().height)}px «${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}»`);
    const titulos = [...document.querySelectorAll("h1, h2, h3")].filter(visible).filter((h) => Number(getComputedStyle(h).fontWeight) > 700).map((h) => h.textContent.trim().slice(0, 30));
    const degradados = [...document.querySelectorAll("body *")].filter((el) => /gradient/.test(getComputedStyle(el).backgroundImage)).map((el) => el.tagName);
    return { chicas, bajos, titulos, degradados, desborde: document.documentElement.scrollWidth > window.innerWidth };
  }, { minimo: ancho < 1024 ? 17 : 16 });
  assert.ok(!r.falta, `${nombre}: no está el formulario`);
  assert.deepEqual(r.chicas, [], `${nombre} @${ancho}: letra menor a ${ancho < 1024 ? 17 : 16} px`);
  assert.deepEqual(r.bajos, [], `${nombre} @${ancho}: botones o campos de menos de 48 px`);
  assert.deepEqual(r.titulos, [], `${nombre} @${ancho}: títulos de más de 700`);
  assert.deepEqual(r.degradados, [], `${nombre} @${ancho}: fondos degradados`);
  assert.equal(r.desborde, false, `${nombre} @${ancho}: desborde horizontal`);
}

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX" });
  await ctx.addCookies([{ name: "token", value: jwt("Recruiter"), url: base }]);
  const rh = () => ({ id_usuario: 1, tipo_usuario: "Recruiter", nombre: "RH Prueba", empresas: [7], empresas_detalle: [{ id_empresa: 7, nombre: "Empacadora" }] });
  await rutas(ctx, rh);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));

  // 1) Lista: KPIs, filtro y la solicitud de Ana primero.
  await page.goto(base + "/panel/nomina/prestamos", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Ana Torres" }).waitFor({ timeout: 20000 });
  await page.getByText("Por cobrar").waitFor();
  await captura(page, "prestamos-lista");
  await page.getByRole("button", { name: "Vigentes (1)" }).click();
  assert.equal(await page.getByRole("link", { name: "Ana Torres" }).count(), 0, "filtra por estado");
  await page.getByRole("button", { name: "Todos" }).click();

  // Módulo Nómina: las tres secciones como pestañas.
  for (const t of ["Nóminas", "Bonos y descuentos", "Préstamos"]) await page.getByRole("navigation", { name: "Secciones de nómina" }).getByRole("link", { name: t }).waitFor();

  // 2) Clic en el renglón (fuera del nombre) → página de detalle. Aprobar en 5 pagos (ve el plan nuevo) → por firmar.
  await page.getByRole("row", { name: "Préstamo de Ana Torres" }).getByRole("cell").nth(1).click();
  await page.waitForURL("**/panel/nomina/prestamos/3");
  await page.getByText("Consulta médica").waitFor();
  await page.getByText("Acordado en").waitFor();
  await page.getByText("6 quincenas de $500.00").first().waitFor();
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await page.getByLabel("¿En cuántos pagos?").fill("5");
  await page.getByText("5 quincenas de $600.00").waitFor();
  await page.getByRole("button", { name: "Aprobar y enviar acuerdo" }).click();
  await page.getByText("Esperando su firma en Mi espacio").waitFor();
  const aprobado = estado.posts.find((x) => x.accion === "aprobar");
  assert.deepEqual([aprobado.id, aprobado.monto, aprobado.num_pagos, aprobado.abono, aprobado.version], [3, 3000, 5, undefined, 1]);
  await page.getByRole("link", { name: "Préstamos" }).first().click();
  await page.waitForURL(/\/panel\/nomina\/prestamos$/);

  // 3) Beto (vigente, de antes: sin num_pagos): plan calculado, historial y abono en efectivo, en su página.
  await page.getByRole("row", { name: "Préstamo de Beto Ruiz" }).getByRole("cell").nth(3).click();
  await page.waitForURL("**/panel/nomina/prestamos/2");
  await page.getByText("Descuento en nómina").first().waitFor();
  await page.getByText("(calculado con el abono)").waitFor();
  await page.getByText("Abono por semana").waitFor();
  assert.equal(await page.getByRole("button", { name: "Cancelar préstamo" }).count(), 0, "RH no cancela uno vigente");
  await page.getByRole("button", { name: "Registrar abono en efectivo" }).click();
  await page.getByLabel("Importe").fill("200");
  await page.getByRole("button", { name: "Registrar abono" }).click();
  await page.getByText("Abono registrado.").waitFor();
  await page.getByRole("cell", { name: "Abono en efectivo" }).waitFor();
  await captura(page, "prestamos-detalle");
  await page.goBack();
  await page.waitForURL(/\/panel\/nomina\/prestamos$/);

  // 4) Registrar uno nuevo en su PÁGINA: persona; «¿En cuántos pagos?» con la palabra del periodo; plan al centavo,
  //    calendario, aviso del tope con «Usar 14 quincenas»; opción del abono; al guardar va a su detalle.
  await page.getByRole("link", { name: "Registrar préstamo" }).click();
  await page.waitForURL("**/panel/nomina/prestamos/nuevo?empresa=7");
  assert.equal(await page.getByRole("dialog").count(), 0, "ya no es una ventana flotante");
  const form = page.locator("[data-formulario-prestamo]");
  await form.getByRole("combobox").fill("carla");
  await form.getByRole("option", { name: /Carla Paz/ }).click();
  await form.getByText("Carla Paz").waitFor();
  await form.getByLabel("Monto prestado").fill("5000");
  await form.getByLabel("¿En cuántos pagos?").fill("6");
  await form.getByText("6 quincenas de $833.33 · la última de $833.35").waitFor();
  await form.getByText("Primer descuento:").first().waitFor();
  await form.getByText("16 al 28 feb 2027").waitFor();
  assert.equal(await form.locator("#rh-prestamo-pagos-ayuda").textContent(), "quincenas", "la palabra del periodo de la persona");
  await form.getByText(/pasa del tope de la ley para cada quincena/).waitFor();
  await revisarFormulario(page, 1440, "Registrar préstamo (RH)");
  await captura(page, "prestamos-registrar-1440");
  await form.getByRole("button", { name: "Usar 14 quincenas" }).click();
  assert.equal(await form.getByLabel("¿En cuántos pagos?").inputValue(), "14");
  await form.getByText("14 quincenas de $357.14 · la última de $357.18").waitFor();
  assert.equal(await form.getByText(/pasa del tope/).count(), 0, "con 14 ya cabe");
  // Opción secundaria: escribir el abono; el número de pagos se calcula.
  await form.getByRole("button", { name: "Prefiero poner cuánto por nómina" }).click();
  await form.getByLabel("Abono por quincena").fill("350");
  await form.getByText("15 quincenas de $350.00 · la última de $100.00").waitFor();
  await form.getByRole("button", { name: "Prefiero decir en cuántos pagos" }).click();
  assert.equal(await form.getByLabel("¿En cuántos pagos?").inputValue(), "14", "conserva lo escrito");
  // Validación: entero ≥ 1 (no se manda nada).
  await form.getByLabel("¿En cuántos pagos?").fill("0");
  const antes = estado.posts.filter((x) => x.accion === "crear").length;
  await form.getByRole("button", { name: "Registrar y enviar a firma" }).click();
  await form.getByText("Escribe el monto y en cuántos pagos").waitFor();
  assert.equal(estado.posts.filter((x) => x.accion === "crear").length, antes);
  await form.getByLabel("¿En cuántos pagos?").fill("14");
  await form.getByText("14 quincenas de $357.14").waitFor();
  await form.getByRole("button", { name: "Registrar y enviar a firma" }).click();
  await page.waitForURL("**/panel/nomina/prestamos/4");
  await page.getByText(/Préstamo P-4/).waitFor();
  const creado = estado.posts.find((x) => x.accion === "crear");
  assert.deepEqual([creado.id_empleado, creado.monto, creado.num_pagos, creado.abono], [17, 5000, 14, undefined]);
  await page.getByText("14 quincenas de $357.14 · la última de $357.18").first().waitFor();
  await ctx.close();

  // 4b) El mismo formulario en celular (390): barra fija con la acción principal; Cancelar con cambios pregunta.
  const cm = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX" });
  await cm.addCookies([{ name: "token", value: jwt("Recruiter"), url: base }]);
  await rutas(cm, rh);
  const pm = await cm.newPage();
  pm.on("pageerror", (e) => errores.push(e.message));
  await pm.goto(base + "/panel/nomina/prestamos/nuevo?empresa=7", { waitUntil: "domcontentloaded" });
  const fm = pm.locator("[data-formulario-prestamo]");
  await fm.getByRole("combobox").waitFor({ timeout: 20000 });
  await fm.getByRole("combobox").fill("carla");
  await fm.getByRole("option", { name: /Carla Paz/ }).click();
  await fm.getByLabel("Monto prestado").fill("5000");
  await fm.getByLabel("¿En cuántos pagos?").fill("6");
  await fm.getByText("6 quincenas de $833.33 · la última de $833.35").waitFor();
  await pm.locator("[data-barra-movil]").getByRole("button", { name: "Registrar y enviar a firma" }).waitFor();
  await revisarFormulario(pm, 390, "Registrar préstamo (RH)");
  await captura(pm, "prestamos-registrar-390");
  await pm.locator("[data-barra-movil]").getByRole("button", { name: "Cancelar" }).click();
  await pm.getByText("Tienes cambios sin guardar").waitFor();
  await pm.getByRole("button", { name: "Salir sin guardar" }).click();
  await pm.waitForURL(/\/panel\/nomina\/prestamos$/);
  await cm.close();

  // 5) Empleado en celular: ve su préstamo por firmar con su plan, firma su acuerdo; no ve «Pedir» con uno abierto.
  const ce = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX" });
  await ce.addCookies([{ name: "token", value: jwt("Empleado"), url: base }]);
  await rutas(ce, () => ({ id_usuario: 15, id_empleado: 15, tipo_usuario: "Empleado", nombre: "Ana Torres", empresas: [7] }));
  const pe = await ce.newPage();
  pe.on("pageerror", (e) => errores.push(e.message));
  await pe.goto(base + "/empleado/panel/mis-prestamos", { waitUntil: "domcontentloaded" });
  await pe.getByText("Firma tu acuerdo").waitFor({ timeout: 20000 });
  await pe.getByText("5 quincenas", { exact: true }).waitFor();
  await pe.getByText("Primer descuento:").first().waitFor();
  assert.equal(await pe.getByRole("button", { name: "Pedir un préstamo" }).count(), 0, "uno a la vez");
  assert.ok(await pe.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde en celular");
  await captura(pe, "prestamos-mi-espacio");
  await pe.getByRole("button", { name: "Firmar acuerdo" }).click();
  await pe.waitForURL("**/firmar/tok-prestamo");
  await ce.close();

  // 6) Otra persona sin préstamos lo pide en quincenas (390 y 1440): plan del servidor mientras escribe y envío.
  for (const ancho of [390, 1440]) {
    const cd = await browser.newContext({ viewport: { width: ancho, height: ancho < 1024 ? 844 : 900 }, locale: "es-MX" });
    await cd.addCookies([{ name: "token", value: jwt("Empleado"), url: base }]);
    await rutas(cd, () => ({ id_usuario: 18, id_empleado: 18, tipo_usuario: "Empleado", nombre: "Diana Flores", empresas: [7] }));
    const pd = await cd.newPage();
    pd.on("pageerror", (e) => errores.push(e.message));
    await pd.goto(base + "/empleado/panel/mis-prestamos", { waitUntil: "domcontentloaded" });
    await pd.getByRole("button", { name: "Pedir un préstamo" }).click({ timeout: 20000 });
    await pd.getByLabel("¿Cuánto necesitas?").fill("3000");
    await pd.getByLabel("¿En cuántas quincenas lo quieres pagar?").fill("6");
    await pd.getByText("6 quincenas de $500.00").waitFor();
    await pd.getByText("Primer descuento:").first().waitFor();
    await pd.getByLabel("¿Para qué lo necesitas?").fill("Útiles escolares");
    await revisarFormulario(pd, ancho, "Pedir un préstamo (Mi espacio)");
    await captura(pd, `prestamos-pedir-${ancho}`);
    await pd.getByRole("button", { name: "Prefiero poner cuánto por nómina" }).click();
    await pd.getByLabel("¿Cuánto te pueden descontar en cada quincena?").fill("1000");
    await pd.getByText("3 quincenas de $1,000.00").waitFor();
    await pd.getByText(/pasa del tope de la ley/).waitFor();
    await pd.getByRole("button", { name: "Usar 8 quincenas" }).click();
    await pd.getByText("8 quincenas de $375.00").waitFor();
    await pd.getByRole("button", { name: "Enviar solicitud" }).click();
    await pd.getByText("Listo, tu solicitud se envió a Recursos Humanos.").waitFor();
    const pedido = estado.posts.filter((x) => x.accion === "pedir").at(-1);
    assert.deepEqual([pedido.monto, pedido.num_pagos, pedido.abono, pedido.motivo], [3000, 8, undefined, "Útiles escolares"]);
    await cd.close();
  }

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK préstamos: lista y filtros, aprobar en N pagos, plan calculado de uno viejo, abono en efectivo, RH no cancela vigente, registrar en página (6 quincenas = 5 × $833.33 + $833.35, calendario, tope → «Usar 14 quincenas», modo abono, entero ≥ 1), celular con barra fija y guardia de salida, Mi espacio → plan y firmar, pedir en quincenas (390 y 1440); letra 16/17 px, botones 48 px, títulos 700, sin degradados ni desborde");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
