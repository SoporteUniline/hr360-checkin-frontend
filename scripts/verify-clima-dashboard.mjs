// Verificación en navegador del dashboard de resultados de clima (diseño aprobado 25/11/2026) con backend simulado
// (scripts/lib/clima-simulado.mjs): aviso de confianza, KPIs, dimensiones contra la empresa y la anterior, lectura,
// pregunta por pregunta, participación y mapa por área, plan de acción (agregar, editar, estado, eliminar), comentarios
// y evolución; «Plan de acción sugerido» de Adamia AI → acciones con un clic (agregar una, agregar todas, «Ya está en el
// plan», falta asignar responsable y fecha, Adamia AI apagada). A 1440 y 390 px: sin scroll horizontal de página, tablas con scroll en su caja, objetivos táctiles de
// 44 px, gráficos con texto alterno y contraste de 4.5:1.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      && PLAYWRIGHT_MODULE_PATH=… CAPTURAS=<carpeta> node scripts/verify-clima-dashboard.mjs
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
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString(
    "base64url"
  );
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 7, nombre: "Tiendas del Centro", estado: "Activo", zona_horaria: "America/Mexico_City" };
const RH = {
  id_usuario: -1,
  tipo_usuario: "Recruiter",
  id_empresa: 7,
  nombre: "Rosa RH",
  empresas: [7],
  empresas_detalle: [empresa],
  zona_horaria: "America/Mexico_City",
};

const S = datosSimulados();
const errores = [];
const browser = await chromium.launch();
let exito = false;
let pagina = null;

async function sesion(viewport) {
  const ctx = await browser.newContext({ viewport, locale: "es-MX", timezoneId: "America/Mexico_City", acceptDownloads: true, hasTouch: viewport.width < 500 });
  await ctx.addCookies([{ name: "token", value: token(RH.tipo_usuario), url: base }]);
  const pg = await ctx.newPage();
  pagina = pg;
  pg.on("pageerror", (e) => errores.push(e.message));
  await pg.route("**/*", (route) => S.atender(route, { base, usuario: RH }));
  return pg;
}
const captura = (pg, nombre, fullPage = true) =>
  process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage }) : null;
const ir = (pg, ruta) => pg.goto(base + ruta, { waitUntil: "domcontentloaded" });

async function sinDesborde(pg, nombre) {
  await dormir(150);
  const r = await pg.evaluate(() => ({ ancho: document.documentElement.scrollWidth, ventana: window.innerWidth }));
  assert.ok(r.ancho <= r.ventana + 1, `${nombre}: la página se desborda (${r.ancho} > ${r.ventana})`);
}

// Accesibilidad básica del dashboard: gráficos con texto alterno, objetivos táctiles de 44 px y contraste de 4.5:1
// (3:1 en texto grande) del texto HTML contra su fondo real.
async function accesible(pg, nombre) {
  const r = await pg.evaluate(() => {
    const raiz = document.querySelector("[data-dashboard-clima]");
    const sinTexto = [...raiz.querySelectorAll('[role="img"]')].filter((x) => !(x.getAttribute("aria-label") || "").trim()).length;
    const chicos = [...raiz.querySelectorAll("button, select, a[href], input")]
      .filter((x) => x.offsetParent !== null)
      .map((x) => ({ t: (x.innerText || x.getAttribute("aria-label") || x.tagName).trim().slice(0, 40), h: x.getBoundingClientRect().height }))
      .filter((x) => x.h < 44);
    const lum = (c) => {
      const [r, g, b] = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // Tailwind 4 da colores oklch: se convierten a RGB pintando un pixel.
    const lienzo = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const rgb = (s) => {
      lienzo.clearRect(0, 0, 1, 1);
      lienzo.fillStyle = s;
      lienzo.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = lienzo.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const fondo = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const c = rgb(getComputedStyle(e).backgroundColor);
        if (c[3] > 0.5) return c.slice(0, 3);
      }
      return [255, 255, 255];
    };
    const bajos = [];
    for (const el of raiz.querySelectorAll("*")) {
      if (el.closest("svg") || el.offsetParent === null) continue;
      const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!propio) continue;
      const cs = getComputedStyle(el);
      const a = lum(rgb(cs.color).slice(0, 3));
      const b = lum(fondo(el));
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const grande = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700);
      if (ratio < (grande ? 3 : 4.5)) bajos.push(`${el.textContent.trim().slice(0, 30)} (${ratio.toFixed(2)})`);
    }
    return { sinTexto, chicos, bajos };
  });
  assert.equal(r.sinTexto, 0, `${nombre}: gráficos sin aria-label`);
  assert.deepEqual(r.chicos, [], `${nombre}: objetivos táctiles de menos de 44 px`);
  assert.deepEqual(r.bajos, [], `${nombre}: texto con contraste menor a 4.5:1`);
}

