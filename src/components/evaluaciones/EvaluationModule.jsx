"use client";
import Link from "next/link";
import { useEvaluations } from "./EvaluationContext";
import { Select, Empty, ActionLink } from "./ui";
import { Templates, TemplateEditor } from "./TemplateViews";
import { Campaigns, CampaignDetail, CampaignWizard } from "./CampaignViews";
import { Assignments, Team } from "./TaskViews";
import { ResponseView } from "./ResponseView";
import { Overview, Results, ResultDetail } from "./ResultViews";
import { PlanList } from "./PlanViews";
import { SettingsView } from "./SettingsView";
import "./evaluaciones.css";
const roleLabels = {
  hr: "RH",
  direction: "Dirección",
  manager: "Jefe",
  employee: "Colaborador",
};
export const EVALUATION_NAV = [
  { label: "Resumen", path: "", roles: ["hr", "direction"] },
  { label: "Campañas", path: "campanas", roles: ["hr", "direction"] },
  { label: "Plantillas", path: "plantillas", roles: ["hr"] },
  { label: "Mis pendientes", path: "mis-pendientes" },
  { label: "Mi equipo", path: "equipo", roles: ["hr", "direction", "manager"] },
  {
    label: "Resultados",
    path: "resultados",
    roles: ["hr", "direction", "manager"],
  },
  { label: "Tablero", path: "tablero", roles: ["hr", "direction"] },
  { label: "Mis evaluaciones", path: "mis-evaluaciones" },
  { label: "Seguimiento", path: "seguimiento" },
  { label: "Configuración", path: "configuracion", roles: ["hr"] },
];
export function EvaluationShell({ children }) {
  const { state, actor, setActor, href, section } = useEvaluations();
  return (
    <div className="ev-module">
      <div className="ev-demo">
        <span>
          <strong>Demostración del módulo</strong> · Datos ficticios. Los
          cambios se guardan en este navegador.
        </span>
        <Select
          label="Probar como perfil ficticio"
          value={actor.id}
          onChange={(e) => setActor(e.target.value)}
        >
          {state.people.map((p) => (
            <option key={p.id} value={p.id}>
              {roleLabels[p.role]} · {p.name}
            </option>
          ))}
        </Select>
      </div>
      <nav className="ev-nav" aria-label="Evaluación de desempeño">
        {EVALUATION_NAV.filter(
          (n) => !n.roles || n.roles.includes(actor.role),
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
      <div key={actor.id}>{children}</div>
    </div>
  );
}
export default function EvaluationModule({ segments = [] }) {
  const { actor } = useEvaluations();
  const [view, id, third] = segments;
  const route = segments.join("/");
  let page;
  if (!view)
    page = ["hr", "direction"].includes(actor.role) ? (
      <Overview />
    ) : actor.role === "manager" ? (
      <Team />
    ) : (
      <Assignments />
    );
  else if (view === "plantillas")
    page = id ? <TemplateEditor id={id} /> : <Templates />;
  else if (view === "campanas")
    page =
      id === "nueva" ? (
        <CampaignWizard />
      ) : third === "editar" ? (
        <CampaignWizard id={id} />
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
  else
    page = (
      <Empty
        title="Vista no encontrada"
        action={<ActionLink to="">Volver al módulo</ActionLink>}
      />
    );
  return <div key={`${actor.id}:${route}`}>{page}</div>;
}
