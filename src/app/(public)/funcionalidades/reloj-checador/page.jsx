import {
  ArrowRight,
  Building2,
  CalendarDays,
  Camera,
  ChartColumn,
  Clock3,
  Cloud,
  DollarSign,
  DoorOpen,
  FileClock,
  FileSpreadsheet,
  History,
  KeyRound,
  Lock,
  MapPin,
  Moon,
  ShieldCheck,
  Smartphone,
  Target,
  Timer,
  UserCheck,
  Users,
  UtensilsCrossed,
  Zap,
} from "lucide-react";

const SCREENSHOTS = {
  reloj:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765501210/Captura_de_pantalla_2025-12-11_a_la_s_7.00.02_p.m._crftgz.png",
  panel:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765501264/Captura_de_pantalla_2025-12-11_a_la_s_7.00.56_p.m._fuulzu.png",
  filtros:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765501294/Captura_de_pantalla_2025-12-11_a_la_s_7.01.27_p.m._yuszbl.png",
  entradas:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765501334/Captura_de_pantalla_2025-12-11_a_la_s_7.02.07_p.m._w4qjgj.png",
  reporte:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765501380/Captura_de_pantalla_2025-12-11_a_la_s_7.02.54_p.m._l2tzwh.png",
};

const relojFeatures = [
  {
    title: "Reconocimiento Facial",
    description:
      "Tecnologia de IA que verifica la identidad del empleado en tiempo real. Imposible marcar por otra persona.",
    icon: UserCheck,
  },
  {
    title: "Ubicacion GPS",
    description:
      "Verifica que el empleado este en el lugar correcto al checar. Configura radio de validacion por sucursal.",
    icon: MapPin,
  },
  {
    title: "Codigo Unico",
    description:
      "Cada empleado tiene un codigo personal. Triple capa de seguridad para garantizar registros autenticos.",
    icon: KeyRound,
  },
  {
    title: "Registro instantaneo",
    description:
      "Proceso rapido y sin fricciones. El empleado marca en menos de 3 segundos desde su celular.",
    icon: Zap,
  },
];

const panelFeatures = [
  { text: "Lista completa de registros", icon: ChartColumn },
  { text: "Horarios y tardanzas", icon: Clock3 },
  { text: "Foto de verificacion", icon: Camera },
  { text: "Ubicacion GPS exacta", icon: MapPin },
];

const filtrosFeatures = [
  { text: "Por fecha y rango", icon: CalendarDays },
  { text: "Por empleado o departamento", icon: Users },
  { text: "Por sucursal o area", icon: Building2 },
  { text: "Por estado: faltas, tardanzas, presentes", icon: Target },
];

const entradasFeatures = [
  { text: "Entrada y salida con timestamp", icon: DoorOpen },
  { text: "Calculo automatico de horas", icon: Timer },
  { text: "Control de comidas", icon: UtensilsCrossed },
  { text: "Historial completo", icon: History },
];

const reporteFeatures = [
  { text: "Horas totales trabajadas", icon: FileClock },
  { text: "Horas extra y nocturnas", icon: Moon },
  { text: "Desglose detallado", icon: ChartColumn },
  { text: "Exportar a Excel", icon: FileSpreadsheet },
];

const beneficios = [
  {
    title: "100% Preciso",
    icon: ShieldCheck,
    text: "Triple verificacion elimina errores y fraudes.",
  },
  {
    title: "Tiempo Real",
    icon: Zap,
    text: "Datos actualizados al instante en todos los dispositivos.",
  },
  {
    title: "Desde el celular",
    icon: Smartphone,
    text: "App movil para empleados, panel web para gerentes.",
  },
  {
    title: "Ahorra dinero",
    icon: DollarSign,
    text: "Reduce costos eliminando registros falsos.",
  },
];

const tecnicas = [
  "Reconocimiento Facial IA",
  "GPS de Alta Precision",
  "Codigos Unicos",
  "100% Cloud",
  "Apps Nativas",
  "Maxima Seguridad",
  "Super Rapido",
  "Reportes Avanzados",
  "Multi-sucursal",
];

