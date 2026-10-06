"use client";
import { useState } from "react";
import { Plus, Copy, Send, Users, Trash2 } from "lucide-react";
import { useEvaluations } from "./EvaluationContext";
import {
  Heading,
  Panel,
  Field,
  Input,
  Select,
  Textarea,
  Toggle,
  Badge,
  Status,
  Button,
  ActionLink,
  DataTable,
  SearchInput,
  Segments,
  Empty,
  Notice,
  Errors,
  Progress,
  Confirm,
  Modal,
  Person,
} from "./ui";
import {
  PRESETS,
  PERSPECTIVES,
  copy,
  uid,
  makeAssignments,
  validateCampaign,
  normalize,
  dateText,
  candidateEvaluators,
  personResult,
  scoreText,
  civilToday,
  campaignStatus,
} from "@/lib/evaluaciones/model.mjs";
import { useUnsavedGuard } from "./ResponseView";
export function CampaignTable({ campaigns }) {
  const { state } = useEvaluations();
  return (
    <DataTable
      rows={campaigns}
      columns={[
        {
          key: "name",
          label: "Campaña",
          render: (c) => (
            <>
              <strong>{c.name}</strong>
              <small>
                {dateText(c.periodStart)} — {dateText(c.periodEnd)}
              </small>
            </>
          ),
        },
        {
          key: "model",
          label: "Modelo",
          render: (c) => (
            <Badge tone="blue">
              {PRESETS[c.model]?.label || "Personalizada"}
            </Badge>
          ),
        },
        {
          key: "subjectIds",
          label: "Colaboradores",
          render: (c) => c.subjectIds.length,
        },
        {
          key: "progress",
          label: "Avance",
          render: (c) => {
            const list = state.assignments.filter((a) => a.campaignId === c.id),
              done = list.filter((a) => a.status === "submitted").length;
            return (
              <Progress
                value={list.length ? (done / list.length) * 100 : 0}
                label={`${done}/${list.length} respuestas`}
              />
            );
          },
        },
        {
          key: "dueOn",
          label: "Fecha límite",
          render: (c) => dateText(c.dueOn),
        },
        {
          key: "status",
          label: "Estado",
          render: (c) => <Status value={campaignStatus(c)} />,
        },
        {
          key: "action",
          label: "",
          render: (c) => (
            <ActionLink to={`campanas/${c.id}`}>Ver campaña</ActionLink>
          ),
        },
      ]}
    />
  );
}
export function Campaigns() {
  const { state, actor } = useEvaluations(),
    [search, setSearch] = useState(""),
    [tab, setTab] = useState("all"),
    [period, setPeriod] = useState("all");
  if (!["hr", "direction"].includes(actor.role))
    return <Empty title="Vista de RH y dirección" />;
  const campaigns = state.campaigns.filter(
    (c) =>
      normalize(c.name).includes(normalize(search)) &&
      (tab === "all" || campaignStatus(c) === tab) &&
      (period === "all" || c.periodStart.slice(0, 7) === period),
  );
  return (
    <>
      <Heading
        title="Campañas de evaluación"
        description="Organiza cada periodo y consulta su avance en un solo lugar."
        actions={
          actor.role === "hr" && (
            <ActionLink to="campanas/nueva" primary>
              <Plus size={15} /> Nueva evaluación
            </ActionLink>
          )
        }
      />
      <Panel>
        <Segments
          value={tab}
          onChange={setTab}
          items={[
            ["all", "Todas"],
            ["active", "Activas"],
            ["scheduled", "Programadas"],
            ["draft", "Borradores"],
            ["overdue", "Vencidas"],
            ["closed", "Cerradas"],
          ].map(([value, label]) => ({
            value,
            label,
            count: state.campaigns.filter(
              (c) => value === "all" || campaignStatus(c) === value,
            ).length,
          }))}
        />
        <div className="ev-filters">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar en todas las campañas…"
          />
          <Select
            label="Periodo"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">Todos los periodos</option>
            {[...new Set(state.campaigns.map((c) => c.periodStart.slice(0, 7)))]
              .filter(Boolean)
              .sort()
              .reverse()
              .map((p) => (
                <option key={p}>{p}</option>
              ))}
          </Select>
        </div>
        <CampaignTable campaigns={campaigns} />
      </Panel>
    </>
  );
}
function blankCampaign(state) {
  const today = civilToday();
  return {
    id: uid("camp"),
    name: "",
    description: "",
    model: "180",
    templateId: state.templates.find((t) => !t.archived)?.id || "",
    periodStart: today.slice(0, 8) + "01",
    periodEnd: today,
    opensOn: today,
    dueOn: today,
    subjectIds: [],
    groups: Object.entries(PRESETS["180"].weights).map(([key, weight]) => ({
      key,
      weight,
      templateId: state.templates.find((t) => !t.archived)?.id || "",
    })),
    settings: copy(state.settings),
    reminders: [7, 3, 0],
    recurrence: "none",
    status: "draft",
    timezone: "America/Mexico_City",
  };
}
export function CampaignWizard({ id }) {
  const { state, actor, run, navigate } = useEvaluations(),
    original = state.campaigns.find((c) => c.id === id);
  const [campaign, setCampaign] = useState(() =>
      copy(original || blankCampaign(state)),
    ),
    [assignments, setAssignments] = useState(() =>
      copy(state.assignments.filter((a) => a.campaignId === id)),
    ),
    [step, setStep] = useState(0),
    [errors, setErrors] = useState([]),
    [search, setSearch] = useState(""),
    [area, setArea] = useState("all"),
    [position, setPosition] = useState("all"),
    [subjectFilter, setSubjectFilter] = useState("all"),
    [dirty, setDirty] = useState(false),
    [confirm, setConfirm] = useState(false);
  useUnsavedGuard(dirty);
  if (actor.role !== "hr")
    return <Empty title="Solo RH puede programar campañas" />;
  if (id && (!original || original.status !== "draft"))
    return (
      <Empty
        title="La campaña no es un borrador editable"
        action={<ActionLink to="campanas">Ver campañas</ActionLink>}
      />
    );
  const available = state.templates.filter((t) => !t.archived);
  if (!available.length)
    return (
      <Empty
        title="Primero crea una plantilla"
        action={
          <ActionLink to="plantillas/nueva" primary>
            Crear plantilla
          </ActionLink>
        }
      />
    );
  const change = (patch, reassign = false) => {
    const next = { ...campaign, ...patch };
    setCampaign(next);
    setDirty(true);
    if (reassign)
      setAssignments(makeAssignments(next, state.people, state.templates));
  };
  const updateGroup = (key, patch) =>
    change(
      {
        groups: campaign.groups.map((g) =>
          g.key === key ? { ...g, ...patch } : g,
        ),
      },
      Object.hasOwn(patch, "templateId"),
    );
  const visible = state.people.filter(
    (p) =>
      p.active &&
      (area === "all" || p.area === area) &&
      (position === "all" || p.position === position) &&
      normalize(`${p.name} ${p.position} ${p.area}`).includes(
        normalize(search),
      ),
  );
  const togglePerson = (id) =>
    change(
      {
        subjectIds: campaign.subjectIds.includes(id)
          ? campaign.subjectIds.filter((x) => x !== id)
          : [...campaign.subjectIds, id],
      },
      true,
    );
  const save = (launch = false) => {
    const issues = launch
      ? validateCampaign(campaign, assignments, state.people, state.templates)
      : campaign.name.trim()
        ? []
        : ["Escribe el nombre de la campaña."];
    setErrors(issues);
    if (issues.length) {
      setConfirm(false);
      return;
    }
    if (!run({ type: "campaign.save", campaign, assignments })) return;
    if (
      launch &&
      !run(
        { type: "campaign.launch", campaignId: campaign.id },
        "Campaña iniciada en la demostración",
      )
    )
      return;
    setDirty(false);
    navigate(`campanas/${campaign.id}`);
  };
  const total = campaign.groups.reduce((s, g) => s + Number(g.weight || 0), 0),
    issues = validateCampaign(
      campaign,
      assignments,
      state.people,
      state.templates,
    );
  return (
    <>
      <Heading
        title={id ? "Editar campaña" : "Nueva evaluación"}
        description="Cuatro pasos para preparar una evaluación clara y bien organizada."
        back="campanas"
        actions={
          <Button variant="outline" onClick={() => save(false)}>
            Guardar borrador
          </Button>
        }
      />
      <div className="ev-stepper">
        {[
          "Campaña y formato",
          "Participantes y modelo",
          "Quién evalúa a quién",
          "Revisar y programar",
        ].map((label, i) => (
          <button
            type="button"
            key={label}
            aria-current={step === i ? "step" : undefined}
            onClick={() => setStep(i)}
          >
            <span>{i + 1}</span>
            {label}
          </button>
        ))}
      </div>
      <Errors errors={errors} />
      <div className="ev-stack">
        {step === 0 && (
          <Panel title="Define la campaña">
            <div className="ev-pad ev-stack">
              <Field label="Nombre de la campaña">
                <Input
                  label="Nombre de campaña"
                  value={campaign.name}
                  maxLength={160}
                  placeholder="Ej. Desempeño · Cuarto trimestre 2026"
                  onChange={(e) => change({ name: e.target.value })}
                />
              </Field>
              <Field label="Instrucciones para los evaluadores">
                <Textarea
                  label="Instrucciones de campaña"
                  value={campaign.description}
                  onChange={(e) => change({ description: e.target.value })}
                />
              </Field>
              <Field label="Plantilla principal">
                <Select
                  label="Plantilla principal"
                  value={campaign.templateId}
                  onChange={(e) =>
                    change(
                      {
                        templateId: e.target.value,
                        groups: campaign.groups.map((g) => ({
                          ...g,
                          templateId: e.target.value,
                        })),
                      },
                      true,
                    )
                  }
                >
                  {available.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · v{t.version}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="ev-grid">
                <Field label="Inicio del periodo evaluado">
                  <Input
                    type="date"
                    label="Inicio del periodo"
                    value={campaign.periodStart}
                    onChange={(e) => change({ periodStart: e.target.value })}
                  />
                </Field>
                <Field label="Fin del periodo evaluado">
                  <Input
                    type="date"
                    label="Fin del periodo"
                    value={campaign.periodEnd}
                    onChange={(e) => change({ periodEnd: e.target.value })}
                  />
                </Field>
              </div>
              <Notice>
                El periodo es el trabajo que se evalúa. Las fechas para
                responder se configuran en el último paso.
              </Notice>
            </div>
          </Panel>
        )}
        {step === 1 && (
          <>
            <Panel
              title="¿Qué perspectivas quieres incluir?"
              description="Los grados son formatos iniciales. Revisa siempre las relaciones y sus pesos."
            >
              <div className="ev-pad ev-stack">
                <div className="ev-three">
                  {Object.entries(PRESETS).map(([key, p]) => (
                    <button
                      type="button"
                      className="ev-choice-card"
                      key={key}
                      aria-pressed={campaign.model === key}
                      onClick={() =>
                        change(
                          {
                            model: key,
                            groups: Object.entries(p.weights).map(
                              ([key, weight]) => ({
                                key,
                                weight,
                                templateId: campaign.templateId,
                              }),
                            ),
                          },
                          true,
                        )
                      }
                    >
                      <strong>{p.label}</strong>
                      <small>
                        {Object.keys(p.weights)
                          .map((k) => PERSPECTIVES[k].split(" · ")[0])
                          .join(" + ")}
                      </small>
                    </button>
                  ))}
                </div>
                <div className="ev-chip-list">
                  {Object.entries(PERSPECTIVES).map(([key, label]) => (
                    <label className="ev-option" key={key}>
                      <input
                        type="checkbox"
                        checked={campaign.groups.some((g) => g.key === key)}
                        onChange={(e) =>
                          change(
                            {
                              model: "custom",
                              groups: e.target.checked
                                ? [
                                    ...campaign.groups,
                                    {
                                      key,
                                      weight: 0,
                                      templateId: campaign.templateId,
                                    },
                                  ]
                                : campaign.groups.filter((g) => g.key !== key),
                            },
                            true,
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {campaign.groups.map((g) => (
                  <div className="ev-grid" key={g.key}>
                    <Field label={`${PERSPECTIVES[g.key]} · peso (%)`}>
                      <Input
                        type="number"
                        label={`Peso ${g.key}`}
                        min={0.01}
                        max={100}
                        step="0.01"
                        value={g.weight}
                        onChange={(e) =>
                          updateGroup(g.key, { weight: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Plantilla para esta perspectiva">
                      <Select
                        label={`Plantilla ${g.key}`}
                        value={g.templateId}
                        onChange={(e) =>
                          updateGroup(g.key, { templateId: e.target.value })
                        }
                      >
                        {available.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                ))}
                <Notice tone={total === 100 ? "green" : "amber"}>
                  Peso total de perspectivas: <strong>{total}% / 100%</strong>
                </Notice>
              </div>
            </Panel>
            <Panel
              title="Selecciona a las personas evaluadas"
              description={`${campaign.subjectIds.length} seleccionadas. Busca en todas las personas de la demostración.`}
            >
              <div className="ev-filters">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Buscar colaborador o puesto…"
                />
                <Select
                  label="Filtrar área"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                >
                  <option value="all">Todas las áreas</option>
                  {[...new Set(state.people.map((p) => p.area))].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Select>
                <Select
                  label="Filtrar puesto"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  <option value="all">Todos los puestos</option>
                  {[...new Set(state.people.map((p) => p.position))].map(
                    (a) => (
                      <option key={a}>{a}</option>
                    ),
                  )}
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    change(
                      {
                        subjectIds: [
                          ...new Set([
                            ...campaign.subjectIds,
                            ...visible.map((p) => p.id),
                          ]),
                        ],
                      },
                      true,
                    )
                  }
                >
                  Seleccionar filtrados
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => change({ subjectIds: [] }, true)}
                >
                  Limpiar selección
                </Button>
              </div>
              <DataTable
                rows={visible}
                columns={[
                  {
                    key: "name",
                    label: "Colaborador",
                    render: (p) => (
                      <label className="ev-option">
                        <input
                          type="checkbox"
                          aria-label={`Evaluar a ${p.name}`}
                          checked={campaign.subjectIds.includes(p.id)}
                          onChange={() => togglePerson(p.id)}
                        />
                        <Person person={p} />
                      </label>
                    ),
                  },
                  {
                    key: "manager",
                    label: "Jefe directo",
                    render: (p) =>
                      state.people.find((x) => x.id === p.managerId)?.name ||
                      "Sin jefe directo",
                  },
                ]}
              />
            </Panel>
          </>
        )}
        {step === 2 && (
          <>
            <Notice>
              Las relaciones se proponen desde el organigrama ficticio. Puedes
              quitar o agregar evaluadores compatibles. Al cambiar participantes
              o plantillas se vuelven a generar estas asignaciones.
            </Notice>
            <Panel
              title="Matriz de asignaciones"
              description={`${campaign.subjectIds.length} evaluados · ${assignments.length} evaluaciones por responder`}
            >
              <div className="ev-filters">
                <Select
                  label="Persona evaluada"
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                >
                  <option value="all">Todas las personas</option>
                  {state.people
                    .filter((p) => campaign.subjectIds.includes(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </Select>
              </div>
              <DataTable
                rows={assignments.filter(
                  (a) =>
                    subjectFilter === "all" || a.subjectId === subjectFilter,
                )}
                columns={[
                  {
                    key: "subjectId",
                    label: "Evaluado",
                    render: (a) =>
                      state.people.find((p) => p.id === a.subjectId)?.name,
                  },
                  {
                    key: "evaluatorId",
                    label: "Evaluador",
                    render: (a) =>
                      state.people.find((p) => p.id === a.evaluatorId)?.name,
                  },
                  {
                    key: "perspective",
                    label: "Relación",
                    render: (a) => <Badge>{PERSPECTIVES[a.perspective]}</Badge>,
                  },
                  {
                    key: "remove",
                    label: "",
                    render: (a) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Quitar asignación ${a.id}`}
                        onClick={() => {
                          setAssignments(
                            assignments.filter((x) => x.id !== a.id),
                          );
                          setDirty(true);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    ),
                  },
                ]}
              />
              <div className="ev-pad ev-stack">
                {campaign.subjectIds
                  .filter(
                    (id) => subjectFilter === "all" || id === subjectFilter,
                  )
                  .map((id) => {
                    const person = state.people.find((p) => p.id === id);
                    return (
                      <div key={id}>
                        <strong>{person.name}</strong>
                        {campaign.groups.map((g) => {
                          const missing = candidateEvaluators(
                            state.people,
                            person,
                            g.key,
                          ).filter(
                            (p) =>
                              !assignments.some(
                                (a) =>
                                  a.subjectId === id &&
                                  a.evaluatorId === p.id &&
                                  a.perspective === g.key,
                              ),
                          );
                          return (
                            <div className="ev-category-row" key={g.key}>
                              <span>{PERSPECTIVES[g.key]}</span>
                              <Select
                                label={`Agregar ${g.key} para ${person.name}`}
                                value=""
                                disabled={!missing.length}
                                style={{ maxWidth: 280 }}
                                onChange={(e) => {
                                  if (!e.target.value) return;
                                  const fresh = makeAssignments(
                                    {
                                      ...campaign,
                                      subjectIds: [id],
                                      groups: [g],
                                    },
                                    state.people,
                                    state.templates,
                                  ).find(
                                    (a) => a.evaluatorId === e.target.value,
                                  );
                                  setAssignments([...assignments, fresh]);
                                  setDirty(true);
                                }}
                              >
                                <option value="">
                                  {missing.length
                                    ? "Agregar evaluador…"
                                    : "Todos los elegibles asignados"}
                                </option>
                                {missing.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
              </div>
            </Panel>
            <Panel title="Confidencialidad de la campaña">
              <div className="ev-pad">
                <Toggle
                  label="Agrupar resultados de pares"
                  hint="Oculta autores y resultados individuales de esta perspectiva."
                  checked={campaign.settings.anonymousPeers}
                  onChange={(v) =>
                    change({
                      settings: { ...campaign.settings, anonymousPeers: v },
                    })
                  }
                />
                <Toggle
                  label="Agrupar resultados ascendentes"
                  checked={campaign.settings.anonymousAscending}
                  onChange={(v) =>
                    change({
                      settings: { ...campaign.settings, anonymousAscending: v },
                    })
                  }
                />
                <Field label="Mínimo de respuestas por grupo confidencial">
                  <Input
                    type="number"
                    min={3}
                    max={20}
                    label="Mínimo de respuestas agrupadas"
                    value={campaign.settings.minimumResponses}
                    onChange={(e) =>
                      change({
                        settings: {
                          ...campaign.settings,
                          minimumResponses: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Field>
              </div>
            </Panel>
          </>
        )}
        {step === 3 && (
          <div className="ev-editor-grid">
            <div className="ev-stack">
              <Panel title="Fechas y recordatorios">
                <div className="ev-pad ev-stack">
                  <div className="ev-grid">
                    <Field label="Disponible desde">
                      <Input
                        type="date"
                        label="Apertura"
                        value={campaign.opensOn}
                        onChange={(e) => change({ opensOn: e.target.value })}
                      />
                    </Field>
                    <Field label="Fecha límite para responder">
                      <Input
                        type="date"
                        label="Fecha límite"
                        value={campaign.dueOn}
                        onChange={(e) => change({ dueOn: e.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="Zona horaria">
                    <Select
                      label="Zona horaria"
                      value={campaign.timezone || "America/Mexico_City"}
                      onChange={(e) => change({ timezone: e.target.value })}
                    >
                      {[
                        "America/Mexico_City",
                        "America/Tijuana",
                        "America/Cancun",
                        "America/Hermosillo",
                      ].map((z) => (
                        <option key={z}>{z}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Recordatorios automáticos">
                    <div className="ev-chip-list">
                      {[7, 3, 1, 0].map((n) => (
                        <label className="ev-option" key={n}>
                          <input
                            type="checkbox"
                            checked={campaign.reminders.includes(n)}
                            onChange={(e) =>
                              change({
                                reminders: e.target.checked
                                  ? [...campaign.reminders, n]
                                  : campaign.reminders.filter((x) => x !== n),
                              })
                            }
                          />
                          {n === 0 ? "El día del cierre" : `${n} días antes`}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Repetir campaña">
                    <Select
                      label="Repetir campaña"
                      value={campaign.recurrence}
                      onChange={(e) => change({ recurrence: e.target.value })}
                    >
                      <option value="none">No repetir</option>
                      <option value="quarterly">Cada trimestre</option>
                      <option value="semiannual">Cada semestre</option>
                      <option value="annual">Cada año</option>
                    </Select>
                  </Field>
                  <Notice>
                    En esta demostración se guarda la configuración. Los correos
                    y la creación recurrente de campañas se conectarán con el
                    backend.
                  </Notice>
                </div>
              </Panel>
              <Panel title="Publicación y acceso">
                <div className="ev-pad">
                  {[
                    ["requireApproval", "Requiere aprobación de RH"],
                    ["employeeScore", "Colaborador puede ver su calificación"],
                    ["employeeCategories", "Colaborador puede ver categorías"],
                    ["employeeComments", "Colaborador puede ver comentarios"],
                    ["employeePlan", "Colaborador puede ver el plan"],
                    [
                      "managerResults",
                      "Jefe puede consultar resultados publicados",
                    ],
                    ["requireReceipt", "Solicitar confirmación de recibido"],
                  ].map(([key, label]) => (
                    <Toggle
                      key={key}
                      label={label}
                      checked={campaign.settings[key]}
                      onChange={(v) =>
                        change({ settings: { ...campaign.settings, [key]: v } })
                      }
                    />
                  ))}
                </div>
              </Panel>
            </div>
            <div className="ev-stack ev-sticky">
              <Panel title="Resumen de la campaña">
                <div className="ev-pad ev-stack">
                  <h3>{campaign.name || "Sin nombre"}</h3>
                  <Badge tone="blue">{PRESETS[campaign.model]?.label}</Badge>
                  <p>
                    {campaign.subjectIds.length} colaboradores
                    <br />
                    {assignments.length} evaluaciones
                    <br />
                    {campaign.groups.length} perspectivas
                  </p>
                  {campaign.groups.map((g) => (
                    <div className="ev-category-row" key={g.key}>
                      <span>{PERSPECTIVES[g.key]}</span>
                      <strong>{g.weight}%</strong>
                    </div>
                  ))}
                </div>
              </Panel>
              {issues.length ? (
                <Errors errors={issues} />
              ) : (
                <Notice tone="green">
                  Todo listo: participantes, pesos, plantillas y fechas
                  completos.
                </Notice>
              )}
            </div>
          </div>
        )}
        <div className="ev-footer">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            Anterior
          </Button>
          {step < 3 ? (
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setStep(step + 1)}
            >
              Continuar
            </Button>
          ) : (
            <Button
              disabled={!!issues.length}
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setConfirm(true)}
            >
              Iniciar campaña
            </Button>
          )}
        </div>
      </div>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Iniciar campaña de demostración"
        description="Se fijarán las plantillas, los pesos y las asignaciones. Las fechas futuras quedarán programadas. No se enviarán correos reales."
        action="Iniciar campaña"
        onConfirm={() => save(true)}
      />
    </>
  );
}
export function CampaignDetail({ id }) {
  const { state, actor, run, navigate, notify } = useEvaluations(),
    c = state.campaigns.find((c) => c.id === id),
    [tab, setTab] = useState("participants"),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [close, setClose] = useState(false),
    [extend, setExtend] = useState(false),
    [due, setDue] = useState(c?.dueOn || "");
  if (!c || !["hr", "direction"].includes(actor.role))
    return (
      <Empty
        title="Campaña no disponible"
        action={<ActionLink to="campanas">Ver campañas</ActionLink>}
      />
    );
  const list = state.assignments.filter((a) => a.campaignId === id),
    done = list.filter((a) => a.status === "submitted").length;
  const duplicate = () => {
    const item = {
      ...copy(c),
      id: uid("camp"),
      name: `${c.name} · Copia`,
      status: "draft",
    };
    delete item.launchedAt;
    delete item.closedAt;
    item.groups.forEach((g) => delete g.templateSnapshot);
    if (
      run(
        {
          type: "campaign.save",
          campaign: item,
          assignments: makeAssignments(item, state.people, state.templates),
        },
        "Campaña duplicada como borrador",
      )
    )
      navigate(`campanas/${item.id}/editar`);
  };
  return (
    <>
      <Heading
        title={c.name}
        description={`${dateText(c.periodStart)} — ${dateText(c.periodEnd)} · Cierre de respuestas: ${dateText(c.dueOn)}`}
        back="campanas"
        actions={
          <>
            <Status value={campaignStatus(c)} />
            {actor.role === "hr" && (
              <>
                <Button variant="outline" onClick={duplicate}>
                  <Copy size={14} /> Duplicar
                </Button>
                {c.status === "draft" ? (
                  <ActionLink to={`campanas/${id}/editar`} primary>
                    Continuar configuración
                  </ActionLink>
                ) : (
                  ["active", "scheduled"].includes(c.status) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (run({ type: "campaign.remind", campaignId: id }))
                          notify(
                            "Recordatorio simulado. No se enviaron correos.",
                          );
                      }}
                    >
                      <Send size={14} /> Recordar pendientes
                    </Button>
                  )
                )}
              </>
            )}
          </>
        }
      />
      <div className="ev-metrics">
        <div className="ev-metric">
          <span>Colaboradores</span>
          <strong>{c.subjectIds.length}</strong>
          <small>{PRESETS[c.model]?.label}</small>
        </div>
        <div className="ev-metric">
          <span>Respuestas recibidas</span>
          <strong>
            {done} <small>/ {list.length}</small>
          </strong>
          <Progress value={list.length ? (done / list.length) * 100 : 0} />
        </div>
        <div className="ev-metric">
          <span>Por completar</span>
          <strong>{list.length - done}</strong>
          <small>Incluye borradores</small>
        </div>
        <div className="ev-metric">
          <span>Resultados publicados</span>
          <strong>
            {
              state.publications.filter(
                (p) => p.campaignId === id && p.publishedAt,
              ).length
            }
          </strong>
          <small>Visibles según permisos</small>
        </div>
      </div>
      <Panel>
        <Segments
          value={tab}
          onChange={setTab}
          items={[
            { value: "participants", label: "Colaboradores" },
            { value: "assignments", label: "Asignaciones" },
            { value: "settings", label: "Configuración" },
          ]}
        />
        {tab !== "settings" && (
          <div className="ev-filters">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar colaborador o evaluador…"
            />
            {tab === "assignments" && (
              <Select
                label="Estado de respuesta"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="draft">En proceso</option>
                <option value="submitted">Completadas</option>
              </Select>
            )}
          </div>
        )}
        {tab === "participants" && (
          <DataTable
            rows={state.people.filter(
              (p) =>
                c.subjectIds.includes(p.id) &&
                normalize(`${p.name} ${p.area}`).includes(normalize(search)),
            )}
            columns={[
              {
                key: "name",
                label: "Colaborador",
                render: (p) => <Person person={p} />,
              },
              {
                key: "progress",
                label: "Avance",
                render: (p) => {
                  const r = personResult(state, c, p.id);
                  return (
                    <Progress
                      value={r.total ? (r.done / r.total) * 100 : 0}
                      label={`${r.done}/${r.total} respuestas`}
                    />
                  );
                },
              },
              {
                key: "result",
                label: "Resultado",
                render: (p) => scoreText(personResult(state, c, p.id).score),
              },
              {
                key: "visibility",
                label: "Publicación",
                render: (p) => (
                  <Badge
                    tone={
                      personResult(state, c, p.id).publication?.publishedAt
                        ? "green"
                        : "gray"
                    }
                  >
                    {personResult(state, c, p.id).publication?.publishedAt
                      ? "Publicado"
                      : "En revisión"}
                  </Badge>
                ),
              },
              {
                key: "action",
                label: "",
                render: (p) => (
                  <ActionLink to={`resultados/${id}/${p.id}`}>
                    Ver resultado
                  </ActionLink>
                ),
              },
            ]}
          />
        )}{" "}
        {tab === "assignments" && (
          <DataTable
            rows={list.filter(
              (a) =>
                (status === "all" || a.status === status) &&
                normalize(
                  `${state.people.find((p) => p.id === a.subjectId)?.name} ${state.people.find((p) => p.id === a.evaluatorId)?.name}`,
                ).includes(normalize(search)),
            )}
            columns={[
              {
                key: "subjectId",
                label: "Evaluado",
                render: (a) =>
                  state.people.find((p) => p.id === a.subjectId)?.name,
              },
              {
                key: "evaluatorId",
                label: "Evaluador asignado",
                render: (a) =>
                  state.people.find((p) => p.id === a.evaluatorId)?.name,
              },
              {
                key: "perspective",
                label: "Perspectiva",
                render: (a) => PERSPECTIVES[a.perspective],
              },
              {
                key: "status",
                label: "Respuesta",
                render: (a) => (
                  <Status
                    value={a.status === "draft" ? "in_progress" : a.status}
                  />
                ),
              },
            ]}
          />
        )}{" "}
        {tab === "settings" && (
          <div className="ev-pad ev-stack">
            <div className="ev-grid">
              <div>
                <h3>Perspectivas y pesos</h3>
                {c.groups.map((g) => (
                  <div key={g.key} className="ev-category-row">
                    <span>
                      {PERSPECTIVES[g.key]}
                      <small className="block">
                        {
                          (
                            g.templateSnapshot ||
                            state.templates.find((t) => t.id === g.templateId)
                          )?.name
                        }
                      </small>
                    </span>
                    <Badge>{g.weight}%</Badge>
                  </div>
                ))}
              </div>
              <div className="ev-stack">
                <h3>Reglas de la campaña</h3>
                <p>
                  Apertura: {dateText(c.opensOn)}
                  <br />
                  Zona: {c.timezone || "America/Mexico_City"}
                  <br />
                  Recordatorios:{" "}
                  {c.reminders
                    .map((n) => (n === 0 ? "al cierre" : `${n} días antes`))
                    .join(", ") || "Sin recordatorios"}
                  <br />
                  Recurrencia:{" "}
                  {
                    {
                      none: "No repetir",
                      quarterly: "Trimestral",
                      semiannual: "Semestral",
                      annual: "Anual",
                    }[c.recurrence]
                  }
                </p>
                <p>
                  Aprobación previa: {c.settings.requireApproval ? "Sí" : "No"}
                  <br />
                  Mínimo agrupado: {c.settings.minimumResponses} respuestas
                  <br />
                  Pares agrupados: {c.settings.anonymousPeers ? "Sí" : "No"}
                  <br />
                  Ascendentes agrupados:{" "}
                  {c.settings.anonymousAscending ? "Sí" : "No"}
                </p>
              </div>
            </div>
            <Notice>
              Las reglas se fijaron para esta campaña. Cambiar los valores
              predeterminados no modifica evaluaciones anteriores.
            </Notice>
            {actor.role === "hr" &&
              ["active", "scheduled"].includes(c.status) && (
                <div className="ev-actions">
                  <Button variant="outline" onClick={() => setExtend(true)}>
                    Ampliar fecha límite
                  </Button>
                  <Button variant="outline" onClick={() => setClose(true)}>
                    Cerrar campaña
                  </Button>
                </div>
              )}
          </div>
        )}
      </Panel>
      <Confirm
        open={close}
        onOpenChange={setClose}
        title="Cerrar campaña"
        description={`Quedan ${list.length - done} respuestas por completar. Al cerrar ya no se podrán enviar; los resultados incompletos permanecerán sin promedio final.`}
        action="Cerrar campaña"
        onConfirm={() => {
          if (
            run({ type: "campaign.close", campaignId: id }, "Campaña cerrada")
          )
            setClose(false);
        }}
      />
      <Modal
        open={extend}
        onOpenChange={setExtend}
        title="Ampliar fecha límite"
        description="Conserva las respuestas y permite más tiempo para completar la campaña."
        footer={
          <Button
            onClick={() => {
              if (
                run(
                  { type: "campaign.extend", campaignId: id, dueOn: due },
                  "Fecha actualizada",
                )
              )
                setExtend(false);
            }}
          >
            Guardar fecha
          </Button>
        }
      >
        <Field label="Nueva fecha límite">
          <Input
            type="date"
            label="Nueva fecha límite"
            min={c.dueOn}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </Field>
      </Modal>
    </>
  );
}
