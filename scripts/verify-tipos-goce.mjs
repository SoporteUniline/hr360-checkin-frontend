// Verificación en navegador real (Chromium + Next compilado) de «Tipos de registro: qué pasó, por qué y cuánto se paga»:
// catálogo con Abarca / Goce del día / Horas no trabajadas / Se cambia al aplicar y 🔒 en los fijados por ley (sin editar);
// editar un tipo manda alcance, horas y «se cambia»; motivos (globales con candado; agregar y ocultar los de la empresa);
// los 3 ejemplos del dueño: (1) fila «Sí vino → Entrada después de tiempo» → reloj con «Permiso del día», 2 h no
// trabajadas que se reponen y PUT con el cuerpo exacto; (2) falta injustificada directa; (3) falta justificada con motivo
// «Permiso personal» sin goce; goce y horas bloqueados (🔒) cuando el tipo no se cambia al aplicar; la lista muestra
// «Visita al médico · 2 h · las repone · con goce» y «📄 Acta en borrador» con enlace al acta correcta (estatus
// borrador/cancelada en Actas, con filtro y aviso del art. 423); Permisos: RH crea una falta justificada por permiso
// personal sin goce para 3 días de la próxima semana → POST exacto. 1440 y 390 sin desbordes ni textos cortados; sin
// errores de JS. Backend simulado con page.route; ninguna petición sale a internet.
// (24/11/2026) Desde «Qué pasó» + «Motivo» (verify-quepaso-motivo.mjs) este script prueba lo mismo con el catálogo de
// un servidor SIN `rol` ni `captura` y motivos sin configuración de pago (compatibilidad): el rol sale del nombre y el
// alcance, el goce del tipo y RH puede cambiarlo; las capturas usan el par «Qué pasó» + «Motivo».
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-tipos-goce.mjs
// CAPTURAS=<carpeta> guarda capturas (catálogo, fila, reloj con permiso, móvil, acta, permisos).
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
const foto = async (page, nombre) => { if (capturas) { await dormir(400); await page.screenshot({ path: `${capturas}/${nombre}.png` }); } };

function token() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Méndez", id_empleado: 7, empresas: [10],
  empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

// ——— Catálogo (como el mockup aprobado) ———
const T = (id, nombre, alcance, goce, horas, cambia, fijo, o = {}) => ({ id, clave: `T${id}`, nombre, id_empresa: null, es_base: true, personalizado: false, alcance, goce_sueldo: goce,
  horas_no_trabajadas: horas, cambia_al_aplicar: cambia, fijo_ley: fijo, cuenta_como_asistencia: alcance === "dia" ? 0 : 1, es_permiso: alcance === "dia" ? 0 : 1, ...o });
const tiposPermiso = [
  T(1, "✅ Asistencia", "dia", 1, null, 0, 0, { cuenta_como_asistencia: 1 }),
  T(2, "❌ Falta injustificada", "dia", 0, null, 0, 1),
  T(3, "📝 Falta justificada", "dia", 0, null, 1, 0),
  T(4, "⌚ Entrada después de tiempo", "entrada", 1, "reponen", 1, 0, { personalizado: true }),
  T(5, "⏳ Salida antes de tiempo", "salida", 1, "descuentan", 0, 0),
  T(6, "🚶 Salida entre jornada", "medio", 1, "reponen", 1, 0),
  T(7, "🏖️ Vacaciones", "dia", 1, null, 0, 1, { descuenta_vacaciones: 1 }),
  T(8, "❌ Sin Checar", "dia", 0, null, 0, 0),
  T(9, "🏥 Incapacidad IMSS", "dia", 0, null, 0, 1),
  T(10, "🚫 Suspensión disciplinaria", "dia", 0, null, 0, 1),
  T(11, "😴 Día de descanso", "dia", 1, null, 0, 1),
  T(14, "Home office", "dia", 1, null, 1, 0, { id_empresa: 10, es_base: false }),
];
const parciales = tiposPermiso.filter((t) => t.alcance !== "dia").map((t) => ({ id: t.id, nombre: t.nombre, alcance: t.alcance,
  goce: t.goce_sueldo ? "con" : "sin", horas: t.horas_no_trabajadas, cambia_al_aplicar: t.cambia_al_aplicar }));
let motivos = [{ id: 1, nombre: "Visita al médico", global: true }, { id: 2, nombre: "Permiso personal", global: true },
  { id: 3, nombre: "Trámite", global: true }, { id: 4, nombre: "Escuela de los hijos", global: true }, { id: 5, nombre: "Capacitación", global: true },
  { id: 6, nombre: "Otro", global: true }, { id: 20, nombre: "Junta escolar", global: false }];

