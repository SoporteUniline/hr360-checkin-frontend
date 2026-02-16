import Link from "next/link";
import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  Clock3,
  FileText,
  Fingerprint,
  FolderKanban,
  MapPin,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const dashboardTags = [
  "Informacion general",
  "Permisos",
  "Asistencias",
  "Entradas y salidas",
  "Contratos",
  "Vacaciones",
];

const moduleSections = [
  {
    id: "gestion-personal",
    title: "Gestion de Personal",
    subtitle: "Control total del capital humano",
    href: "/funcionalidades/colaboradores",
    cta: "Explorar modulo",
    icon: Users,
    cards: [
      {
        id: "empleados",
        title: "Empleados",
        description: "Base de datos completa con alta, edicion y filtros avanzados.",
        details: [
          "Alta y edicion completa de informacion laboral y personal.",
          "Filtros por departamento, puesto, sucursal y estado laboral.",
          "Perfiles organizados con historial y documentos clave.",
        ],
      },
      {
        id: "perfil",
        title: "Perfil",
        description: "Informacion detallada de cada colaborador centralizada.",
        details: [
          "Datos personales, laborales y de contacto en un solo lugar.",
          "Consulta de emergencia, NSS, RFC, CURP y beneficios.",
          "Vista pensada para RH y lideres de equipo.",
        ],
      },
      {
        id: "departamentos",
        title: "Departamentos",
        description: "Organizacion por areas y equipos de trabajo.",
        details: [
          "Catalogo de departamentos personalizable.",
          "Asignacion de personal por area.",
          "Reportes por departamento para mejor toma de decisiones.",
        ],
      },
      {
        id: "puestos",
        title: "Puestos",
        description: "Catalogo de posiciones, jerarquias y rangos salariales.",
        details: [
          "Definicion de roles por unidad operativa.",
          "Jerarquias y relaciones de reporte configurables.",
          "Clasificacion salarial y beneficios por puesto.",
        ],
      },
      {
        id: "contratos",
        title: "Contratos",
        description: "Administracion documental con vigencias y renovaciones.",
        href: "/funcionalidades/contratos",
        details: [
          "Alertas de vencimiento para renovacion oportuna.",
          "Historial de contratos activos, vencidos y renovados.",
          "Seguimiento por estado: activo, por vencer y vencido.",
        ],
      },
      {
        id: "actas",
        title: "Actas administrativas",
        description: "Registro formal de incidencias laborales y exportacion a PDF.",
        details: [
          "Generacion automatica de actas con formato profesional.",
          "Plantillas personalizadas por politicas internas.",
          "Repositorio historico por colaborador.",
        ],
      },
    ],
  },
  {
    id: "control-tiempo",
    title: "Control de Tiempo",
    subtitle: "Asistencias y puntualidad con tecnologia",
    href: "/funcionalidades/reloj-checador",
    cta: "Explorar modulo",
    icon: Clock3,
    cards: [
      {
        id: "asistencias",
        title: "Asistencias",
        description: "Control diario de asistencia y justificaciones.",
        details: [
          "Registro diario de asistencia e inasistencias.",
          "Justificaciones con notas y evidencia.",
          "Estadisticas por persona, area o empresa.",
        ],
      },
      {
        id: "entradas-salidas",
        title: "Entradas y salidas",
        description: "Registro completo de movimientos por jornada.",
        details: [
          "Hora exacta de entrada y salida por colaborador.",
          "Deteccion automatica de tardanzas.",
          "Filtros por dia, semana, mes y rango personalizado.",
        ],
      },
      {
        id: "reloj-checador",
        title: "Reloj Checador",
        description: "Reconocimiento facial + GPS para control 100% anti-fraude.",
        href: "/funcionalidades/reloj-checador",
        featured: true,
        details: [
          "Validacion biometrica y GPS en tiempo real.",
          "Check-in seguro desde app movil.",
          "Evidencia fotografica por marcacion.",
        ],
      },
      {
        id: "reporte-horas",
        title: "Reporte de horas",
        description: "Analisis de jornadas y exportacion para nomina.",
        details: [
          "Calculo automatico de horas por periodo.",
          "Identificacion de horas extra.",
          "Exportacion en formatos de uso administrativo.",
        ],
      },
    ],
  },
  {
    id: "ausencias-permisos",
    title: "Ausencias y Permisos",
    subtitle: "Gestion alineada con normativa laboral",
    href: "/funcionalidades/dashboard-empleados",
    cta: "Explorar modulo",
    icon: CalendarDays,
    cards: [
      {
        id: "vacaciones",
        title: "Vacaciones",
        description: "Calculo automatico por antiguedad y saldo en tiempo real.",
        details: [
          "Dias correspondientes segun antiguedad.",
          "Control automatico de dias tomados.",
          "Calendario visual de periodos vacacionales.",
        ],
      },
      {
        id: "permisos",
        title: "Permisos",
        description: "Solicitud movil y aprobacion web en un clic.",
        details: [
          "Tipos de permiso personalizables por empresa.",
          "Flujo de aprobacion y rechazo para RH.",
          "Notificaciones de estatus al instante.",
        ],
      },
      {
        id: "dias-festivos",
        title: "Dias festivos",
        description: "Calendario oficial y dias personalizados de tu operacion.",
        details: [
          "Dias oficiales precargados para Mexico.",
          "Alta de dias regionales o internos.",
          "Integracion automatica en calculos de asistencia.",
        ],
      },
    ],
  },
  {
    id: "catalogos-base",
    title: "Catalogos Base",
    subtitle: "Configuracion flexible para cada operacion",
    href: "/funcionalidades/colaboradores",
    cta: "Explorar modulo",
    icon: BookOpen,
    cards: [
      {
        id: "areas-check",
        title: "Areas de Check",
        description: "Zonas geograficas para validar registros con precision.",
        details: [
          "Definicion de coordenadas GPS por ubicacion.",
          "Radio configurable por area de trabajo.",
          "Control para permitir checks solo en zonas autorizadas.",
        ],
      },
      {
        id: "sucursales",
        title: "Sucursales",
        description: "Gestion multi-ubicacion para empresas con varias sedes.",
        details: [
          "Catalogo completo de sucursales y sitios.",
          "Asignacion de personal por ubicacion.",
          "Reportes por sucursal para control operativo.",
        ],
      },
      {
        id: "tipos-registro",
        title: "Tipos de registro",
        description: "Catalogo personalizable para tus tipos de marcacion.",
        details: [
          "Tipos estandar precargados: entrada, salida y comida.",
          "Creacion de tipos nuevos segun politicas internas.",
          "Configuracion flexible por unidad de negocio.",
        ],
      },
    ],
  },
];

