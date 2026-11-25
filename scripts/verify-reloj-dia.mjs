// Verificación en navegador real (Chromium + Next compilado) de «el día se corrige en el reloj» en Asistencias:
// tabla con sus columnas y ocultar columnas; estado en la fila («Qué pasó» + «Motivo», verify-quepaso-motivo.mjs); «Asistencia» abre el reloj y
// carga el horario; editar una hora exige motivo; separar la extra exige quién autoriza; PUT con el cuerpo exacto del
// contrato; errores 400 por renglón; festivo/domingo solo lectura; masivos «Marcar como…» y «Cargar horario normal…»;
// sin «Registrar asistencia masiva»; «Control de horas extra» fuera del menú y su ruta lleva a Asistencias con aviso;
// 1440 y 390 px sin desbordes ni textos recortados (selects y celdas); sin errores de JS.
// Backend simulado con page.route; ninguna petición sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-reloj-dia.mjs
// CAPTURAS=<carpeta> guarda capturas a 1440 y 390 (tabla, modal, modal vacío, móvil).
// CAPTURAS_SELECTS=<carpeta> guarda los desplegables ABIERTOS («Qué pasó», «Motivo», Concepto) a 1440 y 390.
// (24/11/2026) Permiso parcial con hora obligatoria (Rosa: Salida temprano; Tomás: Entrada tarde, Salir en medio turno y
// motivo de corrección «Otro»), lib/asistencia/horaPermiso.mjs.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { elegir, textosOpciones, valorDe } from "./lib/desplegable.mjs";

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
const capturasSelects = process.env.CAPTURAS_SELECTS;

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
    minutos_comida: 40, estado_calculado: { clave: "retardo", texto: "Retardo +18 min", atencion: true }, motivos_resumen: "1 corregido en reloj · Laura M.", checadas_corregidas: 1 }),
  fila(502, "Armando", "González", "Contaduría", { id_tipo_permiso: 2, tipo_registro_nombre: "Falta injustificada", asistencia: 0,
    estado_calculado: { clave: "falta", texto: "Falta injustificada", atencion: true }, estadoAsistencia: "Ausente" }),
  fila(503, "Juan", "Pérez", "Producción", { id_tipo_permiso: 2, tipo_registro_nombre: "Falta injustificada", asistencia: 0,
    estado_calculado: { clave: "falta", texto: "Falta injustificada", atencion: true }, estadoAsistencia: "Ausente" }),
  fila(504, "Mario", "Gómez", "Almacén", { hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00",
    entrada: `${F} 07:51:00`, salida: `${F} 20:02:00`, checadas_vivas: 3, minutos_trabajados: 480, minutos_comida: 60, minutos_extra: 0,
    minutos_extra_por_autorizar: 182, estado_calculado: { clave: "ok", texto: "Asistió", atencion: false } }),
  fila(505, "Pedro", "Salas", "Almacén", { fecha: "2026-11-16", entrada: "2026-11-16 08:00:00", salida: "2026-11-16 17:00:00", checadas_vivas: 1,
    hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00", minutos_trabajados: 480, minutos_comida: 60,
    dia: { tipo: "festivo_oficial", nombre: "Festivo oficial", pago: "Salario doble además del día (art. 75)" },
    estado_calculado: { clave: "ok", texto: "Asistió", atencion: false } }),
  fila(506, "Sofía", "Ramos", "Tienda", { fecha: "2026-11-22", entrada: "2026-11-22 08:58:00", salida: "2026-11-22 14:03:00", checadas_vivas: 1,
    hora_salida_programada: "14:00:00", hora_salida_comida_programada: null, hora_regreso_comida_programada: null, minutos_trabajados: 305,
    dia: { tipo: "domingo", nombre: "Domingo", pago: "Prima dominical 25% (art. 71)" }, estado_calculado: { clave: "ok", texto: "Asistió", atencion: false } }),
  fila(507, "Diego", "León", "Administración", { entrada: `${F} 08:55:00`, checadas_vivas: 1, estado_calculado: { clave: "sinsalida", texto: "Sin salida", atencion: true } }),
  fila(508, "Rosa", "Díaz", "Ventas", { entrada: `${F} 09:00:00`, salida: `${F} 16:00:00`, checadas_vivas: 3, minutos_trabajados: 390, minutos_comida: 30,
    hora_salida_comida_programada: "11:00:00", hora_regreso_comida_programada: "11:30:00", estado_calculado: { clave: "ok", texto: "Asistió", atencion: false } }),
  fila(509, "Tomás", "Ruiz", "Ventas", { entrada: `${F} 09:00:00`, salida: `${F} 16:00:00`, checadas_vivas: 1, minutos_trabajados: 420,
    hora_salida_comida_programada: null, hora_regreso_comida_programada: null, estado_calculado: { clave: "ok", texto: "Asistió", atencion: false } }),
  // (25/11/2026) Salió con «Salir a comer» a las 11:21 y regresó 11:46: el reloj dibuja la comida entre los dos tramos.
  fila(510, "Frida", "Serrano", "Ventas", { entrada: `${F} 08:56:00`, salida: null, checadas_vivas: 2, minutos_trabajados: 145, minutos_comida: 25,
    estado_calculado: { clave: "ok", texto: "Asistencia · en jornada", atencion: false } }),
];
const tiposPermiso = [
  // (24/11/2026) «Qué pasó» + «Motivo»: rol y captura del servidor; «Falta justificada» quedó solo para el historial.
  { id: 1, nombre: "Asistencia", cuenta_como_asistencia: 1, rol: "asistencia", captura: 1 }, { id: 2, nombre: "Inasistencia", cuenta_como_asistencia: 0, rol: "inasistencia", captura: 1 },
  { id: 3, nombre: "Falta justificada", cuenta_como_asistencia: 0, goce_sueldo: 0, cambia_al_aplicar: 1, rol: "heredado", captura: 0 },
  { id: 4, nombre: "Incapacidad IMSS", cuenta_como_asistencia: 0, fijo_ley: 1 },
  { id: 5, nombre: "Día de descanso", cuenta_como_asistencia: 0, goce_sueldo: 1, fijo_ley: 1 },
  { id: 6, nombre: "Vacaciones", cuenta_como_asistencia: 0, fijo_ley: 1, descuenta_vacaciones: 1 },
];
// (24/11/2026) Motivos del catálogo «motivos_permiso» (tipos de registro con goce; ver verify-tipos-goce.mjs).
const motivosPermiso = [{ id: 1, nombre: "Visita al médico", global: true }, { id: 2, nombre: "Permiso personal", global: true }, { id: 6, nombre: "Otro", global: true }];
const motivos = {
  permisos: [{ clave: "tp:31", nombre: "Permiso: entrada tarde" }, { clave: "tp:32", nombre: "Permiso: salida antes" }],
  correccion: [{ clave: "olvido", nombre: "Olvidó checar" }, { clave: "reloj", nombre: "Falla del reloj" }, { clave: "captura", nombre: "Error de captura" },
    { clave: "fuera", nombre: "Trabajó fuera de la sucursal" }, { clave: "duplicada", nombre: "Checada duplicada" },
    // (24/11/2026) Claves nuevas del servidor (motivo_correccion VARCHAR(40); «otro: <texto>»).
    { clave: "permiso", nombre: "Por el permiso del día" }, { clave: "remoto", nombre: "Trabajo remoto / home office" },
    { clave: "comision", nombre: "Visita a cliente o comisión" }, { clave: "evento", nombre: "Capacitación o evento externo" },
    { clave: "sin_dispositivo", nombre: "Sin dispositivo o reloj sin conexión" }, { clave: "otro", nombre: "Otro (escribe el motivo)" }],
};
// Tipos parciales del «Permiso del día» (GET /:id/reloj → tipos_parciales).
const parciales = [
  { id: 31, nombre: "Entrada tarde", alcance: "entrada", rol: "entrada", captura: 1, es_permiso: 1 },
  { id: 32, nombre: "Salida temprano", alcance: "salida", rol: "salida", captura: 1, es_permiso: 1 },
  { id: 33, nombre: "Salir en medio turno", alcance: "medio", rol: "medio", captura: 1, es_permiso: 1 },
];
const autorizadores = [{ id: 3, nombre: "Laura Méndez (RH)" }, { id: 9, nombre: "Carlos Ruiz (jefe)" }];
const chec = (id, e, s, o = {}) => ({ id, entrada: e, salida: s, entrada_reloj: e, salida_reloj: s, concepto: "jornada", motivo: null,
  origen: "reloj", anulado: false, id_autoriza: null, autoriza_no: false, ...o });
