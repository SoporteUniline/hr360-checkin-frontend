// Verificación en navegador del rostro con varias fotos guiadas y el modo «Código y cara» (contrato 24/11/2026).
// Backend simulado según el contrato; cámara falsa de Chromium y face-api simulado con poses (rostro-faceapi-poses.mjs):
// no se prueba la detección real (eso no se puede simular), sí la lógica con huellas sintéticas y la interfaz.
//  1) Reloj de la empresa (1440 y 390): cara sola con referencias por pose; una persona «Código y cara» que intenta con la
//     cara sola → se le pide su código (teclado grande, teclas ≥ 44 px) y la cámara la compara 1 a 1; «¿No te reconoce?
//     Escribe tu código» con código inexistente, sin rostro y cara que no coincide; un rostro parecido (89 %) → intento
//     fallido enviado a POST /checador/reloj/offline/empresa/intentos.
//  2) App del empleado (390): compara SOLO contra sus propias referencias (un compañero no se reconoce aunque esté en las
//     referencias de la empresa) y el intento va a POST /checador/reloj/offline/intentos.
//  3) Mi rostro (390): registro guiado de 5 poses, 409 ROSTRO_PARECIDO con su mensaje, repetir y guardar descriptores.
//  4) Ficha de RH (1440 y 390): intentos visibles (fecha, dónde, motivo, %), fotos registradas, registro guiado de 5 poses
//     que se manda al guardar la ficha (descriptores + descriptor_facial), 409 al guardar.
// Sin desbordes a 1440 ni a 390 y sin errores de JavaScript.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx npx next build
//      && PLAYWRIGHT_MODULE_PATH=… CAPTURAS=/ruta node scripts/verify-rostro-multi.mjs
import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { faceapiPoses, completarPoses, HUELLA_FUENTE } from "./rostro-faceapi-poses.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const huellaDe = new Function(`${HUELLA_FUENTE}; return huellaDe;`)();

const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  stdio: "ignore",
  detached: true,
  env: { ...process.env, JWT_SECRET: secret },
});
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (process.env.CAPTURAS) await mkdir(process.env.CAPTURAS, { recursive: true });
const captura = (pg, nombre, fullPage = false) =>
  process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage }) : null;
