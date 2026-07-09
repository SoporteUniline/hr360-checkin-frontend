"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
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
  FileBarChart2,
  LayoutDashboard,
  FileText,
  CalendarDays,
  CalendarCheck2,
  FolderClosed,
  ShieldCheck,
  UserCog,
  Monitor,
  CreditCard,
  Landmark,
  LayoutTemplate,
  FilePlus2,
  FolderOpen,
  SlidersHorizontal,
  ReceiptText,
} from "lucide-react";
import {
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  // {
  //   title: "Contrataciones",
  //   url: "/dashboard/contrataciones",
  //   rol: "Admin",
  //   icon: CreditCard,
  // },
  {
    title: "Facturación",
    url: "/dashboard/facturacion",
    rol: "Admin",
    icon: ReceiptText,
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
    title: "Cuentas bancarias",
    url: "/dashboard/cuentas-bancarias",
    rol: "Admin",
    icon: Landmark,
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
      {
        title: "Reportes personalizados",
        url: "/panel/reportes-personalizados",
        rol: "Recruiter",
        icon: FileBarChart2,
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
    group: "📄 GESTIÓN DOCUMENTAL",
    items: [
      {
        title: "Biblioteca documental",
        url: "/panel/gestion-documental/biblioteca",
        rol: "Recruiter",
        icon: FolderOpen,
      },
      {
        title: "Plantillas",
        url: "/panel/gestion-documental/plantillas",
        rol: "Recruiter",
        icon: LayoutTemplate,
      },
      {
        title: "Generar documento",
        url: "/panel/gestion-documental/generar",
        rol: "Recruiter",
        icon: FilePlus2,
      },
      {
        title: "Documentos emitidos",
        url: "/panel/gestion-documental/documentos",
        rol: "Recruiter",
        icon: FolderOpen,
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
        title: "Config. checador",
        url: "/panel/configuracion-checador",
        rol: "Recruiter",
        icon: SlidersHorizontal,
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

// Normaliza para el buscador: minúsculas y sin acentos ("Días" -> "dias")
const normalizar = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const GRUPOS_ABIERTOS_KEY = "sidebar-grupos-abiertos";

export function NavMain() {
  const router = useRouter();
  const path = usePathname();
  const { dataUser } = useAuth();
  const [open, setOpen] = useState();
  const [busqueda, setBusqueda] = useState("");
  // Colapso por módulo: todos abiertos por defecto; se recuerda en localStorage.
  const [gruposAbiertos, setGruposAbiertos] = useState({});
  const effectiveRole =
    dataUser?.tipo_usuario === "User" ? "Recruiter" : dataUser?.tipo_usuario;

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(GRUPOS_ABIERTOS_KEY);
      if (guardado) setGruposAbiertos(JSON.parse(guardado));
    } catch {
      // si falla la lectura se quedan todos abiertos
    }
  }, []);

  const persistirGrupos = (next) => {
    try {
      window.localStorage.setItem(GRUPOS_ABIERTOS_KEY, JSON.stringify(next));
    } catch {
      // sin persistencia si localStorage no está disponible
    }
    return next;
  };

  const toggleGrupo = (nombre) => {
    setGruposAbiertos((prev) =>
      persistirGrupos({
        ...prev,
        [nombre]: prev[nombre] === false ? true : false,
      }),
    );
  };

  // ¿Hay al menos un módulo contraído? (para alternar expandir/contraer todo)
  const hayContraidos = menuGroups.some(
    (g) => gruposAbiertos[g.group] === false,
  );

  const toggleTodos = () => {
    const next = {};
    menuGroups.forEach((g) => {
      next[g.group] = hayContraidos ? true : false;
    });
    setGruposAbiertos(persistirGrupos(next));
  };

  const q = normalizar(busqueda.trim());
  const buscando = q.length > 0;

  // Un item coincide si su título (o el del grupo) contiene la búsqueda;
  // en items con submenú también cuentan los títulos de los hijos.
  const filtrarItems = (items, grupoCoincide) =>
    items.filter((item) => {
      if (!buscando || grupoCoincide) return true;
      if (normalizar(item.title).includes(q)) return true;
      if (item.children) {
        return item.children.some((c) => normalizar(c.title).includes(q));
      }
      return false;
    });

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
        <div className="relative px-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <SidebarInput
            placeholder="Buscar en el menú..."
            className="pl-8"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        {effectiveRole !== "Admin" && !buscando && (
          <div className="flex justify-end px-1">
            <button
              type="button"
              onClick={toggleTodos}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800 cursor-pointer transition-colors"
            >
              {hayContraidos ? (
                <>
                  <ChevronsUpDown size={13} /> Expandir todo
                </>
              ) : (
                <>
                  <ChevronsDownUp size={13} /> Contraer todo
                </>
              )}
            </button>
          </div>
        )}
        <SidebarMenu>
          {dashboardItems.map((item) => {
            if (item.rol && item.rol !== effectiveRole) return null;
            if (buscando && !normalizar(item.title).includes(q)) return null;

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
              const grupoCoincide = buscando
                ? normalizar(group.group).includes(q)
                : false;
              const itemsVisibles = filtrarItems(
                group.items.filter(
                  (item) => !item.rol || item.rol === effectiveRole,
                ),
                grupoCoincide,
              );
              if (itemsVisibles.length === 0) return null;

              // Al buscar siempre se muestra expandido; si no, manda el usuario.
              const abierto = buscando
                ? true
                : gruposAbiertos[group.group] !== false;

              return (
                <div key={group.group} className="mt-3">
                  <button
                    type="button"
                    onClick={() => toggleGrupo(group.group)}
                    className="w-full px-1 mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-500 cursor-pointer flex items-center justify-between select-none transition-colors hover:text-gray-800"
                    aria-expanded={abierto}
                  >
                    <span>{group.group}</span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-gray-400 transition-transform duration-200 ${
                        abierto ? "" : "-rotate-90"
                      }`}
                    />
                  </button>

                  {abierto &&
                    itemsVisibles.map((item) => {
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            tooltip={item.title}
                            onClick={() => {
                              if (item.children) {
                                setOpen(
                                  open === item.title ? null : item.title,
                                );
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

                          {item.children &&
                            (open === item.title || buscando) && (
                              <div className="ml-6 mt-1 flex flex-col gap-1">
                                {item.children
                                  .filter(
                                    (child) =>
                                      !buscando ||
                                      grupoCoincide ||
                                      normalizar(item.title).includes(q) ||
                                      normalizar(child.title).includes(q),
                                  )
                                  .map((child) => (
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
