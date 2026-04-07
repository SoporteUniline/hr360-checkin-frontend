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
  ClipboardCheck,
  CircleUserRoundIcon,
  ClockIcon,
  ClockArrowUp,
  BellRing,
  UserRound,
  BookOpen,
  Building,
  Store,
  HeartHandshake,
  Gift,
  HandCoins,
  MapPin,
  Route,
  BriefcaseBusiness,
  BarChart3,
  LayoutDashboard,
  FileText,
  CalendarDays,
  CalendarCheck2,
  FolderClosed,
  ShieldCheck,
  UserCog,
  Monitor,
  CreditCard,
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
    title: "Checadores",
    url: "/dashboard/checadores",
    rol: "Admin",
    icon: Monitor,
  },
  {
    title: "Planes",
    url: "/dashboard/planes",
    rol: "Admin",
    icon: CreditCard,
  },
  {
    title: "Mensajes sistema",
    url: "/dashboard/mensajes-sistema",
    rol: "Admin",
    icon: BellRing,
  },
  {
    title: "Cotizaciones",
    url: "/dashboard/cotizaciones",
    rol: "Admin",
    icon: FileText,
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
        icon: HeartHandshake,
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
        icon: HandCoins,
      },
      {
        title: "Aguinaldos",
        url: "/panel/aguinaldos",
        rol: "Recruiter",
        icon: Gift,
      },
      {
        title: "Mapa de rutas",
        url: "/panel/mapa-de-rutas",
        rol: "Recruiter",
        icon: Route,
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
        icon: ClipboardCheck,
      },
      {
        title: "Entradas y salidas",
        url: "/panel/registro-de-entradas-y-salidas",
        rol: "Recruiter",
        icon: ClockArrowUp,
      },
      {
        title: "Reloj Checador",
        url: "/seleccionar-reloj",
        rol: "Recruiter",
        icon: ClockIcon,
      },
      {
        title: "Reporte de horas",
        url: "/panel/reporte-horas",
        rol: "Recruiter",
        icon: BarChart3,
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
        icon: BookOpen,
          },
          {
            title: "Vacaciones por periodo",
            url: "/panel/vacaciones/por-periodo",
        icon: CalendarDays,
          },
          {
            title: "Registro de vacaciones",
            url: "/panel/vacaciones/registro",
        icon: CalendarDays,
          },
        ],
      },
      {
        title: "Permisos",
        url: "/panel/permisos",
        rol: "Recruiter",
        icon: CalendarCheck2,
      },
      {
        title: "Días festivos",
        url: "/panel/festivos",
        rol: "Recruiter",
        icon: CalendarDays,
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
        title: "Unidades de negocio",
        url: "/panel/catalogos/unidades-de-negocio",
        icon: Store,
        rol: "Recruiter",
      },
      {
        title: "Tipos de registro",
        url: "/panel/catalogos/tipos-registro",
        icon: BookOpen,
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
        icon: BellRing,
      },
      {
        title: "Usuarios con acceso",
        url: "/panel/usuarios-con-acceso",
        rol: "Recruiter",
        icon: ShieldCheck,
      },
      {
        title: "Mi suscripción",
        url: "/panel/mi-suscripcion",
        rol: "Recruiter",
        icon: CreditCard,
      },
    ],
  },
];

export function NavMain() {
  const router = useRouter();
  const path = usePathname();
  const { dataUser } = useAuth();
  const [open, setOpen] = useState();
  const effectiveRole =
    dataUser?.tipo_usuario === "User" ? "Recruiter" : dataUser?.tipo_usuario;

  const handleClick = (href) => {
    router.push(href);
  };

  let perfilRoute = "/home/cuenta";

  if (effectiveRole === "Recruiter") {
    perfilRoute = "/panel/cuenta";
  } else if (effectiveRole === "Admin") {
    perfilRoute = "/dashboard/empresas";
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {dashboardItems.map((item) => {
            if (item.rol && item.rol !== effectiveRole) return null;

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

          {effectiveRole !== "Admin" &&
            menuGroups.map((group) => {
              const itemsVisibles = group.items.filter(
                (item) => !item.rol || item.rol === effectiveRole,
              );
              if (itemsVisibles.length === 0) return null;

              return (
                <div key={group.group} className="mt-3">
                  <p className=" px-1 text-md font-bold mb-2 text-gray-700">
                    {group.group}
                  </p>

                  {group.items.map((item) => {
                    if (item.rol && item.rol !== effectiveRole)
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
                            path === item.url
                              ? "bg-slate-300 text-slate-900"
                              : ""
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
              );
            })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
