import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChartColumn,
  Clock3,
  Contact,
  FileText,
  Gauge,
  Lock,
  Search,
  Settings,
  UserRound,
  Users,
  UserSearch,
} from "lucide-react";

const images = {
  dashboard:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765501264/Captura_de_pantalla_2025-12-11_a_la_s_7.00.56_p.m._fuulzu.png",
  filtros:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765501294/Captura_de_pantalla_2025-12-11_a_la_s_7.01.27_p.m._yuszbl.png",
  colaboradores:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765501334/Captura_de_pantalla_2025-12-11_a_la_s_7.02.07_p.m._w4qjgj.png",
};

const stats = [
  { value: "247", title: "Total Colaboradores", meta: "+12% vs mes anterior" },
  { value: "239", title: "Activos", meta: "96.8% activos" },
  { value: "15", title: "Nuevos este mes", meta: "Ingresos recientes" },
  { value: "12", title: "Departamentos", meta: "Areas organizadas" },
];

const quickActions = [
  { title: "Editar informacion", text: "Actualiza datos personales, puesto o departamento al instante." },
  { title: "Dar de baja", text: "Gestiona bajas laborales manteniendo historial para auditorias." },
  { title: "Nuevo colaborador", text: "Alta de nuevos empleados con formulario y validaciones." },
  { title: "Ver historial", text: "Accede a asistencias, permisos, vacaciones y movimientos." },
  { title: "Generar documentos", text: "Crea constancias, credenciales y documentos oficiales." },
  { title: "Enviar notificacion", text: "Comunicate por email o WhatsApp sin salir del sistema." },
];

const accessTools = [
  { icon: Clock3, label: "Reloj Checador", sub: "Entradas y salidas" },
  { icon: Users, label: "Empleados", sub: "Gestion de personal" },
  { icon: ChartColumn, label: "Reportes", sub: "Analisis y estadisticas" },
  { icon: FileText, label: "Permisos", sub: "Solicitudes y ausencias" },
  { icon: Settings, label: "Configuracion", sub: "Ajustes del sistema" },
];

const moduleFeatures = [
  "Expediente Digital",
  "Busqueda Avanzada",
  "Departamentos",
  "Metricas en Tiempo Real",
  "Generacion de Docs",
  "Exportacion",
  "App Movil",
  "Notificaciones",
  "Seguridad Avanzada",
];

