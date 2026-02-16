import {
  ArrowRight,
  BadgeDollarSign,
  Bell,
  Briefcase,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Clock3,
  Copy,
  Eye,
  FileBadge2,
  FilePenLine,
  FileSearch,
  Gift,
  House,
  Lock,
  Plus,
  Scale,
  Search,
  Trash2,
} from "lucide-react";

const imgs = {
  panel:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765577471/Captura_de_pantalla_2025-12-12_a_la_s_3.55.59_p.m._xgiz8d.png",
  form1:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765577523/Captura_de_pantalla_2025-12-12_a_la_s_3.56.11_p.m._zqa2me.png",
  form2:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765577650/Captura_de_pantalla_2025-12-12_a_la_s_4.13.59_p.m._bn5alc.png",
};

const stats = [
  { value: "186", title: "Total Contratos", color: "text-[var(--adamia-text-primary)]" },
  { value: "172", title: "Activos", color: "text-emerald-600" },
  { value: "8", title: "Por Vencer (30D)", color: "text-amber-600" },
  { value: "6", title: "Vencidos", color: "text-red-600" },
];

const basicFeatures = [
  { icon: Briefcase, title: "Informacion Basica", text: "Empleado, puesto, departamento y responsables vinculados al contrato." },
  { icon: CalendarDays, title: "Tipo y Vigencia", text: "Tipo de contrato y fecha de inicio con control de vigencias." },
  { icon: BadgeDollarSign, title: "Compensacion", text: "Salario base, periodicidad de pago y moneda." },
  { icon: Clock3, title: "Jornada Laboral", text: "Turno, horas semanales y horarios de entrada/salida." },
];

const benefitsFeatures = [
  { icon: CalendarClock, title: "Dias de Vacaciones", text: "Configura vacaciones segun politica interna y antiguedad." },
  { icon: Gift, title: "Aguinaldo y Prima Vacacional", text: "Registra dias y porcentajes de prestaciones por contrato." },
  { icon: Scale, title: "Prestaciones Superiores", text: "Vales, seguros, fondo de ahorro y beneficios adicionales." },
  { icon: House, title: "Ubicacion y Modalidad", text: "Presencial, remoto o hibrido con lugar de trabajo definido." },
];

const contractTypes = [
  { icon: "♾️", title: "Indefinido", text: "Relacion laboral permanente sin fecha de termino." },
  { icon: "📆", title: "Determinado", text: "Contrato con fecha de inicio y termino establecidas." },
  { icon: "⏳", title: "Temporal", text: "Ideal para proyectos o temporadas especificas." },
  { icon: "🎓", title: "Capacitacion", text: "Contratos para formacion y periodos de prueba." },
];

const quickActions = [
  { icon: Plus, title: "Nuevo Contrato", text: "Alta de contratos con formulario guiado y validaciones." },
  { icon: FilePenLine, title: "Editar Contrato", text: "Actualiza salario, condiciones y datos vigentes." },
  { icon: Copy, title: "Duplicar Contrato", text: "Crea contratos basados en plantillas existentes." },
  { icon: Eye, title: "Ver Detalles", text: "Consulta toda la informacion en modo solo lectura." },
  { icon: Trash2, title: "Eliminar Contrato", text: "Baja controlada con confirmacion y auditoria." },
  { icon: Search, title: "Busqueda Avanzada", text: "Filtra por folio, empleado, estatus o fechas." },
];

const moduleFeatures = [
  { icon: "📝", title: "Alta de Contratos", text: "Formulario completo paso a paso." },
  { icon: "🔄", title: "Duplicar Contratos", text: "Genera nuevos desde plantillas." },
  { icon: "⚠️", title: "Alertas de Vencimiento", text: "Notificaciones anticipadas automaticas." },
  { icon: "💰", title: "Control de Salarios", text: "Compensaciones y periodicidad de pago." },
  { icon: "🎁", title: "Prestaciones", text: "De ley y superiores configurables." },
  { icon: "🕐", title: "Jornada Laboral", text: "Turnos y horas semanales." },
  { icon: "📊", title: "Filtros Avanzados", text: "Tipo, estatus y rango de fechas." },
  { icon: "🏠", title: "Modalidad de Trabajo", text: "Presencial, remoto o hibrido." },
  { icon: "🔒", title: "Seguridad", text: "Datos confidenciales protegidos." },
];

