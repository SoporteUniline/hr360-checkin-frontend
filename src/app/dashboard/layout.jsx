"use client";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "../../components/Sidebar/app-sidebar";
import { SiteHeader } from "../../components/Sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import EllipsisLoader from "@/components/loading/EllipsisLoader";

export default function LayoutDashboard({ children }) {
  const { isAuthChecked } = useAuth();

  if (!isAuthChecked) {
    return <EllipsisLoader />;
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-5">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
