import test from "node:test";
import assert from "node:assert/strict";
import {
  seedState,
  demoCommand,
  loadDemo,
} from "../src/lib/evaluaciones/demoStore.mjs";
import {
  validateTemplate,
  validateCampaign,
  validateAnswers,
  responseScore,
  answerScore,
  personResult,
  makeAssignments,
  candidateEvaluators,
  copy,
  csvText,
  canSeeResult,
  newQuestion,
  civilToday,
  comparisonKey,
  validDate,
} from "../src/lib/evaluaciones/model.mjs";
const hr = { id: "p-rh", role: "hr" };
function fixture() {
  const s = seedState();
  s.campaigns
    .filter((c) => c.status === "active")
    .forEach((c) => {
      c.opensOn = civilToday();
      c.dueOn = civilToday();
    });
  return s;
}
test("semilla coherente: plantillas y campañas cumplen pesos, anonimato y asignaciones", () => {
  const s = fixture();
  s.templates.forEach((t) => assert.deepEqual(validateTemplate(t), []));
  s.campaigns.forEach((c) =>
    assert.deepEqual(
      validateCampaign(
        c,
        s.assignments.filter((a) => a.campaignId === c.id),
        s.people,
        s.templates,
      ),
      [],
    ),
  );
});
test("tipos de respuesta y cálculo ponderado: boolean false y numérico cero son respuestas", () => {
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
  const t = fixture().templates[0];
  const answers = Object.fromEntries(
    t.categories.flatMap((c) => c.questions.map((q) => [q.id, 4])),
  );
  assert.equal(responseScore(t, answers).score, 4);
  t.categories[0].questions[0].required = false;
  delete answers[t.categories[0].questions[0].id];
  assert.equal(responseScore(t, answers).score, 4);
});
test("validación de pesos y rangos; una categoría positiva vacía impide envío definitivo", () => {
  const t = fixture().templates[0];
  t.categories[0].weight = 24;
  assert.ok(validateTemplate(t).some((e) => e.includes("100%")));
  t.categories[0].weight = 25;
  t.categories[0].questionWeights = "custom";
  t.categories[0].questions.forEach((q) => (q.weight = 30));
  assert.ok(
    validateTemplate(t).some((e) => e.includes("pesos de sus preguntas")),
  );
  t.categories.forEach((c) => c.questions.forEach((q) => (q.required = false)));
  assert.ok(
    validateAnswers(t, {}, true).some((e) => e.includes("al menos una")),
  );
  assert.equal(responseScore(t, {}).score, null);
  assert.equal(validDate("2026-13-01"), false);
  assert.equal(validDate("2026-02-30"), false);
});
test("relaciones: descendente, ascendente, pares y self sin cruces inválidos", () => {
  const s = fixture(),
    j = s.people.find((p) => p.id === "p-jefe");
  assert.deepEqual(
    candidateEvaluators(s.people, j, "descending").map((p) => p.id),
    ["p-dir"],
  );
  assert.equal(candidateEvaluators(s.people, j, "ascending").length, 4);
  assert.equal(candidateEvaluators(s.people, j, "peer").length, 3);
  assert.deepEqual(
    candidateEvaluators(s.people, j, "self").map((p) => p.id),
    ["p-jefe"],
  );
  const c = s.campaigns[1],
    a = s.assignments.filter((a) => a.campaignId === c.id);
  a.push({ ...a[0] });
  assert.ok(
    validateCampaign(c, a, s.people, s.templates).some((e) =>
      e.includes("repetidas"),
    ),
  );
});
test("resultado 360 pondera promedios por perspectiva, nunca el número de evaluadores", () => {
  const s = fixture(),
    c = s.campaigns[1],
    values = { descending: 5, ascending: 2, peer: 4, self: 3 };
  s.assignments
    .filter((a) => a.campaignId === c.id)
    .forEach((a) => {
      a.status = "submitted";
      a.template.categories.forEach((cat) =>
        cat.questions.forEach((q) => (a.answers[q.id] = values[a.perspective])),
      );
    });
  assert.equal(personResult(s, c, "p-jefe").score, 3.8);
  const peer = s.assignments.filter(
    (a) => a.campaignId === c.id && a.perspective === "peer",
  );
  peer[0].status = "pending";
  const result = personResult(s, c, "p-jefe");
  assert.equal(result.score, null);
  assert.equal(result.groups.find((g) => g.key === "peer").score, null);
  assert.deepEqual(result.groups.find((g) => g.key === "peer").comments, []);
  assert.throws(
    () =>
      demoCommand(
        s,
        { type: "result.approve", campaignId: c.id, subjectId: "p-jefe" },
        hr,
      ),
    /Completa/,
  );
});
test("solo el evaluador asignado responde, se valida borrador y envío no es editable", () => {
  let s = fixture();
  const a = s.assignments.find(
    (a) =>
      a.subjectId === "p-carlos" &&
      a.perspective === "descending" &&
      a.campaignId === "camp-q3",
  );
  assert.throws(
    () => demoCommand(s, { type: "response.save", id: a.id, answers: {} }, hr),
    /Solo el evaluador/,
  );
  const actor = { id: "p-jefe", role: "manager" };
  assert.throws(
    () =>
      demoCommand(s, { type: "response.submit", id: a.id, answers: {} }, actor),
    /Responde/,
  );
  const answers = Object.fromEntries(
    a.template.categories.flatMap((c) => c.questions.map((q) => [q.id, 5])),
  );
  s = demoCommand(s, { type: "response.submit", id: a.id, answers }, actor);
  assert.equal(s.assignments.find((x) => x.id === a.id).status, "submitted");
  assert.throws(
    () => demoCommand(s, { type: "response.save", id: a.id, answers }, actor),
    /ya fue enviada/,
  );
});
test("aprobación → publicación → recepción; permisos impiden rutas y comandos ajenos", () => {
  let s = fixture(),
    c = s.campaigns[0];
  assert.equal(canSeeResult(s, "employee", "p-sofia", c, "p-sofia"), false);
  assert.equal(canSeeResult(s, "manager", "p-ventas", c, "p-mariana"), false);
  assert.throws(
    () =>
      demoCommand(
        s,
        { type: "result.publish", campaignId: c.id, subjectId: "p-sofia" },
        hr,
      ),
    /aprobar/,
  );
  s = demoCommand(
    s,
    { type: "result.approve", campaignId: c.id, subjectId: "p-sofia" },
    hr,
  );
  s = demoCommand(
    s,
    { type: "result.publish", campaignId: c.id, subjectId: "p-sofia" },
    hr,
  );
  assert.equal(canSeeResult(s, "employee", "p-sofia", c, "p-sofia"), true);
  assert.throws(
    () =>
      demoCommand(
        s,
        {
          type: "receipt.sign",
          campaignId: c.id,
          name: "Sofía",
          accepted: false,
        },
        { id: "p-sofia", role: "employee" },
      ),
    /confirma/,
  );
  s = demoCommand(
    s,
    { type: "receipt.sign", campaignId: c.id, name: "Sofía", accepted: true },
    { id: "p-sofia", role: "employee" },
  );
  assert.equal(s.receipts.length, 1);
  assert.throws(
    () =>
      demoCommand(
        s,
        {
          type: "receipt.sign",
          campaignId: c.id,
          name: "Sofía",
          accepted: true,
        },
        { id: "p-sofia", role: "employee" },
      ),
    /Ya confirmaste/,
  );
  assert.throws(
    () =>
      demoCommand(
        s,
        { type: "settings.save", settings: s.settings },
        { id: "p-jefe", role: "manager" },
      ),
    /corresponde a RH/,
  );
});
test("campañas fijan versiones y no cambian al editar plantilla ni preferencias", () => {
  let s = fixture();
  const c = copy(s.campaigns[0]);
  c.id = "camp-new";
  c.status = "draft";
  c.subjectIds = ["p-mariana"];
  s = demoCommand(
    s,
    {
      type: "campaign.save",
      campaign: c,
      assignments: makeAssignments(c, s.people, s.templates),
    },
    hr,
  );
  s = demoCommand(s, { type: "campaign.launch", campaignId: c.id }, hr);
  const old = comparisonKey(s.campaigns.find((x) => x.id === c.id));
  const t = copy(s.templates[0]);
  t.categories[0].questions[0].text = "Nueva pregunta";
  s = demoCommand(s, { type: "template.save", template: t }, hr);
  assert.notEqual(
    s.assignments.find((a) => a.campaignId === c.id).template.categories[0]
      .questions[0].text,
    "Nueva pregunta",
  );
  assert.equal(comparisonKey(s.campaigns.find((x) => x.id === c.id)), old);
  s = demoCommand(
    s,
    {
      type: "settings.save",
      settings: { ...s.settings, employeeScore: false },
    },
    hr,
  );
  assert.equal(
    s.campaigns.find((x) => x.id === c.id).settings.employeeScore,
    true,
  );
  assert.throws(
    () =>
      demoCommand(
        s,
        { type: "campaign.save", campaign: c, assignments: [] },
        hr,
      ),
    /iniciada conserva/,
  );
});
test("plan solo RH/jefe de su equipo; empleado sin permiso no puede actualizarlo", () => {
  let s = fixture();
  const p = copy(s.plans[0]);
  p.title = "Mejora";
  assert.throws(
    () =>
      demoCommand(
        s,
        { type: "plan.save", plan: p },
        { id: "p-ventas", role: "manager" },
      ),
    /jefe asignado/,
  );
  s.campaigns[0].settings.employeePlan = false;
  assert.throws(
    () =>
      demoCommand(
        s,
        { type: "plan.progress", id: p.id, status: "completed" },
        { id: "p-mariana", role: "employee" },
      ),
    /no está disponible/,
  );
});
test("persistencia versionada no borra silenciosamente datos corruptos; exportación protege fórmulas", () => {
  const s = fixture();
  assert.equal(
    loadDemo({ getItem: () => JSON.stringify(s) }, "scoped").revision,
    s.revision,
  );
  assert.throws(() => loadDemo({ getItem: () => "{bad" }, "scoped"), /leer/);
  assert.throws(
    () => loadDemo({ getItem: () => '{"schemaVersion":99}' }, "scoped"),
    /otra versión/,
  );
  assert.match(csvText([['=HYPERLINK("x")', "normal"]]), /"'=HYPERLINK/);
});
