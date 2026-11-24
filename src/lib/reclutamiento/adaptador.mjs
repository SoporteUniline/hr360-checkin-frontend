// Reclutamiento real: traduce lo que responde /api/reclutamiento/panel al modelo que usan las pantallas,
// y de regreso. Sin React ni red: lo prueba scripts/test-reclutamiento-adaptador.mjs. Los nombres del servidor están en
// español (docs/reclutamiento-real.md del backend); las pantallas conservan los nombres del diseño.

export const ETAPA_A_VISTA = {
  nuevo: "new",
  revision: "review",
  entrevista: "interview",
  oferta: "offer",
  contratado: "hired",
  descartado: "rejected",
};
export const VISTA_A_ETAPA = Object.fromEntries(Object.entries(ETAPA_A_VISTA).map(([k, v]) => [v, k]));
export const JORNADA_PREDETERMINADA = "Tiempo completo";

const texto = (v) => (v == null ? "" : String(v));
const idTexto = (v) => (v == null || v === "" ? "" : String(v));
const normalizar = (v) =>
  texto(v)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

// ——— HTML saneado de las vacantes de antes → árbol del editor ———
const ALIAS = { b: "strong", i: "em", div: "p", h1: "h3", h2: "h3", h4: "h3" };
const PERMITIDOS = new Set(["p", "h3", "ul", "ol", "li", "strong", "em", "u", "br"]);
const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
const decodificar = (s) =>
  s.replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z]+);/gi, (todo, e) => {
    if (ENTIDADES[e.toLowerCase()] != null) return ENTIDADES[e.toLowerCase()];
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    }
    return todo;
  });

export function htmlANodos(html) {
  const raiz = { children: [] };
  const pila = [raiz];
  const actual = () => pila[pila.length - 1];
  const fichas = texto(html).split(/(<[^>]*>)/g);
  for (const f of fichas) {
    if (!f) continue;
    const etiqueta = /^<\s*(\/)?\s*([a-z0-9]+)[^>]*?(\/)?\s*>$/i.exec(f);
    if (!etiqueta) {
      if (f.startsWith("<")) continue;
      const t = decodificar(f);
      if (!t) continue;
      // Texto suelto en la raíz: va dentro de un párrafo para que el editor lo muestre igual.
      if (pila.length === 1) {
        const p = { type: "p", children: [], implicito: true };
        raiz.children.push(p);
        pila.push(p);
      }
      actual().children.push({ text: t });
      continue;
    }
    const [, cierre, nombre] = etiqueta;
    const tipo = ALIAS[nombre.toLowerCase()] || nombre.toLowerCase();
    if (!PERMITIDOS.has(tipo)) continue;
    if (tipo === "br") {
      actual().children.push({ type: "br", children: [] });
      continue;
    }
    if (cierre) {
      const i = pila.map((n) => n.type).lastIndexOf(tipo);
      if (i > 0) pila.length = i;
      continue;
    }
    // Un bloque nuevo cierra el párrafo implícito abierto en la raíz.
    if (["p", "h3", "ul", "ol"].includes(tipo) && pila.length === 2 && pila[1].implicito) pila.length = 1;
    const nodo = { type: tipo, children: [] };
    actual().children.push(nodo);
    pila.push(nodo);
  }
  const limpiar = (nodos) =>
    nodos.map((n) => {
      if (typeof n.text === "string") return { text: n.text };
      return { type: n.type, children: limpiar(n.children || []) };
    });
  return limpiar(raiz.children);
}

export const textoDeNodos = (nodos = []) =>
  nodos
    .map((n) => (typeof n.text === "string" ? n.text : textoDeNodos(n.children || [])))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

// ——— Del servidor a las pantallas ———
export function aVacante(v, modalidades = []) {
  const porTexto = v.id_modalidad
    ? null
    : modalidades.find((m) => normalizar(m.name) === normalizar(v.modalidad_texto)) ||
      modalidades.find((m) => normalizar(m.name).slice(0, 5) === normalizar(v.modalidad_texto).slice(0, 5) && normalizar(v.modalidad_texto));
  return {
    id: String(v.id),
    slug: v.slug || "",
    title: texto(v.titulo),
    status: v.estado || "closed",
    branchId: idTexto(v.id_sucursal),
    modalityId: v.id_modalidad ? String(v.id_modalidad) : porTexto?.id || "",
    modalityText: texto(v.modalidad_texto),
    openings: v.puestos == null ? 1 : Number(v.puestos),
    unlimited: v.puestos == null,
    employmentType: v.tipo_jornada || JORNADA_PREDETERMINADA,
    salaryFrom: v.sueldo_desde == null ? "" : String(v.sueldo_desde),
    salaryTo: v.sueldo_hasta == null ? "" : String(v.sueldo_hasta),
    showSalary: Boolean(v.mostrar_sueldo),
    salaryText: texto(v.salario_texto),
    closesOn: v.cierra_el || "",
    description: Array.isArray(v.descripcion) ? v.descripcion : htmlANodos(v.descripcion_html),
    questions: Array.isArray(v.preguntas) ? v.preguntas : [],
    formVersion: Number(v.version_formulario) || 1,
    createdAt: v.creada_en || "",
    publishedAt: v.publicada_en || null,
    notifications: {
      email: texto(v.avisos?.email),
      toTeam: v.avisos?.toTeam !== false,
      toCandidate: v.avisos?.toCandidate !== false,
    },
  };
}

