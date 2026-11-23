// Reglas de pantalla del módulo de evaluaciones (src/lib/evaluaciones/model.mjs).
// (20/11/2026) Antes probaba la demostración (ya no existe). Resultados, campañas y permisos se prueban
// en el backend (scripts/test-evaluaciones-desempeno.mjs) y el cliente de la API en test-evaluaciones-api.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import {
  answerScore, civilToday, copy, newQuestion, newTemplate, validateAnswers, validateTemplate,
} from "../src/lib/evaluaciones/model.mjs";
import { filasCampana, pasosCampana } from "../src/lib/evaluaciones/avance.mjs";

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

// (20/11/2026) Avance de la campaña en una sola pantalla: pasos y fila por persona.

const campana = {
  status: "active",
  subjects: [{ employeeId: 1, name: "Ana" }, { employeeId: 2, name: "Luis" }],
  assignments: [
    { subjectId: 1, perspective: "self", status: "submitted" },
    { subjectId: 1, perspective: "descending", status: "submitted" },
    { subjectId: 2, perspective: "self", status: "submitted" },
    { subjectId: 2, perspective: "descending", status: "pending" },
    { subjectId: "2", perspective: "peer", status: "in_progress" },
  ],
};

test("fila por persona: respuestas, quién falta, resultado y planes", () => {
  const filas = filasCampana(campana, [{ subjectId: 1, score: 4.2, approvedAt: "2026-11-01" }], [{ subjectId: 1 }, { subjectId: 1 }]);
  assert.deepEqual(filas.map((f) => [f.nombre, f.respondidas, f.total, f.faltan, f.planes]), [
    ["Ana", 2, 2, [], 2],
    ["Luis", 1, 3, ["su jefe", "pares"], 0],
  ]);
  assert.equal(filas[0].resultado.score, 4.2);
  assert.equal(filas[1].resultado, null);
  assert.deepEqual(filasCampana(null), []);
});

test("pasos: el primero sin terminar es el actual", () => {
  const estados = (c, r = [], p = []) => pasosCampana(c, filasCampana(c, r, p)).map((x) => x.estado);
  assert.deepEqual(estados({ ...campana, status: "draft" }), ["actual", "pendiente", "pendiente", "pendiente", "pendiente"]);
  assert.deepEqual(estados(campana), ["hecho", "actual", "pendiente", "pendiente", "pendiente"]);
  const pasos = pasosCampana(campana, filasCampana(campana));
  assert.equal(pasos[1].detalle, "3 de 5 (60 %)");
  // Cerrada aunque falten respuestas: ya se revisa.
  const cerrada = { ...campana, status: "closed" };
  assert.deepEqual(estados(cerrada, [{ subjectId: 1, approvedAt: "x" }]), ["hecho", "hecho", "actual", "pendiente", "pendiente"]);
  const publicados = [{ subjectId: 1, publishedAt: "x" }, { subjectId: 2, publishedAt: "x" }];
  assert.deepEqual(estados(cerrada, publicados, [{ subjectId: 2 }]), ["hecho", "hecho", "hecho", "hecho", "actual"]);
  assert.equal(pasosCampana(cerrada, filasCampana(cerrada, publicados, [{ subjectId: 2 }]))[4].detalle, "1 con plan");
});

// (23/11/2026) Cada vista con su dirección y su entrada en el menú (src/lib/evaluaciones/vistas.mjs).
test("vistas por perfil: RH, Dirección, jefe y colaborador ven lo mismo que antes, y Configuración es vista propia", async () => {
  const { vistasVisibles, vistaInicio, vistaActual, seccionConfiguracion, SCOPE_DE_RUTA } = await import("../src/lib/evaluaciones/vistas.mjs");
  const rh = { flags: { canViewCampaigns: true }, scopes: ["templates", "settings", "campaigns", "assignments", "team", "results", "plans"] };
  const direccion = { flags: { canViewCampaigns: true }, scopes: ["catalogs", "people", "campaigns", "results", "dashboard", "plans"] };
  const jefe = { flags: {}, scopes: ["people", "assignments", "team", "results", "plans"] };
  const colaborador = { flags: {}, scopes: ["people", "assignments", "results", "plans"] };
  const paths = (c, p) => vistasVisibles(c, p).map((v) => v.path);
  assert.deepEqual(paths(rh, false), ["campanas", "plantillas", "configuracion"]);
  assert.deepEqual(paths(rh, true), ["campanas", "plantillas", "mis-pendientes", "configuracion"]);
  assert.deepEqual(paths(direccion, true), ["campanas"]);
  assert.deepEqual(paths(jefe, false), ["mis-pendientes", "equipo", "mis-evaluaciones"]);
  assert.deepEqual(paths(colaborador, false), ["mis-pendientes", "mis-evaluaciones"]);
  assert.deepEqual([rh, direccion, jefe, colaborador].map(vistaInicio), ["campanas", "campanas", "mis-pendientes", "mis-pendientes"]);
  assert.equal(vistaActual("campanas/7/editar"), "campanas");
  assert.equal(vistaActual("responder/15"), "mis-pendientes");
  assert.equal(vistaActual("configuracion/niveles"), "configuracion");
  assert.equal(seccionConfiguracion("configuracion").texto, "Valores iniciales");
  assert.equal(seccionConfiguracion("configuracion/niveles").texto, "Niveles");
  assert.equal(seccionConfiguracion("configuracion/acceso/").texto, "Acceso al módulo");
  assert.equal(seccionConfiguracion("configuracion/otra"), null);
  assert.equal(SCOPE_DE_RUTA.configuracion, "settings");
  assert.equal(SCOPE_DE_RUTA.responder, "assignments");
});
