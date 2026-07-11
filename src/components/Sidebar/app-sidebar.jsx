"use client";

import * as React from "react";
import { NavMain } from "./nav-main";
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
function AdamiaMark() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="adamia-mark" x1="0" y1="0" x2="26" y2="26">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#2563eb" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path
        d="M13 2 L23 24 H17.5 L13 13.5 L8.5 24 H3 Z"
        fill="url(#adamia-mark)"
      />
      <circle cx="13" cy="16.5" r="2.2" fill="#fff" />
    </svg>
  );
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
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