const jwt = (payload) => {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${body}.${createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url")}`;
};
const sha = (v) => createHash("sha256").update(v).digest("hex");
const cors = {
  "Access-Control-Allow-Origin": base,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
};
const POSES = ["frente", "arriba", "abajo", "izquierda", "derecha"];
const MODEL = "face-api-0.22.2-128-cosine-v1";

// ---- Datos simulados ----
const refs = (persona) => POSES.map((pose) => ({ pose, descriptor: huellaDe(persona, pose, 0) }));
const persona = (id, nombre, codigo, quien, extra = {}) => ({
  id,
  nombre,
  code_identity: sha(codigo),
  referencias: refs(quien),
  descriptor: huellaDe(quien, "frente", 0),
  reference: `ref-${id}`,
  grant: `grant-${id}`,
  open: false,
  cierre_turno: "Automatico",
  checar_gps: false,
  areas: [],
  ...extra,
});
const ANA = persona(15, "Ana Torres Ruiz", "1001", "ana");
const CARO = persona(3, "Caro Méndez", "3003", "caro", { metodo_chequeo: "codigo_cara" });
const LUIS = persona(30, "Luis Pérez", "3030", "luis");
const codeRefs = [ANA, CARO, LUIS]
  .map(({ id, nombre, code_identity }) => ({ id, nombre, code_identity }))
  .concat([{ id: 4, nombre: "Sin Rostro", code_identity: sha("4004") }]);
const conjunto = (extra) => ({
  kind: "local-face",
  model: MODEL,
  company: 7,
  prepared_at: new Date(Date.now() - 1000).toISOString(),
  expires_at: new Date(Date.now() + 6 * 86400000).toISOString(),
  timezone: "America/Mexico_City",
  code_references: codeRefs,
  ...extra,
});
const datosEmpresa = conjunto({ mode: "company", employee: null, employees: [ANA, CARO, LUIS] });
const datosPersonales = conjunto({ mode: "employee", employee: 15, employees: [ANA], code_references: [] });

const sincronizadas = []; // { url, body }
const intentos = []; // { url, body }
const putsRostro = [];
const putsFicha = [];
let rechazarRostro = 1; // el primer PUT de Mi rostro responde 409 ROSTRO_PARECIDO
let rechazarFicha = 1;
const nombrePor = (id) => [ANA, CARO, LUIS].find((e) => e.id === Number(id))?.nombre ?? "Empleado";

const empresa = { id_empresa: 7, nombre: "Demo", nombre_empresa: "Demo", estado: "Activo", slug: "demo" };
const rh = {
  id_usuario: -1,
  tipo_usuario: "Recruiter",
  id_empresa: 7,
  nombre: "RH Prueba",
  empresas: [7],
  empresas_detalle: [empresa],
  zona_horaria: "America/Mexico_City",
};
const empleadoSesion = {
  id_usuario: 99,
  id_empleado: 15,
  id_empresa: 7,
  tipo_usuario: "Empleado",
  esEmpleado: true,
  nombre: "Ana",
  apellido_paterno: "Torres",
  empresas: [7],
};
const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const emp = {
  id_empleado: 15,
  id_empresa: 7,
  nombre: "Ana",
  apellido_paterno: "Torres",
  apellido_materno: "Ruiz",
  correo: "ana@prueba.mx",
  estado: "Activo",
  nip: "1001",
  puesto: "Supervisora",
  sucursal: "Centro",
  departamento: "Operación",
  telefono: "8112345678",
  fecha_nacimiento: "1990-05-02T00:00:00.000Z",
  porcentaje: "10.00",
  fecha_ingreso: "2024-01-15T00:00:00.000Z",
  periodo_pago: "Quincenal",
  forma_pago: "Fijo",
  forma_calculo: "$",
  sueldo: "12000.00",
  hrs_por_dia: "8.00",
  hrs_de_comida: "1.00",
  checar_gps: 0,
  metodo_chequeo: "ambos",
  descriptor_facial: huellaDe("ana", "frente", 0),
  horarios: dias.map((dia) => ({ dia, entrada: "09:00", salida_comida: "14:00", regreso_comida: "15:00", salida: "18:00" })),
};

async function rutas(ctx, usuario) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (d, s = 200) => route.fulfill({ status: s, contentType: "application/json", headers: cors, body: JSON.stringify(d) });
    if (url.origin === base && url.pathname.startsWith("/api/empresas/check-subscription/")) return json({ hasActivePlan: true });
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace(/^\/api/, "");
    const cuerpo = () => {
      try {
        return req.postDataJSON();
      } catch {
        return null;
      }
    };
    if (p.endsWith("/users/verify/token")) return usuario ? json({ user: usuario }) : json({ error: "sin sesión" }, 401);
    if (p.endsWith("/eventos-checada")) return route.abort();
    if (p === "/empresas/slug/demo") return json({ id_empresa: 7, nombre: "Demo" });
    if (p === "/empresas/id/7/slug") return json({ slug: "demo" });
    if (p.startsWith("/checador/reloj/registros-del-dia"))
      return json({ registrosHoy: [], activosHoy: 0, totalRegistrosHoy: 0, zona_horaria: "America/Mexico_City" });
    if (p === "/checador/reloj/offline/empresa/perfil")
      return json({
        scope: "company",
        id_empresa: 7,
        slug: "demo",
        nombre: "Demo",
        grant: "concesion-prueba",
        prepared_at: new Date().toISOString(),
      });
    if (p === "/checador/reloj/offline/perfil")
      return json({
        id_empleado: 15,
        id_empresa: 7,
        nombre: "Ana Torres",
        metodo: "ambos",
        cierre_turno: "Automatico",
        checar_gps: false,
        prepared_at: new Date().toISOString(),
      });
    if (p === "/checador/reloj/offline/empresa/referencias") return json({ ...datosEmpresa, device_id: cuerpo()?.device_id });
    if (p === "/checador/reloj/offline/referencias") return json({ ...datosPersonales, device_id: cuerpo()?.device_id });
    if (p === "/checador/reloj/offline/empresa/sincronizar" || p === "/checador/reloj/offline/sincronizar") {
      const b = cuerpo();
      sincronizadas.push({ url: p, body: b });
      const id = b.local_employee ?? (b.code ? [ANA, CARO, LUIS].find((e) => e.code_identity === sha(b.code))?.id : null);
      return json({
        id: b.id,
        status: "synced",
        action: "entrada",
        message: "Entrada registrada",
        employee: { id, nombre: nombrePor(id) },
      });
    }
    if (p === "/checador/reloj/offline/empresa/intentos" || p === "/checador/reloj/offline/intentos") {
      intentos.push({ url: p, body: cuerpo() });
      return json({ ok: true, guardado: true }, 201);
    }
    // RH: ficha
    if (p === "/checador/empleados/15" && req.method() === "PUT") {
      const texto = req.postDataBuffer()?.toString("utf8") ?? "";
      if (rechazarFicha-- > 0)
        return json(
          {
            error: "Tu rostro se parece mucho al de otra persona registrada. Vuelve a tomar las fotos con buena luz.",
            codigo: "ROSTRO_PARECIDO",
          },
          409
        );
      putsFicha.push(texto);
      return json({ ok: true });
    }
    if (p === "/checador/empleados/15") return json(emp);
    if (p === "/checador/empleados") return json({ data: [emp], total: 1, page: 1, totalPages: 1 });
    if (p === "/checador/mi-espacio/rostro/empleado/15/intentos") {
      // Como el servidor: el de la app es de la persona de la sesión (15); hora de la captura.
      const lista = intentos
        .map((i, n) => ({
          id: n + 1,
          modo: i.url.includes("/empresa/") ? "kiosco" : "app",
          id_empleado: i.url.includes("/empresa/") ? i.body.id_empleado ?? null : 15,
          ...i.body,
          creado_en: new Date(i.body.capturado_en).toISOString().slice(0, 19).replace("T", " "),
        }))
        .filter((x) => x.id_empleado === 15)
        .reverse();
      return json({
        ok: true,
        intentos: lista.map(({ id, creado_en, modo, metodo, motivo, mejor, segundo, id_segundo, dispositivo }) => ({
          id,
          creado_en,
          modo,
          metodo,
          motivo,
          mejor,
          segundo,
          id_segundo,
          dispositivo,
        })),
      });
    }
    if (p === "/checador/mi-espacio/rostro/empleado/15") return json({ ok: true, cambios: [], poses: ["frente"] });
    if (p === "/checador/firma-digital/solicitudes/documento") return json({ success: true, solicitud: null });
    if (p === "/checador/mi-espacio/firma/empleado/15") return json({ ok: true, tiene_firma: false, tiene_pin: false, historial: [] });
    // Empleado: Mi rostro
    if (p === "/checador/mi-espacio/rostro" && req.method() === "GET")
      return json({
        ok: true,
        tiene_rostro: putsRostro.length > 0,
        actualizado_en: putsRostro.length ? "2026-11-24 18:05:00" : null,
        origen: "empleado",
      });
    if (p === "/checador/mi-espacio/rostro" && req.method() === "PUT") {
      const b = cuerpo();
      if (rechazarRostro-- > 0)
        return json(
          {
            ok: false,
            codigo: "ROSTRO_PARECIDO",
            error: "Tu rostro se parece mucho al de otra persona registrada. Vuelve a tomar las fotos con buena luz.",
          },
          409
        );
      putsRostro.push(b);
      return json({ ok: true });
    }
    return json({});
  });
}

