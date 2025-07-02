"use client";

import { LogOutIcon, MoreVerticalIcon, UserCircleIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { obtenerIniciales } from "@/lib/utils";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";

export function NavUser() {
  const { dataUser, logout } = useAuth();

  const { data, isLoading, error } = useSWR(
    dataUser?.id_usuario ? `/users/imagen/${dataUser.id_usuario}` : null,
    fetcherWithToken,
    swr_config
  );
  const { isMobile } = useSidebar();

  const router = useRouter();
  const pathname = usePathname();

  const location = pathname.split("/")[1] || "panel";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={data?.url_imagen} alt={data?.nombre} />
                <AvatarFallback>
                  {obtenerIniciales(data?.nombre)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{dataUser?.nombre}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {dataUser?.correo}
                </span>
              </div>
              <MoreVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={data?.url_imagen} alt={data?.nombre} />
                  <AvatarFallback>
                    {obtenerIniciales(dataUser?.nombre)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {dataUser?.nombre}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {dataUser?.correo}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => router.push(`/${location}/cuenta`)}
              >
                <UserCircleIcon />
                Mi cuenta
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOutIcon />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
