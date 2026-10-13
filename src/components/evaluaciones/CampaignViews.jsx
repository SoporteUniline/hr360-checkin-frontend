"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
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
  Button,
  ActionLink,
  DataTable,
  SearchInput,
  Empty,
  Notice,
  Errors,
  Confirm,
  Person,
} from "./ui";
import {
  PRESETS,
  PERSPECTIVES,
  copy,
  uid,
  normalize,
  civilToday,
} from "@/lib/evaluaciones/model.mjs";
import { useUnsavedGuard } from "./ResponseView";
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
  const { state, actor, run, navigate, api, perform, busy, capabilities } =
      useEvaluations(),
    original = state.campaigns.find((c) => c.id === id);
  const [campaign, setCampaign] = useState(() =>
      copy(original || blankCampaign(state))
    ),
    [assignments, setAssignments] = useState(() =>
      copy(state.assignments.filter((a) => a.campaignId === id))
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
    if (reassign) setAssignments([]);
  };
  const updateGroup = (key, patch) =>
    change(
      {
        groups: campaign.groups.map((g) =>
          g.key === key ? { ...g, ...patch } : g
        ),
      },
      Object.hasOwn(patch, "templateId")
    );
  const visible = state.people.filter(
    (p) =>
      p.active &&
      (area === "all" || p.area === area) &&
      (position === "all" || p.position === position) &&
      normalize(`${p.name} ${p.position} ${p.area}`).includes(normalize(search))
  );
  const togglePerson = (id) =>
    change(
      {
        subjectIds: campaign.subjectIds.includes(id)
          ? campaign.subjectIds.filter((x) => x !== id)
          : [...campaign.subjectIds, id],
      },
      true
    );
  const persist = async () => {
    const saved = await run({ type: "campaign.save", campaign });
    if (saved) {
      setCampaign(saved);
      setDirty(false);
    }
    return saved;
  };
  const preview = async () => {
    const saved = await persist();
    if (!saved) return;
    const result = await perform(() =>
      api.mutate("POST", `/campaigns/${saved.id}/preview-assignments`, {})
    );
    if (result) {
      setAssignments(
        (Array.isArray(result) ? result : result.assignments || []).map(
          (a, index) => ({
            ...a,
            id: String(a.id ?? `preview-${index}`),
            subjectId: String(a.subjectId),
            evaluatorId:
              a.evaluatorEmployeeId != null
                ? String(a.evaluatorEmployeeId)
                : `user:${a.evaluatorUserId}`,
          })
        )
      );
      setDirty(true);
    }
  };
  const save = async (launch = false) => {
    setErrors([]);
    const saved = await persist();
    if (!saved) return;
    let assignmentsStored = false;
    const done = await perform(
      async () => {
        await api.mutate(
          "PUT",
          `/campaigns/${saved.id}/assignments`,
          {
            assignments: assignments.map((a) => ({
              subjectId: Number(a.subjectId),
              perspective: a.perspective,
              evaluatorEmployeeId:
                a.evaluatorEmployeeId == null
                  ? null
                  : Number(a.evaluatorEmployeeId),
              evaluatorUserId:
                a.evaluatorUserId == null ? null : Number(a.evaluatorUserId),
            })),
          },
          { version: saved.revision }
        );
        assignmentsStored = true;
        if (launch) {
          const validation = await api.mutate(
            "POST",
            `/campaigns/${saved.id}/validate`,
            {}
          );
          if (validation?.valid === false || validation?.errors?.length)
            throw new Error(
              (validation.errors || ["Revisa la configuración de la campaña."])
                .map((e) => (typeof e === "string" ? e : e.message))
                .join(" ")
            );
          await api.mutate(
            "POST",
            `/campaigns/${saved.id}/launch`,
            {},
            { idempotent: true }
          );
        }
        return true;
      },
      launch ? "Campaña iniciada" : "Borrador guardado"
    );
    if (done) {
      setDirty(false);
      navigate(`campanas/${saved.id}`);
    } else if (assignmentsStored) {
      // The assignment save may have succeeded before validation/launch failed.
      // Keep edited fields and assignments; only refresh the concurrency snapshot.
      await run({ type: "campaign.refresh", id: saved.id });
      setDirty(true);
    }
  };
  const total = campaign.groups.reduce(
    (sum, g) => sum + Number(g.weight || 0),
    0
  );
  const issues = [];
  return (
    <>
      <Heading
        title={id ? "Editar campaña" : "Nueva evaluación"}
        description="Cuatro pasos para preparar una evaluación clara y bien organizada."
        back="campanas"
        actions={
          <Button variant="outline" disabled={busy} onClick={() => save(false)}>
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
                  maxLength={capabilities.limits?.templateName || 160}
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
                      true
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
                              })
                            ),
                          },
                          true
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
                            true
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
              description={`${campaign.subjectIds.length} seleccionadas. Busca en todas las personas de la empresa.`}
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
                    )
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
                      true
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
              Solicita la propuesta del organigrama real y revisa las
              asignaciones. Si cambias participantes o perspectivas, vuelve a
              generar la propuesta.
            </Notice>
            <Panel
              title="Matriz de asignaciones"
              actions={
                <Button disabled={busy} onClick={preview}>
                  Proponer asignaciones
                </Button>
              }
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
                    subjectFilter === "all" || a.subjectId === subjectFilter
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
                      a.evaluatorName ||
                      state.people.find((p) => p.id === a.evaluatorId)?.name ||
                      a.evaluatorId,
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
                            assignments.filter((x) => x.id !== a.id)
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
              <AssignmentAdder
                campaign={campaign}
                people={state.people}
                assignments={assignments}
                onAdd={(a) => {
                  setAssignments((v) => [...v, a]);
                  setDirty(true);
                }}
              />
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
                      <option value="monthly">Cada mes</option>
                      <option value="yearly">Cada año</option>
                    </Select>
                  </Field>
                  <Notice>
                    Los recordatorios y las campañas recurrentes se programan en
                    el servidor.
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
                  Al guardar se validarán participantes, pesos, plantillas,
                  fechas y asignaciones en el servidor.
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
              disabled={busy || !assignments.length}
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
        title="Iniciar campaña"
        description="Se fijarán las plantillas, los pesos y las asignaciones. Las fechas futuras quedarán programadas. El servidor programará los avisos correspondientes."
        action="Iniciar campaña"
        onConfirm={() => save(true)}
      />
    </>
  );
}

