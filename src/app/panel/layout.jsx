import { AppSidebar } from "../../components/Sidebar/app-sidebar";
import { SiteHeader } from "../../components/Sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { checkSubscriptionDirect } from "@/lib/db-queries";
import { cookies } from "next/headers";
import SubscriptionRequiredView from "@/components/SubscriptionRequiredView";

export default async function LayoutPanel({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let userId = null;

  if (token) {
    try {
      const base64Payload = token.split(".")[1];
      const payload = Buffer.from(base64Payload, "base64").toString();
      const decoded = JSON.parse(payload);

      userId = decoded.id_usuario || decoded.id || decoded.sub;
    } catch (e) {
      console.error("Error decodificando el token:", e);
    }
  }

  const hasActivePlan = userId ? await checkSubscriptionDirect(userId) : true;
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
