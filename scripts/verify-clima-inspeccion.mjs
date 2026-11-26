// Verificación en navegador (26/11/2026, clima2) con backend simulado: riesgo de rotación en el tablero (Agregar al
// plan), Analítica (cortes, mapa de calor, impulsores, CSV), encuestas de ciclo de vida, NOM-035 → expediente (lista por
// numeral, política, evidencias, difusión, programa, PDF), buzón (liga, WhatsApp, detalle con bitácora) y el buzón
// público (enviar sin nombre → folio y clave; consultar). A 1440 y 390 px: sin scroll horizontal de página, objetivos
// táctiles de 44 px y texto de 13 px o más en las piezas nuevas.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      && PLAYWRIGHT_MODULE_PATH=… CAPTURAS=<carpeta> node scripts/verify-clima-inspeccion.mjs
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
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

// ───────── datos simulados (mismas formas que el backend) ─────────
const DIMS = ["Liderazgo", "Comunicación", "Reconocimiento", "Carga de trabajo", "Crecimiento", "Ambiente", "Herramientas", "Pertenencia"].map((nombre, i) => ({
  clave: `d${i}`,
  nombre,
}));
const fav = (f) => ({ favorable: f, neutral: 100 - f - 10, desfavorable: 10, n: 20 });
function analitica(corte) {
  const grupos = {
    area: ["Almacén", "Caja", "Ventas"],
    antiguedad: ["Menos de 3 meses", "3 a 12 meses", "Más de 3 años"],
    puesto: ["Almacenista", "Cajera", "Vendedor"],
    sucursal: ["Centro", "Norte", "Sin dato"],
  }[corte];
  const filas = grupos.map((nombre, g) => ({
    clave: nombre,
    nombre,
    n: 6 + g * 4,
    favorable: 55 + g * 12,
    celdas: DIMS.map((d, i) => ({ clave: d.clave, favorable: 48 + ((g * 17 + i * 7) % 45), diferencia: ((g * 17 + i * 7) % 45) - 20 })),
  }));
  return {
    ok: true,
    campania: { id: 41, nombre: "Clima noviembre 2026", cierra_el: hoy },
    cortes: [["area", "Área"], ["antiguedad", "Antigüedad"], ["puesto", "Puesto"], ["sucursal", "Sucursal"]].map(([clave, nombre]) => ({ clave, nombre })),
    corte,
    nombreCorte: { area: "Área", antiguedad: "Antigüedad", puesto: "Puesto", sucursal: "Sucursal" }[corte],
    respuestas: 142,
    minimo: 1,
    suficiente: true,
    empresa: { favorabilidad: fav(70), dimensiones: DIMS.map((d, i) => ({ ...d, favorabilidad: fav(60 + i * 3) })) },
    grupos: filas.map((f) => ({ clave: f.clave, nombre: f.nombre, n: f.n })),
    gruposOcultos: corte === "puesto" ? 1 : 0,
    sinDatoSegmento: false,
    mapa: { dimensiones: DIMS.map((d, i) => ({ ...d, empresa: 60 + i * 3 })), filas },
    impulsores: {
      resultado: { tipo: "enps", clave: "enps", nombre: "Recomendación (eNPS)" },
      minimo: 10,
      respuestas: 142,
      disponible: true,
      dimensiones: DIMS.map((d, i) => ({ clave: d.clave, nombre: d.nombre, correlacion: Math.round((0.78 - i * 0.12) * 100) / 100, n: 142, favorable: 60 + i * 3, palanca: i === 2 })),
    },
  };
}
const riesgo = {
  ok: true,
  medicion: { id: 41, nombre: "Clima noviembre 2026", cierra_el: hoy },
  agruparPor: "area",
  periodo: { inicio: "2026-08-28", fin: "2026-11-25" },
  sinAsistencias: false,
  umbral: 2,
  ocultos: 1,
  grupos: [
    {
      clave: "Almacén", nombre: "Almacén", n: 6, indice: 68, nivel: "alto", nivelNombre: "Alto",
      principales: [
        { clave: "clima", nombre: "Clima del grupo", texto: "45 % favorable en la última encuesta (empresa: 70 %)." },
        { clave: "ausentismo", nombre: "Ausentismo", texto: "6.2 % de los días programados con falta (empresa: 1.9 %)." },
        { clave: "horasExtra", nombre: "Horas extra", texto: "8.1 h extra por persona a la semana (empresa: 2.4 h)." },
      ],
      recomendacion: "Platica con el equipo sobre lo más bajo de su clima y acuerden una acción concreta con fecha.",
      accion: "Almacén: Platica con el equipo sobre lo más bajo de su clima y acuerden una acción concreta con fecha.",
    },
    {
      clave: "Ventas", nombre: "Ventas", n: 14, indice: 22, nivel: "bajo", nivelNombre: "Bajo",
      principales: [{ clave: "antiguedad", nombre: "Personal nuevo", texto: "21 % del grupo tiene menos de 12 meses (empresa: 18 %)." }],
      recomendacion: "Refuerza la inducción y da seguimiento a quienes entraron hace poco (encuesta de ingreso a 30 y 90 días).",
      accion: "Ventas: Refuerza la inducción.",
    },
  ],
  nota: "Señal por grupo para conversar y actuar, no una predicción ni una calificación de personas. Nunca usa respuestas individuales de clima.",
};
const LISTA = [
  ["politica", "5.1 y 8.1 a)", "Política de prevención de riesgos psicosociales", "parcial", "Publicada el 2026-11-01 (revisión 1). Falta subir la política firmada como evidencia."],
  ["difusion_politica", "5.7", "Difusión de la política", "parcial", "12 de 18 personas activas acusaron de leído en su app; 1 registro(s) de difusión; 0 evidencia(s)."],
  ["identificacion", "5.2, 7.1 y 7.9", "Identificación y análisis de factores de riesgo (Guías II o III)", "cumple", "Última aplicación cerrada el 2026-11-15 (Guía I y Guía II)."],
  ["canalizacion", "5.5 y 5.6", "Guía I: identificar y canalizar a valoración", "parcial", "1 persona(s) requieren valoración; 0 canalizada(s); 0 constancia(s)."],
  ["programa", "8.2, 8.3 y 8.4", "Programa de intervención con acciones, responsables y fechas", "parcial", "1 acción(es); 1 con responsable y fecha."],
  ["difusion_resultados", "5.7", "Difusión de los resultados a los trabajadores", "falta", "0 registro(s) de difusión de resultados; 0 evidencia(s)."],
  ["buzon", "8.1 b)", "Mecanismo confidencial de quejas y denuncias de violencia laboral", "parcial", "Buzón activo. 1 queja(s) recibidas; 1 sin cerrar."],
  ["capacitacion", "8.1 c)", "Capacitación y sensibilización (pertenencia, comunicación, prevención)", "falta", "0 evidencia(s) de capacitación."],
  ["registros", "5.8", "Registros de resultados, medidas de control y canalizaciones", "cumple", "ADAMIA guarda los resultados, la Guía I con su canalización y el programa con su avance."],
].map(([clave, numeral, titulo, estado, detalle]) => ({ clave, numeral, titulo, estado, detalle }));

