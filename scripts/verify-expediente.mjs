// Verificación en navegador del expediente por etapas y del tablero de cumplimiento (28/11/2026) con el backend simulado
// en memoria, a 1440 y 390 px:
//  1) /panel/expediente: porcentaje general, la persona más incompleta primero, filtro «Solo incompletos» y «Descargar
//     Excel» (pide formato=xlsx y baja el archivo).
//  2) /panel/expediente/20: Ingreso y Durante la relación con sus pasos; Salida cerrada con «Empezar la salida»;
//     «Marcar como hecho» (empresa, estado) y luego «Marcado a mano por…»; «No aplica» pide el motivo; subir se abre EN LA
//     PÁGINA y se cierra con Esc; un documento en plazo no tiene «Depurar» y dice hasta cuándo se conserva; uno fuera de
//     plazo se depura confirmando en la página ({ confirmar: true }); «Exportar expediente (ZIP)» baja el ZIP.
//  En cada pantalla: letra ≥ 16 px (17 px a 390), títulos en 700, botones ≥ 48 px y el principal ≥ 56 px, texto secundario
//  #4B5563, sin degradados, sin ventanas (role=dialog) y sin desborde horizontal.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-expediente.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (tipo) => { const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ tipo_usuario: tipo, exp: Math.floor(Date.now() / 1000) + 3600 })}`; return `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`; };
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const captura = (pg, nombre) => (process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true }) : null);

// ── Backend simulado (datos inventados) ─────────────────────────────────────────────────────────────────────────────
const G_REL = { tipo: "contrato", fuente: "Art. 804 fr. I y penúltimo párrafo LFT", por_confirmar: false, hasta: null, mientras_relacion: true, en_plazo: true, puede_depurarse: false };
const G_LIBRE = { tipo: "sin_plazo", fuente: "La ley no fija un plazo", por_confirmar: false, hasta: null, mientras_relacion: false, en_plazo: false, puede_depurarse: true };
const paso = (clave, etapa, nombre, estado, extra = {}) => ({ clave, etapa, nombre, estado, nivel: "ley", fuente: "Art. 25 fr. I LFT", paso: etapa !== "relacion", documento: true,
  origen: estado === "cumplido" ? "documento" : null, motivo: null, marca: null, sugerir_vencimiento: false, ...extra });
