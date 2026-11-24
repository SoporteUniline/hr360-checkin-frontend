// Verificación en navegador real (Chromium + Next compilado) de «Dos campos: Qué pasó (tipo) y Motivo (por qué), con el
// goce en el motivo» (spec-quepaso-motivo, aprobado por Diego 24/11/2026):
//  · Fila de Asistencias sin checadas: los dos selects juntos, del mismo alto y sin cuadro; «Inasistencia» sin motivo →
//    PUT { id_tipo_permiso } con aviso de acta; «Inasistencia · Permiso personal» → PUT con id_motivo y goce del motivo;
//    un tipo oculto guardado se muestra tal cual y no se ofrecen los ocultos; estado · motivo de solo lectura.
//  · Reloj sin checadas: el mismo par; «Inasistencia · Permiso laboral» (🔒 con goce) se guarda y cierra.
//  · Reloj con permiso: fila «Entrada tarde» → reloj con el tipo puesto; «Visita al médico» → 2 h se reponen → PUT exacto.
//  · Catálogo: «Qué pasó» solo de captura (ley con 🔒), «Tipos anteriores (solo historial)» plegado; «Motivos» con Goce,
//    Horas no trabajadas, Se cambia al aplicar editables (PUT/POST exactos), «Personalizado», ocultar y mostrar.
//  · Permisos (RH): el mismo par → POST exacto; motivo que no se cambia al aplicar → horas 🔒.
//  · 1440 y 390 sin desbordes ni textos cortados; campos de 13–14 px (16 en celular); sin errores de JS.
// Backend simulado con page.route; ninguna petición sale a internet.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-quepaso-motivo.mjs
// CAPTURAS=<carpeta> guarda capturas (fila, reloj vacío, reloj con permiso, catálogo, móvil, permisos).
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
const foto = async (page, nombre, loc = null) => {
  if (!capturas) return;
  await dormir(400);
  if (loc) await loc.screenshot({ path: `${capturas}/${nombre}.png` });
  else await page.screenshot({ path: `${capturas}/${nombre}.png` });
};

function token() {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 10, nombre: "Empresa prueba", estado: "Activo", zona_horaria: "America/Mexico_City" };
const usuario = { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Méndez", id_empleado: 7, empresas: [10],
  empresas_detalle: [empresa], zona_horaria: "America/Mexico_City" };

// ——— Catálogo tras la migración 20261209 (contrato: `rol` y `captura`) ———
const T = (id, nombre, rol, o = {}) => ({ id, clave: `T${id}`, nombre, rol, captura: 1, id_empresa: null, es_base: true, personalizado: false,
  alcance: ["entrada", "salida", "medio"].includes(rol) ? rol : "dia", goce_sueldo: 0, fijo_ley: rol === "ley" ? 1 : 0,
  cuenta_como_asistencia: ["asistencia", "entrada", "salida", "medio"].includes(rol) ? 1 : 0, es_permiso: ["entrada", "salida", "medio"].includes(rol) ? 1 : 0, ...o });
const tiposPermiso = [
  T(1, "Asistencia", "asistencia", { goce_sueldo: 1 }),
  T(2, "Inasistencia", "inasistencia"),
  T(4, "Entrada tarde", "entrada", { goce_sueldo: 1 }),
  T(5, "Salida temprano", "salida", { goce_sueldo: 1 }),
  T(6, "Salir en medio turno", "medio", { goce_sueldo: 1 }),
  T(7, "Vacaciones", "ley", { goce_sueldo: 1, descuenta_vacaciones: 1 }),
  T(8, "Incapacidad IMSS", "ley"),
  T(11, "Día de descanso", "ley", { goce_sueldo: 1 }),
  T(12, "Suspensión disciplinaria", "ley"),
  T(9, "Sin Checar", "sistema", { captura: 0 }),
  T(3, "Inasistencia Justificada", "heredado", { captura: 0 }),
  T(10, "Visita al Médico", "heredado", { captura: 0 }),
  T(13, "Retardo Mayor a 30 minutos", "heredado", { captura: 0 }),
];
const parciales = tiposPermiso.filter((t) => ["entrada", "salida", "medio"].includes(t.rol))
  .map((t) => ({ id: t.id, nombre: t.nombre, alcance: t.alcance, goce: "con", horas: "reponen", cambia_al_aplicar: 1, captura: 1, rol: t.rol }));
