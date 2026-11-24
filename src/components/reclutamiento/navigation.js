import {
  LayoutDashboard,
  BriefcaseBusiness,
  Users,
  Columns3,
  CalendarDays,
  UserCheck,
  Layers,
} from "lucide-react";

export const RECRUITMENT_BASE = "/panel/reclutamiento";
export const ENTREVISTAS_REAL = "/panel/whatsapp?vista=entrevistas";
// Entradas del menú que distinguen la vista por la consulta (?vista=…) además de la ruta.
const CON_CONSULTA = [ENTREVISTAS_REAL];
export const RECRUITMENT_NAV = [
  {
    key: "dashboard",
    label: "Dashboard",
    title: "Dashboard de reclutamiento",
    description: "Lo que está pasando y lo que sigue para encontrar a tu próximo equipo.",
    href: RECRUITMENT_BASE,
    icon: LayoutDashboard,
  },
  {
    key: "vacancies",
    label: "Vacantes",
    title: "Tus vacantes",
    description: "Crea oportunidades, comparte el puesto y sigue cada proceso.",
    href: `${RECRUITMENT_BASE}/vacantes`,
    icon: BriefcaseBusiness,
    matchPrefix: true,
  },
  {
    key: "candidates",
    label: "Candidatos",
    title: "Tu comunidad de candidatos",
    description: "Encuentra cualquier perfil y consulta su expediente completo.",
    href: `${RECRUITMENT_BASE}/candidatos`,
    icon: Users,
    matchPrefix: true,
  },
  {
    key: "selection",
    label: "Selección",
    title: "Proceso de selección",
    description: "Visualiza en qué etapa está cada persona y define el siguiente paso.",
    href: `${RECRUITMENT_BASE}/seleccion`,
    icon: Columns3,
  },
  {
    key: "interviews",
    label: "Entrevistas",
    title: "Agenda de entrevistas",
    description: "Organiza las conversaciones de tu equipo y registra su seguimiento.",
    // La agenda real (citas de WhatsApp), no la maqueta de /panel/reclutamiento/entrevistas.
    href: ENTREVISTAS_REAL,
    icon: CalendarDays,
  },
  {
    key: "hiring",
    label: "Contrataciones",
    title: "Próximas incorporaciones",
    description: "De la oferta aceptada al primer día: prepara cada ingreso.",
    href: `${RECRUITMENT_BASE}/contrataciones`,
    icon: UserCheck,
  },
  {
    key: "catalogs",
    label: "Catálogos",
    title: "Catálogos de reclutamiento",
    description: "Sucursales y modalidades organizadas para crear vacantes más rápido.",
    href: `${RECRUITMENT_BASE}/catalogos`,
    icon: Layers,
  },
];
// `consulta`: la búsqueda actual sin «?» (p. ej. «vista=entrevistas»). Una entrada con consulta solo se activa con ella;
// la entrada de la misma ruta sin consulta (Conversaciones) no se activa cuando la consulta es de otra entrada.
export const isRecruitmentNavActive = (path, item, consulta = "") => {
  const url = item.href || item.url || "";
  const [base, q] = url.split("?");
  const actual = consulta ? `${path}?${consulta}` : path;
  if (q) return actual === url;
  if (path === base && CON_CONSULTA.includes(actual)) return false;
  return path === base || (!!item.matchPrefix && path.startsWith(`${base}/`));
};
export const vacancyHref = (id, tab = "vacancy") =>
  `${RECRUITMENT_BASE}/vacantes/${encodeURIComponent(id)}${
    tab === "vacancy" ? "" : `?seccion=${encodeURIComponent(tab)}`
  }`;
export const candidateHref = (id, tab = "profile") =>
  `${RECRUITMENT_BASE}/candidatos/${encodeURIComponent(id)}${
    tab === "profile" ? "" : `?seccion=${encodeURIComponent(tab)}`
  }`;