function persona(estado) {
  const nss = estado.nssMarcado
    ? paso("nss", "ingreso", "Número de seguridad social (NSS)", "cumplido", { fuente: "Art. 15 fr. I LSS", origen: "manual", marca: { estado: "hecho", por: "RH Demo", en: "2026-11-28 10:15" } })
    : paso("nss", "ingreso", "Número de seguridad social (NSS)", "falta", { fuente: "Art. 15 fr. I LSS" });
  const docs = [
    { id: 5, nombre_documento: "Contrato firmado", categoria_nombre: "Contractual", estatus: "NO_VENCE", estatus_manual: "ACTIVO", version: 1, origen: "MANUAL", created_at: "2026-01-10", archivo_tamano_bytes: 120000, guarda: G_REL, carpeta: "contrato" },
    ...(estado.depurado ? [] : [{ id: 6, nombre_documento: "Diploma de bachillerato", categoria_nombre: "Académico", estatus: "NO_VENCE", estatus_manual: "ACTIVO", version: 1, origen: "MANUAL", created_at: "2026-01-10", guarda: G_LIBRE, carpeta: "datos" }]),
  ];
  const carpetas = (etapa, lista) => lista.map(([clave, nombre]) => ({ clave, etapa, nombre, documentos: docs.filter((d) => d.carpeta === clave), vinculos: [] }));
  const ingreso = carpetas("ingreso", [["datos", "Datos personales y estudios"], ["contrato", "Contrato y avisos firmados"], ["imss_fiscal", "IMSS y fiscal"], ["entregas", "Inducción y entregas"]]);
  const relacion = carpetas("relacion", [["recibos", "Recibos de nómina"], ["asistencias", "Asistencias"], ["vacaciones", "Vacaciones y permisos"]]);
  relacion[0].vinculos = [{ tipo: "recibo_nomina", id: 1, titulo: "Recibo de nómina 01/11/2026 al 15/11/2026", fecha: "2026-11-15", origen: "Nómina", detalle: "Firmado por la persona", con_archivo: true }];
  relacion[1].vinculos = [{ tipo: "asistencias", id: 20, titulo: "Registro de asistencias en ADAMIA (240 días, 10/01/2026 al 27/11/2026)", fecha: "2026-11-27", origen: "Asistencias", con_archivo: false }];
  const activosEntregados = estado.noAplica
    ? paso("activos_entregados", "ingreso", "Activos y uniformes entregados", "no_aplica", { nivel: "recomendado", documento: false, origen: "manual", marca: { estado: "no_aplica", por: "RH Demo", en: "2026-11-28", nota: estado.noAplica } })
    : paso("activos_entregados", "ingreso", "Activos y uniformes entregados", "falta", { nivel: "recomendado", documento: false, fuente: "Buena práctica" });
  return {
    persona: { id_empleado: 20, id_empresa: 7, nombre_completo: "Ana Demo Ejemplo", puesto: "Cajera", departamento: "Ventas", sucursal: "Centro", activo: true, fecha_ingreso: "2024-01-10", fecha_baja: null },
    salida: null, salida_visible: false, migracion: true, puede_editar: true, puede_exportar: true, no_disponibles: [], avisos: [],
    resumen: { total: 10, cumplidos: estado.nssMarcado ? 7 : 6, faltan: estado.nssMarcado ? 3 : 4, por_vencer: 0, vencidos: 0, porcentaje: estado.nssMarcado ? 70 : 60, recomendados_faltan: 3 },
    etapas: [
      { clave: "ingreso", nombre: "Ingreso", zip: "01 Ingreso", visible: true, carpetas: ingreso,
        pasos: [paso("curp", "ingreso", "CURP", "falta"), nss, paso("contrato", "ingreso", "Contrato individual de trabajo firmado", "cumplido", { fuente: "Arts. 24, 25 y 804 fr. I LFT" }), activosEntregados] },
      { clave: "relacion", nombre: "Durante la relación", zip: "02 Relación laboral", visible: true, carpetas: relacion,
        pasos: [paso("recibos_nomina", "relacion", "Recibos de nómina", "cumplido", { fuente: "Art. 804 fr. II LFT", origen: "vinculado", vinculo: { titulo: "Recibo de nómina 01/11/2026" } })] },
      { clave: "salida", nombre: "Salida", zip: "03 Salida", visible: false, carpetas: [], pasos: [] },
    ],
    bitacora: [{ fecha: "2026-11-28 09:00", accion: "CARGADO", accion_texto: "Subió", documento: "Contrato firmado", usuario: "RH Demo" }],
  };
}
const CUMPLIMIENTO = {
  resumen: { personas: 2, porcentaje: 55, completos: 0, con_faltantes: 2, vencidos: 1, por_vencer: 0 },
  personas: [
    { id_empleado: 22, nombre: "Carla Prueba Muestra de la Sierra Alta", puesto: "Cajera", departamento: "Ventas", sucursal: "Norte", activo: true, total: 6, cumplidos: 2, faltan: 4, vencidos: 0, por_vencer: 0,
      porcentaje: 33, faltan_nombres: ["CURP", "RFC o constancia de situación fiscal", "Número de seguridad social (NSS)", "Alta en el IMSS"], vencidos_nombres: [], por_vencer_nombres: [] },
    { id_empleado: 20, nombre: "Ana Demo Ejemplo", puesto: "Cajera", departamento: "Ventas", sucursal: "Centro", activo: true, total: 10, cumplidos: 6, faltan: 3, vencidos: 1, por_vencer: 0, porcentaje: 60,
      faltan_nombres: ["CURP", "NSS", "Aviso de privacidad firmado"], vencidos_nombres: ["Comprobante de aguinaldo"], por_vencer_nombres: [] },
  ],
  filtros: { estado: "activos", departamentos: ["Ventas"], sucursales: ["Centro", "Norte"] }, no_disponibles: [], avisos: [], migracion: true,
};
const REGLAS = { claves_documento: [
  { clave: "curp", nombre: "CURP", carpeta: "datos" }, { clave: "identificacion", nombre: "Identificación oficial (INE o pasaporte)", carpeta: "datos" },
  { clave: "contrato", nombre: "Contrato individual de trabajo firmado", carpeta: "contrato" }, { clave: "alta_imss", nombre: "Alta en el IMSS", carpeta: "imss_fiscal" },
] };

