"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
// (22/12/2026) Talento: objetivos, 1:1, feedback, calibración y bono, y «Mi equipo» del gerente.
import { ObjetivosView } from "./talento/ObjetivosView";
import { UnoAUnoView } from "./talento/UnoAUnoView";
import { FeedbackView } from "./talento/FeedbackView";
import { CalibracionView } from "./talento/CalibracionView";
import { EquipoTalento } from "./talento/EquipoTalento";
import {
  SCOPE_DE_RUTA,
  esRH,
  seccionConfiguracion,
  vistaActual,
  vistaInicio,
  vistasVisibles,
} from "@/lib/evaluaciones/vistas.mjs";
import "./evaluaciones.css";
// Cada quien ve lo suyo: RH administra y los demás responden y consultan.
// Cada vista tiene su dirección y su entrada en el menú
// (Campañas, Plantillas, Por responder y Configuración, con sus secciones). Las vistas y quién ve cada una
// están en src/lib/evaluaciones/vistas.mjs; el menú lee lo mismo.

export function EvaluationShell({ children }) {
  const { capabilities, href, section, selectorEmpresa } = useEvaluations();
  // RH solo ve «Por responder» cuando alguien le asignó evaluaciones.
  const suyas = useEvaluationQuery(
    "/my/assignments",
    { page: 1, pageSize: 1 },
    { enabled: esRH(capabilities) }
  );
  const pestanas = vistasVisibles(capabilities, suyas.pagination?.total > 0);
  const actual = vistaActual(section) || vistaInicio(capabilities);
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
              {n.texto}
            </Link>
          ))}
        </nav>
        {selectorEmpresa && (
          <div className="ev-topbar-tools">{selectorEmpresa}</div>
        )}
      </div>
      {children}
    </div>
  );
}
// La entrada del módulo lleva a la primera vista de cada quien (así el menú resalta la entrada correcta).
function IrAInicio() {
  const { capabilities, href } = useEvaluations(),
    router = useRouter(),
    destino = href(vistaInicio(capabilities));
  useEffect(() => router.replace(destino), [router, destino]);
  return (
    <p className="p-8" role="status">
      Abriendo evaluaciones…
    </p>
  );
}
export default function EvaluationModule({ segments = [] }) {
  const { capabilities } = useEvaluations(),
    [view, id, third] = segments;
  const scope = SCOPE_DE_RUTA[view] || null,
    ajuste = view === "configuracion" && seccionConfiguracion(segments.join("/"));
  if (scope && !capabilities.scopes.includes(scope))
    return (
      <Empty
        title="No tienes acceso a esta sección"
        action={<ActionLink to="">Volver</ActionLink>}
      />
    );
  let page;
  if (!view) page = <IrAInicio />;
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
  else if (view === "equipo")
    page = (
      <>
        {capabilities.profile === "manager" && <EquipoTalento />}
        <Team />
      </>
    );
  else if (view === "objetivos") page = <ObjetivosView />;
  else if (view === "uno-a-uno") page = <UnoAUnoView />;
  else if (view === "reconocimientos") page = <FeedbackView />;
  else if (view === "calibracion") page = <CalibracionView />;
  else if (view === "responder" && id) page = <ResponseView id={id} />;
  else if (view === "resultados" && id && third)
    page = <ResultDetail campaignId={id} subjectId={third} />;
  else if (view === "mis-evaluaciones") page = <Results />;
  else if (view === "configuracion" && ajuste)
    page = <SettingsView seccion={ajuste} />;
  else page = <Empty title="Vista no encontrada" />;
  return <div key={segments.join("/")}>{page}</div>;
}
