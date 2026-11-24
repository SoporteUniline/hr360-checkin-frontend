// Verificación en navegador real (Chromium + Next compilado) de Asistencias → «Horas por reponer» (maqueta aprobada
// Main.dc.html, 25/11/2026; solo el contenido de la pestaña):
//  · La pestaña junto a Registros y Horas de ley, con el número de personas que deben; se abre con ?vista=reponer.
//  · Resumen: total con personas, «Más de 30 días» en rojo, repuesto y rebajado / condonado del mes.
//  · Filas (persona y área, debe, desde con «hace N días» en rojo desde 30, por qué, lo último) y filtros (búsqueda, área,
//    «Solo más de 30 días»).
//  · Fila desplegada: movimientos del más viejo al más nuevo, saldo y «Qué hacer con lo que debe».
//  · Registrar reposición (PUT de horas extra exacto), Rebajar y Condonar (POST exactos), Deshacer un cierre, Cancelar un
//    permiso (PATCH exacto), Exportar Excel (archivo leído con exceljs) y «Ver en Panel empleado».
//  · 1440 y 390 (tarjetas) sin desbordes, botones de 44 px en celular; sin errores de JS.
// Backend simulado con page.route; ninguna petición sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-horas-reponer.mjs
// CAPTURAS=<carpeta> guarda capturas (1440 y 390).
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const ExcelJS = require("exceljs");

const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const capturas = process.env.CAPTURAS;
const foto = async (page, nombre, loc = null) => {
  if (!capturas) return;
  await dormir(400);
  if (loc) await loc.screenshot({ path: `${capturas}/${nombre}.png` });
  else await page.screenshot({ path: `${capturas}/${nombre}.png`, fullPage: true });
};

function token() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Méndez", id_empleado: 7, empresas: [10],
  empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

// ——— Estado del backend simulado (cambia con cada acción, como el real) ———
const HOY = "2026-11-24";
const persona = (id, nombre, area, desde, dias, motivos, permisos) => ({ id_empleado: id, id_empresa: 10, nombre, area, puesto: null, dado_de_baja: false,
  desde, dias, viejo: dias >= 30, permisos, motivos });