function nuevoEstado() { return { nssMarcado: false, noAplica: null, depurado: false, pasos: [], borrados: [], exportes: [], consultas: [] }; }
let estado = nuevoEstado();
async function rutas(ctx, usuario) {
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Expose-Headers": "content-disposition" };
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    const ok = (json, status = 200) => route.fulfill({ status, json, headers: cors });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return ok({ user: usuario() });
    if (p === "/checador/expediente/reglas") return ok(REGLAS);
    if (p === "/checador/expediente/persona/20" && req.method() === "GET") { assert.equal(url.searchParams.get("empresa"), "7"); return ok(persona(estado)); }
    if (p.startsWith("/checador/expediente/persona/20/pasos/")) {
      const b = req.postDataJSON();
      estado.pasos.push({ clave: p.split("/").at(-1), ...b });
      if (b.estado === "hecho") estado.nssMarcado = true;
      if (b.estado === "no_aplica") estado.noAplica = b.nota;
      return ok({ ok: true });
    }
    if (p === "/checador/expediente/persona/20/exportar") {
      estado.exportes.push(url.searchParams.get("modo"));
      return route.fulfill({ status: 200, body: Buffer.from("PK\x03\x04zip-de-prueba"), headers: { ...cors, "content-type": "application/zip", "content-disposition": 'attachment; filename="Expediente-Emp-20-2026-11-28.zip"' } });
    }
    if (p === "/checador/expediente/documentos/doc/6" && req.method() === "DELETE") {
      estado.borrados.push(req.postDataJSON());
      estado.depurado = true;
      return ok({ message: "Documento depurado", depurados: [6] });
    }
    if (p === "/checador/expediente/empresa/7/cumplimiento") {
      estado.consultas.push(url.search);
      const datos = url.searchParams.get("incompletos") === "1" ? CUMPLIMIENTO : CUMPLIMIENTO;
      return ok(datos);
    }
    if (p === "/checador/expediente/empresa/7/cumplimiento/exportar") {
      estado.exportes.push(`cumplimiento:${url.searchParams.get("formato")}`);
      return route.fulfill({ status: 200, body: Buffer.from("PK\x03\x04xlsx"), headers: { ...cors, "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": 'attachment; filename="Cumplimiento-expediente-Folio-7-2026-11-28.xlsx"' } });
    }
    return ok([]);
  });
}

