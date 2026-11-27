// Verificación en navegador de la nómina formal (R3+R4) con el backend simulado en memoria, a 1440 y 390 px:
//  1) Nómina › Configuración (dueño): pestaña nueva, «Apagada», por qué no se enciende (tablas por confirmar y datos de
//     la empresa), guardar datos fiscales (solo lo que cambió) y «Lo que falta» por persona → su página de datos.
//  2) Datos fiscales de una persona: SDI calculado por ley, sugerencia del tipo de contrato y guardar.
//  3) /dashboard/tablas-fiscales (admin de ADAMIA): cada valor con vigencia, fuente y estado; «Confirmar» manda la huella.
//  4) Encender (confirmación en la página, no ventana) y el detalle de una nómina formal: totales de ISR e IMSS, quién
//     quedó sin calcular y el desglose del recibo (ISR e IMSS no se editan a mano; «Pre-nómina, no timbrada»).
// En cada pantalla: letra ≥ 16 px, títulos en 700, botones ≥ 48 px, sin degradados ni desborde horizontal.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-nomina-formal.mjs
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

// ── Backend simulado ───────────────────────────────────────────────────────────────────────────────────────────────
const VALORES = [
  { clave: "uma.2026", grupo: "UMA", nombre: "UMA 2026", texto: "$117.31 diaria · $3,566.22 mensual", desde: "2026-02-01", hasta: "2027-01-31", huella: "a1".repeat(8),
    fuente: { tipo: "INEGI / DOF", referencia: "UMA 2026, DOF 09/01/2026", url: "https://www.inegi.org.mx/", secundarias: ["https://www.imss.gob.mx/"] } },
  { clave: "isr.mensual.2026", grupo: "ISR (art. 96)", nombre: "Tarifa mensual 2026", texto: "1) desde $0.01: cuota $0.00 + 1.92 % · 2) desde $844.60: cuota $16.22 + 6.4 %", desde: "2026-01-01", hasta: "2026-12-31", huella: "b2".repeat(8),
    fuente: { tipo: "SAT", referencia: "Anexo 8 de la RMF 2026", url: "https://www.sat.gob.mx/", secundarias: [] }, nota: "Los límites de algunos tramos varían por centavos entre fuentes." },
  { clave: "ceav.2026.2_00", grupo: "IMSS · cesantía y vejez patronal", nombre: "1.51 a 2.00 UMA (2026)", texto: "4.851 %", desde: "2026-01-01", hasta: "2026-12-31", huella: "c3".repeat(8),
    fuente: { tipo: "DOF / IMSS", referencia: "Transitorio LSS, DOF 16/12/2020", url: null, secundarias: [] }, nota: "No se encontró en fuentes públicas: cotejar contra el transitorio." },
];
const estado = {
  cfg: { nomina_formal: 0, registro_patronal: null, rfc: null, regimen_fiscal: null, cp_expedicion: null, prima_riesgo: null, zona_salario_minimo: "general", disponible: true },
  confirmadas: new Set(), puts: [], formal: [], confirmaciones: [], putsPersona: [],
};
const pendientes = () => VALORES.filter((v) => !estado.confirmadas.has(v.clave));
const faltaEmpresa = () => [...(!(Number(estado.cfg.prima_riesgo) > 0) ? ["Prima de riesgo de trabajo"] : []), ...(!estado.cfg.registro_patronal ? ["Registro patronal"] : [])];
const configuracion = (rol) => ({
  ok: true, configuracion: estado.cfg,
  tablas: { anio: 2026, pendientes: pendientes().map((v) => ({ clave: v.clave, grupo: v.grupo, nombre: v.nombre })), completas: pendientes().length === 0 },
  faltantes: { empresa: { bloquea: faltaEmpresa(), avisos: ["Código postal de expedición"] }, total_personas: 2, personas_bloqueadas: 1,
    empleados: [{ id_empleado: 16, nombre: "Beto Ruiz Salinas de la Garza", puesto: "Almacenista", bloquea: ["Número de seguridad social (NSS de 11 dígitos)"], avisos: ["RFC", "CURP", "Código postal fiscal", "Tipo de contrato (catálogo SAT)"] }] },
  catalogos: { regimen_fiscal: [{ clave: "601", texto: "General de Ley Personas Morales" }, { clave: "626", texto: "Régimen Simplificado de Confianza" }],
    tipo_contrato: [{ clave: "01", texto: "Contrato de trabajo por tiempo indeterminado" }, { clave: "03", texto: "Contrato de trabajo por tiempo determinado" }],
    tipo_regimen: [{ clave: "02", texto: "Sueldos (incluye ingresos del art. 94 LISR)" }], tipo_jornada: [{ clave: "01", texto: "Diurna" }, { clave: "02", texto: "Nocturna" }] },
  puede_cambiar_formal: rol === "dueno", es_admin: false, puede_encender: pendientes().length === 0 && faltaEmpresa().length === 0,
});
const fiscalAna = {
  formal: true, calculado: true, faltantes: [], gravado: 6000, exento: 0, isr_tarifa: 475.67, isr_retenido: 475.67,
  tarifa: { texto: "Tarifa de 15 días derivada de la mensual (÷ 30.4 × 15)", origen: "derivada", dias: 15 }, subsidio: { elegible: false, aplicado: 0, monto_periodo: 264.3, limite_periodo: 5670.72 },
  sbc: { diario: 420.84, origen: "calculado", factor: 1.0521, formula: "$400.00 × 1.0521 (1 + 15 días de aguinaldo/365 + 16 días de vacaciones × 25 %/365, año 3 de servicio)" }, dias_cotizados: 15,
  imss: { obrero: 154.05, obrero_causado: 154.05, obrero_a_cargo_patron: 0, patronal: 1232.42, ramos: [] },
  conceptos: [{ clave: "sueldo", concepto: "Sueldo (días pagados)", importe: 6000, gravado: 6000, exento: 0, regla: "Gravado" }], avisos: [],
};
const dias = ["2026-12-01", "2026-12-02"].map((fecha) => ({ fecha, estado: "trabajado", min: 480, extra: 0, programado: 480, entrada: "09:00", salida: "17:00", retardo: false }));
const recibos = () => [
  { id: 21, id_empleado: 15, estado: "vigente", envio_estado: null, total_percepciones: 6000, total_descuentos: 629.72, neto: 5370.28, transferencia: 5370.28, efectivo: 0,
    datos: { empleado: { nombre: "Ana Torres", puesto: "Empacadora", periodo_pago: "Quincenal", medio_pago: "Transferencia" }, resumen: { diasPagados: 15, diasRango: 15, diasTrabajados: 13, faltas: 0, retardos: 0, minDobles: 0, minTriples: 0, diario: 40000 }, alertas: [], dias, fiscal: fiscalAna },
    lineas: [
      { clave: "sueldo", concepto: "Sueldo (días pagados)", tipo: "percepcion", cantidad: 15, importe: 6000, importe_sugerido: 6000, editado: 0, origen: "calculo" },
      { clave: "isr", concepto: "ISR retenido", tipo: "descuento", cantidad: null, importe: 475.67, importe_sugerido: 475.67, editado: 0, origen: "calculo", nota: "ISR según tarifa sobre $6,000.00 gravados" },
      { clave: "imss_obrero", concepto: "IMSS (cuota del trabajador)", tipo: "descuento", cantidad: 15, importe: 154.05, importe_sugerido: 154.05, editado: 0, origen: "calculo", nota: "SBC $420.84 × 15 días" },
    ] },
  { id: 22, id_empleado: 16, estado: "vigente", envio_estado: null, total_percepciones: 6000, total_descuentos: 0, neto: 6000, transferencia: 0, efectivo: 6000,
    datos: { empleado: { nombre: "Beto Ruiz", periodo_pago: "Quincenal", medio_pago: "Efectivo" }, resumen: { diasPagados: 15, diasRango: 15, diario: 40000 }, dias,
      alertas: ["Nómina formal: no se calculó el ISR ni el IMSS de esta persona. Falta: Número de seguridad social (NSS de 11 dígitos)."],
      fiscal: { formal: true, calculado: false, faltantes: ["Falta: Número de seguridad social (NSS de 11 dígitos)."] } },
    lineas: [{ clave: "sueldo", concepto: "Sueldo (días pagados)", tipo: "percepcion", cantidad: 15, importe: 6000, importe_sugerido: 6000, editado: 0, origen: "calculo" }] },
];
let rol = "dueno";
async function rutas(ctx, usuario) {
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    const ok = (json, status = 200) => route.fulfill({ status, json, headers: cors });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace("/api", "");
    if (p.endsWith("/users/verify/token")) return ok({ user: usuario() });
    if (p === "/checador/nomina/fiscal/configuracion") { assert.equal(url.searchParams.get("empresa"), "7"); return ok(configuracion(rol)); }
    if (p === "/checador/nomina/fiscal/configuracion/7" && req.method() === "PUT") {
      const b = req.postDataJSON();
      estado.puts.push(b);
      Object.assign(estado.cfg, b, b.prima_riesgo != null ? { prima_riesgo: Number(b.prima_riesgo) } : {});
      return ok({ ok: true, configuracion: estado.cfg });
    }
    if (p === "/checador/nomina/fiscal/configuracion/7/formal") {
      const b = req.postDataJSON();
      estado.formal.push(b);
      if (b.encender && pendientes().length) return ok({ ok: false, error: "Las tablas fiscales de 2026 tienen valores por confirmar.", codigo: "TABLAS_POR_CONFIRMAR" }, 409);
      estado.cfg.nomina_formal = b.encender ? 1 : 0;
      return ok({ ok: true, nomina_formal: b.encender });
    }
    if (p === "/checador/nomina/fiscal/empleados/16" && req.method() === "GET") {
      return ok({ ok: true, empleado: { id_empleado: 16, id_empresa: 7, nombre: "Beto Ruiz", puesto: "Almacenista", nss: null, rfc: null, curp: null, fecha_ingreso: "2024-01-01", tipo_contrato_texto: "Indeterminado", tipo_jornada_texto: null },
        fiscal: { sdi_manual: null, cp_fiscal: null, tipo_contrato_sat: null, tipo_regimen_sat: null, tipo_jornada_sat: null },
        sugerencias: { tipo_contrato_sat: "01", tipo_jornada_sat: null, tipo_regimen_sat: "02" },
        sdi_ley: { salario_diario: 400, sdi: 420.84, factor: 1.0521, formula: "$400.00 × 1.0521 (1 + 15 días de aguinaldo/365 + 16 días de vacaciones × 25 %/365, año 3 de servicio)" },
        faltantes: { bloquea: ["Número de seguridad social (NSS de 11 dígitos)"], avisos: ["RFC", "CURP", "Código postal fiscal"] }, catalogos: configuracion(rol).catalogos });
    }
    if (p === "/checador/nomina/fiscal/empleados/16" && req.method() === "PUT") { estado.putsPersona.push(req.postDataJSON()); return ok({ ok: true }); }
    if (p === "/checador/nomina/tablas-fiscales" && req.method() === "GET") {
      return ok({ ok: true, anio: 2026, pendientes_anio: pendientes().length, puede_confirmar: usuario().tipo_usuario === "Admin", disponible: true,
        valores: VALORES.map((v) => ({ ...v, estado_origen: "por_confirmar", estado: estado.confirmadas.has(v.clave) ? "confirmado" : "por_confirmar", confirmacion: estado.confirmadas.has(v.clave) ? { por: "Equipo ADAMIA", nota: "Cotejado" } : null })) });
    }
    if (p === "/checador/nomina/tablas-fiscales/confirmar") {
      const b = req.postDataJSON();
      estado.confirmaciones.push(b);
      assert.equal(b.huella, VALORES.find((v) => v.clave === b.clave).huella, "manda la huella que vio");
      estado.confirmadas.add(b.clave);
      return ok({ ok: true });
    }
    if (p === "/checador/nomina/periodos/5") {
      return ok({ ok: true, puede_autorizar: rol === "dueno", sueldos_por_revisar: [], formal_empresa: Boolean(estado.cfg.nomina_formal),
        periodo: { id: 5, id_empresa: 7, periodicidad: "Quincenal", fecha_inicio: "2026-12-01", fecha_fin: "2026-12-15", estado: "borrador", version: 3, formal: 1, total_neto: 11370.28, total_transferencia: 5370.28, total_efectivo: 6000, creado_por_nombre: "RH" },
        recibos: recibos(),
        fiscal: { isr_tarifa: 475.67, subsidio: 0, isr: 475.67, imss_obrero: 154.05, imss_patronal: 1232.42, obrero_a_cargo_patron: 0, gravado: 6000, exento: 0, sin_calcular: [{ id_empleado: 16, nombre: "Beto Ruiz", faltantes: [] }] } });
    }
    if (p === "/checador/nomina/conceptos") return ok({ ok: true, conceptos: [] });
    return ok([]);
  });
}

