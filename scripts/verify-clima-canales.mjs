// Verificación en navegador (backend simulado) de los canales de Clima (26/11/2026, agente clima1): lanzar con WhatsApp,
// «al checar salida» y hasta 3 recordatorios; «¿Cómo te fue hoy?» en el Inicio del empleado; vista del jefe con el plan
// de su equipo; «Mis acciones»; contestar en el celular (progreso guardado, ir a la que falta, foco); tablero con el pulso
// diario. A 1440 y 390 px: sin desborde horizontal, botones ≥ 44 px y texto ≥ 13 px en lo nuevo.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-clima-canales.mjs
//      (CAPTURAS=<carpeta> guarda capturas; PLAYWRIGHT_MODULE_PATH=<ruta> si playwright no está en node_modules)
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { datosSimulados } from "./lib/clima-simulado.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");

const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  stdio: "ignore",
  env: { ...process.env, JWT_SECRET: secret },
});
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function token(tipo) {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 7, nombre: "Tiendas del Centro", estado: "Activo", zona_horaria: "America/Mexico_City" };
const RH = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 7, nombre: "Rosa RH", empresas: [7], empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };
const JORGE = { ...RH, tipo_usuario: "Empleado", esEmpleado: true, id_empleado: 120, nombre: "Jorge Ramírez" };

const DIMS = [
  { clave: "liderazgo", nombre: "Liderazgo" },
  { clave: "reconocimiento", nombre: "Reconocimiento" },
  { clave: "carga", nombre: "Carga de trabajo" },
];
const fav = (f) => ({ favorable: f, neutral: Math.round((100 - f) / 2), desfavorable: 100 - f - Math.round((100 - f) / 2), n: 24 });
const estado = { acciones: [], pulso: [], misAcciones: [{ id: 91, idCampania: 31, texto: "Revisar la carga de los sábados", dimension: "carga", fecha_limite: "2026-11-20", estado: "pendiente", revision: 1, medicion: "Pulso del taller" }], cuerpos: [] };

function extra(e, m, cuerpo) {
  if (e === "/pulso-hoy" && m === "GET")
    return estado.pulso.length
      ? { ok: true, pregunta: null }
      : { ok: true, pregunta: { id_campania: 31, nombre: "Pulso del taller", texto: "¿Cómo te fue hoy?", opciones: ["Muy mal", "Mal", "Regular", "Bien", "Muy bien"].map((texto, i) => ({ valor: i + 1, texto })) } };
  if (e === "/pulso-hoy" && m === "POST") {
    estado.pulso.push(cuerpo);
    return [{ ok: true, guardado: !cuerpo.saltar }, 201];
  }
  if (e === "/mi-equipo/campanias")
    return { ok: true, es_jefe: true, equipo: 6, minimo: 1, migracion: true, campanias: [{ id: 31, nombre: "Pulso del taller", cierra_el: "2026-11-24", respuestas: 4, invitados: 6, disponible: true }] };
  if (e === "/mi-equipo/campanias/31")
    return {
      ok: true,
      campania: { id: 31, nombre: "Pulso del taller", cierra_el: "2026-11-24" },
      minimo: 1,
      respuestas: 4,
      invitados: 6,
      disponibles: true,
      equipo: {
        respuestas: 4,
        favorabilidad: fav(68),
        enps: { valor: 25 },
        dimensiones: [
          { clave: "liderazgo", nombre: "Liderazgo", favorabilidad: fav(81) },
          { clave: "reconocimiento", nombre: "Reconocimiento", favorabilidad: fav(52) },
          { clave: "carga", nombre: "Carga de trabajo con un nombre de dimensión largo para probar el corte", favorabilidad: fav(70) },
        ],
      },
      empresa: { favorabilidad: fav(72), dimensiones: [{ clave: "liderazgo", favorabilidad: fav(75) }, { clave: "reconocimiento", favorabilidad: fav(61) }, { clave: "carga", favorabilidad: fav(70) }] },
      comentarios: [{ clave: "p1_6", texto: "¿Algo más que quieras decirnos?", respuestas: ["Necesitamos más capacitación en la caja nueva.", "Falta paz los sábados."] }],
      plan: { migracion: true, acciones: estado.acciones, estados: ["pendiente", "en_curso", "lograda", "no_lograda"], dimensiones: DIMS },
    };
  if (e === "/mi-equipo/campanias/31/acciones" && m === "POST") {
    estado.cuerpos.push(cuerpo);
    const a = { id: 500 + estado.acciones.length, idCampania: 31, texto: cuerpo.texto, dimension: cuerpo.dimension, fecha_limite: cuerpo.fecha_limite, estado: "pendiente", revision: 1, responsable: { id: 120, nombre: "Jorge Ramírez" }, equipo: { idJefe: 120, nombre: "Jorge Ramírez" } };
    estado.acciones.push(a);
    return [{ ok: true, accion: a }, 201];
  }
  const ed = e.match(/^\/mi-equipo\/acciones\/(\d+)$/);
  if (ed && m === "PATCH") {
    const a = estado.acciones.find((x) => x.id === Number(ed[1]));
    Object.assign(a, cuerpo, { revision: a.revision + 1 });
    return { ok: true, accion: a };
  }
  if (e === "/mis-acciones") return { ok: true, estados: ["pendiente", "en_curso", "lograda", "no_lograda"], acciones: estado.misAcciones };
  const mia = e.match(/^\/mis-acciones\/(\d+)$/);
  if (mia && m === "PATCH") {
    const a = estado.misAcciones.find((x) => x.id === Number(mia[1]));
    Object.assign(a, { estado: cuerpo.estado, revision: a.revision + 1 });
    return { ok: true, accion: a };
  }
  return null;
}

