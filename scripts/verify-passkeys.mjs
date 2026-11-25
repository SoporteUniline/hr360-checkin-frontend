// Recorrido en navegador de passkeys (Face ID / huella) y sesiones revocables (25/11/2026), contra el BACKEND REAL
// (rutas /api/users y /api/auth del repo del backend, con su base de PRUEBA) y un autenticador virtual de Chromium
// (CDP WebAuthn: llave de plataforma con verificación de usuario y passkey descubrible). Lo demás del API se simula.
// A 1440 (dueña, panel) y a 390 (empleada en iPhone, /empleado):
//   contraseña → «¿Activar…?» → Activar → cerrar sesión (el servidor la cierra) → entrar con passkey → dispositivos →
//   quitar la passkey → la sesión abierta con ella queda revocada y se vuelve al login con aviso.
// Uso (después de `NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build`):
//   ADAMIA_BACKEND_DIR=../hr360-checkin-backend PASSKEYS_TEST_DB=ci_contrasena NOMINA_TEST_USER=… NOMINA_TEST_PASSWORD=… \
//   CAPTURAS=/ruta/capturas PLAYWRIGHT_MODULE_PATH=… node scripts/verify-passkeys.mjs
// Sin ADAMIA_BACKEND_DIR no corre (dice por qué y termina sin error).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BACKEND_DIR = process.env.ADAMIA_BACKEND_DIR;
if (!BACKEND_DIR) {
  console.log("OMITIDO verify-passkeys: define ADAMIA_BACKEND_DIR (repo del backend) y PASSKEYS_TEST_DB (base de prueba).");
  process.exit(0);
}
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const CAPTURAS = process.env.CAPTURAS || path.resolve("capturas-passkeys");
mkdirSync(CAPTURAS, { recursive: true });

async function puertoLibre() {
  const s = createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const puertoFront = await puertoLibre();
const puertoBack = await puertoLibre();
const base = `http://localhost:${puertoFront}`;
const backend = `http://127.0.0.1:${puertoBack}`;
const API = "https://api.prueba.invalid/api";
const secreto = randomUUID();

const back = spawn(process.execPath, ["tests/helpers/servidorPasskeysE2E.cjs"], {
  cwd: BACKEND_DIR,
  stdio: ["ignore", "pipe", "inherit"],
  env: { ...process.env, PORT: String(puertoBack), JWT_SECRET: secreto, WEBAUTHN_RP_ID: "localhost", WEBAUTHN_ORIGENES: base, SESIONES_CACHE_SEGUNDOS: "1" },
});
let listo = false;
back.stdout.on("data", (d) => { if (String(d).includes("LISTO")) listo = true; });
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(puertoFront), "-H", "127.0.0.1"], {
  stdio: "ignore", env: { ...process.env, JWT_SECRET: secreto },
});

const verificarToken = async (token) => (await fetch(`${backend}/api/users/verify/token`, { headers: { authorization: `Bearer ${token}` } }));

const CORS = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" };
async function prepararPagina(ctx) {
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const ruta = url.pathname.replace(/^\/api/, "");
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (ruta.startsWith("/users/") || ruta.startsWith("/auth/")) {
      // Al backend real (mismo método, encabezados y cuerpo).
      const r = await route.fetch({ url: `${backend}/api${ruta}${url.search}` });
      return route.fulfill({ response: r, headers: { ...r.headers(), ...CORS } });
    }
    return route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: "{}" });
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });
  const credenciales = async () => (await cdp.send("WebAuthn.getCredentials", { authenticatorId })).credentials;
  return { page, errores, credenciales };
}

const token = async (ctx) => (await ctx.cookies()).find((c) => c.name === "token")?.value;

async function recorrido(datos) {
  const ctx = await browser.newContext({ viewport: datos.viewport, userAgent: datos.userAgent, locale: "es-MX", isMobile: datos.viewport.width < 500, hasTouch: datos.viewport.width < 500 });
  const pagina = await prepararPagina(ctx);
  try {
    return await pasos(ctx, pagina, datos);
  } catch (e) {
    await pagina.page.screenshot({ path: path.join(CAPTURAS, `${datos.nombre}-FALLA.png`), fullPage: true }).catch(() => {});
    console.error(`Falla en ${datos.nombre} (${pagina.page.url()}). Errores de página:`, pagina.errores);
    throw e;
  } finally {
    await ctx.close();
  }
}

