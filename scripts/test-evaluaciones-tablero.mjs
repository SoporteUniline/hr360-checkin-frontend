// Tablero, IA y evidencia de Evaluación del desempeño (src/lib/evaluaciones/tablero.mjs, 26/11/2026). Los números los
// calcula el servidor (tests/desempenoPlantillasIa.test.cjs del backend); aquí, cómo se muestran y cómo se aplica una
// sugerencia de la IA sin guardar ni pisar lo ya contestado. El cliente de la API: test-evaluaciones-api.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { aplicarBorrador, filasCalor, frasesEvidencia, mensajeIa, num, pct, planDeSugerencia, tonoCalificacion } from "../src/lib/evaluaciones/tablero.mjs";
import { createEvaluationApi } from "../src/lib/evaluaciones/api.mjs";

test("semáforo con los mismos cortes que el servidor (<3, 3–3.99, ≥4)", () => {
  assert.deepEqual([2.99, 3, 3.99, 4, null].map(tonoCalificacion), ["red", "amber", "amber", "green", "gray"]);
  assert.equal(num(3.456), "3.46");
  assert.equal(num(null), "—");
  assert.equal(pct(83.33), "83.3 %");
  assert.equal(pct(50), "50 %");
});

test("borrador de la IA: llena solo lo vacío por omisión, no aplica valores nulos y no guarda nada", () => {
  const actuales = { 11: 2, 12: "" };
  const sugeridas = [{ id: 11, valor: 5 }, { id: 12, valor: 4 }, { id: 13, valor: null }, { id: 14, valor: true }];
  const r = aplicarBorrador(actuales, sugeridas);
  assert.deepEqual(r.respuestas, { 11: 2, 12: 4, 14: true });
  assert.equal(r.aplicadas, 2);
  assert.deepEqual(actuales, { 11: 2, 12: "" }, "no muta lo que ya había");
  assert.equal(aplicarBorrador(actuales, sugeridas, { reemplazar: true }).respuestas[11], 5);
});

test("plan sugerido → formulario de plan con fecha a N días", () => {
  assert.deepEqual(planDeSugerencia({ titulo: "Curso", medidaDeExito: "0 errores", dias: 30 }, new Date(2026, 10, 26)), {
    title: "Curso",
    successMeasure: "0 errores",
    dueOn: "2026-12-26",
  });
});

test("mensajes de la IA y mapa de calor con n chico marcado", () => {
  assert.match(mensajeIa({ code: "IA_SIN_CREDITOS" }), /Recarga/);
  assert.match(mensajeIa({ code: "SIN_MIGRACION" }), /base de datos/);
  const f = filasCalor({ rows: [{ key: "c", name: "Calidad", cells: [{ areaId: 1, n: 2, average: 2.5 }, { areaId: 2, n: 0, average: null }] }] });
  assert.deepEqual(f[0].cells.map((c) => [c.tono, c.texto, c.pocos]), [["red", "2.50", true], ["gray", "—", false]]);
});

test("evidencia: frases sin penalizar ausencias justificadas", () => {
  const f = frasesEvidencia({ asistencia: { asistenciaPct: 66.7, puntualidadPct: 50, faltas: 1, retardos: 1, horasExtra: 1.5, justificadas: { total: 2 }, sinHorario: false } });
  assert.deepEqual(f, ["Asistencia 66.7 % · puntualidad 50 %", "1 falta · 1 retardo · 1.5 h extra", "2 ausencias justificadas (no cuentan en contra)"]);
  assert.deepEqual(frasesEvidencia(null), []);
});

test("cliente: descarga de PDF autenticada con la empresa y como archivo", async () => {
  const pedidos = [];
  const http = { defaults: { baseURL: "https://api.prueba.invalid/api" }, request: async (o) => (pedidos.push(o), { data: new Blob(["%PDF"]) }) };
  const api = createEvaluationApi(http, 7);
  const r = await api.download("/campaigns/3/report.pdf", "informe.pdf");
  assert.equal(r.filename, "informe.pdf");
  assert.equal(pedidos[0].url, "/checador/evaluaciones-desempeno/campaigns/3/report.pdf");
  assert.equal(pedidos[0].responseType, "blob");
  assert.deepEqual(pedidos[0].params, { empresa: 7 });
});
