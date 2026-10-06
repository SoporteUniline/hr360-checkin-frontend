// Contrato y reglas puras compartidas por la demostración y sus pruebas.
export const SCHEMA_VERSION = 1;
export const PERSPECTIVES = {
  descending: "Descendente · Jefe",
  ascending: "Ascendente · Colaboradores",
  peer: "Horizontal · Pares",
  self: "Autoevaluación",
  hr: "RH",
};
export const TYPES = {
  scale: "Escala 1 a 5",
  boolean: "Sí / No",
  text: "Texto abierto",
  choice: "Opción múltiple",
  number: "Calificación numérica",
};
export const PRESETS = {
  descending: { label: "Descendente", weights: { descending: 100 } },
  ascending: { label: "Ascendente", weights: { ascending: 100 } },
  horizontal: { label: "Horizontal", weights: { peer: 100 } },
  self: { label: "Autoevaluación", weights: { self: 100 } },
  180: { label: "180°", weights: { descending: 80, self: 20 } },
  270: { label: "270°", weights: { descending: 50, peer: 30, self: 20 } },
  360: {
    label: "360°",
    weights: { descending: 40, ascending: 25, peer: 25, self: 10 },
  },
  custom: { label: "Personalizada", weights: { descending: 50, hr: 50 } },
};
export const DEFAULT_SETTINGS = {
  employeeScore: true,
  employeeCategories: true,
  employeeComments: true,
  employeePlan: true,
  managerResults: true,
  requireApproval: true,
  requireReceipt: true,
  anonymousPeers: true,
  anonymousAscending: true,
  minimumResponses: 3,
};
export const SCALE = ["Muy bajo", "Bajo", "Moderado", "Alto", "Muy alto"].map(
  (label, i) => ({
    value: i + 1,
    label,
    description: [
      "Rendimiento no aceptable",
      "Rendimiento regular",
      "Rendimiento bueno",
      "Rendimiento muy bueno",
      "Rendimiento excelente",
    ][i],
  }),
);
export const BANDS = [
  { label: "Requiere seguimiento", min: 1, max: 2.99, color: "red" },
  { label: "En progreso", min: 3, max: 3.99, color: "amber" },
  { label: "Buen desempeño", min: 4, max: 5, color: "green" },
];
export const uid = (prefix = "id") =>
  `${prefix}-${globalThis.crypto.randomUUID()}`;
export const copy = (value) => JSON.parse(JSON.stringify(value));
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const numeric = (value) =>
  value !== "" &&
  value !== null &&
  value !== undefined &&
  Number.isFinite(Number(value))
    ? Number(value)
    : null;
export const round = (value) =>
  value === null ? null : Math.round((value + Number.EPSILON) * 100) / 100;
export const average = (values) =>
  values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null;