export default function ColaboradoresPage() {
  return (
    <main className="bg-white text-[var(--adamia-text-primary)]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div className="mx-auto w-full max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-bold">
            <Users className="h-4 w-4" />
            GESTION CENTRALIZADA DE PERSONAL
          </div>
          <h1 className="mt-8 text-5xl font-black leading-tight md:text-6xl lg:text-7xl">
            Gestion de
            <br />
            <span className="text-cyan-200">Colaboradores</span>
          </h1>
          <p className="mx-auto mt-6 max-w-4xl text-xl text-white/90">
            Administra y consulta de forma centralizada toda la informacion de
            tu personal. Control total, busquedas avanzadas y accesos rapidos.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/contratar-plan"
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
            badge="📊 DASHBOARD EJECUTIVO"
            title="Metricas de Personal"
            subtitle="en tiempo real"
            description="Visualiza de un vistazo el estado completo de tu plantilla laboral."
          />
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 text-center shadow-sm"
              >
                <p className="text-4xl font-black text-[var(--adamia-blue)]">{item.value}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--adamia-text-secondary)]">
                  {item.title}
                </p>
                <p className="mt-3 inline-flex rounded-full bg-[var(--adamia-blue)]/10 px-3 py-1 text-xs font-semibold text-[var(--adamia-blue)]">
                  {item.meta}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-10 rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-4 shadow-xl">
            <img src={images.dashboard} alt="Panel de colaboradores" className="w-full rounded-2xl" />
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <SectionTitle
            badge="🔍 BUSQUEDA INTELIGENTE"
            title="Encuentra cualquier"
            subtitle="colaborador en segundos"
            description="Sistema de filtros avanzados para localizar informacion de forma instantanea."
          />
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <FeatureItem icon={UserSearch} title="Por nombre o codigo" />
              <FeatureItem icon={BriefcaseBusiness} title="Por departamento" />
              <FeatureItem icon={Contact} title="Por email o telefono" />
              <FeatureItem icon={CalendarDays} title="Por fecha de ingreso" />
            </div>
            <div className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-4 shadow-xl">
              <img src={images.filtros} alt="Filtros de busqueda" className="w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--adamia-bg-light)] py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <SectionTitle
            badge="📋 EXPEDIENTE DIGITAL"
            title="Informacion completa"
            subtitle="de cada colaborador"
            description="Vista rapida con todos los datos principales organizados y accesibles."
          />
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
            <div className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-4 shadow-xl">
              <img src={images.colaboradores} alt="Lista de colaboradores" className="w-full rounded-2xl" />
            </div>
            <div className="space-y-4">
              <FeatureItem icon={UserRound} title="Datos personales" />
              <FeatureItem icon={BriefcaseBusiness} title="Puesto y departamento" />
              <FeatureItem icon={Contact} title="Informacion de contacto" />
              <FeatureItem icon={Gauge} title="Estado y antiguedad" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <SectionTitle
            badge="⚡ PRODUCTIVIDAD MAXIMA"
            title="Acciones rapidas"
            subtitle="para cada colaborador"
            description="Gestiona a tu equipo con un solo clic desde el panel principal."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm"
              >
                <h3 className="text-xl font-black">{item.title}</h3>
                <p className="mt-2 text-[var(--adamia-text-secondary)]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--adamia-bg-light)] py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <SectionTitle
            badge="🚀 NAVEGACION RAPIDA"
            title="Accesos Directos"
            subtitle="a herramientas clave"
            description="Todo lo que necesitas a un clic de distancia."
          />
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {accessTools.map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-5 text-center shadow-sm"
              >
                <item.icon className="mx-auto h-8 w-8 text-[var(--adamia-blue)]" />
                <p className="mt-3 text-sm font-black">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--adamia-text-secondary)]">{item.sub}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <h2 className="text-center text-5xl font-black md:text-6xl">
            ¿Por que elegir
            <br />
            <span className="text-[var(--adamia-blue)]">nuestro modulo de Colaboradores?</span>
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { t: "Centralizado", d: "Toda la informacion en un solo lugar", i: Users },
              { t: "Ultra rapido", d: "Busquedas instantaneas en segundos", i: Search },
              { t: "Multi-dispositivo", d: "Accede desde cualquier dispositivo", i: Contact },
              { t: "100% Seguro", d: "Datos protegidos con encriptacion", i: Lock },
            ].map((item) => (
              <article
                key={item.t}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 text-center shadow-sm"
              >
                <item.i className="mx-auto h-9 w-9 text-[var(--adamia-blue)]" />
                <h3 className="mt-3 text-lg font-black">{item.t}</h3>
                <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">{item.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-24 text-white">
        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          <div className="text-7xl">👥</div>
          <h2 className="mt-6 text-5xl font-black md:text-6xl">
            Gestiona tu equipo
            <br />
            de forma profesional
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-2xl text-white/90">
            Centraliza toda la informacion de tu personal.
            <br />
            Busquedas avanzadas, reportes y control total.
          </p>
          <a
            href="/contratar-plan"
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
                key={item}
                className="rounded-xl border border-[var(--adamia-blue)]/15 bg-white p-5 shadow-sm"
              >
                <h3 className="font-black">{item}</h3>
                <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">
                  Funcionalidad clave para operacion de RRHH.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          <div className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
            👥 Gestion de Personal Profesional
          </div>
          <h2 className="mt-6 text-5xl font-black md:text-6xl">
            Prueba el modulo de Colaboradores
            <br />
            <span className="text-cyan-200">gratis por 7 dias</span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-2xl text-white/90">
            Sin tarjeta, sin compromiso y con todas las funciones incluidas.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/contratar-plan"
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
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-lg font-semibold">
            {["Setup en 5 minutos", "Soporte incluido", "Cancela cuando quieras"].map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <CheckMark /> {t}
              </span>
            ))}
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

function FeatureItem({ icon: Icon, title }) {
  return (
    <article className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm">
      <div className="inline-flex rounded-xl bg-[var(--adamia-blue)]/10 p-2">
        <Icon className="h-5 w-5 text-[var(--adamia-blue)]" />
      </div>
      <h3 className="mt-3 text-xl font-black">{title}</h3>
      <p className="mt-2 text-[var(--adamia-text-secondary)]">
        Consulta y administra informacion de forma rapida, clara y segura.
      </p>
    </article>
  );
}

function CheckMark() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-black">
      ✓
    </span>
  );
}