function estadoNuevo() {
  return {
    acciones: [],
    evidencias: [{ id: 1, tipo: "politica", descripcion: "Política firmada por la dirección", fecha: "2026-11-02", nombre: "politica.pdf", mime: "application/pdf", bytes: 182000 }],
    difusiones: [{ id: 1, tipo: "politica", medio: "app", fecha: "2026-11-02", personas: 18, descripcion: null, idCentro: null }],
    programa: [{ id: 9, dimension: "carga_de_trabajo", texto: "Talleres de manejo de cargas", responsable: { id: 1, nombre: "Jorge Jefe" }, fecha_inicio: "2026-11-20", fecha_limite: "2027-01-31", avance: 40, estado: "en_curso", revision: 1 }],
    politica: { texto: "Política de prevención de riesgos psicosociales de Tiendas del Centro\n\nNos comprometemos a…", revision: 1, publicada_en: "2026-11-01" },
    quejas: [{ id: 3, folio: "B-7KQ2M9XP", tipo: "violencia", centro: "Centro", canal: "web", estado: "recibida", recibida_el: "2026-11-24", revision: 1, identificada: false }],
    bitacora: [{ accion: "recibida", detalle: "Canal: web", por: null, en: "2026-11-24T16:00:00Z" }],
    ciclos: { ingreso30: false, ingreso90: false, salida: true },
    envios: [],
  };
}
let E = estadoNuevo();