// Las tablas anchas se desplazan dentro de su caja (no la página).
async function tablasEnSuCaja(pg, nombre) {
  const cajas = await pg.evaluate(() =>
    [...document.querySelectorAll("[data-dashboard-clima] table")].map((t) => {
      const caja = t.parentElement;
      return { overflow: getComputedStyle(caja).overflowX, ancho: caja.clientWidth, contenido: caja.scrollWidth };
    })
  );
  assert.ok(cajas.length >= 1, `${nombre}: hay tablas`);
  for (const c of cajas) assert.equal(c.overflow, "auto", `${nombre}: la tabla se desplaza en su caja`);
  return cajas;
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

  // 1) Escritorio 1440: medición con 142 respuestas, 5 áreas, segunda de la plantilla y plan anterior.
  const rh = await sesion({ width: 1440, height: 1000 });
  await ir(rh, "/panel/clima");
  await rh.getByText("Con 142 respuestas, la lectura es confiable.").waitFor({ timeout: 30000 });
  const kpis = rh.getByRole("region", { name: "Indicadores" });
  await kpis.getByText("70 %", { exact: true }).waitFor();
  await kpis.getByText("▲ 6 pts vs. anterior").waitFor();
  await kpis.getByText("+28").waitFor();
  await kpis.getByText("68 promotores · 45 pasivos · 29 detractores", { exact: false }).waitFor();
  await kpis.getByText("142 de 165").waitFor();
  await kpis.getByText("Arriba de la meta de 70 %").waitFor();
  await kpis.getByText("Medio", { exact: true }).waitFor();
  await kpis.getByRole("img", { name: "70 % favorable, 18 % neutral, 12 % desfavorable" }).waitFor();
  const dims = rh.getByRole("region", { name: "Dimensiones" });
  assert.equal(await dims.getByRole("row").count(), 9, "8 dimensiones + encabezado");
  await dims.getByRole("columnheader", { name: "vs. la empresa (70 %)" }).waitFor();
  await dims.getByRole("img", { name: "Ambiente: 16 puntos sobre la empresa" }).waitFor();
  await dims.getByRole("img", { name: "Reconocimiento: 18 puntos bajo la empresa" }).waitFor();
  await dims.getByLabel("subió 12 puntos", { exact: true }).waitFor();
  await dims.getByLabel("bajó 3 puntos", { exact: true }).waitFor();
  await rh.getByRole("heading", { name: "Lo que pide atención" }).waitFor();
  await rh.getByText("Reconocimiento: 52 % favorable, 18 puntos bajo la empresa.", { exact: false }).waitFor();
  const preguntas = rh.getByRole("region", { name: "Pregunta por pregunta" });
  assert.equal(await preguntas.getByRole("listitem").count(), 8, "colapsada: 8 preguntas");
  await preguntas.getByRole("button", { name: "Ver las 26 preguntas" }).click();
  assert.equal(await preguntas.getByRole("listitem").count(), 26);
  const area = rh.getByRole("region", { name: "Participación por área" });
  await area.getByText("% favorable por área y dimensión").waitFor();
  assert.equal(await area.getByRole("row").count(), 7, "5 áreas + toda la empresa + encabezado");
  await area.getByRole("img", { name: "Reparto: 57 % de participación" }).waitFor();
  const plan = rh.getByRole("region", { name: "Plan de acción" });
  await plan.getByText("Plática 1 a 1 de plan de carrera con cada persona").waitFor();
  await plan.getByText("0 de 1 logradas").waitFor();
  await plan.getByText("▲ Reconocimiento subió de 43 % a 52 % en «Clima noviembre 2026».").waitFor();
  assert.equal(await plan.getByRole("link", { name: "Sugerir acciones con Adamia AI" }).getAttribute("href"), "#adamia-plan");
  assert.equal(await rh.locator("#adamia-plan").count(), 1, "el botón lleva al plan sugerido de Adamia AI");
  const coment = rh.getByRole("region", { name: "Lo que dicen" });
  assert.equal(await coment.locator("blockquote").count(), 4, "2 por pregunta");
  await coment.getByRole("button", { name: "Ver los 5 comentarios →" }).click();
  assert.equal(await coment.locator("blockquote").count(), 5);
  await rh.getByRole("img", { name: /^Evolución del % favorable: nov 25 61 %, may 26 64 %, nov 26 70 %$/ }).waitFor();
  await rh.getByRole("region", { name: "Temas de los comentarios" }).waitFor();
  await sinDesborde(rh, "dashboard 1440");
  await accesible(rh, "dashboard 1440");
  await tablasEnSuCaja(rh, "dashboard 1440");
  await captura(rh, "1440-dashboard");
  console.log("PASS 1440: confianza, KPIs, dimensiones vs. empresa y anterior, lectura, preguntas, áreas, plan, comentarios y evolución");

  // 2) Plan de acción: validar, agregar con responsable (buscador de empleados), cambiar estado, editar y eliminar.
  await plan.getByRole("button", { name: "+ Agregar acción" }).click();
  const dlg = rh.getByRole("dialog", { name: "Agregar acción" });
  await dlg.getByRole("button", { name: "Agregar al plan" }).click();
  await dlg.getByText("Escribe qué se va a hacer.").waitFor();
  await dlg.getByText("Elige a la persona responsable.").waitFor();
  await dlg.getByText("Elige la fecha límite.").waitFor();
  assert.equal(S.estado.llamadasAcciones.length, 0, "no se manda nada inválido");
  await dlg.getByLabel("Acción").fill("Reconocer en público el trabajo bien hecho cada viernes");
  await dlg.getByLabel("Dimensión").selectOption("reconocimiento");
  await dlg.getByRole("combobox", { name: "Responsable" }).fill("Persona 3");
  await dlg.getByRole("option", { name: /^Persona 3\b/ }).click();
  await dlg.getByLabel("Fecha límite").fill("2027-01-15");
  await dlg.getByRole("button", { name: "Agregar al plan" }).click();
  await plan.getByText("Reconocer en público el trabajo bien hecho cada viernes").waitFor({ timeout: 15000 });
  const alta = S.estado.llamadasAcciones.at(-1);
  assert.equal(alta.m, "POST");
  assert.equal(alta.e, "/campanias/30/acciones");
  assert.deepEqual(alta.cuerpo, {
    texto: "Reconocer en público el trabajo bien hecho cada viernes",
    dimension: "reconocimiento",
    id_responsable: 103,
    fecha_limite: "2027-01-15",
    estado: "pendiente",
  });
  assert.ok(!("empresa" in alta.cuerpo) && !("id_empresa" in alta.cuerpo), "la empresa no va en el cuerpo (la pone la sesión)");
  await plan.getByText("Persona 3").waitFor();
  await plan.getByText("15 ene 2027").waitFor();
  await plan.getByLabel(/^Estado de «Plática 1 a 1/).selectOption("lograda");
  await plan.getByText("1 de 2 logradas").waitFor({ timeout: 15000 });
  assert.deepEqual(S.estado.llamadasAcciones.at(-1), { m: "PATCH", e: "/acciones/501", cuerpo: { estado: "lograda", revision: 1 } });
  await plan.getByRole("button", { name: /^Editar «Reconocer en público/ }).click();
  const ed = rh.getByRole("dialog", { name: "Editar acción" });
  await ed.getByLabel("Acción").fill("Reconocer en la junta del viernes el trabajo bien hecho");
  await ed.getByRole("button", { name: "Guardar cambios" }).click();
  await plan.getByText("Reconocer en la junta del viernes el trabajo bien hecho").waitFor({ timeout: 15000 });
  assert.equal(S.estado.llamadasAcciones.at(-1).m, "PATCH");
  await plan.getByRole("button", { name: /^Editar «Reconocer en la junta/ }).click();
  await rh.getByRole("dialog", { name: "Editar acción" }).getByRole("button", { name: "Eliminar" }).click();
  await rh.getByRole("dialog", { name: "Editar acción" }).getByRole("button", { name: "Sí, eliminar" }).click();
  await plan.getByText("1 de 1 logradas").waitFor({ timeout: 15000 });
  assert.equal(S.estado.llamadasAcciones.at(-1).m, "DELETE");
  await sinDesborde(rh, "plan 1440");
  console.log("PASS: plan de acción — validar, agregar con responsable y fecha, estado, editar y eliminar");

  // 2b) Adamia AI → plan de acción con un clic: sugerencias con dimensión y por qué; la que ya está en el plan se marca;
  // «Agregar al plan» y «Agregar todas» usan POST /campanias/30/acciones sin responsable ni fecha; luego se asignan.
  const sug = rh.getByRole("region", { name: "Plan de acción sugerido" });
  const planR = rh.getByRole("region", { name: "Plan de acción", exact: true });
  await sug.getByRole("button", { name: "Proponer plan" }).click();
  await sug.getByText("Publicar los horarios del sábado con 1 semana de anticipación.").waitFor({ timeout: 15000 });
  await sug.getByText("Por qué: Carga de trabajo es la dimensión más baja en Almacén (5.1 de 10).").waitFor();
  await sug.getByText("Carga de trabajo", { exact: true }).waitFor();
  assert.equal(await sug.getByText("Ya está en el plan").count(), 1, "la plática 1 a 1 ya está en el plan (501)");
  await sug.getByRole("button", { name: "Agregar todas al plan (2)" }).waitFor();
  const antesIa = S.estado.llamadasAcciones.length;
  await sug.getByRole("button", { name: /^Agregar al plan «Publicar los horarios/ }).click();
  await planR.getByText("Publicar los horarios del sábado con 1 semana de anticipación.").waitFor({ timeout: 15000 });
  assert.deepEqual(S.estado.llamadasAcciones.at(-1), {
    m: "POST",
    e: "/campanias/30/acciones",
    cuerpo: { texto: "Publicar los horarios del sábado con 1 semana de anticipación.", dimension: "carga", id_responsable: null, fecha_limite: null },
  });
  await rh.getByText("Se agregó 1 acción al plan. Asigna responsable y fecha en el plan.").waitFor();
  await planR.getByText("1 por asignar").waitFor();
  await planR.getByText("⚠ Falta asignar responsable y fecha límite").waitFor();
  assert.equal(await sug.getByText("Ya está en el plan").count(), 2);
  await sug.getByRole("button", { name: "Agregar 1 al plan" }).click();
  await sug.getByText("Todas las sugerencias ya están en el plan.").waitFor({ timeout: 15000 });
  await planR.getByText("2 por asignar").waitFor();
  assert.equal(S.estado.llamadasAcciones.length, antesIa + 2, "una petición por sugerencia, sin repetir la que ya estaba");
  assert.equal(S.estado.acciones.filter((a) => a.idCampania === 30 && /Plática 1 a 1/.test(a.texto)).length, 1, "sin duplicados");
  await sinDesborde(rh, "plan sugerido 1440");
  await accesible(rh, "plan sugerido 1440");
  await sug.scrollIntoViewIfNeeded();
  await captura(rh, "1440-plan-sugerido-agregado");
  await sug.screenshot({ path: process.env.CAPTURAS ? `${process.env.CAPTURAS}/1440-tarjeta-plan-sugerido.png` : undefined }).catch(() => {});
  await planR.screenshot({ path: process.env.CAPTURAS ? `${process.env.CAPTURAS}/1440-plan-por-asignar.png` : undefined }).catch(() => {});
  // Asignar responsable y fecha a una acción agregada desde Adamia AI.
  await planR.getByRole("button", { name: /^Asignar «Publicar los horarios/ }).click();
  const asig = rh.getByRole("dialog", { name: "Editar acción" });
  await asig.getByText("Falta asignar responsable y fecha límite: elige quién responde y para cuándo.").waitFor();
  await asig.getByRole("combobox", { name: "Responsable" }).fill("Persona 2");
  await asig.getByRole("option", { name: /^Persona 2\b/ }).click();
  await asig.getByLabel("Fecha límite").fill("2027-01-31");
  await asig.getByRole("button", { name: "Guardar cambios" }).click();
  await planR.getByText("1 por asignar").waitFor({ timeout: 15000 });
  assert.equal(S.estado.llamadasAcciones.at(-1).m, "PATCH");
  assert.equal(S.estado.llamadasAcciones.at(-1).cuerpo.id_responsable, 102);
  console.log("PASS: Adamia AI → plan de acción con un clic (agregar, agregar todas, ya está en el plan, por asignar y asignar)");

  // 2c) Adamia AI apagada: lo ya sugerido se ve (no gasta IA) pero no se puede volver a proponer.
  S.estado.iaActiva = false;
  const apagada = await sesion({ width: 1440, height: 1000 });
  await ir(apagada, "/panel/clima");
  const sugA = apagada.getByRole("region", { name: "Plan de acción sugerido" });
  await sugA.getByText("Adamia AI no está activa en tu empresa.", { exact: false }).waitFor({ timeout: 30000 });
  await sugA.getByText("Publicar los horarios del sábado con 1 semana de anticipación.").waitFor();
  assert.equal(await sugA.getByRole("button", { name: "Volver a proponer" }).isDisabled(), true);
  S.estado.iaActiva = true;
  console.log("PASS: con Adamia AI apagada se ven las sugerencias guardadas y no se puede volver a proponer");

  // 3) Descargar el informe PDF.
  const descarga = rh.waitForEvent("download");
  await rh.getByRole("button", { name: "Descargar informe PDF" }).click();
  assert.match((await descarga).suggestedFilename(), /informe-clima-30\.pdf/);
  console.log("PASS: descarga del informe PDF");

  // 4) Primera medición sin áreas (la maqueta): señal, aviso de áreas, sin «vs. anterior», evolución en texto.
  // Página nueva: las notificaciones del plan no tapan la captura.
  const pm = await sesion({ width: 1440, height: 1000 });
  await ir(pm, "/panel/clima");
  await pm.getByLabel("Medición", { exact: true }).selectOption("32", { timeout: 30000 });
  await pm.getByText("Con 4 respuestas, lee esto como una señal, no como una medición firme.").waitFor({ timeout: 30000 });
  await pm.getByText("primera medición", { exact: true }).waitFor();
  await pm.getByRole("region", { name: "Indicadores" }).getByText("4 de 7", { exact: true }).waitFor();
  await pm.getByText("Bajo la meta de 70 % · faltaron 3").waitFor();
  await pm.getByText("4 promotores · 0 pasivos · 0 detractores").waitFor();
  await pm.getByText("Tus empleados no tienen área asignada.", { exact: false }).waitFor();
  await pm.getByText("Primera medición: 92 % favorable. Con la siguiente verás la línea y qué subió o bajó. Sugerencia: repetirla en mayo 2027.").waitFor();
  await pm.getByText("Pertenencia y Ambiente: todos respondieron favorable.").waitFor();
  assert.equal(await pm.getByRole("region", { name: "Dimensiones" }).getByLabel("sin medición anterior", { exact: true }).count(), 8);
  await pm.getByText("Aún no hay acciones.", { exact: false }).waitFor();
  assert.equal(await pm.getByText("% favorable por área y dimensión").count(), 0, "con un solo grupo no hay mapa");
  await sinDesborde(pm, "sin áreas 1440");
  await accesible(pm, "sin áreas 1440");
  await captura(pm, "1440-dashboard-primera-medicion");
  console.log("PASS 1440: primera medición sin áreas, como la maqueta");

  // 5) Celular 390: todo apila, sin scroll horizontal de página, tablas con scroll en su caja, objetivos de 44 px.
  // Para el celular: una sugerencia sin agregar (se quita «Reconocimiento mensual…» del plan simulado).
  S.estado.acciones = S.estado.acciones.filter((a) => !/^Reconocimiento mensual por área/.test(a.texto));
  const cel = await sesion({ width: 390, height: 844 });
  await ir(cel, "/panel/clima");
  await cel.getByText("Con 142 respuestas, la lectura es confiable.").waitFor({ timeout: 30000 });
  await sinDesborde(cel, "dashboard 390");
  await accesible(cel, "dashboard 390");
  const cajas = await tablasEnSuCaja(cel, "dashboard 390");
  assert.ok(cajas.some((c) => c.contenido > c.ancho), "390: el mapa por área se desplaza dentro de su caja");
  // En celular las dimensiones son una lista (nombre, % favorable, barra, vs. la empresa y vs. anterior), sin scroll.
  const dimsCel = cel.getByRole("region", { name: "Dimensiones" });
  assert.equal(await dimsCel.getByRole("table").count(), 0, "390: sin tabla de dimensiones visible");
  await dimsCel.getByText("−18 vs. la empresa").waitFor();
  await dimsCel.getByLabel("vs. anterior: subió 12 puntos").waitFor();
  const apilado = await cel.evaluate(() => {
    const k = [...document.querySelectorAll('[aria-label="Indicadores"] > *')].map((x) => Math.round(x.getBoundingClientRect().left));
    const aside = document.querySelector('[aria-label="Plan, comentarios y evolución"]').getBoundingClientRect();
    const dims = document.getElementById("titulo-dimensiones").closest("section").getBoundingClientRect();
    return { columnasKpi: new Set(k).size, asideDebajo: aside.top >= dims.bottom };
  });
  assert.equal(apilado.columnasKpi, 1, "390: KPIs en una columna");
  assert.ok(apilado.asideDebajo, "390: el plan y los comentarios van debajo");
  await captura(cel, "390-dashboard");
  const sugCel = cel.getByRole("region", { name: "Plan de acción sugerido" });
  const planCel = cel.getByRole("region", { name: "Plan de acción", exact: true });
  await sugCel.getByRole("button", { name: "Agregar 1 al plan" }).waitFor({ timeout: 15000 });
  await sugCel.screenshot({ path: process.env.CAPTURAS ? `${process.env.CAPTURAS}/390-tarjeta-plan-sugerido.png` : undefined }).catch(() => {});
  await sugCel.getByRole("button", { name: /^Agregar al plan «Reconocimiento mensual/ }).tap();
  await sugCel.getByText("Todas las sugerencias ya están en el plan.").waitFor({ timeout: 15000 });
  await planCel.getByText("1 por asignar").waitFor();
  await planCel.getByText("⚠ Falta asignar responsable y fecha límite").waitFor();
  await sinDesborde(cel, "plan sugerido 390");
  await accesible(cel, "plan sugerido 390");
  await planCel.screenshot({ path: process.env.CAPTURAS ? `${process.env.CAPTURAS}/390-plan-por-asignar.png` : undefined }).catch(() => {});
  await sugCel.screenshot({ path: process.env.CAPTURAS ? `${process.env.CAPTURAS}/390-tarjeta-plan-sugerido-agregada.png` : undefined }).catch(() => {});
  await cel.getByLabel("Medición", { exact: true }).selectOption("32");
  await cel.getByText("Con 4 respuestas, lee esto como una señal, no como una medición firme.").waitFor({ timeout: 30000 });
  await sinDesborde(cel, "primera medición 390");
  await accesible(cel, "primera medición 390");
  await captura(cel, "390-dashboard-primera-medicion");
  await cel.getByRole("button", { name: "+ Agregar acción" }).click();
  await cel.getByRole("dialog", { name: "Agregar acción" }).waitFor();
  await sinDesborde(cel, "agregar acción 390");
  await captura(cel, "390-agregar-accion", false); // el diálogo es fijo: captura de la pantalla visible
  console.log("PASS 390: apilado, sin desborde, tablas con scroll en su caja, objetivos táctiles y contraste");

  assert.deepEqual(errores, [], "sin errores de JavaScript en la página");
  exito = true;
  console.log("PASS: dashboard de resultados de clima");
} catch (e) {
  console.error("FAIL:", e.message);
  if (pagina && process.env.CAPTURAS) await pagina.screenshot({ path: `${process.env.CAPTURAS}/fallo-dashboard.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  next.kill("SIGTERM");
  process.exit(exito ? 0 : 1);
}
