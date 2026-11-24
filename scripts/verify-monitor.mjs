// Verificación en navegador del Monitor › Tablero con hora fija (11:12 CDMX) y backend simulado: /panel lleva al Monitor,
// menú («Monitor» arriba en Control de tiempo), 7 contadores con su pie y alerta en rojo, contador = filtro (otra vez lo
// quita), 6 columnas con su número y sus personas, línea y chips clave de cada tarjeta, «Nadie» en columnas vacías,
// búsqueda/área, toque en la tarjeta → reloj del día, botón «Reloj checador» (escritorio y celular, 44 px) hacia el reloj
// de la empresa, Asistencias abre en Registros › Tabla sin «Hoy / En vivo» y el enlace viejo ?vista=envivo lleva al
// Monitor; celular en secciones apiladas (lo urgente primero, sin tablero lateral, tarjetas ≥ 44 px); sin desborde a
// 1440 ni a 390 px y sin errores de JS.
// Vistas «Línea del día» y «Lista»: el selector cambia de vista y se recuerda al recargar; en la Línea, barra programada,
// tramos reales (trabajo, comida, se pasó, hora extra, sin salida) y línea de «ahora» en su hora del eje; en la Lista,
// cada persona con su línea, chips y estado; filtros, búsqueda y área en las tres; tocar una persona abre el reloj; en
// celular el eje se desplaza dentro de su caja con el nombre fijo y la página no desborda.
// Uso: npm run build && node scripts/verify-monitor.mjs   (CAPTURAS=carpeta para guardar capturas)
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
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  stdio: "ignore",
  env: { ...process.env, JWT_SECRET: secret },
});
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function token() {
  // Sin id_empresa: el layout de RH no consulta la base de datos (ver panel/layout.jsx).
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}