async function mio(route, json) {
  const req = route.request();
  const url = new URL(req.url());
  const p = url.pathname.replace(/^\/api/, "");
  if (!p.startsWith("/checador/clima")) return false;
  const e = p.slice("/checador/clima".length);
  const m = req.method();
  const cuerpo = req.postData() && !String(req.headers()["content-type"] ?? "").includes("multipart") ? JSON.parse(req.postData()) : null;
  if (e === "/riesgo-rotacion") return json(riesgo);
  if (/^\/campanias\/41\/acciones$/.test(e) && m === "POST") {
    E.acciones.push(cuerpo);
    return json({ ok: true, accion: { id: 100 + E.acciones.length, texto: cuerpo.texto } }, 201);
  }
  if (/^\/campanias\/\d+\/analitica$/.test(e)) return json(analitica(url.searchParams.get("corte") || "area"));
  if (/^\/campanias\/\d+\/analitica\.csv$/.test(e)) { await route.fulfill({ status: 200, contentType: "text/csv", body: "\uFEFFÁrea,Respuestas\nVentas,10\n" }); return true; }
  if (e === "/ciclo-vida" && m === "GET")
    return json({
      ok: true,
      diasParaContestar: 14,
      ciclos: ["ingreso30", "ingreso90", "salida"].map((ciclo) => ({
        ciclo,
        activo: E.ciclos[ciclo],
        idPlantilla: null,
        enviadas: ciclo === "salida" ? 3 : 0,
        plantilla: { preguntas: ciclo === "salida" ? 11 : 10, minutos: ciclo === "salida" ? 4 : 3 },
        encuestas: ciclo === "salida" ? [{ id: 77, nombre: "Encuesta de salida · T4 2026", estado: "activa", invitados: 3, contestadas: 1, cierra_el: "2027-01-14" }] : [],
      })),
    });
  if (/^\/ciclo-vida\//.test(e) && m === "PUT") {
    E.ciclos[e.split("/")[2]] = Boolean(cuerpo.activo);
    E.envios.push(e);
    return json({ ok: true });
  }
  if (e === "/nom035/centros")
    return json({ ok: true, empresa: { activos: 23, guias: ["I", "II"] }, centros: [{ id: 1, nombre: "Centro", activos: 18, guias: ["I", "II"] }, { id: 2, nombre: "Norte", activos: 4, guias: ["I"] }], sinCentro: 1 });
  if (e === "/nom035/expediente") {
    const centro = url.searchParams.get("centro");
    if (centro === "2") return json({ ok: true, empresa: { nombre: "Tiendas del Centro" }, centro: { id: 2, nombre: "Norte" }, campania: null, aplicaciones: [], lista: LISTA.map((i) => ({ ...i, estado: "falta" })), resumen: { avance: 0 }, programa: [], dominios: [], canalizacion: { requieren: 0, canalizados: 0 }, nota: "Resumen propio de la NOM-035-STPS-2018 (DOF 23/10/2018). No sustituye asesoría legal ni garantiza el resultado de una inspección." });
    return json({
      ok: true,
      empresa: { nombre: "Tiendas del Centro" },
      centro: centro === "1" ? { id: 1, nombre: "Centro", direccion: "Av. Juárez 10" } : null,
      campania: { id: 30, nombre: "NOM-035 · noviembre 2026", estado: "cerrada", abre_el: "2026-11-01", cierra_el: "2026-11-15", guias: ["I", "II"], invitados: 18, contestadas: 17 },
      aplicaciones: [{ id: 30, nombre: "NOM-035 · noviembre 2026", estado: "cerrada", abre_el: "2026-11-01", cierra_el: "2026-11-15", guias: ["I", "II"] }],
      lista: LISTA,
      resumen: { avance: 61, cumple: 2, parcial: 5, falta: 2, noAplica: 0, aplican: 9 },
      programa: E.programa,
      dominios: [{ clave: "carga_de_trabajo", nombre: "Carga de trabajo" }, { clave: "liderazgo", nombre: "Liderazgo" }],
      canalizacion: { requieren: 1, canalizados: 0 },
      nota: "Resumen propio de la NOM-035-STPS-2018 (DOF 23/10/2018). Ordena lo que la empresa tiene y lo que le falta; no sustituye asesoría legal ni garantiza el resultado de una inspección.",
    });
  }
  if (e === "/nom035/expediente/pdf") { await route.fulfill({ status: 200, contentType: "application/pdf", body: Buffer.from("%PDF-1.4\n%simulado\n") }); return true; }
  if (e === "/nom035/politica" && m === "GET") return json({ ok: true, politica: E.politica, modelo: "Política modelo", acuses: 12, activos: 18 });
  if (e === "/nom035/politica" && m === "PUT") {
    E.politica = { ...E.politica, texto: cuerpo.texto, revision: E.politica.revision + 1, publicada_en: cuerpo.publicar ? hoy : E.politica.publicada_en };
    return json({ ok: true, politica: E.politica });
  }
  if (e === "/nom035/evidencias" && m === "GET") return json({ ok: true, evidencias: E.evidencias });
  if (e === "/nom035/evidencias" && m === "POST") {
    E.evidencias.unshift({ id: E.evidencias.length + 1, tipo: "capacitacion", descripcion: "Plática de sensibilización", fecha: hoy, nombre: "lista.pdf", mime: "application/pdf", bytes: 2400 });
    return json({ ok: true, evidencia: E.evidencias[0] }, 201);
  }
  if (/^\/nom035\/evidencias\/\d+\/archivo$/.test(e)) return json({ ok: true, url: "about:blank", expira: 300 });
  if (e === "/nom035/difusiones" && m === "GET") return json({ ok: true, difusiones: E.difusiones });
  if (e === "/nom035/difusiones" && m === "POST") {
    E.difusiones.unshift({ id: 2, ...cuerpo, idCentro: cuerpo.id_centro });
    return json({ ok: true, id: 2 }, 201);
  }
  if (/^\/acciones\/\d+$/.test(e) && m === "PATCH") {
    E.programa = E.programa.map((a) => (a.id === Number(e.split("/")[2]) ? { ...a, ...cuerpo, revision: a.revision + 1 } : a));
    return json({ ok: true });
  }
  if (e === "/buzon") return json({ ok: true, clave: "7.AbCdEfGhIjKlMnOpQrStUv", ruta: "/buzon/7.AbCdEfGhIjKlMnOpQrStUv", quejas: E.quejas });
  if (/^\/buzon\/\d+$/.test(e) && m === "GET") {
    E.bitacora.push({ accion: "vista", por: "Rosa RH", en: new Date().toISOString() });
    return json({ ok: true, queja: { ...E.quejas[0], relato: "Mi supervisor me grita frente a los clientes casi todos los días.", nombre_contacto: null, contacto: null, respuesta: null }, bitacora: E.bitacora });
  }
  if (/^\/buzon\/\d+$/.test(e) && m === "PATCH") {
    E.quejas[0] = { ...E.quejas[0], estado: cuerpo.estado ?? E.quejas[0].estado, revision: E.quejas[0].revision + 1 };
    E.bitacora.push({ accion: "estado", detalle: `recibida → ${cuerpo.estado}`, por: "Rosa RH", en: new Date().toISOString() });
    return json({ ok: true, queja: { ...E.quejas[0], relato: "Mi supervisor me grita frente a los clientes casi todos los días.", respuesta: cuerpo.respuesta ?? null }, bitacora: E.bitacora });
  }
  if (e.startsWith("/publica/buzon/") && m === "GET") return json({ ok: true, empresa: "Tiendas del Centro", tipos: { violencia: "Violencia laboral", acoso: "Acoso u hostigamiento sexual", hostigamiento: "Hostigamiento o malos tratos", riesgo: "Condición que pone en riesgo (cargas, jornadas, entorno)", sugerencia: "Sugerencia para mejorar el entorno", otro: "Otro" }, centros: ["Centro", "Norte"], limites: { relato: 5000 } });
  if (e.startsWith("/publica/buzon/") && m === "POST") return json({ ok: true, folio: "B-9PX3K7QM", clave: "H4K9M2Q7T3XZ", aviso: "Guarda tu folio y tu clave." }, 201);
  if (e === "/publica/buzon-seguimiento") return json({ ok: true, queja: { folio: "B-9PX3K7QM", tipo: "Violencia laboral", estado: "recibida", estadoTexto: "Recibida", respuesta: null } });
  return false;
}

