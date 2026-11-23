// Verificación en navegador de «Módulos por empresa» (03/12/2026, opción C). Backend simulado (nada sale a internet):
//   1. RH apaga Nómina (con confirmación «no se borra nada») y desaparece del menú; al recargar no parpadea.
//   2. Entrar con la dirección a un módulo apagado muestra «Este módulo no está activo…» con botón a Módulos (sin pedir datos).
//   3. Lo que no tiene: candado y «Contratar» (WhatsApp de ventas).
//   4. Admin: define los módulos de un plan e incluye un extra (con nota) en el detalle de una empresa.
//   5. App del empleado sin el módulo (barra, Mi espacio y ruta directa).
//   6. 390 px: sin desborde horizontal y botones de 44 px o más.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx NEXT_PUBLIC_RECRUITMENT_ENABLED=true npm run build
//      CAPTURAS=/ruta/capturas node scripts/verify-modulos.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { MODULOS, OPCIONALES } from "../src/lib/modulos/catalogo.mjs";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
const API = "https://api.prueba.invalid";
const require = createRequire(REPO + "/package.json");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, [REPO + "/node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { cwd: REPO, stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, nombre) => (OUT ? pg.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: true }) : null);
// Sin id_empresa en el token: el layout de RH no consulta la base de datos (ver panel/layout.jsx).
const firmar = (tipo) => {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
};

const empresa = { id_empresa: 10, nombre: "Uniline", estado: "Activo", zona_horaria: "America/Mexico_City" };
const rh = { id_usuario: 7, tipo_usuario: "Recruiter", nombre: "Laura RH", id_empresa: 10, empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const ana = { id_usuario: 15, id_empleado: 15, tipo_usuario: "Empleado", nombre: "Ana Torres", correo: "ana@x.mx", id_empresa: 10, empresas: [10], zona_horaria: "America/Mexico_City" };
const admin = { id_usuario: 1, tipo_usuario: "Admin", nombre: "Soporte ADAMIA" };

// ——— Estado simulado del servidor (misma forma que /api/checador/modulos) ———
const S = {
  uso: Object.fromEntries(OPCIONALES.map((c) => [c, c !== "tareas"])),
  derecho: Object.fromEntries(OPCIONALES.map((c) => [c, c !== "documentos"])), // Gestión documental: no incluida en su plan
  extra: {},
  planes: [{ id: 1, usuarios_min: 1, usuarios_max: 20, precio_base: 999, configurado: false }, { id: 2, usuarios_min: 21, usuarios_max: null, precio_base: 1999, configurado: false }],
  planModulos: {},
  pedidos: [],
};
const lista = () => MODULOS.map((m) => {
  if (m.base) return { ...m, derecho: true, activo: true, uso: true, origen: "base", contratar: false, nota: null };
  const derecho = S.extra[m.clave]?.derecho === "incluir" ? true : S.derecho[m.clave];
  return { ...m, derecho, uso: S.uso[m.clave], activo: derecho && S.uso[m.clave], origen: S.extra[m.clave] ? "extra" : "plan", contratar: !derecho, nota: S.extra[m.clave]?.nota ?? null };
});
const activos = () => lista().filter((m) => m.activo).map((m) => m.clave);
const sesion = (u) => (u.tipo_usuario === "Admin" ? { todos: true, modulos: {} } : { todos: false, modulos: { 10: activos() } });
const respuesta = () => ({ ok: true, empresa: 10, plan: { id: 1, configurado: S.planes[0].configurado }, modulos: lista() });

async function mocks(ctx, usuario) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base) return json({});
    if (url.origin !== API) return route.abort();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace(/^\/api/, "");
    const cuerpo = (() => { try { return req.postData() ? JSON.parse(req.postData()) : null; } catch { return null; } })();
    S.pedidos.push({ metodo: req.method(), p, q: url.search, cuerpo });
    let m;
    if (p === "/users/verify/token") return json({ message: "Token válido", user: usuario, modulos: sesion(usuario) });
    if (p === "/checador/modulos/activos") return json({ ok: true, ...sesion(usuario) });
    if (p === "/checador/modulos" && req.method() === "GET") return json({ ...respuesta(), puede_cambiar: true });
    if ((m = p.match(/^\/checador\/modulos\/([a-z_]+)$/)) && req.method() === "PUT") {
      S.uso[m[1]] = cuerpo.activo;
      return json({ ...respuesta(), puede_cambiar: true });
    }
    if (p === "/checador/modulos/admin/planes") {
      return json({ ok: true, planes: S.planes.map((pl) => ({ ...pl, modulos: OPCIONALES.map((c) => ({ clave: c, nombre: MODULOS.find((x) => x.clave === c).nombre, incluido: pl.configurado ? S.planModulos[pl.id].includes(c) : true })) })) });
    }
    if ((m = p.match(/^\/checador\/modulos\/admin\/planes\/(\d+)\/modulos$/)) && req.method() === "PUT") {
      const pl = S.planes.find((x) => x.id === Number(m[1]));
      pl.configurado = true;
      S.planModulos[pl.id] = cuerpo.incluidos;
      return json({ ok: true, plan: pl });
    }
    if ((m = p.match(/^\/checador\/modulos\/admin\/empresas\/10\/modulos(?:\/([a-z_]+))?$/))) {
      if (req.method() === "PUT") S.extra[m[1]] = { derecho: cuerpo.derecho, nota: cuerpo.nota };
      return json({ ...respuesta(), cambios: Object.entries(S.extra).map(([clave, e], i) => ({ id: i + 1, modulo: clave, tipo: "derecho", antes: "plan", despues: e.derecho, nota: e.nota, nombre_usuario: "Soporte ADAMIA", creado_en: "2026-12-03 10:00:00" })) });
    }
    if (p === "/empresas") return json({ total: 1, data: [{ id_empresa: 10, nombre_empresa: "Uniline", estado: "Activo", celular: "", correo_empresa: "rh@uniline.mx" }] });
    if (p.startsWith("/empresas/10/")) return json({ data: {} });
    return json({});
  });
}

