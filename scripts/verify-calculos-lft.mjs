// Verificación en navegador de los cálculos LFT (27/11/2026, docs del backend: docs/calculos-lft.md), con el backend
// SIMULADO (la copia del motor del servidor en scripts/lib/calculos-lft-servidor.cjs) y datos de demostración. 1440 y 390:
//   1. Calculadora pública: pide el cálculo al servidor (no calcula en el navegador) y muestra su fórmula y total.
//   2. Finiquito: despido injustificado con la casilla «Incluir 20 días por año (art. 50)» activada por omisión; al
//      quitarla cambia el total; cada concepto muestra su fórmula, la nota «bruto; ISR aparte» y la razón del tope de la
//      prima de antigüedad; al guardar se mandan las ENTRADAS (el servidor recalcula) y el detalle muestra lo mismo.
//   3. Un finiquito de la versión anterior se ve tal cual, marcado, con «Recalcular como borrador».
//   4. Aguinaldos: fecha de corte por omisión el 31 de diciembre y fórmula por persona.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      CAPTURAS=/ruta PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/verify-calculos-lft.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, contexto, dormir, levantarNext } from "./capturas-ayuda/comun.mjs";

const require = createRequire(import.meta.url);
const L = require("./lib/calculos-lft-servidor.cjs");
const OUT = process.env.CAPTURAS || null;
const captura = async (page, nombre, completa = false) => { if (OUT) await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: completa }); };
const ZONA = "America/Mexico_City";
const EMPRESA = [{ id_empresa: 7, nombre: "Uniline", zona_horaria: ZONA }];
const RH = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Laura Ríos", correo: "laura.rios@uniline.mx", id_empresa: 7, empresas: [7], empresas_detalle: EMPRESA, zona_horaria: ZONA };

const INGRESO = "2022-01-10";
const BAJA = "2025-06-15";
const EMPLEADO = {
  id: 14, id_empleado: 14, id_empresa: 7, nombre_completo: "Héctor León Ruiz", fecha_ingreso: INGRESO, puesto: "Almacenista", departamento: "Almacén",
  periodicidad_pago: "Mensual", salario_diario: 500, salario_origen: "contrato", salario_texto: "Contrato activo: $15,000.00 mensual ÷ 30 = $500.00 diarios",
  aguinaldo_dias: 15, prima_vacacional_porcentaje: 25,
};
const pick = (b, ...k) => k.map((x) => b[x]).find((v) => v !== undefined && v !== null && v !== "");
const entradasMotor = (b) => ({
  fecha_ingreso: INGRESO, fecha_baja: b.fecha_baja, tipo_terminacion: b.tipo_terminacion, salario_diario: pick(b, "salario_diario_manual", "salario_diario"),
  dias_salario_pendiente: b.dias_salario_pendiente, faltas_aguinaldo: b.dias_no_trabajados, dias_aguinaldo: b.dias_aguinaldo_manual,
  prima_vacacional_porcentaje: b.prima_vacacional_porcentaje_manual, dias_vacaciones_anio_empresa: b.dias_vacaciones_ley_año_actual,
  dias_vacaciones_pendientes_anteriores: b.dias_vacaciones_años_anteriores, dias_vacaciones_gozadas_anio_actual: b.dias_vacaciones_año_actual_ya_gozadas,
  zona_salario_minimo: b.zona_salario_minimo, incluir_20_dias: b.incluir_20_dias, gratificacion_adicional: b.gratificacion_adicional,
});
const respuestaFiniquito = (b) => {
  const calculo = L.calcularFiniquito(entradasMotor(b));
  return { ...L.aColumnasFiniquito(calculo), id_empleado: 14, id_empresa: 7, nombre_completo: EMPLEADO.nombre_completo, puesto: EMPLEADO.puesto, departamento: EMPLEADO.departamento, periodicidad_pago: "Mensual", calculo, avisos: calculo.avisos, salario_empleado: { texto: EMPLEADO.salario_texto } };
};
// Esperado (C2 de las pruebas del backend: resuelto a mano).
const ESPERADO_CON_20 = 114866.29;
const ESPERADO_SIN_20 = 78733.62; // 114,866.29 − 36,132.67
const VIEJO = { id_finiquito: 6, id_empleado: 17, id_empresa: 7, nombre_completo: "Mario Ochoa Rivas", puesto: "Chofer", fecha_ingreso: "2025-01-15", fecha_baja: "2026-09-15", años_trabajados: "1.67", tipo_terminacion: "Fin de Contrato", es_liquidacion: 0, salario_diario: "300.00", monto_salario_pendiente: "0.00", monto_aguinaldo_proporcional: "2650.10", monto_vacaciones_no_gozadas: "3816.00", monto_prima_vacacional: "954.00", subtotal_finiquito: "7420.10", total_pagar: "7420.10", estado: "Pendiente", nombre_empresa: "Uniline", fecha_calculo: "2026-09-15", version_calculo: null, calculado_version_anterior: true, calculo: null };