const cuentas = {
  15: { persona: persona(15, "Carlos Terriquez", "Marketing", "2026-10-21", 34, ["Visita al médico", "Trámite"], 2),
    cargos: [
      { id_solicitud: 101, fecha: "2026-10-21", tipo_horas: "sale_antes", hora_inicio: "13:00", hora_fin: null, minutos: 240, estado: "calculado", motivo: "Visita al médico" },
      { id_solicitud: 102, fecha: "2026-11-05", tipo_horas: "llega_tarde", hora_inicio: null, hora_fin: "12:00", minutos: 180, estado: "calculado", motivo: "Trámite" },
    ],
    reposiciones: [{ id_asistencia: null, id_horas_extra: 4, fecha: "2026-11-12", minutos: 60, registrado: 60, desde: "17:00", hasta: "18:00",
      motivo: "Se quedó", origen: "registro" }],
    cierres: [{ id: 3, tipo: "condonacion", minutos: 30, nota: "Buen trabajo", creado_por_nombre: "Laura Méndez", creado_en: "2026-11-20 10:00:00", borrado_en: null }] },
  16: { persona: persona(16, "Alondra Munguía", "Ventas", "2026-11-10", 14, ["Permiso personal"], 3),
    cargos: [{ id_solicitud: 201, fecha: "2026-11-10", tipo_horas: "llega_tarde", hora_fin: "11:00", minutos: 420, estado: "calculado", motivo: "Permiso personal" }],
    reposiciones: [], cierres: [] },
  17: { persona: persona(17, "Frida Serrano", "Ventas", "2026-11-17", 7, ["Escuela de los hijos"], 1),
    cargos: [{ id_solicitud: 301, fecha: "2026-11-17", tipo_horas: "sale_antes", hora_inicio: "12:00", minutos: 300, estado: "calculado", motivo: "Escuela de los hijos" }],
    reposiciones: [{ id_asistencia: 77, fecha: "2026-11-20", minutos: 30 }], cierres: [] },
  18: { persona: persona(18, "Luis García", "Development", "2026-11-22", 2, ["Trámite"], 1),
    cargos: [{ id_solicitud: 401, fecha: "2026-11-22", tipo_horas: "llega_tarde", hora_fin: "10:00", minutos: 60, estado: "calculado", motivo: "Trámite" }],
    reposiciones: [], cierres: [] },
};
const suma = (l) => l.reduce((t, x) => t + Number(x.minutos), 0);
function cuenta(id) {
  const c = cuentas[id];
  const vigentes = c.cierres.filter((x) => !x.borrado_en);
  const total_cargos = suma(c.cargos);
  const total_repuesto = suma(c.reposiciones);
  const total_cerrado = suma(vigentes);
  return { debe: Math.max(0, total_cargos - total_repuesto - total_cerrado), total_cargos, total_repuesto, total_cerrado,
    cargos: c.cargos, reposiciones: c.reposiciones, cierres: c.cierres };
}
function porReponer() {
  const filas = Object.keys(cuentas).map(Number).map((id) => {
    const c = cuenta(id);
    const u = [...cuentas[id].reposiciones].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
    return { ...cuentas[id].persona, debe: c.debe, ultima_reposicion: u ? { fecha: u.fecha, minutos: u.minutos } : null };
  }).filter((f) => f.debe > 0).sort((a, b) => a.desde.localeCompare(b.desde));
  const viejos = filas.filter((f) => f.viejo);
  const todos = Object.keys(cuentas).map((id) => cuentas[id]);
  const delMes = (f) => String(f).startsWith("2026-11");
  const cerrado = (tipo) => suma(todos.flatMap((c) => c.cierres.filter((x) => !x.borrado_en && x.tipo === tipo && delMes(x.creado_en))));
  const reps = todos.flatMap((c) => c.reposiciones.filter((r) => delMes(r.fecha)));
  return { hoy: HOY, mes: "2026-11", filas,
    totales: { debe: suma(filas.map((f) => ({ minutos: f.debe }))), personas: filas.length,
      mas_de_30: { personas: viejos.length, minutos: suma(viejos.map((f) => ({ minutos: f.debe }))), desde: viejos[0]?.desde ?? null },
      mes: { repuesto: suma(reps), reposiciones: reps.length, rebajado: cerrado("rebaja"), condonado: cerrado("condonacion"), otro: cerrado("otro") } },
    autorizadores: { 10: [{ id: 3, nombre: "Jefa Soto" }, { id: 7, nombre: "Laura Méndez" }] } };
}

const pet = { reponer: [], cierres: [], deshacer: [], estado: [], porReponer: [] };
const errores = [];
let exito = false;
let siguienteId = 50;
const browser = await chromium.launch();

