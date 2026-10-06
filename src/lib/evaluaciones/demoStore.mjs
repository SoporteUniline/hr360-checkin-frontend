import {
  BANDS,
  DEFAULT_SETTINGS,
  PRESETS,
  SCALE,
  SCHEMA_VERSION,
  copy,
  uid,
  questions,
  isScored,
  makeAssignments,
  validateTemplate,
  validateCampaign,
  validateAnswers,
  personResult,
  scopeSubjects,
  civilToday,
  validDate,
} from "./model.mjs";
export const STORAGE_PREFIX = "adamia:desempeno:demo:v1";
export function seedState() {
  const people = [
    {
      id: "p-rh",
      name: "Daniela Flores",
      area: "Recursos Humanos",
      position: "Responsable de RH",
      role: "hr",
      level: 2,
      managerId: "p-dir",
    },
    {
      id: "p-dir",
      name: "Alejandro Cano",
      area: "Dirección",
      position: "Director general",
      role: "direction",
      level: 1,
      managerId: null,
    },
    {
      id: "p-jefe",
      name: "Ana Torres",
      area: "Operaciones",
      position: "Jefa de operaciones",
      role: "manager",
      level: 2,
      managerId: "p-dir",
    },
    {
      id: "p-ventas",
      name: "Laura Pérez",
      area: "Ventas",
      position: "Jefa de ventas",
      role: "manager",
      level: 2,
      managerId: "p-dir",
    },
    {
      id: "p-logistica",
      name: "Roberto Méndez",
      area: "Logística",
      position: "Jefe de logística",
      role: "manager",
      level: 2,
      managerId: "p-dir",
    },
    {
      id: "p-mariana",
      name: "Mariana López",
      area: "Operaciones",
      position: "Analista de operaciones",
      role: "employee",
      level: 3,
      managerId: "p-jefe",
    },
    {
      id: "p-carlos",
      name: "Carlos Ramírez",
      area: "Operaciones",
      position: "Coordinador",
      role: "employee",
      level: 3,
      managerId: "p-jefe",
    },
    {
      id: "p-sofia",
      name: "Sofía Ruiz",
      area: "Operaciones",
      position: "Analista",
      role: "employee",
      level: 3,
      managerId: "p-jefe",
    },
    {
      id: "p-jose",
      name: "José Martínez",
      area: "Operaciones",
      position: "Auxiliar",
      role: "employee",
      level: 3,
      managerId: "p-jefe",
    },
    {
      id: "p-andrea",
      name: "Andrea Díaz",
      area: "Ventas",
      position: "Ejecutiva comercial",
      role: "employee",
      level: 3,
      managerId: "p-ventas",
    },
    {
      id: "p-daniel",
      name: "Daniel Ruiz",
      area: "Ventas",
      position: "Ejecutivo comercial",
      role: "employee",
      level: 3,
      managerId: "p-ventas",
    },
    {
      id: "p-pedro",
      name: "Pedro Gómez",
      area: "Logística",
      position: "Coordinador",
      role: "employee",
      level: 3,
      managerId: "p-logistica",
    },
  ].map((p) => ({ ...p, active: true }));
  const categories = [
    [
      "Resultados",
      25,
      [
        "Termina su trabajo oportunamente",
        "Cumple con las tareas que se le encomiendan",
        "Realiza un volumen adecuado de trabajo",
      ],
    ],
    [
      "Calidad",
      20,
      [
        "Entrega su trabajo sin errores",
        "Hace uso racional de los recursos",
        "Se muestra profesional en el trabajo",
      ],
    ],
    [
      "Relaciones interpersonales",
      15,
      [
        "Se muestra respetuoso y amable en el trato",
        "Escucha las opiniones de otras personas",
        "Mantiene una comunicación clara",
      ],
    ],
    [
      "Iniciativa",
      15,
      [
        "Muestra nuevas ideas para mejorar los procesos",
        "Se anticipa a las dificultades",
        "Tiene capacidad para resolver problemas",
      ],
    ],
    [
      "Trabajo en equipo",
      15,
      [
        "Colabora para alcanzar objetivos comunes",
        "Comparte información útil con el equipo",
        "Apoya a sus compañeros cuando lo necesitan",
      ],
    ],
    [
      "Organización",
      10,
      [
        "Planifica sus actividades",
        "Mantiene el orden en sus tareas y prioridades",
        "Se preocupa por alcanzar las metas",
      ],
    ],
  ].map(([name, weight, texts], i) => ({
    id: `cat-${i}`,
    name,
    weight,
    questionWeights: "equal",
    questions: texts.map((text, j) => ({
      id: `q-${i}-${j}`,
      text,
      type: "scale",
      required: true,
      scored: true,
      weight: 1,
      min: 0,
      max: 10,
      yesScore: 5,
      noScore: 1,
      options: [],
    })),
  }));
  const general = {
    id: "tpl-general",
    name: "Evaluación general de desempeño",
    description: "Competencias y resultados de cada trimestre.",
    area: "Todas",
    position: "Todos",
    version: 1,
    archived: false,
    scale: copy(SCALE),
    bands: copy(BANDS),
    categories,
  };
  const leadership = copy(general);
  leadership.id = "tpl-liderazgo";
  leadership.name = "Liderazgo y colaboración";
  leadership.position = "Jefaturas";
  leadership.categories[0].id = "cat-liderazgo";
  leadership.categories[0].name = "Liderazgo";
  leadership.categories[0].questions[0].text =
    "Comunica con claridad las metas del equipo";
  leadership.categories[0].questions[1].text =
    "Ofrece retroalimentación útil y respetuosa";
  leadership.categories[0].questions[2].text =
    "Acompaña el desarrollo de sus colaboradores";
  const templates = [general, leadership];
  const subjects = people.filter((p) => p.level === 3).map((p) => p.id);
  const campaign = (id, name, model, template, subjectIds, dates, status) => ({
    id,
    name,
    model,
    templateId: template,
    subjectIds,
    groups: Object.entries(PRESETS[model].weights).map(([key, weight]) => ({
      key,
      weight,
      templateId: template,
    })),
    settings: copy(DEFAULT_SETTINGS),
    reminders: [7, 3, 0],
    recurrence: "none",
    status,
    description: "",
    ...dates,
  });
  const campaigns = [
    campaign(
      "camp-q3",
      "Desempeño · 3er trimestre 2026",
      "180",
      "tpl-general",
      subjects,
      {
        periodStart: "2026-07-01",
        periodEnd: "2026-09-30",
        opensOn: "2026-10-01",
        dueOn: "2026-10-20",
      },
      "active",
    ),
    campaign(
      "camp-liderazgo",
      "Liderazgo · Evaluación 360°",
      "360",
      "tpl-liderazgo",
      ["p-jefe"],
      {
        periodStart: "2026-07-01",
        periodEnd: "2026-09-30",
        opensOn: "2026-10-01",
        dueOn: "2026-10-25",
      },
      "active",
    ),
    campaign(
      "camp-q2",
      "Desempeño · 2do trimestre 2026",
      "180",
      "tpl-general",
      subjects,
      {
        periodStart: "2026-04-01",
        periodEnd: "2026-06-30",
        opensOn: "2026-07-01",
        dueOn: "2026-07-20",
      },
      "closed",
    ),
  ];
  campaigns.forEach((c) => {
    c.timezone = "America/Mexico_City";
    c.resultBands = copy(templates.find((t) => t.id === c.templateId).bands);
    c.groups.forEach((g) => {
      g.templateSnapshot = copy(templates.find((t) => t.id === g.templateId));
    });
  });
  let counter = 0;
  const assignments = campaigns.flatMap((c) =>
    makeAssignments(c, people, templates).map((a) => ({
      ...a,
      id: `demo-a-${++counter}`,
    })),
  );
  assignments.forEach((a, i) => {
    const complete =
      a.campaignId === "camp-q2" ||
      (a.campaignId === "camp-q3" &&
        ["p-mariana", "p-sofia", "p-andrea", "p-pedro"].includes(
          a.subjectId,
        )) ||
      (a.campaignId === "camp-liderazgo" && a.evaluatorId !== "p-mariana");
    if (complete) {
      a.status = "submitted";
      a.submittedAt =
        a.campaignId === "camp-q2"
          ? "2026-07-18T12:00:00Z"
          : "2026-10-03T12:00:00Z";
      questions(a.template).forEach((q, j) => {
        a.answers[q.id] =
          a.subjectId === "p-pedro"
            ? j % 3 === 0
              ? 2
              : 3
            : a.subjectId === "p-sofia"
              ? 3
              : a.campaignId === "camp-q2"
                ? 4
                : j % 3 === 0
                  ? 5
                  : 4;
      });
      a.comment =
        a.subjectId === "p-mariana"
          ? "Destaca por su cumplimiento y colaboración. El siguiente paso es anticipar entregas y prioridades."
          : "Mantiene una buena disposición. Recomendamos acordar objetivos concretos para el siguiente periodo.";
    } else if (a.subjectId === "p-carlos" && a.perspective === "descending") {
      a.status = "draft";
      questions(a.template)
        .slice(0, 4)
        .forEach((q) => {
          a.answers[q.id] = 4;
        });
    }
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 1,
    people,
    templates,
    campaigns,
    assignments,
    settings: copy(DEFAULT_SETTINGS),
    publications: campaigns.flatMap((c) =>
      c.subjectIds
        .filter(
          (id) =>
            c.id === "camp-q2" || (c.id === "camp-q3" && id === "p-mariana"),
        )
        .map((subjectId) => ({
          id: uid("publication"),
          campaignId: c.id,
          subjectId,
          approvedAt: "2026-10-03T12:00:00Z",
          approvedBy: "p-rh",
          publishedAt: "2026-10-04T12:00:00Z",
          publishedBy: "p-rh",
          version: 1,
        })),
    ),
    plans: [
      {
        id: "plan-demo",
        campaignId: "camp-q3",
        subjectId: "p-mariana",
        title: "Preparar un plan semanal de prioridades",
        ownerId: "p-mariana",
        dueOn: "2026-10-30",
        status: "in_progress",
        successMeasure: "Compartir el plan cada lunes durante cuatro semanas.",
        notes: "",
        evidence: [],
        createdAt: "2026-10-04T12:00:00Z",
      },
    ],
    receipts: [],
    events: [],
  };
}
const fail = (message) => {
  throw new Error(message);
};
const check = (errors) => {
  if (errors.length) fail(errors[0]);
};
export function demoCommand(state, command, actor) {
  const next = copy(state),
    now = new Date().toISOString();
  if (!next.people.some((p) => p.id === actor.id && p.role === actor.role))
    fail("Perfil de demostración no válido.");
  const isHr = actor.role === "hr";
  const manage = () => {
    if (!isHr) fail("Esta acción corresponde a RH.");
  };
  const campaign = () =>
    next.campaigns.find((c) => c.id === command.campaignId) ||
    fail("La campaña ya no está disponible.");
  switch (command.type) {
    case "template.save": {
      manage();
      const template = copy(command.template);
      check(validateTemplate(template));
      const index = next.templates.findIndex((t) => t.id === template.id);
      template.version = index < 0 ? 1 : next.templates[index].version + 1;
      template.updatedAt = now;
      if (index < 0) next.templates.push(template);
      else next.templates[index] = template;
      break;
    }
    case "template.archive": {
      manage();
      const t =
        next.templates.find((t) => t.id === command.id) ||
        fail("Plantilla no encontrada.");
      t.archived = !t.archived;
      break;
    }
    case "campaign.save": {
      manage();
      const item = copy(command.campaign),
        old = next.campaigns.find((c) => c.id === item.id);
      if (old && old.status !== "draft")
        fail(
          "Una campaña iniciada conserva sus plantillas, participantes y pesos.",
        );
      if (!item.name.trim()) fail("Escribe el nombre de la campaña.");
      item.status = "draft";
      item.updatedAt = now;
      next.campaigns = next.campaigns
        .filter((c) => c.id !== item.id)
        .concat(item);
      next.assignments = next.assignments
        .filter((a) => a.campaignId !== item.id)
        .concat(copy(command.assignments));
      break;
    }
    case "campaign.launch": {
      manage();
      const c = campaign();
      if (c.status !== "draft") fail("La campaña ya fue iniciada.");
      const list = next.assignments.filter((a) => a.campaignId === c.id);
      check(validateCampaign(c, list, next.people, next.templates));
      if (c.dueOn < civilToday(c.timezone))
        fail("La fecha límite ya pasó. Amplía el plazo antes de iniciar.");
      c.resultBands = copy(
        next.templates.find((t) => t.id === c.templateId).bands,
      );
      c.groups.forEach((g) => {
        g.templateSnapshot = copy(
          next.templates.find((t) => t.id === g.templateId),
        );
      });
      list.forEach((a) => {
        a.template = copy(
          c.groups.find((g) => g.key === a.perspective).templateSnapshot,
        );
      });
      c.status = c.opensOn > civilToday(c.timezone) ? "scheduled" : "active";
      c.launchedAt = now;
      break;
    }
    case "campaign.close": {
      manage();
      const c = campaign();
      if (!["active", "scheduled"].includes(c.status))
        fail("La campaña no está abierta.");
      c.status = "closed";
      c.closedAt = now;
      break;
    }
    case "campaign.extend": {
      manage();
      const c = campaign();
      if (!["active", "scheduled"].includes(c.status))
        fail("Solo puedes ampliar una campaña abierta.");
      if (!validDate(command.dueOn) || command.dueOn < c.dueOn)
        fail("La nueva fecha no puede ser anterior al cierre actual.");
      c.dueOn = command.dueOn;
      break;
    }
    case "campaign.remind": {
      manage();
      const c = campaign();
      if (!["active", "scheduled"].includes(c.status))
        fail("La campaña no está abierta.");
      break;
    }
    case "response.save":
    case "response.submit": {
      const a =
        next.assignments.find((a) => a.id === command.id) ||
        fail("Evaluación no encontrada.");
      if (a.evaluatorId !== actor.id)
        fail("Solo el evaluador asignado puede responder.");
      const c = next.campaigns.find((c) => c.id === a.campaignId);
      if (
        !["active", "scheduled"].includes(c.status) ||
        c.opensOn > civilToday(c.timezone) ||
        c.dueOn < civilToday(c.timezone)
      )
        fail("Esta campaña está fuera de su periodo de respuesta.");
      if (a.status === "submitted")
        fail("La evaluación ya fue enviada y no puede modificarse.");
      const complete = command.type === "response.submit";
      check(validateAnswers(a.template, command.answers, complete));
      a.answers = copy(command.answers);
      a.comment = String(command.comment || "").slice(0, 4000);
      a.privateNote = String(command.privateNote || "").slice(0, 4000);
      a.categoryComments = copy(command.categoryComments || {});
      a.status = complete ? "submitted" : "draft";
      a.updatedAt = now;
      if (complete) a.submittedAt = now;
      break;
    }
    case "result.approve":
    case "result.publish": {
      manage();
      const c = campaign();
      const result = personResult(next, c, command.subjectId);
      if (!result.complete)
        fail("Completa todas las perspectivas antes de aprobar o publicar.");
      let publication = next.publications.find(
        (p) => p.campaignId === c.id && p.subjectId === command.subjectId,
      );
      if (!publication) {
        publication = {
          id: uid("publication"),
          campaignId: c.id,
          subjectId: command.subjectId,
          version: 1,
        };
        next.publications.push(publication);
      }
      if (command.type === "result.approve") {
        publication.approvedAt = now;
        publication.approvedBy = actor.id;
      } else {
        if (c.settings.requireApproval && !publication.approvedAt)
          fail("RH debe aprobar el resultado antes de publicarlo.");
        if (publication.publishedAt) fail("El resultado ya está publicado.");
        publication.publishedAt = now;
        publication.publishedBy = actor.id;
        publication.resultSnapshot = copy(result);
      }
      break;
    }
    case "receipt.sign": {
      const p =
        next.publications.find(
          (p) =>
            p.campaignId === command.campaignId &&
            p.subjectId === actor.id &&
            p.publishedAt,
        ) || fail("Tu resultado aún no está publicado.");
      if (
        !next.campaigns.find((c) => c.id === p.campaignId).settings
          .requireReceipt
      )
        fail("Esta campaña no solicita confirmación de recibido.");
      if (
        next.receipts.some(
          (r) => r.publicationId === p.id && r.actorId === actor.id,
        )
      )
        fail("Ya confirmaste la recepción de este resultado.");
      if (!command.name?.trim() || !command.accepted)
        fail("Escribe tu nombre y confirma la recepción.");
      next.receipts.push({
        id: uid("receipt"),
        publicationId: p.id,
        publicationVersion: p.version,
        actorId: actor.id,
        name: command.name.trim(),
        observations: String(command.observations || "").slice(0, 4000),
        signedAt: now,
        demo: true,
      });
      break;
    }
    case "plan.save": {
      const plan = copy(command.plan);
      const subjects = scopeSubjects(next, actor.role, actor.id).map(
        (p) => p.id,
      );
      if (
        !["hr", "manager"].includes(actor.role) ||
        !subjects.includes(plan.subjectId)
      )
        fail("Solo RH o el jefe asignado pueden definir este plan.");
      const c = next.campaigns.find((c) => c.id === plan.campaignId);
      if (!c || !c.subjectIds.includes(plan.subjectId))
        fail("El colaborador no participa en esta campaña.");
      if (
        !plan.title.trim() ||
        !validDate(plan.dueOn) ||
        !plan.successMeasure.trim()
      )
        fail("Completa la acción, la fecha y el criterio de cumplimiento.");
      if (
        !next.people.some(
          (p) =>
            p.id === plan.ownerId &&
            (p.id === plan.subjectId ||
              p.id ===
                next.people.find((x) => x.id === plan.subjectId)?.managerId ||
              p.role === "hr"),
        )
      )
        fail("Selecciona un responsable válido.");
      const old = next.plans.find((p) => p.id === plan.id);
      if (
        old &&
        (old.subjectId !== plan.subjectId || old.campaignId !== plan.campaignId)
      )
        fail("El plan no puede cambiar de colaborador ni de campaña.");
      plan.createdAt = old?.createdAt || now;
      plan.updatedAt = now;
      next.plans = next.plans.filter((p) => p.id !== plan.id).concat(plan);
      break;
    }
    case "plan.progress": {
      const plan =
        next.plans.find((p) => p.id === command.id) ||
        fail("Plan no encontrado.");
      if (
        !isHr &&
        plan.ownerId !== actor.id &&
        !(
          actor.role === "manager" &&
          next.people.some(
            (p) => p.id === plan.subjectId && p.managerId === actor.id,
          )
        )
      )
        fail("No tienes acceso a este plan.");
      const pc = next.campaigns.find((c) => c.id === plan.campaignId);
      if (
        actor.role === "employee" &&
        (!pc.settings.employeePlan ||
          !next.publications.some(
            (p) =>
              p.campaignId === pc.id &&
              p.subjectId === plan.subjectId &&
              p.publishedAt,
          ))
      )
        fail("Este plan aún no está disponible para el colaborador.");
      if (!["pending", "in_progress", "completed"].includes(command.status))
        fail("Estado no válido.");
      plan.status = command.status;
      plan.notes = String(command.notes || "").slice(0, 4000);
      plan.evidence = copy(command.evidence || []);
      plan.updatedAt = now;
      break;
    }
    case "settings.save": {
      manage();
      const settings = copy(command.settings);
      if (
        !Number.isInteger(Number(settings.minimumResponses)) ||
        settings.minimumResponses < 3 ||
        settings.minimumResponses > 20
      )
        fail("El mínimo de respuestas agrupadas debe estar entre 3 y 20.");
      next.settings = settings;
      break;
    }
    default:
      fail("Acción no disponible.");
  }
  next.revision = state.revision + 1;
  next.events.unshift({
    id: uid("event"),
    type: command.type,
    actorId: actor.id,
    at: now,
    entityId:
      command.id ||
      command.campaignId ||
      command.template?.id ||
      command.campaign?.id ||
      command.plan?.id,
  });
  next.events = next.events.slice(0, 500);
  return next;
}
export function loadDemo(storage, key) {
  const raw = storage.getItem(key);
  if (!raw) return seedState();
  let state;
  try {
    state = JSON.parse(raw);
  } catch {
    throw new Error(
      "No pudimos leer la demostración guardada. Puedes restablecerla para continuar.",
    );
  }
  if (
    state.schemaVersion !== SCHEMA_VERSION ||
    ![
      "people",
      "templates",
      "campaigns",
      "assignments",
      "publications",
      "plans",
      "receipts",
      "events",
    ].every((k) => Array.isArray(state[k]))
  )
    throw new Error(
      "Esta demostración pertenece a otra versión. Restablécela para continuar.",
    );
  return state;
}
