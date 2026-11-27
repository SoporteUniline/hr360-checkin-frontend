// Cálculos LFT en el panel (27/11/2026). El importe lo calcula el servidor; aquí se prueba que la pantalla y el PDF
// muestran EXACTAMENTE los conceptos, fórmulas y totales que manda el servidor, que un finiquito de la versión anterior se
// marca sin recalcular, y que la copia del motor que usa el backend simulado da los casos resueltos a mano del backend.
// Uso: node --test scripts/test-calculos-lft.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  resumenFiniquito, renglonesPdfFiniquito, formulaAguinaldo, corteAguinaldoPorOmision, inicioPeriodoAguinaldo,
  cuerpoCalculadora, calculadoraLista, incluye20Dias, tipoTerminacion, TIPOS_TERMINACION, NOTA_BRUTO, dinero,
} from "../src/lib/calculos/calculosLft.mjs";

const require = createRequire(import.meta.url);
const RUTA_MOTOR = new URL("./lib/calculos-lft-servidor.cjs", import.meta.url);
const L = require(RUTA_MOTOR.pathname);

// Respuesta de /finiquitos/calcular como la arma el servidor (columnas + calculo).
const respuesta = (entradas) => {
  const calculo = L.calcularFiniquito(entradas);
  return { ...L.aColumnasFiniquito(calculo), calculo, salario_empleado: { texto: "Contrato activo: $15,000.00 mensual ÷ 30 = $500.00 diarios" } };
};

test("copia del motor sin cambios locales (huella del archivo del backend)", () => {
  const texto = readFileSync(RUTA_MOTOR, "utf8");
  const huella = /huella-backend: ([0-9a-f]{64})/.exec(texto)[1];
  const cuerpo = texto.slice(texto.indexOf("\n\n") + 2);
  assert.equal(createHash("sha256").update(cuerpo).digest("hex"), huella);
});

test("copia del motor: casos resueltos a mano del backend (C2, C3, C8, C12, C13)", () => {
  const c2 = L.calcularFiniquito({ fecha_ingreso: "2022-01-10", fecha_baja: "2025-06-15", salario_diario: 500, dias_salario_pendiente: 5, tipo_terminacion: "Despido Injustificado" });
  assert.equal(c2.total, 114866.29);
  const c3 = L.calcularFiniquito({ fecha_ingreso: "2019-08-01", fecha_baja: "2025-03-31", salario_diario: 600, tipo_terminacion: "Despido Justificado" });
  assert.equal(c3.total, 51115.13);
  const c8 = L.calcularFiniquito({ fecha_ingreso: "2016-01-01", fecha_baja: "2026-06-30", salario_diario: 1000, tipo_terminacion: "Rescisión Artículo 51", zona_salario_minimo: "zlfn" });
  assert.equal(c8.total, 450534.26);
  const c12 = L.calcularFiniquito({ fecha_ingreso: "2025-02-01", fecha_baja: "2026-01-31", salario_diario: 350, tipo_terminacion: "Despido Injustificado", incluir_20_dias: false });
  assert.equal(c12.total, 42949.29);
  assert.equal(L.calcularAguinaldo({ salario_diario: 400, fecha_ingreso: "2025-03-10", fecha_corte: "2025-12-31" }).monto, 4882.19);
});

test("panel = PDF: mismos conceptos, fórmulas e importes que mandó el servidor", () => {
  const det = respuesta({ fecha_ingreso: "2022-01-10", fecha_baja: "2025-06-15", salario_diario: 500, dias_salario_pendiente: 5, tipo_terminacion: "Despido Injustificado" });
  const r = resumenFiniquito(det);
  const pdf = renglonesPdfFiniquito(det);
  assert.equal(r.versionAnterior, false);
  assert.equal(r.total, 114866.29);
  assert.equal(pdf.total, "$114,866.29");
  const pantalla = r.filas.map((f) => [f.concepto, f.formula, dinero(f.monto)]);
  assert.deepEqual([...pdf.finiquito, ...pdf.indemnizacion], pantalla);
  assert.deepEqual(pantalla.map((f) => f[0]), [
    "Salario pendiente", "Aguinaldo proporcional", "Vacaciones pendientes y proporcionales", "Prima vacacional",
    "Prima de antigüedad", "Indemnización constitucional (90 días)", "20 días por año de servicio",
  ]);
  assert.equal(pantalla[4][1], "12 días × $500.00 × 3.4301 años = $20,580.60");
  assert.equal(pdf.subtotalFiniquito, dinero(det.subtotal_finiquito));
  assert.match(pdf.sdi, /1\.0534 = \$526\.70/);
  assert.equal(pdf.nota, NOTA_BRUTO);
});

test("tope de la prima de antigüedad explicado en pantalla y PDF", () => {
  const det = respuesta({ fecha_ingreso: "2019-08-01", fecha_baja: "2025-03-31", salario_diario: 600, tipo_terminacion: "Despido Justificado" });
  const r = resumenFiniquito(det);
  assert.equal(r.tope.aplicado, true);
  assert.equal(r.tope.monto, 557.6);
  assert.match(r.filas.find((f) => f.clave === "prima_antiguedad").nota, /doble del salario mínimo/);
  assert.match(renglonesPdfFiniquito(det).tope, /no el salario del empleado/);
});