let guardado = null;
const pedidos = { calculadora: [], calcular: [] };
function manejar({ ruta, metodo, cuerpo, json, url }) {
  if (ruta === "/checador/calculos-lft/publico/aguinaldo" && metodo === "POST") {
    pedidos.calculadora.push(cuerpo);
    const sd = L.salarioDiarioDe({ salario: cuerpo.salario, periodicidad: { diario: "Diario", semanal: "Semanal", quincenal: "Quincenal", mensual: "Mensual" }[cuerpo.tipo_salario] });
    const r = L.calcularAguinaldo({ salario_diario: sd, fecha_ingreso: cuerpo.fecha_ingreso, fecha_corte: cuerpo.fecha_corte, dias_aguinaldo: cuerpo.dias_aguinaldo, faltas: cuerpo.dias_no_laborados });
    return json({ ...r, salario_diario_texto: L.textoSalarioDiario({ salario: cuerpo.salario, periodicidad: "Mensual" }) });
  }
  if (ruta === "/checador/calculos-lft/publico/vacaciones-ley") return json({ dias: 12, anio_servicio: 1, tabla: L.tablaVacacionesLey(35) });
  if (ruta.startsWith("/checador/sucursales")) return json({ sucursales: [{ id_sucursal: 1, nombre: "Matriz Colima", id_empresa: 7, empresa_nombre: "Uniline" }] });
  if (/^\/empresas\/\d+$/.test(ruta)) return json({ id_empresa: 7, nombre_empresa: "Uniline", url_imagen: null });
  if (ruta === "/checador/finiquitos" && metodo === "GET") return json({ data: [VIEJO, ...(guardado ? [{ ...guardado, id_finiquito: 9 }] : [])], total: guardado ? 2 : 1 });
  if (ruta === "/checador/finiquitos/empleados-activos") return json({ data: [EMPLEADO] });
  if (/\/checador\/finiquitos\/empleado\/\d+\/dias-no-trabajados$/.test(ruta)) return json({ dias_no_trabajados: 0 });
  if (/\/checador\/finiquitos\/empleado\/\d+\/vacaciones-datos$/.test(ruta)) {
    return json({ diasPendientes: 0, diasGozadosAdelantados: 0, diasLeyAñoActual: L.diasVacacionesALaFecha(INGRESO, url.searchParams.get("fechaBaja") || BAJA), primaVacacional: 25, diasAguinaldo: 15 });
  }
  if (ruta === "/checador/finiquitos/calcular" && metodo === "POST") {
    pedidos.calcular.push(cuerpo);
    return json(respuestaFiniquito(cuerpo));
  }
  if (ruta === "/checador/finiquitos" && metodo === "POST") {
    // Como el servidor: recalcula con las entradas; los importes del navegador no cuentan.
    assert.ok(cuerpo.entradas, "al guardar se mandan las entradas");
    const r = respuestaFiniquito({ ...cuerpo.entradas, fecha_baja: cuerpo.fecha_baja });
    guardado = { ...r, entradasRecibidas: cuerpo.entradas, estado: "Pendiente", motivo_baja: cuerpo.motivo_baja, calculado_version_anterior: false, version_calculo: L.VERSION_CALCULO };
    return json({ success: true, id_finiquito: 9, total_pagar: r.total_pagar });
  }
  if (ruta === "/checador/finiquitos/9") return json({ ...guardado, id_finiquito: 9 });
  if (ruta === "/checador/finiquitos/6") return json(VIEJO);
  if (ruta.startsWith("/checador/firma-digital")) return json({ success: true, solicitud: null });
  if (ruta === "/checador/aguinaldos" && metodo === "GET") return json({ data: [], total: 0 });
  if (ruta === "/checador/aguinaldos/empleados-activos") return json({ data: [{ ...EMPLEADO, fecha_ingreso: "2025-03-10", salario_diario: 400 }] });
  if (/\/checador\/aguinaldos\/empleado\/\d+\/dias-no-trabajados$/.test(ruta)) return json({ dias_no_trabajados: 0 });
  if (ruta === "/checador/aguinaldos/calcular" && metodo === "POST") {
    const resultados = cuerpo.empleados_ids.map((x) => {
      const r = L.calcularAguinaldo({ salario_diario: x.salario_diario, fecha_ingreso: "2025-03-10", fecha_corte: cuerpo.fecha_corte, dias_aguinaldo: x.dias_aguinaldo, faltas: x.dias_no_trabajados });
      return { id_empleado: 14, id_empresa: 7, nombre_completo: EMPLEADO.nombre_completo, puesto: EMPLEADO.puesto, fecha_ingreso: "2025-03-10", fecha_corte: cuerpo.fecha_corte, dias_trabajados: r.dias_trabajados, años_trabajados: "0.81", años_completos: 0, salario_diario: r.salario_diario.toFixed(2), salario_mensual: "12000.00", periodicidad_pago: "Mensual", dias_aguinaldo_ley: "15.00", dias_aguinaldo_calculado: r.dias_proporcionales.toFixed(4), monto_aguinaldo: r.monto.toFixed(2), es_proporcional: r.es_proporcional, dias_no_trabajados: "0.00", formula: r.formula, version: r.version };
    });
    return json({ resultados, errores: [], total_empleados: resultados.length, total_general: resultados.reduce((t, x) => t + Number(x.monto_aguinaldo), 0).toFixed(2), año_fiscal: Number(cuerpo.año_fiscal), fecha_corte: cuerpo.fecha_corte, observaciones: "" });
  }
  if (metodo === "GET") return json([]);
  return undefined;
}