export const scoreText = (score) =>
  score === null || score === undefined ? "—" : Number(score).toFixed(2);
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function civilToday(timezone = "America/Mexico_City") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function campaignStatus(c) {
  const today = civilToday(c.timezone);
  return ["active", "scheduled"].includes(c.status)
    ? c.dueOn < today
      ? "overdue"
      : c.opensOn > today
        ? "scheduled"
        : "active"
    : c.status;
}
export const dateText = (value) =>
  value
    ? new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${String(value).slice(0, 10)}T12:00:00Z`))
    : "Sin fecha";
export const questions = (template) =>
  template.categories.flatMap((category) => category.questions);
export const bandFor = (template, score) =>
  score === null
    ? { label: "Sin resultado", color: "gray" }
    : template.bands.find(
        (band) => round(score) >= band.min && round(score) <= band.max,
      ) || { label: "Por clasificar", color: "gray" };
export const isScored = (question) =>
  question.type !== "text" && question.scored !== false;
export function newQuestion() {
  return {
    id: uid("q"),
    text: "",
    type: "scale",
    required: true,
    scored: true,
    weight: 1,
    min: 0,
    max: 10,
    options: [
      { id: uid("o"), label: "Opción 1", score: 1 },
      { id: uid("o"), label: "Opción 2", score: 5 },
    ],
    yesScore: 5,
    noScore: 1,
  };
}
export function newTemplate() {
  return {
    id: uid("tpl"),
    name: "",
    description: "",
    area: "Todas",
    position: "Todos",
    version: 1,
    archived: false,
    scale: copy(SCALE),
    bands: copy(BANDS),
    categories: [
      {
        id: uid("cat"),
        name: "Nueva categoría",
        weight: 100,
        questionWeights: "equal",
        questions: [newQuestion()],
      },
    ],
  };
}
export function validateTemplate(template) {
  const errors = [];
  if (!template.name.trim()) errors.push("Escribe el nombre de la plantilla.");
  if (!template.categories.length)
    errors.push("Agrega al menos una categoría.");
  const total = template.categories.reduce(
    (sum, c) => sum + Number(c.weight || 0),
    0,
  );
  if (Math.abs(total - 100) > 0.001)
    errors.push(
      `El peso de las categorías debe sumar 100% (actual: ${round(total)}%).`,
    );
  const categoryIds = new Set(),
    questionIds = new Set();
  for (const category of template.categories) {
    if (categoryIds.has(category.id)) errors.push("Hay categorías duplicadas.");
    categoryIds.add(category.id);
    if (!category.name.trim())
      errors.push("Todas las categorías necesitan un nombre.");
    if (
      numeric(category.weight) === null ||
      category.weight < 0 ||
      category.weight > 100
    )
      errors.push(`Revisa el peso de ${category.name}.`);
    if (!category.questions.length)
      errors.push(`${category.name}: agrega al menos una pregunta.`);
    const scored = category.questions.filter(isScored);
    if (!scored.length && Number(category.weight) > 0)
      errors.push(
        `${category.name}: las preguntas de texto no califican; asigna peso 0% o agrega una pregunta calificable.`,
      );
    if (
      category.questionWeights === "custom" &&
      scored.length &&
      Math.abs(scored.reduce((s, q) => s + Number(q.weight || 0), 0) - 100) >
        0.001
    )
      errors.push(
        `${category.name}: los pesos de sus preguntas deben sumar 100%.`,
      );
    for (const q of category.questions) {
      if (questionIds.has(q.id)) errors.push("Hay preguntas duplicadas.");
      questionIds.add(q.id);
      if (!q.text.trim())
        errors.push(`${category.name}: hay una pregunta sin texto.`);
      if (!TYPES[q.type]) errors.push("Tipo de pregunta no válido.");
      if (
        isScored(q) &&
        category.questionWeights === "custom" &&
        (numeric(q.weight) === null || q.weight <= 0 || q.weight > 100)
      )
        errors.push("Cada pregunta calificable necesita un peso mayor a 0.");
      if (
        q.type === "number" &&
        (numeric(q.min) === null ||
          numeric(q.max) === null ||
          Number(q.max) <= Number(q.min))
      )
        errors.push(`${q.text}: el máximo debe ser mayor al mínimo.`);
      if (
        q.type === "boolean" &&
        isScored(q) &&
        [q.yesScore, q.noScore].some(
          (n) => numeric(n) === null || n < 1 || n > 5,
        )
      )
        errors.push("Las respuestas Sí/No necesitan puntuaciones entre 1 y 5.");
      if (
        q.type === "choice" &&
        (q.options.length < 2 ||
          q.options.some(
            (o) =>
              !o.label.trim() ||
              (isScored(q) &&
                (numeric(o.score) === null || o.score < 1 || o.score > 5)),
          ))
      )
        errors.push(
          `${q.text}: define al menos dos opciones y sus puntuaciones de 1 a 5.`,
        );
    }
  }
  if (
    template.scale.length !== 5 ||
    template.scale.some(
      (s, i) => s.value !== i + 1 || !s.label.trim() || !s.description.trim(),
    )
  )
    errors.push("Completa los cinco niveles de la escala.");
  const bands = [...template.bands].sort(
    (a, b) => Number(a.min) - Number(b.min),
  );
  if (
    !bands.length ||
    Number(bands[0].min) !== 1 ||
    Number(bands.at(-1).max) !== 5 ||
    bands.some(
      (b, i) =>
        !b.label.trim() ||
        numeric(b.min) === null ||
        numeric(b.max) === null ||
        Number(b.min) > Number(b.max) ||
        (i > 0 &&
          Math.round(b.min * 100) !== Math.round(bands[i - 1].max * 100) + 1),
    )
  )
    errors.push(
      "El semáforo debe cubrir de 1.00 a 5.00, sin huecos ni rangos superpuestos.",
    );
  return [...new Set(errors)];
}
export function answerScore(q, value) {
  if (!isScored(q) || value === "" || value === null || value === undefined)
    return null;
  if (q.type === "scale")
    return Number.isInteger(Number(value)) && value >= 1 && value <= 5
      ? Number(value)
      : null;
  if (q.type === "boolean")
    return value === true
      ? Number(q.yesScore)
      : value === false
        ? Number(q.noScore)
        : null;
  if (q.type === "choice")
    return numeric(q.options.find((o) => o.id === value)?.score);
  if (q.type === "number") {
    const n = numeric(value);
    return n !== null && n >= Number(q.min) && n <= Number(q.max)
      ? 1 + (4 * (n - Number(q.min))) / (Number(q.max) - Number(q.min))
      : null;
  }
  return null;
}
export function answerPresent(q, value) {
  return q.type === "text"
    ? typeof value === "string" && !!value.trim()
    : q.type === "choice"
      ? q.options.some((o) => o.id === value)
      : q.type === "boolean"
        ? typeof value === "boolean"
        : numeric(value) !== null;
}
export function validateAnswers(template, answers, complete = false) {
  const errors = [];
  for (const q of questions(template)) {
    const value = answers[q.id];
    if (!answerPresent(q, value)) {
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(q.type === "text" && typeof value === "string" && !value.trim())
      )
        errors.push(`Tipo de respuesta no válido: ${q.text}`);
      else if (complete && q.required) errors.push(`Responde: ${q.text}`);
      continue;
    }
    if (isScored(q) && answerScore(q, value) === null)
      errors.push(`Respuesta fuera del rango permitido: ${q.text}`);
    if (
      q.type === "scale" &&
      (!Number.isInteger(Number(value)) || value < 1 || value > 5)
    )
      errors.push(`Revisa la escala de: ${q.text}`);
    if (
      q.type === "number" &&
      (Number(value) < Number(q.min) || Number(value) > Number(q.max))
    )
      errors.push(`Revisa el rango de: ${q.text}`);
    if (q.type === "text" && value.length > 4000)
      errors.push("Los comentarios permiten hasta 4,000 caracteres.");
  }
  if (complete)
    for (const category of template.categories)
      if (
        Number(category.weight) > 0 &&
        !category.questions.some(
          (q) => isScored(q) && answerScore(q, answers[q.id]) !== null,
        )
      )
        errors.push(
          `${category.name}: responde al menos una pregunta calificable.`,
        );
  return errors;
}
export function responseScore(template, answers) {
  const categories = template.categories.map((category) => {
    const entries = category.questions
      .filter(isScored)
      .map((q) => ({
        value: answerScore(q, answers[q.id]),
        weight: category.questionWeights === "custom" ? Number(q.weight) : 1,
      }))
      .filter((e) => e.value !== null);
    const total = entries.reduce((s, e) => s + e.weight, 0);
    return {
      id: category.id,
      name: category.name,
      weight: Number(category.weight),
      score: total
        ? entries.reduce((s, e) => s + e.value * e.weight, 0) / total
        : null,
    };
  });
  // Una categoría positiva sin respuestas no se convierte en cero ni se redistribuye.
  const incomplete = categories.some((c) => c.weight > 0 && c.score === null);
  return {
    score: incomplete
      ? null
      : categories.reduce((s, c) => s + ((c.score ?? 0) * c.weight) / 100, 0),
    categories,
  };
}
export function progress(assignment) {
  const list = questions(assignment.template);
  return {
    total: list.length,
    answered: list.filter((q) => answerPresent(q, assignment.answers[q.id]))
      .length,
  };
}
export function candidateEvaluators(people, subject, perspective) {
  return people.filter(
    (p) =>
      p.active !== false &&
      (perspective === "self"
        ? p.id === subject.id
        : p.id !== subject.id &&
          (perspective === "descending"
            ? p.id === subject.managerId
            : perspective === "ascending"
              ? p.managerId === subject.id
              : perspective === "peer"
                ? p.level === subject.level
                : perspective === "hr"
                  ? p.role === "hr"
                  : false)),
  );
}
export function makeAssignments(campaign, people, templates) {
  const assignments = [];
  for (const subjectId of campaign.subjectIds) {
    const person = people.find((p) => p.id === subjectId);
    if (!person) continue;
    for (const group of campaign.groups) {
      const template = templates.find((t) => t.id === group.templateId);
      if (!template) continue;
      for (const evaluator of candidateEvaluators(people, person, group.key))
        assignments.push({
          id: uid("assignment"),
          campaignId: campaign.id,
          subjectId,
          evaluatorId: evaluator.id,
          perspective: group.key,
          status: "pending",
          template: copy(template),
          answers: {},
          categoryComments: {},
          comment: "",
          privateNote: "",
          submittedAt: null,
          updatedAt: null,
        });
    }
  }
  return assignments;
}
export function validateCampaign(campaign, assignments, people, templates) {
  const errors = [];
  if (!campaign.name.trim()) errors.push("Escribe el nombre de la campaña.");
  for (const field of ["periodStart", "periodEnd", "opensOn", "dueOn"])
    if (!validDate(campaign[field]))
      errors.push("Completa fechas válidas para el periodo y la campaña.");
  if (campaign.periodStart > campaign.periodEnd)
    errors.push("El inicio del periodo debe ser anterior al fin.");
  if (campaign.opensOn > campaign.dueOn)
    errors.push("La fecha límite debe ser igual o posterior a la apertura.");
  if (!campaign.subjectIds.length)
    errors.push("Selecciona al menos un evaluado.");
  if (
    !campaign.groups.length ||
    Math.abs(
      campaign.groups.reduce((s, g) => s + Number(g.weight || 0), 0) - 100,
    ) > 0.001
  )
    errors.push("Los pesos de las perspectivas deben sumar 100%.");
  if (
    !Number.isInteger(Number(campaign.settings.minimumResponses)) ||
    campaign.settings.minimumResponses < 3 ||
    campaign.settings.minimumResponses > 20
  )
    errors.push("El mínimo agrupado debe ser un entero de 3 a 20.");
  const primaryTemplate = templates.find((t) => t.id === campaign.templateId);
  if (!primaryTemplate || primaryTemplate.archived)
    errors.push("Selecciona una plantilla principal disponible.");
  const groups = new Set();
  for (const group of campaign.groups) {
    if (groups.has(group.key) || !PERSPECTIVES[group.key])
      errors.push("Las perspectivas deben ser válidas y no repetirse.");
    groups.add(group.key);
    if (
      numeric(group.weight) === null ||
      group.weight <= 0 ||
      group.weight > 100
    )
      errors.push("Cada perspectiva necesita un peso mayor a cero.");
    const template = templates.find((t) => t.id === group.templateId);
    if (!template || template.archived || validateTemplate(template).length)
      errors.push(`Revisa la plantilla de ${PERSPECTIVES[group.key]}.`);
  }
  const seen = new Set();
  for (const a of assignments) {
    const subject = people.find((p) => p.id === a.subjectId),
      evaluator = people.find((p) => p.id === a.evaluatorId);
    const key = `${a.subjectId}:${a.evaluatorId}:${a.perspective}`;
    if (seen.has(key)) errors.push("Hay asignaciones repetidas.");
    seen.add(key);
    if (
      !subject ||
      !evaluator ||
      !campaign.subjectIds.includes(a.subjectId) ||
      !groups.has(a.perspective) ||
      !candidateEvaluators(people, subject, a.perspective).some(
        (p) => p.id === a.evaluatorId,
      )
    )
      errors.push(
        "Hay asignaciones que no corresponden a la relación elegida.",
      );
  }
  for (const subjectId of campaign.subjectIds)
    for (const group of campaign.groups) {
      const matches = assignments.filter(
        (a) => a.subjectId === subjectId && a.perspective === group.key,
      );
      const name = people.find((p) => p.id === subjectId)?.name || subjectId;
      if (!matches.length)
        errors.push(`${name}: falta evaluador ${PERSPECTIVES[group.key]}.`);
      const anonymous =
        group.key === "peer"
          ? campaign.settings.anonymousPeers
          : group.key === "ascending"
            ? campaign.settings.anonymousAscending
            : false;
      if (
        anonymous &&
        matches.length < Number(campaign.settings.minimumResponses)
      )
        errors.push(
          `${name}: ${PERSPECTIVES[group.key]} necesita al menos ${campaign.settings.minimumResponses} evaluadores para mostrar resultados agrupados.`,
        );
    }
  return [...new Set(errors)];
}
export function personResult(state, campaign, subjectId) {
  const all = state.assignments.filter(
    (a) => a.campaignId === campaign.id && a.subjectId === subjectId,
  );
  const groups = campaign.groups.map((group) => {
    const rows = all.filter((a) => a.perspective === group.key),
      done = rows.filter((a) => a.status === "submitted");
    const anon =
      group.key === "peer"
        ? campaign.settings.anonymousPeers
        : group.key === "ascending"
          ? campaign.settings.anonymousAscending
          : false;
    const privateGroup =
      anon && done.length < Number(campaign.settings.minimumResponses);
    const scored = done.map((a) => responseScore(a.template, a.answers));
    const values = scored.map((r) => r.score).filter((s) => s !== null);
    return {
      ...group,
      total: rows.length,
      done: done.length,
      privateGroup,
      score: privateGroup ? null : average(values),
      categories: privateGroup ? [] : scored.flatMap((r) => r.categories),
      comments: privateGroup ? [] : done.map((a) => a.comment).filter(Boolean),
    };
  });
  const complete =
    all.length > 0 &&
    groups.every((g) => g.total > 0 && g.done === g.total && g.score !== null);
  const score = complete
    ? groups.reduce((sum, g) => sum + (g.score * Number(g.weight)) / 100, 0)
    : null;
  const byCategory = new Map();
  for (const group of groups) {
    const ids = [...new Set(group.categories.map((c) => c.id))];
    for (const id of ids) {
      const cs = group.categories.filter(
        (c) => c.id === id && c.score !== null,
      );
      if (!cs.length) continue;
      const current = byCategory.get(id) || {
        id,
        name: cs[0].name,
        weighted: 0,
        weight: 0,
      };
      current.weighted +=
        average(cs.map((c) => c.score)) * Number(group.weight);
      current.weight += Number(group.weight);
      byCategory.set(id, current);
    }
  }
  const publication = state.publications.find(
    (p) => p.campaignId === campaign.id && p.subjectId === subjectId,
  );
  return {
    subjectId,
    campaignId: campaign.id,
    score: round(score),
    complete,
    groups,
    categories: [...byCategory.values()].map((c) => ({
      id: c.id,
      name: c.name,
      score: round(c.weighted / c.weight),
    })),
    done: all.filter((a) => a.status === "submitted").length,
    total: all.length,
    publication,
  };
}
export function scopeSubjects(state, role, actorId) {
  return role === "hr" || role === "direction"
    ? state.people
    : role === "manager"
      ? state.people.filter((p) => p.managerId === actorId)
      : state.people.filter((p) => p.id === actorId);
}
export function canSeeResult(state, role, actorId, campaign, subjectId) {
  if (role === "hr" || role === "direction") return true;
  const result = personResult(state, campaign, subjectId);
  if (subjectId === actorId) return !!result.publication?.publishedAt;
  return (
    role === "manager" &&
    campaign.settings.managerResults &&
    state.people.some((p) => p.id === subjectId && p.managerId === actorId) &&
    !!result.publication?.publishedAt
  );
}
export function csvText(rows) {
  return (
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map((v) => {
            let s = String(v ?? "");
            if (/^[\s\u0000-\u001f]*[=+@-]/.test(s)) s = "'" + s;
            return '"' + s.replace(/"/g, '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}

export function comparisonKey(campaign) {
  return JSON.stringify(
    campaign.groups
      .map((g) => ({
        key: g.key,
        weight: Number(g.weight),
        templateId: g.templateId,
        version: g.templateSnapshot?.version || 1,
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  );
}