async function pasos(ctx, { page, errores, credenciales }, { nombre, correo, destino, seguridad, textoBoton, tituloOferta, metodo }) {
  const foto = (n) => page.screenshot({ path: path.join(CAPTURAS, `${nombre}-${n}.png`), fullPage: false });

  // 1) Login: el botón de passkey está (texto por plataforma) y el formulario sigue igual.
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: textoBoton }).waitFor({ timeout: 15000 });
  await foto("01-login");

  // 2) Entrar con contraseña → hoja «¿Activar…?».
  await page.getByPlaceholder("ejemplo@empresa.com").fill(correo);
  await page.getByPlaceholder("Ingresa tu contraseña").fill("Clave2026");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.getByRole("dialog").getByText(tituloOferta).waitFor({ timeout: 20000 });
  await page.waitForURL((u) => u.pathname.startsWith(destino), { timeout: 20000 });
  const tokenContrasena = await token(ctx);
  await dormir(600); // fin de la animación de la hoja
  await foto("02-oferta");

  // 3) Activar → la llave queda en el autenticador (descubrible) y en el servidor.
  await page.getByRole("button", { name: "Activar", exact: true }).click();
  await page.getByText(`Listo: la próxima vez entra con ${metodo}.`).waitFor({ timeout: 15000 });
  const [cred] = await credenciales();
  assert.ok(cred?.isResidentCredential, "passkey descubrible");

  // 4) Pantalla de seguridad: 1 passkey y la sesión actual.
  await page.goto(`${base}${seguridad}`, { waitUntil: "networkidle" });
  await page.getByText("Este dispositivo", { exact: true }).waitFor({ timeout: 15000 });
  assert.equal(await page.getByRole("button", { name: /^Quitar / }).count(), 1);
  await foto("03-seguridad-activada");

  // 5) Cerrar sesión: el servidor cierra ESA sesión (el token copiado ya no sirve).
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/login", { timeout: 15000 });
  for (let i = 0; i < 30 && (await verificarToken(tokenContrasena)).status !== 401; i++) await dormir(100);
  const tras = await verificarToken(tokenContrasena);
  assert.deepEqual([tras.status, (await tras.json()).code], [401, "SESION_REVOCADA"]);

  // 6) Entrar con passkey (sin correo).
  await page.getByRole("button", { name: textoBoton }).click();
  await page.waitForURL((u) => u.pathname.startsWith(destino), { timeout: 20000 });
  const tokenPasskey = await token(ctx);
  assert.notEqual(tokenPasskey, tokenContrasena);
  assert.equal((await verificarToken(tokenPasskey)).status, 200);
  assert.equal(await page.getByRole("dialog").count(), 0, "entrando con passkey no se vuelve a ofrecer");
  await foto("04-entro-con-passkey");

  // 7) Dispositivos: la sesión dice cómo entró.
  await page.goto(`${base}${seguridad}`, { waitUntil: "networkidle" });
  await page.getByText(`Entró con ${metodo}`).waitFor({ timeout: 15000 });
  await foto("05-dispositivos");
  await page.screenshot({ path: path.join(CAPTURAS, `${nombre}-05-dispositivos-completa.png`), fullPage: true });

  // 8) Renombrar.
  await page.getByRole("button", { name: /^Renombrar / }).click();
  await page.getByLabel("Nombre del dispositivo").fill("Mi equipo de prueba");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByText("Mi equipo de prueba").waitFor({ timeout: 10000 });

  // 9) Quitar la passkey → se cierra la sesión abierta con ella → login con aviso.
  await page.getByRole("button", { name: /^Quitar / }).click();
  await page.getByRole("alertdialog").getByText("¿Quitar «Mi equipo de prueba»?").waitFor();
  await dormir(400); // fin de la animación
  await foto("06-confirmar-quitar");
  await page.getByRole("alertdialog").getByRole("button", { name: "Quitar" }).click();
  await page.waitForURL((u) => u.pathname === "/login" && u.search.includes("aviso=sesion-cerrada"), { timeout: 15000 });
  await page.getByText("Tu sesión se cerró. Vuelve a iniciar sesión.").waitFor({ timeout: 10000 });
  const quitada = await verificarToken(tokenPasskey);
  assert.deepEqual([quitada.status, (await quitada.json()).code], [401, "SESION_REVOCADA"]);
  await foto("07-sesion-revocada");

  // 10) La passkey quitada ya no entra (el autenticador aún la tiene; el servidor no): mensaje claro y formulario.
  await page.getByRole("button", { name: textoBoton }).click();
  await page.getByRole("alert").getByText(/ya no está registrado en ADAMIA/).waitFor({ timeout: 15000 });
  assert.ok(await page.getByRole("button", { name: "Ingresar" }).isVisible());
  await foto("08-passkey-quitada");

  // 11) Sin desbordes horizontales en ninguna de las pantallas recorridas.
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ancho <= 0, `${nombre}: sin desborde horizontal (${ancho}px)`);
  return errores;
}

let exito = false;
const browser = await chromium.launch({ args: ["--host-resolver-rules=MAP localhost 127.0.0.1"] });
try {
  for (let i = 0; !listo; i++) { if (i > 200) throw new Error("El backend de prueba no arrancó"); await dormir(150); }
  for (let i = 0; ; i++) { try { if ((await fetch(`http://127.0.0.1:${puertoFront}/login`)).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }

  const erroresEscritorio = await recorrido({
    nombre: "1440", viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    correo: "duena@x.mx", destino: "/panel", seguridad: "/panel/seguridad",
    textoBoton: "Entrar con tu passkey", tituloOferta: "¿Activar una passkey para entrar más rápido?", metodo: "passkey",
  });
  const erroresMovil = await recorrido({
    nombre: "390", viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    correo: "ana@x.mx", destino: "/empleado", seguridad: "/empleado/panel/seguridad",
    textoBoton: "Entrar con Face ID", tituloOferta: "¿Activar Face ID para entrar más rápido?", metodo: "Face ID",
  });
  // Errores de página solo por el API simulado de otras pantallas (respuestas «{}»); se muestran para revisarlos.
  if (erroresEscritorio.length || erroresMovil.length) console.log("Errores de página (API simulado):", [...new Set([...erroresEscritorio, ...erroresMovil])]);
  exito = true;
  console.log(`OK passkeys: contraseña → activar → cerrar sesión → entrar con passkey → dispositivos → quitar → revocada (1440 y 390). Capturas en ${CAPTURAS}`);
} finally {
  await browser.close();
  next.kill();
  back.kill("SIGTERM");
  if (!exito) process.exitCode = 1;
}