test("renuncia: prima de antigüedad «No aplica» con su razón (pantalla y PDF)", () => {
  const det = respuesta({ fecha_ingreso: "2022-01-10", fecha_baja: "2025-06-15", salario_diario: 500, tipo_terminacion: "Renuncia Voluntaria" });
  const fila = resumenFiniquito(det).filas.find((f) => f.clave === "prima_antiguedad");
  assert.equal(fila.aplica, false);
  assert.match(renglonesPdfFiniquito(det).indemnizacion[0][1], /15 años/);
});

test("finiquito guardado con la versión anterior: importes guardados, sin fórmulas, marcado", () => {
  const viejo = { id_finiquito: 3, es_liquidacion: 1, tipo_terminacion: "Despido Injustificado", salario_diario: "500.00", monto_salario_pendiente: "100.00", monto_aguinaldo_proporcional: "200.00", monto_vacaciones_no_gozadas: "300.00", monto_prima_vacacional: "75.00", subtotal_finiquito: "675.00", monto_prima_antiguedad: "1000.00", monto_indemnizacion_constitucional: "45000.00", monto_salarios_vencidos: "0.00", subtotal_liquidacion: "46000.00", total_pagar: "46675.00", calculado_version_anterior: true };
  const r = resumenFiniquito(viejo);
  assert.equal(r.versionAnterior, true);
  assert.equal(r.total, 46675);
  assert.ok(r.filas.every((f) => f.formula === null));
  assert.equal(renglonesPdfFiniquito(viejo).total, "$46,675.00");
  assert.equal(renglonesPdfFiniquito(viejo).versionAnterior, true);
});

test("tipos de terminación: valores guardados de siempre; 20 días solo en despido injustificado y rescisión", () => {
  assert.deepEqual(TIPOS_TERMINACION.map((t) => t.valor), ["Renuncia Voluntaria", "Despido Justificado", "Despido Injustificado", "Rescisión Artículo 51", "Fin de Contrato", "Defunción", "Mutuo Acuerdo"]);
  assert.equal(incluye20Dias("Despido Injustificado"), true);
  assert.equal(incluye20Dias("Rescisión Artículo 51"), true);
  assert.equal(incluye20Dias("Despido Justificado"), false);
  assert.equal(tipoTerminacion("Otros"), null);
  for (const t of TIPOS_TERMINACION) assert.ok(L.tipoTerminacion(t.valor), `el servidor reconoce ${t.valor}`);
});

test("aguinaldo: fórmula del servidor, corte anual al 31/12 y periodo de faltas", () => {
  const r = L.calcularAguinaldo({ salario_diario: 450, fecha_ingreso: "2015-06-01", fecha_corte: "2025-12-15" });
  assert.equal(formulaAguinaldo(r), "15 días × 349/365 días trabajados × $450.00 = $6,454.11");
  assert.match(formulaAguinaldo({ monto_aguinaldo: "6750.00" }), /versión anterior/);
  assert.equal(corteAguinaldoPorOmision("2026-11-27"), "2026-12-31");
  assert.equal(inicioPeriodoAguinaldo("2022-01-10", "2025-06-15"), "2025-01-01");
  assert.equal(inicioPeriodoAguinaldo("2025-03-10", "2025-06-15"), "2025-03-10");
});

test("calculadora pública: cuerpo para el servidor", () => {
  const form = { tipoSalario: "mensual", salario: "12000", fechaIngreso: "2025-03-10", fechaCorte: "2025-12-31", diasAguinaldo: "15", diasNoLaborados: "0" };
  assert.equal(calculadoraLista(form), true);
  assert.equal(calculadoraLista({ ...form, salario: "" }), false);
  assert.deepEqual(cuerpoCalculadora(form), { tipo_salario: "mensual", salario: 12000, fecha_ingreso: "2025-03-10", fecha_corte: "2025-12-31", dias_aguinaldo: 15, dias_no_laborados: 0 });
});

test("vacaciones por periodo: el mayor entre la ley (tabla del servidor) y la regla de la empresa", async () => {
  const { diasVacacionesPeriodo } = await import("../src/lib/calculos/calculosLft.mjs");
  const tabla = L.tablaVacacionesLey(35);
  assert.equal(diasVacacionesPeriodo(1, [], tabla).dias, 12, "sin regla: 12 de ley (antes no se cargaba nada)");
  assert.match(diasVacacionesPeriodo(1, [], tabla).aviso, /12 días de la ley/);
  assert.equal(diasVacacionesPeriodo(8, [{ anios: 6, total_dias: 25 }], tabla).dias, 25, "regla de 6 años arriba de la ley");
  assert.equal(diasVacacionesPeriodo(8, [{ anios: 6, total_dias: 10 }], tabla).dias, 22, "regla por debajo de la ley");
  assert.equal(diasVacacionesPeriodo(0, [], tabla).dias, null);
});
