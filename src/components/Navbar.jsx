"use client";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Image from "next/image";
import { Icon } from "@iconify/react";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/context/AuthContext";
import EllipsisLoader from "./loading/EllipsisLoader";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { obtenerIniciales } from "@/lib/utils";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";

export default function Navbar() {
  const pathname = usePathname();
  const { isLoggedIn, isAuthChecked, logout, dataUser } = useAuth();

  const { data: imagenData } = useSWR(
    dataUser?.id_usuario ? `/users/imagen/${dataUser.id_usuario}` : null,
    fetcherWithToken,
    swr_config
  );

  if (!isAuthChecked) {
    return <EllipsisLoader />;
  }

  const { nombre, correo, tipo_usuario } = dataUser ?? {};

  const getDashboardPath = () => {
    console.log(tipo_usuario);
    switch (tipo_usuario) {
      case "Admin":
        return "/dashboard";
      case "User":
        return "/home";
      case "Recruiter":
        return "/panel";
      case "Empleado":
        return "/empleado";
      default:
        return "/";
    }
  };

  return (
    <div
      className={`flex items-center px-2 py-1 fixed top-0 right-0 left-0 bg-white z-40`}
    >
      <div className="flex md:hidden mr-3 ml-1">
        <MenuResposive
          isLoggedIn={isLoggedIn}
          logout={logout}
          nombre={nombre}
          usuario={correo}
          tipo_usuario={tipo_usuario}
          getDashboardPath={getDashboardPath}
        />
      </div>
      <div className="flex-1 p-2.5">
        <Image alt="HR360" src="/assets/logo.png" height={80} width={70} />
      </div>
      <div className="hidden md:flex">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link
                href="/"
                className={twMerge(
                  navigationMenuTriggerStyle(),
                  pathname === "/" && "font-medium"
                )}
              >
                Inicio
              </Link>
            </NavigationMenuItem>
            {!isLoggedIn && (
              <NavigationMenuItem>
                <Link
                  href="/alta-empresas"
                  className={twMerge(
                    navigationMenuTriggerStyle(),
                    pathname === "/alta-empresas" && "font-medium"
                  )}
                >
                  Alta Empresas
                </Link>
              </NavigationMenuItem>
            )}
            <NavigationMenuItem>
              <Link
                href="/quienes-somos"
                className={twMerge(
                  navigationMenuTriggerStyle(),
                  pathname === "/quienes-somos" && "font-medium"
                )}
              >
                Conócenos
              </Link>
            </NavigationMenuItem>
            {/* <NavigationMenuItem>
              <Link
                href="/blog-y-noticias"
                className={twMerge(
                  navigationMenuTriggerStyle(),
                  pathname === "/blog-y-noticias" && "font-medium"
                )}
              >
                Blog y Noticias
              </Link>
            </NavigationMenuItem> */}
            {/* <NavigationMenuItem>
              <Link
                href="/capacitacion"
                className={twMerge(
                  navigationMenuTriggerStyle(),
                  pathname === "/capacitacion" && "font-medium"
                )}
              >
                Capacitación
              </Link>
            </NavigationMenuItem> */}
            <NavigationMenuItem>
              {/* Menú Vacaciones (desplegable): Panel Vacaciones + Vacaciones por ley */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={twMerge(
                      navigationMenuTriggerStyle(),
                      pathname?.startsWith("/panel/vacaciones") && "font-medium"
                    )}
                  >
                    Vacaciones
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/panel/vacaciones" className="w-full">
                      Panel vacaciones
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/panel/vacaciones/por-ley" className="w-full">
                      Vacaciones por ley
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/panel/vacaciones/por-periodo" className="w-full">
                      Vacaciones por periodo
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </NavigationMenuItem>
            <NavigationMenuItem>
              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer">
                      {dataUser?.esEmpleado ? (
                        <AvatarFallback>
                          {obtenerIniciales(dataUser?.nombre)}
                        </AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage
                            src={imagenData?.url_imagen}
                            alt={imagenData?.nombre || "@shadcn"}
                          />
                          <AvatarFallback>
                            {obtenerIniciales(dataUser?.nombre)}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-56">
                    <div className="flex items-center gap-3 p-2">
                      <Avatar>
                        {dataUser?.esEmpleado ? (
                          <AvatarFallback>
                            {obtenerIniciales(dataUser?.nombre)}
                          </AvatarFallback>
                        ) : (
                          <>
                            <AvatarImage
                              src={imagenData?.url_imagen}
                              alt={imagenData?.nombre || "@shadcn"}
                            />
                            <AvatarFallback>
                              {obtenerIniciales(dataUser?.nombre)}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {correo}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    {tipo_usuario ? (
                      <DropdownMenuItem className="cursor-pointer" asChild>
                        <Link href={getDashboardPath()} className="w-full">
                          {tipo_usuario === "Admin"
                            ? "Dashboard"
                            : tipo_usuario === "User"
                            ? "Dashboard"
                            : "Panel"}
                        </Link>
                      </DropdownMenuItem>
                    ) : null}

                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={logout}
                    >
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  href="/login"
                  className={twMerge(
                    navigationMenuTriggerStyle(),
                    pathname === "/login" && "font-medium"
                  )}
                >
                  Iniciar sesión
                </Link>
              )}
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}

const MenuResposive = ({
  isLoggedIn,
  logout,
  nombre,
  usuario,
  tipo_usuario,
  getDashboardPath,
}) => {
  const pathname = usePathname();

  return (
    <Drawer direction="left">
      <DrawerTrigger>
        <Icon
          className="cursor-pointer"
          icon="material-symbols:menu"
          width="24"
          height="24"
        />
      </DrawerTrigger>
      <DrawerContent className="mt-0 inset-y-0 w-60 bottom-0 z-50 rounded-r-sm rounded-l-none px-4 py-4">
        <div className="flex flex-col h-full justify-between">
          <div className="flex flex-col space-y-3 mt-2">
            <DrawerClose asChild>
              <Link
                href="/"
                className={twMerge(
                  navigationMenuTriggerStyle(),
                  pathname === "/" && "font-medium"
                )}
              >
                Inicio
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              <Link
                href="/alta-empresas"
                className={twMerge(
                  navigationMenuTriggerStyle(),
                  pathname === "/alta-empresas" && "font-medium"
                )}
              >
                Alta Empresas
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              <Link
                href="/quienes-somos"
                className={twMerge(
                  navigationMenuTriggerStyle(),
                  pathname === "/quienes-somos" && "font-medium"
                )}
              >
                Conócenos
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              <Link
                href="/blog-y-noticias"
                className={twMerge(
                  navigationMenuTriggerStyle(),
                  pathname === "/blog-y-noticias" && "font-medium"
                )}
              >
                Blog y Noticias
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              <Link
                href="/capacitacion"
                className={twMerge(
                  navigationMenuTriggerStyle(),
                  pathname === "/capacitacion" && "font-medium"
                )}
              >
                Capacitación
              </Link>
            </DrawerClose>

            {/* Menú responsive: Vacaciones */}
            <div className="pt-1" />
            <div className="text-[11px] uppercase text-muted-foreground px-1">Vacaciones</div>
            <DrawerClose asChild>
              <Link
                href="/panel/vacaciones"
                className={twMerge(navigationMenuTriggerStyle())}
              >
                Panel vacaciones
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              <Link
                href="/panel/vacaciones/por-ley"
                className={twMerge(navigationMenuTriggerStyle())}
              >
                Vacaciones por ley
              </Link>
            </DrawerClose>

            {isLoggedIn && tipo_usuario && (
              <DrawerClose asChild>
                <Link
                  href={getDashboardPath()}
                  className={twMerge(navigationMenuTriggerStyle())}
                >
                  {tipo_usuario === "Admin"
                    ? "Dashboard"
                    : tipo_usuario === "User"
                    ? "Home"
                    : "Panel"}
                </Link>
              </DrawerClose>
            )}

            {!isLoggedIn && (
              <DrawerClose asChild>
                <Link
                  href="/login"
                  className={twMerge(
                    navigationMenuTriggerStyle(),
                    pathname === "/login" && "font-medium"
                  )}
                >
                  Iniciar sesión
                </Link>
              </DrawerClose>
            )}
          </div>

          {isLoggedIn && (
            <div className="pt-4 mt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>{obtenerIniciales(nombre)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {usuario}
                    </p>
                  </div>
                </div>
                <DrawerClose asChild>
                  <button
                    onClick={logout}
                    className="ml-2 text-muted-foreground hover:text-destructive cursor-pointer"
                    title="Cerrar sesión"
                  >
                    <Icon
                      icon="material-symbols:logout"
                      width="20"
                      height="20"
                    />
                  </button>
                </DrawerClose>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