async function simular(page) {
  page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base,
      "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    const cuerpo = () => JSON.parse(req.postData() || "{}");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/cuenta-horas/por-reponer")) { pet.porReponer.push(url.search); return json({ ok: true, data: porReponer() }); }
    let m = /\/checador\/cuenta-horas\/cierres\/(\d+)\/deshacer$/.exec(p);
    if (m && req.method() === "POST") {
      const id = Number(m[1]);
      pet.deshacer.push(id);
      for (const c of Object.values(cuentas)) for (const x of c.cierres) if (x.id === id) Object.assign(x, { borrado_en: "2026-11-24 12:00:00", borrado_por_nombre: "Laura Méndez" });
      return json({ ok: true });
    }
    m = /\/checador\/cuenta-horas\/(\d+)\/cierres$/.exec(p);
    if (m && req.method() === "POST") {
      const id = Number(m[1]); const c = cuerpo();
      pet.cierres.push({ id, cuerpo: c });
      cuentas[id].cierres.push({ id: siguienteId++, tipo: c.tipo, minutos: c.minutos, nota: c.nota ?? null, creado_por_nombre: "Laura Méndez",
        creado_en: "2026-11-24 12:00:00", borrado_en: null });
      return json({ ok: true, data: cuenta(id) });
    }
    m = /\/checador\/cuenta-horas\/(\d+)$/.exec(p);
    if (m) return json({ ok: true, data: cuenta(Number(m[1])) });
    if (p.endsWith("/checador/cuenta-horas")) return json({ ok: true, data: {} });
    m = /\/checador\/horas-extra\/empleado\/(\d+)$/.exec(p);
    if (m && req.method() === "GET") {
      const f = url.searchParams.get("desde");
      return json({ ok: true, registros: [], propuestas: [], jornadas: { [f]: { entrada: "09:00", salida: "17:00" } }, avisos: [], semana: [] });
    }
    if (m && req.method() === "PUT") {
      const id = Number(m[1]); const c = cuerpo();
      pet.reponer.push({ id, cuerpo: c });
      const r = c.registros[0];
      const min = (s) => Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16));
      cuentas[id].reposiciones.push({ id_asistencia: null, id_horas_extra: siguienteId++, fecha: r.fecha, minutos: min(r.hasta) - min(r.desde),
        registrado: min(r.hasta) - min(r.desde), desde: r.desde.slice(11), hasta: r.hasta.slice(11), motivo: r.motivo, origen: "registro" });
      return json({ ok: true, registros: [], avisos: [] });
    }
    m = /\/checador\/solicitudes-permiso\/(\d+)\/estado$/.exec(p);
    if (m && req.method() === "PATCH") {
      const id = Number(m[1]);
      pet.estado.push({ id, cuerpo: cuerpo() });
      for (const c of Object.values(cuentas)) c.cargos = c.cargos.filter((x) => x.id_solicitud !== id);
      return json({ message: "Estado actualizado" });
    }
    if (p.endsWith("/checador/asistencias") && req.method() === "GET") return json({ registros: [], total: 0, page: 1, aplicarPaginacion: true });
    if (p.endsWith("/checador/empleados")) return json({ data: [{ id_empleado: 7, nombre: "Laura", apellido_paterno: "Méndez" }], total: 1 });
    if (p.endsWith("/checador/tiposPermiso")) return json({ tiposPermiso: [], total: 0 });
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
}

async function sinDesborde(loc, etiqueta) {
  const sobra = await loc.evaluate((el) => el.scrollWidth - el.clientWidth);
  assert.ok(sobra <= 1, `${etiqueta}: desplazamiento horizontal (${sobra}px)`);
}
// Nada se sale de la pantalla ni de su caja (textos cortados).
async function nadaSeSale(page, raiz, etiqueta) {
  const ancho = await page.evaluate(() => document.documentElement.clientWidth);
  const fuera = await page.locator(raiz).evaluate((el, w) => [...el.querySelectorAll("*")].filter((e) => e.offsetParent && e.getClientRects().length)
    .filter((e) => { const r = e.getBoundingClientRect(); return r.right > w + 1 || r.left < -1; })
    .map((e) => `${e.tagName}.${String(e.className).slice(0, 30)} «${(e.innerText || "").slice(0, 30)}»`).slice(0, 5), ancho);
  assert.deepEqual(fuera, [], `${etiqueta}: elementos fuera de la pantalla`);
  const cortados = await page.locator(raiz).evaluate((el) => [...el.querySelectorAll("p,span,strong,button,dd,td")].filter((e) => e.offsetParent
    && getComputedStyle(e).overflow !== "visible" && e.scrollWidth > e.clientWidth + 1).map((e) => (e.innerText || "").slice(0, 30)).slice(0, 5));
  assert.deepEqual(cortados, [], `${etiqueta}: textos cortados`);
}
async function esperar(cond, texto) {
  for (let i = 0; i < 80; i++) { if (cond()) return; await dormir(100); }
  throw new Error(`No llegó: ${texto}`);
}
const filasVisibles = (page) => page.locator("tr[data-fila-reponer]").evaluateAll((els) => els.map((e) => Number(e.dataset.filaReponer)));
const textoFila = (page, id) => page.locator(`tr[data-fila-reponer="${id}"]`).innerText();