const S = datosSimulados();
// La encuesta 21 en borrador (la que en verify-clima se crea desde el editor).
S.estado.campania = {
  id: 21, nombre: "Pulso de diciembre", tipo: "clima", estado: "borrador", abre_el: null, cierra_el: null, invitados: 0, contestadas: 0, idPlantilla: 11,
  definicion: JSON.parse(JSON.stringify(S.estado.plantilla.definicion)), revision: 1, canales: { app: true, correo: true }, destinatarios: { modo: "todos" },
};
const errores = [];
const browser = await chromium.launch();

// Respuesta simulada: primero lo nuevo de este script; luego el backend simulado de siempre (verify-clima), con la
// pantalla de inicio y el tablero ampliados con lo nuevo.
async function atender(route, usuario) {
  const req = route.request();
  const url = new URL(req.url());
  const p = url.pathname.replace(/^\/api/, "");
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" };
  if (url.origin !== base && req.method() !== "OPTIONS") {
    const cuerpo = req.postData() ? JSON.parse(req.postData()) : null;
    if (p.startsWith("/checador/reloj/registros-del-dia-empleado"))
      return route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify({ zona_horaria: "America/Mexico_City", registrosHoy: [{ id: 1, entrada: "2026-11-26T09:02:00", hora_entrada: "2026-11-26T15:02:00Z", salida: "2026-11-26T18:05:00", hora_salida: "2026-11-26T00:05:00Z" }] }) });
    if (p.startsWith("/checador/clima")) {
      const e = p.slice("/checador/clima".length);
      const r = extra(e, req.method(), cuerpo);
      if (r) {
        const [data, status] = Array.isArray(r) ? r : [r, 200];
        return route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
      }
      if (e === "/inicio" || e.startsWith("/tablero")) {
        // Llama al simulado de siempre y le agrega lo nuevo.
        let capturado = null;
        await S.atender({ request: () => req, continue: () => route.continue(), fulfill: (x) => { capturado = x; return Promise.resolve(); } }, { base, usuario });
        const data = JSON.parse(capturado.body);
        if (e === "/inicio") data.canales = { migracion: true, whatsapp: { configurado: false, motivo: "Falta configurar el número de notificaciones" } };
        if (e.startsWith("/tablero") && data.actual) data.actual.pulsoDiario = { respuestas: 37, suficiente: true, promedio: 3.8, distribucion: [2, 3, 8, 14, 10], favorable: 65 };
        return route.fulfill({ ...capturado, body: JSON.stringify(data) });
      }
    }
  }
  return S.atender(route, { base, usuario });
}

async function sesion(usuario, viewport) {
  const ctx = await browser.newContext({ viewport, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: viewport.width < 500 });
  await ctx.addCookies([{ name: "token", value: token(usuario.tipo_usuario), url: base }]);
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));
  await pg.route("**/*", (route) => atender(route, usuario));
  return pg;
}
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true }) : null);
const ir = (pg, ruta) => pg.goto(base + ruta, { waitUntil: "domcontentloaded" });

