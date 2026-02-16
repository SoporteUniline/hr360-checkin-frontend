import {
  ArrowRight,
  Bell,
  BellRing,
  Copy,
  Mail,
  MessageCircleMore,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react";

const images = {
  panel:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765498940/Captura_de_pantalla_2025-12-11_a_la_s_6.22.15_p.m._dzusbe.png",
  config:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765498952/Captura_de_pantalla_2025-12-11_a_la_s_6.22.27_p.m._urhg0v.png",
  mail:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765499144/Captura_de_pantalla_2025-12-11_a_la_s_6.25.39_p.m._woble6.png",
  duplicate:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765499065/Captura_de_pantalla_2025-12-11_a_la_s_6.24.19_p.m._kpz9qx.png",
};

const ruleTypes = [
  "Contratos por vencer",
  "Reporte de faltas",
  "Cumpleanos",
  "Aniversarios laborales",
  "Llegadas tarde",
  "Solicitudes de permiso",
  "Resumen semanal",
  "Vacaciones proximas",
  "Personalizadas",
];

export default function NotificacionesReglasPage() {
  return (
    <main className="bg-white text-[var(--adamia-text-primary)]">
      <section className="bg-[var(--adamia-bg-light)] py-4">
        <div className="mx-auto w-full max-w-7xl px-6 text-sm text-[var(--adamia-text-secondary)]">
          <span>Inicio</span> <span className="mx-2">→</span>
          <span>Funcionalidades</span> <span className="mx-2">→</span>
          <span className="font-semibold text-[var(--adamia-text-primary)]">
            Notificaciones y Reglas
          </span>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div className="mx-auto w-full max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-bold">
            <Bell className="h-4 w-4" />
            AUTOMATIZACION INTELIGENTE
          </div>
          <h1 className="mt-8 text-5xl font-black leading-tight md:text-6xl lg:text-7xl">
            Reglas de Aviso
            <br />
            <span className="text-cyan-200">Nunca olvides nada importante</span>
          </h1>
          <p className="mx-auto mt-6 max-w-4xl text-xl text-white/90">
            Crea reglas inteligentes y automatiza notificaciones por correo y
            WhatsApp. Configura una vez, recibe alertas para siempre.
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

      <FeatureSplit
        badge="📊 PANEL DE CONTROL"
        title="Gestiona todas tus reglas"
        subtitle="desde un solo lugar"
        description="Vista completa de todas tus reglas activas con opciones para editar, duplicar o eliminar."
        image={images.panel}
        imageAlt="Panel general de reglas"
        items={[
          "Vista de lista completa",
          "Edicion rapida",
          "Duplicar reglas",
        ]}
      />

      <FeatureSplit
        reverse
        background="bg-[var(--adamia-bg-light)]"
        badge="⚙️ CONFIGURACION"
        title="Crea reglas"
        subtitle="100% personalizadas"
        description="Configurador intuitivo con todas las opciones que necesitas."
        image={images.config}
        imageAlt="Configurar reglas"
        items={[
          "Nombre descriptivo",
          "Destinatarios personalizados",
          "Horarios y frecuencias",
          "Condiciones inteligentes",
        ]}
      />

      <section className="bg-white py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="text-center">
            <span className="inline-flex rounded-full bg-[var(--adamia-blue)]/10 px-4 py-2 text-sm font-bold text-[var(--adamia-blue)]">
              📧 NOTIFICACIONES
            </span>
            <h2 className="mt-5 text-5xl font-black md:text-6xl">
              Correos y WhatsApp
              <br />
              <span className="text-[var(--adamia-blue)]">profesionales y automaticos</span>
            </h2>
          </div>

          <div className="mx-auto mt-12 max-w-5xl rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-5 shadow-xl">
            <div className="rounded-2xl bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] p-4 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BellRing className="h-4 w-4" />
                Nueva notificacion · Reporte de asistencia
              </div>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--adamia-blue)]/10">
              <img src={images.mail} alt="Notificacion por correo" className="w-full" />
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MiniCard icon={Mail} title="Correos profesionales" />
            <MiniCard icon={Target} title="Informacion detallada" />
            <MiniCard icon={MessageCircleMore} title="WhatsApp automatico" />
            <MiniCard icon={Bell} title="Entrega garantizada" />
          </div>
        </div>
      </section>

      <FeatureSplit
        reverse
        background="bg-[var(--adamia-bg-light)]"
        badge="📑 DUPLICAR Y OPTIMIZAR"
        title="Ahorra tiempo"
        subtitle="duplicando reglas"
        description="Crea nuevas reglas basadas en las existentes con un solo clic."
        image={images.duplicate}
        imageAlt="Duplicar reglas"
        items={[
          "Duplicacion rapida",
          "Configuracion base",
          "Escalado eficiente",
        ]}
      />

      <section className="bg-white py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="text-center">
            <span className="inline-flex rounded-full bg-[var(--adamia-blue)]/10 px-4 py-2 text-sm font-bold text-[var(--adamia-blue)]">
              🎯 CASOS DE USO
            </span>
            <h2 className="mt-5 text-5xl font-black md:text-6xl">
              Tipos de reglas
              <br />
              <span className="text-[var(--adamia-blue)]">mas utilizadas</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ruleTypes.map((rule) => (
              <article
                key={rule}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="inline-flex rounded-xl bg-[var(--adamia-blue)]/10 p-3">
                  <Sparkles className="h-5 w-5 text-[var(--adamia-blue)]" />
                </div>
                <h3 className="mt-4 text-xl font-black">{rule}</h3>
                <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
                  Configurable por frecuencia, destinatarios y condiciones.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--adamia-bg-light)] py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <h2 className="text-center text-5xl font-black md:text-6xl">
            ¿Por que automatizar
            <br />
            <span className="text-[var(--adamia-blue)]">tus notificaciones?</span>
          </h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
            {[
              "Ahorra tiempo",
              "Nunca olvides nada",
              "Decisiones mas rapidas",
              "Mejor comunicacion",
            ].map((item) => (
              <article
                key={item}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-8 shadow-sm"
              >
                <h3 className="text-2xl font-black">{item}</h3>
                <p className="mt-3 text-[var(--adamia-text-secondary)]">
                  La plataforma notifica de forma automatica para que el equipo
                  actue a tiempo y mantenga la operacion controlada.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-24 text-white">
        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          <div className="text-7xl">🤖</div>
          <h2 className="mt-6 text-5xl font-black md:text-6xl">
            Tu defines la regla,
            <br />
            el sistema se encarga del resto
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-2xl text-white/90">
            Configura una vez, recibe notificaciones para siempre.
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

      <section className="bg-white py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <h2 className="text-center text-5xl font-black">Multiples canales de notificacion</h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
            <ChannelCard icon={Mail} title="Email" subtitle="Soporte completo" />
            <ChannelCard
              icon={MessageCircleMore}
              title="WhatsApp"
              subtitle="Entrega instantanea"
            />
            <ChannelCard icon={Bell} title="Push" subtitle="Tiempo real" />
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
            ⚡ Automatizacion que funciona
          </div>
          <h2 className="mt-6 text-5xl font-black md:text-6xl">
            Prueba las Reglas de Aviso
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

function FeatureSplit({
  reverse,
  background,
  badge,
  title,
  subtitle,
  description,
  image,
  imageAlt,
  items,
}) {
  return (
    <section className={`${background || "bg-white"} py-24`}>
      <div className="mx-auto w-full max-w-7xl px-6">
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

        <div className="mt-12 grid items-center gap-12 lg:grid-cols-2">
          <div className={reverse ? "order-2 lg:order-1" : "order-1"}>
            <div className="space-y-4">
              {items.map((item) => (
                <article
                  key={item}
                  className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm"
                >
                  <div className="inline-flex rounded-xl bg-[var(--adamia-blue)]/10 p-2">
                    <Copy className="h-5 w-5 text-[var(--adamia-blue)]" />
                  </div>
                  <h3 className="mt-3 text-xl font-black">{item}</h3>
                  <p className="mt-2 text-[var(--adamia-text-secondary)]">
                    Configurable para distintos escenarios operativos y equipos
                    de trabajo.
                  </p>
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

function MiniCard({ icon: Icon, title }) {
  return (
    <article className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm">
      <div className="inline-flex rounded-xl bg-[var(--adamia-blue)]/10 p-2">
        <Icon className="h-5 w-5 text-[var(--adamia-blue)]" />
      </div>
      <h3 className="mt-3 text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
        Notificaciones con contexto completo para una respuesta rapida.
      </p>
    </article>
  );
}

function ChannelCard({ icon: Icon, title, subtitle }) {
  return (
    <article className="rounded-3xl border border-[var(--adamia-blue)]/15 bg-white p-10 text-center shadow-xl">
      <div className="mx-auto inline-flex rounded-full bg-[var(--adamia-blue)]/10 p-5">
        <Icon className="h-9 w-9 text-[var(--adamia-blue)]" />
      </div>
      <h3 className="mt-6 text-2xl font-black">{title}</h3>
      <p className="mt-3 text-[var(--adamia-text-secondary)]">
        Recibe alertas con informacion clave en el canal ideal para tu equipo.
      </p>
      <div className="mt-4 inline-flex rounded-xl bg-[var(--adamia-bg-light)] px-4 py-2 text-sm font-bold">
        {subtitle}
      </div>
    </article>
  );
}