const M = (id, nombre, goce, horas, cambia = 1, o = {}) => ({ id, nombre, global: true, goce, horas, cambia_al_aplicar: cambia, personalizado: false, oculto: false, ...o });
let motivos = [
  M(1, "Visita al médico", "sin", "reponen"), M(2, "Permiso personal", "sin", "reponen"), M(3, "Permiso laboral", "con", "pagan", 0),
  M(4, "Enfermedad", "sin", "reponen"), M(5, "Motivos familiares", "sin", "reponen"), M(6, "Trámite", "sin", "reponen", 1, { oculto: true }),
  M(7, "Escuela de los hijos", "sin", "reponen"), M(8, "Capacitación", "con", "pagan", 1, { personalizado: true }), M(9, "Otro", "sin", "reponen"),
  M(20, "Junta escolar", "sin", "descuentan", 1, { global: false }),
];
const visibles = () => motivos.filter((m) => !m.oculto);

// ——— Asistencias ———
const F = "2026-11-23";
const NORMAL = { tipo: "normal", nombre: "Día normal", pago: "" };
const horario = { entrada: "09:00", salida: "17:00", salida_comida: "13:00", regreso_comida: "14:00" };
const fila = (id, nombre, apellido, depto, o = {}) => ({
  id, id_empleado: id, id_empresa: 10, nombre, apellido_paterno: apellido, departamento: depto, fecha: F, zona_horaria: "America/Mexico_City",
  hora_entrada_programada: "09:00:00", hora_salida_programada: "17:00:00", hora_salida_comida_programada: "13:00:00",
  hora_regreso_comida_programada: "14:00:00", tipo_registro_nombre: "Sin Checar", id_tipo_permiso: 9, id_motivo_permiso: null, motivo_permiso: null,
  asistencia: 0, goce_sueldo: 0, entrada: null, salida: null, dia: NORMAL, checadas_vivas: 0, minutos_trabajados: null, minutos_comida: null,
  minutos_extra: 0, minutos_extra_por_autorizar: 0, motivos_resumen: "", estadoAsistencia: "Ausente", permiso_dia: null, acta: null,
  estado_calculado: { clave: "falta", texto: "Sin checar", atencion: true }, ...o,
});
const filas = () => [
  fila(601, "Diego", "León", "Administración"),
  fila(602, "Ana", "Ruiz", "Ventas"),
  fila(603, "Luis", "Mora", "Almacén"),
  fila(604, "Marta", "Díaz", "Contaduría", { entrada: `${F} 11:00:00`, salida: `${F} 17:00:00`, checadas_vivas: 3, minutos_trabajados: 300,
    minutos_comida: 60, asistencia: 1, goce_sueldo: 1, estadoAsistencia: "Presente", id_tipo_permiso: 1, tipo_registro_nombre: "Asistencia",
    estado_calculado: { clave: "just", texto: "Entró tarde con permiso" },
    permiso_dia: { id_tipo: 4, tipo: "Entrada tarde", id_motivo: 1, motivo: "Visita al médico", goce: "con", horas: "reponen", minutos: 120, alcance: "entrada" } }),
  fila(605, "Pablo", "Soto", "Producción", { id_tipo_permiso: 2, tipo_registro_nombre: "Inasistencia",
    estado_calculado: { clave: "falta", texto: "Inasistencia injustificada" }, acta: { id: 77, estatus: "borrador" } }),
  fila(606, "Raúl", "Vega", "Tienda", { id_tipo_permiso: 2, tipo_registro_nombre: "Inasistencia", id_motivo_permiso: 2, motivo_permiso: "Permiso personal",
    estado_calculado: { clave: "just", texto: "Inasistencia · Permiso personal · sin goce" } }),
  fila(607, "Sofía", "Ramos", "Tienda", { id_tipo_permiso: 10, tipo_registro_nombre: "Visita al Médico", estado_calculado: { clave: "just", texto: "Visita al Médico" } }),
  fila(608, "Armando", "González", "Almacén"),
];
const motivosReloj = { permisos: [], correccion: [{ clave: "olvido", nombre: "Olvidó checar" }, { clave: "reloj", nombre: "Falla del reloj" }] };