const errores = [];
let ultima = null; // página en curso, para la captura si algo falla
async function nuevaPagina(ctx, etiqueta) {
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(`${etiqueta}: ${e.message}`));
  if (process.env.DEPURAR)
    pg.on("console", (m) => {
      if (m.type() === "error" || m.type() === "log") console.error(`[${etiqueta}]`, m.text().slice(0, 500));
    });
  ultima = pg;
  return pg;
}
async function sinDesborde(pg, etiqueta) {
  const m = await pg.evaluate(() => ({ ancho: document.scrollingElement.scrollWidth, vw: innerWidth }));
  assert.ok(m.ancho <= m.vw, `${etiqueta}: sin desborde horizontal (${m.ancho} > ${m.vw})`);
}
async function escena(pg, persona, pose = "frente") {
  await pg.evaluate(
    ([a, b]) => {
      window.__escena = { persona: a, pose: b };
    },
    [persona, pose]
  );
}
// Guarda las referencias en el almacén del navegador, como si el reloj ya las hubiera descargado.
async function sembrar(pg, datos, personal = false) {
  await pg.evaluate(
    async ([d, personalArg]) => {
      const store = await import("/offline-clock/store.mjs?v=12");
      const face = await import("/offline-clock/face.mjs?v=7");
      const device = await face.deviceIdentity(store);
      const session = personalArg ? await store.fingerprint(store.readToken()) : null;
      await store.setValue(personalArg ? `faces:employee:7:15:${session}` : "faces:company:7", { ...d, device_id: device.id });
      window.dispatchEvent(new Event("adamia-face-ready"));
    },
    [datos, personal]
  );
}
// Espera a que terminen las animaciones de entrada (para medir el teclado ya completo).
const sinAnimaciones = (pg) => pg.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))));
const hasta = async (fn, etiqueta, ms = 20000) => {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await fn()) return;
    await dormir(100);
  }
  throw new Error(`Tiempo agotado: ${etiqueta}`);
};

