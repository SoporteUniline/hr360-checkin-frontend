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
  UsersIcon,
  BadgeCheck,
  ClipboardCheck,
  CircleUserRoundIcon,
  ClockIcon,
  LibraryBig,
  UserRound,
  BookText,
  Building,
  Store,
  Handshake,
  Landmark,
  PartyPopper,
  MapPin,
  BriefcaseBusiness,
  FileSpreadsheet,
  LayoutDashboard,
  FileText,
  CalendarDays,
  FolderClosed,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const items = [
  {
    title: "Dashboard",
    url: "/panel/dashboard",
    rol: "Recruiter",
    icon: LayoutDashboard,
  },
  {
    title: "Asistencias",
    url: "/panel/registro-asistencia",
    rol: "Recruiter",
    icon: BadgeCheck,
  },
  {
    title: "Catálogos",
    rol: "Recruiter",
    icon: LibraryBig,
    children: [
      {
        title: "Áreas de Check",
        url: "/panel/catalogos/areas-check",
        icon: MapPin,
      },
      {
        title: "Departamentos",
        url: "/panel/catalogos/departamentos",
        icon: Building,
      },
      {
        title: "Estado civil",
        url: "/panel/catalogos/estado-civil",
        icon: Handshake,
      },
      {
        title: "Puestos",
        url: "/panel/catalogos/puestos",
        icon: BriefcaseBusiness,
      },
      { title: "Sucursales", url: "/panel/catalogos/sucursales", icon: Store },
      {
        title: "Tipos de registro",
        url: "/panel/catalogos/tipos-registro",
        icon: BookText,
      },

      // {
      //   title: "Cuentas bancarias",
      //   url: "/panel/catalogos/cuentas-bancarias",
      //   icon: Landmark,
      // },
    ],
  },
  {
    title: "Permisos",
    url: "/panel/permisos",
    rol: "Recruiter",
    icon: FileText,
  },
  {
    title: "Días festivos",
    url: "/panel/festivos",
    rol: "Recruiter",
    icon: PartyPopper,
  },
  {
    title: "Reglas de aviso",
    url: "/panel/reglas-aviso",
    rol: "Recruiter",
    icon: CalendarDays,
  },
  {
    // Menú desplegable de Vacaciones (como Catálogos)
    // Relacionado con: /panel/vacaciones y /panel/vacaciones/por-ley
    title: "Vacaciones",
    rol: "Recruiter",
    icon: CalendarDays,
    children: [
      {
        title: "Panel vacaciones",
        url: "/panel/vacaciones",
        icon: CalendarDays,
      },
      {
        title: "Vacaciones por ley",
        url: "/panel/vacaciones/por-ley",
        icon: Landmark,
      },
      {
        title: "Vacaciones por periodo",
        url: "/panel/vacaciones/por-periodo",
        icon: FileText,
      },
      {
        title: "Registro de vacaciones",
        // Nueva vista que reutiliza la tabla de asistencias filtrando por Vacaciones
        // Relacionado con: src/app/panel/vacaciones/registro/page.jsx
        url: "/panel/vacaciones/registro",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: "Empleados",
    url: "/panel/empleados",
    rol: "Recruiter",
    icon: UsersIcon,
  },
  {
    title: "Entradas y salidas",
    url: "/panel/registro-de-entradas-y-salidas",
    rol: "Recruiter",
    icon: ClipboardCheck,
  },
  {
    title: "Reporte de horas",
    url: "/panel/reporte-horas",
    rol: "Recruiter",
    icon: FileSpreadsheet,
  },
  // {
  //   title: "Actas administrativas",
  //   url: "/panel/actas-administrativas",
  //   rol: "Recruiter",
  //   icon: FolderClosed,
  // },
  {
    title: "Perfil",
    rol: "Recruiter",
    icon: CircleUserRoundIcon,
    url: "/panel/cuenta",
  },
  {
    title: "Reloj Checador",
    url: "/",
    rol: "Recruiter",
    icon: ClockIcon,
  },
  {
    title: "Solicitud de permisos",
    url: "/empleado/panel/solicitudes",
    rol: "Empleado",
    icon: FileText,
  },
  {
    title: "Reloj Checador",
    url: "/empleado/reloj-checador",
    rol: "Empleado",
    icon: ClockIcon,
  },
];

export function NavMain() {
  const router = useRouter();
  const path = usePathname();
  const { dataUser } = useAuth();
  const [open, setOpen] = useState();

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
                    onClick={() => {
                      if (item.children) {
                        setOpen(open === item.title ? null : item.title);
                      } else {
                        handleClick(item.url);
                      }
                    }}
                    className={`${
                      path === item.url ? "bg-slate-300 text-slate-900" : ""
                    } cursor-pointer flex justify-between`}
                  >
                    <div className="flex items-center gap-2">
                      {item.icon && <item.icon size={16} />}
                      <span>{item.title}</span>
                    </div>
                    {item.children && (
                      <span className="text-xs">
                        {open === item.title ? "▲" : "▼"}
                      </span>
                    )}
                  </SidebarMenuButton>

                  {/* Submenú */}
                  {item.children && open === item.title && (
                    <div className="ml-6 mt-1 flex flex-col gap-1">
                      {item.children.map((child) => (
                        <SidebarMenuButton
                          key={child.title}
                          tooltip={child.title}
                          onClick={() => handleClick(child.url)}
                          className={`${
                            path === child.url
                              ? "bg-slate-200 text-slate-900"
                              : ""
                          } cursor-pointer flex items-center gap-2 text-sm`}
                        >
                          {child.icon && <child.icon size={16} />}
                          <span>{child.title}</span>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  )}
                </SidebarMenuItem>
              )
          )}

          {/* <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Home"
              onClick={() => handleClick("/")}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ClockIcon size={24} />
                <span>Reloj checador</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem> */}
          {/* <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Perfil"
              onClick={() => handleClick(perfilRoute)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CircleUserRoundIcon size={16} />
                <span>Perfil</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem> */}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
