"use client";

import * as React from "react";
import { NavMain, NavMainConConsulta } from "./nav-main";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "../ui/sidebar";
import Image from "next/image";

// Isotipo compacto (la "A" con degradado de marca) para el modo contraído.
// (23/11/2026) Menú contraído: la «A» oficial de ADAMIA (recortada de /assets/logo.png), no un dibujo parecido.
function AdamiaMark() {
  return <Image alt="" aria-hidden="true" src="/assets/adamia-isotipo.png" width={28} height={28} className="size-7 object-contain" />;
}

export function AppSidebar({ ...props }) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-1 px-1.5 pt-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-0">
          {/* Logo completo (expandido) */}
          <div className="flex-1 p-1.5 group-data-[collapsible=icon]:hidden">
            <Image
              alt="Adamia"
              src="/assets/logo.png"
              height={110}
              width={160}
            />
          </div>
          {/* Isotipo (contraído) */}
          <div
            className="hidden group-data-[collapsible=icon]:block"
            title="Adamia"
          >
            <AdamiaMark />
          </div>
          <SidebarTrigger
            className="text-gray-400 hover:bg-blue-50 hover:text-[#2563EB]"
            title="Contraer / expandir menú (Ctrl+B)"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* useSearchParams necesita Suspense; mientras tanto, el menú sin la vista de la URL. */}
        <React.Suspense fallback={<NavMain />}>
          <NavMainConConsulta />
        </React.Suspense>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