// Letra, títulos, botones, color secundario, degradados, ventanas y desborde dentro de `raiz`.
async function legible(pagina, raiz, { ancho, nombre }) {
  const minLetra = ancho <= 390 ? 17 : 16;
  const r = await pagina.evaluate(({ raiz, minLetra }) => {
    const el = document.querySelector(raiz);
    if (!el) return { falta: true };
    const visibles = [...el.querySelectorAll("*")].filter((n) => n.getClientRects().length && getComputedStyle(n).visibility !== "hidden");
    const textos = visibles.filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && !n.closest(".sr-only") && n.tagName !== "OPTION");
    return {
      chicos: textos.filter((n) => parseFloat(getComputedStyle(n).fontSize) < minLetra - 0.01).map((n) => `${n.tagName}:${n.textContent.trim().slice(0, 30)}:${getComputedStyle(n).fontSize}`),
      titulos: [...el.querySelectorAll("h1,h2,h3")].filter((h) => h.getClientRects().length).map((h) => getComputedStyle(h).fontWeight),
      botones: [...el.querySelectorAll("button, a[class*='min-h'], input:not([type=checkbox]), select, summary")].filter((b) => b.getClientRects().length)
        .map((b) => [b.textContent.trim().slice(0, 30) || b.id, Math.round(b.getBoundingClientRect().height)]).filter(([, h]) => h < 48),
      secundario: [...el.querySelectorAll("[class*='text-[#4B5563]']")].filter((n) => n.getClientRects().length && String(n.className).split(/\s+/).includes("text-[#4B5563]")).map((n) => getComputedStyle(n).color).filter((c) => c !== "rgb(75, 85, 99)"),
      degradados: visibles.filter((n) => getComputedStyle(n).backgroundImage.includes("gradient")).length,
      ventanas: document.querySelectorAll("[role=dialog], [role=alertdialog]").length,
      ancho: document.documentElement.scrollWidth,
    };
  }, { raiz, minLetra });
  assert.ok(!r.falta, `${nombre}: no apareció ${raiz}`);
  assert.deepEqual(r.chicos, [], `${nombre}: letra de ${minLetra} px o más`);
  assert.ok(r.titulos.length && r.titulos.every((w) => w === "700"), `${nombre}: títulos en 700 (${r.titulos})`);
  assert.deepEqual(r.botones, [], `${nombre}: botones y campos de 48 px o más`);
  assert.deepEqual(r.secundario, [], `${nombre}: texto secundario #4B5563`);
  assert.equal(r.degradados, 0, `${nombre}: sin degradados`);
  assert.equal(r.ventanas, 0, `${nombre}: sin ventanas flotantes`);
  assert.ok(r.ancho <= ancho, `${nombre}: sin desborde horizontal (${r.ancho} > ${ancho})`);
}
const alto = async (loc) => Math.round((await loc.boundingBox()).height);

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/")).status) break; } catch { /* arrancando */ } if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];
  const dueno = () => ({ id_usuario: 1, tipo_usuario: "Recruiter", nombre: "RH Demo", empresas: [7], empresas_detalle: [{ id_empresa: 7, nombre: "Comercializadora Demo" }] });

  for (const [ancho, altoVentana] of [[1440, 900], [390, 844]]) {
    const sufijo = ancho === 390 ? "-390" : "";
    estado = nuevoEstado();
    const ctx = await browser.newContext({ viewport: { width: ancho, height: altoVentana }, locale: "es-MX", acceptDownloads: true });
    await ctx.addCookies([{ name: "token", value: jwt("Recruiter"), url: base }]);
    await rutas(ctx, dueno);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errores.push(e.message));

    // 1) Tablero de cumplimiento.
    await page.goto(base + "/panel/expediente", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Expediente y cumplimiento" }).waitFor({ timeout: 30000 });
    const tablero = page.locator("[data-pagina=expediente-tablero]");
    await tablero.getByText("55 % general").waitFor();
    const orden = await tablero.locator("[data-persona]").evaluateAll((n) => n.map((x) => x.dataset.persona));
    assert.deepEqual(orden, ["22", "20"], "la más incompleta primero");
    await tablero.getByText(/Falta: CURP, RFC/).first().waitFor();
    assert.ok(await alto(page.getByRole("button", { name: "Descargar Excel" })) >= 56, "botón principal ≥ 56 px");
    await legible(page, "[data-pagina=expediente-tablero]", { ancho, nombre: `tablero ${ancho}` });
    await captura(page, `expediente-tablero${sufijo}`);
    await page.getByLabel("Solo incompletos").check();
    await page.waitForFunction(() => true);
    await dormir(400);
    assert.ok(estado.consultas.some((q) => q.includes("incompletos=1")), "el filtro llega al servidor");
    const [excel] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar Excel" }).click()]);
    assert.match(excel.suggestedFilename(), /\.xlsx$/);
    assert.ok(estado.exportes.includes("cumplimiento:xlsx"));
    await tablero.getByRole("link", { name: "Ana Demo Ejemplo" }).click();
    await page.waitForURL("**/panel/expediente/20?empresa=7");

    // 2) Expediente por etapas.
    await page.getByRole("heading", { name: "Expediente de Ana Demo Ejemplo" }).waitFor({ timeout: 30000 });
    const exp = page.locator("[data-pagina=expediente-persona]");
    await exp.locator("[data-etapa=ingreso]").waitFor();
    await exp.locator("[data-etapa=relacion]").getByText("Recibo de nómina 01/11/2026 al 15/11/2026").waitFor();
    await exp.locator("[data-etapa=salida]").getByRole("button", { name: "Empezar la salida" }).waitFor();
    assert.ok(await alto(page.getByRole("button", { name: "Exportar expediente (ZIP)" })) >= 56, "exportar ≥ 56 px");
    // En plazo: sin «Depurar» y con su plazo; fuera de plazo: «Depurar».
    const contrato = exp.locator("[data-documento='5']");
    await contrato.getByText(/Se conserva mientras dure la relación laboral/).waitFor();
    assert.equal(await contrato.getByRole("button", { name: "Depurar" }).count(), 0, "en plazo no se depura");
    await legible(page, "[data-pagina=expediente-persona]", { ancho, nombre: `expediente ${ancho}` });
    await captura(page, `expediente-persona${sufijo}`);

    // Subir se abre en la página y se cierra con Esc.
    await exp.locator("[data-paso=curp]").getByRole("button", { name: "Subir documento" }).click();
    const form = exp.locator("[data-paso=curp] [data-form-archivo]");
    await form.waitFor();
    assert.equal(await page.locator("[role=dialog]").count(), 0, "no es una ventana");
    await legible(page, "[data-pagina=expediente-persona]", { ancho, nombre: `subir ${ancho}` });
    await page.keyboard.press("Escape");
    await form.waitFor({ state: "detached" });

    // Marcar NSS como hecho → «Marcado a mano por RH Demo».
    await exp.locator("[data-paso=nss]").getByRole("button", { name: "Marcar como hecho" }).click();
    await exp.locator("[data-paso=nss]").getByText(/Marcado a mano por RH Demo el 28\/11\/2026 10:15/).waitFor();
    assert.deepEqual(estado.pasos[0], { clave: "nss", empresa_id: 7, estado: "hecho", nota: null });

    // «No aplica» pide motivo.
    await exp.locator("[data-paso=activos_entregados]").getByRole("button", { name: "No aplica" }).click();
    assert.equal(await page.getByRole("button", { name: "Guardar «no aplica»" }).isDisabled(), true, "sin motivo no se guarda");
    await page.getByLabel("¿Por qué no aplica?").fill("Trabaja desde casa con su propio equipo");
    await page.getByRole("button", { name: "Guardar «no aplica»" }).click();
    await exp.locator("[data-paso=activos_entregados]").getByText(/Marcado «no aplica» por RH Demo/).waitFor();
    assert.equal(estado.pasos[1].nota, "Trabaja desde casa con su propio equipo");

    // Depurar (fuera de plazo) se confirma en la página.
    const diploma = exp.locator("[data-documento='6']");
    if (!(await diploma.isVisible())) await exp.locator("[data-etapa=ingreso] details summary").click().catch(() => {});
    await diploma.getByRole("button", { name: "Depurar" }).click();
    await diploma.getByText("¿Borrar «Diploma de bachillerato» de forma definitiva?").waitFor();
    assert.equal(await page.locator("[role=dialog], [role=alertdialog]").count(), 0, "confirmación en la página");
    if (ancho === 1440) await captura(page, "expediente-depurar");
    await diploma.getByRole("button", { name: "Sí, borrar definitivamente" }).click();
    await diploma.waitFor({ state: "detached" });
    assert.deepEqual(estado.borrados, [{ confirmar: true }], "manda la confirmación explícita");

    // Exportar el ZIP.
    const [zip] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportar expediente (ZIP)" }).click()]);
    assert.equal(zip.suggestedFilename(), "Expediente-Emp-20-2026-11-28.zip");
    assert.ok(estado.exportes.includes("expediente"));
    assert.ok(await page.evaluate((w) => document.documentElement.scrollWidth <= w, ancho), `sin desborde ${ancho}`);
    await ctx.close();
  }

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK expediente: tablero (general, más incompleto primero, filtro, Excel), expediente por etapas (pasos, marcar con quién y cuándo, no aplica con motivo, subir en la página con Esc, en plazo sin depurar, depurar confirmando en la página, ZIP) a 1440 y 390");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
