// Nómina formal: apoyos de las pantallas (src/lib/nomina/formal.mjs). Puras, sin navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparTablas, cambiosDe, conceptosGravados, esFiscal, filasDesglose, motivosParaNoEncender, tarjetasFormal, vigencia } from "../src/lib/nomina/formal.mjs";

const fiscal = {
  formal: true, calculado: true, gravado: 6000, exento: 0, isr_tarifa: 475.67, isr_retenido: 475.67, tarifa: { texto: "Tarifa de 15 días derivada de la mensual (÷ 30.4 × 15)" },
  subsidio: { elegible: false, aplicado: 0 }, sbc: { diario: 420.84, formula: "$400.00 × 1.0521" }, dias_cotizados: 15,
  imss: { obrero: 154.05, obrero_a_cargo_patron: 0, patronal: 1232.42 },
  conceptos: [{ clave: "sueldo", concepto: "Sueldo", importe: 6000, gravado: 6000, exento: 0 }, { clave: "concepto:2", concepto: "Puntualidad", importe: 0, gravado: 0, exento: 0 }],
};

test("ISR e IMSS son renglones fiscales (no se editan a mano)", () => {
  assert.equal(esFiscal("isr"), true);
  assert.equal(esFiscal("imss_obrero"), true);
  assert.equal(esFiscal("sueldo"), false);
});

test("desglose del recibo: gravado, exento, ISR, subsidio, SBC, IMSS y patronal en pesos", () => {
  const f = filasDesglose(fiscal);
  const de = (k) => f.find((x) => x.clave === k);
  assert.equal(de("isr").valor, "$475.67");
  assert.equal(de("isr").fuerte, true);
  assert.equal(de("imss").valor, "$154.05");
  assert.equal(de("patronal").valor, "$1,232.42");
  assert.match(de("subsidio").nota, /no aplica/i);
  assert.match(de("isr_tarifa").texto, /15 días/);
  assert.deepEqual(filasDesglose({ formal: true, calculado: false }), [], "sin calcular no hay desglose");
  assert.deepEqual(filasDesglose(null), []);
  const minimo = filasDesglose({ ...fiscal, imss: { obrero: 0, obrero_a_cargo_patron: 118.07, patronal: 1126.83 } });
  assert.match(minimo.find((x) => x.clave === "imss").nota, /paga el patrón \(\$118\.07\)/);
  const conSubsidio = filasDesglose({ ...fiscal, subsidio: { elegible: true, aplicado: 264.3 } });
  assert.equal(conSubsidio.find((x) => x.clave === "subsidio").valor, "− $264.30");
});

test("solo los conceptos con importe en la tabla gravado/exento", () => {
  assert.deepEqual(conceptosGravados(fiscal).map((c) => c.clave), ["sueldo"]);
});

test("por qué no se enciende: tablas por confirmar primero, luego datos de la empresa", () => {
  assert.deepEqual(motivosParaNoEncender({ tablas: { completas: true }, faltantes: { empresa: { bloquea: [] } } }), []);
  const m = motivosParaNoEncender({ tablas: { completas: false, anio: 2026, pendientes: [{}, {}] }, faltantes: { empresa: { bloquea: ["Registro patronal"] } } });
  assert.equal(m.length, 2);
  assert.match(m[0], /2026 tienen 2 valores por confirmar/);
  assert.equal(m[1], "Falta en la empresa: Registro patronal.");
});

test("tablas agrupadas en el orden del catálogo, con pendientes por grupo", () => {
  const g = agruparTablas([{ grupo: "UMA", estado: "confirmado" }, { grupo: "UMA", estado: "por_confirmar" }, { grupo: "ISR", estado: "por_confirmar" }]);
  assert.deepEqual(g.map((x) => [x.grupo, x.valores.length, x.pendientes]), [["UMA", 2, 1], ["ISR", 1, 1]]);
  assert.equal(vigencia({ desde: "2026-02-01", hasta: "2027-01-31" }), "01/02/2026 al 31/01/2027");
});

test("tarjetas del periodo formal y cambios del formulario (solo lo que cambió)", () => {
  assert.deepEqual(tarjetasFormal({ isr: 475.67, subsidio: 0, imss_obrero: 154.05, imss_patronal: 1232.42 }).map((t) => t.valor), ["$475.67", "$154.05", "$1,232.42"]);
  assert.deepEqual(tarjetasFormal(null), []);
  assert.deepEqual(cambiosDe({ rfc: "ABC", cp_expedicion: null, prima_riesgo: 0.54355 }, { rfc: "ABC", cp_expedicion: "06600", prima_riesgo: "" }), { cp_expedicion: "06600", prima_riesgo: null });
});
