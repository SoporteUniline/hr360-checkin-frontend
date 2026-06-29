"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  Building2,
  BriefcaseBusiness,
  FileText,
  CalendarClock,
  ClipboardList,
  ReceiptText,
  ClipboardCheck,
  LogIn,
  Search,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  LayoutDashboard,
  ClockArrowUp,
  Clock,
  BarChart3,
  CalendarDays,
  CalendarCheck2,
  BookOpen,
  MapPin,
  Store,
  BellRing,
  ShieldCheck,
  CreditCard,
  Landmark,
  Monitor,
  HeartHandshake,
  Gift,
  HandCoins,
  Route,
  UserRound,
} from "lucide-react";

// ─── Nav items estáticos (espejo del sidebar) ────────────────────────────────
// rol: "Admin" | "Recruiter" (User también mapea a Recruiter)
const ALL_NAV_ITEMS = [
  // Admin
  {
    title: "Empresas",
    url: "/dashboard/empresas",
    rol: "Admin",
    section: "Admin",
    icon: Building2,
  },
  {
    title: "Usuarios",
    url: "/dashboard/usuarios",
    rol: "Admin",
    section: "Admin",
    icon: Users,
  },
  {
    title: "Checadores",
    url: "/dashboard/checadores",
    rol: "Admin",
    section: "Admin",
    icon: Monitor,
  },
  {
    title: "Planes",
    url: "/dashboard/planes",
    rol: "Admin",
    section: "Admin",
    icon: CreditCard,
  },
  {
    title: "Facturación",
    url: "/dashboard/facturacion",
    rol: "Admin",
    section: "Admin",
    icon: ReceiptText,
  },
  {
    title: "Mensajes sistema",
    url: "/dashboard/mensajes-sistema",
    rol: "Admin",
    section: "Admin",
    icon: BellRing,
  },
  {
    title: "Cotizaciones",
    url: "/dashboard/cotizaciones",
    rol: "Admin",
    section: "Admin",
    icon: FileText,
  },
  {
    title: "Cuentas bancarias",
    url: "/dashboard/cuentas-bancarias",
    rol: "Admin",
    section: "Admin",
    icon: Landmark,
  },
  // Recruiter — General
  {
    title: "Dashboard",
    url: "/panel/dashboard",
    rol: "Recruiter",
    section: "General",
    icon: LayoutDashboard,
  },
  // Gestión de personal
  {
    title: "Empleados",
    url: "/panel/empleados",
    rol: "Recruiter",
    section: "Gestión de Personal",
    icon: Users,
  },
  {
    title: "Panel empleado",
    url: "/panel/panel-empleado",
    rol: "Recruiter",
    section: "Gestión de Personal",
    icon: UserRound,
  },
  {
    title: "Departamentos",
    url: "/panel/catalogos/departamentos",
    rol: "Recruiter",
    section: "Gestión de Personal",
    icon: Building2,
  },
  {
    title: "Puestos",
    url: "/panel/catalogos/puestos",
    rol: "Recruiter",
    section: "Gestión de Personal",
    icon: BriefcaseBusiness,
  },
  {
    title: "Estado civil",
    url: "/panel/catalogos/estado-civil",
    rol: "Recruiter",
    section: "Gestión de Personal",
    icon: HeartHandshake,
  },
  {
    title: "Contratos",
    url: "/panel/contratos",
    rol: "Recruiter",
    section: "Gestión de Personal",
    icon: FileText,
  },
  {
    title: "Actas administrativas",
    url: "/panel/actas-administrativas",
    rol: "Recruiter",
    section: "Gestión de Personal",
    icon: ClipboardList,
  },
  {
    title: "Finiquitos y liquidaciones",
    url: "/panel/finiquitos-y-liquidaciones",
    rol: "Recruiter",
    section: "Gestión de Personal",
    icon: HandCoins,
  },
  {
    title: "Aguinaldos",
    url: "/panel/aguinaldos",
    rol: "Recruiter",
    section: "Gestión de Personal",
    icon: Gift,
  },
  {
    title: "Mapa de rutas",
    url: "/panel/mapa-de-rutas",
    rol: "Recruiter",
    section: "Gestión de Personal",
    icon: Route,
  },
  // Control de tiempo
  {
    title: "Asistencias",
    url: "/panel/registro-asistencia",
    rol: "Recruiter",
    section: "Control de Tiempo",
    icon: ClipboardCheck,
  },
  {
    title: "Entradas y salidas",
    url: "/panel/registro-de-entradas-y-salidas",
    rol: "Recruiter",
    section: "Control de Tiempo",
    icon: ClockArrowUp,
  },
  {
    title: "Reloj checador",
    url: "/seleccionar-reloj",
    rol: "Recruiter",
    section: "Control de Tiempo",
    icon: Clock,
  },
  {
    title: "Reporte de horas",
    url: "/panel/reporte-horas",
    rol: "Recruiter",
    section: "Control de Tiempo",
    icon: BarChart3,
  },
  // Ausencias y permisos
  {
    title: "Vacaciones",
    url: "/panel/vacaciones",
    rol: "Recruiter",
    section: "Ausencias y Permisos",
    icon: CalendarDays,
  },
  {
    title: "Vacaciones por ley",
    url: "/panel/vacaciones/por-ley",
    rol: "Recruiter",
    section: "Ausencias y Permisos",
    icon: BookOpen,
  },
  {
    title: "Vacaciones por periodo",
    url: "/panel/vacaciones/por-periodo",
    rol: "Recruiter",
    section: "Ausencias y Permisos",
    icon: CalendarDays,
  },
  {
    title: "Permisos",
    url: "/panel/permisos",
    rol: "Recruiter",
    section: "Ausencias y Permisos",
    icon: CalendarCheck2,
  },
  {
    title: "Días festivos",
    url: "/panel/festivos",
    rol: "Recruiter",
    section: "Ausencias y Permisos",
    icon: CalendarDays,
  },
  // Catálogos
  {
    title: "Áreas de Check",
    url: "/panel/catalogos/areas-check",
    rol: "Recruiter",
    section: "Catálogos",
    icon: MapPin,
  },
  {
    title: "Unidades de negocio",
    url: "/panel/catalogos/unidades-de-negocio",
    rol: "Recruiter",
    section: "Catálogos",
    icon: Store,
  },
  {
    title: "Tipos de registro",
    url: "/panel/catalogos/tipos-registro",
    rol: "Recruiter",
    section: "Catálogos",
    icon: BookOpen,
  },
  // Ajustes
  {
    title: "Reglas de aviso",
    url: "/panel/reglas-aviso",
    rol: "Recruiter",
    section: "Ajustes",
    icon: BellRing,
  },
  {
    title: "Usuarios con acceso",
    url: "/panel/usuarios-con-acceso",
    rol: "Recruiter",
    section: "Ajustes",
    icon: ShieldCheck,
  },
  {
    title: "Mi suscripción",
    url: "/panel/mi-suscripcion",
    rol: "Recruiter",
    section: "Ajustes",
    icon: CreditCard,
  },
];