// Sin desborde horizontal y, dentro de `selector`, botones/selects ≥ 44 px de alto y texto ≥ 13 px.
async function revisar(pg, nombre, selector) {
  await dormir(200);
  const r = await pg.evaluate((sel) => {
    const zona = sel ? [...document.querySelectorAll(sel)] : [document.body];
    const chicos = [];
    const letras = [];
    for (const z of zona) {
      for (const b of z.querySelectorAll("button, select, a[href], input[type=date]")) {
        const c = b.getBoundingClientRect();
        if (c.width && c.height < 43.5) chicos.push(`${(b.innerText || b.getAttribute("aria-label") || b.tagName).trim().slice(0, 30)} (${Math.round(c.height)})`);
      }
      for (const t of z.querySelectorAll("p, span, li, label, h1, h2, h3, button, select, a")) {
        if (!t.childNodes.length || ![...t.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const f = parseFloat(getComputedStyle(t).fontSize);
        if (f < 13) letras.push(`${t.textContent.trim().slice(0, 30)} (${f})`);
      }
    }
    return { ancho: document.documentElement.scrollWidth, ventana: window.innerWidth, chicos, letras };
  }, selector);
  assert.ok(r.ancho <= r.ventana + 1, `${nombre}: desborde horizontal (${r.ancho} > ${r.ventana})`);
  if (selector) {
    assert.deepEqual(r.chicos, [], `${nombre}: botones de menos de 44 px`);
    assert.deepEqual(r.letras, [], `${nombre}: texto de menos de 13 px`);
  }
}

try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(base + "/login")).status) break;
    } catch {
      /* aún no */
    }
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }

  for (const [ancho, alto] of [[1440, 1000], [390, 844]]) {
    const tam = { width: ancho, height: alto };
    // 1) RH lanza: WhatsApp (con respaldo por correo), al checar salida y hasta 3 recordatorios.
    const rh = await sesion(RH, tam);
    await ir(rh, "/panel/clima/encuestas/lanzar/21");
    await rh.getByText("Recordatorios (hasta 3, solo a quien no ha contestado)").waitFor({ timeout: 30000 });
    await rh.getByText("WhatsApp aún no está configurado: mientras tanto se manda por correo.").waitFor();
    const wa = rh.getByRole("checkbox", { name: /WhatsApp/ });
    assert.equal(await wa.isDisabled(), false, "WhatsApp se puede elegir");
    await wa.check();
    await rh.getByRole("checkbox", { name: /Al checar salida/ }).check();
    const chip = rh.getByRole("button", { name: "7 días antes del cierre" });
    await chip.click();
    assert.equal(await chip.getAttribute("aria-pressed"), "true");
    assert.ok(await rh.getByRole("button", { name: "2 días antes del cierre" }).isDisabled(), "ya hay 3: no deja un cuarto");
    await rh.getByText(/^Saldrán: /).waitFor();
    await revisar(rh, `${ancho}-lanzar`, "fieldset");
    await captura(rh, `${ancho}-lanzar-canales`);
    console.log(`PASS ${ancho}: lanzar con WhatsApp, al checar salida y 3 recordatorios`);

    // 2) Tablero de RH: tarjeta del pulso diario (agregado, sin serie por día).
    await ir(rh, "/panel/clima");
    await rh.locator("[data-pulso-diario]").waitFor({ timeout: 30000 });
    await rh.locator("[data-pulso-diario]").getByText(/37 respuestas anónimas/).waitFor();
    await revisar(rh, `${ancho}-tablero`, "[data-pulso-diario]");
    if (ancho === 390) await rh.locator("[data-pulso-diario]").screenshot({ path: process.env.CAPTURAS ? `${process.env.CAPTURAS}/390-tablero-pulso.png` : "/dev/null" });
    await rh.context().close();

    // 3) Inicio del empleado con la jornada cerrada: «¿Cómo te fue hoy?», un toque y desaparece.
    estado.pulso.length = 0;
    estado.acciones.length = 0;
    estado.misAcciones[0].estado = "pendiente";
    const jo = await sesion(JORGE, tam);
    await ir(jo, "/empleado/panel/inicio");
    const tarjeta = jo.locator("[data-pulso-salida]");
    await tarjeta.waitFor({ timeout: 30000 });
    await revisar(jo, `${ancho}-pulso`, "[data-pulso-salida]");
    await captura(jo, `${ancho}-inicio-pulso`);
    await tarjeta.getByRole("button", { name: "4 de 5: Bien" }).click();
    await jo.getByText("¡Gracias! Tu respuesta es anónima").waitFor();
    assert.deepEqual(estado.pulso.at(-1), { id_campania: 31, valor: 4 });
    assert.equal(Object.keys(estado.pulso.at(-1)).length, 2, "no manda nada de la persona");
    console.log(`PASS ${ancho}: «¿Cómo te fue hoy?» en el Inicio, de un toque`);

    // 4) Mis encuestas del jefe: «Clima de mi equipo» y «Mis acciones».
    await ir(jo, "/empleado/panel/encuestas");
    await jo.locator("[data-clima-equipo]").waitFor({ timeout: 30000 });
    await jo.locator("[data-mis-acciones]").waitFor();
    await jo.locator("[data-mis-acciones] select").selectOption("lograda");
    await dormir(300);
    assert.equal(estado.misAcciones[0].estado, "lograda");
    await revisar(jo, `${ancho}-mis-encuestas`, "[data-clima-equipo], [data-mis-acciones]");
    await captura(jo, `${ancho}-mis-encuestas-jefe`);
    console.log(`PASS ${ancho}: «Clima de mi equipo» y «Mis acciones»`);

    // 5) Vista del jefe: resultados de su equipo contra la empresa, comentarios y plan de su equipo.
    await jo.locator("[data-clima-equipo] a").first().click();
    await jo.waitForURL("**/empleado/panel/encuestas/equipo/31", { timeout: 30000 });
    await jo.locator("[data-vista-jefe]").getByText("Tu equipo es pequeño").waitFor({ timeout: 30000 });
    await jo.getByText("−9 vs. empresa").waitFor();
    await jo.getByText("«Falta paz los sábados.»").waitFor();
    await jo.getByRole("button", { name: "+ Agregar acción" }).click();
    await jo.getByLabel("¿Qué van a hacer?").fill("Reconocer en la junta del lunes a quien cubrió turnos");
    await jo.locator("[data-vista-jefe] form select").first().selectOption("reconocimiento");
    await jo.getByRole("button", { name: "Guardar acción" }).click();
    await jo.locator("[data-vista-jefe] li p").getByText("Reconocer en la junta del lunes a quien cubrió turnos").waitFor();
    assert.equal(estado.cuerpos.at(-1).dimension, "reconocimiento");
    assert.equal("id_empleado" in estado.cuerpos.at(-1) || "empresa" in estado.cuerpos.at(-1), false, "la ficha y la empresa salen de la sesión");
    await revisar(jo, `${ancho}-vista-jefe`, "[data-vista-jefe]");
    await captura(jo, `${ancho}-vista-jefe`);
    console.log(`PASS ${ancho}: vista del jefe con el plan de su equipo`);

    // 6) Contestar en el celular: progreso guardado, foco en la pregunta, «Ir a la que falta».
    await jo.evaluate(() => localStorage.clear());
    await ir(jo, "/empleado/panel/encuestas/21");
    await jo.locator("#pregunta-actual").waitFor({ timeout: 30000 });
    await jo.getByText("Tu avance se guarda solo en este teléfono, puedes salir y volver.").waitFor();
    await jo.locator('[role="radiogroup"] [role="radio"]').first().click();
    await jo.getByText("✓ Avance guardado en este teléfono (no en el servidor).").waitFor();
    await jo.waitForFunction(() => document.activeElement?.id === "pregunta-actual", null, { timeout: 5000 }).catch(() => {});
    const foco = await jo.evaluate(() => `${document.activeElement?.tagName}#${document.activeElement?.id}:${document.querySelector("[aria-live=polite]")?.innerText}`);
    assert.match(foco, /^H2#pregunta-actual/, `el foco pasa a la siguiente pregunta (${foco})`);
    await ir(jo, "/empleado/panel/encuestas/21");
    await jo.getByText("Seguimos donde te quedaste.").waitFor({ timeout: 30000 });
    await revisar(jo, `${ancho}-contestar`, "[data-encuesta-pantalla-completa]");
    await captura(jo, `${ancho}-contestar`);
    console.log(`PASS ${ancho}: contestar con progreso guardado y foco`);
    await jo.context().close();
  }
  assert.deepEqual(errores, [], "errores de la página");
  console.log("OK: canales de Clima verificados a 1440 y 390");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  next.kill();
}
