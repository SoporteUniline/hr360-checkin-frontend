"use client";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Search } from "lucide-react";

export function SiteHeader() {
  const openPalette = () =>
    window.dispatchEvent(new CustomEvent("open-command-palette"));

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <button
          onClick={openPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/50 hover:bg-muted text-muted-foreground text-xs transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Buscar...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] hidden sm:inline">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
}
