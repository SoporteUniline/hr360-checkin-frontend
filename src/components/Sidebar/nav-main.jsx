"use client";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import {
  HomeIcon,
  Building,
  BriefcaseBusiness,
  UsersIcon,
  BadgeCheck,
  UserRound,
  CircleUserRoundIcon,
  ClockIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const items = [
  // {
  //   title: "Empresas",
  //   url: "/dashboard/empresas",
  //   rol: "Admin",
  //   icon: Building,
  // },
  // {
  //   title: "Usuarios",
  //   url: "/dashboard/usuarios",
  //   rol: "Admin",
  //   icon: UsersIcon,
  // },
  {
    title: "Empleados",
    url: "/panel/empleados",
    rol: "Recruiter",
    icon: UsersIcon,
  },
  {
    title: "Registro de asistencias",
    url: "/panel/registro-asistencia",
    rol: "Recruiter",
    icon: BadgeCheck,
  },
  // {
  //   title: "Postulaciones",
  //   url: "/home/postulaciones",
  //   rol: "User",
  //   icon: UsersIcon,
  // },
];

export function NavMain() {
  const router = useRouter();
  const path = usePathname();
  const { dataUser } = useAuth();

  const handleClick = (href) => {
    router.push(href);
  };

  let perfilRoute = "/home/cuenta"; // default

  if (dataUser?.tipo_usuario === "Recruiter") {
    perfilRoute = "/panel/cuenta";
  } else if (dataUser?.tipo_usuario === "Admin") {
    perfilRoute = "/dashboard/cuenta";
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map(
            (item) =>
              dataUser?.tipo_usuario === item.rol && (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    onClick={() => handleClick(item.url)}
                    className={`${
                      path === item.url ? "bg-slate-300 text-slate-900" : ""
                    } cursor-pointer`}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
          )}

          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Home"
              onClick={() => handleClick("/")}
              className="cursor-pointer"
            >
              <ClockIcon />
              <span>Reloj checador</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Perfil"
              onClick={() => handleClick(perfilRoute)}
              className="cursor-pointer"
            >
              <CircleUserRoundIcon />
              <span>Perfil</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