const relojes = {
  510: { horario: { entrada: "09:00", salida: "16:00", salida_comida: "11:00", regreso_comida: "11:30" },
    registros: [chec(7801, `${F} 08:56:00`, `${F} 11:21:00`, { tipo_cierre: "comida" }), chec(7802, `${F} 11:46:00`, null)] },
  501: { horario: { entrada: "09:00", salida: "16:00", salida_comida: "13:00", regreso_comida: "14:00" },
    registros: [chec(7001, `${F} 09:18:00`, `${F} 13:00:00`), chec(7002, `${F} 13:00:00`, `${F} 13:40:00`, { concepto: "comida" }), chec(7003, `${F} 13:40:00`, `${F} 16:08:00`)] },
  502: { horario: { entrada: "09:00", salida: "16:00", salida_comida: "13:00", regreso_comida: "14:00" }, registros: [] },
  504: { horario: { entrada: "08:00", salida: "17:00", salida_comida: "13:00", regreso_comida: "14:00" },
    registros: [chec(7101, `${F} 07:51:00`, `${F} 13:00:00`), chec(7102, `${F} 13:00:00`, `${F} 14:00:00`, { concepto: "comida" }), chec(7103, `${F} 14:00:00`, `${F} 20:02:00`)] },
  505: { horario: { entrada: "08:00", salida: "17:00", salida_comida: null, regreso_comida: null },
    dia: { tipo: "festivo_oficial", nombre: "Festivo oficial", pago: "Salario doble además del día (art. 75)" },
    registros: [chec(7201, "2026-11-16 08:00:00", "2026-11-16 17:00:00")] },
  508: { horario: { entrada: "09:00", salida: "16:00", salida_comida: "11:00", regreso_comida: "11:30" }, tipos_parciales: parciales,
    registros: [chec(7401, `${F} 09:00:00`, `${F} 11:00:00`), chec(7402, `${F} 11:00:00`, `${F} 11:30:00`, { concepto: "comida" }), chec(7403, `${F} 11:30:00`, `${F} 16:00:00`)] },
  509: { horario: { entrada: "09:00", salida: "16:00", salida_comida: null, regreso_comida: null }, tipos_parciales: parciales,
    registros: [chec(7501, `${F} 09:00:00`, `${F} 16:00:00`)] },
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
    if (p.endsWith("/checador/motivos-permiso")) return json({ ok: true, motivos: motivosPermiso });
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
          return json({ ok: false, error: "Revisa los registros marcados.", errores: [{ indice: 1, error: "La comida no puede empezar antes de las 13:30 (regla del servidor)." }] }, 400);
        }
        return json({ ok: true, asistencia: { ...f, checadas_vivas: c.registros.filter((r) => !r.anulado).length } });
      }
      const r = relojes[idA] ?? { horario: relojes[502].horario, registros: [] };
      return json({ ok: true, asistencia: { id: idA, id_empleado: idA, nombre: `${f.nombre} ${f.apellido_paterno}`, departamento: f.departamento, fecha: f.fecha },
        horario: r.horario, dia: r.dia ?? NORMAL, registros: r.registros, motivos, autorizadores,
        ...(r.tipos_parciales ? { tipos_parciales: r.tipos_parciales, motivos_permiso: motivosPermiso, permiso_dia: null } : {}),
        resumen: { minutos_trabajados: f.minutos_trabajados ?? 0, minutos_comida: f.minutos_comida ?? 0, minutos_extra: f.minutos_extra,
          minutos_extra_por_autorizar: f.minutos_extra_por_autorizar, checadas_vivas: f.checadas_vivas, abierto: f.estado_calculado?.clave === "sinsalida",
          estado: f.estado_calculado, estado_calculado: f.estado_calculado },
        // Sofía: la migración aún no corre en su base → el reloj se ve en solo lectura.
        migracion: idA !== 506 });
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
  // (24/11/2026) Los desplegables son SelectConIconos (combobox de Radix): el texto elegido no debe quedar cortado.
  const malos = await raiz.evaluate((el) => [...el.querySelectorAll("[role=combobox][data-valor]")].filter((c) => c.offsetParent)
    .map((c) => [c.getAttribute("aria-label"), c.querySelector("[data-texto-valor]"), c]).filter(([, t, c]) => t && (t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().bottom > c.getBoundingClientRect().bottom + 1))
    .map(([a, t]) => `${a}: «${t.innerText}» (${t.scrollWidth} > ${t.clientWidth})`));
  assert.deepEqual(malos, [], `${etiqueta}: selects con texto recortado`);
}
async function sinDesborde(loc, etiqueta) {
  const sobra = await loc.evaluate((el) => el.scrollWidth - el.clientWidth);
  assert.ok(sobra <= 1, `${etiqueta}: desplazamiento horizontal (${sobra}px)`);
}
// (25/11/2026) Reloj compacto: el cuerpo del modal no se desplaza (scrollTop 0) y la última fila con su motivo cabe a la vista.
async function compacto(dlg, n, etiqueta) {
  assert.equal(await dlg.locator("[data-renglon]").count(), n, `${etiqueta}: ${n} renglones`);
  const cuerpo = dlg.locator(".overflow-y-auto").first();
  const caja = await cuerpo.evaluate((el) => ({ top: el.scrollTop, abajo: el.getBoundingClientRect().bottom, arriba: el.getBoundingClientRect().top }));
  assert.equal(caja.top, 0, `${etiqueta}: sin desplazar`);
  for (const loc of [dlg.locator(`[data-renglon="${n}"]`), dlg.locator(`[data-renglon="${n}"]`).getByLabel("Motivo")]) {
    const b = await loc.boundingBox();
    assert.ok(b && b.y >= caja.arriba - 1 && b.y + b.height <= caja.abajo + 1, `${etiqueta}: la fila ${n} y su motivo se ven sin scroll (${b?.y + b?.height} > ${caja.abajo})`);
  }
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
  // Encabezados en letra normal en todo el sistema (no MAYÚSCULAS).
  const crudos = (await page.locator("thead th").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
  assert.ok(crudos.includes("Entrada") && crudos.includes("Salida"), `encabezados en letra normal: ${crudos.join(" | ")}`);
  const encabezados = crudos.map((t) => t.toUpperCase());
  for (const c of ["EMPLEADO", "DEPARTAMENTO", "FECHA", "ENTRADA", "SALIDA", "JORNADA TRABAJADO DE PROGRAMADO", "COMIDA", "HORAS EXTRA", "DÍA", "ESTADO", "MOTIVO", "RELOJ"]) {
    assert.ok(encabezados.some((h) => h.startsWith(c)), `falta la columna ${c}: ${encabezados.join(" | ")}`);
  }
  // «Editado» volvió como columna (el dueño la pidió: es clave ver qué y por qué se editó).
  for (const c of ["TIPO", "PAGO TRIPLE", "PRIMA DOM.", "% FESTIVO", "HRS COMIDA", "¿AUTORIZAR?"]) assert.ok(!encabezados.includes(c), `sobra ${c}`);
  assert.equal(await page.getByRole("button", { name: /Registrar asistencia masiva/ }).count(), 0, "sin «Registrar asistencia masiva»");
  assert.equal(await page.locator("[data-sidebar=menu-button]", { hasText: "Control de horas extra" }).count(), 0, "fuera del menú");
  assert.match(await filaDe("Alondra Munguía").innerText(), /6 h 10 min[\s\S]*de 6 h[\s\S]*🕒 Retardo \+18 min[\s\S]*1 corregido en reloj · Laura M\./);
  assert.match(await filaDe("Pedro Salas").innerText(), /Festivo oficial[\s\S]*Salario doble además del día \(art\. 75\)/);
  // «Editado»: «Sí» ámbar que abre «Qué cambió» (checadas corregidas en el reloj); sin editar, «No».
  const siEditado = filaDe("Alondra Munguía").getByRole("button", { name: "Editado: Sí, ver qué cambió" });
  await siEditado.click();
  await page.getByText(/Se corrigió 1 checada del reloj/).waitFor({ timeout: 10000 });
  await page.keyboard.press("Escape");
  assert.equal((await filaDe("Pedro Salas").getByLabel("Sin editar").innerText()).trim(), "No");
  assert.match(await filaDe("Sofía Ramos").innerText(), /Domingo[\s\S]*Prima dominical 25% \(art\. 71\)/);
  assert.equal(await filaDe("Pedro Salas").locator("td", { hasText: "Festivo oficial" }).locator("input,[role=combobox]").count(), 0, "festivo solo lectura");
  assert.equal(await filaDe("Alondra Munguía").getByRole("combobox").count(), 0, "con checadas el estado es solo lectura");
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

  // 3) Estado en la fila: el motivo «Otro…» pide escribirlo; «Día de descanso» (de ley) sin motivo, con OK.
  // (24/11/2026) Juan ya tiene «Inasistencia» (injustificada); se le pone el motivo «Otro…» escrito: OK bloqueado sin el texto.
  const motivoJuan = page.getByLabel("Motivo de Juan Pérez");
  await elegir(motivoJuan, { label: "Otro…" });
  assert.equal(await filaDe("Juan Pérez").getByRole("button", { name: "OK" }).isDisabled(), true);
  await filaDe("Juan Pérez").getByLabel("Escribe el motivo").fill("Cita médica con comprobante");
  await filaDe("Juan Pérez").getByRole("button", { name: "OK" }).click();
  await esperar(() => pet.estado.length === 1, "PUT estado-dia");
  assert.deepEqual(pet.estado[0], { id: 503, cuerpo: { id_tipo_permiso: 2, id_motivo: 6, motivo_permiso: "Cita médica con comprobante", goce: "sin" } });
  await elegir(page.getByLabel("Qué pasó de Armando González"), "5");
  await filaDe("Armando González").getByRole("button", { name: "OK" }).click();
  await esperar(() => pet.estado.length === 2, "PUT estado-dia descanso");
  assert.deepEqual(pet.estado[1], { id: 502, cuerpo: { id_tipo_permiso: 5 } });

  // 4) «Asistencia» abre el reloj vacío; «Cargar su horario normal»; 400 del servidor por renglón; luego guarda.
  await elegir(page.getByLabel("Qué pasó de Armando González"), "__asistencia");
  const dlgA = page.getByRole("dialog", { name: /Armando González/ });
  await dlgA.locator("[data-reloj-vacio]").waitFor({ timeout: 10000 });
  assert.match(await dlgA.locator("[data-reloj-vacio]").innerText(), /No tiene checadas\. ¿De qué hora a qué hora trabajó\?/);
  // Sin checadas, el reloj ofrece el mismo par que la fila: «Qué pasó» con Asistencia, Inasistencia y los días de ley.
  const quePaso = dlgA.locator("[data-reloj-que-paso]");
  // Elegida en la fila, «Asistencia» llega ya puesta en el reloj.
  assert.match(await quePaso.getByRole("combobox").first().innerText(), /Asistencia/, "el reloj conserva «Asistencia» elegida en la fila");
  const opcionesQuePaso = await textosOpciones(quePaso.getByRole("combobox").first());
  assert.ok(opcionesQuePaso.includes("Inasistencia") && opcionesQuePaso.includes("Asistencia") && !opcionesQuePaso.includes("Falta justificada"), `opciones de «Qué pasó»: ${opcionesQuePaso.join(" | ")}`);
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
  // (25/11/2026) Encabezado compacto: fecha · área · jornada · comida en una línea; el estado en la franja de resumen.
  assert.match(await dlg.locator("[data-slot=dialog-description]").innerText(), /^Lun 23\/11\/2026 · Ventas · Jornada 9:00 a\.m\.–4:00 p\.m\. · Comida 1:00–2:00 p\.m\.$/);
  assert.match(await dlg.innerText(), /Jornada 9:00 a\.m\.–4:00 p\.m\.[\s\S]*Retardo \+18 min/);
  assert.equal(await dlg.getByText(/Horario del día|Calendario y pagos|Cálculo automático/i).count(), 0, "sin las cajas de antes");
  assert.match(await dlg.locator("[data-calendario]").innerText(), /^Día normal$/);
  assert.match(await dlg.locator("[data-calendario]").getAttribute("title"), /Lo pone la ley o el catálogo/, "la ayuda del calendario es el título del chip");
  await r1.getByLabel("Entrada").fill("09:00");
  assert.equal(await r1.getByRole("alert").innerText(), "Cambiaste la hora: elige el motivo.");
  assert.match(await r1.innerText(), /reloj: 9:18 a\.m\./);
  assert.equal(await dlg.getByRole("button", { name: "Guardar" }).isDisabled(), true, "con errores no se guarda");
  await elegir(r1.getByLabel("Motivo"), "olvido");
  assert.equal(await r1.getByRole("alert").count(), 0);
  await elegir(dlg.locator('[data-renglon="3"]').getByLabel("Motivo"), "fuera");
  // (24/11/2026) Desplegable propio dentro del diálogo, con teclado: Enter abre, flechas, Enter elige; Esc cierra solo el menú.
  const conc = r1.getByLabel("Concepto");
  const menu = page.locator("[data-select-con-iconos]");
  await conc.focus();
  await page.keyboard.press("Enter");
  await menu.waitFor();
  assert.equal(await menu.evaluate((m) => getComputedStyle(m).backgroundColor), "rgb(255, 255, 255)", "menú de fondo blanco");
  await menu.locator("[role=option]:focus").waitFor(); // el foco entra al menú (dentro del diálogo, sin pelear con su trampa de foco)
  await page.keyboard.press("ArrowDown");
  await menu.locator('[role=option][data-valor="comida"]:focus').waitFor(); // Radix mueve el foco en el siguiente ciclo
  await page.keyboard.press("Enter");
  await menu.waitFor({ state: "detached" });
  assert.equal(await valorDe(conc), "comida", "flecha abajo + Enter elige «Comida»");
  await conc.focus();
  await page.keyboard.press("ArrowDown");
  await menu.waitFor();
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "detached" });
  assert.equal(await dlg.isVisible(), true, "Esc cierra el menú, no el reloj");
  await elegir(conc, "jornada");
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
  await elegir(extra.getByLabel("Quién autoriza"), "3");
  assert.equal(await extra.getByRole("alert").count(), 0);
  if (capturas) { await dormir(300); await page.screenshot({ path: `${capturas}/1440-extra-autorizacion.png` }); }
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
    assert.equal(await cal.locator("input,[role=combobox],button").count(), 0, `${n}: calendario solo lectura`);
    assert.equal(await d.getByText(/Pago triple|Prima dominical %|% día festivo|Hrs comida/).count(), 0);
    if (n === "Sofía Ramos") {
      await d.locator("[data-reloj-solo-lectura]").waitFor();
      assert.equal(await d.getByLabel("Entrada").first().isDisabled(), true, "migración pendiente: solo lectura");
      assert.equal(await d.getByRole("button", { name: "Agregar registro" }).isDisabled(), true);
      assert.equal(await d.getByRole("button", { name: "Guardar" }).isDisabled(), true);
    }
    await d.getByRole("button", { name: "Cancelar" }).click();
    await d.waitFor({ state: "detached", timeout: 10000 });
  }

  // 7b) (24/11/2026) «Si puse salida temprano, tendría que decirme a qué horas»: el tipo parcial exige su hora.
  // Rosa (9:00–4:00, comida 11:00–11:30, checó el día completo): Salida temprano · Permiso personal sin hora → no guarda.
  // (25/11/2026) Reloj compacto: a 1440×900, con 3 renglones, la fila 3 y su motivo se ven sin desplazar el modal.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Abrir el reloj de Rosa Díaz" }).click();
  const dR = page.getByRole("dialog", { name: /Rosa Díaz/ });
  const permR = dR.locator("[data-permiso-dia]");
  await permR.waitFor({ timeout: 10000 });
  await dormir(400); // fin de la animación de entrada
  await compacto(dR, 3, "Rosa 1440×900");
  assert.match(await dR.locator('[data-renglon="2"]').innerText(), /30 min/, "la fila de comida dice su duración");
  assert.match(await dR.locator('[data-renglon="2"]').getAttribute("class"), /bg-amber-50/, "la fila de comida va en ámbar");
  if (capturas) await page.screenshot({ path: `${capturas}/1440-normal.png` });
  await elegir(permR.getByLabel("Qué pasó"), "32");
  await elegir(permR.getByLabel("Motivo"), { label: "Permiso personal" });
  const avisoHora = "Salida temprano: indica a qué hora salió (debe ser antes de las 4:00 p.m.)";
  assert.equal(await permR.getByRole("alert").innerText(), avisoHora);
  assert.equal(await dR.getByRole("button", { name: "Guardar" }).isDisabled(), true, "sin hora de salida no se guarda");
  assert.equal(await permR.getByLabel("¿A qué hora salió?").inputValue(), "");
  await permR.getByLabel("¿A qué hora salió?").fill("17:00");
  assert.equal(await permR.getByRole("alert").innerText(), avisoHora, "fuera de la jornada");
  if (capturasSelects) {
    await permR.getByLabel("Qué pasó").click();
    await page.locator("[data-select-con-iconos]").waitFor();
    await dormir(350);
    await page.screenshot({ path: `${capturasSelects}/1440-que-paso.png` });
    await page.keyboard.press("Escape");
    await page.locator("[data-select-con-iconos]").waitFor({ state: "detached" });
    await permR.getByLabel("Motivo").click();
    await page.locator("[data-select-con-iconos]").waitFor();
    await dormir(350);
    await page.screenshot({ path: `${capturasSelects}/1440-motivo.png` });
    await page.keyboard.press("Escape");
    await page.locator("[data-select-con-iconos]").waitFor({ state: "detached" });
  }
  await permR.getByLabel("¿A qué hora salió?").fill("14:00");
  assert.equal(await permR.getByRole("alert").count(), 0);
  await compacto(dR, 3, "Rosa con permiso parcial 1440×900");
  if (capturas) { await dormir(300); await page.screenshot({ path: `${capturas}/1440-permiso-parcial.png` }); }
  const r3 = dR.locator('[data-renglon="3"]');
  assert.equal(await r3.getByLabel("Salida").inputValue(), "14:00", "la última salida queda a las 2:00 p.m.");
  assert.equal(await valorDe(r3.getByLabel("Motivo")), "permiso", "motivo de corrección «Por el permiso del día»");
  assert.match(await r3.getByLabel("Motivo").innerText(), /Por el permiso del día/);
  assert.match(await permR.locator("[data-permiso-calculo]").innerText(), /^2 h no trabajadas · se reponen/);
  await selectsSinRecorte(dR, "reloj con permiso 1440");
  await dR.getByRole("button", { name: "Guardar" }).click();
  await dR.waitFor({ state: "detached", timeout: 10000 });
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.deepEqual(pet.reloj.at(-1), { id: 508, cuerpo: {
    registros: [
      { id: 7401, entrada: `${F} 09:00:00`, salida: `${F} 11:00:00`, concepto: "jornada", motivo: null, anulado: false, id_autoriza: null, autoriza_no: false },
      { id: 7402, entrada: `${F} 11:00:00`, salida: `${F} 11:30:00`, concepto: "comida", motivo: null, anulado: false, id_autoriza: null, autoriza_no: false },
      { id: 7403, entrada: `${F} 11:30:00`, salida: `${F} 14:00:00`, concepto: "jornada", motivo: "permiso", anulado: false, id_autoriza: null, autoriza_no: false },
    ],
    permiso_dia: { id_tipo: 32, id_motivo: 2, motivo: "Permiso personal", horas: "reponen" },
  } });

  // Tomás (9:00–4:00 sin comida, una checada): Entrada tarde 11:00 ajusta la entrada; Salir en medio turno 12:00–1:00
  // parte el renglón; el motivo «Otro» pide al menos 3 letras y viaja como «otro: <texto>».
  await page.getByRole("button", { name: "Abrir el reloj de Tomás Ruiz" }).click();
  const dT = page.getByRole("dialog", { name: /Tomás Ruiz/ });
  const permT = dT.locator("[data-permiso-dia]");
  await permT.waitFor({ timeout: 10000 });
  await elegir(permT.getByLabel("Qué pasó"), "31");
  await elegir(permT.getByLabel("Motivo"), { label: "Visita al médico" });
  assert.equal(await permT.getByRole("alert").innerText(), "Entrada tarde: indica a qué hora entró (debe ser después de las 9:00 a.m.)");
  await permT.getByLabel("¿A qué hora entró?").fill("11:00");
  assert.equal(await dT.locator('[data-renglon="1"]').getByLabel("Entrada").inputValue(), "11:00", "la entrada pasa a las 11:00");
  assert.match(await permT.locator("[data-permiso-calculo]").innerText(), /^2 h no trabajadas · se reponen/);
  await elegir(permT.getByLabel("Qué pasó"), "33");
  assert.equal(await dT.locator('[data-renglon="1"]').getByLabel("Entrada").inputValue(), "09:00", "al cambiar de tipo vuelven las checadas");
  assert.equal(await permT.getByRole("alert").innerText(), "Salir en medio turno: indica a qué hora salió y a qué hora regresó (entre las 9:00 a.m. y las 4:00 p.m.)");
  await permT.getByLabel("Salió a las").fill("12:00");
  await permT.getByLabel("Regresó a las").fill("13:00");
  assert.equal(await dT.locator("[data-renglon]").count(), 2, "el renglón se parte en dos");
  assert.deepEqual([await dT.locator('[data-renglon="1"]').getByLabel("Salida").inputValue(), await dT.locator('[data-renglon="2"]').getByLabel("Entrada").inputValue()], ["12:00", "13:00"]);
  assert.match(await permT.locator("[data-permiso-calculo]").innerText(), /^1 h no trabajadas · se reponen/);
  const rT1 = dT.locator('[data-renglon="1"]');
  const opsCorr = await textosOpciones(rT1.getByLabel("Motivo"));
  for (const t of ["Olvidó checar", "Por el permiso del día", "Trabajo remoto / home office", "Visita a cliente o comisión",
    "Capacitación o evento externo", "Sin dispositivo o reloj sin conexión", "Otro (escribe el motivo)"]) assert.ok(opsCorr.includes(t), `motivo de corrección ${t}: ${opsCorr.join(" | ")}`);
  if (capturasSelects) {
    await rT1.getByLabel("Concepto").click();
    await page.locator("[data-select-con-iconos]").waitFor();
    await dormir(350);
    await page.screenshot({ path: `${capturasSelects}/1440-concepto.png` });
    await page.keyboard.press("Escape");
    await page.locator("[data-select-con-iconos]").waitFor({ state: "detached" });
    await rT1.getByLabel("Motivo").click();
    await page.locator("[data-select-con-iconos]").waitFor();
    await dormir(350);
    await page.screenshot({ path: `${capturasSelects}/1440-motivo-correccion.png` });
    await page.keyboard.press("Escape");
    await page.locator("[data-select-con-iconos]").waitFor({ state: "detached" });
  }
  await elegir(rT1.getByLabel("Motivo"), "otro");
  const textoOtro = rT1.getByLabel("Escribe el motivo de la corrección");
  assert.equal(await textoOtro.getAttribute("maxlength"), "34");
  await textoOtro.fill("ab");
  assert.equal(await rT1.getByRole("alert").innerText(), "Escribe el motivo (al menos 3 letras).");
  assert.equal(await dT.getByRole("button", { name: "Guardar" }).isDisabled(), true);
  await textoOtro.fill("Junta con el cliente");
  assert.equal(await rT1.getByRole("alert").count(), 0);
  await dT.getByRole("button", { name: "Guardar" }).click();
  await dT.waitFor({ state: "detached", timeout: 10000 });
  assert.deepEqual(pet.reloj.at(-1), { id: 509, cuerpo: {
    registros: [
      { id: 7501, entrada: `${F} 09:00:00`, salida: `${F} 12:00:00`, concepto: "jornada", motivo: "otro: Junta con el cliente", anulado: false, id_autoriza: null, autoriza_no: false },
      { entrada: `${F} 13:00:00`, salida: `${F} 16:00:00`, concepto: "jornada", motivo: "permiso", anulado: false, id_autoriza: null, autoriza_no: false },
    ],
    permiso_dia: { id_tipo: 33, id_motivo: 1, motivo: "Visita al médico", horas: "reponen" },
  } });

  // 7c) (25/11/2026) Comida marcada con «Salir a comer»: se dibuja entre los tramos (antes no aparecía en el reloj).
  await page.getByRole("button", { name: "Abrir el reloj de Frida Serrano" }).click();
  const dlgFrida = page.getByRole("dialog");
  const comidaReloj = dlgFrida.locator("[data-comida-reloj]");
  await comidaReloj.waitFor({ timeout: 15000 });
  assert.match(await comidaReloj.innerText(), /11:21 a\.m\. → 11:46 a\.m\. · 25 min/);
  assert.equal(await comidaReloj.count(), 1);
  // La franja de comida es una fila delgada entre los dos tramos (no una tarjeta).
  assert.ok((await comidaReloj.boundingBox()).height <= 34, "franja de comida delgada");
  assert.equal(await dlgFrida.locator("[data-renglon] + [data-comida-reloj] + [data-renglon]").count(), 1, "entre los dos tramos");
  if (capturas) { await dormir(300); await page.screenshot({ path: `${capturas}/1440-comida.png` }); }
  // «No fue comida» (marcó «Salir a comer» por error): la franja se va y el PUT pide quitar la marca de ese tramo.
  await comidaReloj.getByRole("button", { name: "No fue comida" }).click();
  await comidaReloj.waitFor({ state: "detached", timeout: 5000 });
  const antesNoComida = pet.reloj.length;
  await dlgFrida.getByRole("button", { name: "Guardar" }).click();
  for (let i = 0; i < 50 && pet.reloj.length === antesNoComida; i++) await dormir(100);
  const putFrida = pet.reloj.at(-1);
  assert.equal(putFrida.id, 510);
  assert.deepEqual(putFrida.cuerpo.registros.find((x) => x.id === 7801).quitar_comida, true);
  assert.equal("quitar_comida" in putFrida.cuerpo.registros.find((x) => x.id === 7802), false);
  if (await dlgFrida.isVisible()) await page.keyboard.press("Escape");
  await dlgFrida.waitFor({ state: "detached", timeout: 10000 });

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
  const bajos = await hoja.evaluate((el) => [...el.querySelectorAll("input,[role=combobox],button")].filter((c) => c.offsetParent)
    .filter((c) => c.getBoundingClientRect().height < 43.5).map((c) => c.getAttribute("aria-label") || c.textContent.trim()));
  assert.deepEqual(bajos, [], "controles de 44 px");
  await selectsSinRecorte(hoja, "hoja 390");
  for (const t of await hoja.locator("[data-renglon]").all()) assert.ok((await t.boundingBox()).width <= 390, "cada checada cabe");
  if (capturas) { await dormir(400); await page.screenshot({ path: `${capturas}/390-modal.png` }); }
  if (capturasSelects) {
    // Desplegables abiertos a 390: Concepto y Motivo de la checada (hoja a pantalla completa).
    for (const [etq, nombre] of [["Concepto", "390-concepto"], ["Motivo", "390-motivo-correccion"]]) {
      await hoja.locator('[data-renglon="1"]').getByLabel(etq).click();
      const m = page.locator("[data-select-con-iconos]");
      await m.waitFor();
      await dormir(350);
      const altos = await m.locator("[role=option]").evaluateAll((os) => os.map((o) => o.getBoundingClientRect().height));
      assert.ok(altos.every((h) => h >= 43.5), `${etq}: opciones de 44 px en celular (${altos.join(",")})`);
      await page.screenshot({ path: `${capturasSelects}/${nombre}.png` });
      await page.keyboard.press("Escape");
      await m.waitFor({ state: "detached" });
    }
  }
  await hoja.getByRole("button", { name: "Cerrar el reloj" }).click();
  await hoja.waitFor({ state: "detached", timeout: 10000 });

  // (25/11/2026) Reloj compacto a 390: tarjetas por checada, resumen en 4 columnas, 44 px, sin desbordes; casos normal,
  // comida («Salir a comer»), extra con autorización y permiso parcial.
  const abrirMovil = async (n) => {
    await page.getByText(n).first().click();
    await page.getByRole("button", { name: "Abrir el reloj del día" }).first().click();
    const d = page.getByRole("dialog", { name: new RegExp(n) });
    await d.locator('[data-renglon="1"]').waitFor({ timeout: 15000 });
    await dormir(500);
    return d;
  };
  const revisarMovil = async (d, etiqueta) => {
    await sinDesborde(d.locator(".overflow-y-auto").first(), etiqueta);
    await sinDesborde(page.locator("html"), `${etiqueta} (página)`);
    const chicos = await d.evaluate((el) => [...el.querySelectorAll("input,[role=combobox],button")].filter((c) => c.offsetParent)
      .filter((c) => c.getBoundingClientRect().height < 43.5).map((c) => c.getAttribute("aria-label") || c.textContent.trim()));
    assert.deepEqual(chicos, [], `${etiqueta}: controles de 44 px`);
    await selectsSinRecorte(d, etiqueta);
    for (const t of await d.locator("[data-renglon],[data-comida-reloj]").all()) {
      const b = await t.boundingBox();
      assert.ok(b.x >= 0 && b.x + b.width <= 390.5, `${etiqueta}: la tarjeta cabe (${b.x}+${b.width})`);
    }
    const sobranTextos = await d.evaluate((el) => [...el.querySelectorAll("p,span,b")].filter((e) => e.offsetParent && e.scrollWidth > e.clientWidth + 1
      && getComputedStyle(e).overflow !== "visible").map((e) => e.innerText.slice(0, 40)));
    assert.deepEqual(sobranTextos, [], `${etiqueta}: textos recortados`);
  };
  const resumenMovil = async (d) => {
    const cols = await d.locator("[data-calculo] > *").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    assert.equal(cols.length, 4);
    assert.ok(cols.every((t) => Math.abs(t - cols[0]) <= 1), `resumen en 4 columnas en una línea (${cols.join(",")})`);
  };
  const hRosa = await abrirMovil("Rosa Díaz");
  await resumenMovil(hRosa);
  await revisarMovil(hRosa, "Rosa 390");
  // Tarjeta: entrada → salida y ✕ en la misma línea; el motivo abajo.
  const t1 = hRosa.locator('[data-renglon="1"]');
  const [bE, bS, bX, bM] = await Promise.all([t1.getByLabel("Entrada"), t1.getByLabel("Salida"), t1.getByRole("button", { name: "Anular checada" }), t1.getByLabel("Motivo")].map((l) => l.boundingBox()));
  assert.ok(Math.abs(bE.y - bS.y) < 1 && Math.abs(bE.y - bX.y) < 1 && bM.y > bE.y + bE.height, "tarjeta: hora → hora y ✕ arriba, motivo abajo");
  if (capturas) await page.screenshot({ path: `${capturas}/390-normal.png` });
  const permM = hRosa.locator("[data-permiso-dia]");
  await elegir(permM.getByLabel("Qué pasó"), "32");
  await elegir(permM.getByLabel("Motivo"), { label: "Permiso personal" });
  await permM.getByLabel("¿A qué hora salió?").fill("14:00");
  assert.equal(await permM.getByRole("alert").count(), 0);
  await revisarMovil(hRosa, "Rosa permiso 390");
  if (capturas) { await dormir(300); await page.screenshot({ path: `${capturas}/390-permiso-parcial.png` }); }
  await hRosa.getByRole("button", { name: "Guardar" }).click();
  await hRosa.waitFor({ state: "detached", timeout: 10000 });
  assert.deepEqual(pet.reloj.at(-1).cuerpo.permiso_dia, { id_tipo: 32, id_motivo: 2, motivo: "Permiso personal", horas: "reponen" });

  const hFrida = await abrirMovil("Frida Serrano");
  await hFrida.locator("[data-comida-reloj]").waitFor();
  await revisarMovil(hFrida, "Frida 390");
  if (capturas) await page.screenshot({ path: `${capturas}/390-comida.png` });
  await hFrida.getByRole("button", { name: "Cerrar el reloj" }).click();
  await hFrida.waitFor({ state: "detached", timeout: 10000 });

  const hMario = await abrirMovil("Mario Gómez");
  await hMario.getByRole("button", { name: /^Separar 3 h 02 min/ }).click();
  const extraM = hMario.locator('[data-renglon="4"]');
  await elegir(extraM.getByLabel("Quién autoriza"), "3");
  await revisarMovil(hMario, "Mario extra 390");
  await extraM.scrollIntoViewIfNeeded();
  if (capturas) { await dormir(300); await page.screenshot({ path: `${capturas}/390-extra-autorizacion.png` }); }
  await hMario.getByRole("button", { name: "Guardar" }).click();
  await hMario.waitFor({ state: "detached", timeout: 10000 });
  assert.equal(pet.reloj.at(-1).cuerpo.registros.at(-1).id_autoriza, 3);
  await page.getByText("Armando González").first().click();
  const estadoMovil = page.getByLabel("Qué pasó de Armando González");
  await estadoMovil.waitFor({ timeout: 10000 });
  assert.ok((await estadoMovil.boundingBox()).height >= 43.5, "select de estado de 44 px");
  if (capturas) { await dormir(400); await page.screenshot({ path: `${capturas}/390-detalle-estado.png` }); }
  if (capturasSelects) {
    // «Qué pasó» abierto a 390 (detalle del empleado sin checadas). El detalle se vuelve a dibujar al llegar los datos.
    for (let i = 0; i < 4; i++) { try { await estadoMovil.click({ timeout: 4000 }); break; } catch (e) { if (i === 3) throw e; await dormir(500); } }
    await page.locator("[data-select-con-iconos]").waitFor();
    await dormir(350);
    await page.screenshot({ path: `${capturasSelects}/390-que-paso.png` });
    await page.keyboard.press("Escape"); // cierra solo el menú, no el detalle
    await page.locator("[data-select-con-iconos]").waitFor({ state: "detached" });
    assert.equal(await estadoMovil.isVisible(), true, "Esc no cierra el detalle");
  }
  await elegir(estadoMovil, "__asistencia");
  const hojaVacia = page.getByRole("dialog", { name: /Armando González/ });
  await hojaVacia.locator("[data-reloj-vacio]").waitFor({ timeout: 15000 });
  await sinDesborde(hojaVacia.locator(".overflow-y-auto").first(), "hoja vacía 390");
  if (capturas) { await dormir(400); await page.screenshot({ path: `${capturas}/390-modal-vacio.png` }); }

  assert.deepEqual(errores, [], "sin errores de JavaScript");
  exito = true;
  console.log("OK · columnas y ocultar · estado en fila (Qué pasó + Motivo) · «Asistencia» → reloj vacío → horario normal · 400 por renglón · "
    + "hora editada exige motivo · separar extra exige autoriza · PUT exactos · festivo/domingo solo lectura · migración pendiente = solo lectura · masivos · sin «Registrar "
    + "asistencia masiva» · horas-extra → Asistencias con aviso · 1440 y 390 sin desbordes ni recortes · sin errores de JS");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
