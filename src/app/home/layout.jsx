"use client";
import { AppSidebar } from "@/components/Sidebar/app-sidebar";
import { SiteHeader } from "@/components/Sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import React from "react";

export default function HomeLayout({ children }) {
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