const S = datosSimulados();
const errores = [];
const browser = await chromium.launch();
let exito = false;

async function sesion(viewport, { usuario = RH } = {}) {
  const ctx = await browser.newContext({ viewport, locale: "es-MX", timezoneId: "America/Mexico_City", acceptDownloads: true, hasTouch: viewport.width < 500 });
  if (usuario) await ctx.addCookies([{ name: "token", value: token(usuario.tipo_usuario), url: base }]);
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errores.push(e.message));
  await pg.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) }).then(() => true);
    if (await mio(route, json)) return;
    return S.atender(route, { base, usuario });
  });
  return pg;
}
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true }) : null);
const ir = (pg, ruta) => pg.goto(base + ruta, { waitUntil: "domcontentloaded" });

// Sin scroll horizontal de página; en `raiz` (lo nuevo): objetivos táctiles ≥ 44 px y texto ≥ 13 px.
async function revisar(pg, nombre, raiz) {
  await dormir(200);
  const r = await pg.evaluate((sel) => {
    const zona = sel ? document.querySelector(sel) : document.body;
    if (!zona) return { falta: true };
    const visibles = (xs) => xs.filter((x) => x.offsetParent !== null && x.getBoundingClientRect().width > 0);
    const chicos = visibles([...zona.querySelectorAll("button, select, a[href], input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, summary")])
      .map((x) => ({ t: (x.innerText || x.getAttribute("aria-label") || x.tagName).trim().slice(0, 40), h: Math.round(x.getBoundingClientRect().height) }))
      .filter((x) => x.h < 44);
    const letra = visibles([...zona.querySelectorAll("*")])
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !el.closest("svg"))
      .map((el) => ({ t: el.textContent.trim().slice(0, 30), px: parseFloat(getComputedStyle(el).fontSize) }))
      .filter((x) => x.px < 13);
    return { ancho: document.documentElement.scrollWidth, ventana: window.innerWidth, chicos, letra };
  }, raiz);
  assert.ok(!r.falta, `${nombre}: no se encontró ${raiz}`);
  assert.ok(r.ancho <= r.ventana + 1, `${nombre}: la página se desborda (${r.ancho} > ${r.ventana})`);
  assert.deepEqual(r.chicos, [], `${nombre}: objetivos táctiles de menos de 44 px`);
  assert.deepEqual(r.letra, [], `${nombre}: texto de menos de 13 px`);
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
    E = estadoNuevo();
    const pg = await sesion({ width: ancho, height: alto });
    // 1) Tablero: riesgo de rotación por grupo y «Agregar al plan».
    await ir(pg, "/panel/clima");
    const tarjeta = pg.getByRole("region", { name: "Riesgo de rotación por grupo" });
    await tarjeta.getByText("Almacén", { exact: true }).waitFor({ timeout: 30000 });
    await tarjeta.getByText("Alto · 68").waitFor();
    await tarjeta.getByText("6.2 % de los días programados con falta (empresa: 1.9 %).").waitFor();
    assert.equal(await tarjeta.getByRole("listitem").filter({ hasText: "Almacén" }).locator("ol li").count(), 3, "3 factores principales");
    await tarjeta.getByText(/Grupos de 2 personas o más; nunca por persona/).waitFor();
    await tarjeta.getByRole("button", { name: "Agregar al plan" }).first().click();
    await tarjeta.getByRole("button", { name: "Ya está en el plan" }).waitFor();
    assert.equal(E.acciones.length, 1);
    assert.match(E.acciones[0].texto, /^Almacén: /);
    await tarjeta.scrollIntoViewIfNeeded();
    await revisar(pg, `tablero ${ancho}`, '[aria-label="Riesgo de rotación por grupo"]');
    await captura(pg, `${ancho}-tablero-riesgo`);

    // 2) Analítica: cortes, mapa de calor, impulsores y CSV.
    await ir(pg, "/panel/clima/analitica");
    await pg.getByRole("tab", { name: "Área" }).waitFor({ timeout: 30000 });
    await pg.getByRole("tab", { name: "Antigüedad" }).click();
    await pg.getByText("Mapa de calor por antigüedad").waitFor();
    const celda = ancho > 500 ? pg.getByRole("cell", { name: /^Menos de 3 meses, Liderazgo: \d+ % favorable/ }) : pg.getByLabel(/^Menos de 3 meses, Liderazgo: \d+ % favorable/);
    await celda.first().waitFor();
    await pg.getByRole("tab", { name: "Puesto" }).click();
    await pg.getByText("1 grupo(s) no se muestran por separado para que nadie quede identificado.").waitFor();
    await pg.getByRole("heading", { name: "Qué mueve el compromiso" }).waitFor();
    await pg.getByText("Palanca", { exact: true }).waitFor();
    const [descarga] = await Promise.all([pg.waitForEvent("download"), pg.getByRole("button", { name: "Exportar CSV" }).click()]);
    assert.equal(descarga.suggestedFilename(), "clima-30-puesto.csv", "la medición más reciente del tablero simulado (id 30)");
    await revisar(pg, `analítica ${ancho}`, "[data-clima2]");
    await captura(pg, `${ancho}-analitica`);

    // 3) Encuestas: ciclo de vida (encender ingreso a 30 días).
    await ir(pg, "/panel/clima/encuestas");
    await pg.getByText("Encuestas de ciclo de vida").waitFor({ timeout: 30000 });
    const sw = pg.getByRole("switch").first();
    await sw.check();
    await pg.getByText("Encendida: se mandará sola.").waitFor();
    assert.deepEqual(E.envios, ["/ciclo-vida/ingreso30"]);
    await pg.getByText("Encuesta de salida · T4 2026: 1 de 3").waitFor();
    await revisar(pg, `ciclo de vida ${ancho}`, '[aria-label="Encuestas de ciclo de vida"]');
    await captura(pg, `${ancho}-ciclo-vida`);

    // 4) NOM-035 → Expediente: lista, programa, evidencias, difusión y PDF.
    await ir(pg, "/panel/clima/nom035/expediente");
    await pg.getByText("Lista de verificación por numeral").waitFor({ timeout: 30000 });
    assert.equal(await pg.getByRole("region", { name: "Lista de verificación por numeral" }).getByRole("listitem").count(), 9);
    await pg.getByText("no sustituye asesoría legal", { exact: false }).first().waitFor();
    await pg.getByText("Talleres de manejo de cargas").waitFor();
    await pg.getByRole("button", { name: "Subir evidencia" }).click();
    const dlg = pg.getByRole("dialog", { name: "Subir evidencia" });
    await dlg.getByRole("button", { name: "Guardar evidencia" }).click();
    await dlg.getByText("Elige el archivo.").waitFor();
    await dlg.getByText("Elige a qué obligación corresponde.").waitFor();
    await dlg.getByLabel("Obligación").selectOption("capacitacion");
    await dlg.getByLabel("Descripción").fill("Plática de sensibilización");
    await dlg.getByLabel("Archivo").setInputFiles({ name: "lista.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n") });
    await dlg.getByRole("button", { name: "Guardar evidencia" }).click();
    await pg.getByText("Plática de sensibilización").waitFor();
    await pg.getByRole("button", { name: "Registrar difusión" }).click();
    const dd = pg.getByRole("dialog", { name: "Registrar difusión" });
    await dd.locator("select").nth(1).selectOption("30"); // 2.º campo: la aplicación (el 1.º es qué se difundió)
    await dd.getByRole("button", { name: "Registrar" }).click();
    await pg.getByText("Difusión registrada.").waitFor();
    const [pdf] = await Promise.all([pg.waitForEvent("download"), pg.getByRole("button", { name: "Expediente en PDF" }).click()]);
    assert.equal(pdf.suggestedFilename(), "expediente-nom035-30.pdf");
    await pg.getByLabel("Centro de trabajo").selectOption("2");
    await pg.getByText("Aún no aplicas la NOM-035 en Norte").waitFor();
    await pg.getByText("Con 4 trabajadores en este centro te toca la Guía I.").waitFor();
    await revisar(pg, `expediente ${ancho}`, "[data-clima2]");
    await captura(pg, `${ancho}-expediente`);

    // 5) Buzón: liga, WhatsApp y detalle con bitácora.
    await ir(pg, "/panel/clima/nom035/buzon");
    await pg.getByText("Liga del buzón confidencial").waitFor({ timeout: 30000 });
    const wa = await pg.getByRole("link", { name: "Compartir por WhatsApp" }).getAttribute("href");
    assert.ok(wa.startsWith("https://wa.me/?text=") && decodeURIComponent(wa).includes("/buzon/7.AbCdEfGhIjKlMnOpQrStUv"));
    await pg.getByRole("button", { name: /B-7KQ2M9XP/ }).click();
    const dq = pg.getByRole("dialog", { name: "Queja B-7KQ2M9XP" });
    await dq.getByText("Mi supervisor me grita frente a los clientes casi todos los días.").waitFor();
    await dq.getByText("Anónima: no dejó nombre ni contacto.").waitFor();
    await dq.getByLabel("Estado").selectOption("en_revision");
    await dq.getByRole("button", { name: "Guardar cambios" }).click();
    await pg.getByText("Queja actualizada.").waitFor();
    await dq.getByText(/Bitácora \(\d+\)/).click();
    await dq.getByText(/La abrió · Rosa RH/).waitFor();
    await captura(pg, `${ancho}-buzon-detalle`);
    await pg.keyboard.press("Escape");
    await revisar(pg, `buzón ${ancho}`, "[data-clima2]");
    await captura(pg, `${ancho}-buzon`);
    await pg.context().close();

    // 6) Buzón público, sin sesión.
    const pub = await sesion({ width: ancho, height: alto }, { usuario: null });
    await ir(pub, "/buzon/7.AbCdEfGhIjKlMnOpQrStUv");
    await pub.getByRole("heading", { name: "Buzón confidencial de Tiendas del Centro" }).waitFor({ timeout: 30000 });
    await pub.getByRole("button", { name: "Enviar de forma confidencial" }).click();
    await pub.getByText("Elige de qué se trata.").waitFor();
    await pub.getByLabel("Violencia laboral").check();
    await pub.getByLabel("¿Qué pasó?").fill("Mi supervisor me grita frente a los clientes casi todos los días.");
    await revisar(pub, `buzón público ${ancho}`, "[data-clima2]");
    await captura(pub, `${ancho}-buzon-publico`);
    await pub.getByRole("button", { name: "Enviar de forma confidencial" }).click();
    await pub.getByText("Recibimos tu queja").waitFor();
    await pub.getByText("B-9PX3K7QM", { exact: true }).first().waitFor();
    await pub.getByText("H4K9M2Q7T3XZ").waitFor();
    await pub.getByLabel("Folio").fill("B-9PX3K7QM");
    await pub.getByLabel("Clave").fill("H4K9M2Q7T3XZ");
    await pub.getByRole("button", { name: "Consultar" }).click();
    await pub.getByText("Aún no hay respuesta.").waitFor();
    await revisar(pub, `buzón público enviado ${ancho}`, "[data-clima2]");
    await captura(pub, `${ancho}-buzon-publico-folio`);
    await pub.context().close();
    console.log(`PASS ${ancho}: riesgo de rotación, analítica, ciclo de vida, expediente NOM-035, buzón y buzón público`);
  }
  assert.deepEqual(errores, [], "sin errores de JavaScript en la página");
  exito = true;
} catch (e) {
  console.error("FALLÓ:", e.message);
} finally {
  await browser.close();
  next.kill();
  process.exit(exito ? 0 : 1);
}
