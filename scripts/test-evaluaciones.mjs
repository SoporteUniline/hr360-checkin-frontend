// Reglas de pantalla del módulo de evaluaciones (src/lib/evaluaciones/model.mjs).
// (20/11/2026) Antes probaba la demostración (ya no existe). Resultados, campañas y permisos se prueban
// en el backend (scripts/test-evaluaciones-desempeno.mjs) y el cliente de la API en test-evaluaciones-api.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import {
  answerScore, civilToday, copy, newQuestion, newTemplate, validateAnswers, validateTemplate,
} from "../src/lib/evaluaciones/model.mjs";

// Plantilla válida: 4 categorías de 25 % con una pregunta de escala cada una.
function plantilla() {
  const t = newTemplate();
  t.name = "Desempeño anual";
  t.categories = ["Calidad", "Puntualidad", "Equipo", "Servicio"].map((name) => ({
    ...copy(t.categories[0]), id: `cat-${name}`, name, weight: 25,
    questions: [{ ...newQuestion(), id: `q-${name}`, text: `¿${name}?` }],
  }));
  return t;
}

test("tipos de respuesta: falso y cero sí son respuestas; fuera de rango o texto no puntúan", () => {
  const q = newQuestion();
  q.type = "boolean";
  assert.equal(answerScore(q, false), 1);
  q.type = "number";
  assert.equal(answerScore(q, 0), 1);
  assert.equal(answerScore(q, 10), 5);
  assert.equal(answerScore(q, 11), null);
  q.type = "choice";
  assert.equal(answerScore(q, q.options[1].id), 5);
  q.type = "text";
  assert.equal(answerScore(q, "cinco"), null);
});

test("plantilla: los pesos de categorías suman 100 % y los de preguntas personalizados también", () => {
  const t = plantilla();
  assert.deepEqual(validateTemplate(t), []);
  t.categories[0].weight = 24;
  assert.ok(validateTemplate(t).some((e) => e.includes("100%")));
  t.categories[0].weight = 25;
  t.categories[0].questionWeights = "custom";
  t.categories[0].questions.forEach((q) => (q.weight = 30));
  assert.ok(validateTemplate(t).some((e) => e.includes("pesos de sus preguntas")));
});

test("respuestas: el envío definitivo exige al menos una respuesta con puntaje", () => {
  const t = plantilla();
  t.categories.forEach((c) => c.questions.forEach((q) => (q.required = false)));
  assert.ok(validateAnswers(t, {}, true).some((e) => e.includes("al menos una")));
  const respuestas = Object.fromEntries(t.categories.flatMap((c) => c.questions.map((q) => [q.id, 4])));
  assert.deepEqual(validateAnswers(t, respuestas, true), []);
  assert.match(civilToday(), /^\d{4}-\d{2}-\d{2}$/);
});
