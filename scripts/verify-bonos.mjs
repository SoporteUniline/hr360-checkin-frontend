// Verificación en navegador de Nómina → Bonos y descuentos con el backend simulado en memoria:
// lista con quién lo tiene, clic en el renglón → detalle, buscar persona, asignar / quitar / valor propio y guardar en
// bloque, «Se lo ganan todos» al editar, crear uno nuevo (lleva a su detalle). La dirección vieja /panel/nomina/ajustes redirige.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-bonos.mjs
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
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png` }) : null);

// Backend simulado.
const estado = { puts: [], creados: [], ediciones: [] };
const conceptos = [
  { id: 1, id_empresa: 7, nombre: "Bono de puntualidad", tipo: "percepcion", forma: "condicionado", condicion: "sin_retardos", valor: 150, activo: 1, para_todos: 0, asignados: 1 },
  { id: 2, id_empresa: 7, nombre: "Despensa", tipo: "percepcion", forma: "fijo", condicion: null, valor: 200, activo: 1, para_todos: 1, asignados: 0 },
];
const personas = [
  { id_empleado: 15, nombre: "Ana Torres", puesto: "Empacadora", valor: null, lo_tiene: true, quitado: false },
  { id_empleado: 16, nombre: "Beto Ruiz", puesto: "Chofer", valor: null, lo_tiene: false, quitado: false },
  { id_empleado: 17, nombre: "Carla Paz", puesto: "Cajera", valor: null, lo_tiene: false, quitado: false },
];
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
    if (p === "/checador/nomina/conceptos" && req.method() === "GET") return ok({ ok: true, conceptos, para_todos_disponible: true });
    if (p === "/checador/nomina/conceptos" && req.method() === "POST") {
      const b = req.postDataJSON();
      estado.creados.push(b);
      conceptos.push({ ...b, id: 9, activo: 1, para_todos: b.para_todos ? 1 : 0, asignados: 0 });
      return ok({ ok: true, id: 9 }, 201);
    }
    const m = /^\/checador\/nomina\/conceptos\/(\d+)(\/personas)?$/.exec(p);
    if (m) {
      const c = conceptos.find((x) => x.id === Number(m[1]));
      if (m[2]) {
        const b = req.postDataJSON();
        estado.puts.push(b);
        for (const x of b.cambios) Object.assign(personas.find((q) => q.id_empleado === x.id_empleado), { lo_tiene: x.lo_tiene, valor: x.valor == null ? null : Number(x.valor), quitado: Boolean(c.para_todos) && !x.lo_tiene });
        return ok({ ok: true, guardados: b.cambios.length });
      }
      if (req.method() === "PUT") { const b = req.postDataJSON(); estado.ediciones.push(b); Object.assign(c, { ...b, para_todos: b.para_todos ? 1 : 0, activo: b.activo ? 1 : 0 }); return ok({ ok: true }); }
      return ok({ ok: true, concepto: c, para_todos_disponible: true, personas: c.id === 9 ? personas.map((q) => ({ ...q, lo_tiene: false, valor: null })) : personas });
    }
    return ok([]);
  });
}

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX" });
  await ctx.addCookies([{ name: "token", value: jwt("Recruiter"), url: base }]);
  await rutas(ctx, () => ({ id_usuario: 1, tipo_usuario: "Recruiter", nombre: "RH Prueba", empresas: [7], empresas_detalle: [{ id_empresa: 7, nombre: "Empacadora" }] }));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));

  // 1) La dirección vieja lleva a la nueva; lista con quién lo tiene.
  await page.goto(base + "/panel/nomina/ajustes", { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/panel/nomina/bonos");
  await page.getByRole("link", { name: "Bono de puntualidad" }).waitFor({ timeout: 20000 });
  const filaDespensa = await page.getByRole("row", { name: "Despensa" }).innerText();
  assert.ok(filaDespensa.includes("Todos"), "Despensa es para todos");
  assert.ok((await page.getByRole("row", { name: "Bono de puntualidad" }).innerText()).includes("1 persona"));
  await captura(page, "bonos-lista");

  // 2) Clic en el renglón → detalle. Buscar a Carla, asignarle con valor propio y quitárselo a Ana; guardar en bloque.
  await page.getByRole("row", { name: "Bono de puntualidad" }).getByRole("cell").nth(3).click();
  await page.waitForURL("**/panel/nomina/bonos/1");
  await page.getByRole("heading", { name: "Bono de puntualidad" }).waitFor();
  await page.getByLabel("Buscar persona").fill("carla");
  assert.equal(await page.getByRole("checkbox", { name: /lo tiene/ }).count(), 1, "el buscador filtra");
  await page.getByRole("checkbox", { name: "Carla Paz lo tiene" }).check();
  await page.getByLabel("Valor propio de Carla Paz").fill("300");
  await page.getByLabel("Buscar persona").fill("");
  await page.getByRole("checkbox", { name: "Ana Torres lo tiene" }).uncheck();
  await page.getByText("2 cambios sin guardar").waitFor();
  await captura(page, "bonos-detalle");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.getByText("2 cambios sin guardar").waitFor({ state: "detached" });
  assert.deepEqual(estado.puts[0].cambios.map((x) => [x.id_empleado, x.lo_tiene, x.valor == null ? null : Number(x.valor)]).sort(), [[15, false, null], [17, true, 300]]);
  // Filtro «Lo tienen» y marcar a todos los visibles.
  await page.getByRole("button", { name: "Lo tienen", exact: true }).click();
  assert.deepEqual(await page.getByRole("checkbox", { name: /lo tiene/ }).count(), 1);
  await page.getByRole("button", { name: "Todas", exact: true }).click();

  // 3) Editar → «Se lo ganan todos».
  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("dialog").getByRole("checkbox", { name: /Se lo ganan todos/ }).check();
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await page.getByText("Se lo ganan todos. Para que alguien no lo tenga, quítale la marca.").waitFor();
  assert.equal(estado.ediciones[0].para_todos, true);

  // 4) Nuevo desde la lista → lleva a su detalle.
  await page.getByRole("link", { name: "Bonos y descuentos" }).first().click();
  await page.waitForURL(/\/panel\/nomina\/bonos$/);
  await page.getByRole("button", { name: "Nuevo bono o descuento" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Nombre").fill("Bono de productividad");
  await dlg.getByLabel("Valor ($)").fill("500");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await page.waitForURL("**/panel/nomina/bonos/9");
  assert.deepEqual([estado.creados[0].nombre, estado.creados[0].valor, estado.creados[0].para_todos, estado.creados[0].id_empresa], ["Bono de productividad", 500, false, 7]);

  // 5) Celular: sin desborde.
  await page.setViewportSize({ width: 390, height: 844 });
  await dormir(400);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde en celular");
  await ctx.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK bonos: dirección vieja redirige, lista con quién lo tiene, renglón → detalle, buscador, asignar/quitar/valor en bloque, «para todos», nuevo → detalle, celular");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
