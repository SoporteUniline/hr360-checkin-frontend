"use client";
import { useState } from "react";
import { useEvaluations, useEvaluationQuery } from "./EvaluationContext";
import {
  Heading,
  Panel,
  Button,
  ActionLink,
  DataTable,
  SearchInput,
  Select,
  Status,
  Metrics,
  Notice,
  Field,
  Input,
  Textarea,
  Modal,
  Confirm,
} from "./ui";
import { PRESETS, PERSPECTIVES, dateText } from "@/lib/evaluaciones/model.mjs";
export function QueryState({ query, children }) {
  if (query.loading)
    return (
      <div className="ev-pad" role="status">
        Cargando…
      </div>
    );
  if (query.error)
    return (
      <Notice tone="red">
        <p role="alert">{query.error}</p>
        <Button variant="outline" onClick={query.reload}>
          Reintentar
        </Button>
      </Notice>
    );
  return children;
}
export function Pagination({ query, page, setPage }) {
  const p = query.pagination;
  return p ? (
    <div className="ev-footer">
      <span>
        {p.total} registros · Página {page}
      </span>
      <div className="ev-actions">
        <Button
          variant="outline"
          disabled={page <= 1 || query.loading}
          onClick={() => setPage(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={page * p.pageSize >= p.total || query.loading}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  ) : null;
}
export function ExportButton({ kind = "results", filters = {} }) {
  const { api, perform, busy } = useEvaluations();
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={() =>
        perform(async () => {
          const { blob, filename } = await api.exportCsv(kind, filters);
          const url = URL.createObjectURL(blob),
            a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        })
      }
    >
      Exportar CSV
    </Button>
  );
}
export function Templates() {
  const { api, perform, busy, navigate, capabilities } = useEvaluations();
  const [q, setQ] = useState(""),
    [archived, setArchived] = useState("active"),
    [page, setPage] = useState(1),
    [confirm, setConfirm] = useState(null);
  const query = useEvaluationQuery("/templates", {
    q,
    archived,
    page,
    pageSize: 25,
  });
  const change = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const manage = capabilities.flags?.canManageTemplates;
  async function action(t, duplicate) {
    const result = await perform(
      async () => {
        const detail = (await api.get(`/templates/${t.id}`)).data;
        return api.mutate(
          duplicate ? "POST" : "PATCH",
          `/templates/${t.id}/${duplicate ? "duplicate" : "archive"}`,
          duplicate ? {} : { archived: !t.archived },
          { version: detail.revision }
        );
      },
      duplicate ? "Plantilla duplicada" : "Plantilla actualizada"
    );
    if (result) {
      setConfirm(null);
      if (duplicate) navigate(`plantillas/${result.id}`);
    }
  }
  return (
    <>
      <Heading
        title="Plantillas de evaluación"
        description="Define qué evaluar y reutiliza tus formatos en cada campaña."
        actions={
          manage && (
            <ActionLink to="plantillas/nueva" primary>
              Nueva plantilla
            </ActionLink>
          )
        }
      />
      <Panel>
        <div className="ev-filters">
          <SearchInput
            value={q}
            onChange={change(setQ)}
            placeholder="Buscar plantilla…"
          />
          <Select
            label="Estado de plantillas"
            value={archived}
            onChange={(e) => change(setArchived)(e.target.value)}
          >
            <option value="active">Disponibles</option>
            <option value="archived">Archivadas</option>
            <option value="all">Todas</option>
          </Select>
        </div>
        <QueryState query={query}>
          <DataTable
            serverPaginated
            rows={query.data || []}
            columns={[
              { key: "name", label: "Plantilla" },
              { key: "description", label: "Descripción" },
              { key: "version", label: "Versión" },
              {
                key: "actions",
                label: "Acciones",
                render: (t) =>
                  manage && (
                    <div className="ev-actions">
                      <ActionLink to={`plantillas/${t.id}`}>Editar</ActionLink>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => action(t, true)}
                      >
                        Duplicar
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setConfirm(t)}
                      >
                        {t.archived ? "Restaurar" : "Archivar"}
                      </Button>
                    </div>
                  ),
              },
            ]}
          />
          <Pagination query={query} page={page} setPage={setPage} />
        </QueryState>
      </Panel>
      <Confirm
        open={!!confirm}
        onOpenChange={() => setConfirm(null)}
        title={confirm?.archived ? "Restaurar plantilla" : "Archivar plantilla"}
        description="Las campañas existentes conservarán su versión."
        onConfirm={() => action(confirm, false)}
      />
    </>
  );
}
export function Campaigns() {
  const { capabilities } = useEvaluations();
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1);
  const query = useEvaluationQuery("/campaigns", {
    q,
    status,
    page,
    pageSize: 25,
  });
  return (
    <>
      <Heading
        title="Campañas de evaluación"
        description="Organiza cada periodo y consulta su avance."
        actions={
          capabilities.flags?.canManageCampaigns && (
            <ActionLink to="campanas/nueva" primary>
              Nueva evaluación
            </ActionLink>
          )
        }
      />
      <Panel>
        <div className="ev-filters">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
          <Select
            label="Estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            {["draft", "scheduled", "active", "overdue", "closed"].map((s) => (
              <option key={s} value={s}>
                {
                  {
                    draft: "Borrador",
                    scheduled: "Programada",
                    active: "Activa",
                    overdue: "Vencida",
                    closed: "Cerrada",
                  }[s]
                }
              </option>
            ))}
          </Select>
        </div>
        <QueryState query={query}>
          <DataTable
            serverPaginated
            rows={query.data || []}
            columns={[
              { key: "name", label: "Campaña" },
              {
                key: "model",
                label: "Modelo",
                render: (c) => PRESETS[c.model]?.label || c.model,
              },
              {
                key: "dueOn",
                label: "Fecha límite",
                render: (c) => dateText(c.dueOn),
              },
              {
                key: "status",
                label: "Estado",
                render: (c) => <Status value={c.status} />,
              },
              { key: "submitted", label: "Recibidas" },
              { key: "pending", label: "Pendientes" },
              {
                key: "action",
                label: "",
                render: (c) => (
                  <ActionLink to={`campanas/${c.id}`}>Ver campaña</ActionLink>
                ),
              },
            ]}
          />
          <Pagination query={query} page={page} setPage={setPage} />
        </QueryState>
      </Panel>
    </>
  );
}
export function CampaignDetail({ id }) {
  const { api, perform, busy, navigate, actor } = useEvaluations(),
    query = useEvaluationQuery(`/campaigns/${id}`);
  const [action, setAction] = useState(""),
    [reason, setReason] = useState(""),
    [due, setDue] = useState("");
  const c = query.data,
    flags = c?.capabilities || {};
  async function execute() {
    const result = await perform(
      () =>
        api.mutate(
          "POST",
          `/campaigns/${id}/${action}`,
          action === "extend"
            ? { dueOn: due, reason }
            : action === "close"
            ? { reason }
            : {},
          {
            version: c.revision,
            idempotent: ["launch", "reminders"].includes(action),
          }
        ),
      "Operación completada"
    );
    if (result) {
      setAction("");
      setReason("");
      if (action === "duplicate") navigate(`campanas/${result.id}/editar`);
    }
  }
  return (
    <QueryState query={query}>
      {c && (
        <>
          <Heading
            title={c.name}
            description={`${dateText(c.periodStart)} — ${dateText(
              c.periodEnd
            )}`}
            back="campanas"
            actions={
              <>
                <Status value={c.status} />
                {flags.canEdit && (
                  <ActionLink to={`campanas/${id}/editar`}>Editar</ActionLink>
                )}
                {flags.canLaunch && (
                  <Button disabled={busy} onClick={() => setAction("launch")}>
                    Lanzar campaña
                  </Button>
                )}
                {flags.canDuplicate && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setAction("duplicate")}
                  >
                    Duplicar
                  </Button>
                )}
              </>
            }
          />
          <Metrics
            items={[
              {
                label: "Colaboradores",
                value: c.subjects?.length ?? c.subjectIds?.length ?? 0,
              },
              { label: "Recibidas", value: c.submitted ?? 0 },
              { label: "Pendientes", value: c.pending ?? 0 },
            ]}
          />
          <Panel title="Colaboradores">
            <DataTable
              rows={c.subjects || []}
              columns={[
                { key: "name", label: "Nombre" },
                {
                  key: "result",
                  label: "Resultado",
                  render: (s) =>
                    c.status !== "draft" && (
                      <ActionLink to={`resultados/${id}/${s.employeeId}`}>
                        Consultar
                      </ActionLink>
                    ),
                },
              ]}
            />
          </Panel>
          <Panel title="Asignaciones">
            <DataTable
              rows={Array.isArray(c.assignments) ? c.assignments : []}
              columns={[
                {
                  key: "subjectId",
                  label: "Colaborador",
                  render: (a) =>
                    c.subjects?.find(
                      (s) => String(s.employeeId) === String(a.subjectId)
                    )?.name || a.subjectId,
                },
                { key: "evaluatorName", label: "Evaluador" },
                {
                  key: "perspective",
                  label: "Perspectiva",
                  render: (a) => PERSPECTIVES[a.perspective] || a.perspective,
                },
                {
                  key: "status",
                  label: "Estado",
                  render: (a) => <Status value={a.status} />,
                },
                {
                  key: "open",
                  label: "",
                  render: (a) => (
                    <ActionLink to={`responder/${a.id}`}>Consultar</ActionLink>
                  ),
                },
              ]}
            />
          </Panel>
          <div className="ev-actions">
            {flags.canExtend && (
              <Button
                variant="outline"
                onClick={() => {
                  setDue(c.dueOn);
                  setAction("extend");
                }}
              >
                Ampliar plazo
              </Button>
            )}
            {flags.canClose && (
              <Button variant="outline" onClick={() => setAction("close")}>
                Cerrar campaña
              </Button>
            )}
            {actor.role === "hr" && c.status === "active" && (
              <Button variant="outline" onClick={() => setAction("reminders")}>
                Recordar pendientes
              </Button>
            )}
          </div>
          <Modal
            open={!!action}
            onOpenChange={() => setAction("")}
            title={
              {
                launch: "Lanzar campaña",
                close: "Cerrar campaña",
                extend: "Ampliar plazo",
                duplicate: "Duplicar campaña",
                reminders: "Recordar pendientes",
              }[action] || "Campaña"
            }
            description={
              action === "duplicate"
                ? "Se creará un borrador sin respuestas. Revisa participantes y fechas."
                : action === "reminders"
                ? "El servidor programará los avisos a los evaluadores pendientes."
                : "Confirma la operación sobre esta campaña."
            }
            footer={
              <Button
                disabled={
                  busy ||
                  (["extend", "close"].includes(action) && !reason.trim()) ||
                  (action === "extend" && !due)
                }
                onClick={execute}
              >
                Confirmar
              </Button>
            }
          >
            {action === "extend" && (
              <Field label="Nueva fecha límite">
                <Input
                  type="date"
                  min={c.dueOn}
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </Field>
            )}
            {["extend", "close"].includes(action) && (
              <Field label="Motivo">
                <Textarea
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
            )}
          </Modal>
        </>
      )}
    </QueryState>
  );
}
export function Assignments() {
  const [page, setPage] = useState(1),
    query = useEvaluationQuery("/my/assignments", { page, pageSize: 25 });
  return (
    <>
      <Heading
        title="Mis pendientes"
        description="Evaluaciones asignadas a tu cuenta."
      />
      <Panel>
        <QueryState query={query}>
          <DataTable
            serverPaginated
            rows={query.data || []}
            columns={[
              {
                key: "subjectName",
                label: "Colaborador",
                render: (a) => a.subjectName || a.subject?.name || a.name,
              },
              {
                key: "campaignName",
                label: "Campaña",
                render: (a) => a.campaignName || a.campaign?.name,
              },
              {
                key: "perspective",
                label: "Perspectiva",
                render: (a) => PERSPECTIVES[a.perspective],
              },
              {
                key: "dueOn",
                label: "Fecha límite",
                render: (a) => dateText(a.dueOn || a.campaign?.dueOn),
              },
              {
                key: "status",
                label: "Estado",
                render: (a) => <Status value={a.status} />,
              },
              {
                key: "action",
                label: "",
                render: (a) => (
                  <ActionLink to={`responder/${a.id}`}>
                    {a.status === "submitted" ? "Consultar" : "Responder"}
                  </ActionLink>
                ),
              },
            ]}
          />
          <Pagination query={query} page={page} setPage={setPage} />
        </QueryState>
      </Panel>
    </>
  );
}
export function Team() {
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    query = useEvaluationQuery("/team", { q, page, pageSize: 25 });
  return (
    <>
      <Heading
        title="Mi equipo"
        description="Avance de las evaluaciones de tu equipo."
      />
      <Panel>
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
        />
        <QueryState query={query}>
          <DataTable
            serverPaginated
            rows={(query.data || []).map((r) => ({
              ...r,
              id: r.id ?? `${r.campaignId}:${r.subjectId ?? r.employeeId}`,
            }))}
            columns={[
              {
                key: "name",
                label: "Colaborador",
                render: (r) => r.name || r.subjectName,
              },
              { key: "area", label: "Área" },
              { key: "position", label: "Puesto" },
              { key: "pending", label: "Pendientes" },
              { key: "submitted", label: "Completadas" },
              {
                key: "action",
                label: "",
                render: (r) =>
                  r.campaignId &&
                  (r.subjectId || r.employeeId) && (
                    <ActionLink
                      to={`resultados/${r.campaignId}/${
                        r.subjectId || r.employeeId
                      }`}
                    >
                      Ver resultado
                    </ActionLink>
                  ),
              },
            ]}
          />
          <Pagination query={query} page={page} setPage={setPage} />
        </QueryState>
      </Panel>
    </>
  );
}