// ——— Asistencias ———
const F = "2026-11-23";
const NORMAL = { tipo: "normal", nombre: "Día normal", pago: "" };
const horario = { entrada: "09:00", salida: "17:00", salida_comida: "13:00", regreso_comida: "14:00" };
const fila = (id, nombre, apellido, depto, o = {}) => ({
  id, id_empleado: id, id_empresa: 10, nombre, apellido_paterno: apellido, departamento: depto, fecha: F, zona_horaria: "America/Mexico_City",
  hora_entrada_programada: "09:00:00", hora_salida_programada: "17:00:00", hora_salida_comida_programada: "13:00:00",
  hora_regreso_comida_programada: "14:00:00", tipo_registro_nombre: "❌ Sin Checar", id_tipo_permiso: 8, asistencia: 0, goce_sueldo: 0,
  entrada: null, salida: null, dia: NORMAL, checadas_vivas: 0, minutos_trabajados: null, minutos_comida: null, minutos_extra: 0,
  minutos_extra_por_autorizar: 0, motivos_resumen: "", estadoAsistencia: "Ausente", permiso_dia: null, acta: null,
  estado_calculado: { clave: "falta", texto: "❌ Sin Checar", atencion: true }, ...o,
});
const filas = () => [
  fila(601, "Diego", "León", "Administración"),
  fila(602, "Ana", "Ruiz", "Ventas"),
  fila(603, "Luis", "Mora", "Almacén"),
  fila(604, "Marta", "Díaz", "Contaduría", { entrada: `${F} 11:00:00`, salida: `${F} 17:00:00`, checadas_vivas: 3, minutos_trabajados: 300,
    minutos_comida: 60, asistencia: 1, goce_sueldo: 1, estadoAsistencia: "Presente", estado_calculado: { clave: "just", texto: "Entró tarde con permiso" },
    permiso_dia: { tipo: "⌚ Entrada después de tiempo", motivo: "Visita al médico", goce: "con", horas: "reponen", minutos: 120, alcance: "entrada" } }),
  fila(605, "Pablo", "Soto", "Producción", { id_tipo_permiso: 2, tipo_registro_nombre: "❌ Falta injustificada",
    estado_calculado: { clave: "falta", texto: "Falta injustificada" }, acta: { id: 77, estatus: "borrador" } }),
  fila(606, "Raúl", "Vega", "Tienda", { entrada: `${F} 09:00:00`, salida: `${F} 15:00:00`, checadas_vivas: 3, minutos_trabajados: 300, minutos_comida: 60,
    asistencia: 1, goce_sueldo: 1, estadoAsistencia: "Presente", estado_calculado: { clave: "antes", texto: "Salió antes −2 h" } }),
];
const chec = (id, e, s, o = {}) => ({ id, entrada: `${F} ${e}:00`, salida: `${F} ${s}:00`, entrada_reloj: `${F} ${e}:00`, salida_reloj: `${F} ${s}:00`,
  concepto: "jornada", motivo: null, origen: "reloj", anulado: false, id_autoriza: null, autoriza_no: false, ...o });
const relojes = {
  606: [chec(9001, "09:00", "13:00"), chec(9002, "13:00", "14:00", { concepto: "comida" }), chec(9003, "14:00", "15:00")],
};
const motivosReloj = { permisos: [{ clave: "tp:4", nombre: "⌚ Entrada después de tiempo" }],
  correccion: [{ clave: "olvido", nombre: "Olvidó checar" }, { clave: "reloj", nombre: "Falla del reloj" }, { clave: "captura", nombre: "Error de captura" }] };

// ——— Actas ———
const acta = (id, estatus) => ({ id_acta: id, id_empresa: 10, folio: `ACTA-00${id}`, nombre_empleado: id === 77 ? "Pablo" : "Ana", apellido_paterno_empleado: id === 77 ? "Soto" : "Ruiz",
  apellido_materno_empleado: "", nombre_tipo_acta: "Falta injustificada", gravedad_tipo: "leve", fecha_incidente: F, estatus, nombre_empresa: "Empresa prueba",
  nombre_quien_elabora: "Sistema", hechos: "Falta injustificada registrada en Asistencias.", es_reincidencia: 0 });
const actas = [acta(76, "cancelada"), acta(77, "borrador"), acta(75, "elaborada")];