const CALIFICACION = { califica: "Califica", con_alerta: "Con alerta", no_califica: "No califica", incompleto: "Entrevista incompleta" };
const contratacionVacia = () => ({ startDate: "", branchId: "", checklist: [], completedAt: null, employeeId: null, existingEmployee: false });

// Una postulación de WhatsApp (origen «whatsapp») tiene el mismo proceso que la de la página, más los datos
// de su entrevista con el agente (calificación, resumen, puntajes), su conversación y la sugerencia de etapa del agente.
function datosWhatsapp(w) {
  if (!w) return null;
  return {
    conversationId: w.id_conversacion,
    interviewId: w.id_entrevista,
    linkedToWeb: Boolean(w.ligada_a_pagina),
    rating: w.calificacion || "incompleto",
    ratingLabel: CALIFICACION[w.calificacion] || CALIFICACION.incompleto,
    summary: texto(w.resumen),
    scores: w.puntajes && typeof w.puntajes === "object" ? w.puntajes : null,
    suggestion: w.sugerencia?.etapa && ETAPA_A_VISTA[w.sugerencia.etapa] ? { stage: ETAPA_A_VISTA[w.sugerencia.etapa], reason: texto(w.sugerencia.motivo) } : null,
    answers: Array.isArray(w.respuestas) ? w.respuestas.map((r) => ({ question: texto(r.texto_pregunta), answer: texto(r.respuesta), severity: r.severidad || "ok" })) : [],
    windowOpen: w.ventana_abierta !== false,
    template: w.plantilla_seguimiento || null,
    mode: w.modo || null,
  };
}

export function aCandidato(c) {
  const k = c.contratacion || {};
  const wa = c.origen === "whatsapp" ? datosWhatsapp(c.whatsapp) : null;
  return {
    id: String(c.id),
    origin: wa ? "whatsapp" : "web",
    readOnly: false,
    name: texto(c.nombre) || "Sin nombre",
    vacancyId: String(c.id_vacante),
    stage: ETAPA_A_VISTA[c.etapa] || "new",
    email: texto(c.correo),
    phone: texto(c.telefono),
    submittedAt: c.recibida_en || "",
    source: wa ? (wa.linkedToWeb ? "Página de empleo y WhatsApp" : "WhatsApp") : "Página de empleo",
    hasCv: Boolean(c.tiene_cv),
    whatsapp: wa,
    conversationId: wa?.conversationId ?? null,
    formVersion: 1,
    answers: [],
    notes: [],
    activity: [],
    hiring: {
      startDate: k.fecha_ingreso || "",
      branchId: idTexto(k.id_sucursal),
      checklist: Array.isArray(k.checklist) ? k.checklist : [],
      completedAt: k.contratado_en || null,
      employeeId: k.id_empleado ?? null,
      existingEmployee: Boolean(k.empleado_existente),
    },
  };
}

// Entrevistas de WhatsApp SIN proceso (aún no aceptan el aviso o son de antes): solo lectura; canStart = aceptó el aviso
// y RH puede meterlo al proceso con un clic («Iniciar proceso»).
export function aCandidatoWhatsapp(w) {
  const descartado = w.calificacion === "no_califica" || w.etapa_whatsapp === "rechazada";
  return {
    id: String(w.id),
    origin: "whatsapp",
    readOnly: true,
    canStart: Boolean(w.puede_iniciar),
    interviewId: w.id_entrevista ?? null,
    name: texto(w.nombre) || "Candidato de WhatsApp",
    vacancyId: String(w.id_vacante),
    stage: descartado ? "rejected" : ["califica", "con_alerta"].includes(w.calificacion) ? "review" : "new",
    email: "",
    phone: texto(w.telefono),
    submittedAt: w.recibida_en || "",
    source: "WhatsApp",
    conversationId: w.id_conversacion,
    rating: w.calificacion || "incompleto",
    ratingLabel: CALIFICACION[w.calificacion] || CALIFICACION.incompleto,
    summary: texto(w.resumen),
    answers: [],
    notes: [],
    activity: [],
    hiring: contratacionVacia(),
  };
}

