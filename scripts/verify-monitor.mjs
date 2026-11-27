// Verificación en navegador del Monitor con hora fija (11:12 CDMX) y backend simulado: /panel lleva al Monitor, menú
// («Monitor» arriba en Control de tiempo), 7 contadores con su pie y alerta en rojo, contador = filtro (otra vez lo quita),
// búsqueda/área, botón «Reloj checador» (escritorio y celular, 44 px) hacia el reloj de la empresa, Asistencias abre en
// Registros › Tabla sin «Hoy / En vivo» y el enlace viejo ?vista=envivo lleva al Monitor; sin desborde a 1440 ni a 390 px
// y sin errores de JS.
// Vista «Tabla» (por defecto; maquetas Main.dc.html y MovilMonitor.dc.html): tabla semántica con encabezados Persona ·
// Horario · Entrada · Qué pasa · Jornada, renglones agrupados (Requiere atención, Con permiso / descanso, Saldrán tarde /
// hora extra, En jornada, Por entrar, Ya salieron) con su número, una frase + a lo más un chip, entrada (→ salida), barra
// de jornada, todo el renglón abre el reloj del día (clic y teclado); en celular tarjetas bajo los mismos grupos
// (≥ 44 px, sin desplazamiento lateral). Selector Tabla | Línea del día recordado al recargar; «tablero» o «lista»
// guardados antes abren la Tabla. Línea del día: barra programada, tramos reales (trabajo, comida, se pasó, hora extra,
// sin salida) y línea de «ahora» en su hora del eje; en celular el eje se desplaza dentro de su caja con el nombre fijo.
// Uso: npm run build && node scripts/verify-monitor.mjs   (CAPTURAS=carpeta para guardar capturas; ESCALA=2 para
// capturas a doble densidad)
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
    reg("Rosa", "Pérez", "Ventas", "07:00", "15:00", { ...tramos([["07:00", "10:30"]]), correccion: 1 }), // salió antes · editado
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
    reg("Sofía", "Méndez", "Caja", "06:00", "11:00", tramos([["05:55", "11:02"]])), // ya salió a su hora
  ];
}
const registros = datos();
let exito = false;
const errores = [];
const browser = await chromium.launch();
const capturas = process.env.CAPTURAS;