const pet = { tipos: [], motivos: [], reloj: [], estado: [], permisos: [], actas: [] };
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
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" }, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname;
    const cuerpo = () => JSON.parse(req.postData() || "{}");
    if (p.endsWith("/users/verify/token")) return json({ user: usuario });
    if (p.endsWith("/checador/tiposPermiso") && req.method() === "GET") return json({ tiposPermiso, total: tiposPermiso.length });
    let m = /\/checador\/tiposPermiso\/(\d+)$/.exec(p);
    if (m && req.method() === "PUT") { pet.tipos.push({ id: Number(m[1]), cuerpo: cuerpo() }); return json({ ok: true }); }
    if (p.endsWith("/checador/motivos-permiso") && req.method() === "GET") return json({ ok: true, motivos });
    if (p.endsWith("/checador/motivos-permiso") && req.method() === "POST") {
      const c = cuerpo(); pet.motivos.push({ metodo: "POST", cuerpo: c });
      motivos = [...motivos, { id: 30, nombre: c.nombre, global: false }]; return json({ ok: true, id: 30 });
    }
    m = /\/checador\/motivos-permiso\/(\d+)$/.exec(p);
    if (m && req.method() === "PUT") {
      const c = cuerpo(); pet.motivos.push({ metodo: "PUT", id: Number(m[1]), cuerpo: c });
      if (c.activo === false) motivos = motivos.filter((x) => x.id !== Number(m[1]));
      return json({ ok: true });
    }
    if (p.endsWith("/checador/empleados")) return json({ data: [{ id_empleado: 7, nombre: "Laura", apellido_paterno: "Méndez" }], total: 1 });
    if (p.endsWith("/checador/empleados/activos")) return json({ data: [{ id_empleado: 601, nombre: "Diego", apellido_paterno: "León" }, { id_empleado: 602, nombre: "Ana", apellido_paterno: "Ruiz" }], total: 2 });
    if (p.endsWith("/checador/asistencias") && req.method() === "GET") {
      const regs = filas();
      return json({ registros: regs, total: regs.length, page: 1, aplicarPaginacion: true });
    }
    m = /\/checador\/asistencias\/(\d+)\/reloj$/.exec(p);
    if (m) {
      const idA = Number(m[1]);
      const f = filas().find((x) => x.id === idA);
      if (req.method() === "PUT") { pet.reloj.push({ id: idA, cuerpo: cuerpo() }); return json({ ok: true, asistencia: f }); }
      return json({ ok: true, asistencia: { id: idA, id_empleado: idA, nombre: `${f.nombre} ${f.apellido_paterno}`, departamento: f.departamento, fecha: f.fecha },
        horario, dia: NORMAL, registros: relojes[idA] ?? [], motivos: motivosReloj, autorizadores: [{ id: 3, nombre: "Laura Méndez (RH)" }],
        resumen: { minutos_trabajados: f.minutos_trabajados ?? 0, minutos_comida: f.minutos_comida ?? 0, minutos_extra: 0, minutos_extra_por_autorizar: 0,
          checadas_vivas: f.checadas_vivas, abierto: false, estado: f.estado_calculado, estado_calculado: f.estado_calculado },
        permiso_dia: null, tipos_parciales: parciales, motivos_permiso: motivos, migracion: true });
    }
    m = /\/checador\/asistencias\/(\d+)\/estado-dia$/.exec(p);
    if (m && req.method() === "PUT") {
      const c = cuerpo();
      pet.estado.push({ id: Number(m[1]), cuerpo: c });
      return json({ ok: true, asistencia: filas().find((x) => x.id === Number(m[1])),
        ...(c.id_tipo_permiso === 2 ? { aviso: "Se creó un acta administrativa en borrador por la falta injustificada." } : {}) });
    }
    if (p.endsWith("/checador/administrativeMinutes") && req.method() === "GET") {
      pet.actas.push(url.search);
      return json({ data: actas, total: actas.length, page: 1, totalPages: 1, stats: { totalActas: 3, totalBorradores: 1, totalElaboradas: 1, totalCerradas: 0, totalGraves: 0 } });
    }
    if (p.endsWith("/checador/tipos-actas")) return json({ data: [], total: 0 });
    if (p.endsWith("/checador/solicitudes-permiso/masivo") && req.method() === "POST") { pet.permisos.push(cuerpo()); return json({ ok: true, creados: 1 }); }
    if (p.endsWith("/checador/solicitudes-permiso")) return json({ data: [], total: 0, estadisticas: { total: 0, pendientes: 0, aprobados: 0, rechazados: 0, cancelados: 0 } });
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
}