const pet = { estado: [], reloj: [], motivos: [], permisos: [] };
const errores = [];
let exito = false;
let sinMigracion = false;
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
    if (p.endsWith("/checador/tiposPermiso") && req.method() === "GET") {
      const lista = url.searchParams.get("captura") === "1" ? tiposPermiso.filter((t) => t.captura === 1) : tiposPermiso;
      return json({ tiposPermiso: lista, total: lista.length });
    }
    if (p.endsWith("/checador/motivos-permiso") && req.method() === "GET") {
      return json({ ok: true, motivos: url.searchParams.get("todos") === "1" ? motivos : visibles() });
    }
    if (p.endsWith("/checador/motivos-permiso") && req.method() === "POST") {
      const c = cuerpo(); pet.motivos.push({ metodo: "POST", cuerpo: c });
      motivos = [...motivos, M(30, c.nombre, c.goce, c.horas, c.cambia_al_aplicar, { global: false })];
      return json({ ok: true, motivo: { id: 30 } }, 201);
    }
    let m = /\/checador\/motivos-permiso\/(\d+)$/.exec(p);
    if (m && req.method() === "PUT") {
      const c = cuerpo(); const id = Number(m[1]);
      if (sinMigracion) return json({ ok: false, error: "Falta correr la migración", codigo: "SIN_MIGRACION" }, 503);
      pet.motivos.push({ metodo: "PUT", id, cuerpo: c });
      motivos = motivos.map((x) => (x.id !== id ? x : { ...x, ...("goce" in c ? { goce: c.goce } : {}), ...("horas" in c ? { horas: c.horas } : {}),
        ...("cambia_al_aplicar" in c ? { cambia_al_aplicar: c.cambia_al_aplicar } : {}), ...("oculto" in c ? { oculto: c.oculto } : {}),
        ...("activo" in c ? { oculto: !c.activo } : {}), personalizado: x.global ? true : x.personalizado }));
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
        horario, dia: NORMAL, registros: [], motivos: motivosReloj, autorizadores: [{ id: 3, nombre: "Laura Méndez (RH)" }],
        resumen: { minutos_trabajados: 0, minutos_comida: 0, minutos_extra: 0, minutos_extra_por_autorizar: 0, checadas_vivas: 0, abierto: false,
          estado: f.estado_calculado, estado_calculado: f.estado_calculado },
        permiso_dia: null, tipos_parciales: parciales, motivos_permiso: visibles(), migracion: true });
    }
    m = /\/checador\/asistencias\/(\d+)\/estado-dia$/.exec(p);
    if (m && req.method() === "PUT") {
      const c = cuerpo();
      pet.estado.push({ id: Number(m[1]), cuerpo: c });
      return json({ ok: true, asistencia: filas().find((x) => x.id === Number(m[1])),
        ...(c.id_tipo_permiso === 2 && !c.id_motivo ? { aviso: "Se creó un acta administrativa en borrador por la inasistencia injustificada." } : {}) });
    }
    if (p.endsWith("/checador/solicitudes-permiso/masivo") && req.method() === "POST") { pet.permisos.push(cuerpo()); return json({ ok: true, creados: 1 }); }
    if (p.endsWith("/checador/solicitudes-permiso")) return json({ data: [], total: 0, estadisticas: { total: 0, pendientes: 0, aprobados: 0, rechazados: 0, cancelados: 0 } });
    if (p.includes("eventos-checada")) return route.abort();
    return json({});
  });
}

