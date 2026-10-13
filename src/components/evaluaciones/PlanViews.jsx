"use client";
import { useState, useEffect } from "react";
import { useEvaluations, useEvaluationQuery } from "./EvaluationContext";
import {
  Heading,
  Panel,
  Field,
  Input,
  Select,
  Textarea,
  Button,
  Status,
  DataTable,
  Notice,
  Modal,
} from "./ui";
import { QueryState, Pagination, ExportButton } from "./ApiViews";
import { dateText } from "@/lib/evaluaciones/model.mjs";
export function PlanList({ campaignId, subjectId, embedded = false }) {
  const { api, perform, busy, actor } = useEvaluations();
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [editing, setEditing] = useState(null),
    [mode, setMode] = useState("create");
  const query = useEvaluationQuery("/plans", {
    campaignId,
    subjectId,
    status,
    page,
    pageSize: 25,
  });
  const canManage = ["hr", "manager"].includes(actor.role);
  const open = async (id, nextMode) => {
    const p = await perform(() => api.get(`/plans/${id}`).then((r) => r.data));
    if (p) {
      setMode(nextMode);
      setEditing(p);
    }
  };
  return (
    <>
      {!embedded && (
        <Heading
          title="Planes de desarrollo"
          description="Compromisos, avances y evidencias."
          actions={
            <ExportButton
              kind="plans"
              filters={{
                ...(campaignId ? { campaignId: Number(campaignId) } : {}),
                ...(subjectId ? { subjectId: Number(subjectId) } : {}),
                ...(status ? { status } : {}),
              }}
            />
          }
        />
      )}
      <Panel
        title="Seguimiento"
        actions={
          canManage && (
            <Button
              onClick={() => {
                setMode("create");
                setEditing({
                  title: "",
                  successMeasure: "",
                  campaignId: campaignId || "",
                  subjectId: subjectId || "",
                  ownerId: subjectId || "",
                  dueOn: "",
                });
              }}
            >
              Nuevo plan
            </Button>
          )
        }
      >
        <div className="ev-filters">
          <Select
            label="Estado del plan"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En proceso</option>
            <option value="completed">Completado</option>
          </Select>
        </div>
        <QueryState query={query}>
          <DataTable
            serverPaginated
            rows={query.data || []}
            columns={[
              { key: "title", label: "Acción" },
              { key: "subjectName", label: "Colaborador" },
              { key: "ownerName", label: "Responsable" },
              {
                key: "dueOn",
                label: "Compromiso",
                render: (p) => dateText(p.dueOn),
              },
              {
                key: "status",
                label: "Estado",
                render: (p) => <Status value={p.status} />,
              },
              {
                key: "actions",
                label: "Acciones",
                render: (p) => (
                  <div className="ev-actions">
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => open(p.id, "read")}
                    >
                      Ver avances
                    </Button>
                    {actor.role !== "direction" && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => open(p.id, "progress")}
                      >
                        Registrar avance
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => open(p.id, "edit")}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
          <Pagination query={query} page={page} setPage={setPage} />
        </QueryState>
      </Panel>
      {editing && (
        <PlanEditor
          key={`${mode}:${editing.id || "new"}`}
          initial={editing}
          mode={mode}
          close={() => setEditing(null)}
        />
      )}
    </>
  );
}
function PlanEditor({ initial, mode, close }) {
  const { api, perform, busy, capabilities } = useEvaluations();
  const [form, setForm] = useState(initial),
    [note, setNote] = useState(""),
    [evidence, setEvidence] = useState([]),
    [url, setUrl] = useState(""),
    [title, setTitle] = useState(""),
    [error, setError] = useState(""),
    [options, setOptions] = useState({ people: [], campaigns: [] });
  const editable = ["create", "edit"].includes(mode);
  useEffect(() => {
    if (!editable) return;
    const controller = new AbortController();
    Promise.all([
      api.all("/people", {}, controller.signal),
      mode === "create"
        ? capabilities.scopes.includes("campaigns")
          ? api.all("/campaigns", {}, controller.signal)
          : initial.campaignId
          ? Promise.resolve([
              {
                id: initial.campaignId,
                name: initial.campaignName || `Campaña ${initial.campaignId}`,
                status: "active",
              },
            ])
          : api
              .all("/team", {}, controller.signal)
              .then((rows) => [
                ...new Map(
                  rows
                    .filter((r) => r.campaignId)
                    .map((r) => [
                      r.campaignId,
                      {
                        id: r.campaignId,
                        name: r.campaignName || r.campaign?.name,
                        status: "active",
                      },
                    ])
                ).values(),
              ])
        : Promise.resolve([]),
    ])
      .then(([people, campaigns]) => {
        if (!controller.signal.aborted) setOptions({ people, campaigns });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [
    api,
    editable,
    mode,
    capabilities.scopes,
    initial.campaignId,
    initial.campaignName,
  ]);
  function change(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }
  async function save() {
    const result = await perform(() => {
      if (mode === "progress")
        return api.mutate(
          "POST",
          `/plans/${form.id}/updates`,
          { status: form.status, note, evidence },
          { version: form.revision }
        );
      const body = {
        title: form.title,
        successMeasure: form.successMeasure,
        dueOn: form.dueOn,
        ownerId: Number(form.ownerId),
      };
      if (mode === "create")
        return api.mutate("POST", "/plans", {
          ...body,
          campaignId: Number(form.campaignId),
          subjectId: Number(form.subjectId),
        });
      return api.mutate("PATCH", `/plans/${form.id}`, body, {
        version: form.revision,
      });
    }, "Plan de desarrollo guardado");
    if (result) close();
  }
  function addEvidence() {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol) || !title.trim())
        throw new Error();
      setEvidence((v) => [
        ...v,
        { title: title.trim(), externalUrl: parsed.href },
      ]);
      setTitle("");
      setUrl("");
      setError("");
    } catch {
      setError("Escribe un título y un enlace http:// o https:// válido.");
    }
  }
  return (
    <Modal
      open
      onOpenChange={close}
      title={
        {
          create: "Nuevo plan",
          edit: "Editar plan",
          progress: "Registrar avance",
          read: "Historial de avances",
        }[mode]
      }
      description="Los avances se conservan como registros independientes."
      footer={
        mode !== "read" && (
          <Button
            disabled={
              busy ||
              (editable &&
                (!form.title.trim() ||
                  !form.ownerId ||
                  !form.dueOn ||
                  !form.subjectId ||
                  !form.campaignId))
            }
            onClick={save}
          >
            Guardar
          </Button>
        )
      }
    >
      <div className="ev-stack">
        {error && <Notice tone="red">{error}</Notice>}
        {editable ? (
          <>
            {mode === "create" && (
              <>
                <Field label="Campaña">
                  <Select
                    value={form.campaignId}
                    onChange={(e) => change({ campaignId: e.target.value })}
                  >
                    <option value="">Selecciona una campaña</option>
                    {options.campaigns
                      .filter((c) => c.status !== "draft")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Colaborador">
                  <Select
                    value={form.subjectId}
                    onChange={(e) =>
                      change({
                        subjectId: e.target.value,
                        ownerId: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecciona un colaborador</option>
                    {options.people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}
            <Field label="Acción">
              <Input
                maxLength={250}
                value={form.title}
                onChange={(e) => change({ title: e.target.value })}
              />
            </Field>
            <Field label="Criterio de cumplimiento">
              <Textarea
                maxLength={2000}
                value={form.successMeasure}
                onChange={(e) => change({ successMeasure: e.target.value })}
              />
            </Field>
            <Field label="Responsable">
              <Select
                value={form.ownerId}
                onChange={(e) => change({ ownerId: e.target.value })}
              >
                <option value="">Selecciona responsable</option>
                {options.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha compromiso">
              <Input
                type="date"
                value={form.dueOn}
                onChange={(e) => change({ dueOn: e.target.value })}
              />
            </Field>
          </>
        ) : (
          <>
            <h3>{form.title}</h3>
            <p>{form.successMeasure}</p>
            {mode === "progress" && (
              <>
                <Field label="Estado">
                  <Select
                    value={form.status}
                    onChange={(e) => change({ status: e.target.value })}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En proceso</option>
                    <option value="completed">Completado</option>
                  </Select>
                </Field>
                <Field label="Avance">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Field>
                <Field label="Título de evidencia">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
                <Field label="Enlace de evidencia">
                  <Input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </Field>
                <Button
                  variant="outline"
                  disabled={evidence.length >= 10}
                  onClick={addEvidence}
                >
                  Agregar enlace ({evidence.length}/10)
                </Button>
                {evidence.map((e, i) => (
                  <div key={i}>
                    <a
                      href={e.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {e.title}
                    </a>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setEvidence((v) => v.filter((_, n) => n !== i))
                      }
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
              </>
            )}
            {(form.updates || []).map((u, i) => (
              <Panel key={u.id ?? i} title={dateText(u.createdAt || u.at)}>
                <div className="ev-pad">
                  <Status value={u.status} />
                  <p>{u.note}</p>
                  {(u.evidence || []).map(
                    (e, n) =>
                      /^https?:\/\//i.test(e.externalUrl) && (
                        <p key={n}>
                          <a
                            href={e.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {e.title}
                          </a>
                        </p>
                      )
                  )}
                </div>
              </Panel>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}
