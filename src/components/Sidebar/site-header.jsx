"use client";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const location = usePathname();

  function capitalizeFirstLetter() {
    const title = location.split("/")[2] ?? "Panel Reclutador";

    // Si el título contiene guiones, lo separamos y capitalizamos cada palabra
    const palabras = title
      .split("-")
      .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1));

    return palabras.join(" ");
  }

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h2 className="text-base font-semibold">{capitalizeFirstLetter()}</h2>
      </div>
    </header>
  );
}