function AssignmentAdder({ campaign, people, assignments, onAdd }) {
  const [subjectId, setSubjectId] = useState(""),
    [perspective, setPerspective] = useState(""),
    [employeeId, setEmployeeId] = useState(""),
    [userId, setUserId] = useState("");
  const canAdd =
    subjectId &&
    perspective &&
    !!employeeId !== !!userId &&
    !assignments.some(
      (a) =>
        String(a.subjectId) === subjectId &&
        a.perspective === perspective &&
        (employeeId
          ? String(a.evaluatorEmployeeId) === employeeId
          : String(a.evaluatorUserId) === userId)
    );
  return (
    <div className="ev-pad ev-stack">
      <h3>Agregar evaluador</h3>
      <div className="ev-grid">
        <Field label="Colaborador evaluado">
          <Select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">Selecciona</option>
            {people
              .filter((p) => campaign.subjectIds.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Perspectiva">
          <Select
            value={perspective}
            onChange={(e) => setPerspective(e.target.value)}
          >
            <option value="">Selecciona</option>
            {campaign.groups.map((g) => (
              <option key={g.key} value={g.key}>
                {PERSPECTIVES[g.key]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Evaluador empleado">
          <Select
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setUserId("");
            }}
          >
            <option value="">Selecciona</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        {perspective === "hr" && (
          <Field label="O usuario de RH (ID)">
            <Input
              type="number"
              min={1}
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setEmployeeId("");
              }}
            />
          </Field>
        )}
      </div>
      <Button
        variant="outline"
        disabled={!canAdd}
        onClick={() => {
          onAdd({
            id: uid("assignment"),
            subjectId,
            perspective,
            evaluatorEmployeeId: employeeId ? Number(employeeId) : null,
            evaluatorUserId: userId ? Number(userId) : null,
            evaluatorId: employeeId || `user:${userId}`,
            evaluatorName:
              people.find((p) => p.id === employeeId)?.name ||
              `Usuario RH ${userId}`,
          });
          setEmployeeId("");
          setUserId("");
        }}
      >
        Agregar asignación
      </Button>
      <small>El servidor validará la relación y el acceso del evaluador.</small>
    </div>
  );
}
