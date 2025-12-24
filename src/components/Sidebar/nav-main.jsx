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

const dashboardItems = [
  {
    title: "Empresas",
    url: "/dashboard/empresas",
    rol: "Admin",
    icon: Building,
  },
  {
    title: "Usuarios",
    url: "/dashboard/usuarios",
    rol: "Admin",
    icon: UsersIcon,
  },
  {
    title: "Dashboard",
    url: "/panel/dashboard",
    rol: "Recruiter",
    icon: LayoutDashboard,
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

const menuGroups = [
  {
    group: "👥 GESTIÓN DE PERSONAL",
    items: [
      {
        title: "Empleados",
        url: "/panel/empleados",
        rol: "Recruiter",
        icon: UsersIcon,
      },
      {
        title: "Panel empleado",
        url: "/panel/panel-empleado",
        rol: "Recruiter",
        icon: UserRound,
      },
      {
        title: "Perfil",
        url: "/panel/cuenta",
        rol: "Recruiter",
        icon: CircleUserRoundIcon,
      },
      {
        title: "Departamentos",
        url: "/panel/catalogos/departamentos",
        rol: "Recruiter",
        icon: Building,
      },
      {
        title: "Puestos",
        url: "/panel/catalogos/puestos",
        rol: "Recruiter",
        icon: BriefcaseBusiness,
      },
      {
        title: "Estado civil",
        url: "/panel/catalogos/estado-civil",
        rol: "Recruiter",
        icon: Handshake,
      },
      {
        title: "Contratos",
        url: "/panel/contratos",
        rol: "Recruiter",
        icon: FileText,
      },
      {
        title: "Actas administrativas",
        url: "/panel/actas-administrativas",
        rol: "Recruiter",
        icon: FolderClosed,
      },
      {
        title: "Finiquitos y liquidaciones",
        url: "/panel/finiquitos-y-liquidaciones",
        rol: "Recruiter",
        icon: FileText,
      },
      {
        title: "Aguinaldos",
        url: "/panel/aguinaldos",
        rol: "Recruiter",
        icon: FileText,
      },
      {
        title: "Mapa de rutas",
        url: "/panel/mapa-de-rutas",
        rol: "Recruiter",
        icon: MapPin,
      },
    ],
  },
  {
    group: "⏰ CONTROL DE TIEMPO",
    items: [
      {
        title: "Asistencias",
        url: "/panel/registro-asistencia",
        rol: "Recruiter",
        icon: BadgeCheck,
      },
      {
        title: "Entradas y salidas",
        url: "/panel/registro-de-entradas-y-salidas",
        rol: "Recruiter",
        icon: ClipboardCheck,
      },
      {
        title: "Reloj Checador",
        url: "/",
        rol: "Recruiter",
        icon: ClockIcon,
      },
      {
        title: "Reporte de horas",
        url: "/panel/reporte-horas",
        rol: "Recruiter",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    group: "📅 AUSENCIAS Y PERMISOS",
    items: [
      {
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
            url: "/panel/vacaciones/registro",
            icon: ClipboardCheck,
          },
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
    ],
  },
  {
    group: "📚 CATÁLOGOS BASE",
    items: [
      {
        title: "Áreas de Check",
        url: "/panel/catalogos/areas-check",
        icon: MapPin,
        rol: "Recruiter",
      },
      {
        title: "Sucursales",
        url: "/panel/catalogos/sucursales",
        icon: Store,
        rol: "Recruiter",
      },
      {
        title: "Tipos de registro",
        url: "/panel/catalogos/tipos-registro",
        icon: BookText,
        rol: "Recruiter",
      },
    ],
  },
  {
    group: "🔧 AJUSTES",
    items: [
      {
        title: "Reglas de aviso",
        url: "/panel/reglas-aviso",
        rol: "Recruiter",
        icon: CalendarDays,
      },
    ],
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
    perfilRoute = "/dashboard/empresas";
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {dashboardItems.map((item) => {
            if (item.rol && item.rol !== dataUser?.tipo_usuario) return null;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={() => handleClick(item.url)}
                  className={`${
                    path === item.url ? "bg-slate-300 text-slate-900" : ""
                  } cursor-pointer flex justify-between`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon && <item.icon size={16} />}
                    <span>{item.title}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {dataUser?.tipo_usuario !== "Admin" &&
            menuGroups.map((group) => (
              <div key={group.group} className="mt-3">
                <p className=" px-1 text-md font-bold mb-2 text-gray-700">
                  {group.group}
                </p>

                {group.items.map((item) => {
                  if (item.rol && item.rol !== dataUser?.tipo_usuario)
                    return null;

                  return (
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
                  );
                })}
              </div>
            ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
