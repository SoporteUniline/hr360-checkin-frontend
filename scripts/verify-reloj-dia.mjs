// Verificación en navegador real (Chromium + Next compilado) de «el día se corrige en el reloj» en Asistencias:
// tabla con sus columnas y ocultar columnas; estado en la fila (falta justificada pide motivo); «Sí vino» abre el reloj y
// carga el horario; editar una hora exige motivo; separar la extra exige quién autoriza; PUT con el cuerpo exacto del
// contrato; errores 400 por renglón; festivo/domingo solo lectura; masivos «Marcar como…» y «Cargar horario normal…»;
// sin «Registrar asistencia masiva»; «Control de horas extra» fuera del menú y su ruta lleva a Asistencias con aviso;
// 1440 y 390 px sin desbordes ni textos recortados (selects y celdas); sin errores de JS.
// Backend simulado con page.route; ninguna petición sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-reloj-dia.mjs
// CAPTURAS=<carpeta> guarda capturas a 1440 y 390 (tabla, modal, modal vacío, móvil).
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
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const capturas = process.env.CAPTURAS;

function token() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Méndez", id_empleado: 7, empresas: [10],
  empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

const F = "2026-11-23";
const NORMAL = { tipo: "normal", nombre: "Día normal", pago: "" };
const fila = (id, nombre, apellido, depto, o = {}) => ({
  id, id_empleado: id, id_empresa: 10, nombre, apellido_paterno: apellido, departamento: depto, fecha: F, zona_horaria: "America/Mexico_City",
  hora_entrada_programada: "09:00:00", hora_salida_programada: "16:00:00", hora_salida_comida_programada: "13:00:00",
  hora_regreso_comida_programada: "14:00:00", tipo_registro_nombre: "Asistencia", id_tipo_permiso: 1, asistencia: 1, goce_sueldo: 1,
  entrada: null, salida: null, dia: NORMAL, checadas_vivas: 0, minutos_trabajados: null, minutos_comida: null, minutos_extra: 0,
  minutos_extra_por_autorizar: 0, motivos_resumen: "", estadoAsistencia: "Presente", ...o,
});
const filas = () => [
  fila(501, "Alondra", "Munguía", "Ventas", { entrada: `${F} 09:18:00`, salida: `${F} 16:08:00`, checadas_vivas: 3, minutos_trabajados: 370,
    minutos_comida: 40, estado_calculado: { clave: "retardo", texto: "Retardo +18 min" }, motivos_resumen: "1 corregido en reloj · Laura M." }),
  fila(502, "Armando", "González", "Contaduría", { id_tipo_permiso: 2, tipo_registro_nombre: "Falta injustificada", asistencia: 0,
    estado_calculado: { clave: "falta", texto: "Falta injustificada" }, estadoAsistencia: "Ausente" }),
  fila(503, "Juan", "Pérez", "Producción", { id_tipo_permiso: 2, tipo_registro_nombre: "Falta injustificada", asistencia: 0,
    estado_calculado: { clave: "falta", texto: "Falta injustificada" }, estadoAsistencia: "Ausente" }),
  fila(504, "Mario", "Gómez", "Almacén", { hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00",
    entrada: `${F} 07:51:00`, salida: `${F} 20:02:00`, checadas_vivas: 3, minutos_trabajados: 480, minutos_comida: 60, minutos_extra: 182,
    minutos_extra_por_autorizar: 182, estado_calculado: { clave: "asistio", texto: "Asistió" } }),
  fila(505, "Pedro", "Salas", "Almacén", { fecha: "2026-11-16", entrada: "2026-11-16 08:00:00", salida: "2026-11-16 17:00:00", checadas_vivas: 1,
    hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00", minutos_trabajados: 480, minutos_comida: 60,
    dia: { tipo: "festivo_oficial", nombre: "Festivo oficial", pago: "Salario doble además del día (art. 75)" },
    estado_calculado: { clave: "asistio", texto: "Asistió" } }),
  fila(506, "Sofía", "Ramos", "Tienda", { fecha: "2026-11-22", entrada: "2026-11-22 08:58:00", salida: "2026-11-22 14:03:00", checadas_vivas: 1,
    hora_salida_programada: "14:00:00", hora_salida_comida_programada: null, hora_regreso_comida_programada: null, minutos_trabajados: 305,
    dia: { tipo: "domingo", nombre: "Domingo", pago: "Prima dominical 25% (art. 71)" }, estado_calculado: { clave: "asistio", texto: "Asistió" } }),
  fila(507, "Diego", "León", "Administración", { entrada: `${F} 08:55:00`, checadas_vivas: 1, estado_calculado: { clave: "sin_salida", texto: "Sin salida" } }),
];
const tiposPermiso = [
  { id: 1, nombre: "Asistencia", cuenta_como_asistencia: 1 }, { id: 2, nombre: "Falta injustificada", cuenta_como_asistencia: 0 },
  { id: 3, nombre: "Falta justificada", cuenta_como_asistencia: 0 }, { id: 4, nombre: "Incapacidad IMSS", cuenta_como_asistencia: 0 },
  { id: 5, nombre: "Día de descanso", cuenta_como_asistencia: 0 }, { id: 6, nombre: "Vacaciones", cuenta_como_asistencia: 0 },
];
const motivos = {
  permisos: [{ clave: "tp:31", nombre: "Permiso: entrada tarde" }, { clave: "tp:32", nombre: "Permiso: salida antes" }],
  correccion: [{ clave: "olvido", nombre: "Olvidó checar" }, { clave: "reloj", nombre: "Falla del reloj" }, { clave: "captura", nombre: "Error de captura" },
    { clave: "fuera", nombre: "Trabajó fuera de la sucursal" }, { clave: "duplicada", nombre: "Checada duplicada" }],
};
const autorizadores = [{ id: 3, nombre: "Laura Méndez (RH)" }, { id: 9, nombre: "Carlos Ruiz (jefe)" }];
const chec = (id, e, s, o = {}) => ({ id, entrada: e, salida: s, entrada_reloj: e, salida_reloj: s, concepto: "jornada", motivo: null,
  origen: "reloj", anulado: false, id_autoriza: null, autoriza_no: false, ...o });