let exito = false;
const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(base + "/login")).status) break;
    } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }

  // ===== 1) Reloj de la empresa a 1440 =====
  const ctxK = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    permissions: ["camera"],
    serviceWorkers: "block",
  });
  await ctxK.addInitScript(() => {
    window.__escena = { persona: "ninguna", pose: "frente" };
  });
  await ctxK.addInitScript({ content: faceapiPoses });
  await rutas(ctxK, null);
  const k = await nuevaPagina(ctxK, "kiosco 1440");
  await k.goto(base + "/demo", { waitUntil: "domcontentloaded" });
  await k.getByPlaceholder("Ingresa tu código").waitFor({ timeout: 30000 });
  await k.locator("[data-estado-camara]").waitFor({ timeout: 30000 });
  await sembrar(k, datosEmpresa);
  const botonCodigoCara = k.getByRole("button", { name: "¿No te reconoce? Escribe tu código" });
  await botonCodigoCara.waitFor();
  assert.ok((await botonCodigoCara.boundingBox()).height >= 44, "botón «¿No te reconoce?» de 44 px");

  // a) Cara sola: Ana se reconoce con sus referencias por pose.
  await escena(k, "ana");
  await k.getByText("Ana Torres Ruiz").first().waitFor({ timeout: 20000 });
  const ana = sincronizadas.find((s) => s.body.local_employee === 15);
  assert.equal(ana.url, "/checador/reloj/offline/empresa/sincronizar");
  assert.equal(ana.body.method, "facial");
  assert.ok(ana.body.local_verification.score >= 0.95, "cara sola con 0.95");
  await escena(k, "ninguna");
  await dormir(3000);

  // b) Caro tiene «Código y cara»: con la cara sola no entra y se le pide su código.
  await escena(k, "caro");
  const teclado = k.getByRole("dialog", { name: "Escribe tu código" });
  await teclado.waitFor({ timeout: 20000 });
  assert.equal(sincronizadas.filter((s) => s.body.local_employee === 3).length, 0, "no se aceptó por cara sola");
  await sinAnimaciones(k);
  const teclas = await teclado
    .getByRole("button")
    .evaluateAll((bs) =>
      bs.map((b) => [
        b.textContent.trim() || b.getAttribute("aria-label"),
        Math.round(b.getBoundingClientRect().height),
        Math.round(b.getBoundingClientRect().width),
      ])
    );
  assert.ok(
    teclas.every(([, h]) => h >= 44),
    `teclas ≥ 44 px: ${JSON.stringify(teclas)}`
  );
  assert.ok(
    teclas.filter(([t]) => /^\d$/.test(t)).every(([, h, w]) => h >= 60 && w >= 60),
    "números grandes (≥ 60 px)"
  );
  await sinDesborde(k, "kiosco 1440 teclado");
  for (const d of "3003") await teclado.getByRole("button", { name: d, exact: true }).click();
  assert.equal(await teclado.locator("[data-codigo-escrito]").innerText(), "••••", "el código no se muestra");
  await captura(k, "kiosco-1440-teclado-codigo-cara");
  const t0 = Date.now();
  await teclado.getByRole("button", { name: "Continuar" }).click();
  await teclado.waitFor({ state: "hidden" });
  await k.getByText("Caro Méndez").first().waitFor({ timeout: 20000 });
  const caro = sincronizadas.find((s) => s.body.local_employee === 3);
  assert.equal(caro.body.method, "facial", "código y cara va como facial + code");
  assert.equal(caro.body.code, "3003", "con el código, para que el servidor revise que es de la persona");
  assert.ok(caro.body.local_verification.score >= 0.92);
  assert.ok(Date.now() - t0 < 6000, `rápido: ${Date.now() - t0} ms`);
  await escena(k, "ninguna");
  await dormir(3000);

  // c) «¿No te reconoce? Escribe tu código»: código inexistente y persona sin rostro responden al instante.
  await botonCodigoCara.click();
  const tecladoB = k.getByRole("dialog", { name: "Checar con código y cara" });
  await tecladoB.waitFor();
  for (const d of "9999") await tecladoB.getByRole("button", { name: d, exact: true }).click();
  await tecladoB.getByRole("button", { name: "Continuar" }).click();
  await tecladoB.getByText("Ese código no existe. Revísalo e intenta de nuevo.").waitFor();
  for (const d of "4004") await tecladoB.getByRole("button", { name: d, exact: true }).click();
  await tecladoB.getByRole("button", { name: "Continuar" }).click();
  await tecladoB.getByText(/Aún no tienes tu rostro registrado/).waitFor();
  // d) Con el código de Ana pero otra cara: 1 a 1 no coincide; tras unos segundos lo dice y se registra el intento.
  for (const d of "1001") await tecladoB.getByRole("button", { name: d, exact: true }).click();
  await escena(k, "otra");
  await tecladoB.getByRole("button", { name: "Continuar" }).click();
  await k.getByText("Mira a la cámara para confirmar que eres tú").waitFor({ timeout: 5000 });
  await k
    .getByText(/La cara no coincide con ese código/)
    .first()
    .waitFor({ timeout: 20000 });
  assert.equal(sincronizadas.filter((s) => s.body.code && s.body.local_verification).length, 1, "la cara equivocada no checa");
  await escena(k, "ninguna");
  await dormir(1500);

  // e) Un rostro parecido (89 %) con la cara sola: no checa y queda como intento fallido.
  await escena(k, "parecida");
  await hasta(() => intentos.some((i) => i.body.motivo === "sin_coincidencia"), "intento sin coincidencia enviado", 20000);
  await captura(k, "kiosco-1440-sin-coincidencia");
  await escena(k, "ninguna");
  const enviados = intentos.map((i) => ({ ...i.body, url: i.url }));
  const porMotivo = Object.fromEntries(enviados.map((x) => [x.motivo, x]));
  assert.ok(
    enviados.every(
      (x) =>
        x.url === "/checador/reloj/offline/empresa/intentos" &&
        x.grant === "concesion-prueba" &&
        Date.parse(x.capturado_en) &&
        x.dispositivo
    ),
    "kiosco: con su autorización"
  );
  assert.equal(porMotivo.codigo_invalido.id_empleado, undefined);
  assert.equal(porMotivo.sin_referencias.id_empleado, 4);
  assert.equal(porMotivo.codigo_no_coincide.id_empleado, 15);
  assert.equal(porMotivo.codigo_no_coincide.metodo, "codigo_cara");
  assert.equal(porMotivo.sin_coincidencia.id_empleado, 15);
  assert.ok(
    porMotivo.sin_coincidencia.mejor > 0.85 && porMotivo.sin_coincidencia.mejor < 0.92,
    `mejor: ${porMotivo.sin_coincidencia.mejor}`
  );
  assert.ok(
    enviados.every((x) => !("descriptor" in x) && !("descriptor_facial" in x)),
    "nunca se manda la huella"
  );
  // El límite: el mismo candidato y motivo no se repite en 30 s aunque siga frente a la cámara.
  assert.equal(enviados.filter((x) => x.motivo === "sin_coincidencia").length, 1);
  await sinDesborde(k, "kiosco 1440");
  await ctxK.close();

  // ===== 1b) Reloj de la empresa a 390: teclado sin desborde =====
  const ctxK2 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    permissions: ["camera"],
    serviceWorkers: "block",
  });
  await ctxK2.addInitScript(() => {
    window.__escena = { persona: "ninguna", pose: "frente" };
  });
  await ctxK2.addInitScript({ content: faceapiPoses });
  await rutas(ctxK2, null);
  const k2 = await nuevaPagina(ctxK2, "kiosco 390");
  await k2.goto(base + "/demo", { waitUntil: "domcontentloaded" });
  await k2.getByPlaceholder("Ingresa tu código").waitFor({ timeout: 30000 });
  await sembrar(k2, datosEmpresa);
  await k2.getByRole("button", { name: "¿No te reconoce? Escribe tu código" }).click();
  const t2 = k2.getByRole("dialog", { name: "Checar con código y cara" });
  await t2.waitFor();
  for (const d of "30") await t2.getByRole("button", { name: d, exact: true }).click();
  await sinAnimaciones(k2);
  const caja = await t2.boundingBox();
  assert.ok(
    caja.x >= 0 && caja.x + caja.width <= 390 && caja.y >= 0 && caja.y + caja.height <= 844,
    `teclado dentro de la pantalla: ${JSON.stringify(caja)}`
  );
  const teclas2 = await t2.getByRole("button").evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().height)));
  assert.ok(
    teclas2.every((h) => h >= 44),
    `teclas ≥ 44 px a 390: ${teclas2}`
  );
  await sinDesborde(k2, "kiosco 390 teclado");
  await captura(k2, "kiosco-390-teclado-codigo-cara");
  await t2.getByRole("button", { name: "Cancelar" }).click();
  await t2.waitFor({ state: "hidden" });
  await ctxK2.close();

  // ===== 2) App del empleado (390): solo contra sus propias referencias =====
  const ctxE = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    permissions: ["camera"],
    serviceWorkers: "block",
  });
  await ctxE.addCookies([{ name: "token", value: jwt({ tipo_usuario: "Empleado", id_usuario: 99, id_empleado: 15 }), url: base }]);
  await ctxE.addInitScript(() => {
    window.__escena = { persona: "ninguna", pose: "frente" };
  });
  await ctxE.addInitScript({ content: faceapiPoses });
  await rutas(ctxE, empleadoSesion);
  const app = await nuevaPagina(ctxE, "app 390");
  await app.goto(base + "/empleado/reloj-checador", { waitUntil: "domcontentloaded" });
  await app.locator("[data-estado-camara]").waitFor({ timeout: 30000 });
  await sembrar(app, datosEmpresa); // aunque el celular tenga las de la empresa, la app no las usa para la cara
  await sembrar(app, datosPersonales, true);
  assert.equal(await app.getByRole("button", { name: "¿No te reconoce? Escribe tu código" }).count(), 0, "en la app no hay código y cara");
  const antes = sincronizadas.length;
  const intentosAntes = intentos.length;
  await escena(app, "luis"); // un compañero frente al celular de Ana
  await hasta(() => intentos.length > intentosAntes, "intento de la app enviado", 20000);
  assert.equal(sincronizadas.length, antes, "un compañero no checa con la app de Ana");
  const deApp = intentos.at(-1);
  assert.equal(deApp.url, "/checador/reloj/offline/intentos");
  assert.equal(deApp.body.metodo, "cara");
  assert.equal(deApp.body.motivo, "sin_coincidencia");
  assert.equal(deApp.body.id_empleado, undefined, "la persona sale de la sesión");
  await sinDesborde(app, "app 390");
  await captura(app, "app-390-no-reconoce");
  await escena(app, "ana");
  await hasta(() => sincronizadas.length > antes, "checada de la app", 20000);
  const propia = sincronizadas.at(-1);
  assert.equal(propia.url, "/checador/reloj/offline/sincronizar", "alcance personal");
  assert.equal(propia.body.local_employee, 15);
  assert.equal(propia.body.method, "facial");
  await escena(app, "ninguna");

  // ===== 3) Mi rostro (390): registro guiado de 5 poses, 409 y repetir =====
  await app.goto(base + "/empleado/panel/mi-rostro", { waitUntil: "domcontentloaded" });
  await app.getByText("Aún no registras tu rostro").waitFor({ timeout: 30000 });
  await app.getByText("Acepto, de forma expresa").click();
  await escena(app, "ana", "frente");
  await app.getByRole("button", { name: "Registrar mi rostro" }).click();
  const guia = app.locator("[data-captura-guiada]");
  await guia.locator('[data-fase="guiado"], [data-avance]').first().waitFor({ timeout: 20000 });
  await app.locator("[data-avance]").filter({ hasText: "1 de 5" }).waitFor({ timeout: 10000 });
  // Avanza hasta la pose 3 («Baja un poco la cara») para la captura de pantalla.
  for (let i = 0; i < 200 && !(await app.locator('[data-pose="abajo"][data-estado="actual"]').count()); i++) {
    const pose = await app
      .locator('[data-estado="actual"]')
      .getAttribute("data-pose")
      .catch(() => null);
    if (pose) await escena(app, "ana", pose);
    await dormir(80);
  }
  await escena(app, "ana", "frente"); // de frente cuando pide bajar: sigue pidiéndolo
  await app.getByText("Baja un poco la cara").first().waitFor();
  assert.equal(await app.locator("[data-avance]").innerText(), "3 de 5");
  assert.equal(await app.locator("[data-flecha]").getAttribute("data-flecha"), "abajo");
  await escena(app, "ana", { arriba: -40 }); // de más
  await app.getByText("Baja un poco menos la cara").waitFor();
  await sinDesborde(app, "Mi rostro guiado");
  const botones = await guia
    .getByRole("button")
    .evaluateAll((bs) => bs.filter((b) => b.offsetParent).map((b) => Math.round(b.getBoundingClientRect().height)));
  assert.ok(
    botones.every((h) => h >= 44),
    `botones ≥ 44 px: ${botones}`
  );
  await captura(app, "mi-rostro-390-guiado-3-de-5");
  await completarPoses(app);
  await app.getByText("Tu rostro se parece mucho al de otra persona registrada").waitFor({ timeout: 10000 });
  await app.locator("[data-avance]").filter({ hasText: "1 de 5" }).waitFor({ timeout: 10000 });
  await captura(app, "mi-rostro-390-rostro-parecido");
  await completarPoses(app);
  await app.getByText("Listo, tu rostro quedó registrado.").waitFor({ timeout: 20000 });
  const r = putsRostro.at(-1);
  assert.deepEqual(
    r.descriptores.map((d) => d.pose),
    POSES
  );
  assert.ok(r.descriptores.every((d) => d.descriptor.length === 128 && d.descriptor.every(Number.isFinite)));
  assert.equal("descriptor_facial" in r, false, "solo el cuerpo nuevo");
  assert.equal(r.acepto_consentimiento, true);
  assert.equal(await app.evaluate(() => document.querySelector("video")?.srcObject ?? null), null, "apaga la cámara");
  await ctxE.close();

  // ===== 4) Ficha de RH (1440): intentos, fotos, registro guiado y guardar =====
  const ctxR = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    permissions: ["camera"],
  });
  await ctxR.addCookies([{ name: "token", value: jwt({ tipo_usuario: "Recruiter", id_usuario: -1 }), url: base }]);
  await ctxR.addInitScript(() => {
    window.__escena = { persona: "ana", pose: "frente" };
  });
  await ctxR.addInitScript({ content: faceapiPoses });
  await rutas(ctxR, rh);
  const f = await nuevaPagina(ctxR, "ficha 1440");
  await f.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  await f.getByTitle("Editar").first().click({ timeout: 30000 });
  await f.getByRole("tab", { name: "Checador y acceso" }).click();
  await f.locator("[data-rostro-intentos]").waitFor({ timeout: 30000 });
  // Método de checado: la opción nueva junto a las de antes.
  await f.getByText("Método de chequeo").scrollIntoViewIfNeeded();
  await f.locator('button[role="combobox"]').filter({ hasText: "Ambos" }).first().click();
  const opciones = await f.getByRole("option").allInnerTexts();
  assert.deepEqual(
    opciones.map((t) => t.trim()),
    ["Código", "Facial", "Ambos", "Código y cara"]
  );
  await f.getByRole("option", { name: "Código y cara" }).click();
  await f.getByText("En el reloj escribe su código y la cámara confirma que es él").waitFor();
  // Intentos que mandó el reloj (los de Ana): motivo claro, %, dónde.
  const lista = f.locator("[data-rostro-intentos] [data-intento]");
  await lista.first().waitFor();
  const textos = await lista.allInnerTexts();
  assert.ok(
    textos.some((t) => /No se parecía lo suficiente \(8\d %\)/.test(t) && /Reloj de la empresa · Solo cara/.test(t)),
    textos.join(" | ")
  );
  assert.ok(
    textos.some((t) => /El código no coincide con la cara/.test(t) && /Código y cara/.test(t)),
    textos.join(" | ")
  );
  assert.ok(
    textos.some((t) => /App del empleado/.test(t)),
    "también el de la app"
  );
  assert.match(await f.locator("[data-rostro-fotos]").innerText(), /Fotos registradas: 1 foto: Frente/);
  await f.locator("[data-columna=reconocimiento]").scrollIntoViewIfNeeded();
  await captura(f, "ficha-1440-intentos");
  // Registro guiado desde la ficha.
  await f.getByRole("button", { name: "Volver a registrar", exact: true }).click();
  await f.locator("[data-avance]").filter({ hasText: "1 de 5" }).waitFor({ timeout: 20000 });
  for (let i = 0; i < 200 && !(await f.locator('[data-pose="izquierda"][data-estado="actual"]').count()); i++) {
    const pose = await f
      .locator('[data-estado="actual"]')
      .getAttribute("data-pose")
      .catch(() => null);
    if (pose) await escena(f, "ana", pose);
    await dormir(80);
  }
  await escena(f, "ana", "frente");
  await f.getByText("Gira un poco a tu izquierda").first().waitFor();
  assert.equal(await f.locator("[data-flecha]").getAttribute("data-flecha"), "izquierda");
  await f.locator("[data-registro-guiado]").scrollIntoViewIfNeeded();
  await captura(f, "ficha-1440-registro-guiado-4-de-5");
  await completarPoses(f);
  await f
    .locator("[data-rostro-capturado]")
    .filter({ hasText: "5 fotos tomadas. Se guardan al guardar la ficha." })
    .waitFor({ timeout: 20000 });
  assert.equal(await f.locator("[data-rostro-estado]").innerText(), "Fotos tomadas: falta guardar");
  await sinDesborde(f, "ficha 1440");
  // Guardar: el primero responde 409 ROSTRO_PARECIDO (mensaje genérico); el segundo guarda.
  await f.locator("[data-boton-guardar]:visible").click();
  await f
    .getByText("Tu rostro se parece mucho al de otra persona registrada. Vuelve a tomar las fotos con buena luz.")
    .waitFor({ timeout: 15000 });
  await f.locator("[data-boton-guardar]:visible").click();
  await hasta(() => putsFicha.length === 1, "PUT de la ficha");
  const campo = (texto, nombre) => new RegExp(`name="${nombre}"\\r\\n\\r\\n([^\\r]*)`).exec(texto)?.[1];
  const desc = JSON.parse(campo(putsFicha[0], "descriptores"));
  assert.deepEqual(
    desc.map((d) => d.pose),
    POSES
  );
  assert.deepEqual(JSON.parse(campo(putsFicha[0], "descriptor_facial")), desc[0].descriptor, "descriptor_facial = frente");
  assert.equal(campo(putsFicha[0], "metodo_chequeo"), "codigo_cara");
  await ctxR.close();

  // ===== 4b) Ficha a 390: sin desborde con intentos y captura guiada =====
  const ctxR2 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    permissions: ["camera"],
  });
  await ctxR2.addCookies([{ name: "token", value: jwt({ tipo_usuario: "Recruiter", id_usuario: -1 }), url: base }]);
  await ctxR2.addInitScript(() => {
    window.__escena = { persona: "ana", pose: "frente" };
  });
  await ctxR2.addInitScript({ content: faceapiPoses });
  await rutas(ctxR2, rh);
  const f2 = await nuevaPagina(ctxR2, "ficha 390");
  await f2.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
  await f2
    .getByRole("button", { name: /Ana Torres/ })
    .first()
    .click({ timeout: 30000 });
  await f2.getByRole("tab", { name: "Checador y acceso" }).click();
  await f2.locator("[data-rostro-intentos] [data-intento]").first().waitFor({ timeout: 30000 });
  await sinDesborde(f2, "ficha 390 intentos");
  await f2.getByRole("button", { name: "Volver a registrar", exact: true }).click();
  await f2.locator("[data-avance]").filter({ hasText: "1 de 5" }).waitFor({ timeout: 20000 });
  await sinDesborde(f2, "ficha 390 guiado");
  await f2.locator("[data-columna=reconocimiento]").scrollIntoViewIfNeeded();
  await captura(f2, "ficha-390-intentos-y-guiado", true);
  await ctxR2.close();

  assert.deepEqual(errores, []);
  exito = true;
  console.log(
    "OK rostro multi: kiosco cara sola con referencias por pose; «Código y cara» pide el código (teclado ≥ 44 px, 1440 y 390) y compara 1 a 1; código inexistente/sin rostro/cara que no coincide; intento fallido con límite y sin huella; app solo contra sus referencias; Mi rostro guiado 5 poses con 409; ficha: intentos, fotos, método «Código y cara», registro guiado que se guarda con la ficha (409 y reintento); sin desbordes ni errores de JS"
  );
} catch (e) {
  if (ultima && process.env.CAPTURAS)
    await ultima.screenshot({ path: `${process.env.CAPTURAS}/falla.png`, fullPage: true }).catch(() => {});
  throw e;
} finally {
  await browser.close();
  try {
    process.kill(-next.pid);
  } catch {
    next.kill();
  }
  if (!exito) process.exitCode = 1;
}