// Letra, títulos, botones, degradados y desborde dentro de `raiz` (mismo criterio que verify-prospectos).
async function legible(pagina, raiz, { ancho, nombre, minLetra = 16 }) {
  const r = await pagina.evaluate(({ raiz, minLetra }) => {
    const el = document.querySelector(raiz);
    if (!el) return { falta: true };
    const visibles = [...el.querySelectorAll("*")].filter((n) => n.getClientRects().length && getComputedStyle(n).visibility !== "hidden");
    const textos = visibles.filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && !n.closest("[data-chico]") && !n.closest(".sr-only"));
    return {
      chicos: textos.filter((n) => parseFloat(getComputedStyle(n).fontSize) < minLetra - 0.01).map((n) => `${n.tagName}:${n.textContent.trim().slice(0, 30)}:${getComputedStyle(n).fontSize}`),
      titulos: [...el.querySelectorAll("h1,h2,h3")].map((h) => getComputedStyle(h).fontWeight),
      botones: [...el.querySelectorAll("button, a[class*='min-h'], input:not([type=checkbox]), select")].filter((b) => b.getClientRects().length).map((b) => [b.textContent.trim().slice(0, 30) || b.id, Math.round(b.getBoundingClientRect().height)]).filter(([, h]) => h < 48),
      degradados: visibles.filter((n) => getComputedStyle(n).backgroundImage.includes("gradient")).length,
      ancho: document.documentElement.scrollWidth,
    };
  }, { raiz, minLetra });
  assert.ok(!r.falta, `${nombre}: no apareció ${raiz}`);
  assert.deepEqual(r.chicos, [], `${nombre}: letra de ${minLetra} px o más`);
  assert.ok(r.titulos.length && r.titulos.every((w) => w === "700"), `${nombre}: títulos en 700 (${r.titulos})`);
  assert.deepEqual(r.botones, [], `${nombre}: botones y campos de 48 px o más`);
  assert.equal(r.degradados, 0, `${nombre}: sin degradados`);
  assert.ok(r.ancho <= ancho, `${nombre}: sin desborde horizontal (${r.ancho} > ${ancho})`);
}

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/")).status) break; } catch { /* arrancando */ } if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const errores = [];
  const dueno = () => ({ id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Dueño", empresas: [7], empresas_detalle: [{ id_empresa: 7, nombre: "Empacadora" }] });
  const admin = () => ({ id_usuario: 2, tipo_usuario: "Admin", nombre: "Equipo ADAMIA", empresas: [], empresas_detalle: [] });

  for (const [ancho, alto] of [[1440, 900], [390, 844]]) {
    const sufijo = ancho === 390 ? "-390" : "";
    const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-MX" });
    await ctx.addCookies([{ name: "token", value: jwt("Recruiter"), url: base }]);
    await rutas(ctx, dueno);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errores.push(e.message));

    // 1) Configuración apagada: pestaña, por qué no se enciende y «Lo que falta».
    await page.goto(base + "/panel/nomina/configuracion", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Manejar nómina formal" }).waitFor({ timeout: 20000 });
    assert.equal(await page.getByRole("link", { name: "Configuración" }).getAttribute("aria-current"), "page", "pestaña Configuración activa");
    const raiz = page.locator("[data-pagina=configuracion-nomina]");
    if (ancho === 1440) {
      await raiz.getByText("Apagada", { exact: true }).waitFor();
      await raiz.getByText("Todavía no se puede encender").waitFor();
      await raiz.getByText(/tienen 3 valores por confirmar/).waitFor();
      await raiz.getByText("Falta en la empresa: Registro patronal.").waitFor();
      assert.equal(await page.getByRole("button", { name: "Encender nómina formal" }).isDisabled(), true, "no se enciende con pendientes");
    }
    await legible(page, "[data-pagina=configuracion-nomina]", { ancho, nombre: `configuración ${ancho}` });
    await captura(page, `nomina-formal-configuracion${sufijo}`);
    if (ancho === 1440) {
      assert.equal(await page.getByRole("button", { name: "Guardar datos de la empresa" }).isDisabled(), true, "sin cambios no guarda");
      await page.getByLabel("Registro patronal (IMSS)").fill("Y5412345101");
      await page.getByLabel("Prima de riesgo de trabajo (%)").fill("0.54355");
      await page.getByLabel("Régimen fiscal").selectOption("601");
      await page.getByRole("button", { name: "Guardar datos de la empresa" }).click();
      await page.getByText("Datos fiscales guardados.").waitFor();
      assert.deepEqual(estado.puts[0], { registro_patronal: "Y5412345101", prima_riesgo: "0.54355", regimen_fiscal: "601" }, "solo lo que cambió");
      await raiz.getByText("Falta en la empresa: Registro patronal.").waitFor({ state: "detached" });
    }
    // «Lo que falta»: la persona y su página.
    const persona = raiz.locator("[data-persona='16']");
    await persona.getByText("Bloquea el cálculo").waitFor();
    await persona.getByRole("link", { name: "Completar datos" }).click();
    await page.waitForURL("**/panel/nomina/configuracion/personas/16");

    // 2) Datos fiscales de la persona.
    await page.getByRole("heading", { name: "Beto Ruiz" }).waitFor({ timeout: 20000 });
    await page.getByText("Sin esto no se le puede calcular el ISR ni el IMSS").waitFor();
    assert.match(await page.locator("[data-sdi-ley]").innerText(), /\$420\.84/);
    await legible(page, "[data-pagina=datos-fiscales-persona]", { ancho, nombre: `persona ${ancho}` });
    await captura(page, `nomina-formal-persona${sufijo}`);
    if (ancho === 1440) {
      await page.getByRole("button", { name: "Usar la sugerida: 01" }).click();
      assert.equal(await page.getByLabel("Tipo de contrato").inputValue(), "01");
      await page.getByLabel("Código postal fiscal").fill("06600");
      await page.getByRole("button", { name: "Guardar datos fiscales" }).click();
      await page.getByText(/Datos fiscales guardados\. Recalcula/).waitFor();
      assert.deepEqual(estado.putsPersona[0], { cp_fiscal: "06600", tipo_contrato_sat: "01" });
    }
    await ctx.close();

    // 3) Tablas fiscales: el admin ve vigencia, fuente y estado, y confirma.
    const ca = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-MX" });
    await ca.addCookies([{ name: "token", value: jwt("Admin"), url: base }]);
    await rutas(ca, admin);
    const pa = await ca.newPage();
    pa.on("pageerror", (e) => errores.push(e.message));
    await pa.goto(base + "/dashboard/tablas-fiscales", { waitUntil: "domcontentloaded" });
    await pa.getByRole("heading", { name: "Tablas fiscales de la nómina" }).waitFor({ timeout: 20000 });
    const uma = pa.locator("[data-valor='uma.2026']");
    await uma.getByText("Vigencia: 01/02/2026 al 31/01/2027").waitFor();
    await uma.getByText(/Fuente \(INEGI \/ DOF\)/).waitFor();
    if (ancho === 1440) {
      await pa.getByText("3 valores de 2026 por confirmar").waitFor();
      await pa.locator("[data-valor='ceav.2026.2_00']").getByText(/No se encontró en fuentes públicas/).waitFor();
    }
    await legible(pa, "[data-pagina=tablas-fiscales]", { ancho, nombre: `tablas ${ancho}` });
    await captura(pa, `nomina-formal-tablas${sufijo}`);
    if (ancho === 1440) {
      await uma.getByLabel("Nota (opcional)").fill("Cotejado contra el DOF");
      for (const v of VALORES) {
        await pa.getByRole("button", { name: `Confirmar ${v.nombre}` }).click();
        await pa.locator(`[data-valor='${v.clave}']`).getByText("Confirmado", { exact: true }).waitFor();
      }
      assert.deepEqual(estado.confirmaciones[0], { clave: "uma.2026", huella: VALORES[0].huella, nota: "Cotejado contra el DOF" });
      await pa.getByText("Las tablas de 2026 están confirmadas").waitFor();
    }
    await ca.close();

    // 4) Encender (confirmación en la página) y una nómina formal.
    const cd = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-MX" });
    await cd.addCookies([{ name: "token", value: jwt("Recruiter"), url: base }]);
    await rutas(cd, dueno);
    const pd = await cd.newPage();
    pd.on("pageerror", (e) => errores.push(e.message));
    if (ancho === 1440) {
      await pd.goto(base + "/panel/nomina/configuracion", { waitUntil: "domcontentloaded" });
      await pd.getByRole("button", { name: "Encender nómina formal" }).click();
      await pd.getByText("¿Encender la nómina formal?").waitFor();
      assert.equal(await pd.getByRole("dialog").count(), 0, "se confirma en la página, no en una ventana");
      await pd.getByRole("button", { name: "Sí, encender" }).click();
      await pd.getByText("Encendida", { exact: true }).waitFor();
      assert.deepEqual(estado.formal.at(-1), { encender: true });
    }
    await pd.goto(base + "/panel/nomina/5", { waitUntil: "domcontentloaded" });
    const formal = pd.locator("[data-nomina-formal]");
    await formal.getByText("Nómina formal: lleva ISR e IMSS").waitFor({ timeout: 20000 });
    for (const t of ["ISR retenido", "$475.67", "IMSS a cargo del patrón", "$1,232.42", "Pre-nómina, no timbrada"]) await formal.getByText(t, { exact: true }).first().waitFor();
    await formal.getByText(/Sin ISR ni IMSS .*Beto Ruiz/).waitFor();
    await captura(pd, `nomina-formal-detalle${sufijo}`);
    // El recibo de Ana: ISR e IMSS de solo lectura y el desglose.
    await pd.getByRole("button", { name: "Ver asistencia de Ana Torres" }).click();
    await pd.getByRole("button", { name: "Revisar recibo y ajustar importes" }).click();
    const desglose = pd.locator("[data-desglose-fiscal=calculado]");
    await desglose.waitFor();
    assert.equal(await pd.getByLabel("Importe de ISR retenido").count(), 0, "el ISR no se edita a mano");
    assert.equal(await pd.getByLabel("Importe de IMSS (cuota del trabajador)").count(), 0, "el IMSS no se edita a mano");
    assert.equal(await pd.getByLabel("Importe de Sueldo (días pagados)").count(), 1, "el sueldo sí");
    await pd.getByText("Se calcula solo con la nómina formal: cambia los renglones de los que sale.").first().waitFor();
    for (const [k, v] of [["isr", "$475.67"], ["imss", "$154.05"], ["patronal", "$1,232.42"], ["gravado", "$6,000.00"]]) {
      assert.ok((await desglose.locator(`[data-fila-fiscal=${k}]`).innerText()).includes(v), `${k} = ${v}`);
    }
    await desglose.getByText("Pre-nómina, no timbrada").waitFor();
    await dormir(300);
    await legible(pd, "[data-desglose-fiscal=calculado]", { ancho, nombre: `desglose ${ancho}` });
    await captura(pd, `nomina-formal-recibo${sufijo}`);
    // Sin desborde del documento en celular con el recibo abierto.
    assert.ok(await pd.evaluate((w) => document.documentElement.scrollWidth <= w, ancho), `sin desborde ${ancho}`);
    await cd.close();
  }

  assert.deepEqual(errores, []);
  exito = true;
  console.log("OK nómina formal: configuración (apagada, motivos, datos de la empresa, lo que falta), datos fiscales de la persona, tablas fiscales con fuente y confirmación por huella, encender en la página y desglose del recibo (ISR/IMSS de solo lectura) a 1440 y 390");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (!exito) process.exitCode = 1;
}
