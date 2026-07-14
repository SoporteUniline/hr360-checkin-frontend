import DashboardRH from "./DashboardRH";

/**
 * Dashboard de RH del panel.
 *
 * Antes era un Server Component con `id_empresa` fijo en `null` (lo que dejaba
 * sin cargar festivos y el detalle de asistencias). Ahora delega en el componente
 * cliente `DashboardRH`, que resuelve la empresa desde la sesión y expone filtros
 * de periodo, empresa, unidad de negocio y departamento.
 *
 * Contrato de datos del backend: ver `docs/DASHBOARD_BACKEND.md`.
 */
export default function PanelDashboardPage() {
  return <DashboardRH />;
}