// ─── Grupos de resultados de API ──────────────────────────────────────────────
const GROUPS = [
  {
    key: "empleados",
    label: "EMPLEADOS",
    icon: Users,
    route: (item) => `/panel/empleados?id=${item.id}`,
    hint: (item) => item.subtitulo || "",
  },
  {
    key: "departamentos",
    label: "DEPARTAMENTOS",
    icon: Building2,
    route: (item) =>
      `/panel/catalogos/departamentos?id=${item.id}&nombre=${encodeURIComponent(
        item.titulo,
      )}`,
    hint: () => "",
  },
  {
    key: "puestos",
    label: "PUESTOS",
    icon: BriefcaseBusiness,
    route: (item) =>
      `/panel/catalogos/puestos?id=${item.id}&nombre=${encodeURIComponent(
        item.titulo,
      )}`,
    hint: () => "",
  },
  {
    key: "contratos",
    label: "CONTRATOS",
    icon: FileText,
    route: (item) => `/panel/contratos?id=${item.id}`,
    hint: (item) => item.subtitulo || "",
  },
  {
    key: "permisos",
    label: "PERMISOS",
    icon: CalendarClock,
    route: (item) => `/panel/permisos?id=${item.id}`,
    hint: (item) => item.subtitulo || "",
  },
  {
    key: "actas",
    label: "ACTAS ADMINISTRATIVAS",
    icon: ClipboardList,
    route: () => `/panel/actas-administrativas`,
    hint: (item) => item.subtitulo || "",
  },
  {
    key: "finiquitos",
    label: "FINIQUITOS",
    icon: ReceiptText,
    route: () => `/panel/finiquitos-y-liquidaciones`,
    hint: (item) => item.subtitulo || "",
  },
  {
    key: "asistencia_hoy",
    label: "ASISTENCIA",
    icon: ClipboardCheck,
    route: (item) =>
      `/panel/registro-asistencia?empleado=${encodeURIComponent(item.titulo)}${
        item.fecha_registro ? `&fecha=${item.fecha_registro}` : ""
      }`,
    hint: (item) => item.subtitulo || "",
  },
  {
    key: "movimientos_hoy",
    label: "ENTRADAS Y SALIDAS",
    icon: LogIn,
    route: (item) =>
      `/panel/registro-de-entradas-y-salidas?empleado=${encodeURIComponent(
        item.titulo,
      )}${item.fecha_movimiento ? `&fecha=${item.fecha_movimiento}` : ""}`,
    hint: (item) => item.subtitulo || "",
  },
  {
    key: "estados_civiles",
    label: "ESTADOS CIVILES",
    icon: HeartHandshake,
    route: (item) =>
      `/panel/catalogos/estado-civil?id=${item.id}&nombre=${encodeURIComponent(
        item.titulo,
      )}`,
    hint: () => "",
  },
  {
    key: "areas_check",
    label: "ÁREAS DE CHECK",
    icon: MapPin,
    route: (item) =>
      `/panel/catalogos/areas-check?id=${item.id}&nombre=${encodeURIComponent(
        item.titulo,
      )}`,
    hint: () => "",
  },
  {
    key: "unidades_negocio",
    label: "UNIDADES DE NEGOCIO",
    icon: Store,
    route: (item) =>
      `/panel/catalogos/unidades-de-negocio?id=${
        item.id
      }&nombre=${encodeURIComponent(item.titulo)}`,
    hint: () => "",
  },
  {
    key: "dias_festivos",
    label: "DÍAS FESTIVOS",
    icon: CalendarDays,
    route: () => `/panel/festivos`,
    hint: (item) => item.subtitulo || "",
  },
  {
    key: "tipos_permiso",
    label: "TIPOS DE REGISTRO",
    icon: BookOpen,
    route: (item) =>
      `/panel/catalogos/tipos-registro?filter=${encodeURIComponent(
        item.titulo,
      )}`,
    hint: (item) => item.subtitulo || "",
  },
  {
    key: "aguinaldos",
    label: "AGUINALDOS",
    icon: Gift,
    route: (item) =>
      `/panel/aguinaldos?nombre=${encodeURIComponent(item.titulo)}`,
    hint: (item) => item.subtitulo || "",
  },
  {
    key: "usuarios_accesos",
    label: "USUARIOS CON ACCESO",
    icon: ShieldCheck,
    route: (item) =>
      `/panel/usuarios-con-acceso?nombre=${encodeURIComponent(item.titulo)}`,
    hint: (item) => item.subtitulo || "",
  },
];