const ajustes = {
  id: "reglas-aviso",
  title: "Reglas de aviso",
  description:
    "Automatiza alertas para contratos por vencer, cumpleanos, aniversarios, inasistencias y eventos personalizados.",
  href: "/funcionalidades/notificaciones-reglas",
  details: [
    "Canales multiples: email, WhatsApp y push.",
    "Configuracion por umbrales y prioridades.",
    "Alertas preventivas para mantener control continuo.",
  ],
};

function SectionCard({ item, sectionId }) {
  const iconByCard = {
    empleados: UserRound,
    perfil: FolderKanban,
    departamentos: Briefcase,
    puestos: FileText,
    contratos: FileText,
    actas: ShieldCheck,
    asistencias: CalendarDays,
    "entradas-salidas": Clock3,
    "reloj-checador": Fingerprint,
    "reporte-horas": Clock3,
    vacaciones: CalendarDays,
    permisos: FileText,
    "dias-festivos": CalendarDays,
    "areas-check": MapPin,
    sucursales: Briefcase,
    "tipos-registro": FileText,
  };
  const Icon = iconByCard[item.id] ?? FileText;

  return (
    <article
      className={`rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
        item.featured
          ? "border-[var(--adamia-purple)]/40 bg-gradient-to-br from-[var(--adamia-blue)]/5 via-white to-[var(--adamia-purple)]/10"
          : "border-[var(--adamia-blue)]/15 bg-white hover:border-[var(--adamia-blue)]/35"
      }`}
    >
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--adamia-blue)]/10 text-[var(--adamia-blue)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-xl font-black">{item.title}</h3>
      <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">{item.description}</p>

      <Accordion type="single" collapsible className="mt-4 border-t border-[var(--adamia-blue)]/10">
        <AccordionItem value={`${sectionId}-${item.id}`} className="border-b-0">
          <AccordionTrigger className="py-3 text-sm font-semibold text-[var(--adamia-blue)]">
            Ver mas
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2 text-sm text-[var(--adamia-text-secondary)]">
              {item.details.map((detail) => (
                <li key={detail} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--adamia-blue)]" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {item.href ? (
        <div className="mt-4">
          <Link href={item.href} className="text-sm font-bold text-[var(--adamia-blue)] hover:underline">
            Ir al detalle →
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export default function FuncionalidadesPage() {
  return (
    <main className="bg-white text-[var(--adamia-text-primary)]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-24 text-white">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-20 bottom-2 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto w-full max-w-7xl px-6 text-center">
          <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-bold">
            Todas las funcionalidades en un solo lugar
          </span>
          <h1 className="mt-7 text-4xl font-black leading-tight md:text-6xl">
            Modulos completos para
            <br />
            gestionar tu empresa
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-white/90 md:text-2xl">
            Descubre cada herramienta que ADAMIA ofrece para optimizar tu operacion de Recursos
            Humanos.
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mx-auto max-w-5xl rounded-3xl border border-[var(--adamia-blue)]/25 bg-gradient-to-br from-[var(--adamia-blue)]/5 via-white to-[var(--adamia-purple)]/10 p-8 shadow-xl md:p-10">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="inline-flex rounded-full bg-[var(--adamia-purple)]/15 px-3 py-1 text-xs font-bold text-[var(--adamia-purple)]">
                  DASHBOARD PRINCIPAL
                </span>
                <h2 className="mt-3 text-3xl font-black md:text-4xl">Dashboard de Empleados</h2>
                <p className="mt-3 max-w-3xl text-[var(--adamia-text-secondary)]">
                  Panel integral con metricas en tiempo real para asistencias, permisos, contratos,
                  vacaciones y gestion diaria del equipo.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dashboardTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--adamia-blue)]/10 px-3 py-1 text-xs font-bold text-[var(--adamia-blue)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href="/funcionalidades/dashboard-empleados"
                className="inline-flex shrink-0 rounded-xl bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-6 py-3 text-sm font-black text-white transition hover:opacity-90"
              >
                Ver dashboard →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {moduleSections.map((section) => {
        const SectionIcon = section.icon;
        return (
          <section key={section.id} className="py-16 even:bg-[var(--adamia-bg-light)]/60">
            <div className="mx-auto w-full max-w-7xl px-6">
              <div className="mb-9 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] text-white shadow-lg">
                    <SectionIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black md:text-5xl">{section.title}</h2>
                    <p className="text-[var(--adamia-text-secondary)]">{section.subtitle}</p>
                  </div>
                </div>
                <Link
                  href={section.href}
                  className="rounded-xl border border-[var(--adamia-blue)]/30 bg-white px-5 py-2 text-sm font-bold text-[var(--adamia-blue)] transition hover:bg-[var(--adamia-blue)] hover:text-white"
                >
                  {section.cta} →
                </Link>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {section.cards.map((item) => (
                  <SectionCard key={item.id} item={item} sectionId={section.id} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="py-16">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-gradient-to-br from-[var(--adamia-bg-light)] to-white p-8 shadow-sm md:p-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--adamia-blue)]/10 text-[var(--adamia-blue)]">
                  <Bell className="h-5 w-5" />
                </div>
                <h2 className="text-3xl font-black md:text-4xl">{ajustes.title}</h2>
                <p className="mt-3 text-[var(--adamia-text-secondary)]">{ajustes.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-[var(--adamia-text-secondary)]">
                  {ajustes.details.map((detail) => (
                    <li key={detail} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--adamia-blue)]" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={ajustes.href}
                className="inline-flex rounded-xl bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-6 py-3 text-sm font-black text-white transition hover:opacity-90"
              >
                Ver mas →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
