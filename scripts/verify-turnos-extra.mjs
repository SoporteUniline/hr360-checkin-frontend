// Verificación en navegador de Turnos extra (backend simulado, nada sale a internet).
// Uso: npm run build && node scripts/verify-turnos-extra.mjs   (CAPTURAS=carpeta para guardar capturas)
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
const require = createRequire(REPO + "/package.json");
const { chromium } = require("playwright");
const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, [REPO + "/node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { cwd: REPO, stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
const token = `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;

const empresa = { id_empresa: 10, nombre: "Uniline", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Gómez", empresas: [10], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const minAbs = (h) => Math.floor(Date.parse(`${hoy}T00:00:00Z`) / 60000) + h * 60;
const turno = { id: 7, id_empresa: 10, nombre_empresa: "Uniline", nombre: "Doble turno · Producción", fecha: hoy, hora_inicio: "11:00", hora_fin: "19:00",
  tolerancia_min: 30, motivo: "Pedido urgente", estado: "programado", creado_por_nombre: "Laura Gómez", creado_en: `${hoy} 08:40:00`, personas: 3 };
const grave = { nivel: "grave", codigo: "JORNADA_12H", mensaje: "Con su turno 22:00–09:00 suma 19 h seguidas (máx. 12 h)" };
const persona = (id, nombre, vivo, avisos = []) => ({ id_empleado: id, nombre_empleado: nombre, departamento: "Producción", horario_dia: "22:00–09:00",
  avisos, grave: avisos.some((a) => a.nivel === "grave"), duracion: 480, dobles: 480, triples: 0, avisos_al_programar: avisos, vivo });
const detalle = {
  turno: { ...turno, fase: "en_curso", duracion: 480 },
  personas: [
    persona(201, "Iván Delgado", { estado: "trabajando", llegoTarde: 0, entrada: `${hoy} 11:04:00`, salida: null, salidaAnterior: `${hoy} 09:02:00`, minutos: 296, dobles: 296, triples: 0 }, [grave]),
    persona(202, "Hilda Ramos", { estado: "trabajando", llegoTarde: 42, entrada: `${hoy} 11:42:00`, salida: null, salidaAnterior: `${hoy} 08:58:00`, minutos: 258, dobles: 60, triples: 198 }),
    persona(203, "Luis Ochoa", { estado: "no_se_presento", llegoTarde: 0, entrada: null, salida: null, salidaAnterior: `${hoy} 09:05:00`, minutos: 0, dobles: 0, triples: 0 }),
  ],
  resumen: { personas: 3, checaron: 2, sinLlegar: 1, minutos: 554, dobles: 356, triples: 198 },
};
const candidatos = [
  { ...persona(201, "Iván Delgado", null, [grave, { nivel: "aviso", codigo: "EXTRA_4H", mensaje: "8 h extra en un día (máx. 4 h)" }]), salida_anterior: `${hoy} 09:02:00`, semanaTrabajado: 2280, semanaExtraAutorizadas: 120 },
  { ...persona(204, "Gabriel Núñez", null, [{ nivel: "aviso", codigo: "TRIPLES", mensaje: "Pasa de 9 h extra: 7 h irían al triple" }]), salida_anterior: `${hoy} 09:00:00`, triples: 420 },
  { ...persona(205, "Karla Vega", null, [{ nivel: "info", codigo: "DESCANSO", mensaje: "Es su día de descanso" }]), departamento: "Almacén", horario_dia: null, salida_anterior: null },
  // Plantilla real: 190 personas en la lista.
  ...Array.from({ length: 187 }, (_, i) => ({ ...persona(1000 + i, `Zeta Relleno ${String(i + 1).padStart(3, "0")}`, null, []),
    departamento: "Empaque", horario_dia: "07:00–15:00", salida_anterior: null })),
];

const pedidos = [];
let modo = "normal";
let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token, url: base }]);
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  const rutas = async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    if (p.includes("/checador/turnos-extra")) pedidos.push({ metodo: req.method(), ruta: p, params: url.search, token: req.headers().authorization || "", cuerpo: req.postData() });
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/sucursales")) return json({ sucursales: [{ id_sucursal: 1, nombre: "Planta", id_empresa: 10, empresa_nombre: "Uniline" }] });
    if (p.endsWith("/checador/turnos-extra")) {
      if (modo === "sin_migracion") return json({ ok: false, codigo: "SIN_MIGRACION", error: "Falta" }, 503);
      if (req.method() === "POST") return json({ ok: true, data: { id: 7 } }, 201);
      return json({ ok: true, data: [turno], ahora: minAbs(15) });
    }
    if (p.endsWith("/checador/turnos-extra/candidatos")) return json({ ok: true, data: candidatos });
    if (p.endsWith("/checador/turnos-extra/7/cancelar")) return json({ ok: true });
    if (p.endsWith("/checador/turnos-extra/7")) return json({ ok: true, data: detalle });
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  };
  await page.route("**/*", rutas);

  await page.goto(base + "/panel/turnos-extra", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Doble turno · Producción" }).waitFor({ timeout: 30000 });
  assert.ok(pedidos.every((x) => /^Bearer .+/.test(x.token)), "todas las llamadas llevan sesión");
  const listado = pedidos.find((x) => x.ruta.endsWith("/turnos-extra"));
  assert.match(listado.params, /desde=\d{4}-\d{2}-\d{2}&hasta=\d{4}-\d{2}-\d{2}/);
  const det = page.locator("section", { has: page.getByRole("heading", { name: "Doble turno · Producción" }) });
  const textoDet = await det.innerText();
  assert.match(textoDet, /En curso/);
  assert.match(textoDet, /3 checaron|2 checaron · 1 sin llegar/);
  assert.match(textoDet, /Horas extra hasta ahora\s*9 h 14 min/i);
  assert.match(textoDet, /Al triple\s*3 h 18 min/i);
  assert.match(textoDet, /Iván Delgado[\s\S]*salió 09:02[\s\S]*11:04[\s\S]*Trabajando[\s\S]*suma 19 h seguidas/);
  assert.match(textoDet, /Hilda Ramos[\s\S]*Llegó 42 min tarde/);
  assert.match(textoDet, /Luis Ochoa[\s\S]*No se ha presentado/);
  if (OUT) await page.screenshot({ path: `${OUT}/turnos-extra-detalle.png`, fullPage: true });

  // Nuevo turno: avisos por persona, filtro «salieron hoy», confirmación de graves.
  await page.getByRole("button", { name: /Nuevo turno extra/ }).click();
  const dlg = page.getByRole("dialog", { name: "Nuevo turno extra" });
  const filaCand = (n) => dlg.getByRole("row", { name: n, exact: true });
  await filaCand("Gabriel Núñez").waitFor();
  const cand = pedidos.filter((x) => x.ruta.endsWith("/candidatos")).at(-1);
  assert.match(cand.params, new RegExp(`empresa=10&fecha=${hoy}&hora_inicio=11(%3A|:)00&hora_fin=19(%3A|:)00`));
  assert.match(await dlg.getByRole("button", { name: /Salieron hoy de su turno/ }).innerText(), /\(2\)/);
  assert.equal(await filaCand("Karla Vega").count(), 0, "el filtro inicial muestra solo a quien salió de su turno");
  assert.match(await filaCand("Iván Delgado").innerText(), /Iván Delgado[\s\S]*22:00–09:00[\s\S]*09:02[\s\S]*38 h[\s\S]*2 h[\s\S]*8 h[\s\S]*suma 19 h seguidas/);
  assert.match(await filaCand("Gabriel Núñez").innerText(), /7 h al triple/);
  await dlg.getByRole("button", { name: /^Todos/ }).click();
  await filaCand("Karla Vega").waitFor();
  const tablaCand = dlg.getByRole("table", { name: "Personas para el turno" });
  assert.equal(await tablaCand.locator("tbody tr").count(), 190);
  const altoCand = await filaCand("Zeta Relleno 001").evaluate((el) => el.getBoundingClientRect().height);
  assert.ok(altoCand <= 48, `fila compacta (${altoCand}px)`);
  assert.match(await filaCand("Karla Vega").innerText(), /Descanso[\s\S]*Es su día de descanso/);
  // Encabezado fijo al bajar.
  await tablaCand.evaluate((t) => { t.parentElement.scrollTop = 5000; });
  const enc = await tablaCand.locator("thead").evaluate((t) => t.getBoundingClientRect().top - t.closest("div").getBoundingClientRect().top);
  assert.ok(Math.abs(enc) <= 2, `encabezado fijo (${enc})`);
  // Clic en la fila elige/quita.
  await filaCand("Zeta Relleno 001").click();
  assert.equal(await filaCand("Zeta Relleno 001").getAttribute("aria-selected"), "true");
  await filaCand("Zeta Relleno 001").click();
  assert.equal(await filaCand("Zeta Relleno 001").getAttribute("aria-selected"), "false");
  await dlg.getByPlaceholder("Doble turno · Producción").fill("Doble turno · Producción");
  await dlg.getByRole("button", { name: /^Salieron hoy/ }).click();
  await dlg.getByRole("checkbox", { name: "Elegir a los mostrados" }).click();
  assert.match(await dlg.innerText(), /2 personas · 16 h extra programadas · 7 h al triple · 2 con avisos/);
  await dlg.getByRole("button", { name: "Programar turno" }).click();
  await dlg.getByRole("alert").waitFor();
  assert.match(await dlg.getByRole("alert").innerText(), /Iván Delgado: Con su turno 22:00–09:00 suma 19 h seguidas/);
  assert.equal(pedidos.filter((x) => x.metodo === "POST").length, 0, "no guarda sin confirmar los graves");
  if (OUT) await page.screenshot({ path: `${OUT}/turnos-extra-nuevo.png` });
  await dlg.getByRole("button", { name: "Confirmar y programar" }).click();
  await dlg.waitFor({ state: "hidden" });
  const post = JSON.parse(pedidos.find((x) => x.metodo === "POST" && x.ruta.endsWith("/turnos-extra")).cuerpo);
  assert.deepEqual([post.id_empresa, post.nombre, post.fecha, post.hora_inicio, post.hora_fin, post.tolerancia_min, post.confirmar, post.empleados.sort()],
    [10, "Doble turno · Producción", hoy, "11:00", "19:00", 30, true, [201, 204]]);

  // Cancelar turno (pide confirmación).
  await page.getByRole("button", { name: "Cancelar turno" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Sí, cancelar turno" }).click();
  for (let i = 0; i < 40 && !pedidos.some((x) => x.ruta.endsWith("/7/cancelar")); i++) await dormir(100);
  assert.ok(pedidos.some((x) => x.metodo === "POST" && x.ruta.endsWith("/7/cancelar")));

  // Teléfono: sin desbordar la página (la tabla se desplaza dentro de su tarjeta).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Doble turno · Producción" }).waitFor();
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(ancho <= 1, `la página desborda ${ancho}px en teléfono`);
  const tarjetas = await page.getByRole("list", { name: "Personas del turno" }).innerText();
  assert.match(tarjetas, /Iván Delgado[\s\S]*Entró 11:04[\s\S]*4 h 56 min/);
  assert.match(tarjetas, /Luis Ochoa[\s\S]*Sin checada en este turno/);
  if (OUT) await page.screenshot({ path: `${OUT}/turnos-extra-movil.png`, fullPage: true });

  // Sin migración: aviso claro y botón deshabilitado.
  // (contexto nuevo: el caché sin conexión de la app sirve la última respuesta buena ante un 5xx).
  modo = "sin_migracion";
  const ctx2 = await browser.newContext({ viewport: { width: 1500, height: 950 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx2.addCookies([{ name: "token", value: token, url: base }]);
  const p2 = await ctx2.newPage();
  p2.on("pageerror", (e) => errores.push(e.message));
  await p2.route("**/*", rutas);
  await p2.goto(base + "/panel/turnos-extra", { waitUntil: "domcontentloaded" });
  await p2.getByText(/todavía no está activado en el servidor/).waitFor({ timeout: 30000 });
  assert.equal(await p2.getByRole("button", { name: /Nuevo turno extra/ }).isDisabled(), true);

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK turnos extra: lista, detalle en vivo, avisos, confirmación de graves, guardar, cancelar, teléfono y sin migración");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
