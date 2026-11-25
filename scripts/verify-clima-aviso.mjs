// Verificación en navegador del aviso de encuestas por contestar y de la liga del correo de Clima, con backend simulado
// (nada sale a internet): correo → /login?next=/mis-encuestas → tras entrar, sus encuestas; aviso y número en la app del
// empleado y en el panel; RH o dueño con ficha contestan desde el panel (con la empresa de la encuesta); RH sin ficha y
// empleado sin pendientes no ven aviso; ?next= externo se ignora; sesión vencida vuelve al login recordando la ruta.
// Sin desborde a 1440 ni a 390 px.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      && PLAYWRIGHT_MODULE_PATH=… node scripts/verify-clima-aviso.mjs   (CAPTURAS=<carpeta> guarda capturas)
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
// «localhost»: las redirecciones del middleware arman la URL con el host que ve Next (localhost con next start).
const base = `http://localhost:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  stdio: "ignore",
  env: { ...process.env, JWT_SECRET: secret },
});
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const CAMBIO = "Cambio: los resultados de las encuestas de clima se ven aunque respondan pocas personas.";

const empresas_detalle = [
  { id_empresa: 7, nombre: "Tiendas del Centro", estado: "Activo", zona_horaria: "America/Mexico_City" },
  { id_empresa: 9, nombre: "Taller Norte", estado: "Activo", zona_horaria: "America/Mexico_City" },
];
const RH_BASE = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 7, empresas: [7, 9], empresas_detalle, zona_horaria: "America/Mexico_City" };
const USUARIOS = {
  ana: { ...RH_BASE, tipo_usuario: "Empleado", id_empleado: 101, empresas: [7], empresas_detalle: [empresas_detalle[0]], nombre: "Ana Torres" },
  beto: { ...RH_BASE, tipo_usuario: "Empleado", id_empleado: 102, empresas: [7], empresas_detalle: [empresas_detalle[0]], nombre: "Beto Ruiz" },
  duena: { ...RH_BASE, nombre: "Diana Dueña", correo: "diana@prueba.invalid" },
  rh: { ...RH_BASE, nombre: "Rosa RH", correo: "rosa@prueba.invalid" },
  vencido: { ...RH_BASE, tipo_usuario: "Empleado", id_empleado: 103, nombre: "Sesión vencida" },
};

function token(quien) {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ tipo_usuario: USUARIOS[quien].tipo_usuario, id_usuario: -1, quien, exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const quienDe = (auth) => {
  try {
    return JSON.parse(Buffer.from(String(auth).split(" ")[1].split(".")[1], "base64url").toString()).quien;
  } catch {
    return null;
  }
};

// ───────── backend simulado ─────────
const CIERRA = "2026-12-05";
const DEFINICION = [
  {
    clave: "s1",
    titulo: "Tu trabajo",
    preguntas: [
      { clave: "a1", tipo: "escala", texto: "Me siento a gusto en mi trabajo.", dimension: "ambiente", requerida: true },
      { clave: "h1", tipo: "sino", texto: "¿Tienes las herramientas que necesitas?", dimension: "herramientas", requerida: true },
    ],
  },
];
const ESCALA = ["Totalmente en desacuerdo", "En desacuerdo", "Ni de acuerdo ni en desacuerdo", "De acuerdo", "Totalmente de acuerdo"].map(
  (texto, i) => ({ valor: i + 1, texto })
);
// Encuesta de cada quien: Ana (empleada, empresa 7) y Diana (dueña con ficha en la empresa 9).
const ENCUESTAS = {
  ana: { id: 21, empresa: 7, nombre: "Clima general" },
  duena: { id: 31, empresa: 9, nombre: "Pulso de diciembre" },
};
const pendiente = { ana: true, duena: true };
const enviadas = [];
const llamadas = [];

async function atender(route) {
  const req = route.request();
  const url = new URL(req.url());
  if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
  const cors = {
    "Access-Control-Allow-Origin": base,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  };
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
  if (url.origin !== "https://api.prueba.invalid") return json({}); // nada a internet
  const p = url.pathname.replace(/^\/api/, "");
  const quien = quienDe(req.headers().authorization);
  if (p === "/users/login") {
    const correo = JSON.parse(req.postData() || "{}").correo || "";
    const q = Object.keys(USUARIOS).find((k) => correo.startsWith(`${k}@`));
    return q ? json({ token: token(q), tipo_usuario: USUARIOS[q].tipo_usuario, esEmpleado: USUARIOS[q].tipo_usuario === "Empleado" }) : json({ error: "Credenciales inválidas" }, 401);
  }
  if (p === "/users/verify/token") {
    if (!quien || quien === "vencido") return json({ error: "Token inválido o expirado" }, 401);
    return json({ user: USUARIOS[quien] });
  }
  if (p.includes("eventos-checada")) return route.abort();
  if (!p.startsWith("/checador/clima")) return json({});
  const e = p.slice("/checador/clima".length);
  llamadas.push(`${req.method()} ${e}${url.search}`);
  if (quien === "rh") return json({ ok: false, codigo: "SIN_FICHA", error: "Tu usuario no tiene una ficha de empleado activa en esta empresa." }, 403);
  const mia = ENCUESTAS[quien];
  if (e === "/mis-encuestas") {
    const encuestas = mia ? [{ ...mia, tipo: "clima", cierra_el: CIERRA, contestada: !pendiente[quien], estado: "activa" }] : [];
    return json({ ok: true, pendientes: encuestas.filter((x) => !x.contestada).length, encuestas });
  }
  const m = /^\/encuestas\/(\d+)(\/respuestas)?$/.exec(e);
  if (m && mia && Number(m[1]) === mia.id) {
    // RH o dueño: la empresa de la encuesta viaja en ?empresa= (el servidor la valida contra la sesión).
    if (USUARIOS[quien].tipo_usuario !== "Empleado" && url.searchParams.get("empresa") !== String(mia.empresa))
      return json({ ok: false, codigo: "SIN_FICHA", error: "Empresa equivocada" }, 403);
    if (m[2]) {
      enviadas.push({ quien, ruta: `${e}${url.search}`, cuerpo: JSON.parse(req.postData() || "null") });
      pendiente[quien] = false;
      return json({ ok: true }, 201);
    }
    if (!pendiente[quien]) return json({ ok: true, contestada: true, encuesta: { id: mia.id, nombre: mia.nombre } });
    return json({
      ok: true,
      contestada: false,
      encuesta: { id: mia.id, nombre: mia.nombre, tipo: "clima", cierra_el: CIERRA, anonima: true, minimo: 5, secciones: DEFINICION, escala: ESCALA },
    });
  }
  return json({ ok: false, error: `Ruta simulada no definida: ${req.method()} ${e}` }, 404);
}

// ───────── navegador ─────────
const errores = [];
let exito = false;
let pagina = null;
const browser = await chromium.launch();
async function sesion(quien, viewport) {
  const ctx = await browser.newContext({ viewport, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: viewport.width < 500 });
  if (quien) await ctx.addCookies([{ name: "token", value: token(quien), url: base }]);
  const pg = await ctx.newPage();
  pagina = pg;
  pg.on("pageerror", (err) => errores.push(err.message));
  await pg.route("**/*", atender);
  return pg;
}
const ir = (pg, ruta) => pg.goto(base + ruta, { waitUntil: "domcontentloaded" });
const captura = (pg, nombre) =>
  process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true }) : null;
async function sinDesborde(pg, nombre) {
  await dormir(200);
  const r = await pg.evaluate(() => ({ ancho: document.documentElement.scrollWidth, ventana: window.innerWidth }));
  assert.ok(r.ancho <= r.ventana + 1, `${nombre}: la página se desborda (${r.ancho} > ${r.ventana})`);
}
async function entrar(pg, correo) {
  // Espera a que React tome el formulario (si se llena antes, la hidratación lo deja vacío).
  await pg.waitForLoadState("load");
  await pg.waitForFunction(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ingresar");
    return b && Object.keys(b).some((k) => k.startsWith("__react"));
  });
  await pg.getByLabel("Correo electrónico").fill(correo);
  await pg.getByLabel("Contraseña", { exact: true }).fill("secreto");
  await pg.getByRole("button", { name: "Ingresar" }).click();
}
async function contestar(pg) {
  await pg.getByText("Pregunta 1 de 2").waitFor({ timeout: 30000 });
  await pg.getByRole("button", { name: "De acuerdo", exact: true }).click();
  await pg.getByText("Pregunta 2 de 2").waitFor();
  await pg.getByRole("button", { name: "Sí", exact: true }).click();
  await pg.getByRole("button", { name: "Enviar respuestas" }).click();
  await pg.getByText("¡Gracias por contestar!").waitFor({ timeout: 15000 });
}
const AVISO = "Encuestas por contestar";

try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/login`)).status) break;
    } catch {
      /* aún no */
    }
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }

  // 1) Ana abre el botón del correo sin sesión: /login?next=/mis-encuestas → entra → sus encuestas en la app del empleado.
  const ana = await sesion(null, { width: 390, height: 844 });
  await ir(ana, "/login?next=%2Fmis-encuestas");
  await entrar(ana, "ana@prueba.invalid");
  await ana.waitForURL("**/empleado/panel/encuestas", { timeout: 30000 });
  await ana.getByRole("link", { name: /Clima general/ }).waitFor({ timeout: 30000 });
  // Cambio de regla (25/11/2026): nota para quien ya contestó y aviso honesto de privacidad, sin correos nuevos.
  await ana.getByText(CAMBIO).waitFor();
  await ana.getByText(/Tus respuestas no llevan tu nombre\. En equipos pequeños, RH podría deducir quién contestó\./).first().waitFor();
  assert.equal(await ana.getByText(/grupos de 5 o más/).count(), 0);
  await sinDesborde(ana, "390 encuestas del empleado");
  await captura(ana, "390-empleado-encuestas-tras-login");
  console.log("PASS: correo → /login?next=/mis-encuestas → tras entrar, la lista de encuestas del empleado");

  // 2) Inicio del empleado: aviso arriba y número en «Mi espacio» (barra) y en «Encuestas» (Mi espacio).
  await ir(ana, "/empleado/panel/inicio");
  const aviso = ana.getByRole("region", { name: AVISO });
  await aviso.getByText("Tienes 1 encuesta por contestar").waitFor({ timeout: 30000 });
  const barra = ana.getByRole("navigation", { name: "Navegación del colaborador" });
  await barra.getByRole("link", { name: "Mi espacio, 1 encuesta por contestar" }).waitFor();
  await sinDesborde(ana, "390 inicio con aviso");
  await captura(ana, "390-empleado-inicio-aviso");
  await barra.getByRole("link", { name: /Mi espacio/ }).click();
  await ana.getByRole("link", { name: /Encuestas.*1 por contestar|Encuestas/ }).first().waitFor({ timeout: 30000 });
  assert.equal(await ana.getByRole("main").getByLabel("1 por contestar").count(), 1, "número junto a «Encuestas» en Mi espacio");
  await sinDesborde(ana, "390 mi espacio");
  await captura(ana, "390-empleado-mi-espacio");
  await ir(ana, "/empleado/panel/inicio");
  await aviso.getByRole("link", { name: "Contestar" }).click();
  await ana.waitForURL("**/empleado/panel/encuestas/21", { timeout: 30000 });
  await contestar(ana);
  assert.equal(enviadas.at(-1).ruta, "/encuestas/21/respuestas", "el empleado no manda empresa");
  assert.doesNotMatch(JSON.stringify(enviadas), /Ana|101|Torres|diana|Diana/, "el cuerpo no lleva datos de la persona");
  await ana.getByRole("link", { name: "‹ Encuestas" }).click();
  await ana.getByText("No tienes encuestas pendientes").waitFor({ timeout: 30000 });
  await ir(ana, "/empleado/panel/inicio");
  await ana.getByText("Tu jornada de hoy").waitFor({ timeout: 30000 });
  await dormir(500);
  assert.equal(await ana.getByRole("region", { name: AVISO }).count(), 0, "contestada: ya no hay aviso");
  assert.equal(await barra.getByLabel("1 por contestar").count(), 0, "ni número en la barra");
  console.log("PASS: empleado: aviso, número en la barra y en Mi espacio; contesta y desaparecen");

  // 3) Empleado sin pendientes (1440 y 390): sin aviso ni número.
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const beto = await sesion("beto", viewport);
    await ir(beto, "/empleado/panel/inicio");
    await beto.getByText("Tu jornada de hoy").waitFor({ timeout: 30000 });
    for (let i = 0; i < 40 && !llamadas.includes("GET /mis-encuestas"); i++) await dormir(100);
    await dormir(400);
    assert.equal(await beto.getByRole("region", { name: AVISO }).count(), 0, "sin pendientes no hay aviso");
    assert.equal(await beto.getByLabel(/por contestar/).count(), 0, "ni número");
    await sinDesborde(beto, `${viewport.width} inicio sin pendientes`);
    await captura(beto, `${viewport.width}-empleado-sin-pendientes`);
    await beto.context().close();
  }
  console.log("PASS: sin pendientes no se muestra el aviso ni el número");

  // 4) Dueña (también empleada, ficha en la empresa 9): correo → login → «Mis encuestas» del panel.
  const duena = await sesion(null, { width: 1440, height: 1000 });
  await ir(duena, "/mis-encuestas");
  await duena.waitForURL("**/login?next=%2Fmis-encuestas", { timeout: 30000 });
  await entrar(duena, "duena@prueba.invalid");
  await duena.waitForURL("**/panel/mis-encuestas", { timeout: 30000 });
  await duena.getByRole("heading", { name: "Mis encuestas" }).waitFor({ timeout: 30000 });
  await duena.getByRole("link", { name: /Pulso de diciembre/ }).waitFor({ timeout: 30000 });
  await duena.getByText(/Taller Norte · Encuesta de clima|Encuesta de clima/).first().waitFor();
  await duena.getByText(CAMBIO).waitFor();
  await sinDesborde(duena, "1440 mis encuestas del panel");
  await captura(duena, "1440-panel-mis-encuestas");
  console.log("PASS: /mis-encuestas sin sesión → login con next → panel «Mis encuestas» de la dueña");

  // 5) Monitor (primera pantalla del panel): aviso y número junto a «Mis encuestas» en el menú.
  await ir(duena, "/panel");
  await duena.waitForURL("**/panel/monitor", { timeout: 30000 });
  const avisoPanel = duena.getByRole("region", { name: AVISO });
  await avisoPanel.getByText("Tienes 1 encuesta por contestar").waitFor({ timeout: 30000 });
  const menu = duena.locator('[data-sidebar="sidebar"]').first();
  const itemMenu = menu.getByRole("button", { name: /Mis encuestas/ });
  await itemMenu.waitFor({ timeout: 30000 });
  assert.equal(await itemMenu.getByLabel("1 por contestar").count(), 1, "número junto a «Mis encuestas»");
  await sinDesborde(duena, "1440 monitor con aviso");
  await captura(duena, "1440-panel-monitor-aviso");
  await avisoPanel.getByRole("link", { name: "Contestar" }).click();
  await duena.waitForURL("**/panel/mis-encuestas/31?empresa=9", { timeout: 30000 });
  await contestar(duena);
  const suya = enviadas.at(-1);
  assert.equal(suya.quien, "duena");
  assert.equal(suya.ruta, "/encuestas/31/respuestas?empresa=9", "contesta con la empresa de la encuesta");
  assert.doesNotMatch(JSON.stringify(suya.cuerpo), /diana|Diana|id_empleado|empleado/i, "sin datos de la persona");
  await sinDesborde(duena, "1440 gracias en el panel");
  await captura(duena, "1440-panel-contestada");
  await ir(duena, "/panel/monitor");
  await duena.getByRole("heading", { name: "Monitor" }).waitFor({ timeout: 30000 });
  await dormir(600);
  assert.equal(await duena.getByRole("region", { name: AVISO }).count(), 0, "contestada: sin aviso en el Monitor");
  await menu.getByRole("button", { name: /Mis encuestas/ }).waitFor();
  assert.equal(await menu.getByLabel("1 por contestar").count(), 0, "sin número en el menú");
  console.log("PASS: dueña: aviso en el Monitor y número en el menú; contesta desde el panel con su empresa");

  // 6) Dueña en celular (390): Monitor con aviso y contestar en el panel, sin desborde.
  pendiente.duena = true;
  const duenaCel = await sesion("duena", { width: 390, height: 844 });
  await ir(duenaCel, "/panel/monitor");
  await duenaCel.getByRole("region", { name: AVISO }).getByText("Tienes 1 encuesta por contestar").waitFor({ timeout: 30000 });
  await sinDesborde(duenaCel, "390 monitor con aviso");
  await captura(duenaCel, "390-panel-monitor-aviso");
  await ir(duenaCel, "/panel/mis-encuestas");
  await duenaCel.getByRole("link", { name: /Pulso de diciembre/ }).waitFor({ timeout: 30000 });
  await sinDesborde(duenaCel, "390 mis encuestas del panel");
  await captura(duenaCel, "390-panel-mis-encuestas");
  await ir(duenaCel, "/panel/mis-encuestas/31?empresa=9");
  await duenaCel.getByText("Pregunta 1 de 2").waitFor({ timeout: 30000 });
  await sinDesborde(duenaCel, "390 contestar en el panel");
  await captura(duenaCel, "390-panel-contestar");
  console.log("PASS: panel de la dueña a 390 sin desborde");

  // 7) RH sin ficha de empleado: ni aviso ni «Mis encuestas» en el menú; por URL, mensaje claro.
  const rh = await sesion("rh", { width: 1440, height: 1000 });
  await ir(rh, "/panel/monitor");
  await rh.getByRole("heading", { name: "Monitor" }).waitFor({ timeout: 30000 });
  for (let i = 0; i < 40 && !llamadas.some((l) => l === "GET /mis-encuestas"); i++) await dormir(100);
  await dormir(600);
  assert.equal(await rh.getByRole("region", { name: AVISO }).count(), 0, "RH sin ficha: sin aviso");
  assert.equal(await rh.locator('[data-sidebar="sidebar"]').first().getByRole("button", { name: /Mis encuestas/ }).count(), 0, "ni menú");
  await ir(rh, "/panel/mis-encuestas");
  await rh.getByText("No encontramos tu ficha de empleado").waitFor({ timeout: 30000 });
  await captura(rh, "1440-panel-rh-sin-ficha");
  console.log("PASS: RH sin ficha no ve aviso ni menú; por URL ve el motivo");

  // 8) Con sesión abierta el login respeta next interno e ignora uno externo.
  const anaOtra = await sesion("ana", { width: 390, height: 844 });
  await ir(anaOtra, "/login?next=%2Fmis-encuestas");
  await anaOtra.waitForURL("**/empleado/panel/encuestas", { timeout: 30000 });
  await ir(anaOtra, "/login?next=%2F%2Fevil.example%2Fpanel");
  await anaOtra.waitForURL(/\/empleado(\/panel\/inicio)?$/, { timeout: 30000 });
  assert.equal(new URL(anaOtra.url()).origin, base, "no sale a otro sitio");
  const extra = await sesion(null, { width: 390, height: 844 });
  await ir(extra, "/login?next=https%3A%2F%2Fevil.example%2F");
  await entrar(extra, "beto@prueba.invalid");
  await extra.waitForURL(/\/empleado(\/panel\/inicio)?$/, { timeout: 30000 });
  assert.equal(new URL(extra.url()).origin, base, "next externo ignorado al entrar");
  console.log("PASS: ?next= solo interno (con y sin sesión)");

  // 9) Sesión vencida: el shell del empleado y el del panel mandan a /login?next=<ruta actual>.
  const vencido = await sesion("vencido", { width: 390, height: 844 });
  await ir(vencido, "/empleado/panel/encuestas/21");
  await vencido.waitForURL("**/login?next=%2Fempleado%2Fpanel%2Fencuestas%2F21", { timeout: 30000 });
  USUARIOS.vencido.tipo_usuario = "Recruiter";
  const vencidoPanel = await sesion("vencido", { width: 1440, height: 1000 });
  await ir(vencidoPanel, "/panel/mis-encuestas");
  await vencidoPanel.waitForURL("**/login?next=%2Fpanel%2Fmis-encuestas", { timeout: 30000 });
  console.log("PASS: sesión vencida → /login?next=<ruta actual> (empleado y panel)");

  assert.deepEqual(errores, [], `errores en la página: ${errores.join(" | ")}`);
  exito = true;
  console.log("OK: aviso de encuestas y liga del correo verificados");
} finally {
  if (!exito && pagina)
    console.error(
      "Se quedó en",
      pagina.url(),
      "→",
      (await pagina.locator("body").innerText().catch(() => "")).slice(0, 600),
      "\nLlamadas:",
      llamadas.slice(-10),
      "\nErrores:",
      errores
    );
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