// Texto visible de cada select cabe en su caja (también las opciones de los motivos y horas).
async function selectsSinRecorte(raiz, etiqueta) {
  const malos = await raiz.evaluate((el) => {
    const ctx = document.createElement("canvas").getContext("2d");
    const out = [];
    for (const s of el.querySelectorAll("select")) {
      if (!s.offsetParent) continue;
      const cs = getComputedStyle(s);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const libre = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - (cs.appearance === "none" ? -2 : 18); // con flecha propia el padding ya la incluye
      const textos = [s.options[s.selectedIndex]?.text ?? ""];
      // Las opciones no elegidas solo cuentan si el select tiene ancho fijo (con field-sizing: content se ajusta a lo elegido).
      if (cs.fieldSizing !== "content" && /Motivo|Horas no trabajadas|Goce/.test(s.getAttribute("aria-label") ?? "")) textos.push(...[...s.options].map((o) => o.text));
      for (const t of textos) if (ctx.measureText(t).width > libre) out.push(`${s.getAttribute("aria-label")}: «${t}» (${Math.round(ctx.measureText(t).width)} > ${Math.round(libre)})`);
    }
    return out;
  });
  assert.deepEqual(malos, [], `${etiqueta}: selects con texto recortado`);
}
// Letra de los campos entre 13 y 16 px (13–14 en escritorio; 16 en celular para que iOS no haga zoom).
async function letraCampos(raiz, etiqueta, min = 13, max = 14) {
  const malos = await raiz.evaluate((el, [a, b]) => [...el.querySelectorAll("select,input:not([type=checkbox])")].filter((c) => c.offsetParent)
    .map((c) => [c.getAttribute("aria-label") || c.id || c.type, parseFloat(getComputedStyle(c).fontSize)]).filter(([, f]) => f < a || f > b), [min, max]);
  assert.deepEqual(malos, [], `${etiqueta}: tamaño de letra de los campos`);
}
async function sinDesborde(loc, etiqueta) {
  const sobra = await loc.evaluate((el) => el.scrollWidth - el.clientWidth);
  assert.ok(sobra <= 1, `${etiqueta}: desplazamiento horizontal (${sobra}px)`);
}
async function celdasSinRecorte(page, etiqueta) {
  const c = await page.locator("tbody").first().evaluate((tb) => [...tb.querySelectorAll("td")].filter((td) => td.scrollWidth > td.clientWidth + 1).map((td) => td.innerText.slice(0, 40)));
  assert.deepEqual(c, [], `${etiqueta}: celdas con texto recortado`);
}
async function esperar(cond, texto) {
  for (let i = 0; i < 80; i++) { if (cond()) return; await dormir(100); }
  throw new Error(`No llegó: ${texto}`);
}
// Lunes de la próxima semana (fecha local) y los 3 días siguientes.
function proximaSemana() {
  const d = new Date(); const dia = d.getDay(); d.setDate(d.getDate() + ((8 - dia) % 7 || 7));
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const fin = new Date(d); fin.setDate(d.getDate() + 2);
  return [iso(d), iso(fin)];
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

  // 1) Catálogo: columnas del mockup, 🔒 con su razón, sin editar los fijos; editar un tipo manda sus campos.
  await page.goto(base + "/panel/catalogos/tipos-registro", { waitUntil: "domcontentloaded" });
  const filaTipo = (id) => page.locator(`tr[data-tipo="${id}"]`);
  await filaTipo(4).waitFor({ timeout: 30000 });
  await page.locator("thead th", { hasText: "Goce y horas" }).waitFor({ timeout: 10000 }); // innerText vacío mientras entra la tabla
  await filaTipo(14).waitFor({ timeout: 10000 });
  const enc = (await page.locator("thead th").allInnerTexts()).map((t) => t.trim());
  for (const c of ["Qué pasó", "Abarca", "Goce y horas", "Acciones"]) assert.ok(enc.includes(c), `columna ${c}: ${enc.join(" | ")}`);
  assert.match(await filaTipo(4).innerText(), /⌚ Entrada después de tiempo[\s\S]*Parte del día · al entrar[\s\S]*El pago lo decide el motivo/);
  assert.match(await filaTipo(10).innerText(), /Suspensión disciplinaria[\s\S]*🔒 Ley[\s\S]*Máximo 8 días y debe ser oída antes \(art\. 423\)/);
  for (const id of [2, 4, 5, 6, 7, 9, 10, 11]) assert.equal(await filaTipo(id).getByRole("button").count(), 0, `tipo ${id}: no se edita (ley o pago en el motivo)`);
  assert.equal(await filaTipo(8).count(), 0, "«Sin checar» no es de captura");
  await sinDesborde(page.locator("html"), "catálogo 1440");
  await celdasSinRecorte(page, "catálogo 1440");
  // Motivos: agregar y ocultar los de la empresa.
  const sec = page.locator("[data-motivos]");
  await sec.locator('[data-motivo="Visita al médico"]').waitFor({ timeout: 10000 });
  assert.equal(await sec.locator('[data-motivo="Otro"]').count(), 1);
  await sec.getByLabel("Nuevo motivo", { exact: true }).fill("Boda");
  await sec.getByRole("button", { name: "Agregar" }).click();
  await esperar(() => pet.motivos.length === 1, "POST motivo");
  assert.deepEqual(pet.motivos[0], { metodo: "POST", cuerpo: { nombre: "Boda", goce: "sin", horas: "reponen", cambia_al_aplicar: 1 } });
  await sec.locator('[data-motivo="Boda"]').waitFor({ timeout: 10000 });
  await sec.getByRole("button", { name: "Ocultar Junta escolar" }).click();
  await esperar(() => pet.motivos.length === 2, "PUT motivo");
  assert.deepEqual(pet.motivos[1], { metodo: "PUT", id: 20, cuerpo: { activo: false } });
  await sec.locator('[data-motivo="Junta escolar"]').waitFor({ state: "detached", timeout: 10000 });
  await foto(page, "1440-catalogo");
  // Un tipo propio de la empresa se sigue editando con su goce.
  await page.getByRole("button", { name: "Editar Home office" }).click();
  const dlgT = page.getByRole("dialog");
  await dlgT.locator("[data-seccion-goce]").waitFor();
  await letraCampos(dlgT.locator("[data-seccion-goce]"), "formulario del tipo");
  await foto(page, "1440-catalogo-editar");
  await dlgT.getByRole("button", { name: "Guardar Cambios" }).click();
  await esperar(() => pet.tipos.length === 1, "PUT tipo");
  assert.equal(pet.tipos[0].id, 14);
  assert.equal(pet.tipos[0].cuerpo.goce_sueldo, 1);

  // 2) Asistencias.
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Registros" }).click();
  const filaDe = (n) => page.locator("tr", { hasText: n }).first();
  await filaDe("Diego León").waitFor({ timeout: 30000 });
  // Lista: el tipo y debajo «Visita al médico · 2 h · las repone · con goce»; falta injustificada con su acta.
  assert.match(await filaDe("Marta Díaz").innerText(), /⌚ Entrada después de tiempo · Visita al médico · 2 h · las repone/);
  const enlaceActa = filaDe("Pablo Soto").locator("[data-acta-enlace]");
  assert.equal(await enlaceActa.innerText(), "📄 Acta en borrador");
  assert.equal(await enlaceActa.getAttribute("href"), "/panel/actas-administrativas?acta=77");
  // «Qué pasó» de la fila sin checadas (sin «Sin checar»; los de ley al final con 🔒).
  assert.deepEqual(await page.getByLabel("Qué pasó de Diego León").evaluate((s) => [...s.options].map((o) => o.text)),
    ["❌ Sin Checar", "Asistencia", "Falta injustificada", "Entrada después de tiempo", "Salida antes de tiempo", "Salida entre jornada", "Falta justificada",
      "Home office", "Vacaciones 🔒", "Incapacidad IMSS 🔒", "Suspensión disciplinaria 🔒", "Día de descanso 🔒"]);
  await sinDesborde(page.locator("html"), "asistencias 1440");
  await celdasSinRecorte(page, "asistencias 1440");
  await selectsSinRecorte(page.locator("tbody"), "asistencias 1440");
  const cajas = await page.locator("[data-estado-fila]").evaluateAll((els) => els.map((e) => getComputedStyle(e).borderTopWidth));
  assert.ok(cajas.every((b) => b === "0px"), "sin cuadros alrededor del estado");

  // Ejemplo 2: Falta injustificada (sin motivo) → OK, sin motivo ni goce.
  await page.getByLabel("Qué pasó de Ana Ruiz").selectOption("2");
  await filaDe("Ana Ruiz").getByRole("button", { name: "OK" }).click();
  await esperar(() => pet.estado.length === 1, "PUT estado-dia falta injustificada");
  assert.deepEqual(pet.estado[0], { id: 602, cuerpo: { id_tipo_permiso: 2 } });
  await page.getByText("Se creó un acta administrativa en borrador por la falta injustificada.").waitFor({ timeout: 5000 });

  // Ejemplo 3: Falta justificada (tipo anterior, servidor viejo) · «Permiso personal» · goce del tipo (sin goce).
  await page.getByLabel("Qué pasó de Luis Mora").selectOption("3");
  const pend = filaDe("Luis Mora").locator("[data-estado-pendiente]");
  await pend.waitFor();
  const motivoLuis = page.getByLabel("Motivo de Luis Mora");
  await motivoLuis.locator("option", { hasText: "Permiso personal" }).waitFor({ state: "attached" });
  const opcionesMotivo = await motivoLuis.evaluate((s) => [...s.options].map((o) => o.text));
  assert.deepEqual(opcionesMotivo, ["Sin motivo", "Visita al médico", "Permiso personal", "Trámite", "Escuela de los hijos", "Capacitación", "Boda", "Otro…"]);
  await motivoLuis.selectOption({ label: "Permiso personal" });
  assert.equal(await pend.getByLabel("Goce del día").inputValue(), "sin", "goce preseleccionado del tipo");
  await selectsSinRecorte(filaDe("Luis Mora"), "fila con motivo");
  await letraCampos(filaDe("Luis Mora"), "fila con motivo");
  await foto(page, "1440-fila-motivo");
  await pend.getByRole("button", { name: "OK" }).click();
  await esperar(() => pet.estado.length === 2, "PUT estado-dia falta justificada");
  assert.deepEqual(pet.estado[1], { id: 603, cuerpo: { id_tipo_permiso: 3, id_motivo: 2, goce: "sin" } });

  // Ejemplo 1: Diego · «Sí vino → Entrada después de tiempo» → reloj con el permiso puesto; entra 11:00; visita al médico.
  await page.getByLabel("Qué pasó de Diego León").selectOption("4");
  const dlg = page.getByRole("dialog", { name: /Diego León/ });
  const perm = dlg.locator("[data-permiso-dia]");
  await perm.waitFor({ timeout: 10000 });
  assert.equal(await perm.getByLabel("Qué pasó").inputValue(), "4");
  // Sin checadas, un permiso parcial no se puede guardar (el servidor responde 400): se avisa antes.
  await perm.getByLabel("Motivo").selectOption({ label: "Visita al médico" });
  assert.match(await perm.getByRole("alert").innerText(), /Si no vino, elige «Inasistencia»/);
  await perm.getByLabel("Motivo").selectOption("");
  await dlg.getByRole("button", { name: "Cargar su horario normal" }).click();
  await dlg.locator('[data-renglon="1"]').getByLabel("Entrada").fill("11:00");
  // Sin motivo no hay permiso: es un retardo (se puede guardar así).
  assert.match(await dlg.locator("[data-estado-calculado]").innerText(), /Retardo/);
  const ops = await perm.getByLabel("Motivo").evaluate((s) => [...s.options].map((o) => o.text));
  assert.ok(ops.includes("Visita al médico") && ops.at(-1) === "Otro…", ops.join(","));
  const opsRenglon = await dlg.locator('[data-renglon="1"]').getByLabel("Motivo").evaluate((s) => [...s.querySelectorAll("optgroup")].map((g) => g.label));
  assert.deepEqual(opsRenglon, ["Corrección"], "el motivo del renglón es solo de corrección");
  await perm.getByLabel("Motivo").selectOption({ label: "Visita al médico" });
  assert.match(await perm.locator("[data-permiso-calculo]").innerText(), /^2 h no trabajadas · se reponen\s*Día con goce · 2 h a su cuenta de horas$/);
  await perm.getByLabel("Horas no trabajadas").selectOption("descuentan");
  assert.match(await perm.locator("[data-permiso-calculo]").innerText(), /2 h no trabajadas · se descuentan\s*Día con goce · se descuentan 2 h/);
  await perm.getByLabel("Horas no trabajadas").selectOption("reponen");
  assert.match(await dlg.locator("[data-estado-calculado]").innerText(), /Entró tarde con permiso/);
  await selectsSinRecorte(dlg, "reloj con permiso 1440");
  await letraCampos(perm, "permiso del día");
  await sinDesborde(dlg.locator(".overflow-y-auto").first(), "reloj 1440");
  await foto(page, "1440-reloj-permiso");
  await dlg.getByRole("button", { name: "Guardar" }).click();
  await dlg.waitFor({ state: "detached", timeout: 10000 });
  assert.deepEqual(pet.reloj[0], { id: 601, cuerpo: {
    registros: [
      { entrada: `${F} 11:00:00`, salida: `${F} 13:00:00`, concepto: "jornada", motivo: "olvido", anulado: false, id_autoriza: null, autoriza_no: false },
      { entrada: `${F} 13:00:00`, salida: `${F} 14:00:00`, concepto: "comida", motivo: "olvido", anulado: false, id_autoriza: null, autoriza_no: false },
      { entrada: `${F} 14:00:00`, salida: `${F} 17:00:00`, concepto: "jornada", motivo: "olvido", anulado: false, id_autoriza: null, autoriza_no: false },
    ],
    permiso_dia: { id_tipo: 4, id_motivo: 1, motivo: "Visita al médico", horas: "reponen" },
  } });

  // Salida antes de tiempo con «Otro…» escrito: viaja el id de «Otro» y el texto.
  await page.getByRole("button", { name: "Abrir el reloj de Raúl Vega" }).click();
  const dlgR = page.getByRole("dialog", { name: /Raúl Vega/ });
  const permR = dlgR.locator("[data-permiso-dia]");
  await permR.waitFor({ timeout: 10000 });
  await permR.getByLabel("Qué pasó").selectOption("5");
  await permR.getByLabel("Motivo").selectOption({ label: "Otro…" });
  await permR.getByLabel("Escribe el motivo").fill("Cita en el banco");
  // Motivo sin configuración (servidor viejo): las horas las trae el tipo (se descuentan).
  assert.match(await permR.locator("[data-permiso-calculo]").innerText(), /2 h no trabajadas · se descuentan\s*Día con goce · se descuentan 2 h/);
  assert.match(await dlgR.locator("[data-estado-calculado]").innerText(), /Salió antes con permiso/);
  await dlgR.getByRole("button", { name: "Guardar" }).click();
  await dlgR.waitFor({ state: "detached", timeout: 10000 });
  assert.deepEqual(pet.reloj[1].cuerpo.permiso_dia, { id_tipo: 5, id_motivo: 6, motivo: "Cita en el banco", horas: "descuentan" });
  assert.equal(pet.reloj[1].cuerpo.registros.length, 3);

  // 3) El enlace del acta abre la correcta, con estatus nuevos, filtro y aviso del art. 423.
  await filaDe("Pablo Soto").locator("[data-acta-enlace]").click();
  await page.waitForURL(/\/panel\/actas-administrativas\?acta=77$/, { timeout: 15000 });
  const dlgActa = page.getByRole("dialog", { name: /ACTA-0077/ });
  await dlgActa.waitFor({ timeout: 15000 });
  assert.equal(await dlgActa.locator("[data-estatus-detalle]").innerText(), "Borrador");
  assert.match(await dlgActa.locator("[data-aviso-audiencia]").innerText(), /debe ser oída[\s\S]*art\. 423/);
  await foto(page, "1440-acta");
  await page.keyboard.press("Escape");
  await dlgActa.waitFor({ state: "detached", timeout: 10000 });
  const estatus = await page.locator("[data-estatus-acta]").allInnerTexts();
  assert.deepEqual(estatus, ["Cancelada", "Borrador", "Elaborada"]);
  await page.locator("thead").getByRole("button", { name: /Estado/ }).click();
  const pop = page.locator("[data-slot=popover-content], [data-radix-popper-content-wrapper]").last();
  await pop.getByText("Borrador", { exact: true }).waitFor({ timeout: 5000 });
  assert.equal(await pop.getByText("Cancelada", { exact: true }).count(), 1, "filtro con «Cancelada»");
  await pop.getByText("Borrador", { exact: true }).click();
  await page.keyboard.press("Escape");
  await esperar(() => true, "");
  assert.deepEqual(await page.locator("[data-estatus-acta]").allInnerTexts(), ["Borrador"], "filtro por borrador");

  // 4) Permisos a futuro: falta justificada por permiso personal, sin goce, 3 días de la próxima semana.
  await page.goto(base + "/panel/permisos", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Nuevo permiso/ }).first().click();
  const dp = page.getByRole("dialog");
  const empresaSel = dp.getByRole("combobox").first();
  await empresaSel.waitFor({ timeout: 15000 });
  if (!/Empresa prueba/.test(await empresaSel.innerText())) { await empresaSel.click(); await page.getByRole("option", { name: "Empresa prueba" }).click(); }
  const opcionesTipo = await dp.getByLabel("Qué pasó").evaluate((s) => [...s.options].map((o) => o.text));
  assert.deepEqual(opcionesTipo, ["Elige qué pasó…", "Falta injustificada", "Entrada después de tiempo", "Salida antes de tiempo", "Salida entre jornada"]);
  await dp.getByLabel("Qué pasó").selectOption("2");
  await dp.getByText("Diego León").waitFor({ timeout: 10000 });
  await dp.locator("li", { hasText: "Diego León" }).getByRole("checkbox").check();
  const [ini, fin] = proximaSemana();
  await dp.locator('input[type="date"]').nth(0).fill(ini);
  await dp.locator('input[type="date"]').nth(1).fill(fin);
  await dp.getByLabel("Motivo", { exact: true }).selectOption({ label: "Permiso personal" });
  assert.equal(await dp.getByLabel("Goce del día").inputValue(), "sin", "goce preseleccionado");
  await letraCampos(dp.locator("[data-que-paso-permiso]"), "permisos qué pasó y motivo");
  await foto(page, "1440-permisos");
  await dp.getByRole("button", { name: "Guardar" }).click();
  await esperar(() => pet.permisos.length === 1, "POST permiso masivo");
  assert.deepEqual(pet.permisos[0], { ids_empleados: [601], id_tipo_permiso: 2, fecha_inicio: ini, fecha_fin: fin, motivo: null,
    id_motivo_permiso: 2, goce: "sin" });
  // Un parcial: por horas (lo dice el tipo), día con goce y las horas del motivo.
  await page.getByRole("button", { name: /Nuevo permiso/ }).first().click();
  const dp2 = page.getByRole("dialog");
  await dp2.getByLabel("Qué pasó").selectOption("5");
  await dp2.getByLabel("Motivo", { exact: true }).selectOption({ label: "Visita al médico" });
  assert.equal(await dp2.getByLabel("Goce del día").count(), 0, "parcial con motivo: día con goce");
  assert.equal(await dp2.getByLabel("Horas no trabajadas").isDisabled(), false);
  assert.equal(await dp2.getByRole("radiogroup", { name: "Duración del permiso" }).count(), 0, "el tipo ya dice que es por horas");
  await page.keyboard.press("Escape");

  // 5) Celular 390: catálogo, lista con permiso y acta, detalle y reloj sin desbordes.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/panel/catalogos/tipos-registro", { waitUntil: "domcontentloaded" });
  await filaTipo(4).waitFor({ timeout: 30000 });
  await sinDesborde(page.locator("html"), "catálogo 390");
  await foto(page, "390-catalogo");
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByText("Marta Díaz").first().waitFor({ timeout: 30000 });
  await sinDesborde(page.locator("html"), "asistencias 390");
  const lineaM = page.locator("[data-permiso-movil]").first();
  assert.match(await lineaM.innerText(), /⌚ Entrada después de tiempo · Visita al médico · 2 h · las repone/);
  const corta = await page.locator("[data-permiso-movil]").evaluateAll((els) => els.filter((e) => e.scrollHeight > e.clientHeight + 1).length);
  assert.equal(corta, 0, "línea del permiso sin cortar");
  assert.equal(await page.locator("[data-acta-movil]").first().innerText(), "📄 Acta en borrador");
  await foto(page, "390-lista");
  await page.getByText("Luis Mora").first().click();
  const estadoMovil = page.getByLabel("Qué pasó de Luis Mora");
  await estadoMovil.waitFor({ timeout: 10000 });
  await estadoMovil.selectOption("3");
  const pendM = page.locator("[data-estado-movil] [data-estado-fila]");
  await pendM.getByLabel("Motivo de Luis Mora").selectOption({ label: "Permiso personal" });
  const bajos = await pendM.evaluate((el) => [...el.querySelectorAll("select,button")].filter((c) => c.getBoundingClientRect().height < 43.5).map((c) => c.getAttribute("aria-label") || c.textContent));
  assert.deepEqual(bajos, [], "controles de 44 px en celular");
  await letraCampos(pendM, "fila móvil", 16, 16);
  await foto(page, "390-detalle-motivo");
  await page.keyboard.press("Escape");
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByText("Diego León").first().waitFor({ timeout: 30000 });
  await page.getByText("Diego León").first().click();
  await page.getByLabel("Qué pasó de Diego León").selectOption("4");
  const hoja = page.getByRole("dialog", { name: /Diego León/ });
  const permM = hoja.locator("[data-permiso-dia]");
  await permM.waitFor({ timeout: 15000 });
  await dormir(500);
  assert.equal(await permM.getByLabel("Qué pasó").inputValue(), "4", "el tipo de la fila llega al reloj en celular");
  await hoja.getByRole("button", { name: "Cargar su horario normal" }).click();
  await permM.getByLabel("Motivo").selectOption({ label: "Visita al médico" });
  await sinDesborde(hoja.locator(".overflow-y-auto").first(), "reloj 390");
  await selectsSinRecorte(hoja, "reloj 390");
  const bajosR = await permM.evaluate((el) => [...el.querySelectorAll("select,input")].filter((c) => c.offsetParent && c.getBoundingClientRect().height < 43.5).map((c) => c.getAttribute("aria-label")));
  assert.deepEqual(bajosR, [], "permiso del día con controles de 44 px");
  await permM.scrollIntoViewIfNeeded();
  await foto(page, "390-reloj-permiso");

  assert.deepEqual(errores, [], "sin errores de JavaScript");
  exito = true;
  console.log("OK (servidor sin rol/captura) · catálogo (Qué pasó, Goce y horas, 🔒 con razón, propio editable) · motivos (agregar, ocultar) · "
    + "ejemplo 1 fila → reloj con permiso → 2 h se reponen → PUT exacto · ejemplo 2 falta injustificada directa · ejemplo 3 falta justificada "
    + "«Permiso personal» sin goce · goce/horas 🔒 si no se cambia al aplicar · lista y móvil con el resumen · acta en borrador → acta 77 "
    + "(estatus, filtro, art. 423) · Permisos: falta justificada 3 días próxima semana → POST exacto · 1440 y 390 sin desbordes ni recortes · sin errores de JS");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