const relojes = {
  501: { horario: { entrada: "09:00", salida: "16:00", salida_comida: "13:00", regreso_comida: "14:00" },
    registros: [chec(7001, `${F} 09:18:00`, `${F} 13:00:00`), chec(7002, `${F} 13:00:00`, `${F} 13:40:00`, { concepto: "comida" }), chec(7003, `${F} 13:40:00`, `${F} 16:08:00`)] },
  502: { horario: { entrada: "09:00", salida: "16:00", salida_comida: "13:00", regreso_comida: "14:00" }, registros: [] },
  504: { horario: { entrada: "08:00", salida: "17:00", salida_comida: "13:00", regreso_comida: "14:00" },
    registros: [chec(7101, `${F} 07:51:00`, `${F} 13:00:00`), chec(7102, `${F} 13:00:00`, `${F} 14:00:00`, { concepto: "comida" }), chec(7103, `${F} 14:00:00`, `${F} 20:02:00`)] },
  505: { horario: { entrada: "08:00", salida: "17:00", salida_comida: null, regreso_comida: null },
    dia: { tipo: "festivo_oficial", nombre: "Festivo oficial", pago: "Salario doble además del día (art. 75)" },
    registros: [chec(7201, "2026-11-16 08:00:00", "2026-11-16 17:00:00")] },
  506: { horario: { entrada: "09:00", salida: "14:00", salida_comida: null, regreso_comida: null },
    dia: { tipo: "domingo", nombre: "Domingo", pago: "Prima dominical 25% (art. 71)" }, registros: [chec(7301, "2026-11-22 08:58:00", "2026-11-22 14:03:00")] },
};

const pet = { reloj: [], estado: [], masivo: [] };
let rechazarArmando = true;
const errores = [];
let exito = false;
const browser = await chromium.launch();

