"use client";
import Link from "next/link";
import { Settings } from "lucide-react";
import {
  useEvaluations,
  useEvaluationQuery,
  EditorData,
} from "./EvaluationContext";
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
import { Results, ResultDetail } from "./ResultViews";
import { SettingsView } from "./SettingsView";
import "./evaluaciones.css";
// (20/11/2026, «menos vistas») Antes: 10 pestañas iguales para todos y 4 entradas en el menú.
// Ahora cada quien ve lo suyo: RH administra (Campañas, Plantillas y el engrane de Ajustes) y los demás
// responden y consultan. Resultados y planes se abren desde la campaña o desde «Mis resultados».
const PESTANAS_RH = [
  { label: "Campañas", path: "campanas", scope: "campaigns" },
  { label: "Plantillas", path: "plantillas", scope: "templates" },
];
const PESTANAS = [
  { label: "Por responder", path: "mis-pendientes", scope: "assignments" },
  { label: "Mi equipo", path: "equipo", scope: "team" },
  { label: "Mis resultados", path: "mis-evaluaciones", scope: "results" },
];
// Rutas que existen aunque no sean pestaña (se abren desde otra vista) y el permiso que piden.
const SCOPE_DE_RUTA = {
  ...Object.fromEntries(
    [...PESTANAS_RH, ...PESTANAS].map((n) => [n.path, n.scope])
  ),
  responder: "assignments",
  resultados: "results",
  configuracion: "settings",
};
// RH (y Dirección, que solo consulta) trabaja por campañas; los demás, por lo que tienen que responder.
const esRH = (capabilities) => !!capabilities.flags?.canViewCampaigns;
const inicio = (capabilities) =>
  esRH(capabilities) ? "campanas" : "mis-pendientes";

export function EvaluationShell({ children }) {
  const { capabilities, href, section, selectorEmpresa } = useEvaluations();
  const rh = esRH(capabilities);
  // RH solo ve «Por responder» cuando alguien le asignó evaluaciones.
  const suyas = useEvaluationQuery(
    "/my/assignments",
    { page: 1, pageSize: 1 },
    { enabled: rh }
  );
  const pestanas = (
    rh
      ? [
          ...PESTANAS_RH,
          ...(suyas.pagination?.total > 0 ? PESTANAS.slice(0, 1) : []),
        ]
      : PESTANAS
  ).filter((n) => capabilities.scopes.includes(n.scope));
  const actual = section.split("/")[0] || inicio(capabilities);
  return (
    <div className="ev-module">
      <div className="ev-topbar">
        <nav className="ev-nav" aria-label="Evaluación de desempeño">
          {pestanas.map((n) => (
            <Link
              key={n.path}
              href={href(n.path)}
              aria-current={actual === n.path ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ev-topbar-tools">
          {selectorEmpresa}
          {capabilities.scopes.includes("settings") && (
            <Link
              href={href("configuracion")}
              className="ev-gear"
              aria-label="Ajustes de evaluaciones"
              title="Ajustes de evaluaciones"
              aria-current={actual === "configuracion" ? "page" : undefined}
            >
              <Settings aria-hidden="true" size={18} />
            </Link>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
export default function EvaluationModule({ segments = [] }) {
  const { capabilities } = useEvaluations(),
    [view, id, third] = segments;
  const scope = SCOPE_DE_RUTA[view] || null;
  if (scope && !capabilities.scopes.includes(scope))
    return (
      <Empty
        title="No tienes acceso a esta sección"
        action={<ActionLink to="">Volver</ActionLink>}
      />
    );
  let page;
  if (!view)
    page =
      inicio(capabilities) === "campanas" ? <Campaigns /> : <Assignments />;
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
  else if (view === "resultados" && id && third)
    page = <ResultDetail campaignId={id} subjectId={third} />;
  else if (view === "mis-evaluaciones") page = <Results />;
  else if (view === "configuracion") page = <SettingsView />;
  else page = <Empty title="Vista no encontrada" />;
  return <div key={segments.join("/")}>{page}</div>;
}
