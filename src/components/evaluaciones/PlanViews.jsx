"use client";
import { useState } from "react";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { useEvaluations } from "./EvaluationContext";
import {
  Heading,
  Panel,
  Field,
  Input,
  Select,
  Textarea,
  Button,
  Status,
  Badge,
  DataTable,
  SearchInput,
  Empty,
  Notice,
  Modal,
  Person,
} from "./ui";
import {
  uid,
  copy,
  dateText,
  normalize,
  scopeSubjects,
} from "@/lib/evaluaciones/model.mjs";
export function visiblePlans(state, actor) {
  return state.plans.filter((p) => {
    const campaign = state.campaigns.find((c) => c.id === p.campaignId);
    if (actor.role === "hr" || actor.role === "direction") return true;
    if (
      actor.role === "manager" &&
      state.people.some((x) => x.id === p.subjectId && x.managerId === actor.id)
    )
      return true;
    return (
      (p.subjectId === actor.id || p.ownerId === actor.id) &&
      campaign?.settings.employeePlan &&
      state.publications.some(
        (r) =>
          r.campaignId === p.campaignId &&
          r.subjectId === p.subjectId &&
          r.publishedAt,
      )
    );
  });
}
export function PlanList({ campaignId, subjectId, embedded = false }) {
  const { state, actor, run, notify } = useEvaluations(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [editing, setEditing] = useState(null),
    [mode, setMode] = useState("create"),
    [evidenceUrl, setEvidenceUrl] = useState(""),
    [evidenceTitle, setEvidenceTitle] = useState("");
  const scoped = scopeSubjects(state, actor.role, actor.id),
    canManage = ["hr", "manager"].includes(actor.role),
    list = visiblePlans(state, actor).filter(
      (p) =>
        (!campaignId || p.campaignId === campaignId) &&
        (!subjectId || p.subjectId === subjectId),
    );
  const openNew = () => {
    const c = state.campaigns.find(
      (c) =>
        (!campaignId || c.id === campaignId) &&
        c.status !== "draft" &&
        c.subjectIds.some((id) => scoped.some((p) => p.id === id)),
    );
    if (!c) {
      notify("No hay colaboradores con una campaña disponible.");
      return;
    }
    const subject =
      subjectId || c.subjectIds.find((id) => scoped.some((p) => p.id === id));
    setEditing({
      id: uid("plan"),
      campaignId: c.id,
      subjectId: subject,
      ownerId: subject,
      title: "",
      dueOn: "",
      successMeasure: "",
      status: "pending",
      notes: "",
      evidence: [],
    });
    setMode("create");
    setEvidenceUrl("");
    setEvidenceTitle("");
  };
  const save = () => {
    const command =
      mode === "progress"
        ? {
            type: "plan.progress",
            id: editing.id,
            status: editing.status,
            notes: editing.notes,
            evidence: editing.evidence,
          }
        : { type: "plan.save", plan: editing };
    if (run(command, "Plan de seguimiento guardado")) setEditing(null);
  };
  const addEvidence = () => {
    let url;
    try {
      url = new URL(evidenceUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      notify(
        "Escribe una URL válida que comience con https:// o http://.",
        "error",
      );
      return;
    }
    if (!evidenceTitle.trim()) {
      notify("Escribe un título para la evidencia.", "error");
      return;
    }
    setEditing({
      ...editing,
      evidence: [
        ...editing.evidence,
        {
          id: uid("evidence"),
          title: evidenceTitle.trim(),
          url: url.href,
          addedAt: new Date().toISOString(),
          addedBy: actor.id,
        },
      ],
    });
    setEvidenceUrl("");
    setEvidenceTitle("");
  };
  const body = (
    <Panel
      title={embedded ? "Plan de seguimiento" : undefined}
      actions={
        embedded &&
        canManage && (
          <Button variant="outline" size="sm" onClick={openNew}>
            <Plus size={14} /> Agregar acción
          </Button>
        )
      }
    >
      <div className="ev-filters">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar acción o colaborador…"
        />
        <Select
          label="Estado del plan"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="in_progress">En proceso</option>
          <option value="completed">Completado</option>
        </Select>
      </div>
      <DataTable
        rows={list.filter(
          (p) =>
            (status === "all" || p.status === status) &&
            normalize(
              `${p.title} ${state.people.find((x) => x.id === p.subjectId)?.name}`,
            ).includes(normalize(search)),
        )}
        empty="Todavía no hay acciones de seguimiento visibles."
        columns={[
          {
            key: "title",
            label: "Acción y objetivo",
            render: (p) => (
              <>
                <strong>{p.title}</strong>
                <small>{p.successMeasure}</small>
              </>
            ),
          },
          ...(!embedded
            ? [
                {
                  key: "person",
                  label: "Colaborador",
                  render: (p) =>
                    state.people.find((x) => x.id === p.subjectId)?.name,
                },
              ]
            : []),
          {
            key: "owner",
            label: "Responsable",
            render: (p) => state.people.find((x) => x.id === p.ownerId)?.name,
          },
          {
            key: "dueOn",
            label: "Fecha compromiso",
            render: (p) => dateText(p.dueOn),
          },
          {
            key: "status",
            label: "Estado",
            render: (p) => <Status value={p.status} />,
          },
          {
            key: "action",
            label: "",
            render: (p) => (
              <div className="ev-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(copy(p));
                    setMode(
                      actor.role === "direction" ||
                        (!canManage && p.ownerId !== actor.id)
                        ? "read"
                        : "progress",
                    );
                    setEvidenceUrl("");
                    setEvidenceTitle("");
                  }}
                >
                  Ver seguimiento
                </Button>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(copy(p));
                      setMode("edit");
                    }}
                  >
                    Editar
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
    </Panel>
  );
  return (
    <>
      {!embedded && (
        <Heading
          title="Planes de seguimiento"
          description="Convierte la retroalimentación en acciones, responsables y fechas concretas."
          actions={
            canManage && (
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={openNew}
              >
                <Plus size={14} /> Nuevo plan
              </Button>
            )
          }
        />
      )}{" "}
      {body}
      <Modal
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={
          mode === "create"
            ? "Nueva acción de mejora"
            : mode === "edit"
              ? "Editar acción"
              : "Seguimiento de la acción"
        }
        description="Registra el compromiso y la evidencia de su avance."
        footer={
          mode !== "read" && <Button onClick={save}>Guardar seguimiento</Button>
        }
      >
        {editing && (
          <div className="ev-stack">
            {["create", "edit"].includes(mode) ? (
              <>
                <Field label="Campaña">
                  <Select
                    label="Campaña del plan"
                    disabled={mode === "edit" || !!campaignId}
                    value={editing.campaignId}
                    onChange={(e) => {
                      const c = state.campaigns.find(
                        (c) => c.id === e.target.value,
                      );
                      const subject = c.subjectIds.find((id) =>
                        scoped.some((p) => p.id === id),
                      );
                      setEditing({
                        ...editing,
                        campaignId: c.id,
                        subjectId: subject,
                        ownerId: subject,
                      });
                    }}
                  >
                    {state.campaigns
                      .filter(
                        (c) =>
                          c.status !== "draft" &&
                          c.subjectIds.some((id) =>
                            scoped.some((p) => p.id === id),
                          ),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Colaborador">
                  <Select
                    label="Colaborador del plan"
                    disabled={mode === "edit" || !!subjectId}
                    value={editing.subjectId}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        subjectId: e.target.value,
                        ownerId: e.target.value,
                      })
                    }
                  >
                    {scoped
                      .filter((p) =>
                        state.campaigns
                          .find((c) => c.id === editing.campaignId)
                          ?.subjectIds.includes(p.id),
                      )
                      .map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Acción a realizar">
                  <Input
                    label="Acción a realizar"
                    value={editing.title}
                    maxLength={250}
                    onChange={(e) =>
                      setEditing({ ...editing, title: e.target.value })
                    }
                  />
                </Field>
                <Field label="¿Cómo sabremos que se cumplió?">
                  <Textarea
                    label="Criterio de cumplimiento"
                    value={editing.successMeasure}
                    onChange={(e) =>
                      setEditing({ ...editing, successMeasure: e.target.value })
                    }
                  />
                </Field>
                <div className="ev-grid">
                  <Field label="Responsable">
                    <Select
                      label="Responsable del plan"
                      value={editing.ownerId}
                      onChange={(e) =>
                        setEditing({ ...editing, ownerId: e.target.value })
                      }
                    >
                      {state.people
                        .filter(
                          (p) =>
                            p.id === editing.subjectId ||
                            p.id ===
                              state.people.find(
                                (x) => x.id === editing.subjectId,
                              )?.managerId ||
                            p.role === "hr",
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </Select>
                  </Field>
                  <Field label="Fecha compromiso">
                    <Input
                      label="Fecha compromiso"
                      type="date"
                      value={editing.dueOn}
                      onChange={(e) =>
                        setEditing({ ...editing, dueOn: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <h3>{editing.title}</h3>
                <p>{editing.successMeasure}</p>
                <small>Fecha compromiso: {dateText(editing.dueOn)}</small>
                <Field label="Estado">
                  <Select
                    label="Avance del plan"
                    disabled={mode === "read"}
                    value={editing.status}
                    onChange={(e) =>
                      setEditing({ ...editing, status: e.target.value })
                    }
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En proceso</option>
                    <option value="completed">Completado</option>
                  </Select>
                </Field>
                <Field label="Notas de seguimiento">
                  <Textarea
                    label="Notas de seguimiento"
                    disabled={mode === "read"}
                    value={editing.notes}
                    onChange={(e) =>
                      setEditing({ ...editing, notes: e.target.value })
                    }
                  />
                </Field>
                <h3>Evidencias</h3>
                {editing.evidence.map((e) => (
                  <div key={e.id} className="ev-category-row">
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ev-link"
                    >
                      {e.title} <ExternalLink size={12} className="inline" />
                    </a>
                    {mode !== "read" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Eliminar evidencia ${e.title}`}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            evidence: editing.evidence.filter(
                              (x) => x.id !== e.id,
                            ),
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                ))}
                {mode !== "read" && (
                  <>
                    <Field label="Título de evidencia">
                      <Input
                        label="Título de evidencia"
                        value={evidenceTitle}
                        onChange={(e) => setEvidenceTitle(e.target.value)}
                      />
                    </Field>
                    <Field label="Enlace a evidencia">
                      <Input
                        type="url"
                        label="Enlace a evidencia"
                        placeholder="https://…"
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                      />
                    </Field>
                    <Button variant="outline" onClick={addEvidence}>
                      Agregar enlace
                    </Button>
                    <Notice>
                      Los enlaces se guardan solo en este navegador. La carga
                      privada de archivos requiere la conexión con el backend.
                    </Notice>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
