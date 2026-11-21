"use client";
import { useEvaluations, useEvaluationQuery } from "./EvaluationContext";
import { Panel, QueryState, ExportButton } from "./ui";
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
// (20/11/2026) «Resumen» y «Tablero» eran la misma vista con dos nombres. Ahora los indicadores van
// arriba de la lista de campañas (todas) y dentro de cada campaña (solo esa).
export function Indicadores({ campaignId }) {
  const { capabilities } = useEvaluations();
  const query = useEvaluationQuery(
    "/dashboard",
    campaignId ? { campaignId } : {},
    {
      enabled: capabilities.scopes.includes("dashboard"),
    }
  );
  if (!capabilities.scopes.includes("dashboard")) return null;
  return (
    <Panel
      title={
        campaignId
          ? "Indicadores de la campaña"
          : "Resumen de todas las campañas"
      }
      actions={
        <ExportButton
          filters={campaignId ? { campaignId: Number(campaignId) } : {}}
        />
      }
    >
      <QueryState query={query}>
        <DashboardValues value={query.data} />
      </QueryState>
    </Panel>
  );
}
