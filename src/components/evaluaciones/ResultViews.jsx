"use client";
import { useState } from "react";
import { useEvaluations, useEvaluationQuery } from "./EvaluationContext";
import {
  Heading,
  Panel,
  Field,
  Input,
  Select,
  Textarea,
  Toggle,
  Button,
  ActionLink,
  Badge,
  DataTable,
  Notice,
  ScoreBar,
  Modal,
} from "./ui";
import { QueryState, Pagination, ExportButton } from "./ApiViews";
import { PlanList } from "./PlanViews";
import {
  PERSPECTIVES,
  dateText,
  scoreText,
} from "@/lib/evaluaciones/model.mjs";
const receiptText =
  "Confirmo que recibí este resultado. Recibir no significa que acepto la calificación.";
function Score({ value }) {
  return value == null ? (
    <Badge>Sin calificación disponible</Badge>
  ) : (
    <strong>{scoreText(value)} / 5</strong>
  );
}
export function Results({ personal = false }) {
  const [page, setPage] = useState(1),
    query = useEvaluationQuery(personal ? "/my/results" : "/results", {
      page,
      pageSize: 25,
    });
  const rows = (query.data || []).map((r) => ({
    ...r,
    id: `${r.campaignId}:${r.subjectId ?? r.employeeId}`,
  }));
  return (
    <>
      <Heading
        title={
          personal ? "Mis evaluaciones recibidas" : "Resultados e historial"
        }
        description="Consulta los resultados y su publicación."
        actions={!personal && <ExportButton />}
      />
      <Panel>
        <QueryState query={query}>
          <DataTable
            serverPaginated
            rows={rows}
            columns={[
              ...(!personal
                ? [
                    {
                      key: "subjectName",
                      label: "Colaborador",
                      render: (r) => r.subjectName || r.person?.name || r.name,
                    },
                  ]
                : []),
              {
                key: "campaignName",
                label: "Campaña",
                render: (r) => r.campaignName || r.campaign?.name,
              },
              {
                key: "score",
                label: "Resultado",
                render: (r) =>
                  Object.hasOwn(r, "score") ? (
                    <Score value={r.score} />
                  ) : (
                    <Badge>Acceso limitado</Badge>
                  ),
              },
              {
                key: "publication",
                label: "Publicación",
                render: (r) => (
                  <Badge>
                    {r.publication?.publishedAt || r.publishedAt
                      ? "Publicado"
                      : "En revisión"}
                  </Badge>
                ),
              },
              {
                key: "action",
                label: "",
                render: (r) => (
                  <ActionLink
                    to={`resultados/${r.campaignId}/${
                      r.subjectId ?? r.employeeId
                    }`}
                  >
                    Ver evaluación
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
export function ResultDetail({ campaignId, subjectId }) {
  const { actor, api, perform, busy, capabilities } = useEvaluations();
  const path = `/campaigns/${campaignId}/results/${subjectId}`,
    query = useEvaluationQuery(path);
  const history = useEvaluationQuery(`/people/${subjectId}/history`);
  const [action, setAction] = useState(""),
    [typedName, setTypedName] = useState(""),
    [accepted, setAccepted] = useState(false),
    [observations, setObservations] = useState("");
  const r = query.data,
    own = String(subjectId) === actor.id;
  async function execute() {
    const done = await perform(
      () =>
        api.mutate(
          "POST",
          `${path}/${action}`,
          action === "receipt" ? { typedName, accepted, observations } : {},
          { idempotent: action === "publish" }
        ),
      action === "receipt" ? "Recepción registrada" : "Resultado actualizado"
    );
    if (done) setAction("");
  }
  return (
    <QueryState query={query}>
      {r && (
        <>
          <Heading
            title="Resultado de evaluación"
            description={r.campaignName || r.campaign?.name}
            back={own ? "mis-evaluaciones" : "resultados"}
            actions={
              !own &&
              capabilities.scopes.includes("results") && (
                <ExportButton
                  filters={{
                    campaignId: Number(campaignId),
                    subjectId: Number(subjectId),
                  }}
                />
              )
            }
          />
          <div className="ev-stack">
            <Panel title={r.subjectName || r.person?.name || "Evaluación"}>
              <div className="ev-pad ev-stack">
                {Object.hasOwn(r, "score") && <Score value={r.score} />}
                {r.band && <Badge tone={r.band.color}>{r.band.label}</Badge>}
                <Badge>
                  {r.publication?.publishedAt || r.publishedAt
                    ? "Publicado"
                    : "En revisión"}
                </Badge>
                <div className="ev-actions">
                  {capabilities.flags?.canPublishResults &&
                    !r.publication?.publishedAt &&
                    !r.publishedAt && (
                      <>
                        <Button
                          disabled={
                            busy || r.capabilities?.canApprove === false
                          }
                          variant="outline"
                          onClick={() => setAction("approve")}
                        >
                          Aprobar
                        </Button>
                        <Button
                          disabled={
                            busy || r.capabilities?.canPublish === false
                          }
                          onClick={() => setAction("publish")}
                        >
                          Publicar
                        </Button>
                      </>
                    )}
                </div>
              </div>
            </Panel>
            {Array.isArray(r.categories) && (
              <Panel title="Resultados por categoría">
                <div className="ev-pad ev-stack">
                  {r.categories.map((c, i) => (
                    <ScoreBar
                      key={c.id ?? i}
                      label={c.name}
                      score={c.score ?? null}
                    />
                  ))}
                </div>
              </Panel>
            )}
            {Array.isArray(r.groups) && (
              <Panel title="Perspectivas">
                <div className="ev-pad ev-stack">
                  {r.groups.map((g) => (
                    <div key={g.key}>
                      <h3>{PERSPECTIVES[g.key] || g.key}</h3>
                      {Object.hasOwn(g, "score") && <Score value={g.score} />}
                      {g.privateGroup && (
                        <Notice>
                          Grupo protegido por el mínimo de respuestas.
                        </Notice>
                      )}
                      {g.comments?.map((c, i) => (
                        <p key={i}>{typeof c === "string" ? c : c.text}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </Panel>
            )}
            {Array.isArray(r.comments) && (
              <Panel title="Comentarios">
                <div className="ev-pad">
                  {r.comments.map((c, i) => (
                    <p key={i}>{typeof c === "string" ? c : c.text}</p>
                  ))}
                </div>
              </Panel>
            )}
            {capabilities.scopes.includes("plans") && (
              <PlanList
                embedded
                campaignId={campaignId}
                subjectId={subjectId}
              />
            )}
            {own && (r.publication?.publishedAt || r.publishedAt) && (
              <Panel title="Confirmación de recibido">
                <div className="ev-pad ev-stack">
                  <p>{receiptText}</p>
                  {r.receipt ? (
                    <Notice tone="green">
                      Recepción registrada:{" "}
                      {r.receipt.typedName || r.receipt.name} ·{" "}
                      {dateText(r.receipt.signedAt)}
                    </Notice>
                  ) : (
                    <Button onClick={() => setAction("receipt")}>
                      Confirmar recibido
                    </Button>
                  )}
                </div>
              </Panel>
            )}
            <Panel title="Historial publicado">
              <QueryState query={history}>
                <DataTable
                  rows={(history.data || []).map((h, i) => ({
                    ...h,
                    id: h.id ?? i,
                  }))}
                  columns={[
                    { key: "campaignName", label: "Campaña" },
                    {
                      key: "score",
                      label: "Resultado",
                      render: (h) =>
                        Object.hasOwn(h, "score") && <Score value={h.score} />,
                    },
                    {
                      key: "action",
                      label: "",
                      render: (h) =>
                        h.campaignId && (
                          <ActionLink
                            to={`resultados/${h.campaignId}/${subjectId}`}
                          >
                            Consultar
                          </ActionLink>
                        ),
                    },
                  ]}
                />
              </QueryState>
            </Panel>
          </div>
          <Modal
            open={!!action}
            onOpenChange={() => setAction("")}
            title={
              {
                approve: "Aprobar resultado",
                publish: "Publicar resultado",
                receipt: "Confirmar recepción",
              }[action] || "Resultado"
            }
            description={
              action === "receipt"
                ? receiptText
                : "Se guardará la operación en el servidor."
            }
            footer={
              <Button
                disabled={
                  busy ||
                  (action === "receipt" && (!accepted || !typedName.trim()))
                }
                onClick={execute}
              >
                Confirmar
              </Button>
            }
          >
            {action === "receipt" && (
              <>
                <Field label="Nombre completo">
                  <Input
                    value={typedName}
                    maxLength={160}
                    onChange={(e) => setTypedName(e.target.value)}
                  />
                </Field>
                <Field label="Observaciones (opcional)">
                  <Textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                  />
                </Field>
                <Toggle
                  label={receiptText}
                  checked={accepted}
                  onChange={setAccepted}
                />
              </>
            )}
          </Modal>
        </>
      )}
    </QueryState>
  );
}
const metricLabels = {
  total: "Total",
  campaigns: "Campañas",
  activeCampaigns: "Campañas activas",
  subjects: "Colaboradores",
  assignments: "Evaluaciones",
  submitted: "Completadas",
  pending: "Pendientes",
  published: "Publicados",
  average: "Promedio",
  score: "Calificación",
  completion: "Avance",
  completionRate: "Avance",
  count: "Cantidad",
  low: "Menos de 3",
  medium: "De 3 a 3.99",
  high: "4 o más",
  areas: "Áreas",
  categories: "Categorías",
  distribution: "Distribución",
  bands: "Semáforo",
  metrics: "Indicadores",
  summary: "Resumen",
  totals: "Totales",
  results: "Resultados",
  name: "Nombre",
  label: "Indicador",
  below3: "Menos de 3",
  between3And4: "De 3 a 3.99",
  above4: "4 o más",
  denominator: "Resultados considerados",
  completed: "Completadas",
  trafficLight: "Semáforo ejecutivo",
  competencies: "Competencias",
  comparison: "Comparación",
  progress: "Avance",
  evaluated: "Evaluados",
  n: "Resultados considerados",
};
function DashboardValues({ value }) {
  if (value == null) return null;
  if (Array.isArray(value))
    return (
      <div className="ev-stack">
        {value.map((v, i) => (
          <DashboardValues key={i} value={v} />
        ))}
      </div>
    );
  if (typeof value !== "object")
    return (
      <strong>
        {typeof value === "number"
          ? new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(
              value
            )
          : String(value)}
      </strong>
    );
  return (
    <div className="ev-grid">
      {Object.entries(value)
        .filter(([k]) => !/id$|timezone|capabilities/i.test(k))
        .map(([k, v]) => (
          <div className="ev-pad" key={k}>
            <span>
              {metricLabels[k] || k.replace(/([a-z])([A-Z])/g, "$1 $2")}
            </span>
            <DashboardValues value={v} />
          </div>
        ))}
    </div>
  );
}
export function Overview({ executive = false }) {
  const [campaignId, setCampaignId] = useState("");
  const query = useEvaluationQuery(
    "/dashboard",
    campaignId ? { campaignId } : {}
  );
  const campaigns = useEvaluationQuery("/campaigns", {
    page: 1,
    pageSize: 100,
  });
  return (
    <>
      <Heading
        title={executive ? "Tablero de desempeño" : "Resumen de evaluaciones"}
        description="Indicadores calculados por el servidor."
      />
      <Panel>
        <div className="ev-filters">
          <Select
            label="Campaña"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="">Todas las campañas</option>
            {(campaigns.data || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <ExportButton
            filters={campaignId ? { campaignId: Number(campaignId) } : {}}
          />
        </div>
        <QueryState query={query}>
          <DashboardValues value={query.data} />
        </QueryState>
      </Panel>
    </>
  );
}