async function simular(page) {
  page.on("pageerror", (e) => errores.push(e.message));
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": base,
      "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    const cuerpo = () => JSON.parse(req.postData() || "{}");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/tiposPermiso")) return json({ tiposPermiso });
    if (p.endsWith("/checador/empleados")) return json({ data: [{ id_empleado: 7, nombre: "Laura", apellido_paterno: "Méndez" }], total: 1 });
    if (p.endsWith("/checador/asistencias") && req.method() === "GET") {
      const regs = filas();
      return json({ registros: regs, total: regs.length, page: 1, aplicarPaginacion: true });
    }
    let m = /\/checador\/asistencias\/(\d+)\/reloj$/.exec(p);
    if (m) {
      const idA = Number(m[1]);
      const f = filas().find((x) => x.id === idA);
      if (req.method() === "PUT") {
        const c = cuerpo();
        pet.reloj.push({ id: idA, cuerpo: c });
        if (idA === 502 && rechazarArmando) {
          rechazarArmando = false;
          return json({ error: "Revisa los registros marcados.", errores: [{ indice: 1, error: "La comida no puede empezar antes de las 13:30 (regla del servidor)." }] }, 400);
        }
        return json({ ok: true, asistencia: { ...f, checadas_vivas: c.registros.filter((r) => !r.anulado).length } });
      }
      const r = relojes[idA] ?? { horario: relojes[502].horario, registros: [] };
      return json({ ok: true, asistencia: { id: idA, id_empleado: idA, nombre: `${f.nombre} ${f.apellido_paterno}`, departamento: f.departamento, fecha: f.fecha },
        horario: r.horario, dia: r.dia ?? NORMAL, registros: r.registros, motivos, autorizadores });
    }
    m = /\/checador\/asistencias\/(\d+)\/estado-dia$/.exec(p);
    if (m && req.method() === "PUT") {
      pet.estado.push({ id: Number(m[1]), cuerpo: cuerpo() });
      return json({ ok: true, asistencia: filas().find((x) => x.id === Number(m[1])) });
    }
    m = /\/checador\/asistencias\/masivo\/(estado-dia|horario-normal)$/.exec(p);
    if (m && req.method() === "POST") {
      const c = cuerpo();
      pet.masivo.push({ ruta: m[1], cuerpo: c });
      return json({ ok: true, aplicados: c.ids.length, omitidos: [] });
    }
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
}

