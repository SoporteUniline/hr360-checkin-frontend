"use client";
import { useState } from "react";
import { useEvaluations } from "./EvaluationContext";
import {
  Heading,
  Panel,
  Person,
  Select,
  Status,
  Badge,
  ActionLink,
  DataTable,
  SearchInput,
  Segments,
  Empty,
  Progress,
  Metrics,
} from "./ui";
import {
  PERSPECTIVES,
  progress,
  normalize,
  dateText,
  personResult,
  canSeeResult,
  scoreText,
  campaignStatus,
  scopeSubjects,
} from "@/lib/evaluaciones/model.mjs";
export function Assignments() {
  const { state, actor } = useEvaluations(),
    [tab, setTab] = useState("open"),
    [search, setSearch] = useState(""),
    [area, setArea] = useState("all");
  const all = state.assignments.filter(
      (a) =>
        a.evaluatorId === actor.id &&
        state.campaigns.some(
          (c) => c.id === a.campaignId && c.status !== "draft",
        ),
    ),
    rows = all.filter((a) => {
      const p = state.people.find((p) => p.id === a.subjectId),
        c = state.campaigns.find((c) => c.id === a.campaignId);
      return (
        (tab === "all" ||
          (tab === "open" && a.status !== "submitted") ||
          (tab === "submitted" && a.status === "submitted")) &&
        (area === "all" || p.area === area) &&
        normalize(
          `${p.name} ${c.name} ${PERSPECTIVES[a.perspective]}`,
        ).includes(normalize(search))
      );
    });
  return (
    <>
      <Heading
        title="Mis evaluaciones pendientes"
        description={`Hola, ${actor.name.split(" ")[0]}. Aquí están las evaluaciones que te corresponde responder.`}
      />
      <Metrics
        items={[
          {
            label: "Asignadas",
            value: all.length,
            detail: "Todas tus campañas",
          },
          {
            label: "Pendientes",
            value: all.filter((a) => a.status === "pending").length,
            detail: "Por comenzar",
          },
          {
            label: "En proceso",
            value: all.filter((a) => a.status === "draft").length,
            detail: "Borradores guardados",
          },
          {
            label: "Completadas",
            value: all.filter((a) => a.status === "submitted").length,
            detail: "Respuestas enviadas",
          },
        ]}
      />
      <Panel>
        <Segments
          value={tab}
          onChange={setTab}
          items={[
            { value: "open", label: "Por completar" },
            { value: "submitted", label: "Completadas" },
            { value: "all", label: "Todas" },
          ]}
        />
        <div className="ev-filters">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar persona o campaña…"
          />
          <Select
            label="Departamento"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            <option value="all">Todos los departamentos</option>
            {[...new Set(state.people.map((p) => p.area))].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </div>
        <DataTable
          rows={rows}
          empty="No tienes evaluaciones en esta vista. Prueba con otra pestaña."
          columns={[
            {
              key: "subjectId",
              label: "Persona a evaluar",
              render: (a) => (
                <Person
                  person={state.people.find((p) => p.id === a.subjectId)}
                />
              ),
            },
            {
              key: "campaign",
              label: "Campaña / relación",
              render: (a) => (
                <>
                  {state.campaigns.find((c) => c.id === a.campaignId)?.name}
                  <small>{PERSPECTIVES[a.perspective]}</small>
                </>
              ),
            },
            {
              key: "status",
              label: "Estado",
              render: (a) => (
                <Status
                  value={a.status === "draft" ? "in_progress" : a.status}
                />
              ),
            },
            {
              key: "progress",
              label: "Avance",
              render: (a) => {
                const p = progress(a);
                return (
                  <Progress
                    value={(p.answered / p.total) * 100}
                    label={`${p.answered}/${p.total} preguntas`}
                  />
                );
              },
            },
            {
              key: "due",
              label: "Fecha límite",
              render: (a) =>
                dateText(
                  state.campaigns.find((c) => c.id === a.campaignId)?.dueOn,
                ),
            },
            {
              key: "action",
              label: "",
              render: (a) => {
                const c = state.campaigns.find((c) => c.id === a.campaignId),
                  r = personResult(state, c, a.subjectId);
                return (
                  <div className="ev-actions">
                    {a.status === "submitted" ? (
                      <ActionLink to={`responder/${a.id}`}>
                        Ver respuestas
                      </ActionLink>
                    ) : campaignStatus(c) === "active" ? (
                      <ActionLink to={`responder/${a.id}`} primary>
                        {a.status === "draft" ? "Continuar" : "Evaluar"}
                      </ActionLink>
                    ) : (
                      <Badge>
                        {campaignStatus(c) === "scheduled"
                          ? "Aún no abre"
                          : "Periodo cerrado"}
                      </Badge>
                    )}
                    {r.complete &&
                      canSeeResult(
                        state,
                        actor.role,
                        actor.id,
                        c,
                        a.subjectId,
                      ) && (
                        <ActionLink to={`resultados/${c.id}/${a.subjectId}`}>
                          Resultado
                        </ActionLink>
                      )}
                  </div>
                );
              },
            },
          ]}
        />
      </Panel>
    </>
  );
}
export function Team() {
  const { state, actor } = useEvaluations(),
    [campaignId, setCampaignId] = useState(
      state.campaigns.find((c) => c.status === "active")?.id ||
        state.campaigns[0]?.id ||
        "",
    ),
    [search, setSearch] = useState(""),
    [area, setArea] = useState("all");
  if (!["manager", "hr", "direction"].includes(actor.role))
    return <Empty title="Esta vista corresponde a jefes, RH y dirección" />;
  const campaign = state.campaigns.find((c) => c.id === campaignId),
    people = scopeSubjects(state, actor.role, actor.id).filter((p) =>
      campaign?.subjectIds.includes(p.id),
    ),
    results = people.map((p) => personResult(state, campaign, p.id));
  return (
    <>
      <Heading
        title={
          actor.role === "manager"
            ? "Desempeño de mi equipo"
            : "Equipos y colaboradores"
        }
        description="Revisa pendientes, avances y resultados publicados por colaborador."
      />
      <Metrics
        items={[
          {
            label: "En esta campaña",
            value: people.length,
            detail: "Colaboradores a tu alcance",
          },
          {
            label: "En proceso",
            value: results.filter((r) => !r.complete).length,
            detail: "Faltan respuestas",
          },
          {
            label: "Evaluaciones completas",
            value: results.filter((r) => r.complete).length,
            detail: "Todas las perspectivas recibidas",
          },
          {
            label: "Resultados publicados",
            value: results.filter((r) => r.publication?.publishedAt).length,
            detail: "Acceso según permisos",
          },
        ]}
      />
      <Panel>
        <div className="ev-filters">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar en todo el equipo…"
          />
          <Select
            label="Campaña del equipo"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            {state.campaigns
              .filter((c) => c.status !== "draft")
              .map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
          <Select
            label="Área del equipo"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            <option value="all">Todas las áreas</option>
            {[...new Set(people.map((p) => p.area))].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </div>
        <DataTable
          rows={people.filter(
            (p) =>
              (area === "all" || p.area === area) &&
              normalize(`${p.name} ${p.position}`).includes(normalize(search)),
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
                const r = personResult(state, campaign, p.id);
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
              render: (p) => {
                const r = personResult(state, campaign, p.id);
                return canSeeResult(
                  state,
                  actor.role,
                  actor.id,
                  campaign,
                  p.id,
                ) ? (
                  scoreText(r.score)
                ) : (
                  <Badge>Sin publicar</Badge>
                );
              },
            },
            {
              key: "action",
              label: "",
              render: (p) => {
                const a = state.assignments.find(
                  (a) =>
                    a.campaignId === campaignId &&
                    a.subjectId === p.id &&
                    a.evaluatorId === actor.id &&
                    a.status !== "submitted",
                );
                return (
                  <div className="ev-actions">
                    {a && campaignStatus(campaign) === "active" && (
                      <ActionLink to={`responder/${a.id}`} primary>
                        Evaluar
                      </ActionLink>
                    )}
                    {canSeeResult(
                      state,
                      actor.role,
                      actor.id,
                      campaign,
                      p.id,
                    ) && (
                      <ActionLink to={`resultados/${campaignId}/${p.id}`}>
                        Ver resultado
                      </ActionLink>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      </Panel>
    </>
  );
}
