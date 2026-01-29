import { AppSidebar } from "../../components/Sidebar/app-sidebar";
import { SiteHeader } from "../../components/Sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function LayoutPanel({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        {/*
          Diseño ADAMIA (estandarización global del Panel):
          - Base typography: 14px (Tailwind `text-sm`) para que todos los módulos del Panel se vean consistentes.
          - Los títulos/jerarquía visual se manejan localmente con `text-base`, `text-xl`, etc.
        */}
        <div className="flex flex-1 flex-col p-5 text-sm text-gray-900">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