async function sinDesborde(page) {
  const r = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, ventana: window.innerWidth }));
  assert.ok(r.doc <= r.ventana + 1, `scroll horizontal (${r.doc} > ${r.ventana}) en ${page.url()}`);
}
const dinero = (n) => `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ignorar = (m) => /ResizeObserver|Failed to load resource|hydrat/i.test(m);

const { base, firmar, cerrar } = await levantarNext();
const browser = await chromium.launch({ args: ["--lang=es-MX"] });
let ok = false;
try {
  for (const [ancho, alto, sufijo] of [[1440, 900, "1440"], [390, 844, "390"]]) {
    // ——— 1. Calculadora pública ———
    {
      const { ctx, page } = await contexto(browser, { base, ancho, alto, usuario: () => null, manejar });
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message));
      await page.goto(base + "/calculadora-aguinaldos", { waitUntil: "domcontentloaded" });
      await page.getByText("Calcula aguinaldo proporcional").waitFor({ timeout: 60000 });
      // El select puede cambiarse antes de que React termine de hidratar: se reintenta hasta ver el campo mensual.
      for (let i = 0; i < 10; i++) {
        await page.getByLabel("Tipo de salario").selectOption("mensual");
        if (await page.getByLabel("Salario mensual (MXN)").isVisible()) break;
        await dormir(500);
      }
      await page.getByLabel("Salario mensual (MXN)").fill("12000");
      await page.getByLabel("Fecha de ingreso").fill("2025-03-10");
      await page.getByLabel("Fecha de corte").fill("2025-12-31");
      await page.locator("[data-total]").waitFor({ timeout: 20000 });
      assert.equal((await page.locator("[data-total]").innerText()).replace(/\s/g, ""), "$4,882.19");
      assert.equal(await page.locator("[data-formula]").innerText(), "15 días × 297/365 días trabajados × $400.00 = $4,882.19");
      await page.getByText("Importes brutos; el ISR y las retenciones se calculan aparte.").first().waitFor();
      const ultimo = pedidos.calculadora.at(-1);
      assert.deepEqual([ultimo.tipo_salario, ultimo.salario, ultimo.fecha_corte], ["mensual", 12000, "2025-12-31"], "la calculadora le pide el cálculo al servidor");
      await sinDesborde(page);
      await captura(page, `calculadora-publica-${sufijo}`, true);
      assert.deepEqual(errores.filter((m) => !ignorar(m)), [], `errores: ${errores.join(" | ")}`);
      await ctx.close();
      console.log(`✔ ${sufijo}: calculadora pública = servidor`);
    }

    // ——— 2 y 3. Finiquitos ———
    {
      guardado = null;
      const { ctx, page } = await contexto(browser, { base, ancho, alto, cookie: firmar("Recruiter", { id_usuario: 1 }), usuario: () => RH, manejar });
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message));
      await page.goto(base + "/panel/finiquitos-y-liquidaciones", { waitUntil: "domcontentloaded" });
      await page.getByText("Mario Ochoa Rivas").first().waitFor({ timeout: 60000 });
      assert.ok(await page.getByText("Versión anterior").first().isVisible(), "la lista marca el finiquito de la versión anterior");
      await page.getByRole("button", { name: "Nuevo Finiquito" }).click();
      await page.getByRole("combobox").first().click();
      await page.getByRole("option", { name: "Matriz Colima" }).click();
      await page.locator("#finiquito-empleado").fill("Héctor");
      await page.getByRole("button", { name: "Héctor León Ruiz" }).click({ timeout: 15000 });
      await page.getByLabel("Salario diario").waitFor({ timeout: 15000 });
      assert.equal(await page.getByLabel("Salario diario").inputValue(), "500.00", "usa el salario del empleado");
      await page.getByText("Contrato activo: $15,000.00 mensual ÷ 30 = $500.00 diarios").first().waitFor();
      await page.getByLabel("Fecha de baja").fill(BAJA);
      await dormir(600);
      await page.getByLabel("Días de salario pendientes").fill("5");
      await page.getByLabel("Tipo de terminación").selectOption("Despido Injustificado");
      const casilla = page.getByLabel("Incluir 20 días por año (art. 50)");
      assert.equal(await casilla.isChecked(), true, "20 días activado por omisión");
      await page.getByRole("button", { name: "Calcular finiquito" }).click();
      const resumen = page.getByRole("complementary", { name: "Resumen del finiquito" });
      await resumen.getByText("Subtotal indemnización").waitFor({ timeout: 15000 });
      assert.equal((await resumen.locator("[data-total]").innerText()).replace(/\s/g, ""), dinero(ESPERADO_CON_20).replace(/\s/g, ""));
      await resumen.getByText("12 días × $500.00 × 3.4301 años = $20,580.60").waitFor();
      await resumen.getByText("20 días × $526.70 (SDI) × 3.4301 años = $36,132.67").waitFor();
      await resumen.getByText("Importes brutos; el ISR y las retenciones se calculan aparte.").first().waitFor();
      await resumen.getByText(/no pasa del tope de ley de 2 salarios mínimos/).first().waitFor();
      await sinDesborde(page);
      await captura(page, `finiquito-con-20-dias-${sufijo}`, true);
      // Quitar los 20 días → recalcular → otro total.
      await casilla.uncheck();
      await page.getByRole("button", { name: "Calcular finiquito" }).click();
      await resumen.getByText("No incluido").waitFor({ timeout: 15000 }).catch(() => {});
      await page.getByRole("button", { name: "Guardar y continuar" }).waitFor({ timeout: 15000 });
      assert.equal((await resumen.locator("[data-total]").innerText()).replace(/\s/g, ""), dinero(ESPERADO_SIN_20).replace(/\s/g, ""));
      assert.equal(pedidos.calcular.at(-1).incluir_20_dias, false);
      await page.getByRole("button", { name: "Guardar y continuar" }).click();
      const dlg = page.getByRole("dialog");
      await dlg.getByText("Firma del documento").first().waitFor({ timeout: 30000 }).catch(() => {});
      await dlg.locator("[data-total]").first().waitFor({ timeout: 30000 });
      assert.equal(guardado.entradasRecibidas.incluir_20_dias, false, "el servidor recibe la casilla");
      assert.equal(guardado.entradasRecibidas.tipo_terminacion, "Despido Injustificado");
      assert.equal((await dlg.locator("[data-total]").first().innerText()).replace(/\s/g, ""), dinero(ESPERADO_SIN_20).replace(/\s/g, ""), "el detalle (fuente del PDF) muestra lo calculado");
      await dlg.getByText("12 días × $500.00 × 3.4301 años = $20,580.60").first().waitFor();
      await captura(page, `finiquito-detalle-${sufijo}`);
      await page.keyboard.press("Escape");
      await dormir(400);
      // 3. Versión anterior: tal cual, marcado, con «Recalcular como borrador».
      await page.getByRole("button", { name: "Ver", exact: true }).first().click();
      const dlg2 = page.getByRole("dialog");
      await dlg2.getByText(/Calculado con la versión anterior/).first().waitFor({ timeout: 30000 });
      assert.equal((await dlg2.locator("[data-total]").first().innerText()).replace(/\s/g, ""), "$7,420.10", "lo guardado no se recalcula al abrirlo");
      assert.ok(await dlg2.getByRole("button", { name: "Recalcular como borrador" }).isVisible());
      await sinDesborde(page);
      await captura(page, `finiquito-version-anterior-${sufijo}`);
      assert.deepEqual(errores.filter((m) => !ignorar(m)), [], `errores: ${errores.join(" | ")}`);
      await ctx.close();
      console.log(`✔ ${sufijo}: finiquito con fórmulas, 20 días opcional, guardado = detalle, versión anterior marcada`);
    }

    // ——— 4. Aguinaldos ———
    {
      const { ctx, page } = await contexto(browser, { base, ancho, alto, cookie: firmar("Recruiter", { id_usuario: 1 }), usuario: () => RH, manejar });
      await page.goto(base + "/panel/aguinaldos", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Nuevo Cálculo" }).click({ timeout: 60000 });
      const corte = page.locator("input[type=date]").first();
      await corte.waitFor({ timeout: 15000 });
      assert.match(await corte.inputValue(), /^\d{4}-12-31$/, "corte por omisión: 31 de diciembre");
      await ctx.close();
      console.log(`✔ ${sufijo}: aguinaldos con corte al 31/12`);
    }
  }
  ok = true;
  console.log("verify-calculos-lft: todo bien");
} finally {
  await browser.close();
  cerrar();
  await dormir(100);
  if (!ok) process.exitCode = 1;
}