// Texto visible de cada select cabe en su caja (sin «Motivo (opci…»); también la opción más larga de los motivos.
async function selectsSinRecorte(raiz, etiqueta) {
  const malos = await raiz.evaluate((el) => {
    const ctx = document.createElement("canvas").getContext("2d");
    const out = [];
    for (const s of el.querySelectorAll("select")) {
      if (!s.offsetParent) continue;
      const cs = getComputedStyle(s);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const libre = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 18;
      const textos = [s.options[s.selectedIndex]?.text ?? ""];
      if (s.getAttribute("aria-label") === "Motivo") textos.push(...[...s.options].map((o) => o.text));
      for (const t of textos) if (ctx.measureText(t).width > libre) out.push(`${s.getAttribute("aria-label")}: «${t}» (${Math.round(ctx.measureText(t).width)} > ${Math.round(libre)})`);
    }
    return out;
  });
  assert.deepEqual(malos, [], `${etiqueta}: selects con texto recortado`);
}
async function sinDesborde(loc, etiqueta) {
  const sobra = await loc.evaluate((el) => el.scrollWidth - el.clientWidth);
  assert.ok(sobra <= 1, `${etiqueta}: desplazamiento horizontal (${sobra}px)`);
}
async function esperar(cond, texto) {
  for (let i = 0; i < 80; i++) { if (cond()) return; await dormir(100); }
  throw new Error(`No llegó: ${texto}`);
}

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  await ctx.addCookies([{ name: "token", value: token(), url: base }]);
  const page = await ctx.newPage();
  await simular(page);

  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Registros" }).click();
  const filaDe = (n) => page.locator("tr", { hasText: n }).first();
  await filaDe("Alondra Munguía").waitFor({ timeout: 30000 });

  // 1) Tabla: columnas del reloj; sin Tipo/Editado/pagos editables; sin «Registrar asistencia masiva»; menú sin «Control de horas extra».
  const encabezados = (await page.locator("thead th").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim().toUpperCase());
  for (const c of ["EMPLEADO", "DEPARTAMENTO", "FECHA", "ENTRADA", "SALIDA", "TRABAJADAS", "COMIDA", "HORAS EXTRA", "DÍA", "ESTADO · MOTIVO", "RELOJ"]) {
    assert.ok(encabezados.some((h) => h.startsWith(c)), `falta la columna ${c}: ${encabezados.join(" | ")}`);
  }
  for (const c of ["TIPO", "EDITADO", "PAGO TRIPLE", "PRIMA DOM.", "% FESTIVO", "HRS COMIDA", "¿AUTORIZAR?"]) assert.ok(!encabezados.includes(c), `sobra ${c}`);
  assert.equal(await page.getByRole("button", { name: /Registrar asistencia masiva/ }).count(), 0, "sin «Registrar asistencia masiva»");
  assert.equal(await page.locator("[data-sidebar=menu-button]", { hasText: "Control de horas extra" }).count(), 0, "fuera del menú");
  assert.match(await filaDe("Alondra Munguía").innerText(), /6 h 10 min[\s\S]*de 6 h programado[\s\S]*Retardo \+18 min[\s\S]*1 corregido en reloj · Laura M\./);
  assert.match(await filaDe("Pedro Salas").innerText(), /Festivo oficial[\s\S]*Salario doble además del día \(art\. 75\)/);
  assert.match(await filaDe("Sofía Ramos").innerText(), /Domingo[\s\S]*Prima dominical 25% \(art\. 71\)/);
  assert.equal(await filaDe("Pedro Salas").locator("td", { hasText: "Festivo oficial" }).locator("input,select").count(), 0, "festivo solo lectura");
  assert.equal(await filaDe("Alondra Munguía").locator("select").count(), 0, "con checadas el estado es solo lectura");
  await sinDesborde(page.locator("html"), "página 1440");
  const celdasCortadas = await page.locator("tbody").evaluate((tb) => [...tb.querySelectorAll("td")].filter((td) => td.scrollWidth > td.clientWidth + 1).map((td) => td.innerText.slice(0, 40)));
  assert.deepEqual(celdasCortadas, [], "celdas sin texto recortado");
  await selectsSinRecorte(page.locator("tbody"), "tabla 1440");
  if (capturas) { await dormir(400); await page.screenshot({ path: `${capturas}/1440-tabla.png` }); }

  // 2) Ocultar columnas con el selector existente (se guarda).
  await page.getByRole("button", { name: /Columnas/ }).click();
  await page.getByRole("checkbox", { name: "Comida" }).click();
  await page.keyboard.press("Escape");
  await esperar(() => true, "");
  const sinComida = (await page.locator("thead th").allInnerTexts()).map((t) => t.trim().toUpperCase());
  assert.ok(!sinComida.includes("COMIDA"), "Comida oculta");
  assert.ok(!JSON.parse(await page.evaluate(() => localStorage.getItem("asistencias-columnas-visibles"))).includes("comida"), "preferencia guardada");

  // 3) Estado en la fila: «Falta justificada» pide motivo (OK bloqueado hasta escribirlo); «Día de descanso» se guarda directo.
  await page.getByLabel("Estado de Juan Pérez").selectOption("3");
  const motivoJuan = filaDe("Juan Pérez").getByLabel("Motivo (obligatorio)");
  await motivoJuan.waitFor();
  assert.equal(await filaDe("Juan Pérez").getByRole("button", { name: "OK" }).isDisabled(), true);
  await motivoJuan.fill("Cita médica con comprobante");
  await filaDe("Juan Pérez").getByRole("button", { name: "OK" }).click();
  await esperar(() => pet.estado.length === 1, "PUT estado-dia");
  assert.deepEqual(pet.estado[0], { id: 503, cuerpo: { id_tipo_permiso: 3, motivo: "Cita médica con comprobante" } });
  await page.getByLabel("Estado de Armando González").selectOption("5");
  await esperar(() => pet.estado.length === 2, "PUT estado-dia descanso");
  assert.deepEqual(pet.estado[1], { id: 502, cuerpo: { id_tipo_permiso: 5 } });

  // 4) «Sí vino» abre el reloj vacío; «Cargar su horario normal»; 400 del servidor por renglón; luego guarda.
  await page.getByLabel("Estado de Armando González").selectOption("si_vino");
  const dlgA = page.getByRole("dialog", { name: /Armando González/ });
  await dlgA.locator("[data-reloj-vacio]").waitFor({ timeout: 10000 });
  assert.match(await dlgA.locator("[data-reloj-vacio]").innerText(), /No tiene checadas\. ¿De qué hora a qué hora trabajó\?/);
  await dormir(500);
  const cajaA = await dlgA.boundingBox();
  assert.ok(cajaA.width >= 1000 && cajaA.width <= 1080, `modal amplio (${cajaA.width}px)`);
  if (capturas) { await dormir(300); await page.screenshot({ path: `${capturas}/1440-modal-vacio.png` }); }
  await dlgA.getByRole("button", { name: "Cargar su horario normal" }).click();
  assert.equal(await dlgA.locator("[data-renglon]").count(), 3);
  assert.match(await dlgA.locator("[data-calculo]").innerText(), /6 h\b[\s\S]*1 h[\s\S]*Asistió/);
  await dlgA.getByRole("button", { name: "Guardar" }).click();
  await dlgA.locator('[data-renglon="2"] [role=alert]').waitFor({ timeout: 5000 });
  assert.match(await dlgA.locator('[data-renglon="2"] [role=alert]').innerText(), /regla del servidor/);
  assert.deepEqual(pet.reloj[0], { id: 502, cuerpo: { registros: [
    { entrada: `${F} 09:00:00`, salida: `${F} 13:00:00`, concepto: "jornada", motivo: "olvido", anulado: false, id_autoriza: null, autoriza_no: false },
    { entrada: `${F} 13:00:00`, salida: `${F} 14:00:00`, concepto: "comida", motivo: "olvido", anulado: false, id_autoriza: null, autoriza_no: false },
    { entrada: `${F} 14:00:00`, salida: `${F} 16:00:00`, concepto: "jornada", motivo: "olvido", anulado: false, id_autoriza: null, autoriza_no: false },
  ] } });
  await dlgA.getByRole("button", { name: "Guardar" }).click();
  await dlgA.waitFor({ state: "detached", timeout: 10000 });
  assert.equal(pet.reloj.length, 2);

  // 5) Reloj de Alondra (icono): cambiar la entrada exige motivo; motivos y selects sin recortar; PUT exacto.
  await page.getByRole("button", { name: "Abrir el reloj de Alondra Munguía" }).click();
  const dlg = page.getByRole("dialog", { name: /Alondra Munguía/ });
  const r1 = dlg.locator('[data-renglon="1"]');
  await r1.waitFor({ timeout: 10000 });
  assert.match(await dlg.innerText(), /HORARIO DEL DÍA[\s\S]*9:00 a\.m\. – 4:00 p\.m\.[\s\S]*Retardo \+18 min/i);
  await r1.getByLabel("Entrada").fill("09:00");
  assert.equal(await r1.getByRole("alert").innerText(), "Cambiaste la hora: elige el motivo.");
  assert.match(await r1.innerText(), /reloj: 9:18 a\.m\./);
  assert.equal(await dlg.getByRole("button", { name: "Guardar" }).isDisabled(), true, "con errores no se guarda");
  await r1.getByLabel("Motivo").selectOption("olvido");
  assert.equal(await r1.getByRole("alert").count(), 0);
  await dlg.locator('[data-renglon="3"]').getByLabel("Motivo").selectOption("fuera");
  await selectsSinRecorte(dlg, "modal 1440");
  await sinDesborde(dlg.locator(".overflow-y-auto").first(), "modal 1440");
  assert.match(await dlg.locator("[data-estado-calculado]").innerText(), /Asistió/);
  if (capturas) { await dormir(300); await page.screenshot({ path: `${capturas}/1440-modal.png` }); }
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await dlg.waitFor({ state: "detached", timeout: 10000 });
  assert.deepEqual(pet.reloj[2], { id: 501, cuerpo: { registros: [
    { id: 7001, entrada: `${F} 09:00:00`, salida: `${F} 13:00:00`, concepto: "jornada", motivo: "olvido", anulado: false, id_autoriza: null, autoriza_no: false },
    { id: 7002, entrada: `${F} 13:00:00`, salida: `${F} 13:40:00`, concepto: "comida", motivo: null, anulado: false, id_autoriza: null, autoriza_no: false },
    { id: 7003, entrada: `${F} 13:40:00`, salida: `${F} 16:08:00`, concepto: "jornada", motivo: "fuera", anulado: false, id_autoriza: null, autoriza_no: false },
  ] } });

  // 6) Mario: botón morado «por autorizar» → reloj; separar la extra exige quién autoriza.
  await filaDe("Mario Gómez").getByRole("button", { name: "3 h 02 min por autorizar" }).click();
  const dlgM = page.getByRole("dialog", { name: /Mario Gómez/ });
  await dlgM.getByRole("button", { name: "Separar 3 h 02 min después de las 5:00 p.m. como hora extra" }).click();
  const extra = dlgM.locator('[data-renglon="4"]');
  assert.equal(await extra.getByRole("alert").innerText(), "Hora extra: falta quién autoriza.");
  assert.match(await extra.innerText(), /lo decide la ley por semana/);
  assert.equal(await extra.getByText(/dobles|triples|tiempo por tiempo/i).count(), 1, "solo el texto de la ley, sin pedir forma de pago");
  await extra.getByLabel("Quién autoriza").selectOption("3");
  assert.equal(await extra.getByRole("alert").count(), 0);
  await dlgM.getByRole("button", { name: "Guardar" }).click();
  await dlgM.waitFor({ state: "detached", timeout: 10000 });
  assert.deepEqual(pet.reloj[3].cuerpo.registros.slice(2), [
    { id: 7103, entrada: `${F} 14:00:00`, salida: `${F} 17:00:00`, concepto: "jornada", motivo: null, anulado: false, id_autoriza: null, autoriza_no: false },
    { entrada: `${F} 17:00:00`, salida: `${F} 20:02:00`, concepto: "extra", motivo: null, anulado: false, id_autoriza: 3, autoriza_no: false },
  ]);

  // 7) Festivo y domingo: calendario con candado, sin campos.
  for (const [n, txt] of [["Pedro Salas", /Festivo oficial[\s\S]*Salario doble además del día \(art\. 75\)/], ["Sofía Ramos", /Domingo[\s\S]*Prima dominical 25% \(art\. 71\)/]]) {
    await page.getByRole("button", { name: `Abrir el reloj de ${n}` }).click();
    const d = page.getByRole("dialog", { name: new RegExp(n) });
    const cal = d.locator("[data-calendario]");
    await cal.waitFor({ timeout: 10000 });
    assert.match(await cal.innerText(), txt);
    assert.equal(await cal.locator("input,select,button").count(), 0, `${n}: calendario solo lectura`);
    assert.equal(await d.getByText(/Pago triple|Prima dominical %|% día festivo|Hrs comida/).count(), 0);
    await d.getByRole("button", { name: "Cancelar" }).click();
    await d.waitFor({ state: "detached", timeout: 10000 });
  }

  // 8) Masivos: «Marcar como…» (solo sin checadas) y «Cargar horario normal…» (sin checadas o sin salida), motivo obligatorio.
  await page.getByLabel("Elegir a Juan Pérez").check();
  await page.getByLabel("Elegir a Alondra Munguía").check();
  await page.getByRole("button", { name: "Marcar como…" }).click();
  const dm = page.getByRole("dialog", { name: "Marcar como…" });
  assert.match(await dm.locator("[data-masivo-resumen]").innerText(), /Se aplica a 1 de 2 seleccionadas · se omiten 1[\s\S]*Alondra Munguía: tiene checadas/);
  assert.equal(await dm.getByRole("button", { name: "Aplicar a 1" }).isDisabled(), true);
  await dm.getByLabel("Estado para los seleccionados").selectOption("2");
  assert.equal(await dm.getByRole("button", { name: "Aplicar a 1" }).isDisabled(), true, "motivo obligatorio");
  await dm.getByLabel("Motivo (obligatorio)").fill("No se presentó");
  await dm.getByRole("button", { name: "Aplicar a 1" }).click();
  await esperar(() => pet.masivo.length === 1, "POST masivo estado");
  assert.deepEqual(pet.masivo[0], { ruta: "estado-dia", cuerpo: { ids: [503], id_tipo_permiso: 2, motivo: "No se presentó" } });
  await dm.waitFor({ state: "detached", timeout: 10000 });
  await page.getByLabel("Elegir a Diego León").check();
  await page.getByLabel("Elegir a Mario Gómez").check();
  await page.getByRole("button", { name: "Cargar horario normal…" }).click();
  const dh = page.getByRole("dialog", { name: "Cargar horario normal" });
  assert.match(await dh.locator("[data-masivo-resumen]").innerText(), /Se aplica a 1 de 2 seleccionadas · se omiten 1/);
  await dh.getByLabel("Motivo (obligatorio)").fill("Falla del reloj de la entrada");
  await dh.getByRole("button", { name: "Aplicar a 1" }).click();
  await esperar(() => pet.masivo.length === 2, "POST masivo horario");
  assert.deepEqual(pet.masivo[1], { ruta: "horario-normal", cuerpo: { ids: [507], motivo: "Falla del reloj de la entrada" } });

  // 9) «Control de horas extra» lleva a Asistencias con aviso corto.
  await page.goto(base + "/panel/horas-extra?semana=2026-11-23&empleado=Mario", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/panel\/registro-asistencia\?aviso=horas-extra/, { timeout: 15000 });
  assert.match(page.url(), /desde=2026-11-23&hasta=2026-11-29/);
  await page.locator("[data-aviso-movido]").waitFor({ timeout: 15000 });

  // 10) Celular 390: detalle con icono de reloj → hoja a pantalla completa con tarjetas; estado en select; sin «Masivo».
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByText("Alondra Munguía").first().waitFor({ timeout: 30000 });
  assert.equal(await page.getByRole("button", { name: /^Masivo$/ }).count(), 0, "sin «Registrar asistencia masiva» en celular");
  if (capturas) { await dormir(400); await page.screenshot({ path: `${capturas}/390-lista.png` }); }
  await page.getByText("Alondra Munguía").first().click();
  await page.getByRole("button", { name: "Abrir el reloj del día" }).first().click();
  const hoja = page.getByRole("dialog", { name: /Alondra Munguía/ });
  await hoja.locator('[data-renglon="1"]').waitFor({ timeout: 15000 });
  await dormir(500); // fin de la animación de entrada (zoom 95 % → 100 %)
  const caja = await hoja.boundingBox();
  assert.ok(caja.width >= 389 && caja.x <= 0.5, `hoja a pantalla completa (${caja.width}px)`);
  await sinDesborde(hoja.locator(".overflow-y-auto").first(), "hoja 390");
  const bajos = await hoja.evaluate((el) => [...el.querySelectorAll("input,select,button")].filter((c) => c.offsetParent)
    .filter((c) => c.getBoundingClientRect().height < 43.5).map((c) => c.getAttribute("aria-label") || c.textContent.trim()));
  assert.deepEqual(bajos, [], "controles de 44 px");
  await selectsSinRecorte(hoja, "hoja 390");
  for (const t of await hoja.locator("[data-renglon]").all()) assert.ok((await t.boundingBox()).width <= 390, "cada checada cabe");
  if (capturas) { await dormir(400); await page.screenshot({ path: `${capturas}/390-modal.png` }); }
  await hoja.getByRole("button", { name: "Cerrar el reloj" }).click();
  await hoja.waitFor({ state: "detached", timeout: 10000 });
  await page.getByText("Armando González").first().click();
  const estadoMovil = page.getByLabel("Estado de Armando González");
  await estadoMovil.waitFor({ timeout: 10000 });
  assert.ok((await estadoMovil.boundingBox()).height >= 43.5, "select de estado de 44 px");
  if (capturas) { await dormir(400); await page.screenshot({ path: `${capturas}/390-detalle-estado.png` }); }
  await estadoMovil.selectOption("si_vino");
  const hojaVacia = page.getByRole("dialog", { name: /Armando González/ });
  await hojaVacia.locator("[data-reloj-vacio]").waitFor({ timeout: 15000 });
  await sinDesborde(hojaVacia.locator(".overflow-y-auto").first(), "hoja vacía 390");
  if (capturas) { await dormir(400); await page.screenshot({ path: `${capturas}/390-modal-vacio.png` }); }

  assert.deepEqual(errores, [], "sin errores de JavaScript");
  exito = true;
  console.log("OK · columnas y ocultar · estado en fila (motivo, directo) · «Sí vino» → reloj vacío → horario normal · 400 por renglón · "
    + "hora editada exige motivo · separar extra exige autoriza · PUT exactos · festivo/domingo solo lectura · masivos · sin «Registrar "
    + "asistencia masiva» · horas-extra → Asistencias con aviso · 1440 y 390 sin desbordes ni recortes · sin errores de JS");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
