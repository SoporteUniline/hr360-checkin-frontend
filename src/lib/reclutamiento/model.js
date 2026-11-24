// Modelo de las pantallas de Reclutamiento (la traducción con el API está en ./adaptador.mjs).
export const VACANCY_STATUSES = {
  draft: { label: "Borrador", tone: "neutral" },
  open: { label: "Publicada", tone: "green" },
  paused: { label: "Pausada", tone: "amber" },
  closed: { label: "Cerrada", tone: "neutral" },
  expired: { label: "Vencida", tone: "amber" },
};
export const STAGES = [
  { id: "new", label: "Nuevos", singular: "Nuevo", tone: "blue" },
  { id: "review", label: "En revisión", singular: "En revisión", tone: "violet" },
  { id: "interview", label: "Entrevista", singular: "Entrevista", tone: "amber" },
  { id: "offer", label: "Oferta", singular: "Oferta", tone: "blue" },
  { id: "hired", label: "Contratados", singular: "Contratado", tone: "green" },
  { id: "rejected", label: "Descartados", singular: "Descartado", tone: "neutral" },
];
export const QUESTION_TYPES = [
  ["text", "Respuesta corta"],
  ["textarea", "Respuesta larga"],
  ["select", "Una opción"],
  ["multiselect", "Varias opciones"],
  ["number", "Número"],
  ["date", "Fecha"],
];
export const uid = () => globalThis.crypto.randomUUID();
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const matches = (value, query) =>
  normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => normalize(value).includes(word));
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
export function vacancyStatus(vacancy) {
  return vacancy.status === "open" && vacancy.closesOn && vacancy.closesOn < localDate()
    ? "expired"
    : vacancy.status;
}
export const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(value.length === 10 ? `${value}T12:00:00` : value)
      )
    : "Sin fecha límite";
export const money = (value) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Number(value));
export const textOf = (nodes = []) =>
  nodes
    .map((node) => (typeof node.text === "string" ? node.text : textOf(node.children || [])))
    .join(" ")
    .trim();
export const paragraph = (text) => ({ type: "p", children: [{ text }] });
export const defaultQuestions = () => [
  { id: "name", label: "Nombre completo", type: "text", required: true, base: true },
  { id: "email", label: "Correo electrónico", type: "email", required: true, base: true },
  { id: "phone", label: "Teléfono", type: "tel", required: true, base: true },
  {
    id: "experience",
    label: "¿Cuánta experiencia tienes en un puesto similar?",
    type: "select",
    required: true,
    options: ["Sin experiencia", "Menos de 1 año", "1 a 3 años", "Más de 3 años"],
  },
  { id: "cv", label: "Currículum", type: "file", required: true, base: true },
];
// Vacante nueva (id null = aún no existe en el servidor). La modalidad la elige el asistente (la primera del catálogo).
export function newVacancy(modalityId = "") {
  return {
    id: null,
    title: "",
    branchId: "",
    modalityId,
    openings: 1,
    employmentType: "Tiempo completo",
    salaryFrom: "",
    salaryTo: "",
    showSalary: false,
    closesOn: "",
    description: [paragraph("")],
    questions: defaultQuestions(),
    formVersion: 1,
    status: "draft",
    createdAt: "",
    notifications: { email: "", toTeam: true, toCandidate: true },
  };
}
export function vacancyErrors(vacancy, modalities) {
  const errors = {};
  if (!vacancy.title.trim()) errors.title = "Escribe el nombre del puesto.";
  const modality = modalities.find((item) => item.id === vacancy.modalityId);
  if (!modality) errors.modalityId = "Selecciona una modalidad.";
  if (modality?.requiresBranch && !vacancy.branchId)
    errors.branchId = "Selecciona la sucursal de trabajo.";
  if (
    !Number.isInteger(Number(vacancy.openings)) ||
    Number(vacancy.openings) < 1 ||
    Number(vacancy.openings) > 999
  )
    errors.openings = "Indica de 1 a 999 lugares.";
  if (!textOf(vacancy.description)) errors.description = "Cuenta de qué trata el puesto.";
  if (vacancy.closesOn && vacancy.closesOn < localDate())
    errors.closesOn = "Elige hoy o una fecha futura.";
  if (
    vacancy.showSalary &&
    (!vacancy.salaryFrom ||
      Number(vacancy.salaryFrom) <= 0 ||
      (vacancy.salaryTo && Number(vacancy.salaryTo) < Number(vacancy.salaryFrom)))
  )
    errors.salaryFrom = "Indica un sueldo válido; el máximo debe ser igual o mayor al mínimo.";
  // Sin correo, los avisos van al correo de la empresa.
  if (
    vacancy.notifications.toTeam &&
    vacancy.notifications.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vacancy.notifications.email.trim())
  )
    errors.email = "Escribe un correo válido para los avisos.";
  return errors;
}
export function questionErrors(questions) {
  if (questions.length > 30) return "Puedes agregar hasta 30 preguntas.";
  if (questions.some((question) => !question.label.trim()))
    return "Escribe el título de todas las preguntas.";
  if (
    questions.some(
      (question) =>
        ["select", "multiselect"].includes(question.type) &&
        (question.options || []).filter((option) => option.trim()).length < 2
    )
  )
    return "Las preguntas de opciones necesitan al menos dos opciones.";
  if (
    questions.some(
      (question) =>
        ["select", "multiselect"].includes(question.type) &&
        new Set(
          (question.options || [])
            .filter((option) => option.trim())
            .map((option) => normalize(option.trim()))
        ).size !== (question.options || []).filter((option) => option.trim()).length
    )
  )
    return "Evita opciones repetidas en una misma pregunta.";
  return "";
}
export const formatDateTime = (value) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
export function interviewStatus(interview) {
  return interview.status === "scheduled" && new Date(interview.startsAt).getTime() < Date.now()
    ? "pending"
    : interview.status;
}
export function downloadCsv(filename, headers, rows) {
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const blob = new Blob(
    ["\uFEFF", [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8;" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
