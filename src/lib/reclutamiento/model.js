// Modelo de la demostración. Los nombres definitivos de la API los confirma Luis.
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
  ["file", "Archivo"],
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
  { id: "cv", label: "Currículum", type: "file", required: false },
];
export function newVacancy() {
  return {
    id: uid(),
    title: "",
    branchId: "",
    modalityId: "presencial",
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
    createdAt: new Date().toISOString(),
    notifications: { email: "talento@example.test", toTeam: true, toCandidate: true },
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
  if (
    vacancy.notifications.toTeam &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vacancy.notifications.email)
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
export function makeSeed() {
  const now = new Date();
  const ago = (days) => new Date(now.getTime() - days * 86400000).toISOString();
  const first = {
    ...newVacancy(),
    id: "auxiliar-administrativo",
    title: "Auxiliar administrativo",
    branchId: "centro",
    salaryFrom: "12000",
    salaryTo: "15000",
    showSalary: true,
    status: "open",
    createdAt: ago(8),
    publishedAt: ago(7),
    description: [
      paragraph(
        "Buscamos a alguien organizado, con atención al detalle y ganas de crecer junto a nuestro equipo."
      ),
      { type: "h3", children: [{ text: "¿Qué harás en tu día a día?" }] },
      {
        type: "ul",
        children: [
          "Dar seguimiento a documentos y expedientes.",
          "Apoyar en la atención a clientes y proveedores.",
          "Mantener la información del equipo al día.",
        ].map((text) => ({ type: "li", children: [{ text }] })),
      },
      { type: "h3", children: [{ text: "Lo que encontrarás aquí" }] },
      paragraph(
        "Un equipo cercano, capacitación desde el primer día y oportunidades de desarrollo. Lunes a viernes, de 9:00 a 18:00 h."
      ),
    ],
  };
  const vacancies = [
    first,
    {
      ...clone(first),
      id: "asesor-comercial",
      title: "Asesor comercial",
      branchId: "norte",
      openings: 2,
      salaryFrom: "14000",
      salaryTo: "18000",
      createdAt: ago(4),
    },
    {
      ...clone(first),
      id: "disenador-digital",
      title: "Diseñador digital",
      branchId: "",
      modalityId: "remoto",
      status: "paused",
      salaryFrom: "18000",
      salaryTo: "22000",
      createdAt: ago(3),
    },
    {
      ...newVacancy(),
      id: "auxiliar-almacen",
      title: "Auxiliar de almacén",
      branchId: "norte",
      createdAt: ago(1),
    },
    {
      ...clone(first),
      id: "recepcionista",
      title: "Recepcionista",
      status: "closed",
      createdAt: ago(20),
    },
  ];
  const candidates = [
    ["ana", "Ana García", "auxiliar-administrativo", "new", 0],
    ["daniel", "Daniel Torres", "auxiliar-administrativo", "interview", 2],
    ["mariana", "Mariana López", "auxiliar-administrativo", "offer", 4],
    ["luis", "Luis Hernández", "asesor-comercial", "review", 1],
    ["paola", "Paola Rivera", "asesor-comercial", "new", 0],
    ["sofia", "Sofía Martínez", "recepcionista", "hired", 10],
  ].map(([id, name, vacancyId, stage, days]) => ({
    id,
    name,
    vacancyId,
    stage,
    email: `${id}@example.test`,
    phone: "000 000 0000",
    submittedAt: ago(days),
    source: "Página de empleo · ejemplo",
    formVersion: 1,
    answers: [
      { id: "name", label: "Nombre completo", type: "text", value: name },
      { id: "email", label: "Correo electrónico", type: "email", value: `${id}@example.test` },
      { id: "phone", label: "Teléfono", type: "tel", value: "000 000 0000" },
      {
        id: "experience",
        label: "¿Cuánta experiencia tienes en un puesto similar?",
        type: "select",
        value: "1 a 3 años",
      },
      { id: "cv", label: "Currículum", type: "file", value: null },
    ],
    notes: [],
    activity: [{ id: `received-${id}`, text: "Postulación recibida (ejemplo)", at: ago(days) }],
    hiring:
      stage === "hired"
        ? {
            startDate: localDate(now),
            branchId: "centro",
            checklist: ["data", "offer", "documents"],
            completedAt: ago(1),
          }
        : { startDate: "", branchId: "", checklist: [] },
  }));
  return {
    version: 1,
    company: "Empresa de ejemplo",
    branches: [
      { id: "centro", name: "Sucursal Centro", address: "Guadalajara, Jalisco" },
      { id: "norte", name: "Sucursal Norte", address: "Zapopan, Jalisco" },
    ],
    modalities: [
      { id: "presencial", name: "Presencial", requiresBranch: true },
      { id: "hibrido", name: "Híbrida", requiresBranch: true },
      { id: "remoto", name: "Remota", requiresBranch: false },
    ],
    vacancies,
    candidates,
  };
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