const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = {
  id_usuario: -1,
  tipo_usuario: "Recruiter",
  id_empresa: 10,
  nombre: "RH Prueba",
  empresas: [10],
  empresas_detalle: [empresa],
  zona_horaria: "America/Mexico_City",
};
const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const ayer = new Date(Date.parse(`${hoy}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
// Hora fija del navegador: hoy a las 11:12 en Ciudad de México (17:12 UTC, sin horario de verano).
const AHORA = new Date(`${hoy}T17:12:00Z`);
const t = (h, f = hoy) => `${f} ${h}:00`;
let id = 0;
const reg = (nombre, apellido, area, entra, sale, extra = {}) => ({
  id: ++id,
  id_empleado: id,
  nombre,
  apellido_paterno: apellido,
  departamento: area,
  fecha: hoy,
  zona_horaria: "America/Mexico_City",
  hora_entrada_programada: entra && `${entra}:00`,
  hora_salida_programada: sale && `${sale}:00`,
  tolerancia_entrada_min: 10,
  tolerancia_salida_min: 0,
  // Jornadas de 9 h con 1 h de comida (no se paga): 8 h programadas.
  hrs_comida: [entra, sale].join() === "09:00,18:00" || [entra, sale].join() === "08:00,17:00" ? 1 : 0,
  entrada: null,
  salida: null,
  tipo_registro_nombre: "Sin checar",
  asistencia: 0,
  ...extra,
});
const tramos = (lista, abierta = null, f = hoy) => ({
  tramos_checadas: lista.map(([e, s]) => ({ entrada: t(e, f), salida: t(s, f) })),
  tramos_abiertos: abierta ? 1 : 0,
  entrada_tramo_abierto: abierta ? t(abierta, f) : null,
  entrada: t(lista[0]?.[0] ?? abierta, f),
  salida: lista.length && !abierta ? t(lista.at(-1)[1], f) : null,
  asistencia: 1,
});
const enComida = (salida) => ({ salida: t(salida), regreso: null, minutos: null, minutos_programados: 60 });
const RELLENO = ["Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete"];
function datos() {
  id = 0;
  return [
    reg("Alondra", "Munguía", "Ventas", "07:00", "14:00"), // faltó (mitad 10:30)
    reg("Armando", "González", "Contaduría", "09:00", "18:00"), // no ha llegado, hace 2 h 12 min
    reg("Cristian", "Cano", "Producción", "08:00", "17:00", { ...tramos([["08:00", "10:05"]]), comida_checada: enComida("10:05") }),
    reg("Frida", "Serrano", "Marketing", "09:00", "18:00", tramos([], "09:18")), // llegó tarde +18
    reg("Jesús", "Guzmán", "Development", "09:00", "18:00", tramos([], "08:56")),
    reg("Valeria", "Castillo", "Marketing", "09:00", "18:00", tramos([], "08:49")),
    reg("Diego", "León", "Administración", "00:00", "08:00", {
      ...tramos([
        ["00:16", "00:30"],
        ["00:59", "07:23"],
      ]),
      comida_checada: { salida: t("00:30"), regreso: t("00:59"), minutos: 29, minutos_programados: 30 },
      permisos_horas_dia: [{ id: 1, tipo_horas: "sale_antes", hora_inicio: "07:00", hora_fin: "08:00" }],
    }),
    reg("Rosa", "Pérez", "Ventas", "07:00", "15:00", tramos([["07:00", "10:30"]])), // salió antes
    reg("Beto", "Ruiz", "Ventas", "12:00", "20:00"), // por entrar
    reg("Ana", "López", "Producción", "08:00", "17:00", { ...tramos([["08:00", "11:00"]]), comida_checada: enComida("11:00") }),
    reg("Gil", "Prueba", "Planta", null, null, { tipo_registro_nombre: "Día de Descanso" }),
    // Turno nocturno de ayer que sigue abierto (no checó salida): se muestra el de ayer, no el de hoy.
    reg("Nora", "Noche", "Planta", "22:00", "06:00", { fecha: ayer, ...tramos([], "22:05", ayer) }),
    { ...reg("Nora", "Noche", "Planta", "22:00", "06:00"), id_empleado: 12 },
    reg("Mario", "Gómez", "Almacén", "08:00", "17:00", {
      ...tramos([], "07:51"),
      horas_extra_autorizadas_dia: { hasta: "20:00", minutos: 180, motivo: "inventario" },
    }),
    reg("Lucía", "Torres", "Oficina", "09:00", "18:00", { tipo_registro_nombre: "Vacaciones" }),
    reg("Bruno", "Ríos", "Reparto", "08:00", "17:00", {
      ...tramos([["07:58", "10:00"]]),
      permisos_horas_dia: [{ id: 2, tipo_horas: "sale_regresa", hora_inicio: "10:00", hora_fin: "12:00", motivo: "cita médica" }],
    }),
    ...RELLENO.map((n) => reg("Paco", n, "Planta", "08:00", "17:00", tramos([], "07:55"))),
    reg("Mónica", "Ruiz", "Almacén", "05:00", "11:00", tramos([], "04:58")), // hora extra desde las 11:00
    reg("Sergio", "Vela", "Reparto", "07:00", "11:30", tramos([], "07:00")), // sale en 18 min
    reg("Elena", "Mora", "Oficina", "09:00", "18:00", {
      ...tramos([], "10:40"),
      permisos_horas_dia: [{ id: 3, tipo_horas: "llega_tarde", hora_inicio: "09:00", hora_fin: "10:30" }],
    }),
  ];
}
const registros = datos();
let exito = false;
const errores = [];
const browser = await chromium.launch();
const capturas = process.env.CAPTURAS;

async function contexto(viewport) {
  const ctx = await browser.newContext({ viewport, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: viewport.width < 500 });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(AHORA);
  page.on("pageerror", (e) => {
    errores.push(e.message);
    if (process.env.DEPURAR) console.log("pageerror", page.url(), new Error().stack.split("\n")[2], e.message.slice(0, 80));
  });
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/empresas/check-status") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ hasActivePlan: true, slug: "empresa-prueba" }),
      });
    }
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = {
      "Access-Control-Allow-Origin": base,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "authorization,content-type",
    };
    const json = (data) => route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/asistencias")) return json({ registros, total: registros.length, page: 1, aplicarPaginacion: false });
    if (p.endsWith("/checador/cuenta-horas")) return json({ ok: true, data: { 2: 90 } });
    // Reloj del día (la misma ventana que en Asistencias): sin checadas, ofrece cargar el horario.
    if (/\/checador\/asistencias\/\d+\/reloj$/.test(p)) {
      return json({
        ok: true,
        migracion: true,
        horario: { entrada: "09:00", salida: "16:00", salida_comida: null, regreso_comida: null },
        dia: { tipo: "normal", nombre: "Día normal", pago: "" },
        registros: [],
        motivos: { permisos: [], correccion: [{ clave: "olvido", nombre: "Olvidó checar" }] },
        autorizadores: [],
      });
    }
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
  return { ctx, page };
}
async function abrirMonitor(page, ruta = "/panel") {
  await page.goto(base + ruta, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/panel\/monitor$/, { timeout: 30000 });
  const vista = page.getByRole("region", { name: "Asistencia de hoy" });
  await vista.locator("[data-estado]").first().waitFor({ timeout: 30000 });
  return vista;
}
const limpio = async (loc) => (await loc.innerText()).replace(/\s+/g, " ").trim();
const contador = (vista, titulo) =>
  vista.getByRole("group", { name: "Contadores de hoy" }).getByRole("button", { name: new RegExp(`^${titulo}`) });
const cuentaDe = async (vista, titulo) => Number((await contador(vista, titulo).locator("[data-n]").innerText()).trim());
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
// Columnas: [clave, número del encabezado, personas en orden].
const columnas = (vista) =>
  vista
    .locator("[data-columna]")
    .evaluateAll((cs) =>
      cs.map((c) => [
        c.dataset.columna,
        Number(c.querySelector("h3 [data-n]").textContent),
        [...c.querySelectorAll("[data-persona]")].map((p) => p.dataset.persona),
      ])
    );
// Texto de la tarjeta: línea | chips.
const tarjetaDe = (vista, nombre) => vista.locator(`[data-persona="${nombre}"]`);
const textoTarjeta = (vista, nombre) =>
  tarjetaDe(vista, nombre).evaluate((li) =>
    [li.querySelector("[data-linea]").textContent, ...[...li.querySelectorAll("[data-chip]")].map((c) => c.textContent)].join(" | ")
  );
const PACOS = RELLENO.map((n) => `Paco ${n}`).sort((x, y) => x.localeCompare(y, "es"));
// Orden de urgencia del Tablero (el de sus secciones en celular): lo usan la Línea del día y la Lista.
const URGENCIA = [
  "Alondra Munguía",
  "Armando González",
  "Cristian Cano",
  "Ana López",
  "Nora Noche",
  "Mónica Ruiz",
  "Sergio Vela",
  "Mario Gómez",
  ...PACOS,
  "Valeria Castillo",
  "Jesús Guzmán",
  "Frida Serrano",
  "Elena Mora",
  "Beto Ruiz",
  "Rosa Pérez",
  "Bruno Ríos",
  "Diego León",
  "Gil Prueba",
  "Lucía Torres",
];
const selector = (page) => page.getByRole("group", { name: "Vista del Monitor" }).first();
async function elegirVista(page, nombre) {
  await selector(page).getByRole("button", { name: nombre, exact: true }).click();
  await selector(page).getByRole("button", { name: nombre, exact: true }).and(page.locator('[aria-pressed="true"]')).waitFor();
}
const vistaElegida = (page) => selector(page).locator('[aria-pressed="true"]').innerText();
const filasDe = (cont) => cont.locator("[data-persona]").evaluateAll((ps) => ps.map((p) => p.dataset.persona));
// Centro (x) de una marca del eje («8 a.m.») y px por hora, para ubicar tramos y «ahora».
async function ejeEnPx(linea) {
  const marcas = await linea.locator("[data-horas] > span").evaluateAll((ss) =>
    ss.map((s) => {
      const r = s.getBoundingClientRect();
      return [s.textContent, r.left + r.width / 2];
    })
  );
  const x = (t) => marcas.find(([m]) => m === t)?.[1];
  const porHora = (x("10 a.m.") - x("8 a.m.")) / 2;
  return { x8: x("8 a.m."), porHora, en: (h, m = 0) => x("8 a.m.") + (h - 8 + m / 60) * porHora };
}
const caja = (loc) =>
  loc.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { l: r.left, r: r.right, w: r.width, c: r.left + r.width / 2 };
  });
const cerca = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(1)} vs ${b.toFixed(1)}`);
// Ningún elemento sale de su renglón / tarjeta (salvo texto truncado a propósito).
const fueraDeFila = (cont) =>
  cont.locator("[data-persona]").evaluateAll((ps) =>
    ps
      .filter((p) => {
        const r = p.getBoundingClientRect();
        return [...p.querySelectorAll("*")].some((e) => {
          if (e.closest("[data-eje]")) return false; // la barra vive en su propio eje
          const q = e.getBoundingClientRect();
          return q.width && (q.right > r.right + 1 || q.left < r.left - 1) && !e.parentElement.closest(".truncate");
        });
      })
      .map((p) => p.dataset.persona)
  );

try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(base + "/login")).status) break;
    } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }

  // ——— Escritorio 1440 ———
  const { ctx, page } = await contexto({ width: 1440, height: 1100 });
  const vista = await abrirMonitor(page);
  assert.match(await limpio(page.locator("h1").first().locator("..")), /^Monitor .* · 11:12 a\.m\. · se actualiza solo$/);
  assert.equal(await page.getByRole("link", { name: /Ver historial en Asistencias/ }).getAttribute("href"), "/panel/registro-asistencia");

  // Menú: «Monitor» arriba de «Asistencias» en Control de tiempo; el dashboard se llama «Resumen».
  const menu = await page.locator('[data-sidebar="menu-button"]').allInnerTexts();
  const enMenu = menu.map((x) => x.trim());
  assert.ok(enMenu.indexOf("Monitor") >= 0 && enMenu.indexOf("Monitor") < enMenu.indexOf("Asistencias"), `menú: ${enMenu.join(" | ")}`);
  assert.ok(enMenu.includes("Resumen") && !enMenu.includes("Inicio"), "el dashboard es «Resumen»");

  // Contadores: número, pie y alerta en rojo (no han llegado con gente; en comida con alguien que se pasó).
  const grupo = vista.getByRole("group", { name: "Contadores de hoy" });
  const contadores = await grupo
    .locator("[data-contador]")
    .evaluateAll((bs) => bs.map((b) => [b.innerText.replace(/\s+/g, " ").trim(), b.className.includes("bg-red-50")]));
  assert.deepEqual(contadores, [
    ["Trabajando 15 1 en hora extra", false],
    ["En comida 2 1 ya se pasó", true],
    ["Ya salieron 3 3 salió antes", false],
    ["Por entrar 1 el próximo a las 12:00 p.m.", false],
    ["No han llegado 2 ya pasó su hora", true],
    ["Llegaron tarde 3 1 con permiso", false],
    ["Con permiso / día 5 3 por horas · 2 de día", false],
  ]);
  // Los 7 en una fila a 1440.
  const filasContadores = await grupo
    .locator("[data-contador]")
    .evaluateAll((bs) => new Set(bs.map((b) => Math.round(b.getBoundingClientRect().top))).size);
  assert.equal(filasContadores, 1, "7 contadores en una fila");
  // Iconos lucide de los desplegables (svg) en contadores y columnas.
  assert.equal(await grupo.locator("[data-contador] svg").count(), 7);

  // Tablero: 6 columnas en una fila, en el orden de la maqueta, con su número y sus personas.
  const tablero = vista.getByRole("region", { name: "Tablero de hoy" });
  const cajas = await tablero.locator("[data-columna]").evaluateAll((cs) =>
    cs.map((c) => {
      const r = c.getBoundingClientRect();
      return [Math.round(r.top), Math.round(r.left)];
    })
  );
  assert.equal(new Set(cajas.map(([top]) => top)).size, 1, `6 columnas en una fila: ${JSON.stringify(cajas)}`);
  assert.deepEqual(
    cajas.map(([, left]) => left),
    [...cajas.map(([, left]) => left)].sort((x, y) => x - y)
  );
  assert.deepEqual(await columnas(vista), [
    ["por_entrar", 1, ["Beto Ruiz"]],
    [
      "trabajando",
      15,
      [
        "Nora Noche",
        "Mónica Ruiz",
        "Sergio Vela",
        "Mario Gómez",
        ...PACOS,
        "Valeria Castillo",
        "Jesús Guzmán",
        "Frida Serrano",
        "Elena Mora",
      ],
    ],
    ["comida", 2, ["Cristian Cano", "Ana López"]],
    ["salio", 3, ["Rosa Pérez", "Bruno Ríos", "Diego León"]],
    ["no_ha_llegado", 2, ["Alondra Munguía", "Armando González"]],
    ["no_laboran", 2, ["Gil Prueba", "Lucía Torres"]],
  ]);
  assert.match(await limpio(tablero.locator('[data-columna="trabajando"] h3')), /^Trabajando 15$/);
  assert.equal(await tablero.locator("[data-columna] h3 svg").count(), 6, "icono en cada columna");
  // Cada tarjeta dentro de su columna y ningún texto fuera de su tarjeta.
  const fuera = await tablero.locator("[data-persona]").evaluateAll((ps) =>
    ps
      .filter((p) => {
        const r = p.getBoundingClientRect();
        const c = p.closest("[data-columna]").getBoundingClientRect();
        if (r.left < c.left - 1 || r.right > c.right + 1) return true;
        return [...p.querySelectorAll("*")].some((e) => {
          const q = e.getBoundingClientRect();
          return q.width && (q.right > r.right + 1 || q.left < r.left - 1) && !e.parentElement.closest(".truncate");
        });
      })
      .map((p) => p.dataset.persona)
  );
  assert.deepEqual(fuera, [], "tarjetas sin desborde a 1440");

  // Línea y chips clave de cada tarjeta.
  const esperadas = {
    "Frida Serrano": "Entró 9:18 a.m. · sale 6:00 p.m. · lleva 1 h 54 min | Llegó tarde +18 min",
    "Elena Mora": "Entró 10:40 a.m. · sale 6:00 p.m. · lleva 32 min | Llegó tarde con permiso",
    "Mónica Ruiz": "Entró 4:58 a.m. · sale 11:00 a.m. · lleva 6 h 14 min | Hora extra desde 11:00 a.m.",
    "Sergio Vela": "Entró 7:00 a.m. · sale 11:30 a.m. · lleva 4 h 12 min | Sale en 18 min",
    "Mario Gómez": "Entró 7:51 a.m. · sale 5:00 p.m. · lleva 3 h 21 min | Extra autorizada hasta 8:00 p.m.",
    "Nora Noche": "Entró 10:05 p.m. · sale 6:00 a.m. · lleva 13 h 7 min | Sin checar salida · debía salir hace 5 h 12 min",
    "Cristian Cano": "Salió a comer 10:05 a.m. · lleva 1 h 7 min de 1 h | Se pasó 7 min",
    "Ana López": "Salió a comer 11:00 a.m. · lleva 12 min de 1 h | Regresa a las 12:00 p.m.",
    "Rosa Pérez": "Salió 10:30 a.m. · trabajó 3 h 30 min | Salió antes −4 h 30 min",
    "Bruno Ríos": "Salió 10:00 a.m. · trabajó 2 h 2 min | Salió antes con permiso",
    "Diego León": "Salió 7:23 a.m. · trabajó 6 h 38 min | Llegó tarde +16 min | Salió antes con permiso",
    "Beto Ruiz": "Entra 12:00 p.m. · en 48 min",
    "Alondra Munguía": "Debía entrar 7:00 a.m. · van 4 h 12 min · media jornada | Sin checar",
    "Armando González": "Debía entrar 9:00 a.m. · van 2 h 12 min | Sin checar | Debe 1 h 30 min",
    "Lucía Torres": "Vacaciones",
    "Gil Prueba": "Día de Descanso",
  };
  for (const [nombre, texto] of Object.entries(esperadas)) assert.equal(await textoTarjeta(vista, nombre), texto, nombre);
  // Barra de avance solo en Trabajando y En comida; la de quien se pasó de comida, roja y llena.
  for (const [col, conBarra] of [
    ["trabajando", true],
    ["comida", true],
    ["salio", false],
    ["por_entrar", false],
    ["no_ha_llegado", false],
    ["no_laboran", false],
  ]) {
    const tarjetas = await tablero.locator(`[data-columna="${col}"] [data-persona]`).count();
    assert.equal(await tablero.locator(`[data-columna="${col}"] [role="progressbar"]`).count(), conBarra ? tarjetas : 0, `barra en ${col}`);
  }
  assert.equal(await tarjetaDe(vista, "Cristian Cano").getByRole("progressbar").getAttribute("aria-valuenow"), "100");
  assert.ok(await sinDesborde(page), "Monitor 1440 sin desborde");
  if (capturas) await page.screenshot({ path: `${capturas}/monitor-1440.png`, fullPage: true });

  // Contador = filtro: «No han llegado» → solo esas personas, las demás columnas dicen «Nadie»; otra vez → todos.
  await contador(vista, "No han llegado").click();
  assert.equal(await contador(vista, "No han llegado").getAttribute("aria-pressed"), "true");
  assert.deepEqual(
    (await columnas(vista)).map(([c, n]) => [c, n]),
    [
      ["por_entrar", 0],
      ["trabajando", 0],
      ["comida", 0],
      ["salio", 0],
      ["no_ha_llegado", 2],
      ["no_laboran", 0],
    ]
  );
  assert.equal(await tablero.getByText("Nadie", { exact: true }).count(), 5);
  assert.match(await limpio(vista.locator("[data-filtro]")), /^Filtrando: No han llegado · toca de nuevo la tarjeta para quitarlo/);
  if (capturas) await page.screenshot({ path: `${capturas}/monitor-1440-filtro.png` });
  await contador(vista, "Llegaron tarde").click();
  assert.deepEqual(
    (await columnas(vista)).filter(([, n]) => n).map(([c, , p]) => [c, p]),
    [
      ["trabajando", ["Frida Serrano", "Elena Mora"]],
      ["salio", ["Diego León"]],
    ]
  );
  await contador(vista, "Llegaron tarde").click();
  assert.equal(await contador(vista, "Llegaron tarde").getAttribute("aria-pressed"), "false");
  assert.match(await limpio(vista.locator("[data-filtro]")), /^25 personas hoy$/);
  await contador(vista, "Con permiso / día").click();
  assert.deepEqual(
    (await columnas(vista)).filter(([, n]) => n).map(([c, , p]) => [c, p]),
    [
      ["trabajando", ["Elena Mora"]],
      ["salio", ["Bruno Ríos", "Diego León"]],
      ["no_laboran", ["Gil Prueba", "Lucía Torres"]],
    ]
  );
  await vista.getByRole("button", { name: "ver todos" }).click();
  assert.equal(await contador(vista, "Con permiso / día").getAttribute("aria-pressed"), "false");
  // Búsqueda y área (en pantalla); los contadores cuentan con el filtro de área.
  await vista.getByLabel("Buscar empleado").fill("gonza");
  assert.deepEqual(
    (await columnas(vista)).flatMap(([, , p]) => p),
    ["Armando González"]
  );
  await vista.getByLabel("Buscar empleado").fill("");
  await vista.getByLabel("Área").selectOption("Marketing");
  assert.equal(await cuentaDe(vista, "Trabajando"), 2, "los contadores cuentan con el filtro de área");
  await vista.getByLabel("Área").selectOption("");
  assert.match(await limpio(vista), /Toca una persona para abrir su reloj del día/);

  // Toque en la tarjeta: el reloj del día (la misma ventana de Asistencias), sin salir del Monitor.
  await vista.getByRole("button", { name: "Ver día de Armando González" }).click();
  await page
    .getByRole("dialog", { name: /Armando González/ })
    .getByRole("button", { name: "Cargar su horario normal" })
    .waitFor({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
  assert.match(page.url(), /\/panel\/monitor$/);

  // ——— Selector de vista: Tablero por defecto ———
  assert.deepEqual(
    (await selector(page).getByRole("button").allInnerTexts()).map((x) => x.trim()),
    ["Tablero", "Línea del día", "Lista"]
  );
  assert.equal((await vistaElegida(page)).trim(), "Tablero");

  // ——— Línea del día ———
  await elegirVista(page, "Línea del día");
  const linea = vista.getByRole("region", { name: "Línea del día" });
  await linea.waitFor();
  assert.equal(await vista.getByRole("region", { name: "Tablero de hoy" }).count(), 0, "el Tablero se oculta");
  assert.deepEqual(await filasDe(linea), URGENCIA, "filas en el orden de urgencia del Tablero");
  // Eje: marcas de hora (cada 2 h: el día va de la noche de ayer, Nora, a las 9 p.m.) y la etiqueta de ahora.
  const marcas = await linea.locator("[data-horas] > span").allInnerTexts();
  assert.ok(marcas.includes("8 a.m.") && marcas.includes("2 p.m.") && marcas.includes("8 p.m."), `marcas: ${marcas.join(" ")}`);
  assert.equal(await limpio(linea.locator("[data-ahora-eje]")), "11:12 a.m.", "etiqueta de ahora en el eje");
  assert.equal(
    await linea.locator("[data-eje-scroll]").evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    true,
    "a 1440 el día cabe sin desplazar"
  );
  // Las marcas pegadas a la de ahora se ocultan para no encimarse.
  assert.deepEqual(
    await linea.locator("[data-horas] > span:not([data-ahora-eje])").evaluateAll((ss) =>
      ss
        .filter((x) => getComputedStyle(x).visibility === "visible")
        .map((x) => x.textContent)
        .filter((t) => ["10 a.m.", "12 p.m."].includes(t))
    ),
    []
  );
  const px = await ejeEnPx(linea);
  assert.ok(px.porHora >= 20, `px por hora: ${px.porHora}`);
  const filaL = (n) => linea.locator(`[data-persona="${n}"]`);
  // Frida: horario 9:00–18:00 tenue; trabajo azul desde 9:18 hasta ahora; la línea de ahora a las 11:12 en todas las filas.
  const prog = await caja(filaL("Frida Serrano").locator("[data-programada]"));
  cerca(prog.l, px.en(9), 2, "programada empieza 9:00");
  cerca(prog.r, px.en(18), 2, "programada termina 18:00");
  const trabajo = await caja(filaL("Frida Serrano").locator('[data-tramo="trabajo"]'));
  cerca(trabajo.l, px.en(9, 18), 2, "trabajo desde 9:18");
  cerca(trabajo.r, px.en(11, 12), 2, "trabajo hasta ahora");
  const ahoras = await linea.locator("[data-ahora]").evaluateAll((ls) =>
    ls.map((l) => {
      const r = l.getBoundingClientRect();
      return r.left + r.width / 2;
    })
  );
  assert.equal(ahoras.length, URGENCIA.length, "línea de ahora en cada fila");
  for (const x of ahoras) cerca(x, px.en(11, 12), 2, "ahora a las 11:12");
  // Tramos por tipo: comida (Ana), se pasó de comida (Cristian), hora extra (Mónica), sin checar salida (Nora), gris al salir (Rosa).
  const tipos = async (n) =>
    filaL(n)
      .locator("[data-tramo]")
      .evaluateAll((ts) => ts.map((t) => t.dataset.tramo));
  assert.deepEqual(await tipos("Ana López"), ["trabajo", "comida"]);
  assert.deepEqual(await tipos("Cristian Cano"), ["trabajo", "comida", "comida_excedida"]);
  assert.deepEqual(await tipos("Mónica Ruiz"), ["trabajo", "extra"]);
  assert.deepEqual(await tipos("Nora Noche"), ["trabajo", "sin_salida"]);
  assert.deepEqual(await tipos("Diego León"), ["trabajo", "comida", "trabajo"]);
  const excedida = await caja(filaL("Cristian Cano").locator('[data-tramo="comida_excedida"]'));
  cerca(excedida.l, px.en(11, 5), 2, "se pasó desde 11:05 (comida 10:05 + 1 h)");
  const extra = await caja(filaL("Mónica Ruiz").locator('[data-tramo="extra"]'));
  cerca(extra.l, px.en(11), 2, "hora extra desde su salida 11:00");
  assert.equal(
    await filaL("Rosa Pérez")
      .locator('[data-tramo="trabajo"]')
      .evaluate((t) => t.className.includes("bg-slate-400")),
    true,
    "ya salió: gris"
  );
  assert.equal(await filaL("Mario Gómez").locator("[data-extra-autorizada]").count(), 1, "extra autorizada tenue");
  assert.equal(await filaL("Lucía Torres").locator("[data-programada], [data-tramo]").count(), 0, "vacaciones: sin barra");
  assert.equal(await limpio(filaL("Mónica Ruiz").locator("[data-estado-chip]")), "Hora extra");
  assert.equal(await limpio(filaL("Nora Noche").locator("[data-estado-chip]")), "Sin checar salida");
  // Avatar y nombre fijos a la izquierda; nada sale de su fila; la página no desborda.
  assert.deepEqual(await fueraDeFila(linea), [], "filas de la línea sin desborde a 1440");
  assert.ok(await sinDesborde(page), "Línea del día 1440 sin desborde");
  if (capturas) {
    await dormir(300);
    await page.screenshot({ path: `${capturas}/monitor-linea-1440.png`, fullPage: true });
  }
  // Filtros y búsqueda en la Línea.
  await contador(vista, "No han llegado").click();
  assert.deepEqual(await filasDe(linea), ["Alondra Munguía", "Armando González"]);
  await contador(vista, "No han llegado").click();
  await vista.getByLabel("Área").selectOption("Marketing");
  assert.deepEqual(await filasDe(linea), ["Valeria Castillo", "Frida Serrano"]);
  await vista.getByLabel("Área").selectOption("");
  // Tocar una persona (en su barra) abre su reloj del día.
  const ejeArmando = await filaL("Armando González").locator("[data-eje]").boundingBox();
  await page.mouse.click(ejeArmando.x + ejeArmando.width * 0.4, ejeArmando.y + ejeArmando.height / 2);
  await page.getByRole("dialog", { name: /Armando González/ }).waitFor({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });

  // ——— Lista ———
  await elegirVista(page, "Lista");
  const lista = vista.getByRole("list", { name: "Lista de hoy" });
  await lista.waitFor();
  assert.deepEqual(await filasDe(lista), URGENCIA, "cada persona una vez, en el orden de urgencia");
  const renglon = (n) => lista.locator(`[data-persona="${n}"]`);
  const textoRenglon = (n) =>
    renglon(n).evaluate((li) =>
      [
        li.querySelector("[data-horario]").textContent,
        li.querySelector("[data-linea]").textContent,
        ...[...li.querySelectorAll("[data-chip]")].map((c) => c.textContent),
        li.querySelector("[data-estado-chip]").textContent,
      ].join(" | ")
    );
  assert.equal(
    await textoRenglon("Frida Serrano"),
    "9:00 a.m.–6:00 p.m. | Entró 9:18 a.m. · sale 6:00 p.m. · lleva 1 h 54 min | Llegó tarde +18 min | Trabajando"
  );
  assert.equal(
    await textoRenglon("Armando González"),
    "9:00 a.m.–6:00 p.m. | Debía entrar 9:00 a.m. · van 2 h 12 min | Sin checar | Debe 1 h 30 min | No ha llegado"
  );
  assert.equal(
    await textoRenglon("Cristian Cano"),
    "8:00 a.m.–5:00 p.m. | Salió a comer 10:05 a.m. · lleva 1 h 7 min de 1 h | Se pasó 7 min | En comida · se pasó"
  );
  assert.equal(await textoRenglon("Lucía Torres"), "Sin horario hoy | Vacaciones | Vacaciones");
  // Renglones de una línea a 1440 (compactos) y sin desbordes.
  const altos = await lista.locator("[data-persona]").evaluateAll((ps) => ps.map((p) => p.getBoundingClientRect().height));
  assert.ok(
    altos.every((h) => h >= 44 && h <= 72),
    `renglones compactos: ${altos.join(",")}`
  );
  assert.deepEqual(await fueraDeFila(lista), [], "renglones sin desborde a 1440");
  assert.ok(await sinDesborde(page), "Lista 1440 sin desborde");
  if (capturas) {
    await dormir(300);
    await page.screenshot({ path: `${capturas}/monitor-lista-1440.png`, fullPage: true });
  }
  await contador(vista, "Llegaron tarde").click();
  assert.deepEqual(await filasDe(lista), ["Frida Serrano", "Elena Mora", "Diego León"]);
  await vista.getByRole("button", { name: "ver todos" }).click();
  await vista.getByLabel("Buscar empleado").fill("gonza");
  assert.deepEqual(await filasDe(lista), ["Armando González"]);
  await vista.getByLabel("Buscar empleado").fill("");
  await vista.getByRole("button", { name: "Ver día de Rosa Pérez" }).click();
  await page.getByRole("dialog", { name: /Rosa Pérez/ }).waitFor({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });

  // La elección se recuerda al recargar (por usuario, en localStorage).
  await page.reload({ waitUntil: "domcontentloaded" });
  await vista.getByRole("list", { name: "Lista de hoy" }).waitFor({ timeout: 30000 });
  assert.equal((await vistaElegida(page)).trim(), "Lista");
  assert.equal(await page.evaluate(() => localStorage.getItem("adamia.monitor.vista.-1")), "lista");
  await elegirVista(page, "Tablero");
  await vista.getByRole("region", { name: "Tablero de hoy" }).waitFor();

  // Botón «Reloj checador» en la barra superior → reloj de la empresa (/seleccionar-reloj → /<slug> con una empresa).
  const reloj = page.locator("header").getByRole("link", { name: "Reloj checador" });
  assert.equal(await reloj.getAttribute("href"), "/seleccionar-reloj");
  assert.match(await limpio(reloj), /^Reloj checador$/);
  assert.ok((await page.locator("header").getByRole("button", { name: "Adamia AI" }).count()) <= 1);

  // Asistencias: abre en Registros › Tabla, sin «Hoy / En vivo».
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Registros" }).waitFor({ timeout: 30000 });
  assert.deepEqual(
    (await page.getByRole("tab").allInnerTexts()).map((x) => x.trim()),
    ["Registros", "Horas de ley"]
  );
  assert.equal(await page.getByRole("tab", { name: "Registros" }).getAttribute("aria-selected"), "true");
  assert.equal(
    await page.getByRole("group", { name: "Formato de registros" }).getByRole("button", { name: "Tabla" }).getAttribute("aria-pressed"),
    "true"
  );
  assert.equal(await page.getByText(/En vivo/).count(), 0, "sin «En vivo»");
  await page.getByRole("button", { name: /^Hoy/ }).first().waitFor();
  await page.getByRole("table").getByText("Armando González").first().waitFor({ timeout: 30000 });
  assert.ok(await sinDesborde(page), "Asistencias 1440 sin desborde");
  if (capturas) await page.screenshot({ path: `${capturas}/asistencias-1440.png` });
  await page.getByRole("button", { name: "Matriz" }).click();
  await page.getByRole("button", { name: "Matriz" }).and(page.locator('[aria-pressed="true"]')).waitFor();
  await page.getByText("Vista matriz").waitFor({ timeout: 30000 });
  await dormir(300); // termina la transición de color del botón elegido
  if (capturas) await page.screenshot({ path: `${capturas}/asistencias-matriz-1440.png` });
  // Enlace viejo a «En vivo» → Monitor.
  await abrirMonitor(page, "/panel/registro-asistencia?vista=envivo");

  await reloj.click();
  await page.waitForURL(/\/empresa-prueba$/, { timeout: 30000 });
  await ctx.close();

  // ——— Celular 390 ———
  const movil = await contexto({ width: 390, height: 844 });
  const m = movil.page;
  const vistaM = await abrirMonitor(m);
  assert.ok(await sinDesborde(m), "Monitor 390 sin desborde");
  assert.match(await limpio(m.locator("h1").first().locator("..")), /^Monitor .* · 11:12 a\.m\. · se actualiza solo$/);
  const relojM = m.locator("header").getByRole("link", { name: "Reloj checador" });
  const cajaReloj = await relojM.boundingBox();
  assert.ok(cajaReloj.width >= 44 && cajaReloj.height >= 44, `botón del reloj ≥ 44 px: ${JSON.stringify(cajaReloj)}`);
  assert.equal((await relojM.innerText()).trim(), "", "en celular solo el ícono");
  const grupoM = vistaM.getByRole("group", { name: "Contadores de hoy" });
  const desborda = await grupoM.evaluate((el) => ({ scroll: el.scrollWidth > el.clientWidth, overflow: getComputedStyle(el).overflowX }));
  assert.ok(desborda.scroll && desborda.overflow === "auto", `contadores se desplazan: ${JSON.stringify(desborda)}`);
  const ordenContadores = await grupoM.locator("[data-contador]").evaluateAll((bs) =>
    bs
      .map((b) => ({ t: b.dataset.contador, x: b.getBoundingClientRect().x }))
      .sort((a, b) => a.x - b.x)
      .map((b) => b.t)
  );
  assert.deepEqual(ordenContadores.slice(0, 3), ["no_ha_llegado", "comida", "tarde"]);
  for (const b of await grupoM.locator("[data-contador]").all()) assert.ok((await b.boundingBox()).height >= 44, "contador ≥ 44 px");
  // Secciones apiladas (no tablero lateral), en el orden de lo urgente, a todo el ancho.
  const tableroM = vistaM.getByRole("region", { name: "Tablero de hoy" });
  const secciones = await tableroM.locator("[data-columna]").evaluateAll((cs) =>
    cs
      .map((c) => {
        const r = c.getBoundingClientRect();
        return { c: c.dataset.columna, top: r.top, left: Math.round(r.left), w: Math.round(r.width) };
      })
      .sort((a, b) => a.top - b.top)
  );
  assert.deepEqual(
    secciones.map((x) => x.c),
    ["no_ha_llegado", "comida", "trabajando", "por_entrar", "salio", "no_laboran"]
  );
  assert.equal(new Set(secciones.map((x) => x.left)).size, 1, `secciones apiladas: ${JSON.stringify(secciones)}`);
  assert.ok(
    secciones.every((x) => x.w >= 340),
    "secciones a todo el ancho"
  );
  assert.ok(await tableroM.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), "sin desplazamiento lateral en el tablero");
  // Tarjetas tocables ≥ 44 px y sin desbordes (ningún texto sale de su tarjeta).
  const tarjetasM = await tableroM.locator("[data-persona]").evaluateAll((ps) =>
    ps.map((p) => {
      const r = p.getBoundingClientRect();
      const fuera = [...p.querySelectorAll("*")].some((e) => {
        const q = e.getBoundingClientRect();
        return q.width && (q.right > r.right + 1 || q.left < r.left - 1) && !e.parentElement.closest(".truncate");
      });
      return {
        n: p.dataset.persona,
        h: r.height,
        fuera,
        boton: p.querySelector("button[aria-label^='Ver día']").getBoundingClientRect().height,
      };
    })
  );
  assert.equal(tarjetasM.length, 25);
  for (const x of tarjetasM) assert.ok(x.h >= 44 && x.boton >= 44 && !x.fuera, `tarjeta ${JSON.stringify(x)}`);
  assert.equal(await textoTarjeta(vistaM, "Alondra Munguía"), "Debía entrar 7:00 a.m. · van 4 h 12 min · media jornada | Sin checar");
  if (capturas) await m.screenshot({ path: `${capturas}/monitor-390.png` });
  const verDia = tarjetaDe(vistaM, "Alondra Munguía").getByRole("button", { name: "Ver día de Alondra Munguía" });
  await verDia.tap();
  await m.getByRole("dialog", { name: /Alondra Munguía/ }).waitFor({ timeout: 15000 });
  await m.keyboard.press("Escape");
  await m.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
  assert.ok(await sinDesborde(m), "sin desborde tras abrir/cerrar el día");
  // Filtro en celular: «En comida» → solo esa sección con gente.
  await contador(vistaM, "En comida").tap();
  assert.deepEqual(
    (await columnas(vistaM)).filter(([, n]) => n).map(([c, , p]) => [c, p]),
    [["comida", ["Cristian Cano", "Ana López"]]]
  );
  await contador(vistaM, "En comida").tap();

  // Línea del día en celular: el eje se desplaza dentro de su caja, el nombre queda fijo y la página no desborda.
  const selM = selector(m);
  for (const b of await selM.getByRole("button").all()) assert.ok((await b.boundingBox()).height >= 44, "selector ≥ 44 px");
  await selM.getByRole("button", { name: "Línea del día" }).tap();
  const lineaM = vistaM.getByRole("region", { name: "Línea del día" });
  await lineaM.waitFor();
  assert.deepEqual(await filasDe(lineaM), URGENCIA);
  const scrollEje = lineaM.locator("[data-eje-scroll]");
  const desplaza = await scrollEje.evaluate((el) => ({
    scroll: el.scrollWidth > el.clientWidth + 50,
    overflow: getComputedStyle(el).overflowX,
  }));
  assert.ok(desplaza.scroll && desplaza.overflow === "auto", `el eje se desplaza: ${JSON.stringify(desplaza)}`);
  assert.ok(await sinDesborde(m), "Línea 390 sin desborde de la página");
  // Abre con «ahora» a la vista (el día empieza la noche de ayer por el turno de Nora).
  const ahoraVisible = () =>
    scrollEje.evaluate((el) => {
      const c = el.getBoundingClientRect();
      const a = el.querySelector("[data-ahora]").getBoundingClientRect();
      const nombre = el.querySelector("[data-persona] [data-nombre]").closest("div").getBoundingClientRect();
      return a.left > nombre.right && a.right < c.right;
    });
  assert.ok((await scrollEje.evaluate((el) => el.scrollLeft)) > 0 && (await ahoraVisible()), "abre con la línea de ahora a la vista");
  if (capturas) {
    await dormir(300);
    await m.screenshot({ path: `${capturas}/monitor-linea-390.png` });
  }
  const nombreFijo = () => lineaM.locator('[data-persona="Frida Serrano"] [data-nombre]').evaluate((e) => e.getBoundingClientRect().left);
  const antes = await nombreFijo();
  await scrollEje.evaluate((el) => {
    el.scrollLeft = 0;
  });
  await dormir(100);
  cerca(await nombreFijo(), antes, 1, "nombre fijo al desplazar el eje");
  assert.equal(await scrollEje.evaluate((el) => el.scrollLeft), 0, "el eje se desplazó");
  assert.ok(await sinDesborde(m), "sin desborde tras desplazar el eje");
  const filasM = await lineaM.locator("[data-persona]").evaluateAll((ps) => ps.map((p) => p.getBoundingClientRect().height));
  assert.ok(
    filasM.every((h) => h >= 44),
    "filas ≥ 44 px"
  );
  await contador(vistaM, "No han llegado").tap();
  assert.deepEqual(await filasDe(lineaM), ["Alondra Munguía", "Armando González"]);
  await contador(vistaM, "No han llegado").tap();
  await lineaM.getByRole("button", { name: /^Ver día de Alondra Munguía/ }).tap();
  await m.getByRole("dialog", { name: /Alondra Munguía/ }).waitFor({ timeout: 15000 });
  await m.keyboard.press("Escape");
  await m.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });

  // Lista en celular: una tarjeta por persona sin desbordes.
  await selM.getByRole("button", { name: "Lista" }).tap();
  const listaM = vistaM.getByRole("list", { name: "Lista de hoy" });
  await listaM.waitFor();
  assert.deepEqual(await filasDe(listaM), URGENCIA);
  assert.deepEqual(await fueraDeFila(listaM), [], "tarjetas de la lista sin desborde a 390");
  const anchos = await listaM.locator("[data-persona]").evaluateAll((ps) => ps.map((p) => Math.round(p.getBoundingClientRect().width)));
  assert.ok(
    anchos.every((w) => w >= 340 && w <= 390),
    `tarjetas a todo el ancho: ${anchos.join(",")}`
  );
  assert.ok(await sinDesborde(m), "Lista 390 sin desborde");
  if (capturas) {
    await dormir(300);
    await m.screenshot({ path: `${capturas}/monitor-lista-390.png` });
  }
  await contador(vistaM, "En comida").tap();
  assert.deepEqual(await filasDe(listaM), ["Cristian Cano", "Ana López"]);
  await contador(vistaM, "En comida").tap();
  await listaM.getByRole("button", { name: "Ver día de Beto Ruiz" }).tap();
  await m.getByRole("dialog", { name: /Beto Ruiz/ }).waitFor({ timeout: 15000 });
  await m.keyboard.press("Escape");
  await m.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
  await selM.getByRole("button", { name: "Tablero" }).tap();

  // Asistencias en celular: Registros › Lista | Matriz y los filtros de siempre.
  await m.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await m.getByRole("heading", { name: "Asistencia", exact: true }).waitFor({ timeout: 30000 });
  assert.deepEqual(
    (await m.getByRole("tab").allInnerTexts()).map((x) => x.trim()),
    ["Registros", "Horas de ley"]
  );
  const formato = m.getByRole("group", { name: "Formato de registros" });
  assert.equal(await formato.getByRole("button", { name: "Tabla" }).getAttribute("aria-pressed"), "true");
  for (const b of await formato.getByRole("button").all()) assert.ok((await b.boundingBox()).height >= 44, "Tabla | Matriz ≥ 44 px");
  assert.ok(await sinDesborde(m), "Asistencias 390 sin desborde");
  if (capturas) await m.screenshot({ path: `${capturas}/asistencias-390.png` });
  await formato.getByRole("button", { name: "Matriz" }).tap();
  await m.getByRole("button", { name: /^Periodo: Hoy/ }).waitFor({ timeout: 15000 });
  assert.ok(await sinDesborde(m), "Matriz 390 sin desborde de la página");
  if (capturas) await m.screenshot({ path: `${capturas}/asistencias-matriz-390.png` });
  await movil.ctx.close();

  if (capturas) {
    const largo = await contexto({ width: 390, height: 1900 });
    await abrirMonitor(largo.page);
    await largo.page.screenshot({ path: `${capturas}/monitor-390-completo.png`, fullPage: true });
    for (const [nombre, archivo] of [
      ["Línea del día", "linea"],
      ["Lista", "lista"],
    ]) {
      await selector(largo.page).getByRole("button", { name: nombre, exact: true }).click();
      await dormir(400);
      await largo.page.screenshot({ path: `${capturas}/monitor-${archivo}-390-completo.png`, fullPage: true });
    }
    await largo.ctx.close();
  }

  assert.deepEqual(errores, []);
  exito = true;
  console.log(
    "OK Monitor › Tablero: /panel → Monitor, menú, 7 contadores con pie y alerta roja, contador = filtro (otra vez lo quita), " +
      "6 columnas con número y personas, líneas y chips, barra en Trabajando y En comida, «Nadie», búsqueda y área, tarjeta → reloj del día, " +
      "Reloj checador (escritorio y celular 44 px) → reloj de la empresa, Asistencias en Registros › Tabla sin «En vivo», ?vista=envivo → Monitor, " +
      "celular en secciones apiladas (lo urgente primero, tarjetas ≥ 44 px), Tabla | Matriz, " +
      "selector Tablero | Línea del día | Lista recordado al recargar, Línea (programada, tramos y ahora en su hora; nombre fijo y eje " +
      "desplazable en celular), Lista (cada persona con línea, chips y estado; tarjetas en celular), filtros y reloj en las tres, " +
      "sin desborde a 1440 y 390, sin errores de JS"
  );
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
