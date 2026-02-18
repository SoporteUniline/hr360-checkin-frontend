import Link from "next/link";

const valores = [
  {
    title: "Seguridad",
    icon: "🔒",
    description:
      "Protegemos la información de tu empresa con controles robustos, respaldo continuo y buenas prácticas de seguridad.",
  },
  {
    title: "Innovación",
    icon: "🚀",
    description:
      "Evolucionamos constantemente para resolver necesidades reales de Recursos Humanos en empresas mexicanas.",
  },
  {
    title: "Compromiso",
    icon: "🤝",
    description:
      "Tu operación es prioridad para nosotros. Acompañamos implementación, soporte y mejora continua.",
  },
  {
    title: "Precisión",
    icon: "🎯",
    description:
      "Cada cálculo y reporte está pensado para mantener claridad operativa y cumplimiento laboral.",
  },
  {
    title: "Transparencia",
    icon: "💙",
    description:
      "Precios y procesos claros, sin letras pequeñas, para que tomes decisiones con confianza.",
  },
  {
    title: "Accesibilidad",
    icon: "🌎",
    description:
      "Tecnología empresarial al alcance de empresas de distintos tamaños y niveles de madurez digital.",
  },
];

const diferenciales = [
  {
    title: "100% enfocado en México",
    text: "Diseñado para el contexto laboral mexicano y para operaciones reales de RH.",
  },
  {
    title: "Soporte humano y cercano",
    text: "Te atendemos con contexto y seguimiento para resolver rápido lo importante.",
  },
  {
    title: "Plataforma web empresarial",
    text: "Operación y administración centralizada desde una plataforma web moderna.",
  },
  {
    title: "Mejora continua",
    text: "Publicamos mejoras frecuentes basadas en feedback real de clientes.",
  },
];

export default function QuienesSomosPage() {
  return (
    <main className="bg-white text-[var(--adamia-text-primary)]">
      {/* Hero principal de Sobre Nosotros */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-7xl px-6 text-center">
          <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold">
            ✨ CONOCE ADAMIA
          </span>
          <h1 className="mt-6 text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
            Transformando la gestión de
            <br />
            Recursos Humanos en México
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-white/90 md:text-xl">
            Somos más que un software: somos tu aliado estratégico para operar
            RH con claridad, control y velocidad.
          </p>
        </div>
      </section>

      {/* Historia y misión */}
      <section className="py-20">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-6 lg:grid-cols-2">
          <article>
            <span className="inline-flex rounded-full bg-[var(--adamia-blue)]/10 px-4 py-2 text-sm font-bold text-[var(--adamia-blue)]">
              📖 NUESTRA HISTORIA
            </span>
            <h2 className="mt-5 text-3xl font-black leading-tight md:text-4xl">
              Una solución nacida de
              <br />
              <span className="text-[var(--adamia-blue)]">la experiencia real</span>
            </h2>
            <p className="mt-5 text-[var(--adamia-text-secondary)]">
              ADAMIA nace de la experiencia de Uniline en soluciones
              empresariales. Detectamos una necesidad crítica: una plataforma de
              RH moderna, confiable y realmente adaptada a la operación en
              México.
            </p>
            <p className="mt-4 text-[var(--adamia-text-secondary)]">
              Hoy ayudamos a cientos de empresas a digitalizar asistencia,
              personal, incidencias y decisiones de talento con una experiencia
              simple y profesional.
            </p>
          </article>

          <article className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-[var(--adamia-bg-light)] p-8 shadow-xl">
            <div className="text-5xl">🎯</div>
            <h3 className="mt-4 text-2xl font-black">Nuestra misión</h3>
            <p className="mt-3 text-[var(--adamia-text-secondary)]">
              Empoderar a las empresas mexicanas con herramientas de clase
              mundial para que su equipo de RH se enfoque en lo más importante:
              su gente.
            </p>
          </article>
        </div>
      </section>

      {/* Valores */}
      <section className="bg-[var(--adamia-bg-light)] py-20">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="text-center">
            <span className="inline-flex rounded-full bg-[var(--adamia-blue)]/10 px-4 py-2 text-sm font-bold text-[var(--adamia-blue)]">
              💎 NUESTROS VALORES
            </span>
            <h2 className="mt-5 text-3xl font-black md:text-4xl">
              Los pilares que nos guían
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {valores.map((value) => (
              <article
                key={value.title}
                className="rounded-3xl border border-[var(--adamia-blue)]/15 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] text-2xl text-white">
                  {value.icon}
                </div>
                <h3 className="mt-4 text-xl font-black">{value.title}</h3>
                <p className="mt-3 text-[var(--adamia-text-secondary)]">
                  {value.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Impacto */}
      <section className="py-20">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { value: "500+", label: "Empresas activas" },
              { value: "50K+", label: "Empleados gestionados" },
              { value: "4.9/5", label: "Calificación promedio" },
              { value: "15+", label: "Países" },
            ].map((stat) => (
              <article
                key={stat.label}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 text-center shadow-sm"
              >
                <p className="text-3xl font-black text-[var(--adamia-blue)] md:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--adamia-text-secondary)]">
                  {stat.label}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciales */}
      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold">
              ✨ ¿POR QUÉ ADAMIA?
            </span>
            <h2 className="mt-5 text-3xl font-black md:text-4xl">
              La diferencia está en los detalles
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {diferenciales.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-white/25 bg-white/10 p-7 backdrop-blur"
              >
                <p className="text-lg font-black">{item.title}</p>
                <p className="mt-2 text-white/90">{item.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/contratar-plan"
              className="inline-flex items-center rounded-xl bg-white px-8 py-4 text-lg font-black text-[var(--adamia-blue)] shadow-xl transition hover:-translate-y-0.5"
            >
              Comenzar prueba gratis de 7 días →
            </Link>
            <p className="mt-3 text-sm text-white/80">
              Sin tarjeta de crédito • Sin compromiso
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
