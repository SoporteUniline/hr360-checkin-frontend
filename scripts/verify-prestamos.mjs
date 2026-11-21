// Verificación en navegador de Préstamos (Nómina R2, 21/11/2026) con el backend simulado en memoria:
// RH ve la solicitud de Ana, la aprueba ajustando el abono, registra un abono en efectivo; registra otro préstamo con
// avisos de la ley; el empleado ve su saldo, firma su acuerdo y no puede pedir otro mientras tenga uno abierto.
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
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png` }) : null);

// Backend simulado.
const estado = {
  posts: [],
  prestamos: [
    { id: 3, id_empresa: 7, id_empleado: 15, empleado: "Ana Torres", puesto: "Empacadora", monto: 3000, abono: 500, saldo: 3000, motivo: "Consulta médica", origen: "empleado", estado: "solicitado", version: 1, firma_estatus: null, creado_en: "2026-11-21T16:00:00Z", solicitado_por_nombre: "Ana Torres" },
    { id: 2, id_empresa: 7, id_empleado: 16, empleado: "Beto Ruiz", puesto: null, monto: 1000, abono: 250, saldo: 500, motivo: null, origen: "rh", estado: "vigente", version: 4, firma_estatus: "firmado", creado_en: "2026-10-01T16:00:00Z", solicitado_por_nombre: "RH Prueba" },
  ],
  movimientos: { 2: [{ id: 1, tipo: "abono_nomina", importe: 250, saldo_despues: 750, periodo_inicio: "2026-11-02", periodo_fin: "2026-11-08", registrado_por_nombre: "Dueño", creado_en: "2026-11-09T18:00:00Z" }, { id: 2, tipo: "abono_nomina", importe: 250, saldo_despues: 500, periodo_inicio: "2026-11-09", periodo_fin: "2026-11-15", registrado_por_nombre: "Dueño", creado_en: "2026-11-16T18:00:00Z" }] },
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
      if (b.simular) return ok({ ok: true, plazo: Math.ceil(b.monto / b.abono), avisos: b.monto > 9000 ? ["Pasa de un mes de salario ($9,000.00). La ley no permite exigir más de un mes."] : [] });
      estado.prestamos.unshift({ id: 4, id_empresa: 7, id_empleado: b.id_empleado, empleado: "Carla Paz", monto: b.monto, abono: b.abono, saldo: b.monto, motivo: b.motivo, origen: "rh", estado: "por_firmar", version: 1, firma_estatus: "pendiente", creado_en: "2026-11-21T18:00:00Z", solicitado_por_nombre: "RH Prueba" });
      return ok({ ok: true, id: 4, plazo: 1, avisos: [], aviso_acuerdo: null }, 201);
    }
    const m = /^\/checador\/nomina\/prestamos\/(\d+)(?:\/(\w+))?$/.exec(p);
    if (m) {
      const pr = estado.prestamos.find((x) => x.id === Number(m[1]));
      if (!m[2]) return ok({ ok: true, prestamo: pr, movimientos: estado.movimientos[pr.id] ?? [], avisos: [], plazo: Math.ceil(pr.monto / pr.abono), puede_cancelar_vigente: false });
      const b = req.postDataJSON() ?? {};
      estado.posts.push({ accion: m[2], id: pr.id, ...b });
      assert.equal(b.version, pr.version, "manda la versión que vio");
      pr.version += 1;
      if (m[2] === "aprobar") Object.assign(pr, { estado: "por_firmar", firma_estatus: "pendiente", abono: b.abono ?? pr.abono, monto: b.monto ?? pr.monto, saldo: b.monto ?? pr.saldo });
      if (m[2] === "abono") {
        pr.saldo -= b.importe;
        (estado.movimientos[pr.id] ??= []).push({ id: 9, tipo: "abono_efectivo", importe: b.importe, saldo_despues: pr.saldo, nota: b.nota, registrado_por_nombre: "RH Prueba", creado_en: "2026-11-21T18:00:00Z" });
        return ok({ ok: true, saldo: pr.saldo });
      }
      return ok({ ok: true, aviso_acuerdo: null });
    }
    if (p === "/checador/empleados") return ok({ data: [{ id_empleado: 17, nombre: "Carla", apellido_paterno: "Paz", puesto: "Cajera" }, { id_empleado: 15, nombre: "Ana", apellido_paterno: "Torres" }], total: 2 });
    if (p === "/checador/nomina/mis-prestamos" && req.method() === "GET") {
      return ok({ ok: true, prestamos: estado.prestamos.filter((x) => x.id_empleado === 15).map((x) => ({ ...x, movimientos: [] })) });
    }
    if (p === "/checador/nomina/mis-prestamos" && req.method() === "POST") return ok({ ok: false, error: "Ya tienes un préstamo abierto." }, 409);
    if (p === "/checador/firma-digital/solicitudes/documento") {
      assert.equal(url.searchParams.get("tipo_documento"), "PRESTAMO_NOMINA");
      assert.equal(url.searchParams.get("referencia_id"), "3");
      return ok({ success: true, solicitud: { estatus: "pendiente", url_firma: "/firmar/tok-prestamo" } });
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

  // 1) Lista: KPIs, filtro y la solicitud de Ana primero.
  await page.goto(base + "/panel/nomina/prestamos", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Ana Torres" }).waitFor({ timeout: 20000 });
  await page.getByText("Por cobrar").waitFor();
  await captura(page, "prestamos-lista");
  await page.getByRole("button", { name: "Vigentes (1)" }).click();
  assert.equal(await page.getByRole("link", { name: "Ana Torres" }).count(), 0, "filtra por estado");
  await page.getByRole("button", { name: "Todos" }).click();

  // 2) Aprobar ajustando el abono → por firmar.
  await page.getByRole("button", { name: "Revisar préstamo de Ana Torres" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByText("Consulta médica").waitFor();
  await dlg.getByRole("button", { name: "Aprobar", exact: true }).click();
  await dlg.getByLabel("Abono por nómina").fill("600");
  await dlg.getByRole("button", { name: "Aprobar y enviar acuerdo" }).click();
  await dlg.getByText("Esperando su firma en Mi espacio").waitFor();
  const aprobado = estado.posts.find((x) => x.accion === "aprobar");
  assert.deepEqual([aprobado.id, aprobado.abono, aprobado.version], [3, 600, 1]);
  await page.keyboard.press("Escape");

  // 3) Beto (vigente): historial y abono en efectivo.
  await page.getByRole("button", { name: "Ver préstamo de Beto Ruiz" }).click();
  await dlg.getByText("Descuento en nómina").first().waitFor();
  assert.equal(await dlg.getByRole("button", { name: "Cancelar préstamo" }).count(), 0, "RH no cancela uno vigente");
  await dlg.getByRole("button", { name: "Registrar abono en efectivo" }).click();
  await dlg.getByLabel("Importe").fill("200");
  await dlg.getByRole("button", { name: "Registrar abono" }).click();
  await dlg.getByText("Abono registrado.").waitFor();
  await dlg.getByRole("cell", { name: "Abono en efectivo" }).waitFor();
  await captura(page, "prestamos-detalle");
  await page.keyboard.press("Escape");

  // 4) Registrar uno nuevo: avisos de la ley antes de guardar.
  await page.getByRole("button", { name: "Registrar préstamo" }).click();
  const reg = page.getByRole("dialog");
  await reg.getByPlaceholder("Buscar por nombre").fill("carla");
  await reg.getByLabel("Elige a la persona").selectOption("17");
  await reg.getByLabel("Monto prestado").fill("10000");
  await reg.getByLabel("Abono por nómina").fill("500");
  await reg.getByText("Pasa de un mes de salario").waitFor();
  await reg.getByText("20 nóminas").waitFor();
  await captura(page, "prestamos-registrar");
  await reg.getByRole("button", { name: "Registrar y enviar a firma" }).click();
  await page.getByText("Préstamo P-4").waitFor();
  const creado = estado.posts.find((x) => x.accion === "crear");
  assert.deepEqual([creado.id_empleado, creado.monto, creado.abono], [17, 10000, 500]);
  await ctx.close();

  // 5) Empleado en celular: ve su préstamo por firmar, firma su acuerdo; no ve «Pedir» con uno abierto.
  const ce = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX" });
  await ce.addCookies([{ name: "token", value: jwt("Empleado"), url: base }]);
  await rutas(ce, () => ({ id_usuario: 15, id_empleado: 15, tipo_usuario: "Empleado", nombre: "Ana Torres", empresas: [7] }));
  const pe = await ce.newPage();
  pe.on("pageerror", (e) => errores.push(e.message));
  await pe.goto(base + "/empleado/panel/mis-prestamos", { waitUntil: "domcontentloaded" });
  await pe.getByText("Firma tu acuerdo").waitFor({ timeout: 20000 });
  assert.equal(await pe.getByRole("button", { name: "Pedir un préstamo" }).count(), 0, "uno a la vez");
  assert.ok(await pe.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde en celular");
  await captura(pe, "prestamos-mi-espacio");
  await pe.getByRole("button", { name: "Firmar acuerdo" }).click();
  await pe.waitForURL("**/firmar/tok-prestamo");
  await ce.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK préstamos: lista y filtros, aprobar con abono ajustado, historial y abono en efectivo, RH no cancela vigente, registrar con aviso de la ley, Mi espacio → firmar acuerdo");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
