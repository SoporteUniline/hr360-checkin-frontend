// Verificación DE PUNTA A PUNTA de Reclutamiento real (03/12/2026): navegador → frontend → backend real
// (rutas de panel, vacantes, postulaciones, OTP y WhatsApp contra MariaDB de prueba; ver backend
// scripts/servidor-prueba-reclutamiento.cjs: solo sesión, S3, correo, SMS y efectos externos del alta simulados).
// Recorrido: crear vacante con el asistente → lista y detalle → bolsa de trabajo → un candidato se postula (celular,
// con código de verificación) → moverlo de etapa → nota → contratarlo y verlo como empleado. Después, cada pantalla
// a 390 px: sin desborde horizontal y controles de al menos 44 px.
// Uso:
//   NEXT_PUBLIC_RUTA_BACKEND=http://127.0.0.1:4020/api NEXT_PUBLIC_RECRUITMENT_ENABLED=true npm run build
//   BACKEND_DIR=../hr360-checkin-backend RECLUTAMIENTO_TEST_DB=reclutamiento_prueba NOMINA_TEST_USER=u NOMINA_TEST_PASSWORD=p node scripts/verify-reclutamiento-real.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const BACKEND_DIR = path.resolve(process.env.BACKEND_DIR || "../hr360-checkin-backend");
const API = "http://127.0.0.1:4020/api";
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true }) : null);

