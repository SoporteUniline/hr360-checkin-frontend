"use client";

import { LogOutIcon, MoreVerticalIcon, ShieldCheckIcon, UserCircleIcon } from "lucide-react";

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
import { useConfirmarSalida } from "@/components/cambios/CambiosPendientes";
import { obtenerIniciales } from "@/lib/utils";
import { rutaSeguridad } from "@/lib/passkeys/modelo.mjs";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";

export function NavUser() {
  const { dataUser, logout } = useAuth();

  // La foto solo se muestra a quien no es empleado ni acceso (ellos ven sus iniciales): a ellos no se les pide.
  // En celular el menú se monta cada vez que se abre: con la foto ya en caché no se vuelve a pedir
  // (cambiarla en Mi cuenta hace mutate de esta misma clave).
  const conFoto = Boolean(dataUser?.id_usuario) && !dataUser?.esEmpleado && !dataUser?.esAcceso;
  const { data, isLoading, error } = useSWR(
    conFoto ? `/users/imagen/${dataUser.id_usuario}` : null,
    fetcherWithToken,
    { ...swr_config, revalidateIfStale: false, revalidateOnFocus: false },
  );

  const { isMobile, setOpenMobile } = useSidebar();

  const router = useRouter();
  const confirmarSalida = useConfirmarSalida();
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
                {dataUser?.esEmpleado || dataUser?.esAcceso ? (
                  <AvatarFallback>
                    {obtenerIniciales(dataUser?.nombre)}
                  </AvatarFallback>
                ) : (
                  <>
                    <AvatarImage src={data?.url_imagen} alt={data?.nombre} />
                    <AvatarFallback>
                      {obtenerIniciales(dataUser?.nombre)}
                    </AvatarFallback>
                  </>
                )}
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
                  {dataUser?.esEmpleado || dataUser?.esAcceso ? (
                    <AvatarFallback>
                      {obtenerIniciales(dataUser?.nombre)}
                    </AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src={data?.url_imagen} alt={data?.nombre} />
                      <AvatarFallback>
                        {obtenerIniciales(dataUser?.nombre)}
                      </AvatarFallback>
                    </>
                  )}
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
            {dataUser?.esEmpleado || dataUser?.esAcceso ? null : (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                      confirmarSalida(({ reemplazar }) => (reemplazar ? router.replace(`/${location}/cuenta`) : router.push(`/${location}/cuenta`)), { navega: true });
                    }}
                  >
                    <UserCircleIcon />
                    Mi cuenta
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            {/* (25/11/2026) Para todos (también usuarios con acceso): passkeys y sesiones abiertas. */}
            <DropdownMenuItem
              onClick={() => {
                if (isMobile) setOpenMobile(false);
                confirmarSalida(({ reemplazar }) => (reemplazar ? router.replace(rutaSeguridad(dataUser)) : router.push(rutaSeguridad(dataUser))), { navega: true });
              }}
            >
              <ShieldCheckIcon />
              Seguridad y Face ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (isMobile) setOpenMobile(false);
                confirmarSalida(() => logout(), { navega: true });
              }}
            >
              <LogOutIcon />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
