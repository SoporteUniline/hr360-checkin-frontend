"use client";
import Link from "next/link";
import { useEvaluations, EditorData } from "./EvaluationContext";
import { Empty, ActionLink } from "./ui";
import { TemplateEditor } from "./TemplateViews";
import { CampaignWizard } from "./CampaignViews";
import {
  Templates,
  Campaigns,
  CampaignDetail,
  Assignments,
  Team,
} from "./ApiViews";
import { ResponseView } from "./ResponseView";
import { Overview, Results, ResultDetail } from "./ResultViews";
import { PlanList } from "./PlanViews";
import { SettingsView } from "./SettingsView";
import "./evaluaciones.css";
export const EVALUATION_NAV = [
  { label: "Resumen", path: "", scope: "dashboard" },
  { label: "Campañas", path: "campanas", scope: "campaigns" },
  { label: "Plantillas", path: "plantillas", scope: "templates" },
  { label: "Mis pendientes", path: "mis-pendientes", scope: "assignments" },
  { label: "Mi equipo", path: "equipo", scope: "team" },
  { label: "Resultados", path: "resultados", scope: "results" },
  { label: "Tablero", path: "tablero", scope: "dashboard" },
  { label: "Mis evaluaciones", path: "mis-evaluaciones", scope: "results" },
  { label: "Seguimiento", path: "seguimiento", scope: "plans" },
  { label: "Configuración", path: "configuracion", scope: "settings" },
];
export function EvaluationShell({ children }) {
  const { capabilities, href, section } = useEvaluations();
  return (
    <div className="ev-module">
      <nav className="ev-nav" aria-label="Evaluación de desempeño">
        {EVALUATION_NAV.filter((n) =>
          capabilities.scopes.includes(n.scope)
        ).map((n) => (
          <Link
            key={n.path}
            href={href(n.path)}
            aria-current={
              section === n.path || (n.path && section.startsWith(n.path + "/"))
                ? "page"
                : undefined
            }
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
export default function EvaluationModule({ segments = [] }) {
  const { capabilities } = useEvaluations(),
    [view, id, third] = segments;
  const scope =
    EVALUATION_NAV.find((n) => n.path === view)?.scope ||
    (view === "responder" ? "assignments" : null);
  if (scope && !capabilities.scopes.includes(scope))
    return (
      <Empty
        title="No tienes acceso a esta sección"
        action={<ActionLink to="">Volver</ActionLink>}
      />
    );
  let page;
  if (!view)
    page = capabilities.scopes.includes("dashboard") ? (
      <Overview />
    ) : capabilities.scopes.includes("team") ? (
      <Team />
    ) : (
      <Assignments />
    );
  else if (view === "plantillas")
    page = id ? (
      <EditorData key={`template:${id}`} kind="template" id={id}>
        <TemplateEditor id={id} />
      </EditorData>
    ) : (
      <Templates />
    );
  else if (view === "campanas")
    page =
      id === "nueva" || third === "editar" ? (
        <EditorData
          key={`campaign:${id}`}
          kind="campaign"
          id={id === "nueva" ? undefined : id}
        >
          <CampaignWizard id={id === "nueva" ? undefined : id} />
        </EditorData>
      ) : id ? (
        <CampaignDetail id={id} />
      ) : (
        <Campaigns />
      );
  else if (view === "mis-pendientes") page = <Assignments />;
  else if (view === "equipo") page = <Team />;
  else if (view === "responder" && id) page = <ResponseView id={id} />;
  else if (view === "resultados")
    page =
      id && third ? (
        <ResultDetail campaignId={id} subjectId={third} />
      ) : (
        <Results />
      );
  else if (view === "mis-evaluaciones") page = <Results personal />;
  else if (view === "tablero") page = <Overview executive />;
  else if (view === "seguimiento") page = <PlanList />;
  else if (view === "configuracion") page = <SettingsView />;
  else page = <Empty title="Vista no encontrada" />;
  return <div key={segments.join("/")}>{page}</div>;
}