const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (payload) => { const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 })}`; return `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`; };
const RH = { tipo_usuario: "Recruiter", id_usuario: 3, nombre: "Rita RH", correo: "rh7@x.mx", empresas: [7], empresas_detalle: [{ id_empresa: 7, nombre: "Empacadora" }] };
const tokenRH = jwt(RH);

const backend = spawn(process.execPath, ["scripts/servidor-prueba-reclutamiento.cjs"], { cwd: BACKEND_DIR, env: { ...process.env, PUERTO: "4020", ORIGEN: base, DISABLE_CRONS: "true" }, stdio: ["ignore", "pipe", "pipe"] });
let salidaBackend = "";
backend.stdout.on("data", (d) => { salidaBackend += d; });
backend.stderr.on("data", (d) => { salidaBackend += d; });
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });

// Controles del módulo (dentro de [data-reclutamiento] o de un diálogo) más chicos que 44 px o fuera de la pantalla.
async function revisarMovil(pg, pantalla) {
  const r = await pg.evaluate(() => {
    const visibles = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
    const raiz = [...document.querySelectorAll("[data-reclutamiento], [role=dialog]")];
    const controles = raiz.flatMap((r) => [...r.querySelectorAll("button, a[href], select, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, label:has(input[type=checkbox])")]);
    const chicos = [...new Set(controles)].filter(visibles).filter((el) => !el.closest("label:has(input[type=checkbox])") || el.tagName === "LABEL")
      .map((el) => ({ el, b: el.getBoundingClientRect() }))
      .filter(({ b }) => b.height < 44 - 0.5)
      .map(({ el, b }) => `${el.tagName.toLowerCase()} «${(el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || "").trim().slice(0, 40)}» ${Math.round(b.width)}×${Math.round(b.height)}`);
    return { ancho: document.documentElement.scrollWidth, chicos };
  });
  if (r.ancho > 390) problemasMovil.push(`${pantalla}: desborde horizontal (${r.ancho} px)`);
  for (const c of r.chicos) problemasMovil.push(`${pantalla}: ${c}`);
}
const problemasMovil = [];

let exito = false;
let ultima = null; // página activa (captura si algo falla)
const errores = [];
const browser = await chromium.launch();
try {
  for (let i = 0; !salidaBackend.includes("LISTO"); i++) { if (i > 200) throw new Error(`El backend de prueba no arrancó:\n${salidaBackend}`); await dormir(100); }
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: tokenRH, url: base }]);
  const pg = await ctx.newPage();
  ultima = pg;
  pg.on("pageerror", (e) => errores.push(e.message));

  // 1) Crear una vacante con el asistente.
  await pg.goto(base + "/panel/reclutamiento/vacantes", { waitUntil: "domcontentloaded" });
  await pg.getByRole("heading", { name: "Chofer" }).waitFor({ timeout: 40000 }); // vacante de antes, real
  await pg.getByRole("button", { name: "Nueva vacante" }).first().click();
  const asistente = pg.getByRole("dialog");
  await asistente.getByLabel("Nombre del puesto *").fill("Repartidor");
  await asistente.getByLabel("Modalidad *").selectOption({ label: "Presencial" });
  await asistente.getByLabel("Sucursal *").selectOption({ label: "Centro" });
  await asistente.getByLabel("Lugares disponibles *").fill("1");
  await asistente.getByRole("textbox", { name: "Acerca del puesto" }).click();
  await pg.keyboard.type("Reparte pedidos en la zona centro.");
  await asistente.getByRole("button", { name: "Siguiente" }).click();
  await asistente.getByText("¿Cuánta experiencia tienes en un puesto similar?").first().waitFor();
  await asistente.getByRole("button", { name: "Siguiente" }).click();
  await asistente.getByText("Así está quedando tu vacante.").waitFor();
  await captura(pg, "rec-asistente");
  await asistente.getByRole("button", { name: "Publicar vacante" }).click();
  await pg.getByText("Vacante publicada. Ya recibe postulaciones.").waitFor({ timeout: 15000 });

  // 2) Detalle (publicación) y lista.
  await pg.getByRole("heading", { name: "Repartidor", level: 2 }).waitFor({ timeout: 15000 });
  const url = await pg.locator("[class*=urlBox]").innerText();
  const slug = decodeURIComponent(url.split("/vacante/")[1] || "");
  assert.match(slug, /^repartidor-/, `enlace público: ${url}`);
  await pg.getByText("También aparece en la bolsa de trabajo de ADAMIA.").waitFor();
  await pg.getByRole("tab", { name: /WhatsApp/ }).click();
  await pg.getByRole("button", { name: "Copiar enlace de WhatsApp de Repartidor" }).waitFor();
  await pg.getByRole("button", { name: "Preguntas de la entrevista" }).click();
  await pg.getByRole("dialog").getByText(/Repartidor/).first().waitFor({ timeout: 15000 }); // editor real de WhatsApp
  await pg.keyboard.press("Escape");
  await captura(pg, "rec-detalle-whatsapp");
  await pg.goto(base + "/panel/reclutamiento/vacantes", { waitUntil: "domcontentloaded" });
  const tarjeta = pg.locator("article").filter({ hasText: "Repartidor" });
  await tarjeta.getByText("Publicada").waitFor({ timeout: 20000 });
  await tarjeta.getByText("1 de 1 lugar disponible").waitFor();
  await captura(pg, "rec-vacantes");

  // 3) La bolsa de trabajo la muestra (la empresa publica en la bolsa).
  await pg.goto(base + "/bolsa-de-trabajo", { waitUntil: "domcontentloaded" });
  await pg.getByText("Repartidor").first().waitFor({ timeout: 30000 });

  // 4) Un candidato se postula desde su celular.
  const cc = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: true });
  const pc = await cc.newPage();
  ultima = pc;
  pc.on("pageerror", (e) => errores.push(e.message));
  await pc.goto(`${base}/vacante/${encodeURIComponent(slug)}`, { waitUntil: "domcontentloaded" });
  const avisoCookies = pc.getByRole("button", { name: "Solo necesarias" });
  if (await avisoCookies.isVisible({ timeout: 3000 }).catch(() => false)) await avisoCookies.click();
  await pc.getByRole("button", { name: "Postularme Ahora" }).click();
  const hoja = pc.getByRole("dialog");
  const llenar = (nombre, valor) => hoja.locator(`[name="${nombre}"]`).fill(valor);
  await hoja.getByRole("button", { name: "Información Personal" }).click();
  await llenar("nombre_completo", "Ana María García López");
  await llenar("correo", "ana.g@x.mx");
  await llenar("telefono", "5511112222");
  await llenar("sexo", "Mujer");
  await hoja.getByRole("combobox").filter({ hasText: "Selecciona uno" }).click();
  await pc.getByRole("option", { name: "Soltero(a)" }).click();
  await llenar("curp", "GAPA900101MJCRRN09");
  await hoja.getByRole("button", { name: "Formación Académica" }).click();
  await hoja.getByRole("combobox").filter({ hasText: "Selecciona un nivel" }).click();
  await pc.getByRole("option", { name: "Licenciatura" }).click();
  await llenar("institucion", "UdeG");
  await llenar("carrera", "Administración");
  await hoja.getByRole("button", { name: "Experiencia Laboral" }).click();
  for (const [n, v] of [["ultimo_puesto", "Repartidora"], ["empresa_anterior", "Tienda"], ["duracion_puesto", "2 años"], ["ultimo_salario", "10000"], ["motivo_salida", "Crecer"]]) await llenar(n, v);
  await hoja.getByLabel("¿Cuánta experiencia tienes en un puesto similar? *").selectOption("1 a 3 años");
  await hoja.locator('input[type="file"]').setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 prueba") });
  await hoja.getByRole("checkbox").last().click();
  await hoja.getByRole("button", { name: "Enviar Solicitud" }).click();
  await hoja.getByText("ingresa el codigo para continuar").waitFor({ timeout: 15000 });
  await hoja.locator('input[autocomplete="one-time-code"], input[data-input-otp]').first().fill("123456");
  // El aviso «Código de verificación enviado» (pantalla pública de siempre) queda encima del botón a 390 px:
  // se dispara el clic directamente en el botón.
  await hoja.getByRole("button", { name: "Verificar Código" }).dispatchEvent("click");
  await pc.getByText(/Postulación enviada exitosamente/).waitFor({ timeout: 20000 });
  await captura(pc, "rec-postulacion-movil");

  // 5) RH la ve en Candidatos (con la de WhatsApp) y la mueve de etapa.
  ultima = pg;
  await pg.goto(base + "/panel/reclutamiento/candidatos", { waitUntil: "domcontentloaded" });
  await pg.getByText("Wendy Ruiz").first().waitFor({ timeout: 30000 }); // llegó por WhatsApp
  await pg.getByRole("button", { name: /Ana María García López/ }).first().click();
  await pg.getByText("¿Cuánta experiencia tienes en un puesto similar?").waitFor({ timeout: 15000 });
  await pg.getByText("1 a 3 años").waitFor();
  await pg.getByLabel("Etapa del proceso").selectOption({ label: "En revisión" });
  await pg.getByRole("region", { name: "Expediente del candidato" }).getByText("En revisión", { exact: true }).first().waitFor({ timeout: 15000 });

  // 6) Nota interna.
  await pg.getByRole("tab", { name: "Seguimiento" }).click();
  await pg.getByLabel("Agregar una nota").fill("Conoce bien la zona centro.");
  await pg.getByRole("button", { name: "Guardar nota" }).click();
  await pg.getByText("Conoce bien la zona centro.").waitFor({ timeout: 15000 });
  await pg.getByText("Etapa: En revisión").waitFor();
  await pg.getByText("Rita RH · ", { exact: false }).first().waitFor();

  // 7) Contratar y verla como empleada.
  await pg.getByLabel("Etapa del proceso").selectOption({ label: "Oferta" });
  await pg.getByText("Etapa: Oferta").waitFor({ timeout: 15000 });
  await pg.getByRole("tab", { name: "Contratar" }).click();
  await pg.getByLabel("Fecha de ingreso *").fill("2026-12-15");
  assert.equal(await pg.getByLabel("Nombre(s) *").inputValue(), "Ana María");
  assert.equal(await pg.getByLabel("Apellido paterno *").inputValue(), "García");
  for (const t of ["Datos del candidato revisados", "Oferta aceptada", "Documentación verificada"]) await pg.getByText(t).click();
  await captura(pg, "rec-contratar");
  await pg.getByRole("button", { name: "Completar contratación" }).click();
  await pg.getByText(/Contratación completada\. Se creó su ficha de empleado\. La vacante se cerró/).waitFor({ timeout: 20000 });
  const ficha = pg.getByRole("link", { name: "Ver ficha del empleado" });
  await ficha.waitFor();
  const idEmpleado = Number(new URL(await ficha.getAttribute("href"), base).searchParams.get("id"));
  assert.ok(idEmpleado > 0);
  const idPostulacion = new URL(pg.url()).pathname.split("/").pop();
  const detalle = await (await fetch(`${API}/reclutamiento/panel/postulaciones/${idPostulacion}`, { headers: { authorization: `Bearer ${tokenRH}` } })).json();
  assert.deepEqual(detalle.postulacion.empleado, { id: idEmpleado, nombre: "Ana María García López", estado: "Activo" }, "la ficha existe en empleados");
  await pg.goto(base + "/panel/reclutamiento/seleccion", { waitUntil: "domcontentloaded" });
  await pg.getByRole("region", { name: "Etapa Contratados" }).getByText("Ana María García López").waitFor({ timeout: 20000 });
  await pg.goto(base + "/panel/reclutamiento/vacantes", { waitUntil: "domcontentloaded" });
  await pg.locator("article").filter({ hasText: "Repartidor" }).getByText("Cerrada").waitFor({ timeout: 20000 });

  // 8) Celular: cada pantalla sin desborde y con controles de 44 px.
  const cm = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: true });
  await cm.addCookies([{ name: "token", value: tokenRH, url: base }]);
  const pm = await cm.newPage();
  ultima = pm;
  pm.on("pageerror", (e) => errores.push(e.message));
  const idVacante = (await (await fetch(`${API}/reclutamiento/panel/resumen`, { headers: { authorization: `Bearer ${tokenRH}` } })).json()).vacantes.find((v) => v.titulo === "Repartidor").id;
  const pantallas = [
    ["tablero", "/panel/reclutamiento", "Encuentra talento. Hazlo avanzar."],
    ["vacantes", "/panel/reclutamiento/vacantes", "Repartidor"],
    ["vacante", `/panel/reclutamiento/vacantes/${idVacante}`, "Acerca del puesto"],
    ["vacante-whatsapp", `/panel/reclutamiento/vacantes/${idVacante}?seccion=whatsapp`, "Candidatos de WhatsApp"],
    ["candidatos", "/panel/reclutamiento/candidatos", "Wendy Ruiz"],
    ["candidato", `/panel/reclutamiento/candidatos/${idPostulacion}?seccion=hiring`, "Contratación completada"],
    ["candidato-whatsapp", "/panel/reclutamiento/candidatos/wa-1", "Abrir conversación"],
    ["seleccion", "/panel/reclutamiento/seleccion", "Ana María García López"],
    ["contrataciones", "/panel/reclutamiento/contrataciones", "Ana María García López"],
    ["catalogos", "/panel/reclutamiento/catalogos", "Modalidades"],
  ];
  for (const [nombre, ruta, texto] of pantallas) {
    await pm.goto(base + ruta, { waitUntil: "domcontentloaded" });
    await pm.locator("[data-reclutamiento]").getByText(texto).locator("visible=true").first().waitFor({ timeout: 30000 });
    await dormir(300);
    await revisarMovil(pm, nombre);
    await captura(pm, `rec-movil-${nombre}`);
  }
  await pm.goto(base + "/panel/reclutamiento/vacantes", { waitUntil: "domcontentloaded" });
  await pm.getByRole("button", { name: "Nueva vacante" }).first().click();
  await pm.getByRole("dialog").getByLabel("Nombre del puesto *").waitFor();
  await revisarMovil(pm, "asistente");
  await captura(pm, "rec-movil-asistente");

  assert.deepEqual(problemasMovil, [], "390 px: sin desborde y controles de al menos 44 px");
  assert.deepEqual(errores, [], "sin errores de JavaScript en la página");
  exito = true;
  console.log("OK · Reclutamiento real de punta a punta (escritorio y 390 px)");
} catch (e) {
  if (process.env.CAPTURAS && ultima) await ultima.screenshot({ path: `${process.env.CAPTURAS}/rec-falla.png`, fullPage: true }).catch(() => {});
  console.error("Errores de la página:", errores);
  throw e;
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  backend.kill();
  if (!exito) { console.error(salidaBackend.split("\n").filter((l) => !/QUERY|POOL/.test(l)).slice(-30).join("\n")); process.exitCode = 1; }
}