const minutos = (a, b) => {
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 60000;
  return Number.isFinite(d) && d > 0 ? Math.round(d) : 30;
};

export function aDatos(r) {
  const branches = (r.sucursales || []).map((s) => ({ id: String(s.id), name: texto(s.nombre), address: texto(s.direccion) }));
  const modalities = (r.modalidades || []).map((m) => ({ id: String(m.id), name: texto(m.nombre), requiresBranch: Boolean(m.requiere_sucursal), own: Boolean(m.propia) }));
  const candidates = (r.candidatos || []).map(aCandidato);
  const vacancies = (r.vacantes || []).map((v) => {
    const vacante = aVacante(v, modalities);
    const hired = candidates.filter((c) => c.vacancyId === vacante.id && c.stage === "hired").length;
    return { ...vacante, hired, remaining: vacante.unlimited ? null : Math.max(0, vacante.openings - hired) };
  });
  return {
    company: texto(r.empresa?.nombre),
    companyId: r.empresa?.id ?? null,
    publishesBoard: Boolean(r.empresa?.publica_bolsa),
    branches,
    modalities,
    vacancies,
    candidates,
    whatsappCandidates: (r.whatsapp || []).map(aCandidatoWhatsapp),
    interviews: (r.citas || []).map((c) => ({
      id: String(c.id),
      candidateId: c.candidato || "",
      vacancyId: String(c.id_vacante),
      conversationId: c.id_conversacion,
      startsAt: c.inicio,
      duration: minutos(c.inicio, c.fin),
      location: c.modalidad === "video" ? "Videollamada" : texto(c.lugar) || "Presencial",
      status: "scheduled",
    })),
    events: (r.eventos || []).map((e) => ({ id: String(e.id), candidateId: String(e.id_postulacion), text: texto(e.texto), at: e.en || "" })),
    incomplete: Boolean(r.candidatos_incompletos),
  };
}

// Expediente completo: respuestas (base + propias), notas, historial y empleado.
export function aDetalle(d, base) {
  const candidato = { ...(base || aCandidato(d)), ...aCandidato(d) };
  const porWhatsapp = candidato.origin === "whatsapp" && !candidato.whatsapp?.linkedToWeb;
  const respuestas = [
    { id: "name", label: "Nombre completo", type: "text", value: texto(d.nombre) },
    { id: "email", label: "Correo electrónico", type: "email", value: texto(d.correo) },
    { id: "phone", label: "Teléfono", type: "tel", value: texto(d.telefono) },
    ...(d.respuestas || []).map((r) => ({ id: r.id, label: r.label, type: r.type, value: r.value })),
    // Por WhatsApp no se pide currículum (sus respuestas son las de la entrevista con el agente).
    ...(porWhatsapp ? [] : [{ id: "cv", label: "Currículum", type: "file", value: d.tiene_cv ? { name: "Currículum recibido" } : null }]),
  ];
  return {
    ...candidato,
    formVersion: Number(d.version_formulario) || 1,
    answers: respuestas,
    notes: (d.notas || []).map((n) => ({ id: String(n.id), text: texto(n.texto), at: n.en || "", author: texto(n.autor) })),
    activity: (d.eventos || []).map((e) => ({ id: String(e.id), text: texto(e.texto), at: e.en || "", author: texto(e.autor) })),
    employee: d.empleado ? { id: d.empleado.id, name: texto(d.empleado.nombre), status: texto(d.empleado.estado) } : null,
    // Para «Contratar» fuera de Reclutamiento (chat de WhatsApp): sucursales y lugares de la vacante.
    branches: (d.sucursales || []).map((s) => ({ id: String(s.id), name: texto(s.nombre), address: texto(s.direccion) })),
    vacancy: d.vacante
      ? {
        id: String(d.vacante.id), title: texto(d.vacante.titulo), unlimited: d.vacante.puestos == null, openings: d.vacante.puestos == null ? null : Number(d.vacante.puestos),
        remaining: d.vacante.puestos == null ? null : Math.max(0, Number(d.vacante.puestos) - (Number(d.vacante.contratados) || 0)),
      }
      : null,
  };
}