let carpeta;
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }
  carpeta = await mkdtemp(path.join(tmpdir(), "horas-reponer-"));
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City", acceptDownloads: true });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  await simular(page);

  // 1) Por URL: la pestaña elegida y su número.
  await page.goto(base + "/panel/registro-asistencia?vista=reponer", { waitUntil: "domcontentloaded" });
  await page.locator("[data-vista-reponer]").waitFor({ timeout: 30000 });
  const pestana = page.getByRole("tab", { name: /Horas por reponer/ });
  assert.equal(await pestana.getAttribute("aria-selected"), "true");
  await page.locator('[data-conteo="reponer"]', { hasText: "4" }).waitFor({ timeout: 10000 });
  assert.deepEqual(await page.getByRole("tab").allInnerTexts(), ["Registros", "Horas de ley", "Horas por reponer4"], "junto a las que ya existen");
  assert.ok(pet.porReponer.every((q) => q === "?empresa=all"), `empresa de la sesión: ${pet.porReponer}`);

  // 2) Resumen.
  const tarjeta = (c) => page.locator(`[data-tarjeta="${c}"]`);
  await tarjeta("total").getByText("18 h").waitFor({ timeout: 10000 });
  assert.match(await tarjeta("total").innerText(), /TOTAL QUE TE DEBEN\s+18 h\s+entre 4 personas/i);
  assert.match(await tarjeta("viejos").innerText(), /1 persona\s+5 h 30 min desde el 21 oct/);
  assert.equal(await tarjeta("viejos").getAttribute("data-tono"), "rojo");
  const fondo = (c) => tarjeta(c).evaluate((e) => getComputedStyle(e).backgroundColor);
  assert.notEqual(await fondo("viejos"), await fondo("total"), "«Más de 30 días» con fondo rojo, distinto de las demás");
  assert.match(await tarjeta("repuesto").innerText(), /1 h 30 min\s+en 2 reposiciones/);
  assert.match(await tarjeta("cerrado").innerText(), /0 min · 30 min\s+este mes/);

  // 3) Filas y filtros.
  assert.deepEqual(await filasVisibles(page), [15, 16, 17, 18], "la más vieja primero");
  const t15 = await textoFila(page, 15);
  for (const s of ["Carlos Terriquez", "Marketing", "5 h 30 min", "21 oct 2026", "hace 34 días", "2 permisos · Visita al médico, Trámite", "Repuso 1 h · 12 nov"]) {
    assert.ok(t15.includes(s), `fila 15: «${s}» en ${t15}`);
  }
  assert.ok((await textoFila(page, 16)).includes("Sin reposiciones"));
  assert.ok((await textoFila(page, 17)).includes("Repuso 30 min · 20 nov"));
  assert.deepEqual(await page.locator("[data-hace]").evaluateAll((els) => els.map((e) => e.dataset.hace)), ["rojo", "normal", "normal", "normal"]);
  await page.getByRole("button", { name: "Solo más de 30 días" }).click();
  assert.deepEqual(await filasVisibles(page), [15]);
  await page.getByRole("button", { name: "Solo más de 30 días" }).click();
  await page.getByLabel("Buscar persona").fill("munguia");
  assert.deepEqual(await filasVisibles(page), [16]);
  await page.getByLabel("Buscar persona").fill("");
  await page.getByLabel("Área").selectOption("Ventas");
  assert.deepEqual(await filasVisibles(page), [16, 17]);
  await page.getByLabel("Área").selectOption("");
  await sinDesborde(page.locator("html"), "1440");
  await sinDesborde(page.locator("[data-tabla-reponer]").locator(".."), "tabla 1440");
  await foto(page, "1440-horas-por-reponer");

  // 4) Fila desplegada.
  await page.locator('tr[data-fila-reponer="15"]').click();
  const det = page.locator('[data-detalle-cuenta="15"]');
  await det.locator("[data-movimiento]").first().waitFor({ timeout: 10000 });
  const movs = await det.locator("[data-movimiento]").allInnerTexts();
  assert.equal(movs.length, 4);
  assert.match(movs[0], /21 oct\s+Sale antes · desde 1:00 p\.m\. · Visita al médico\s+\+4 h\s+Cancelar/);
  assert.match(movs[1], /5 nov\s+Llega tarde · hasta 12:00 p\.m\. · Trámite\s+\+3 h\s+Cancelar/);
  assert.match(movs[2], /12 nov\s+Reposición · se quedó 5:00 p\.m\. a 6:00 p\.m\./);
  assert.match(movs[3], /20 nov\s+Condonado\s+Buen trabajo · por Laura Méndez\s+−30 min\s+Deshacer/);
  assert.match(await det.locator("[data-saldo]").innerText(), /Saldo\s+5 h 30 min/);
  await det.getByRole("region", { name: "Qué hacer con lo que debe" }).waitFor();
  await nadaSeSale(page, '[data-detalle-cuenta="15"]', "detalle 1440");
  await foto(page, "1440-fila-desplegada", page.locator('[data-vista-reponer]'));

  // 5) Registrar reposición (desde el panel «Qué hacer»): se quedó el 12 nov de 5:00 a 6:30 p.m.
  await det.getByRole("button", { name: /Registrar reposición/ }).click();
  const dr = page.locator("[data-dialogo-reposicion]");
  await dr.waitFor();
  assert.equal(await dr.getByLabel("Día de la reposición").inputValue(), HOY);
  await dr.getByLabel("Día de la reposición").fill("2026-11-12");
  await dr.locator("[data-jornada-dia]", { hasText: "Su jornada ese día: 9:00 a.m. a 5:00 p.m." }).waitFor({ timeout: 10000 });
  assert.equal(await dr.getByLabel("Desde qué hora").inputValue(), "17:00", "propone su salida");
  await dr.getByLabel("Hasta qué hora").fill("18:30");
  assert.equal(await dr.getByLabel("Quién autoriza la reposición").inputValue(), "7", "quien está en sesión, si puede autorizar");
  await foto(page, "1440-registrar-reposicion", dr);
  await dr.getByRole("button", { name: "Registrar 1 h 30 min" }).click();
  await esperar(() => pet.reponer.length === 1, "PUT reposición");
  assert.deepEqual(pet.reponer[0], { id: 15, cuerpo: {
    registros: [{ fecha: "2026-11-12", desde: "2026-11-12 17:00", hasta: "2026-11-12 18:30", motivo: "Reposición de horas que debe", origen: "manual_rh" }],
    quitar: [], id_autoriza: 7, forma_pago: "Reposición de tiempo por tiempo" } });
  await page.locator('tr[data-fila-reponer="15"]', { hasText: "4 h" }).waitFor({ timeout: 10000 });
  await det.locator("[data-saldo]", { hasText: "4 h" }).waitFor({ timeout: 10000 });

  // 6) Deshacer el cierre (condonación de 30 min).
  await det.getByRole("button", { name: /Deshacer condonado/ }).click();
  await esperar(() => pet.deshacer.length === 1, "deshacer");
  assert.deepEqual(pet.deshacer, [3]);
  await det.locator("[data-saldo]", { hasText: "4 h 30 min" }).waitFor({ timeout: 10000 });
  await det.getByText("Deshecho por Laura Méndez").waitFor();

  // 7) Cancelar un permiso (5 nov, +3 h).
  await det.getByRole("button", { name: "Cancelar permiso del 5 nov 2026" }).click();
  const dc = page.locator("[data-dialogo-cancelar]");
  await dc.getByText(/Llega tarde · hasta 12:00 p\.m\. · Trámite del 5 nov 2026 de Carlos Terriquez/).waitFor();
  await dc.getByRole("button", { name: "Sí, cancelar permiso" }).click();
  await esperar(() => pet.estado.length === 1, "PATCH estado");
  assert.deepEqual(pet.estado[0], { id: 102, cuerpo: { estado: "Cancelado", actualizado_por: null } });
  await det.locator("[data-saldo]", { hasText: "1 h 30 min" }).waitFor({ timeout: 10000 });
  assert.equal(await det.locator("[data-movimiento]").count(), 4);

  // 8) ⋯ → Rebajar en nómina (1 h, con nota) y Condonar (30 min a Alondra).
  await page.getByRole("button", { name: "Más acciones de Carlos Terriquez" }).click();
  await page.getByRole("menuitem", { name: "Rebajar en nómina" }).click();
  const dRebaja = page.locator('[data-dialogo-cierre="rebaja"]');
  await dRebaja.waitFor();
  assert.equal(await dRebaja.getByLabel("Horas a cerrar").inputValue(), "1", "propone todo lo que debe");
  assert.equal(await dRebaja.getByLabel("Minutos a cerrar").inputValue(), "30");
  await dRebaja.getByLabel("Minutos a cerrar").fill("0");
  await dRebaja.getByLabel("Nota del cierre").fill("siguiente periodo");
  await dRebaja.getByRole("button", { name: "Rebajar en nómina" }).click();
  await esperar(() => pet.cierres.length === 1, "POST rebaja");
  assert.deepEqual(pet.cierres[0], { id: 15, cuerpo: { tipo: "rebaja", minutos: 60, nota: "siguiente periodo" } });
  await tarjeta("cerrado").getByText("1 h · 0 min").waitFor({ timeout: 10000 });

  await page.getByRole("button", { name: "Más acciones de Alondra Munguía" }).click();
  const panelEmpleado = page.getByRole("menuitem", { name: "Ver en Panel empleado" });
  assert.equal(await panelEmpleado.getAttribute("href"), "/panel/panel-empleado?emp=16");
  await page.getByRole("menuitem", { name: "Condonar" }).click();
  const dCond = page.locator('[data-dialogo-cierre="condonacion"]');
  await dCond.getByLabel("Horas a cerrar").fill("0");
  await dCond.getByLabel("Minutos a cerrar").fill("30");
  await dCond.getByLabel("Nota del cierre").fill("Buen trabajo");
  await dCond.getByRole("button", { name: "Condonar" }).click();
  await esperar(() => pet.cierres.length === 2, "POST condonación");
  assert.deepEqual(pet.cierres[1], { id: 16, cuerpo: { tipo: "condonacion", minutos: 30, nota: "Buen trabajo" } });
  await page.locator('tr[data-fila-reponer="16"]', { hasText: "6 h 30 min" }).waitFor({ timeout: 10000 });

  // 9) Exportar Excel (con lo filtrado).
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar Excel" }).click();
  const archivo = await descarga;
  assert.match(archivo.suggestedFilename(), /^Horas por reponer 2026-11-24.*\.xlsx$/);
  const ruta = path.join(carpeta, "export.xlsx");
  await archivo.saveAs(ruta);
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(ruta);
  const hoja = libro.getWorksheet("Por reponer");
  const valores = [];
  hoja.eachRow((r) => valores.push(r.values.slice(1)));
  assert.deepEqual(valores[0], ["Persona", "Área", "Debe (h:mm)", "Debe (minutos)", "Desde", "Días", "Permisos", "Motivos", "Última reposición"]);
  assert.deepEqual(valores.slice(1).map((v) => [v[0], v[3]]), [["Carlos Terriquez", 30], ["Alondra Munguía", 390], ["Frida Serrano", 270], ["Luis García", 60]]);

  // 10) La pestaña queda en el enlace; Registros la quita.
  await page.getByRole("tab", { name: "Registros" }).click();
  await esperar(() => !page.url().includes("vista="), "Registros sin ?vista");
  await page.getByRole("tab", { name: /Horas por reponer/ }).click();
  await esperar(() => page.url().includes("vista=reponer"), "?vista=reponer");
  await page.locator("[data-vista-reponer]").waitFor();

  // 11) Celular 390: tarjetas, sin desbordes, botones de 44 px.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/panel/registro-asistencia?vista=reponer", { waitUntil: "domcontentloaded" });
  await page.locator("[data-tarjetas-reponer] [data-tarjeta-reponer]").first().waitFor({ timeout: 30000 });
  assert.equal(await page.locator("[data-tarjeta-reponer]").count(), 4);
  assert.equal(await page.getByRole("tab", { name: /Horas por reponer/ }).getAttribute("aria-selected"), "true");
  await sinDesborde(page.locator("html"), "390");
  await nadaSeSale(page, "[data-vista-reponer]", "390");
  const bajos = await page.locator("[data-vista-reponer]").evaluate((el) => [...el.querySelectorAll("button,select,input")].filter((c) => c.offsetParent)
    .filter((c) => c.getBoundingClientRect().height < 43.5).map((c) => c.getAttribute("aria-label") || c.innerText));
  assert.deepEqual(bajos, [], "controles de 44 px en celular");
  const tabsBajas = await page.getByRole("tab").evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 43.5).length);
  assert.equal(tabsBajas, 0, "pestañas de 44 px");
  await foto(page, "390-horas-por-reponer");
  const tCarlos = page.locator('[data-tarjeta-reponer="15"]');
  await tCarlos.getByRole("button", { name: "Ver movimientos" }).click();
  await tCarlos.locator("[data-movimiento]").first().waitFor({ timeout: 10000 });
  await sinDesborde(page.locator("html"), "390 con movimientos");
  await nadaSeSale(page, '[data-tarjeta-reponer="15"]', "tarjeta abierta 390");
  const bajosDet = await tCarlos.evaluate((el) => [...el.querySelectorAll("button")].filter((c) => c.offsetParent)
    .filter((c) => c.getBoundingClientRect().height < 43.5).map((c) => c.getAttribute("aria-label") || c.innerText));
  assert.deepEqual(bajosDet, [], "botones de la tarjeta abierta de 44 px");
  await foto(page, "390-tarjeta-desplegada", tCarlos);
  const queHacerM = tCarlos.getByRole("region", { name: "Qué hacer con lo que debe" });
  await queHacerM.scrollIntoViewIfNeeded();
  await foto(page, "390-que-hacer", queHacerM);
  await tCarlos.getByRole("button", { name: "Registrar reposición" }).first().click();
  const drM = page.locator("[data-dialogo-reposicion]");
  await drM.waitFor();
  await sinDesborde(drM, "ventana 390");
  await foto(page, "390-registrar-reposicion");
  await drM.getByRole("button", { name: "Cancelar" }).click();

  assert.deepEqual(errores, [], "sin errores de JavaScript");
  exito = true;
  console.log("OK · pestaña «Horas por reponer» junto a Registros y Horas de ley con su número (4) y ?vista=reponer · resumen (total con personas, "
    + "más de 30 días en rojo, repuesto y rebajado/condonado del mes) · filas con desde/hace N días (rojo ≥ 30), por qué y lo último · filtros "
    + "(búsqueda sin acentos, área, solo más de 30 días) · fila desplegada con movimientos, saldo y «Qué hacer» · Registrar reposición → PUT exacto · "
    + "Deshacer cierre → POST · Cancelar permiso → PATCH exacto · Rebajar y Condonar → POST exactos · Exportar Excel (leído) · Ver en Panel empleado · "
    + "1440 y 390 sin desbordes, controles de 44 px · sin errores de JS");
} finally {
  await browser.close();
  next.kill();
  if (carpeta) await rm(carpeta, { recursive: true, force: true });
  if (!exito) process.exitCode = 1;
}