const tamano = async (loc) => (await loc.boundingBox())?.height ?? 0;
const sinDesborde = (pg) => pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
let exito = false;
const errores = [];
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  // ——— 1. RH apaga Nómina y desaparece del menú ———
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await mocks(ctx, rh);
  // Registra si «Nóminas» llega a aparecer en el menú en algún momento (para el parpadeo al recargar).
  await ctx.addInitScript(() => {
    window.__vistos = [];
    new MutationObserver(() => {
      const menu = document.querySelector('[data-sidebar="content"]');
      if (menu && /Nóminas/.test(menu.textContent || "")) window.__vistos.push(Date.now());
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  const menu = page.locator('[data-sidebar="content"]').first();
  await page.goto(base + "/panel/modulos", { waitUntil: "domcontentloaded" });
  const nomina = page.locator('li[data-modulo="nomina"]');
  await nomina.waitFor({ timeout: 30000 });
  await menu.getByRole("button", { name: "Nóminas", exact: true }).waitFor();
  assert.equal(await menu.getByRole("button", { name: "Módulos", exact: true }).count(), 1, "Ajustes → Módulos en el menú");
  assert.match(await page.locator('li[data-modulo="asistencias"]').innerText(), /Incluido siempre/);
  assert.equal(await page.locator('li[data-modulo="asistencias"] [role="switch"]').count(), 0, "lo base no se apaga");
  await nomina.getByRole("switch").click();
  const dialogo = page.getByRole("alertdialog");
  await dialogo.waitFor();
  assert.match(await dialogo.innerText(), /Se ocultará para todos .*no se borra nada/);
  await captura(page, "modulos-01-confirmar-apagar");
  await dialogo.getByRole("button", { name: "Apagar" }).click();
  await page.waitForFunction(() => document.querySelector('li[data-modulo="nomina"] [role="switch"]')?.getAttribute("aria-checked") === "false");
  assert.deepEqual(S.pedidos.filter((x) => x.metodo === "PUT").at(-1), { metodo: "PUT", p: "/checador/modulos/nomina", q: "", cuerpo: { empresa: 10, activo: false } });
  await menu.getByRole("button", { name: "Nóminas", exact: true }).waitFor({ state: "detached", timeout: 10000 });
  assert.equal(await menu.getByRole("button", { name: "Aguinaldos", exact: true }).count(), 0, "todo el grupo Nómina se va");
  await captura(page, "modulos-02-nomina-apagada");

  // Recargar: el menú se arma ya sin Nómina (nunca aparece y luego se quita).
  await page.reload({ waitUntil: "domcontentloaded" });
  await menu.getByRole("button", { name: "Empleados", exact: true }).waitFor({ timeout: 30000 });
  await dormir(800);
  assert.deepEqual(await page.evaluate(() => window.__vistos), [], "sin parpadeo de Nómina al cargar");

  // ——— 3. Candado y Contratar ———
  const docs = page.locator('li[data-modulo="documentos"]');
  await docs.waitFor();
  assert.match(await docs.innerText(), /No incluido en tu plan/);
  const contratar = docs.getByRole("link", { name: "Contratar" });
  const href = await contratar.getAttribute("href");
  assert.ok(href.startsWith("https://wa.me/523171288029?text="), href);
  assert.match(decodeURIComponent(href), /contratar el módulo de Gestión documental de ADAMIA para Uniline/);
  assert.equal(await menu.getByRole("button", { name: "Biblioteca documental", exact: true }).count(), 0, "sin derecho tampoco está en el menú");

  // ——— 2. Ruta directa a un módulo apagado ———
  const antes = S.pedidos.length;
  await page.goto(base + "/panel/nomina/bonos", { waitUntil: "domcontentloaded" });
  const aviso = page.locator("[data-modulo-inactivo='nomina']");
  await aviso.waitFor({ timeout: 30000 });
  assert.match(await aviso.innerText(), /Este módulo no está activo para tu empresa/);
  await aviso.getByRole("link", { name: "Ir a Módulos" }).waitFor();
  assert.equal(S.pedidos.slice(antes).filter((x) => x.p.startsWith("/checador/nomina")).length, 0, "la pantalla de Nómina ni se monta");
  await captura(page, "modulos-03-ruta-apagada");
  await page.goto(base + "/panel/gestion-documental/plantillas", { waitUntil: "domcontentloaded" });
  const avisoDocs = page.locator("[data-modulo-inactivo='documentos']");
  await avisoDocs.getByRole("link", { name: "Contratar" }).waitFor({ timeout: 30000 });
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await menu.getByRole("button", { name: "Asistencias", exact: true }).waitFor({ timeout: 30000 });
  assert.equal(await page.locator("[data-modulo-inactivo]").count(), 0, "la base siempre abre");
  await ctx.close();

  // ——— 6. RH en 390 px ———
  const movil = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await movil.addCookies([{ name: "token", value: firmar("Recruiter"), url: base }]);
  await mocks(movil, rh);
  const tel = await movil.newPage();
  tel.on("pageerror", (e) => errores.push(e.message));
  await tel.goto(base + "/panel/modulos", { waitUntil: "domcontentloaded" });
  await tel.locator('li[data-modulo="vacaciones"]').waitFor({ timeout: 30000 });
  assert.ok(await sinDesborde(tel), "Módulos sin desborde a 390 px");
  for (const s of await tel.getByRole("switch").all()) assert.ok(await tamano(s) >= 44, "interruptor ≥ 44 px");
  assert.ok(await tamano(tel.locator('li[data-modulo="documentos"]').getByRole("link", { name: "Contratar" })) >= 44, "Contratar ≥ 44 px");
  await captura(tel, "modulos-04-movil");
  await tel.goto(base + "/panel/nomina", { waitUntil: "domcontentloaded" });
  await tel.locator("[data-modulo-inactivo='nomina']").waitFor({ timeout: 30000 });
  assert.ok(await sinDesborde(tel), "aviso sin desborde a 390 px");
  assert.ok(await tamano(tel.getByRole("link", { name: "Ir a Módulos" })) >= 44);
  await movil.close();

  // ——— 4. Admin: plan y extra ———
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctxA.addCookies([{ name: "token", value: firmar("Admin"), url: base }]);
  await mocks(ctxA, admin);
  const pa = await ctxA.newPage();
  pa.on("pageerror", (e) => errores.push(e.message));
  await pa.goto(base + "/dashboard/modulos", { waitUntil: "domcontentloaded" });
  const plan1 = pa.locator('li[data-plan="1"]');
  await plan1.waitFor({ timeout: 30000 });
  assert.match(await plan1.innerText(), /Sin configurar: incluye todo/);
  await plan1.getByLabel("Nómina").uncheck();
  await plan1.getByRole("button", { name: "Guardar plan" }).click();
  await pa.waitForFunction(() => /Configurado/.test(document.querySelector('li[data-plan="1"]')?.textContent || ""));
  const guardado = S.pedidos.filter((x) => x.metodo === "PUT" && x.p === "/checador/modulos/admin/planes/1/modulos").at(-1);
  assert.deepEqual(guardado.cuerpo.incluidos.sort(), OPCIONALES.filter((c) => c !== "nomina").sort());
  await captura(pa, "modulos-05-admin-plan");
  await pa.goto(base + "/dashboard/empresas", { waitUntil: "domcontentloaded" });
  await pa.getByRole("button", { name: "Uniline", exact: true }).first().click({ timeout: 30000 });
  await pa.getByRole("tab", { name: "Módulos" }).click();
  const docsA = pa.locator('[data-admin-modulos="10"] li[data-modulo="documentos"]');
  await docsA.waitFor({ timeout: 30000 });
  assert.match(await docsA.innerText(), /Sin derecho/);
  await docsA.getByRole("button", { name: "Incluir como extra" }).click();
  await docsA.getByRole("textbox").fill("Contrató Gestión documental (folio 881)");
  await docsA.getByRole("button", { name: "Guardar" }).click();
  await pa.waitForFunction(() => /Extra de esta empresa/.test(document.querySelector('[data-admin-modulos="10"] li[data-modulo="documentos"]')?.textContent || ""));
  assert.deepEqual(S.pedidos.filter((x) => x.metodo === "PUT" && x.p === "/checador/modulos/admin/empresas/10/modulos/documentos").at(-1).cuerpo, { derecho: "incluir", nota: "Contrató Gestión documental (folio 881)" });
  await pa.getByText(/extra incluido · «Contrató Gestión documental/).waitFor();
  await captura(pa, "modulos-06-admin-extra");
  await ctxA.close();

  // ——— 5. App del empleado sin Tareas ni Nómina (390 px) ———
  const ctxE = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctxE.addCookies([{ name: "token", value: firmar("Empleado"), url: base }]);
  await mocks(ctxE, ana);
  const pe = await ctxE.newPage();
  pe.on("pageerror", (e) => errores.push(e.message));
  await pe.goto(base + "/empleado/panel/mi-espacio", { waitUntil: "domcontentloaded" });
  const barra = pe.getByRole("navigation", { name: "Navegación del colaborador" });
  await barra.getByRole("link", { name: "Mi espacio" }).waitFor({ timeout: 30000 });
  assert.equal(await barra.getByRole("link", { name: "Tareas" }).count(), 0, "Tareas apagado: fuera de la barra");
  assert.equal(await barra.getByRole("link").count(), 4);
  await pe.getByText("Mi firma y PIN").waitFor();
  assert.equal(await pe.getByText("Mis recibos de pago").count(), 0, "Nómina apagada: sin recibos");
  assert.equal(await pe.getByText("Mis préstamos").count(), 0);
  await pe.getByText("Mis activos y uniformes").waitFor();
  assert.ok(await sinDesborde(pe), "Mi espacio sin desborde a 390 px");
  for (const l of await barra.getByRole("link").all()) assert.ok(await tamano(l) >= 44, "barra ≥ 44 px");
  await captura(pe, "modulos-07-empleado");
  await pe.goto(base + "/empleado/panel/mis-recibos", { waitUntil: "domcontentloaded" });
  const avisoE = pe.locator("[data-modulo-inactivo='nomina']");
  await avisoE.waitFor({ timeout: 30000 });
  assert.match(await avisoE.innerText(), /pídele a Recursos Humanos/);
  assert.equal(await avisoE.getByRole("link", { name: "Ir a Módulos" }).count(), 0, "el empleado no ve el botón de Módulos");
  assert.ok(await sinDesborde(pe));
  await ctxE.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK: Módulos por empresa — apagar Nómina la quita del menú (sin parpadeo), ruta directa con aviso, candado con Contratar, Admin define plan y extra, app del empleado sin el módulo, 390 px.");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