// ——— De las pantallas al servidor ———
const numeroONulo = (v) => (v === "" || v == null ? null : Number(v));
export function aCuerpoVacante(v, publicar = false) {
  return {
    titulo: texto(v.title).trim(),
    id_modalidad: v.modalityId ? Number(v.modalityId) : null,
    id_sucursal: v.branchId ? Number(v.branchId) : null,
    puestos: Number(v.openings) || 1,
    tipo_jornada: v.employmentType || JORNADA_PREDETERMINADA,
    mostrar_sueldo: Boolean(v.showSalary),
    sueldo_desde: v.showSalary ? numeroONulo(v.salaryFrom) : null,
    sueldo_hasta: v.showSalary ? numeroONulo(v.salaryTo) : null,
    cierra_el: v.closesOn || null,
    descripcion: Array.isArray(v.description) ? v.description : [],
    preguntas: Array.isArray(v.questions) ? v.questions : [],
    avisos: { email: texto(v.notifications?.email).trim(), toTeam: v.notifications?.toTeam !== false, toCandidate: v.notifications?.toCandidate !== false },
    publicar,
  };
}

// Etapa (pantalla) → cuerpo de PUT /etapa. opciones: { motivo } al descartar, { sugerencia: true } al aceptar la del agente.
export function aCuerpoEtapa(stage, { motivo, sugerencia } = {}) {
  const cuerpo = { etapa: VISTA_A_ETAPA[stage] };
  if (stage === "rejected" && texto(motivo).trim()) cuerpo.motivo = texto(motivo).trim().slice(0, 300);
  if (sugerencia === true) cuerpo.sugerencia = true;
  return cuerpo;
}

export function aCuerpoContratacion(f) {
  return {
    fecha_ingreso: f.startDate,
    id_sucursal: f.branchId ? Number(f.branchId) : null,
    nombre: texto(f.firstName).trim(),
    apellido_paterno: texto(f.lastName).trim(),
    apellido_materno: texto(f.secondLastName).trim(),
    correo: texto(f.email).trim(),
    telefono: texto(f.phone).trim(),
    checklist: Array.isArray(f.checklist) ? f.checklist : [],
  };
}

// «Ana María García López» → nombre y apellidos (el mismo criterio que el servidor; RH puede corregirlo).
export function dividirNombre(completo) {
  const p = texto(completo).trim().split(/\s+/).filter(Boolean);
  if (p.length <= 1) return { firstName: p[0] || "", lastName: "", secondLastName: "" };
  if (p.length === 2) return { firstName: p[0], lastName: p[1], secondLastName: "" };
  return { firstName: p.slice(0, -2).join(" "), lastName: p[p.length - 2], secondLastName: p[p.length - 1] };
}

// ——— Errores ———
const CAMPOS = {
  titulo: "title",
  id_modalidad: "modalityId",
  id_sucursal: "branchId",
  puestos: "openings",
  tipo_jornada: "employmentType",
  sueldo_desde: "salaryFrom",
  cierra_el: "closesOn",
  descripcion: "description",
  preguntas: "questions",
  avisos: "email",
  fecha_ingreso: "startDate",
  nombre: "firstName",
  apellido_paterno: "lastName",
  apellido_materno: "secondLastName",
  correo: "email",
  telefono: "phone",
};
export function erroresDeCampos(error) {
  const errores = error?.response?.data?.errores;
  if (!errores || typeof errores !== "object") return {};
  return Object.fromEntries(Object.entries(errores).map(([k, v]) => [CAMPOS[k] || k, String(v)]));
}

export function mensajeError(error, porDefecto = "No se pudo completar. Intenta de nuevo.") {
  const r = error?.response;
  if (!r) return "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  if (r.status === 503 && r.data?.codigo === "SIN_MIGRACION") return "Reclutamiento aún no está listo en el servidor. Avisa a soporte de ADAMIA.";
  if (r.status === 401) return "Tu sesión terminó. Vuelve a iniciar sesión.";
  if (r.status === 403) return r.data?.error || "No tienes permiso para hacer esto.";
  if (r.status === 404) return r.data?.error || "No encontramos este registro. Puede que lo hayan quitado.";
  return (typeof r.data?.error === "string" && r.data.error) || porDefecto;
}

// Enlaces útiles.
export const urlVacantePublica = (slug, origen = "") => (slug ? `${origen}/vacante/${encodeURIComponent(slug)}` : "");
export const urlConversacion = (id) => `/panel/whatsapp?c=${encodeURIComponent(id)}`;
export const urlEmpleado = (id) => `/panel/empleados?id=${encodeURIComponent(id)}`;