// Texto visible de cada select cabe en su caja (también todas las opciones de los motivos).
async function selectsSinRecorte(raiz, etiqueta) {
  // (24/11/2026) Los desplegables son SelectConIconos (combobox de Radix): el texto elegido no debe quedar cortado.
  const malos = await raiz.evaluate((el) => [...el.querySelectorAll("[role=combobox][data-valor]")].filter((c) => c.offsetParent)
    .map((c) => [c.getAttribute("aria-label"), c.querySelector("[data-texto-valor]"), c]).filter(([, t, c]) => t && (t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().bottom > c.getBoundingClientRect().bottom + 1))
    .map(([a, t]) => `${a}: «${t.innerText}» (${t.scrollWidth} > ${t.clientWidth})`));
  assert.deepEqual(malos, [], `${etiqueta}: selects con texto recortado`);
}
async function letraCampos(raiz, etiqueta, min = 13, max = 14) {
  const malos = await raiz.evaluate((el, [a, b]) => [...el.querySelectorAll("[role=combobox],input:not([type=checkbox])")].filter((c) => c.offsetParent)
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
// Los dos selects del par: juntos (misma línea), mismo alto.
async function parAlineado(raiz, etiqueta) {
  const cajas = await raiz.locator("[data-que-paso-motivo] [role=combobox]").evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect()).map((r) => ({ top: r.top, h: r.height })));
  assert.equal(cajas.length, 2, `${etiqueta}: dos selects`);
  assert.ok(Math.abs(cajas[0].top - cajas[1].top) < 1 && Math.abs(cajas[0].h - cajas[1].h) < 1, `${etiqueta}: alineados y del mismo alto ${JSON.stringify(cajas)}`);
}
async function esperar(cond, texto) {
  for (let i = 0; i < 80; i++) { if (cond()) return; await dormir(100); }
  throw new Error(`No llegó: ${texto}`);
}
const textos = (combo) => textosOpciones(combo);
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

  // 1) Catálogo.
  await page.goto(base + "/panel/catalogos/tipos-registro", { waitUntil: "domcontentloaded" });
  const filaTipo = (id) => page.locator(`tr[data-tipo="${id}"]`);
  await filaTipo(4).waitFor({ timeout: 30000 });
  await page.locator("thead th", { hasText: "Goce y horas" }).waitFor({ timeout: 10000 });
  await filaTipo(12).waitFor({ timeout: 10000 });
  await dormir(800); // la tabla se vuelve a pedir cuando llega la empresa de la sesión
  await filaTipo(12).waitFor({ timeout: 10000 });
  const ids = await page.locator("tr[data-tipo]").evaluateAll((els) => els.map((e) => Number(e.dataset.tipo)));
  assert.deepEqual(ids.sort((a, b) => a - b), [1, 2, 4, 5, 6, 7, 8, 11, 12], `«Qué pasó» solo con tipos de captura: ${ids}`);
  assert.match(await filaTipo(4).innerText(), /⌚ Entrada tarde[\s\S]*Parte del día · al entrar[\s\S]*El pago lo decide el motivo[\s\S]*sin motivo: retardo sin permiso/);
  assert.match(await filaTipo(2).innerText(), /❌ Inasistencia[\s\S]*El pago lo decide el motivo[\s\S]*Sin motivo: injustificada, sin goce y acta en borrador/);
  for (const id of [1, 2, 4, 5, 6]) assert.equal(await filaTipo(id).getByRole("button").count(), 0, `tipo ${id}: el pago se configura en el motivo`);
  for (const id of [7, 8, 11, 12]) {
    assert.match(await filaTipo(id).innerText(), /🔒/, `tipo de ley ${id} con 🔒`);
    assert.equal(await filaTipo(id).getByRole("button").count(), 0, `tipo de ley ${id}: no se edita`);
  }
  const anteriores = page.locator("[data-tipos-anteriores]");
  assert.equal(await anteriores.evaluate((d) => d.open), false, "tipos anteriores plegados");
  assert.match(await anteriores.locator("summary").innerText(), /Tipos anteriores \(solo historial\)\s*· 3/);
  await anteriores.locator("summary").click();
  assert.deepEqual(await anteriores.locator("[data-tipo-anterior]").allInnerTexts().then((l) => l.map((t) => t.split("\n")[0])),
    ["Inasistencia Justificada", "Visita al Médico", "Retardo Mayor a 30 minutos"]);
  await anteriores.locator("summary").click();
  // Motivos con su pago.
  const sec = page.locator("[data-motivos]");
  await sec.locator('[data-motivo="Visita al médico"]').waitFor({ timeout: 10000 });
  const filaM = (n) => sec.locator(`[data-motivo="${n}"]`);
  assert.equal(await valorDe(filaM("Permiso laboral").getByLabel("Goce de Permiso laboral")), "con");
  assert.equal(await valorDe(filaM("Permiso laboral").getByLabel("Horas no trabajadas de Permiso laboral")), "pagan");
  assert.equal(await valorDe(filaM("Permiso laboral").getByLabel("Se cambia al aplicar Permiso laboral")), "0");
  assert.equal(await filaM("Capacitación").locator("[data-personalizado]").innerText(), "Personalizado");
  assert.equal(await filaM("Trámite").count(), 0, "oculto fuera de la lista");
  await elegir(filaM("Visita al médico").getByLabel("Goce de Visita al médico"), "con");
  await esperar(() => pet.motivos.length === 1, "PUT goce");
  assert.deepEqual(pet.motivos[0], { metodo: "PUT", id: 1, cuerpo: { goce: "con" } });
  await filaM("Visita al médico").locator("[data-personalizado]").waitFor({ timeout: 5000 });
  await elegir(filaM("Visita al médico").getByLabel("Horas no trabajadas de Visita al médico"), "descuentan");
  await esperar(() => pet.motivos.length === 2, "PUT horas");
  assert.deepEqual(pet.motivos[1], { metodo: "PUT", id: 1, cuerpo: { horas: "descuentan" } });
  await elegir(filaM("Visita al médico").getByLabel("Horas no trabajadas de Visita al médico"), "reponen");
  await esperar(() => pet.motivos.length === 3, "PUT horas de vuelta");
  await elegir(filaM("Visita al médico").getByLabel("Goce de Visita al médico"), "sin");
  await esperar(() => pet.motivos.length === 4, "PUT goce de vuelta");
  await elegir(filaM("Escuela de los hijos").getByLabel("Se cambia al aplicar Escuela de los hijos"), "0");
  await esperar(() => pet.motivos.length === 5, "PUT se cambia");
  assert.deepEqual(pet.motivos[4], { metodo: "PUT", id: 7, cuerpo: { cambia_al_aplicar: 0 } });
  const nuevo = sec.locator("[data-motivo-nuevo]");
  await nuevo.getByLabel("Nuevo motivo", { exact: true }).fill("Boda");
  await elegir(nuevo.getByLabel("Goce del nuevo motivo"), "con");
  await nuevo.getByRole("button", { name: "Agregar" }).click();
  await esperar(() => pet.motivos.length === 6, "POST motivo");
  assert.deepEqual(pet.motivos[5], { metodo: "POST", cuerpo: { nombre: "Boda", goce: "con", horas: "reponen", cambia_al_aplicar: 1 } });
  await filaM("Boda").waitFor({ timeout: 10000 });
  await filaM("Junta escolar").getByRole("button", { name: "Ocultar Junta escolar" }).click();
  await esperar(() => pet.motivos.length === 7, "PUT ocultar propio");
  assert.deepEqual(pet.motivos[6], { metodo: "PUT", id: 20, cuerpo: { activo: false } });
  await filaM("Junta escolar").waitFor({ state: "detached", timeout: 10000 });
  const ocultos = sec.locator("[data-motivos-ocultos]");
  await ocultos.locator("summary").click();
  await ocultos.locator("li", { hasText: "Trámite" }).getByRole("button", { name: "Mostrar" }).click();
  await esperar(() => pet.motivos.length === 8, "PUT mostrar global");
  assert.deepEqual(pet.motivos[7], { metodo: "PUT", id: 6, cuerpo: { oculto: false } });
  await filaM("Trámite").waitFor({ timeout: 10000 });
  // Sin la migración, configurar un motivo general responde 503 SIN_MIGRACION: aviso corto.
  sinMigracion = true;
  await elegir(filaM("Enfermedad").getByLabel("Goce de Enfermedad"), "con");
  await page.getByText("Aún no se puede configurar: falta aplicar la actualización de la base de datos.").waitFor({ timeout: 5000 });
  sinMigracion = false;
  await letraCampos(sec, "motivos");
  await selectsSinRecorte(sec, "motivos 1440");
  await sinDesborde(page.locator("html"), "catálogo 1440");
  await celdasSinRecorte(page, "catálogo 1440");
  await foto(page, "catalogo", page.locator("main").first());
  await foto(page, "catalogo-motivos", sec);

  // 2) Asistencias: fila sin checadas con los dos selects.
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Registros" }).click();
  const filaDe = (n) => page.locator("tr", { hasText: n }).first();
  await filaDe("Diego León").waitFor({ timeout: 30000 });
  const qpDiego = page.getByLabel("Qué pasó de Diego León");
  // (24/11/2026) Los días de ley llevan el candado como icono (SelectConIconos), ya no « 🔒» en el texto.
  assert.deepEqual(await textos(qpDiego), ["❌ Sin checar", "Asistencia", "Inasistencia", "Entrada tarde", "Salida temprano", "Salir en medio turno",
    "Vacaciones", "Incapacidad IMSS", "Día de descanso", "Suspensión disciplinaria"], "sin tipos ocultos ni del sistema");
  assert.equal(await page.getByLabel("Motivo de Diego León").count(), 0, "sin tipo elegido no hay motivo");
  // Solo lectura: «⌚ Entrada tarde · Visita al médico · 2 h · las repone».
  assert.equal(await filaDe("Marta Díaz").locator("[data-estado-motivo]").innerText(), "⌚ Entrada tarde · Visita al médico · 2 h · las repone");
  // Guardados: Pablo (injustificada, con su acta) y Raúl (Permiso personal, sin goce).
  assert.equal(await valorDe(page.getByLabel("Qué pasó de Pablo Soto")), "2");
  assert.equal(await valorDe(page.getByLabel("Motivo de Pablo Soto")), "");
  assert.equal(await page.getByLabel("Motivo de Pablo Soto").innerText(), "Injustificada");
  assert.equal(await filaDe("Pablo Soto").locator("[data-acta-enlace]").innerText(), "📄 Acta en borrador");
  assert.equal(await page.getByLabel("Motivo de Raúl Vega").innerText(), "Permiso personal");
  assert.equal(await filaDe("Raúl Vega").locator("[data-goce-guardado]").innerText(), "Sin goce");
  // Registro viejo con un tipo oculto: se ve tal cual.
  assert.equal(await page.getByLabel("Qué pasó de Sofía Ramos").innerText(), "Visita al Médico");
  await parAlineado(filaDe("Raúl Vega"), "fila Raúl");
  // La columna fija «Estado · motivo» no crece de más (la tabla ya se desplaza a lo ancho con sus columnas fijas).
  const anchoEstado = await page.locator("thead th", { hasText: "Estado · motivo" }).evaluate((th) => th.getBoundingClientRect().width);
  assert.ok(anchoEstado <= 320, `columna Estado · motivo de ${anchoEstado}px`);
  await sinDesborde(page.locator("html"), "asistencias 1440");
  await celdasSinRecorte(page, "asistencias 1440");
  await selectsSinRecorte(page.locator("tbody"), "asistencias 1440");
  const bordes = await page.locator("[data-estado-fila], [data-estado-fila] [data-que-paso-motivo] [role=combobox]").evaluateAll((els) =>
    els.filter((e) => e.offsetParent).map((e) => getComputedStyle(e).borderTopWidth));
  assert.ok(bordes.every((b) => b === "0px"), `sin cuadros alrededor del estado (${bordes.join(",")})`);

  // Ejemplo 1: Ana · Inasistencia sin motivo → injustificada; aviso del acta; PUT solo con el tipo.
  await elegir(page.getByLabel("Qué pasó de Ana Ruiz"), "2");
  const pendA = filaDe("Ana Ruiz").locator("[data-estado-pendiente]");
  await pendA.waitFor();
  assert.equal(await valorDe(page.getByLabel("Motivo de Ana Ruiz")), "");
  assert.deepEqual(await textos(page.getByLabel("Motivo de Ana Ruiz")), ["Injustificada", "Visita al médico", "Permiso personal", "Permiso laboral",
    "Enfermedad", "Motivos familiares", "Trámite", "Escuela de los hijos", "Capacitación", "Boda", "Otro…"]);
  assert.match(await pendA.locator("[data-aviso-acta]").innerText(), /se creará un acta en borrador/);
  assert.equal(await pendA.locator("[data-goce-fijo]").innerText(), "🔒 Sin goce");
  await parAlineado(filaDe("Ana Ruiz"), "fila Ana");
  await letraCampos(filaDe("Ana Ruiz"), "fila Ana");
  await selectsSinRecorte(filaDe("Ana Ruiz"), "fila Ana");
  await foto(page, "fila", page.locator("table").first());
  await pendA.getByRole("button", { name: "OK" }).click();
  await esperar(() => pet.estado.length === 1, "PUT inasistencia injustificada");
  assert.deepEqual(pet.estado[0], { id: 602, cuerpo: { id_tipo_permiso: 2 } });
  await page.getByText("Se creó un acta administrativa en borrador por la inasistencia injustificada.").waitFor({ timeout: 5000 });

  // Ejemplo 2: Luis · Inasistencia · Permiso personal → goce del motivo (sin goce, se puede cambiar).
  await elegir(page.getByLabel("Qué pasó de Luis Mora"), "2");
  await elegir(page.getByLabel("Motivo de Luis Mora"), { label: "Permiso personal" });
  const pendL = filaDe("Luis Mora").locator("[data-estado-pendiente]");
  assert.equal(await valorDe(pendL.getByLabel("Goce del día")), "sin", "goce del motivo");
  assert.equal(await pendL.locator("[data-aviso-acta]").count(), 0, "con motivo no hay acta");
  await letraCampos(filaDe("Luis Mora"), "fila Luis");
  await selectsSinRecorte(filaDe("Luis Mora"), "fila Luis");
  await pendL.getByRole("button", { name: "OK" }).click();
  await esperar(() => pet.estado.length === 2, "PUT inasistencia justificada");
  assert.deepEqual(pet.estado[1], { id: 603, cuerpo: { id_tipo_permiso: 2, id_motivo: 2, goce: "sin" } });

  // 3) Reloj sin checadas: el mismo par; «Inasistencia · Permiso laboral» con goce 🔒 se guarda y cierra.
  await page.getByRole("button", { name: "Abrir el reloj de Armando González" }).click();
  const dlgA = page.getByRole("dialog", { name: /Armando González/ });
  const qp = dlgA.locator("[data-reloj-que-paso]");
  await qp.waitFor({ timeout: 10000 });
  await elegir(qp.getByLabel("Qué pasó"), "2");
  await elegir(qp.getByLabel("Motivo"), { label: "Permiso laboral" });
  assert.equal(await qp.locator("[data-goce-fijo]").innerText(), "🔒 Con goce", "Permiso laboral no se cambia al aplicar");
  await parAlineado(qp, "reloj vacío");
  await letraCampos(qp, "reloj vacío");
  await selectsSinRecorte(dlgA, "reloj vacío");
  await foto(page, "reloj-vacio", dlgA);
  await qp.getByRole("button", { name: "OK" }).click();
  await esperar(() => pet.estado.length === 3, "PUT desde el reloj");
  assert.deepEqual(pet.estado[2], { id: 608, cuerpo: { id_tipo_permiso: 2, id_motivo: 3 } });
  await dlgA.waitFor({ state: "detached", timeout: 10000 });

  // 4) Reloj con permiso: fila «Entrada tarde» → reloj con el tipo puesto; entra 11:00 por «Visita al médico».
  await elegir(page.getByLabel("Qué pasó de Diego León"), "4");
  const dlg = page.getByRole("dialog", { name: /Diego León/ });
  const perm = dlg.locator("[data-permiso-dia]");
  await perm.waitFor({ timeout: 10000 });
  assert.equal(await valorDe(perm.getByLabel("Qué pasó")), "4");
  assert.equal(await perm.getByLabel("Motivo").innerText(), "Sin permiso");
  await dlg.getByRole("button", { name: "Cargar su horario normal" }).click();
  await dlg.locator('[data-renglon="1"]').getByLabel("Entrada").fill("11:00");
  assert.match(await perm.innerText(), /Sin motivo no hay permiso/);
  assert.match(await dlg.locator("[data-estado-calculado]").innerText(), /Retardo/);
  await elegir(perm.getByLabel("Motivo"), { label: "Visita al médico" });
  assert.match(await perm.locator("[data-permiso-calculo]").innerText(), /^2 h no trabajadas · se reponen\s*Día con goce · 2 h a su cuenta de horas$/);
  assert.equal(await perm.locator("[data-goce-fijo]").innerText(), "🔒 Con goce");
  assert.match(await dlg.locator("[data-estado-calculado]").innerText(), /Entró tarde con permiso/);
  await parAlineado(perm, "permiso del día");
  await letraCampos(perm, "permiso del día");
  await selectsSinRecorte(dlg, "reloj con permiso");
  await sinDesborde(dlg.locator(".overflow-y-auto").first(), "reloj 1440");
  await foto(page, "reloj-permiso", dlg);
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

  // 5) Permisos (RH): el mismo par.
  await page.goto(base + "/panel/permisos", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Nuevo permiso/ }).first().click();
  const dp = page.getByRole("dialog");
  const empresaSel = dp.getByRole("combobox").first();
  await empresaSel.waitFor({ timeout: 15000 });
  if (!/Empresa prueba/.test(await empresaSel.innerText())) { await empresaSel.click(); await page.getByRole("option", { name: "Empresa prueba" }).click(); }
  assert.deepEqual(await textos(dp.getByLabel("Qué pasó")), ["Elige qué pasó…", "Inasistencia", "Entrada tarde", "Salida temprano", "Salir en medio turno"]);
  await elegir(dp.getByLabel("Qué pasó"), "2");
  await dp.getByText("Diego León").waitFor({ timeout: 10000 });
  await dp.locator("li", { hasText: "Diego León" }).getByRole("checkbox").check();
  const [ini, fin] = proximaSemana();
  await dp.locator('input[type="date"]').nth(0).fill(ini);
  await dp.locator('input[type="date"]').nth(1).fill(fin);
  await dp.getByRole("button", { name: "Guardar" }).click();
  await dp.getByText("Elige el motivo del permiso.").waitFor({ timeout: 5000 });
  await elegir(dp.getByLabel("Motivo"), { label: "Permiso personal" });
  assert.equal(await valorDe(dp.getByLabel("Goce del día")), "sin", "goce del motivo");
  await parAlineado(dp, "permisos");
  await letraCampos(dp.locator("[data-que-paso-permiso]"), "permisos");
  await foto(page, "permisos", dp);
  await dp.getByRole("button", { name: "Guardar" }).click();
  await esperar(() => pet.permisos.length === 1, "POST permiso");
  assert.deepEqual(pet.permisos[0], { ids_empleados: [601], id_tipo_permiso: 2, fecha_inicio: ini, fecha_fin: fin, motivo: null, id_motivo_permiso: 2, goce: "sin" });
  // Salida temprano · Permiso laboral (no se cambia al aplicar): horas 🔒 y sin goce que elegir.
  await page.getByRole("button", { name: /Nuevo permiso/ }).first().click();
  const dp2 = page.getByRole("dialog");
  await elegir(dp2.getByLabel("Qué pasó"), "5");
  await elegir(dp2.getByLabel("Motivo"), { label: "Permiso laboral" });
  assert.equal(await dp2.getByLabel("Horas no trabajadas").isDisabled(), true);
  assert.equal(await dp2.getByLabel("Goce del día").count(), 0, "parcial con motivo: día con goce");
  await page.keyboard.press("Escape");

  // 6) Celular 390.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/panel/catalogos/tipos-registro", { waitUntil: "domcontentloaded" });
  await filaTipo(4).waitFor({ timeout: 30000 });
  await page.locator('[data-motivos] [data-motivo="Visita al médico"]').waitFor({ timeout: 10000 });
  await sinDesborde(page.locator("html"), "catálogo 390");
  await selectsSinRecorte(page.locator("[data-motivos]"), "motivos 390");
  await foto(page, "movil-catalogo", page.locator("[data-motivos]"));
  await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
  await page.getByText("Marta Díaz").first().waitFor({ timeout: 30000 });
  await sinDesborde(page.locator("html"), "asistencias 390");
  const lineas = await page.locator("[data-permiso-movil]").allInnerTexts();
  for (const t of ["⌚ Entrada tarde · Visita al médico · 2 h · las repone", "❌ Inasistencia injustificada", "📝 Inasistencia · Permiso personal · sin goce"]) {
    assert.ok(lineas.includes(t), `lista móvil: «${t}» en ${JSON.stringify(lineas)}`);
  }
  const cortadas = await page.locator("[data-permiso-movil]").evaluateAll((els) => els.filter((e) => e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1).length);
  assert.equal(cortadas, 0, "líneas sin cortar");
  await foto(page, "movil-lista");
  await page.getByText("Luis Mora").first().click();
  const qpM = page.getByLabel("Qué pasó de Luis Mora");
  await qpM.waitFor({ timeout: 10000 });
  await elegir(qpM, "2");
  const estM = page.locator("[data-estado-movil]");
  await elegir(estM.getByLabel("Motivo de Luis Mora"), { label: "Escuela de los hijos" });
  const bajos = await estM.evaluate((el) => [...el.querySelectorAll("[data-estado-fila] select,[data-estado-fila] button")].filter((c) => c.offsetParent && c.getBoundingClientRect().height < 43.5).map((c) => c.getAttribute("aria-label") || c.textContent));
  assert.deepEqual(bajos, [], "controles de 44 px en celular");
  await letraCampos(estM.locator("[data-estado-fila]"), "fila móvil", 16, 16);
  await selectsSinRecorte(estM, "fila móvil");
  await sinDesborde(estM, "detalle móvil");
  await foto(page, "movil", estM);
  await estM.getByRole("button", { name: "OK" }).click();
  await esperar(() => pet.estado.length === 4, "PUT desde el celular");
  assert.deepEqual(pet.estado[3], { id: 603, cuerpo: { id_tipo_permiso: 2, id_motivo: 7 } }, "Escuela de los hijos ya no se cambia al aplicar");

  assert.deepEqual(errores, [], "sin errores de JavaScript");
  exito = true;
  console.log("OK · catálogo («Qué pasó» de captura, ley 🔒, «Tipos anteriores» plegado; motivos con goce/horas/se cambia editables → PUT/POST exactos, "
    + "Personalizado, ocultar/mostrar) · fila con los dos selects alineados y sin cuadro · Inasistencia sin motivo → { id_tipo_permiso: 2 } + aviso de acta · "
    + "Inasistencia · Permiso personal → id_motivo + goce · tipo oculto guardado se ve tal cual · reloj vacío con el par (Permiso laboral 🔒) · "
    + "Entrada tarde · Visita al médico → 2 h se reponen → permiso_dia exacto · Permisos con el par → POST exacto · 1440 y 390 sin desbordes ni recortes · sin errores de JS");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
