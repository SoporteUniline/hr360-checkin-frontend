"use client";
import { useState } from "react";
import { Download, Printer, Check, Plus } from "lucide-react";
import { useEvaluations } from "./EvaluationContext";
import { CampaignTable } from "./CampaignViews";
import { PlanList } from "./PlanViews";
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
  Metrics,
  Progress,
  DataTable,
  SearchInput,
  Segments,
  Empty,
  Notice,
  ScoreBar,
  Person,
  Modal,
  Confirm,
  downloadCsv,
} from "./ui";
import {
  PERSPECTIVES,
  copy,
  normalize,
  scoreText,
  dateText,
  average,
  personResult,
  canSeeResult,
  bandFor,
  csvText,
  scopeSubjects,
  campaignStatus,
  comparisonKey,
} from "@/lib/evaluaciones/model.mjs";
function allResults(state) {
  return state.campaigns
    .filter((c) => c.status !== "draft")
    .flatMap((c) =>
      c.subjectIds.map((id) => ({
        ...personResult(state, c, id),
        id: `${c.id}:${id}`,
        campaign: c,
        person: state.people.find((p) => p.id === id),
      })),
    );
}
function resultBand(state, c, score) {
  return bandFor(
    {
      bands:
        c.resultBands ||
        state.templates.find((t) => t.id === c.templateId)?.bands ||
        state.templates[0].bands,
    },
    score,
  );
}

