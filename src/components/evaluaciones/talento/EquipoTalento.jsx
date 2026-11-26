"use client";
// «Mi equipo» del gerente: por colaborador directo, objetivos, próximo 1:1, feedback, reconocimientos y su lugar en el
// 9-box de la última calibración cerrada. docs/evaluaciones/talento.md.
import { useEvaluationQuery } from "../EvaluationContext";
import { Panel, Badge, Progress, ActionLink } from "../ui";
import { DESEMPENO, NOMBRES_CAJA } from "@/lib/evaluaciones/talento.mjs";
import { fecha } from "./comun";
import "./talento.css";

export function EquipoTalento() {
  const q = useEvaluationQuery("/my-team/talent");
  const gente = q.data?.people ?? [];
  if (q.error || !gente.length) return null;
  return (
    <div className="tl" style={{ marginBottom: 22 }}>
      <Panel title="Mi equipo" description={`Objetivos ${q.data.period.key}, 1:1, feedback, reconocimientos y 9-box de tus colaboradores directos.`}
        actions={<div className="ev-actions"><ActionLink to="objetivos">Objetivos</ActionLink><ActionLink to="uno-a-uno">1:1</ActionLink><ActionLink to="reconocimientos">Feedback</ActionLink></div>}>
        <div className="ev-pad">
          <div className="tl-cards">
            {gente.map((p) => (
              <article key={p.employeeId} className="tl-card">
                <div className="tl-row"><h3>{p.name}</h3>{p.area && <span className="tl-muted">{p.area}</span>}</div>
                <div>
                  <div className="tl-row">
                    <strong>Objetivos</strong>
                    {p.objectives.count === 0 ? <Badge tone="gray">Sin objetivos</Badge> : p.objectives.pendingApproval ? <Badge tone="amber">Por aprobar</Badge> : <Badge tone="green">{p.objectives.count} aprobados</Badge>}
                  </div>
                  {p.objectives.percent != null && <Progress label="Cumplimiento" value={p.objectives.percent} />}
                  {p.objectives.problem && <small>{p.objectives.problem}</small>}
                </div>
                <div className="tl-meta">
                  <span>1:1: {p.oneOnOne?.nextOn ? `próximo ${fecha(p.oneOnOne.nextOn)}` : "sin agenda"}</span>
                  <span>Feedback: {p.feedback.count}{p.feedback.last ? ` · último ${fecha(p.feedback.last)}` : ""}</span>
                  <span>Reconocimientos (90 días): {p.recognitions90d}</span>
                </div>
                <div className="tl-row">
                  <strong>9-box</strong>
                  {p.nineBox ? (
                    <Badge tone={p.nineBox.performance === 3 ? "green" : p.nineBox.performance === 1 ? "red" : "blue"}>
                      {NOMBRES_CAJA[`${p.nineBox.performance}-${p.nineBox.potential}`] ?? "—"} · desempeño {DESEMPENO[p.nineBox.performance - 1].toLowerCase()} · potencial {String(p.nineBox.potentialLabel ?? "—").toLowerCase()}
                    </Badge>
                  ) : <span className="tl-muted">Sin calibración cerrada</span>}
                </div>
                {p.nineBox && <small>{p.nineBox.campaign} · calificación {p.nineBox.score.toFixed(2)}</small>}
              </article>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