export default function RelojChecadorPage() {
  return (
    <main className="bg-white text-[var(--adamia-text-primary)]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-16 h-72 w-72 rounded-full bg-white/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-white/15 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-7xl px-6 text-center">
          <div className="inline-flex rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold">
            ⏰ CONTROL DE ASISTENCIA INTELIGENTE
          </div>
          <h1 className="mt-8 text-5xl font-black leading-tight md:text-6xl lg:text-7xl">
            Control de Tiempo
            <br />
            <span className="text-cyan-200">con Tecnologia de Punta</span>
          </h1>
          <p className="mx-auto mt-6 max-w-4xl text-xl text-white/90">
            Reloj Checador con reconocimiento facial + GPS + codigo. Reportes en
            tiempo real, filtros avanzados y control total de asistencias.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="https://planes.hr360.mx/contratar-plan"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-white px-10 py-4 text-lg font-bold text-[var(--adamia-blue)] shadow-xl transition hover:-translate-y-1"
            >
              Comenzar prueba gratis <ArrowRight className="ml-2 h-5 w-5" />
            </a>
            <a
              href="/funcionalidades"
              className="rounded-xl border border-white/30 bg-white/10 px-10 py-4 text-lg font-bold text-white transition hover:bg-white/20"
            >
              Ver todas las funciones
            </a>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="text-center">
            <span className="inline-flex rounded-full bg-[var(--adamia-blue)]/10 px-4 py-2 text-sm font-bold text-[var(--adamia-blue)]">
              🚀 TECNOLOGIA AVANZADA
            </span>
            <h2 className="mt-5 text-4xl font-black md:text-5xl">
              Reloj Checador
              <br />
              <span className="text-[var(--adamia-blue)]">lo mas robusto del sistema</span>
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-[var(--adamia-text-secondary)]">
              Triple verificacion: Reconocimiento Facial + Ubicacion GPS + Codigo unico.
            </p>
          </div>

          <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
            <div className="relative">
              <div className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-4 shadow-xl">
                <img
                  src={SCREENSHOTS.reloj}
                  alt="Reloj checador con validacion facial y GPS"
                  className="w-full rounded-2xl"
                />
              </div>
            </div>

            <div className="space-y-5">
              {relojFeatures.map((item) => (
                <FeatureCard key={item.title} title={item.title} description={item.description} icon={item.icon} />
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-3xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] p-10 text-center text-white shadow-xl">
            <Lock className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-4xl font-black">100% Anti-fraude</h3>
            <p className="mx-auto mt-3 max-w-3xl text-lg text-white/85">
              Con triple verificacion es imposible que alguien marque por otro
              empleado. Elimina el compadrazgo y registros falsos.
            </p>
          </div>
        </div>
      </section>

      <SectionWithImage
        inverse
        background="bg-[var(--adamia-bg-light)]"
        badge="📊 PANEL DE CONTROL"
        title="Panel de Asistencias"
        subtitle="Vista completa en tiempo real"
        description="Monitorea todas las asistencias del dia con informacion detallada de cada registro."
        image={SCREENSHOTS.panel}
        imageAlt="Panel de asistencias"
        features={panelFeatures}
      />

      <SectionWithImage
        badge="🔍 BUSQUEDA INTELIGENTE"
        title="Filtros Avanzados"
        subtitle="Encuentra cualquier dato en segundos"
        description="Sistema de filtros potente para analizar asistencias por cualquier criterio."
        image={SCREENSHOTS.filtros}
        imageAlt="Filtros avanzados"
        features={filtrosFeatures}
      />

      <SectionWithImage
        inverse
        background="bg-[var(--adamia-bg-light)]"
        badge="🚪 CONTROL TOTAL"
        title="Entradas y Salidas"
        subtitle="Cada movimiento registrado"
        description="Registro detallado de todas las entradas y salidas con hora exacta y validaciones."
        image={SCREENSHOTS.entradas}
        imageAlt="Entradas y salidas"
        features={entradasFeatures}
      />

      <SectionWithImage
        badge="📈 ANALISIS Y REPORTES"
        title="Reporte de Horas Trabajadas"
        subtitle="Nomina precisa y automatica"
        description="Calculo exacto de horas trabajadas por empleado para nomina y analisis de productividad."
        image={SCREENSHOTS.reporte}
        imageAlt="Reporte de horas"
        features={reporteFeatures}
      />

      <section className="bg-[var(--adamia-bg-light)] py-20">
        <div className="mx-auto w-full max-w-7xl px-6">
          <h2 className="text-center text-4xl font-black md:text-5xl">
            ¿Por que elegir
            <br />
            <span className="text-[var(--adamia-blue)]">nuestro Control de Tiempo?</span>
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {beneficios.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 text-center shadow-sm"
              >
                <item.icon className="mx-auto h-10 w-10 text-[var(--adamia-blue)]" />
                <h3 className="mt-4 text-xl font-black">{item.title}</h3>
                <p className="mt-2 text-[var(--adamia-text-secondary)]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto w-full max-w-7xl px-6">
          <h2 className="text-center text-4xl font-black md:text-5xl">
            Caracteristicas tecnicas
          </h2>
          <p className="mt-4 text-center text-[var(--adamia-text-secondary)]">
            Todo lo que necesitas en un solo sistema.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {tecnicas.map((item) => (
              <article
                key={item}
                className="rounded-xl border border-[var(--adamia-blue)]/15 bg-white p-5 shadow-sm"
              >
                <h3 className="font-bold">{item}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
            ⚡ Control Total de Asistencias
          </div>
          <h2 className="mt-6 text-4xl font-black md:text-5xl">
            Prueba el Reloj Checador
            <br />
            <span className="text-cyan-200">gratis por 7 dias</span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-xl text-white/90">
            Sin tarjeta, sin compromiso, todas las funciones incluidas.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="https://planes.hr360.mx/contratar-plan"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-white px-10 py-4 text-lg font-bold text-[var(--adamia-blue)] shadow-xl transition hover:-translate-y-1"
            >
              Comenzar ahora <ArrowRight className="ml-2 h-5 w-5" />
            </a>
            <a
              href="/funcionalidades"
              className="rounded-xl border border-white/30 bg-white/10 px-10 py-4 text-lg font-bold text-white transition hover:bg-white/20"
            >
              Ver todas las funciones
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, description, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm">
      <Icon className="h-8 w-8 text-[var(--adamia-blue)]" />
      <h3 className="mt-3 text-xl font-black">{title}</h3>
      <p className="mt-2 text-[var(--adamia-text-secondary)]">{description}</p>
    </article>
  );
}

function SectionWithImage({
  inverse,
  background,
  badge,
  title,
  subtitle,
  description,
  image,
  imageAlt,
  features,
}) {
  return (
    <section className={`${background || "bg-white"} py-20`}>
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="text-center">
          <span className="inline-flex rounded-full bg-[var(--adamia-blue)]/10 px-4 py-2 text-sm font-bold text-[var(--adamia-blue)]">
            {badge}
          </span>
          <h2 className="mt-5 text-4xl font-black md:text-5xl">
            {title}
            <br />
            <span className="text-[var(--adamia-blue)]">{subtitle}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-[var(--adamia-text-secondary)]">
            {description}
          </p>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
          {inverse ? (
            <>
              <div className="space-y-4">
                {features.map((item) => (
                  <FeatureListItem key={item.text} text={item.text} icon={item.icon} />
                ))}
              </div>
              <div className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-4 shadow-xl">
                <img src={image} alt={imageAlt} className="w-full rounded-2xl" />
              </div>
            </>
          ) : (
            <>
              <div className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-4 shadow-xl">
                <img src={image} alt={imageAlt} className="w-full rounded-2xl" />
              </div>
              <div className="space-y-4">
                {features.map((item) => (
                  <FeatureListItem key={item.text} text={item.text} icon={item.icon} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function FeatureListItem({ text, icon: Icon }) {
  return (
    <article className="flex items-start gap-4 rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-5 shadow-sm">
      <div className="rounded-xl bg-[var(--adamia-blue)]/10 p-2">
        <Icon className="h-5 w-5 text-[var(--adamia-blue)]" />
      </div>
      <div>
        <h3 className="text-lg font-black">{text}</h3>
        <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">
          Informacion operativa disponible para analisis, auditoria y toma de
          decisiones en cada ciclo de trabajo.
        </p>
      </div>
    </article>
  );
}