function hasResults(data, navItems) {
  return (
    (data && GROUPS.some((g) => (data[g.key] || []).length > 0)) ||
    navItems.length > 0
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const router = useRouter();
  const { dataUser } = useAuth();

  // Rol efectivo: "User" → "Recruiter", igual que en NavMain
  const effectiveRole =
    dataUser?.tipo_usuario === "User" ? "Recruiter" : dataUser?.tipo_usuario;

  // Filtrado de nav items — client-side, instantáneo
  const navResults = useMemo(() => {
    if (!query || query.length < 2 || !effectiveRole) return [];
    const q = query.toLowerCase();
    return ALL_NAV_ITEMS.filter(
      (item) =>
        item.rol === effectiveRole &&
        (item.title.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q)),
    ).slice(0, 6);
  }, [query, effectiveRole]);

  // Abrir/cerrar con Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const customHandler = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("open-command-palette", customHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("open-command-palette", customHandler);
    };
  }, []);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setData(null);
    }
  }, [open]);

  // Búsqueda API con debounce
  const search = useCallback(async (q) => {
    if (q.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: result } = await axiosInstance.get(
        `/checador/busqueda-global?q=${encodeURIComponent(q)}`,
      );
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 220);
  };

  const handleSelect = (route) => {
    setOpen(false);
    router.push(route);
  };

  if (!open) return null;

  const showEmpty =
    query.length >= 2 && !loading && data && !hasResults(data, navResults);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      {/* Backdrop - pointer-events-none para que los toques pasen al div padre */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />

      {/* Palette */}
      <div
        className="relative w-full max-w-[600px] mx-4 animate-in fade-in slide-in-from-top-4 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          shouldFilter={false}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          {/* Input */}
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={handleQueryChange}
              placeholder="Buscar páginas, empleados, contratos..."
              className="flex-1 py-3.5 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            {loading && (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
            )}
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-muted-foreground">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            {/* Estado vacío */}
            {query.length < 2 && (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Escribe al menos 2 caracteres para buscar
              </div>
            )}

            {/* Sin resultados */}
            {showEmpty && (
              <Command.Empty className="py-10 text-center text-xs text-muted-foreground">
                Sin resultados para &laquo;{query}&raquo;
              </Command.Empty>
            )}

            {/* ── Grupo PÁGINAS (client-side, instantáneo) ── */}
            {navResults.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    PÁGINAS
                  </span>
                }
                className="mb-1"
              >
                {navResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={`nav-${item.url}`}
                      value={`nav-${item.url}`}
                      onSelect={() => handleSelect(item.url)}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-foreground
                                 data-[selected=true]:bg-blue-100 data-[selected=true]:text-blue-900
                                 hover:bg-accent/10 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {item.section}
                        </p>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* ── Grupos de resultados de API ── */}
            {query.length >= 2 &&
              !loading &&
              data &&
              GROUPS.map((group) => {
                const items = data[group.key] || [];
                if (items.length === 0) return null;
                const Icon = group.icon;
                return (
                  <Command.Group
                    key={group.key}
                    heading={
                      <span className="px-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {group.label}
                      </span>
                    }
                    className="mb-1"
                  >
                    {items.map((item) => (
                      <Command.Item
                        key={`${group.key}-${item.id}`}
                        value={`${group.key}-${item.id}`}
                        onSelect={() => handleSelect(group.route(item))}
                        className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-foreground
                                   data-[selected=true]:bg-blue-100 data-[selected=true]:text-blue-900
                                   hover:bg-accent/10 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {item.titulo}
                          </p>
                          {item.subtitulo && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {item.subtitulo}
                            </p>
                          )}
                        </div>
                        {group.hint(item) && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {group.hint(item)}
                          </span>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-muted/30">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                ↑↓
              </kbd>
              navegar
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                ↵
              </kbd>
              abrir
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                esc
              </kbd>
              cerrar
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