async function contexto(viewport, vistaGuardada = null) {
  const ctx = await browser.newContext({
    viewport,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    hasTouch: viewport.width < 500,
    deviceScaleFactor: Number(process.env.ESCALA) || 1,
  });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  if (vistaGuardada) await page.addInitScript((v) => localStorage.setItem("adamia.monitor.vista.-1", v), vistaGuardada);
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
// (27/11/2026) /panel ya no lleva al Monitor sino al muro (src/lib/inicioPanel.mjs; lo revisa verify-comunicados): se
// entra directo al Monitor.
async function abrirMonitor(page, ruta = "/panel/monitor") {
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
// Tabla: [clave del grupo, número del encabezado, personas en orden].
const tablaDe = (page) => page.getByRole("table", { name: "Personas de hoy" });
const grupos = (tabla) =>
  tabla
    .locator("tbody[data-grupo]")
    .evaluateAll((gs) =>
      gs.map((g) => [
        g.dataset.grupo,
        Number(g.querySelector("th[scope=rowgroup] [data-n]").textContent),
        [...g.querySelectorAll("[data-persona]")].map((p) => p.dataset.persona),
      ])
    );
const tituloGrupos = (tabla) =>
  tabla.locator("th[scope=rowgroup]").evaluateAll((ts) => ts.map((t) => t.textContent.replace(/\s+/g, " ").trim()));
// Renglón: horario | entrada | frase | chip extra (si hay).
const renglonDe = (tabla, nombre) => tabla.locator(`[data-persona="${nombre}"]`);
const textoRenglon = (tabla, nombre) =>
  renglonDe(tabla, nombre).evaluate((tr) =>
    [
      tr.querySelector("[data-horario]").textContent,
      tr.querySelector("[data-entrada]").textContent,
      tr.querySelector("[data-frase]").textContent,
      tr.querySelector("[data-chip-extra]")?.textContent,
    ]
      .filter((x) => x != null)
      .join(" | ")
  );
const PACOS = RELLENO.map((n) => `Paco ${n}`).sort((x, y) => x.localeCompare(y, "es"));
// Orden de urgencia (No han llegado → En comida → Trabajando → Por entrar → Ya salieron → Descanso): el de la Línea del día.
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
  "Sofía Méndez",
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
// Grupos esperados de la Tabla a las 11:12 (del más urgente al menos; «Ya salieron» = Sofía).
const GRUPOS = [
  ["atencion", 6, ["Alondra Munguía", "Armando González", "Rosa Pérez", "Cristian Cano", "Nora Noche", "Frida Serrano"]],
  ["permiso", 5, ["Elena Mora", "Bruno Ríos", "Diego León", "Gil Prueba", "Lucía Torres"]],
  ["saldran_tarde", 2, ["Mónica Ruiz", "Mario Gómez"]],
  ["jornada", 11, ["Ana López", "Sergio Vela", ...PACOS, "Valeria Castillo", "Jesús Guzmán"]],
  ["proximos", 1, ["Beto Ruiz"]],
  ["salieron", 1, ["Sofía Méndez"]],
];
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
    ["Ya salieron 4 3 salió antes", false],
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
  // Iconos lucide de los desplegables (svg) en los contadores.
  assert.equal(await grupo.locator("[data-contador] svg").count(), 7);

  // ——— Tabla (vista por defecto) ———
  assert.deepEqual(
    (await selector(page).getByRole("button").allInnerTexts()).map((x) => x.trim()),
    ["Tabla", "Línea del día"]
  );
  assert.equal((await vistaElegida(page)).trim(), "Tabla");
  const tabla = tablaDe(page);
  // Tabla semántica: encabezados de columna, encabezados de grupo (rowgroup) y nombre de cada renglón (rowheader).
  assert.deepEqual(
    (await tabla.getByRole("columnheader").allInnerTexts()).map((x) => x.trim()),
    ["Persona", "Horario", "Entrada", "Qué pasa", "Jornada", "Editado", "Abrir día"]
  );
  // Columna «Editado» (como en Asistencias): «Sí» en quien se corrigió, «No» en los demás.
  assert.equal((await tabla.locator('tr[data-persona="Rosa Pérez"] [data-editado]').innerText()).trim(), "Sí");
  assert.equal((await tabla.locator('tr[data-persona="Armando González"] [data-editado]').innerText()).trim(), "No");
  assert.equal(await tabla.locator("thead th").last().locator(".sr-only").count(), 1, "«Abrir día» solo para lector de pantalla");
  assert.deepEqual(await grupos(tabla), GRUPOS);
  assert.deepEqual(await tituloGrupos(tabla), [
    "Requiere atención · 6",
    "Con permiso / descanso · 5",
    "Saldrán tarde / hora extra · 2",
    "En jornada · 11",
    "Por entrar · 1",
    "Ya salieron · 1",
  ]);
  assert.equal(await tabla.getByRole("rowheader", { name: /Frida Serrano/ }).count(), 1);
  // Horario | entrada | qué pasa (una frase y, a lo más, un chip).
  const esperados = {
    "Alondra Munguía": "7:00 a.m.–2:00 p.m. | —Sin entrada | Faltó · sin checadas a media jornada",
    "Armando González": "9:00 a.m.–6:00 p.m. | —Sin entrada | No ha llegado · debía entrar hace 2 h 12 min | Debe 1 h 30 min",
    "Rosa Pérez": "7:00 a.m.–3:00 p.m. | Checó 7:00 a.m. → 10:30 a.m. | Salió antes · 10:30 a.m. · faltaron 4 h 30 min",
    "Cristian Cano": "8:00 a.m.–5:00 p.m. | Entró 8:00 a.m. | En comida 67 de 60 min",
    "Nora Noche": "10:00 p.m.–6:00 a.m. | Entró 10:05 p.m. | Sin checar salida · debía salir hace 5 h 12 min",
    "Frida Serrano": "9:00 a.m.–6:00 p.m. | Entró 9:18 a.m. | Llegó 18 min tarde",
    "Elena Mora": "9:00 a.m.–6:00 p.m. | Entró 10:40 a.m. | Permiso para llegar a las 10:30 a.m.",
    "Bruno Ríos": "8:00 a.m.–5:00 p.m. | Checó 7:58 a.m. → 10:00 a.m. | Permiso 10:00 a.m.–12:00 p.m. · cita médica · salió 10:00 a.m.",
    "Diego León": "12:00 a.m.–8:00 a.m. | Checó 12:16 a.m. → 7:23 a.m. | Permiso para salir a las 7:00 a.m. · salió 7:23 a.m. | Llegó tarde +16 min",
    "Lucía Torres": "Sin horario hoy | —Sin entrada | Vacaciones",
    "Gil Prueba": "Sin horario hoy | —Sin entrada | Día de Descanso",
    "Mónica Ruiz": "5:00 a.m.–11:00 a.m. | Entró 4:58 a.m. | En hora extra desde 11:00 a.m.",
    "Mario Gómez": "8:00 a.m.–5:00 p.m. | Entró 7:51 a.m. | Saldrá 8:00 p.m. · 3 h extra · inventario",
    "Jesús Guzmán": "9:00 a.m.–6:00 p.m. | Entró 8:56 a.m. | A tiempo",
    "Ana López": "8:00 a.m.–5:00 p.m. | Entró 8:00 a.m. | En comida 12 de 60 min",
    "Beto Ruiz": "12:00 p.m.–8:00 p.m. | —Sin entrada | Entra 12:00 p.m. · en 48 min",
    "Sofía Méndez": "6:00 a.m.–11:00 a.m. | Checó 5:55 a.m. → 11:02 a.m. | Salió 11:02 a.m.",
  };
  for (const [nombre, texto] of Object.entries(esperados)) assert.equal(await textoRenglon(tabla, nombre), texto, nombre);
  // Nunca más de un chip secundario; la entrada tarde en naranja.
  assert.ok((await tabla.locator("[data-persona]").evaluateAll((ps) => ps.every((p) => p.querySelectorAll("[data-chip-extra]").length <= 1))));
  assert.equal(
    await renglonDe(tabla, "Frida Serrano").locator("[data-entrada] .text-orange-800").textContent(),
    "9:18 a.m.",
    "entrada tarde en naranja"
  );
  // Jornada: texto y barra en quien trabaja, comió o salió; nada en quien no ha llegado o no labora.
  assert.equal(await limpio(renglonDe(tabla, "Frida Serrano").locator("[data-jornada]")), "1 h 54 de 8 h");
  assert.equal(await renglonDe(tabla, "Frida Serrano").getByRole("progressbar").getAttribute("aria-valuenow"), "24");
  assert.equal(await renglonDe(tabla, "Armando González").getByRole("progressbar").count(), 0);
  assert.equal(await renglonDe(tabla, "Lucía Torres").getByRole("progressbar").count(), 0);
  // Texto ≥ 13 px en los renglones (salvo las iniciales del avatar, decorativas) y horas con cifras tabulares.
  const chicos = await tabla.locator("[data-persona]").evaluateAll((ps) =>
    ps.flatMap((p) =>
      [...p.querySelectorAll("*")]
        .filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
        .filter((e) => !e.closest("[aria-hidden=true]") && !e.closest(".sr-only"))
        .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 13)
        .map((e) => `${p.dataset.persona}: ${e.textContent}`)
    )
  );
  assert.deepEqual(chicos, [], "texto ≥ 13 px");
  assert.equal(
    await renglonDe(tabla, "Frida Serrano").locator("[data-entrada]").evaluate((e) => getComputedStyle(e).fontVariantNumeric),
    "tabular-nums"
  );
  if (capturas) {
    await dormir(300);
    await page.screenshot({ path: `${capturas}/monitor-tabla-1440.png`, fullPage: true });
  }
  // Renglones compactos (una o dos líneas) y nada fuera de su renglón.
  const altos = await tabla.locator("[data-persona]").evaluateAll((ps) => ps.map((p) => Math.round(p.getBoundingClientRect().height)));
  assert.ok(
    // Hasta 3 líneas: la frase más larga (permiso + hora de salida) con su chip, ya con la columna «Editado».
    altos.every((h) => h >= 44 && h <= 100),
    `renglones compactos: ${altos.join(",")}`
  );
  assert.deepEqual(await fueraDeFila(tabla), [], "renglones sin desborde a 1440");
  assert.ok(await sinDesborde(page), "Monitor 1440 sin desborde");

  // Contador = filtro: «No han llegado» → solo esas personas (un grupo); otra vez → todos.
  await contador(vista, "No han llegado").click();
  assert.equal(await contador(vista, "No han llegado").getAttribute("aria-pressed"), "true");
  assert.deepEqual(await grupos(tabla), [["atencion", 2, ["Alondra Munguía", "Armando González"]]]);
  assert.match(await limpio(vista.locator("[data-filtro]")), /^Filtrando: No han llegado · toca de nuevo la tarjeta para quitarlo/);
  if (capturas) await page.screenshot({ path: `${capturas}/monitor-tabla-1440-filtro.png` });
  await contador(vista, "Llegaron tarde").click();
  assert.deepEqual(
    (await grupos(tabla)).map(([g, n, p]) => [g, n, p]),
    [
      ["atencion", 1, ["Frida Serrano"]],
      ["permiso", 2, ["Elena Mora", "Diego León"]],
    ]
  );
  await contador(vista, "Llegaron tarde").click();
  assert.equal(await contador(vista, "Llegaron tarde").getAttribute("aria-pressed"), "false");
  assert.match(await limpio(vista.locator("[data-filtro]")), /^26 personas hoy$/);
  await contador(vista, "Con permiso / día").click();
  assert.deepEqual(await grupos(tabla), [["permiso", 5, ["Elena Mora", "Bruno Ríos", "Diego León", "Gil Prueba", "Lucía Torres"]]]);
  await vista.getByRole("button", { name: "ver todos" }).click();
  assert.equal(await contador(vista, "Con permiso / día").getAttribute("aria-pressed"), "false");
  // Búsqueda y área (en pantalla); los contadores cuentan con el filtro de área.
  await vista.getByLabel("Buscar empleado").fill("gonza");
  assert.deepEqual(await grupos(tabla), [["atencion", 1, ["Armando González"]]]);
  await vista.getByLabel("Buscar empleado").fill("nadie así");
  assert.match(await limpio(vista), /Nadie coincide con la búsqueda\./);
  await vista.getByLabel("Buscar empleado").fill("");
  await vista.getByLabel("Área").selectOption("Marketing");
  assert.equal(await cuentaDe(vista, "Trabajando"), 2, "los contadores cuentan con el filtro de área");
  assert.deepEqual(await filasDe(tabla), ["Frida Serrano", "Valeria Castillo"]);
  await vista.getByLabel("Área").selectOption("");
  assert.match(await limpio(vista), /Toca una persona para abrir su reloj del día/);

  // Todo el renglón abre el reloj del día (la misma ventana de Asistencias), sin salir del Monitor: clic en su horario.
  const horarioArmando = await renglonDe(tabla, "Armando González").locator("[data-horario]").boundingBox();
  await page.mouse.click(horarioArmando.x + horarioArmando.width / 2, horarioArmando.y + horarioArmando.height / 2);
  await page
    .getByRole("dialog", { name: /Armando González/ })
    .getByRole("button", { name: "Cargar su horario normal" })
    .waitFor({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
  assert.match(page.url(), /\/panel\/monitor$/);
  // Con teclado: el botón del renglón (nombre accesible con su situación) abre el día con Enter.
  const botonRosa = tabla.getByRole("button", { name: /^Ver día de Rosa Pérez · Salió antes/ });
  await botonRosa.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog", { name: /Rosa Pérez/ }).waitFor({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });

  // ——— Línea del día ———
  await elegirVista(page, "Línea del día");
  const linea = vista.getByRole("region", { name: "Línea del día" });
  await linea.waitFor();
  assert.equal(await tablaDe(page).count(), 0, "la Tabla se oculta");
  assert.deepEqual(await filasDe(linea), URGENCIA, "filas en el orden de urgencia");
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

  // La elección se recuerda al recargar (por usuario, en localStorage); de vuelta a la Tabla.
  await page.reload({ waitUntil: "domcontentloaded" });
  await vista.getByRole("region", { name: "Línea del día" }).waitFor({ timeout: 30000 });
  assert.equal((await vistaElegida(page)).trim(), "Línea del día");
  assert.equal(await page.evaluate(() => localStorage.getItem("adamia.monitor.vista.-1")), "linea");
  await elegirVista(page, "Tabla");
  await tablaDe(page).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("adamia.monitor.vista.-1")), "tabla");

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
    ["Registros", "Horas de ley", "Horas por reponer"]
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
  // Guardó «tablero» (vista retirada) antes de este cambio: abre la Tabla sin error.
  const movil = await contexto({ width: 390, height: 844 }, "tablero");
  const m = movil.page;
  const vistaM = await abrirMonitor(m);
  await tablaDe(m).waitFor();
  assert.equal((await vistaElegida(m)).trim(), "Tabla", "«tablero» guardado → Tabla");
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
  // Tabla en celular: tarjetas bajo los mismos encabezados de grupo, a todo el ancho, sin desplazamiento lateral.
  const tablaM = tablaDe(m);
  assert.deepEqual(await grupos(tablaM), GRUPOS);
  assert.equal(await tablaM.locator("thead").evaluate((e) => getComputedStyle(e).display), "none", "sin encabezados de columna");
  assert.equal(await tablaM.locator("th[scope=rowgroup]").first().isVisible(), true, "encabezados de grupo visibles");
  assert.ok(await tablaM.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), "sin desplazamiento lateral en la tabla");
  // Tarjetas tocables ≥ 44 px y sin desbordes (ningún texto sale de su tarjeta).
  const tarjetasM = await tablaM.locator("[data-persona]").evaluateAll((ps) =>
    ps.map((p) => {
      const r = p.getBoundingClientRect();
      const fuera = [...p.querySelectorAll("*")].some((e) => {
        const q = e.getBoundingClientRect();
        return q.width && (q.right > r.right + 1 || q.left < r.left - 1) && !e.parentElement.closest(".truncate");
      });
      const b = p.querySelector("button[aria-label^='Ver día']").getBoundingClientRect();
      return { n: p.dataset.persona, h: Math.round(r.height), w: Math.round(r.width), fuera, boton: [Math.round(b.width), Math.round(b.height)] };
    })
  );
  assert.equal(tarjetasM.length, 26);
  for (const x of tarjetasM)
    assert.ok(x.h >= 44 && x.w >= 340 && x.boton[0] >= 340 && x.boton[1] >= 44 && !x.fuera, `tarjeta ${JSON.stringify(x)}`);
  // Nombre arriba; qué pasa; horario · entrada abajo.
  const orden = await renglonDe(tablaM, "Frida Serrano").evaluate((tr) =>
    ["[data-nombre]", "[data-frase]", "[data-horario]", "[data-entrada]"].map((q) => Math.round(tr.querySelector(q).getBoundingClientRect().top))
  );
  assert.ok(orden[0] < orden[1] && orden[1] < orden[2] && orden[2] === orden[3], `orden en la tarjeta: ${orden}`);
  assert.equal(await limpio(renglonDe(tablaM, "Frida Serrano").locator("[data-entrada]")), "Entró 9:18 a.m.");
  assert.equal(await renglonDe(tablaM, "Armando González").locator("[data-entrada]").isVisible(), false, "sin entrada: no se muestra");
  assert.equal(await limpio(renglonDe(tablaM, "Rosa Pérez").locator("[data-entrada]")), "Checó 7:00 a.m. → 10:30 a.m.");
  assert.equal(await renglonDe(tablaM, "Armando González").locator("[data-jornada]").isVisible(), false, "jornada solo en escritorio");
  if (capturas) await m.screenshot({ path: `${capturas}/monitor-tabla-390.png` });
  const verDia = tablaM.getByRole("button", { name: /^Ver día de Alondra Munguía/ });
  await verDia.tap();
  await m.getByRole("dialog", { name: /Alondra Munguía/ }).waitFor({ timeout: 15000 });
  await m.keyboard.press("Escape");
  await m.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
  assert.ok(await sinDesborde(m), "sin desborde tras abrir/cerrar el día");
  // Tocar la tarjeta en su texto (no en el nombre) también abre el día.
  await renglonDe(tablaM, "Beto Ruiz").scrollIntoViewIfNeeded();
  const fraseBeto = await renglonDe(tablaM, "Beto Ruiz").locator("[data-frase]").boundingBox();
  await m.touchscreen.tap(fraseBeto.x + fraseBeto.width / 2, fraseBeto.y + fraseBeto.height / 2);
  await m.getByRole("dialog", { name: /Beto Ruiz/ }).waitFor({ timeout: 15000 });
  await m.keyboard.press("Escape");
  await m.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
  // Filtro en celular: «En comida» → Cristian (se pasó) en atención y Ana en jornada.
  await contador(vistaM, "En comida").tap();
  assert.deepEqual(await grupos(tablaM), [
    ["atencion", 1, ["Cristian Cano"]],
    ["jornada", 1, ["Ana López"]],
  ]);
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

  // Asistencias en celular: Registros › Lista | Matriz y los filtros de siempre.
  await m.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await m.getByRole("heading", { name: "Asistencia", exact: true }).waitFor({ timeout: 30000 });
  assert.deepEqual(
    (await m.getByRole("tab").allInnerTexts()).map((x) => x.trim()),
    ["Registros", "Horas de ley", "Horas por reponer"]
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
    // Guardó «lista» (vista retirada): abre la Tabla. Página completa en celular de la Tabla y de la Línea.
    const largo = await contexto({ width: 390, height: 1900 }, "lista");
    await abrirMonitor(largo.page);
    await tablaDe(largo.page).waitFor();
    assert.equal((await vistaElegida(largo.page)).trim(), "Tabla", "«lista» guardada → Tabla");
    await dormir(300);
    await largo.page.screenshot({ path: `${capturas}/monitor-tabla-390-completo.png`, fullPage: true });
    await selector(largo.page).getByRole("button", { name: "Línea del día", exact: true }).click();
    await dormir(400);
    await largo.page.screenshot({ path: `${capturas}/monitor-linea-390-completo.png`, fullPage: true });
    await largo.ctx.close();
  }

  assert.deepEqual(errores, []);
  exito = true;
  console.log(
    "OK Monitor: /panel/monitor, menú, 7 contadores con pie y alerta roja, contador = filtro (otra vez lo quita), " +
      "Tabla por defecto (encabezados de columna, 6 grupos con su número, horario, entrada → salida, una frase y a lo más un chip, " +
      "jornada con barra, texto ≥ 13 px, renglón entero → reloj del día con clic y teclado), búsqueda y área, " +
      "Reloj checador (escritorio y celular 44 px) → reloj de la empresa, Asistencias en Registros › Tabla sin «En vivo», ?vista=envivo → Monitor, " +
      "celular: tarjetas bajo los mismos grupos (≥ 44 px, sin desplazamiento lateral), Tabla | Matriz, " +
      "selector Tabla | Línea del día recordado al recargar, «tablero»/«lista» guardados → Tabla, Línea (programada, tramos y ahora " +
      "en su hora; nombre fijo y eje desplazable en celular), sin desborde a 1440 y 390, sin errores de JS"
  );
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
