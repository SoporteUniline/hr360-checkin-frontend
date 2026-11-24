// Reglas puras de pantalla del módulo de evaluaciones (plantillas, respuestas, fechas y textos).
// Se quitaron las funciones que solo usaba la demostración (cálculo de resultados,
// asignaciones, campañas, CSV): esas reglas viven en el backend (modules/performance/services).
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
export const scoreText = (score) =>
  score === null || score === undefined ? "—" : Number(score).toFixed(2);
export function civilToday(timezone = "America/Mexico_City") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
export function progress(assignment) {
  const list = questions(assignment.template);
  return {
    total: list.length,
    answered: list.filter((q) => answerPresent(q, assignment.answers[q.id]))
      .length,
  };
}