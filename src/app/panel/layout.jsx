import { cache } from "react";
import { AppSidebar } from "../../components/Sidebar/app-sidebar";
import { SiteHeader } from "../../components/Sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { checkSubscriptionDirect } from "@/lib/db-queries";
import { cookies, headers } from "next/headers";
import SubscriptionRequiredView from "@/components/SubscriptionRequiredView";

// Rutas del panel que siempre se muestran aunque no haya suscripción activa
const RUTAS_SIN_RESTRICCION = ["/panel/mi-suscripcion"];

// Cachea por request/argumento
const getSubscriptionStatus = cache(async (userId, idEmpresa) => {
  return await checkSubscriptionDirect(userId, idEmpresa);
});

export default async function LayoutPanel({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
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
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <div className="panel-modules-content flex flex-1 flex-col p-5 text-sm text-gray-900">
          {!hasActivePlan ? <SubscriptionRequiredView /> : children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
