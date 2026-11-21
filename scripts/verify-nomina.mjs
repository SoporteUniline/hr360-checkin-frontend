// Verificación en navegador de las pantallas de Nómina R1 (21/11/2026), con el backend simulado en memoria:
// RH crea la nómina, revisa un recibo, edita un importe con motivo, envía a autorizar (no ve «Autorizar»);
// el dueño autoriza; el empleado ve «Mis recibos» y firma. También: celular sin desbordes.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-nomina.mjs
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
const estado = { periodos: [], ediciones: [], posts: [], asistencias: [] };
const recibo = () => ({
  id: 11, id_empleado: 15, estado: "vigente", envio_estado: null, transferencia_editada: null,
  datos: { empleado: { nombre: "Ana Torres", puesto: "Empacadora", medio_pago: "Mixto", monto_transferencia: 1000 }, resumen: { diasPagados: 4.67, diasRango: 7, diasTrabajados: 4, minTrabajados: 2040, minExtra: 120, minDobles: 120, minTriples: 0, faltas: 2, sinGoce: 0, retardos: 1, domingos: 0, festivosTrab: 0, sueldo: 210000, diario: 30000, periodoPago: "Semanal" }, alertas: [],
    dias: [["2026-11-16", "trabajado", 600, 120, false], ["2026-11-17", "trabajado", 480, 0, false], ["2026-11-18", "trabajado", 480, 0, true], ["2026-11-19", "trabajado", 480, 0, false], ["2026-11-20", "falta", 0, 0, false], ["2026-11-21", "falta", 0, 0, false], ["2026-11-22", "descanso", 0, 0, false]].map(([fecha, estado, min, extra, retardo]) => ({ fecha, estado, min, extra, retardo, programado: estado === "descanso" ? 0 : 480, entrada: min ? (retardo ? "09:10" : "09:00") : null, salida: min ? (extra ? "19:00" : "17:00") : null, pagos: extra ? [{ texto: "2 h extra al doble", importe: 15000 }] : undefined })) },
  total_percepciones: 1600, total_descuentos: 0, neto: 1600, transferencia: 1000, efectivo: 600,
  lineas: [
    { clave: "sueldo", concepto: "Sueldo (días pagados)", tipo: "percepcion", cantidad: 4.67, importe: 1400, importe_sugerido: 1400, editado: 0, origen: "calculo" },
    { clave: "concepto:1", concepto: "Despensa", tipo: "percepcion", cantidad: null, importe: 200, importe_sugerido: 200, editado: 0, origen: "concepto" },
    { clave: "concepto:2", concepto: "Puntualidad", tipo: "percepcion", cantidad: null, importe: 0, importe_sugerido: 0, editado: 0, origen: "concepto", nota: "No cumple: 1 retardo" },
  ],
});
let rol = "rh";
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
    if (p === "/checador/nomina/periodos" && req.method() === "GET") return ok({ ok: true, periodos: estado.periodos.map(({ recibos, ...x }) => x), puede_autorizar: rol === "dueno" });
    if (p === "/checador/nomina/periodos" && req.method() === "POST") {
      const b = req.postDataJSON();
      assert.equal(b.id_empresa, 7);
      estado.periodos.push({ id: 5, id_empresa: 7, periodicidad: b.periodicidad, fecha_inicio: b.fecha_inicio, fecha_fin: b.fecha_fin, estado: "borrador", version: 1, empleados: 1, total_neto: 1600, total_transferencia: 1000, total_efectivo: 600, creado_por_nombre: "RH Prueba", recibos: [recibo()] });
      return ok({ ok: true, id: 5 }, 201);
    }
    const m = /^\/checador\/nomina\/periodos\/5(?:\/(\w+))?$/.exec(p);
    if (m) {
      const per = estado.periodos[0];
      if (!m[1]) return ok({ ok: true, periodo: per, recibos: per.recibos, puede_autorizar: rol === "dueno" });
      const b = req.postDataJSON() ?? {};
      estado.posts.push({ accion: m[1], rol, version: b.version });
      assert.equal(b.version, per.version, "manda la versión que vio");
      per.version += 1;
      if (m[1] === "enviar") per.estado = "por_autorizar";
      if (m[1] === "autorizar") { per.estado = "autorizado"; per.recibos[0].envio_estado = "enviado"; }
      return ok({ ok: true });
    }
    if (p === "/checador/nomina/recibos/11" && req.method() === "PUT") {
      const b = req.postDataJSON();
      estado.ediciones.push(b);
      const r = estado.periodos[0].recibos[0];
      for (const l of b.lineas ?? []) Object.assign(r.lineas.find((x) => x.clave === l.clave), { importe: l.importe, editado: 1, motivo: l.motivo, editado_por_nombre: "RH Prueba" });
      r.neto = r.lineas.reduce((t, l) => t + Number(l.importe), 0);
      r.total_percepciones = r.neto;
      r.efectivo = r.neto - 1000;
      estado.periodos[0].version += 1;
      return ok({ ok: true });
    }
    // Asistencias (la ventana de edición que se abre desde «Corregir»).
    if (p === "/checador/asistencias" && req.method() === "GET") {
      assert.deepEqual([url.searchParams.get("fechaInicio"), url.searchParams.get("fechaFin"), url.searchParams.get("filtroEmpleado")], ["2026-11-18", "2026-11-18", "Ana Torres"]);
      return ok({ registros: [{ id: 501, id_empleado: 15, nombre: "Ana", apellido_paterno: "Torres", fecha: "2026-11-18", entrada: "2026-11-18 09:10:00", salida: "2026-11-18 17:00:00", asistencia: 1, hora_entrada_programada: "09:00:00", hora_salida_programada: "17:00:00", zona_horaria: "America/Mexico_City", tipo_registro_nombre: "Asistencia" }], total: 1, page: 1 });
    }
    if (/^\/checador\/asistencias\/501$/.test(p) && req.method() === "PUT") { estado.asistencias.push(req.postDataJSON()); return ok({ ok: true }); }
    if (p === "/checador/nomina/conceptos") return ok({ ok: true, conceptos: [{ id: 1, nombre: "Despensa", tipo: "percepcion", forma: "fijo", valor: 200, activo: 1 }] });
    if (p === "/checador/nomina/mis-recibos") return ok({ ok: true, recibos: [{ id: 11, id_empresa: 7, folio: "N5-11", neto: 1650, transferencia: 1000, efectivo: 650, fecha_inicio: "2026-11-16", fecha_fin: "2026-11-22", firma_estatus: "pendiente" }] });
    if (p === "/checador/firma-digital/solicitudes/documento") { assert.equal(url.searchParams.get("tipo_documento"), "RECIBO_NOMINA"); return ok({ success: true, solicitud: { estatus: "pendiente", url_firma: "/firmar/tok-recibo" } }); }
    return ok([]);
  });
}

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];
  const rh = () => ({ id_usuario: 1, tipo_usuario: "Recruiter", nombre: rol === "dueno" ? "Dueño" : "RH Prueba", empresas: [7], empresas_detalle: [{ id_empresa: 7, nombre: "Empacadora" }] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX" });
  await ctx.addCookies([{ name: "token", value: jwt("Recruiter"), url: base }]);
  await rutas(ctx, rh);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));

  // 1) Lista vacía → nueva nómina semanal (fechas sugeridas) → detalle.
  await page.goto(base + "/panel/nomina", { waitUntil: "domcontentloaded" });
  await page.getByText("Aún no hay nóminas.").waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "Nueva nómina" }).first().click();
  await page.getByRole("button", { name: "Crear y calcular" }).click();
  await page.waitForURL("**/panel/nomina/5");
  await page.getByRole("heading", { name: /Nómina del/ }).waitFor();
  await page.getByText("$1,600.00").first().waitFor();
  // La tabla dice cuánto trabajó, faltas, retardos y horas extra (no solo el total).
  await page.getByText("Asistencia del periodo").waitFor();
  const fila = page.getByRole("row", { name: /Ana Torres/ });
  for (const t of ["4 d", "34 h", "2 h", "4.67"]) assert.ok((await fila.innerText()).includes(t), `fila con ${t}`);
  assert.equal(await page.getByRole("button", { name: "Autorizar y enviar recibos" }).count(), 0, "RH no ve Autorizar");
  await captura(page, "nomina-detalle");

  // 2) Clic en Ana: se despliega su asistencia día por día (entrada, salida, horas, extra, retardo) y el porqué del sueldo.
  await page.getByRole("button", { name: "Ana Torres" }).click();
  const asistencia = page.getByRole("region", { name: "Asistencia de Ana Torres" });
  await asistencia.waitFor();
  const mie = asistencia.getByRole("row", { name: /mié 18/ });
  for (const t of ["Trabajó", "Retardo", "09:10", "17:00", "8 h"]) assert.ok((await mie.innerText()).includes(t), `miércoles con ${t}`);
  const lun = await asistencia.getByRole("row", { name: /lun 16/ }).innerText();
  for (const t of ["2 h extra autorizada", "+$150.00", "2 h extra al doble"]) assert.ok(lun.includes(t), `lunes con ${t}`);
  assert.ok((await asistencia.getByRole("row", { name: /vie 20/ }).innerText()).includes("Falta"));
  await asistencia.getByText(/\$2,100\.00 semanal × 4\.67 días pagados ÷ 7 días del periodo/).waitFor();
  await captura(page, "nomina-desplegado");
  // «Corregir» abre AQUÍ MISMO la ventana de edición de Asistencias de ese día; al guardar la nómina se recalcula sola.
  await mie.getByRole("button", { name: /Corregir/ }).click();
  const ventana = page.getByRole("dialog", { name: /Ana Torres/ });
  await ventana.getByLabel("Entrada").waitFor({ timeout: 10000 });
  assert.equal(await ventana.getByLabel("Entrada").inputValue(), "09:10");
  assert.equal(page.url().includes("/panel/nomina/5"), true, "no salió de la nómina");
  await dormir(500);
  await captura(page, "nomina-corregir");
  await ventana.getByLabel("Entrada").fill("09:00");
  await ventana.getByRole("button", { name: "Guardar" }).click();
  await page.getByText(/Asistencia corregida: la nómina se recalculó/).waitFor();
  assert.equal(estado.asistencias[0].entrada, "2026-11-18 09:00:00");
  assert.deepEqual(estado.posts.at(-1).accion, "calcular");
  estado.posts.length = 0;
  // Otro clic lo cierra; el botón abre el recibo para ajustar importes.
  await asistencia.getByRole("button", { name: "Revisar recibo y ajustar importes" }).click();
  await page.getByText("No cumple: 1 retardo").waitFor();
  await page.getByLabel("Importe de Despensa").fill("250");
  await page.getByPlaceholder("Motivo del cambio (opcional)").fill("Ajuste acordado");
  await page.getByRole("button", { name: "Guardar cambios (1)" }).click();
  await page.getByText(/Editado por RH Prueba: Ajuste acordado/).waitFor();
  assert.equal(await page.getByRole("dialog").getByRole("button", { name: /Corregir/ }).count(), 7, "el panel del recibo también deja corregir cada día");
  // Desde el panel del recibo también abre la ventana encima; cancelar no recalcula.
  const posts = estado.posts.length;
  await page.getByRole("dialog").getByRole("button", { name: "Corregir asistencia del mié 18" }).click();
  await page.getByRole("dialog", { name: /Ana Torres/ }).getByLabel("Entrada").waitFor();
  await page.getByRole("dialog", { name: /Ana Torres/ }).getByRole("button", { name: "Cancelar" }).click();
  await page.getByLabel("Entrada").waitFor({ state: "detached" });
  assert.equal(estado.posts.length, posts, "cancelar no recalcula");
  await captura(page, "nomina-recibo");
  assert.deepEqual(estado.ediciones[0], { version: 2, lineas: [{ clave: "concepto:1", importe: 250, motivo: "Ajuste acordado" }] });
  await page.keyboard.press("Escape");

  // 3) Enviar a autorizar (confirmación).
  await page.getByRole("button", { name: "Enviar a autorizar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Enviar" }).click();
  await page.getByText("Enviada al dueño de la cuenta para su autorización.").waitFor();

  // 4) El dueño ve «Autorizar» y autoriza.
  rol = "dueno";
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Autorizar y enviar recibos" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Autorizar" }).click();
  await page.getByText("Enviado").first().waitFor({ timeout: 5000 });
  assert.deepEqual(estado.posts.map((x) => [x.accion, x.rol]), [["enviar", "rh"], ["autorizar", "dueno"]]);

  // 5) Celular: el detalle no se desborda.
  await page.setViewportSize({ width: 390, height: 844 });
  await dormir(400);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390), "sin desborde en celular");
  await ctx.close();

  // 6) Empleado: Mis recibos → Firmar lleva al enlace de firma de SU recibo.
  const ce = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX" });
  await ce.addCookies([{ name: "token", value: jwt("Empleado"), url: base }]);
  await rutas(ce, () => ({ id_usuario: 15, id_empleado: 15, tipo_usuario: "Empleado", nombre: "Ana Torres", empresas: [7] }));
  const pe = await ce.newPage();
  pe.on("pageerror", (e) => errores.push(e.message));
  await pe.goto(base + "/empleado/panel/mis-recibos", { waitUntil: "domcontentloaded" });
  await pe.getByText("$1,650.00").waitFor({ timeout: 20000 });
  await pe.getByText("Por firmar").waitFor();
  await captura(pe, "nomina-mis-recibos");
  await pe.getByRole("button", { name: "Firmar" }).click();
  await pe.waitForURL("**/firmar/tok-recibo");
  await ce.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK nómina: crear con fechas sugeridas, recibo con motivo de bono en $0, edición con motivo y versión, enviar (RH sin Autorizar), autorizar (dueño), estado de envío, celular, Mis recibos → firmar");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
