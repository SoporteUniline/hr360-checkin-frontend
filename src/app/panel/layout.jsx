import { cache } from "react";
import { AppSidebar } from "../../components/Sidebar/app-sidebar";
import { SiteHeader } from "../../components/Sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { checkSubscriptionDirect } from "@/lib/db-queries";
import { cookies, headers } from "next/headers";
import SubscriptionRequiredView from "@/components/SubscriptionRequiredView";
import { FichaEmpleadoProvider } from "@/components/empleado/FichaEmpleado";
import GuardaModulo from "@/components/modulos/GuardaModulo";
import GuardaPermiso from "@/components/permisos/GuardaPermiso";
import SesionPanel from "@/components/auth/SesionPanel";
import { nombreCookieSesion } from "@/lib/demo-base-path.mjs";
import CuerpoDesbloqueado from "@/components/auth/CuerpoDesbloqueado";
// (24/12/2026) Créditos de Adamia AI: aviso «sin créditos» con «Recargar» para cualquier pantalla con IA.
import AvisoSinCreditos from "@/components/ia/AvisoSinCreditos";
// (27/11/2026) Centro de comunicados: aviso emergente pendiente del usuario del panel (si está ligado a un empleado).
import AvisoEmergente from "@/components/comunicados/AvisoEmergente";

// Rutas del panel que siempre se muestran aunque no haya suscripción activa
// (25/11/2026) Seguridad: cerrar sesiones o quitar un dispositivo debe poderse siempre, con o sin plan.
const RUTAS_SIN_RESTRICCION = ["/panel/mi-suscripcion", "/panel/seguridad"];

// Cachea por request/argumento
const getSubscriptionStatus = cache(async (userId, idEmpresa) => {
  return await checkSubscriptionDirect(userId, idEmpresa);
});

export default async function LayoutPanel({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(nombreCookieSesion)?.value;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  const sinRestriccion = RUTAS_SIN_RESTRICCION.some((r) =>
    pathname.startsWith(r),
  );

  let userId = null;
  let idEmpresa = null;

  if (token) {
    try {
      const base64Payload = token.split(".")[1];
      const payload = Buffer.from(base64Payload, "base64").toString();
      const decoded = JSON.parse(payload);
      userId = decoded.id_usuario || decoded.id || decoded.sub;
      idEmpresa = decoded.id_empresa || decoded.empresa || null;
    } catch (e) {
      console.error("Error decodificando el token:", e);
    }
  }

  const hasActivePlan =
    sinRestriccion ||
    (userId && idEmpresa
      ? await getSubscriptionStatus(userId, idEmpresa)
      : true);

  return (
    <SidebarProvider>
      <SesionPanel />
      <CuerpoDesbloqueado />
      <AvisoSinCreditos />
      <AvisoEmergente modo="panel" />
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <div className="panel-modules-content flex flex-1 flex-col p-5 text-sm text-gray-900">
          {!hasActivePlan ? <SubscriptionRequiredView /> : <FichaEmpleadoProvider><GuardaPermiso><GuardaModulo>{children}</GuardaModulo></GuardaPermiso></FichaEmpleadoProvider>}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