function ResultBadge({ state, campaign, score }) {
  const band = resultBand(state, campaign, score);
  return <Badge tone={band.color}>{band.label}</Badge>;
}
export function Overview({ executive = false }) {
  const { state, actor } = useEvaluations(),
    [campaignId, setCampaignId] = useState(executive ? "camp-q3" : "all"),
    [area, setArea] = useState("all"),
    [position, setPosition] = useState("all"),
    [manager, setManager] = useState("all"),
    [search, setSearch] = useState(""),
    [campaignState, setCampaignState] = useState("all");
  if (!["hr", "direction"].includes(actor.role))
    return (
      <Empty
        title="Tablero disponible para RH y dirección"
        action={
          <ActionLink to="mis-pendientes">Ir a mis pendientes</ActionLink>
        }
      />
    );
  const campaigns = state.campaigns.filter(
      (c) =>
        (campaignId === "all" || c.id === campaignId) &&
        (campaignState === "all" || campaignStatus(c) === campaignState) &&
        normalize(c.name).includes(normalize(search)),
    ),
    ids = campaigns.map((c) => c.id),
    people = state.people.filter(
      (p) =>
        (area === "all" || p.area === area) &&
        (position === "all" || p.position === position) &&
        (manager === "all" || p.managerId === manager),
    ),
    peopleIds = people.map((p) => p.id),
    assignments = state.assignments.filter(
      (a) => ids.includes(a.campaignId) && peopleIds.includes(a.subjectId),
    ),
    done = assignments.filter((a) => a.status === "submitted").length,
    results = allResults(state).filter(
      (r) => ids.includes(r.campaignId) && peopleIds.includes(r.subjectId),
    ),
    complete = results.filter((r) => r.complete),
    global = average(complete.map((r) => r.score));
  const areas = [...new Set(people.map((p) => p.area))]
    .map((area) => {
      const rs = complete.filter((r) => r.person.area === area);
      return {
        id: area,
        name: area,
        score: average(rs.map((r) => r.score)),
        count: rs.length,
      };
    })
    .filter((a) => a.count)
    .sort((a, b) => b.score - a.score);
  const cats = new Map();
  for (const r of complete)
    for (const c of r.categories) {
      const key = c.id;
      const existing = cats.get(key) || { id: key, name: c.name, values: [] };
      existing.values.push(c.score);
      cats.set(key, existing);
    }
  const categories = [...cats.values()]
    .map((c) => ({ ...c, score: average(c.values) }))
    .sort((a, b) => b.score - a.score);
  const older = allResults(state).filter(
      (r) =>
        r.complete &&
        !ids.includes(r.campaignId) &&
        peopleIds.includes(r.subjectId) &&
        campaigns.length === 1 &&
        r.campaign.periodEnd < campaigns[0].periodStart &&
        r.campaign.model === campaigns[0].model &&
        comparisonKey(r.campaign) === comparisonKey(campaigns[0]),
    ),
    latestOlder = older.length
      ? [...new Set(older.map((r) => r.campaignId))].sort((a, b) =>
          state.campaigns
            .find((c) => c.id === b)
            .periodEnd.localeCompare(
              state.campaigns.find((c) => c.id === a).periodEnd,
            ),
        )[0]
      : null,
    comparable = complete.filter((r) =>
      older.some(
        (o) => o.campaignId === latestOlder && o.subjectId === r.subjectId,
      ),
    ),
    previous = older.filter(
      (r) =>
        r.campaignId === latestOlder &&
        comparable.some((c) => c.subjectId === r.subjectId),
    );
  const delta = comparable.length
    ? average(comparable.map((r) => r.score)) -
      average(previous.map((r) => r.score))
    : null;
  const filters = (
    <div className="ev-filters">
      <Select
        label="Campaña / periodo"
        value={campaignId}
        onChange={(e) => setCampaignId(e.target.value)}
      >
        <option value="all">Todas las campañas</option>
        {state.campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select
        label="Área de resultados"
        value={area}
        onChange={(e) => setArea(e.target.value)}
      >
        <option value="all">Todas las áreas</option>
        {[...new Set(state.people.map((p) => p.area))].map((a) => (
          <option key={a}>{a}</option>
        ))}
      </Select>
      {executive && (
        <>
          <Select
            label="Puesto de resultados"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          >
            <option value="all">Todos los puestos</option>
            {[...new Set(state.people.map((p) => p.position))].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
          <Select
            label="Jefe de resultados"
            value={manager}
            onChange={(e) => setManager(e.target.value)}
          >
            <option value="all">Todos los jefes</option>
            {state.people
              .filter((p) => state.people.some((x) => x.managerId === p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </>
      )}
    </div>
  );
  const exportResults = () =>
    downloadCsv(
      "adamia-resultados-demo.csv",
      csvText([
        [
          "Campaña",
          "Colaborador",
          "Área",
          "Resultado / 5",
          "Respuestas recibidas",
          "Respuestas asignadas",
        ],
        ...results.map((r) => [
          r.campaign.name,
          r.person.name,
          r.person.area,
          r.score ?? "",
          r.done,
          r.total,
        ]),
      ]),
    );
  return (
    <>
      <Heading
        title={executive ? "Tablero de desempeño" : "Evaluación de desempeño"}
        description={
          executive
            ? "Resultados, avances y prioridades para tomar decisiones."
            : "Acompaña el desarrollo de tu equipo, de la evaluación al seguimiento."
        }
        actions={
          <>
            {executive ? (
              <Button variant="outline" onClick={exportResults}>
                <Download size={14} /> Exportar resultados
              </Button>
            ) : (
              actor.role === "hr" && (
                <ActionLink to="campanas/nueva" primary>
                  <Plus size={15} /> Nueva evaluación
                </ActionLink>
              )
            )}
          </>
        }
      />
      <Panel className="mb-6">{filters}</Panel>
      <Metrics
        items={[
          {
            label: executive ? "Avance de respuestas" : "Campañas activas",
            value: executive
              ? `${assignments.length ? Math.round((done / assignments.length) * 100) : 0}%`
              : campaigns.filter((c) => campaignStatus(c) === "active").length,
            detail: executive
              ? `${done} de ${assignments.length} recibidas`
              : "Con filtros aplicados",
          },
          {
            label: "Evaluaciones pendientes",
            value: assignments.length - done,
            detail: "Incluye borradores",
          },
          {
            label: "Evaluaciones completadas",
            value: done,
            detail: "Respuestas enviadas",
            tone: "green",
          },
          {
            label: "Promedio general",
            value: scoreText(global),
            detail: `Sobre 5 · ${complete.length} resultados finales`,
            tone: "blue",
          },
        ]}
      />
      {!executive && (
        <div className="ev-stack">
          <Panel
            title="Campañas"
            actions={<ActionLink to="campanas">Ver todas</ActionLink>}
          >
            <div className="ev-filters">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar campaña…"
              />
              <Select
                label="Estado de campaña"
                value={campaignState}
                onChange={(e) => setCampaignState(e.target.value)}
              >
                {[
                  ["all", "Todos los estados"],
                  ["active", "Activas"],
                  ["draft", "Borradores"],
                  ["scheduled", "Programadas"],
                  ["overdue", "Vencidas"],
                  ["closed", "Cerradas"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <CampaignTable
              campaigns={campaigns.filter(
                (c) =>
                  area === "all" ||
                  c.subjectIds.some((id) => peopleIds.includes(id)),
              )}
            />
          </Panel>
          <div className="ev-grid">
            <Panel title="Resultados por área">
              <div className="ev-pad">
                {areas.length ? (
                  areas.map((a) => (
                    <ScoreBar
                      key={a.id}
                      label={`${a.name} · ${a.count} resultados`}
                      score={a.score}
                    />
                  ))
                ) : (
                  <Empty description="Aún no hay resultados completos en estos filtros." />
                )}
              </div>
            </Panel>
            <Panel title="Lo que sigue">
              <div className="ev-pad ev-stack">
                <div>
                  <h3>
                    {assignments.length - done} evaluaciones por completar
                  </h3>
                  <p>Consulta las asignaciones para identificar pendientes.</p>
                </div>
                <ActionLink to="campanas">Revisar campañas</ActionLink>
                <div>
                  <h3>
                    {complete.filter((r) => !r.publication?.publishedAt).length}{" "}
                    resultados por publicar
                  </h3>
                  <p>Revísalos y acuerda acciones de desarrollo.</p>
                </div>
                <ActionLink to="resultados">Revisar resultados</ActionLink>
              </div>
            </Panel>
          </div>
        </div>
      )}
      {executive && (
        <div className="ev-stack">
          <Notice>
            El promedio usa únicamente resultados finales y da el mismo peso a
            cada persona por campaña. Los resultados incompletos no se
            convierten en cero.{" "}
            {campaignId === "all"
              ? "Una persona puede aparecer en varios periodos; selecciona una campaña para comparar equipos."
              : ""}
          </Notice>
          <div className="ev-grid">
            <Panel
              title="Ranking de áreas"
              description="Compara junto con el número de resultados disponibles."
            >
              <div className="ev-pad">
                {areas.length ? (
                  areas.map((a, i) => (
                    <ScoreBar
                      key={a.id}
                      label={`${i + 1}. ${a.name} · n=${a.count}`}
                      score={a.score}
                    />
                  ))
                ) : (
                  <Empty />
                )}
              </div>
            </Panel>
            <Panel
              title="Distribución de desempeño"
              description="Semáforo ejecutivo común: <3, 3–3.99 y ≥4."
            >
              <div className="ev-pad ev-stack">
                {[
                  {
                    name: "Buen desempeño",
                    tone: "green",
                    test: (r) => r.score >= 4,
                  },
                  {
                    name: "En progreso",
                    tone: "amber",
                    test: (r) => r.score >= 3 && r.score < 4,
                  },
                  {
                    name: "Requiere seguimiento",
                    tone: "red",
                    test: (r) => r.score < 3,
                  },
                ].map((b) => {
                  const n = complete.filter(b.test).length;
                  return (
                    <div key={b.name}>
                      <div className="ev-category-row">
                        <Badge tone={b.tone}>{b.name}</Badge>
                        <strong>
                          {n}{" "}
                          <small>
                            (
                            {complete.length
                              ? Math.round((n / complete.length) * 100)
                              : 0}
                            %)
                          </small>
                        </strong>
                      </div>
                      <Progress
                        value={
                          complete.length ? (n / complete.length) * 100 : 0
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
          <div className="ev-grid">
            <Panel
              title="Competencias del equipo"
              description="Solo se agrupan categorías con la misma identidad."
            >
              <div className="ev-pad">
                {categories.length ? (
                  categories.map((c) => (
                    <ScoreBar label={c.name} score={c.score} key={c.id} />
                  ))
                ) : (
                  <Empty />
                )}
              </div>
            </Panel>
            <Panel title="Comparativo con el periodo anterior">
              <div className="ev-pad ev-stack">
                <div className="ev-large-score">
                  {delta === null
                    ? "—"
                    : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`}{" "}
                  <small>puntos</small>
                </div>
                <p>
                  {delta === null
                    ? "Selecciona una campaña con resultados comparables en el periodo anterior."
                    : `Mismas ${comparable.length} personas, modelo y plantilla. Frente a ${state.campaigns.find((c) => c.id === latestOlder)?.name}.`}
                </p>
                {categories.length > 0 && (
                  <>
                    <Notice tone="green">
                      Fortaleza del grupo: <strong>{categories[0].name}</strong>{" "}
                      · {scoreText(categories[0].score)}
                    </Notice>
                    <Notice tone="amber">
                      Prioridad de desarrollo:{" "}
                      <strong>{categories.at(-1).name}</strong> ·{" "}
                      {scoreText(categories.at(-1).score)}
                    </Notice>
                  </>
                )}
              </div>
            </Panel>
          </div>
          <div className="ev-grid">
            {[
              { title: "Colaboradores destacados", test: (r) => r.score >= 4 },
              {
                title: "Colaboradores que requieren seguimiento",
                test: (r) => r.score < 3,
              },
            ].map((group) => (
              <Panel title={group.title} key={group.title}>
                <DataTable
                  rows={complete
                    .filter(group.test)
                    .sort((a, b) =>
                      group.title.includes("destacados")
                        ? b.score - a.score
                        : a.score - b.score,
                    )}
                  pageSize={5}
                  columns={[
                    {
                      key: "person",
                      label: "Colaborador",
                      render: (r) => <Person person={r.person} />,
                    },
                    {
                      key: "score",
                      label: "Resultado",
                      render: (r) => scoreText(r.score),
                    },
                    {
                      key: "action",
                      label: "",
                      render: (r) => (
                        <ActionLink
                          to={`resultados/${r.campaignId}/${r.subjectId}`}
                        >
                          Ver
                        </ActionLink>
                      ),
                    },
                  ]}
                />
              </Panel>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
export function Results({ personal = false }) {
  const { state, actor } = useEvaluations(),
    [search, setSearch] = useState(""),
    [campaignId, setCampaignId] = useState("all"),
    [visibility, setVisibility] = useState("all");
  const rows = allResults(state).filter(
    (r) =>
      (!personal || r.subjectId === actor.id) &&
      canSeeResult(state, actor.role, actor.id, r.campaign, r.subjectId) &&
      (campaignId === "all" || r.campaignId === campaignId) &&
      normalize(
        `${r.person.name} ${r.campaign.name} ${r.person.area}`,
      ).includes(normalize(search)) &&
      (visibility === "all" ||
        (visibility === "published" && r.publication?.publishedAt) ||
        (visibility === "review" && !r.publication?.publishedAt)),
  );
  return (
    <>
      <Heading
        title={
          personal ? "Mis evaluaciones recibidas" : "Resultados e historial"
        }
        description={
          personal
            ? "Consulta los resultados que RH ha compartido contigo y tus compromisos de desarrollo."
            : "Consulta cada evaluación, revisa su resultado y controla su publicación."
        }
      />
      <Panel>
        {!personal && (
          <Segments
            value={visibility}
            onChange={setVisibility}
            items={[
              { value: "all", label: "Todos" },
              { value: "review", label: "Por revisar / publicar" },
              { value: "published", label: "Publicados" },
            ]}
          />
        )}
        <div className="ev-filters">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              personal
                ? "Buscar campaña…"
                : "Buscar colaborador, campaña o área…"
            }
          />
          <Select
            label="Campaña de resultados"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="all">Todas las campañas</option>
            {state.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <DataTable
          rows={rows}
          empty="No hay evaluaciones visibles para este perfil y estos filtros."
          columns={[
            ...(!personal
              ? [
                  {
                    key: "person",
                    label: "Colaborador",
                    render: (r) => <Person person={r.person} />,
                  },
                ]
              : []),
            {
              key: "campaign",
              label: "Evaluación",
              render: (r) => (
                <>
                  <strong>{r.campaign.name}</strong>
                  <small>
                    {dateText(r.campaign.periodStart)} —{" "}
                    {dateText(r.campaign.periodEnd)}
                  </small>
                </>
              ),
            },
            {
              key: "score",
              label: "Resultado",
              render: (r) =>
                r.subjectId === actor.id &&
                !["hr", "direction"].includes(actor.role) &&
                !r.campaign.settings.employeeScore ? (
                  <Badge>Acceso limitado por RH</Badge>
                ) : (
                  <>
                    <strong>{scoreText(r.score)} / 5</strong>
                    <small>
                      <ResultBadge
                        state={state}
                        campaign={r.campaign}
                        score={r.score}
                      />
                    </small>
                  </>
                ),
            },
            {
              key: "publication",
              label: "Publicación",
              render: (r) => (
                <Badge
                  tone={
                    r.publication?.publishedAt
                      ? "green"
                      : r.complete
                        ? "blue"
                        : "amber"
                  }
                >
                  {r.publication?.publishedAt
                    ? "Publicado"
                    : r.complete
                      ? "Listo para revisión"
                      : "En proceso"}
                </Badge>
              ),
            },
            {
              key: "action",
              label: "",
              render: (r) => (
                <ActionLink to={`resultados/${r.campaignId}/${r.subjectId}`}>
                  Ver evaluación
                </ActionLink>
              ),
            },
          ]}
        />
      </Panel>
    </>
  );
}
export function ResultDetail({ campaignId, subjectId }) {
  const { state, actor, run } = useEvaluations(),
    campaign = state.campaigns.find((c) => c.id === campaignId),
    person = state.people.find((p) => p.id === subjectId),
    [tab, setTab] = useState("summary"),
    [receipt, setReceipt] = useState(false),
    [name, setName] = useState(""),
    [accepted, setAccepted] = useState(false),
    [observations, setObservations] = useState(""),
    [action, setAction] = useState(null);
  if (
    !campaign ||
    !person ||
    !campaign.subjectIds.includes(subjectId) ||
    !canSeeResult(state, actor.role, actor.id, campaign, subjectId)
  )
    return (
      <Empty
        title="Resultado aún no disponible"
        description="RH debe publicar el resultado y habilitar el acceso para tu perfil."
        action={<ActionLink to="mis-evaluaciones">Mis evaluaciones</ActionLink>}
      />
    );
  const live = personResult(state, campaign, subjectId),
    result = live.publication?.resultSnapshot
      ? { ...live.publication.resultSnapshot, publication: live.publication }
      : live,
    isOwn = subjectId === actor.id,
    limited = isOwn && !["hr", "direction"].includes(actor.role),
    scoreVisible = !limited || campaign.settings.employeeScore,
    categoriesVisible = !limited || campaign.settings.employeeCategories,
    commentsVisible = !limited || campaign.settings.employeeComments,
    planVisible = !limited || campaign.settings.employeePlan,
    hr = actor.role === "hr",
    signed = state.receipts.find(
      (r) =>
        r.publicationId === result.publication?.id && r.actorId === subjectId,
    ),
    history = allResults(state)
      .filter(
        (r) =>
          r.subjectId === subjectId &&
          r.campaignId !== campaignId &&
          canSeeResult(state, actor.role, actor.id, r.campaign, subjectId),
      )
      .sort((a, b) => b.campaign.periodEnd.localeCompare(a.campaign.periodEnd));
  const cats = [...result.categories].sort((a, b) => b.score - a.score),
    comments = result.groups.flatMap((g) =>
      g.comments.map((text, i) => ({
        id: `${g.key}:${i}`,
        perspective: g.key,
        text,
      })),
    ),
    privateNotes = hr
      ? state.assignments
          .filter(
            (a) =>
              a.campaignId === campaignId &&
              a.subjectId === subjectId &&
              a.status === "submitted" &&
              a.privateNote,
          )
          .filter(
            (a) =>
              !result.groups.find((g) => g.key === a.perspective)?.privateGroup,
          )
      : [];
  const exportResult = () => {
    const rows = [
      ["ADAMIA · Resultado de demostración"],
      ["Colaborador", person.name],
      ["Campaña", campaign.name],
      ["Estado", result.publication?.publishedAt ? "Publicado" : "En revisión"],
    ];
    if (scoreVisible)
      rows.push(["Promedio final", result.score ?? "Incompleto"]);
    if (categoriesVisible) {
      rows.push(["Categoría", "Promedio / 5"]);
      result.categories.forEach((c) => rows.push([c.name, c.score]));
    }
    if (commentsVisible) {
      rows.push(["Perspectiva", "Comentario"]);
      comments.forEach((c) => rows.push([PERSPECTIVES[c.perspective], c.text]));
    }
    downloadCsv(`evaluacion-${subjectId}-demo.csv`, csvText(rows));
  };
  return (
    <>
      <Heading
        title="Resultado de evaluación"
        description={campaign.name}
        back={isOwn ? "mis-evaluaciones" : "resultados"}
        actions={
          <>
            <Button variant="outline" onClick={exportResult}>
              <Download size={14} /> CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={14} /> Imprimir / PDF
            </Button>
          </>
        }
      />
      <div className="ev-stack">
        <Panel>
          <div className="ev-pad ev-result-hero">
            <div className="ev-stack">
              <Person person={person} />
              <p>
                {dateText(campaign.periodStart)} —{" "}
                {dateText(campaign.periodEnd)}
              </p>
              <div className="ev-chip-list">
                <Badge
                  tone={result.publication?.publishedAt ? "green" : "amber"}
                >
                  {result.publication?.publishedAt
                    ? "Resultado publicado"
                    : "En revisión de RH"}
                </Badge>
                <Badge>
                  {result.done}/{result.total} respuestas
                </Badge>
              </div>
            </div>
            {scoreVisible ? (
              <div>
                <div className="ev-large-score">
                  {scoreText(result.score)} <small>/ 5</small>
                </div>
                <ResultBadge
                  state={state}
                  campaign={campaign}
                  score={result.score}
                />
              </div>
            ) : (
              <Notice>RH ha compartido una vista sin calificación.</Notice>
            )}
          </div>
        </Panel>
        {!result.complete && (
          <Notice tone="amber">
            Aún faltan respuestas o una perspectiva no reúne el mínimo. Los
            avances son parciales; no se calcula un resultado final ni se
            permite publicarlo.
          </Notice>
        )}
        {hr && !result.publication?.publishedAt && (
          <div className="ev-actions">
            <Button
              variant="outline"
              disabled={!result.complete || !!result.publication?.approvedAt}
              onClick={() => setAction("approve")}
            >
              {result.publication?.approvedAt
                ? "Revisión aprobada"
                : "Aprobar resultado"}
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={
                !result.complete ||
                (campaign.settings.requireApproval &&
                  !result.publication?.approvedAt)
              }
              onClick={() => setAction("publish")}
            >
              Publicar para el colaborador
            </Button>
          </div>
        )}
        <Segments
          value={tab}
          onChange={setTab}
          items={[
            { value: "summary", label: "Resumen" },
            ...(scoreVisible || categoriesVisible
              ? [{ value: "perspectives", label: "Perspectivas" }]
              : []),
            ...(planVisible
              ? [{ value: "plan", label: "Plan de seguimiento" }]
              : []),
            { value: "history", label: "Historial" },
          ]}
        />
        {tab === "summary" && (
          <>
            <div className="ev-grid">
              {categoriesVisible && (
                <Panel title="Desempeño por categoría">
                  <div className="ev-pad">
                    {result.categories.length ? (
                      result.categories.map((c) => (
                        <ScoreBar key={c.id} label={c.name} score={c.score} />
                      ))
                    ) : (
                      <Empty description="Aún no hay categorías disponibles." />
                    )}
                  </div>
                </Panel>
              )}
              <div className="ev-stack">
                {categoriesVisible && cats.length > 0 && (
                  <>
                    <Panel
                      title="Fortalezas observadas"
                      description="Categorías con mayor promedio; son referencias para la conversación."
                    >
                      <div className="ev-pad ev-stack">
                        {cats.slice(0, 2).map((c) => (
                          <ScoreBar key={c.id} label={c.name} score={c.score} />
                        ))}
                      </div>
                    </Panel>
                    <Panel
                      title="Prioridades de desarrollo"
                      description="Categorías con menor promedio dentro de esta evaluación."
                    >
                      <div className="ev-pad ev-stack">
                        {cats
                          .slice(-2)
                          .reverse()
                          .map((c) => (
                            <ScoreBar
                              key={c.id}
                              label={c.name}
                              score={c.score}
                            />
                          ))}
                      </div>
                    </Panel>
                  </>
                )}
                {commentsVisible && (
                  <Panel title="Comentarios de los evaluadores">
                    <div className="ev-pad ev-stack">
                      {comments.length ? (
                        comments.map((c) => (
                          <div key={c.id}>
                            <Badge>{PERSPECTIVES[c.perspective]}</Badge>
                            <p className="mt-2">{c.text}</p>
                          </div>
                        ))
                      ) : (
                        <p>Sin comentarios disponibles.</p>
                      )}
                    </div>
                  </Panel>
                )}
              </div>
            </div>
            {commentsVisible && (
              <Panel title="Comentarios por categoría">
                <div className="ev-pad ev-stack">
                  {result.groups.flatMap((g) =>
                    g.privateGroup
                      ? []
                      : state.assignments
                          .filter(
                            (a) =>
                              a.campaignId === campaignId &&
                              a.subjectId === subjectId &&
                              a.perspective === g.key &&
                              a.status === "submitted",
                          )
                          .flatMap((a) =>
                            Object.entries(a.categoryComments)
                              .filter(([, text]) => text.trim())
                              .map(([id, text]) => (
                                <div key={`${a.id}:${id}`}>
                                  <Badge>
                                    {PERSPECTIVES[g.key]} ·{" "}
                                    {
                                      a.template.categories.find(
                                        (c) => c.id === id,
                                      )?.name
                                    }
                                  </Badge>
                                  <p>{text}</p>
                                </div>
                              )),
                          ),
                  )}
                  <small>
                    Solo se muestran comentarios de perspectivas que cumplen la
                    regla de confidencialidad.
                  </small>
                </div>
              </Panel>
            )}
            {hr && privateNotes.length > 0 && (
              <Panel title="Notas privadas · Solo RH">
                <div className="ev-pad ev-stack">
                  {privateNotes.map((a) => (
                    <div key={a.id}>
                      <Badge>{PERSPECTIVES[a.perspective]}</Badge>
                      <p>{a.privateNote}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </>
        )}
        {tab === "perspectives" && (scoreVisible || categoriesVisible) && (
          <div className="ev-stack">
            <Notice>
              Se promedian primero las respuestas de cada perspectiva. Después
              se aplica su peso. Las categorías que no aparecen en todas las
              plantillas se comparan solo entre las perspectivas donde existen.
            </Notice>
            <Panel>
              <DataTable
                rows={result.groups.map((g) => ({ ...g, id: g.key }))}
                columns={[
                  {
                    key: "key",
                    label: "Perspectiva",
                    render: (g) => PERSPECTIVES[g.key],
                  },
                  {
                    key: "weight",
                    label: "Peso",
                    render: (g) => `${g.weight}%`,
                  },
                  {
                    key: "done",
                    label: "Respuestas",
                    render: (g) => `${g.done}/${g.total}`,
                  },
                  ...(scoreVisible
                    ? [
                        {
                          key: "score",
                          label: "Promedio",
                          render: (g) =>
                            g.privateGroup ? (
                              <Badge tone="amber">Mínimo no alcanzado</Badge>
                            ) : (
                              <>
                                {scoreText(g.score)} / 5
                                {g.done < g.total && <small>Parcial</small>}
                              </>
                            ),
                        },
                      ]
                    : []),
                ]}
              />
            </Panel>
          </div>
        )}
        {tab === "plan" && planVisible && (
          <PlanList campaignId={campaignId} subjectId={subjectId} embedded />
        )}
        {tab === "history" && (
          <Panel
            title="Historial personal"
            description="Cada campaña conserva su modelo, plantilla y reglas de acceso."
          >
            <DataTable
              rows={history}
              columns={[
                {
                  key: "campaign",
                  label: "Campaña",
                  render: (r) => (
                    <>
                      {r.campaign.name}
                      <small>{dateText(r.campaign.periodEnd)}</small>
                    </>
                  ),
                },
                {
                  key: "score",
                  label: "Resultado",
                  render: (r) =>
                    limited && !r.campaign.settings.employeeScore
                      ? "Restringido"
                      : scoreText(r.score),
                },
                {
                  key: "model",
                  label: "Modelo",
                  render: (r) => r.campaign.model,
                },
                {
                  key: "action",
                  label: "",
                  render: (r) => (
                    <ActionLink to={`resultados/${r.campaignId}/${subjectId}`}>
                      Consultar
                    </ActionLink>
                  ),
                },
              ]}
            />
          </Panel>
        )}
        {isOwn &&
          result.publication?.publishedAt &&
          campaign.settings.requireReceipt && (
            <Panel title="Confirmación de recibido">
              <div className="ev-pad ev-stack">
                {signed ? (
                  <Notice tone="green">
                    Recepción registrada el {dateText(signed.signedAt)} por{" "}
                    {signed.name}.{" "}
                    {signed.observations &&
                      `Observaciones: ${signed.observations}`}
                  </Notice>
                ) : (
                  <>
                    <p>
                      Confirma que recibiste esta evaluación. Puedes dejar
                      observaciones; recibirla no implica estar de acuerdo con
                      su contenido.
                    </p>
                    <div>
                      <Button onClick={() => setReceipt(true)}>
                        Confirmar recibido
                      </Button>
                    </div>
                  </>
                )}
                <small>
                  Demostración local. La evidencia de identidad y la firma
                  digital definitiva se conectarán con el backend.
                </small>
              </div>
            </Panel>
          )}
      </div>
      <Confirm
        open={!!action}
        onOpenChange={() => setAction(null)}
        title={
          action === "approve" ? "Aprobar resultado" : "Publicar resultado"
        }
        description={
          action === "approve"
            ? "Se registrará la revisión de RH. El colaborador lo verá cuando se publique."
            : "Se compartirá una versión del resultado conforme a los permisos de esta campaña."
        }
        action={action === "approve" ? "Aprobar" : "Publicar"}
        onConfirm={() => {
          if (
            run(
              { type: `result.${action}`, campaignId, subjectId },
              action === "approve"
                ? "Resultado aprobado"
                : "Resultado publicado",
            )
          )
            setAction(null);
        }}
      />
      <Modal
        open={receipt}
        onOpenChange={setReceipt}
        title="Confirmar recepción de evaluación"
        description="Esta confirmación se guarda únicamente en la demostración."
        footer={
          <Button
            disabled={!accepted || !name.trim()}
            onClick={() => {
              if (
                run(
                  {
                    type: "receipt.sign",
                    campaignId,
                    name,
                    observations,
                    accepted,
                  },
                  "Recepción registrada en la demostración",
                )
              )
                setReceipt(false);
            }}
          >
            Confirmar recibido
          </Button>
        }
      >
        <div className="ev-stack">
          <Field label="Nombre completo">
            <Input
              label="Nombre para confirmar recibido"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={160}
            />
          </Field>
          <Field label="Observaciones o desacuerdo (opcional)">
            <Textarea
              label="Observaciones de recepción"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </Field>
          <Toggle
            label="Confirmo que recibí esta evaluación"
            hint="No implica conformidad con la calificación."
            checked={accepted}
            onChange={setAccepted}
          />
        </div>
      </Modal>
    </>
  );
}