export default function ContratosPage() {
  return (
    <main className="bg-white text-[var(--adamia-text-primary)]">
      <section className="bg-[var(--adamia-bg-light)] py-4">
        <div className="mx-auto w-full max-w-7xl px-6 text-sm text-[var(--adamia-text-secondary)]">
          <span>Inicio</span> <span className="mx-2">→</span>
          <span>Funcionalidades</span> <span className="mx-2">→</span>
          <span className="font-semibold text-[var(--adamia-text-primary)]">Contratos</span>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div className="mx-auto w-full max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-bold">
            <FileBadge2 className="h-4 w-4" />
            GESTION CONTRACTUAL COMPLETA
          </div>
          <h1 className="mt-8 text-5xl font-black leading-tight md:text-6xl lg:text-7xl">
            Gestion de
            <br />
            <span className="text-cyan-200">Contratos</span>
          </h1>
          <p className="mx-auto mt-6 max-w-4xl text-xl text-white/90">
            Administra contratos laborales de forma estructurada y profesional.
            Control completo de vigencias, compensaciones, prestaciones y
            condiciones laborales.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="https://planes.hr360.mx/contratar-plan"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-xl bg-white px-10 py-5 text-xl font-bold text-[var(--adamia-blue)] shadow-2xl transition hover:-translate-y-1"
            >
              Comenzar prueba gratis <ArrowRight className="ml-2 h-5 w-5" />
            </a>
            <a
              href="/funcionalidades"
              className="rounded-xl border border-white/30 bg-white/10 px-10 py-5 text-xl font-bold text-white hover:bg-white/20"
            >
              Ver todas las funciones
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[var(--adamia-bg-light)] py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <SectionTitle
            badge="📊 DASHBOARD DE CONTRATOS"
            title="Panel de Control"
            subtitle="de Contratos"
            description="Visualiza y gestiona todos los contratos laborales con filtros avanzados."
          />
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 text-center shadow-sm"
              >
                <p className={`text-4xl font-black ${item.color}`}>{item.value}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--adamia-text-secondary)]">
                  {item.title}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-10 rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-4 shadow-xl">
            <img src={imgs.panel} alt="Panel de contratos" className="w-full rounded-2xl" />
          </div>
        </div>
      </section>

      <SplitSection
        badge="📝 REGISTRO COMPLETO"
        title="Informacion contractual"
        subtitle="estructurada y completa"
        description="Registra todos los datos necesarios para seguimiento preciso."
        image={imgs.form1}
        imageAlt="Formulario contratos informacion basica"
        features={basicFeatures}
      />

      <SplitSection
        reverse
        background="bg-[var(--adamia-bg-light)]"
        badge="🎁 PRESTACIONES"
        title="Prestaciones y beneficios"
        subtitle="detallados por contrato"
        description="Registra prestaciones de ley y superiores, ubicacion y modalidad."
        image={imgs.form2}
        imageAlt="Formulario contratos prestaciones"
        features={benefitsFeatures}
      />

      <section className="bg-white py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <SectionTitle
            badge="📋 TIPOS DE CONTRATO"
            title="Soporte para todos"
            subtitle="los tipos de contrato"
            description="Configura y gestiona modalidades contractuales segun tus necesidades."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {contractTypes.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 text-center shadow-sm"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--adamia-blue)]/10 text-3xl">
                  {item.icon}
                </div>
                <h3 className="text-xl font-black">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--adamia-bg-light)] py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <SectionTitle
            badge="⚡ GESTION AGIL"
            title="Acciones rapidas"
            subtitle="para cada contrato"
            description="Administra contratos de forma eficiente con herramientas intuitivas."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm"
              >
                <div className="inline-flex rounded-xl bg-[var(--adamia-blue)]/10 p-2">
                  <item.icon className="h-5 w-5 text-[var(--adamia-blue)]" />
                </div>
                <h3 className="mt-3 text-xl font-black">{item.title}</h3>
                <p className="mt-2 text-[var(--adamia-text-secondary)]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <SectionTitle
            badge="🚀 NAVEGACION RAPIDA"
            title="Accesos Directos"
            subtitle="a herramientas clave"
            description="Todo lo que necesitas a un clic de distancia."
          />
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { icon: Clock3, t: "Reloj Checador", s: "Entradas y salidas" },
              { icon: ClipboardList, t: "Empleados", s: "Gestion de personal" },
              { icon: ChartColumn, t: "Reportes", s: "Analisis y estadisticas" },
              { icon: FileSearch, t: "Permisos", s: "Solicitudes y ausencias" },
              { icon: House, t: "Configuracion", s: "Ajustes del sistema" },
            ].map((item) => (
              <article
                key={item.t}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-5 text-center shadow-sm"
              >
                <item.icon className="mx-auto h-8 w-8 text-[var(--adamia-blue)]" />
                <p className="mt-3 text-sm font-black">{item.t}</p>
                <p className="mt-1 text-xs text-[var(--adamia-text-secondary)]">{item.s}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--adamia-bg-light)] py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <h2 className="text-center text-5xl font-black md:text-6xl">
            ¿Por que elegir
            <br />
            <span className="text-[var(--adamia-blue)]">nuestro modulo de Contratos?</span>
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { icon: ClipboardList, t: "Completo", d: "Toda la informacion contractual en un solo lugar" },
              { icon: Bell, t: "Alertas", d: "Notificaciones de vencimientos automaticas" },
              { icon: Scale, t: "Legal", d: "Cumplimiento con normativa laboral" },
              { icon: Lock, t: "Seguro", d: "Datos protegidos con encriptacion" },
            ].map((item) => (
              <article
                key={item.t}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 text-center shadow-sm"
              >
                <item.icon className="mx-auto h-8 w-8 text-[var(--adamia-blue)]" />
                <h3 className="mt-3 text-lg font-black">{item.t}</h3>
                <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">{item.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-24 text-white">
        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          <div className="text-7xl">📄</div>
          <h2 className="mt-6 text-5xl font-black md:text-6xl">
            Gestiona los contratos
            <br />
            de tu equipo profesionalmente
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-2xl text-white/90">
            Control de vigencias, prestaciones y condiciones laborales.
          </p>
          <a
            href="https://planes.hr360.mx/contratar-plan"
            target="_blank"
            rel="noreferrer"
            className="mt-10 inline-flex items-center rounded-xl bg-white px-12 py-6 text-2xl font-bold text-[var(--adamia-blue)] shadow-2xl transition hover:-translate-y-1"
          >
            Comenzar prueba gratis <ArrowRight className="ml-2 h-6 w-6" />
          </a>
        </div>
      </section>

      <section className="bg-[var(--adamia-bg-light)] py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <h2 className="text-center text-4xl font-black md:text-5xl">
            Caracteristicas del modulo
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
            {moduleFeatures.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-[var(--adamia-blue)]/15 bg-white p-5 shadow-sm"
              >
                <div className="text-2xl">{item.icon}</div>
                <h3 className="mt-2 font-black">{item.title}</h3>
                <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
            📄 Gestion Contractual Profesional
          </div>
          <h2 className="mt-6 text-5xl font-black md:text-6xl">
            Prueba el modulo de Contratos
            <br />
            <span className="text-cyan-200">gratis por 7 dias</span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-2xl text-white/90">
            Sin tarjeta, sin compromiso y con todas las funciones incluidas.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="https://planes.hr360.mx/contratar-plan"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-xl bg-white px-12 py-6 text-2xl font-bold text-[var(--adamia-blue)] shadow-2xl transition hover:-translate-y-1"
            >
              Comenzar ahora <ArrowRight className="ml-2 h-6 w-6" />
            </a>
            <a
              href="/funcionalidades"
              className="rounded-xl border border-white/30 bg-white/10 px-10 py-6 text-xl font-bold text-white hover:bg-white/20"
            >
              Ver todas las funciones
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionTitle({ badge, title, subtitle, description }) {
  return (
    <div className="text-center">
      <span className="inline-flex rounded-full bg-[var(--adamia-blue)]/10 px-4 py-2 text-sm font-bold text-[var(--adamia-blue)]">
        {badge}
      </span>
      <h2 className="mt-5 text-5xl font-black md:text-6xl">
        {title}
        <br />
        <span className="text-[var(--adamia-blue)]">{subtitle}</span>
      </h2>
      <p className="mx-auto mt-4 max-w-3xl text-xl text-[var(--adamia-text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function SplitSection({
  reverse,
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
    <section className={`${background || "bg-white"} py-24`}>
      <div className="mx-auto w-full max-w-7xl px-6">
        <SectionTitle
          badge={badge}
          title={title}
          subtitle={subtitle}
          description={description}
        />
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          <div className={reverse ? "order-2 lg:order-1" : "order-1"}>
            <div className="space-y-4">
              {features.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm"
                >
                  <div className="inline-flex rounded-xl bg-[var(--adamia-blue)]/10 p-2">
                    <item.icon className="h-5 w-5 text-[var(--adamia-blue)]" />
                  </div>
                  <h3 className="mt-3 text-xl font-black">{item.title}</h3>
                  <p className="mt-2 text-[var(--adamia-text-secondary)]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
          <div className={reverse ? "order-1 lg:order-2" : "order-2"}>
            <div className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-4 shadow-xl">
              <img src={image} alt={imageAlt} className="w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
