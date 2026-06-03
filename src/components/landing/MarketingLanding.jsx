import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Play,
  Shield,
  Monitor,
  Calculator,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AdamiaChatWidget from "@/components/landing/AdamiaChatWidget";
import Navbar from "@/components/Navbar";
import SystemMessageRenderer from "@/components/system-messages/SystemMessageRenderer";
import Footer from "../Footer";

/**
 * Landing principal (solo UI).
 * - Relación: se usa desde `src/app/(landing)/page.jsx`.
 * - Nota: no usa hooks; se mantiene como componente puro para legibilidad.
 */
export default function MarketingLanding() {
  return (
    <div className="min-h-[100dvh] bg-white text-[var(--adamia-text-primary)] overflow-x-hidden">
      <Navbar />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] pt-16 text-white">
        {/* Decoración radial (equivalente a ::before/::after del HTML) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-24 h-[720px] w-[720px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12)_0%,transparent_70%)] adamia-float-8"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -left-20 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.10)_0%,transparent_70%)] adamia-float-10"
        />

        <div className="relative mx-auto w-full max-w-7xl px-6 py-16 md:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur md:text-[14px]">
                <span className="text-lg">⚡</span>
                <span>7 días de prueba GRATIS • Sin tarjeta</span>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold tracking-wide text-[var(--adamia-blue)]">
                  NUEVO
                </span>
              </div>

              <h1 className="mt-7 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl xl:text-7xl">
                Plataforma
                <br />
                empresarial
                <br />
                de{" "}
                <span className="font-black">
                  Recursos
                  <br />
                  Humanos
                </span>
              </h1>

              <p className="mt-6 text-lg text-white/90 md:text-xl lg:text-2xl">
                Control de asistencia biométrico, gestión de personal y reportes
                en tiempo real
              </p>

              <p className="mt-4 text-base text-white/80 md:text-lg">
                <strong className="font-semibold text-white">
                  Empresas de distintos sectores
                </strong>{" "}
                ya digitalizaron su gestión de RRHH
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4 lg:justify-start">
                <Button
                  asChild
                  className="h-12 rounded-xl bg-white px-7 text-base font-semibold text-[var(--adamia-blue)] shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.2)]"
                >
                  <a href="/contratar-plan" target="_blank" rel="noreferrer">
                    Comenzar prueba gratis{" "}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>

                <Button
                  asChild
                  variant="secondary"
                  className={cn(
                    "h-12 rounded-xl border-2 border-white/30 bg-white/15 px-7 text-base font-semibold text-white backdrop-blur",
                    "transition hover:bg-white/25 hover:border-white/50",
                  )}
                >
                  <a href="#demo">
                    Ver demo <Play className="ml-2 h-5 w-5" />
                  </a>
                </Button>
              </div>

              {/* Stats */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
                <div className="text-left">
                  <div className="text-xs text-white/70">Implementación</div>
                  <div className="flex items-center gap-1 text-base font-semibold">
                    <span>⚡</span>
                    <span>5 minutos</span>
                  </div>
                </div>

                <div className="hidden h-10 w-px bg-white/20 sm:block" />

                <div className="text-left">
                  <div className="text-xs text-white/70">Soporte</div>
                  <div className="flex items-center gap-1 text-base font-semibold">
                    <span>💬</span>
                    <span>En vivo</span>
                  </div>
                </div>
              </div>

              {/* Anchor para "Ver demo" */}
              <div id="demo" className="sr-only" />
            </div>

            {/* Right card */}
            <div className="relative">
              <div className="rounded-3xl border border-white/20 bg-white/90 p-5 text-[var(--adamia-text-primary)] shadow-[0_20px_40px_rgba(0,0,0,0.12)] backdrop-blur sm:p-8 lg:p-10">
                <div className="mb-8 flex items-center justify-between">
                  <div className="text-xs font-medium text-[color:rgba(37,99,235,0.65)] sm:text-sm">
                    Datos del panel demo
                  </div>
                  <div className="text-2xl sm:text-3xl">📊</div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                  <div>
                    <div className="mb-2 text-sm font-medium text-[var(--adamia-text-secondary)]">
                      Empleados activos
                    </div>
                    <div className="text-4xl font-extrabold leading-none text-transparent bg-clip-text bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] sm:text-5xl">
                      1,250
                    </div>
                    <div className="mt-2 text-base font-semibold text-[var(--adamia-blue)] sm:text-sm">
                      ↗ +12% este mes
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-medium text-[var(--adamia-text-secondary)]">
                      Asistencia hoy
                    </div>
                    <div className="text-4xl font-extrabold leading-none text-transparent bg-clip-text bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] sm:text-5xl">
                      98%
                    </div>
                    <div className="mt-2 text-base font-semibold text-[var(--adamia-blue)] sm:text-sm">
                      ✓ Excelente
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[var(--adamia-text-secondary)]">
                        Acceso al sistema
                      </div>
                      <div className="mt-1 text-2xl font-bold text-[var(--adamia-text-primary)]">
                        Web empresarial
                      </div>
                    </div>
                    <div className="text-5xl">📱</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-6 md:pb-0">
          <SystemMessageRenderer tipo="externa" contexto="landing" />
        </div>
      </section>

      {/* Companies */}
      <section className="border-b border-gray-100 bg-white py-12">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--adamia-text-secondary)]">
              Empresas que confían en ADAMIA
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 place-items-center gap-6 md:grid-cols-3 md:gap-8">
            {["MOBLAR", "STT", "ULTRAFARMS"].map((t) => (
              <div
                key={t}
                className="select-none text-[clamp(1.9rem,8vw,3rem)] leading-none font-bold tracking-tight text-gray-400 opacity-80 grayscale transition hover:grayscale-0 hover:opacity-100 hover:scale-[1.03]"
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-20 md:py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex rounded-full bg-blue-600/10 px-4 py-2 text-sm font-semibold text-[var(--adamia-blue)]">
              PLATAFORMA COMPLETA
            </div>
            <h2 className="mt-5 text-4xl font-bold md:text-5xl lg:text-6xl">
              Todo lo que necesitas en{" "}
              <span className="font-black text-[var(--adamia-blue)]">
                una sola plataforma
              </span>
            </h2>
            <p className="mt-6 text-xl text-[var(--adamia-text-secondary)]">
              Administra tu capital humano de forma centralizada y segura
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<Monitor className="h-8 w-8 text-white" />}
              title="Plataforma Web"
              description="Gestión integral desde navegador con sincronización en tiempo real"
              items={[
                "Reconocimiento facial",
                "Validación GPS",
                "Solicitudes en línea",
              ]}
            />

            <FeatureCard
              featured
              icon={<Shield className="h-8 w-8 text-white" />}
              badge="SEGURIDAD EMPRESARIAL"
              title="Cloud Enterprise"
              description="Infraestructura segura para operación empresarial"
              items={[
                "Conexión segura SSL",
                "Backups automáticos",
                "Accesos protegidos",
              ]}
            />

            <FeatureCard
              icon={<Calculator className="h-8 w-8 text-white" />}
              title="Calculadoras Legales"
              description="Herramientas especializadas según normativa mexicana"
              items={["Finiquitos", "Aguinaldo y PTU", "Vacaciones"]}
            />
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-white py-20 md:py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold md:text-5xl">
              Transformación digital para RRHH
            </h2>
            <p className="mt-4 text-xl text-[var(--adamia-text-secondary)]">
              Antes y después de implementar ADAMIA
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            <div className="rounded-3xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-red-100 p-10">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500 text-2xl text-white">
                  ✗
                </div>
                <h3 className="text-2xl font-semibold">Sin ADAMIA</h3>
              </div>
              <ul className="space-y-4 text-[var(--adamia-text-secondary)]">
                {[
                  "Procesos manuales lentos",
                  "Fraude en asistencias",
                  "Datos desorganizados",
                  "Sin visibilidad real",
                  "Procesos administrativos lentos",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="text-xl text-red-500">✗</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border-2 border-[var(--adamia-blue)] bg-gradient-to-br from-blue-50 to-blue-100 p-10 shadow-[0_10px_28px_rgba(37,99,235,0.14)]">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] text-2xl text-white">
                  ✓
                </div>
                <h3 className="text-2xl font-semibold">Con ADAMIA</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Automatización total",
                  "Biometría + GPS",
                  "Cloud centralizado",
                  "Analytics en vivo",
                  "Mayor eficiencia operativa",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="text-xl font-bold text-[var(--adamia-blue)]">
                      ✓
                    </span>
                    <span className="font-semibold text-[var(--adamia-text-primary)]">
                      {t}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-xl bg-white p-4 shadow-lg">
                <div className="font-semibold text-[var(--adamia-blue)]">
                  🚀 Implementación rápida y sencilla
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-20 md:py-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-amber-900">
              ⭐ CASOS DE ÉXITO
            </div>
            <h2 className="mt-5 text-4xl font-bold md:text-5xl lg:text-6xl">
              Lo que dicen{" "}
              <span className="font-black text-[var(--adamia-blue)]">
                nuestros clientes
              </span>
            </h2>
            <p>
              Empresas de distintos sectores utilizan herramientas digitales
              para optimizar su gestión de RRHH
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <TestimonialCard
              initial="M"
              name="Responsable de Recursos Humanos"
              role="Empresa del sector mueblero"
              quote="“ADAMIA nos ahorró bastante tiempo. El control biométrico es impresionante.”"
              meta="Sector mueblero"
            />
            <TestimonialCard
              initial="C"
              name="Director General"
              role="Empresa de servicios"
              quote="“La mejor inversión que hemos hecho. Plataforma intuitiva y soporte excelente.”"
              meta="Sector servicios"
            />
            <TestimonialCard
              initial="A"
              name="Gerencia Administrativa"
              role="Empresa agroindustrial"
              quote="“De Excel a plataforma enterprise. Implementación rápida y resultados inmediatos.”"
              meta="Sector agroindustrial"
            />
          </div>

          {/* <div className="mt-16 text-center">
            <div className="inline-block rounded-2xl border border-gray-200 bg-white px-10 py-6 shadow-lg">
              <div className="flex items-center justify-center gap-3">
                <span className="text-5xl">⭐</span>
                <div className="text-5xl font-extrabold leading-none text-transparent bg-clip-text bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)]">
                  4.9
                </div>
                <span className="text-2xl text-[var(--adamia-text-secondary)]">
                  /5
                </span>
              </div>
              <p className="mt-2 font-semibold text-[var(--adamia-text-secondary)]">
                Clientes de sectores como retail, campo, servicios y manufactura
              </p>
            </div>
          </div> */}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white md:py-24">
        <div aria-hidden="true" className="absolute inset-0 opacity-10">
          <div className="absolute left-10 top-10 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <span>💎</span>
              <span>PRUEBA SIN COMPROMISO</span>
            </div>
            <h2 className="mt-6 text-4xl font-bold md:text-5xl">
              Empieza con 7 días gratis
            </h2>
            <p className="mt-4 text-xl text-white/90">
              Sin tarjeta • Sin compromiso • Cancela cuando quieras
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-4xl">
            <div className="rounded-3xl border border-white/20 bg-white/90 p-10 text-[var(--adamia-text-primary)] shadow-[0_20px_40px_rgba(0,0,0,0.12)] backdrop-blur lg:p-12">
              <div className="text-center">
                <div className="text-6xl adamia-pulse mb-6">🎁</div>
                <h3 className="text-3xl font-bold">
                  Prueba completa de 7 días
                </h3>
                <p className="mt-2 text-xl text-[var(--adamia-text-secondary)]">
                  Acceso total sin restricciones
                </p>
              </div>

              <div className="mt-10 grid gap-6 md:grid-cols-3">
                {[
                  {
                    top: "✓",
                    title: "Plataforma web",
                    sub: "Acceso en navegador",
                  },
                  { top: "✓", title: "Sin límites", sub: "Todo incluido" },
                  { top: "✓", title: "Soporte VIP", sub: "Chat en vivo" },
                ].map((c) => (
                  <div
                    key={c.title}
                    className="rounded-2xl bg-blue-600/5 p-6 text-center"
                  >
                    <div className="text-4xl">{c.top}</div>
                    <div className="mt-3 font-semibold">{c.title}</div>
                    <div className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
                      {c.sub}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 text-center">
                <a
                  href="/contratar-plan"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-12 py-5 text-xl font-semibold text-white shadow-2xl transition hover:scale-[1.03]"
                >
                  Comenzar prueba gratis <span className="ml-2">→</span>
                </a>
                <p className="mt-4 text-sm text-[var(--adamia-text-secondary)]">
                  💳 No pedimos tarjeta • ⚡ Setup en 5 minutos
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-20 md:py-24">
        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          <div className="inline-flex rounded-full bg-blue-600/10 px-4 py-2 text-sm font-semibold text-[var(--adamia-blue)] md:text-base">
            <span>⚡ Digitaliza tu departamento de RH</span>
          </div>

          <h2 className="mt-7 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            ¿Listo para optimizar{" "}
            <span className="font-black text-[var(--adamia-blue)]">
              tu gestión de RRHH?
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-xl text-[var(--adamia-text-secondary)] md:text-2xl">
            Empresas de distintos sectores ya están optimizando sus procesos de
            Recursos Humanos con ADAMIA.
          </p>

          <div className="mt-10 flex justify-center">
            <a
              href="/contratar-plan"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-12 py-6 text-2xl font-semibold text-[var(--adamia-blue)] shadow-2xl ring-1 ring-black/5 transition hover:-translate-y-0.5"
            >
              Comenzar prueba gratis <span className="text-3xl">→</span>
            </a>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-8 text-lg text-[var(--adamia-text-secondary)]">
            {[
              "7 días gratis",
              "Sin tarjeta",
              "Setup 5 min",
              "Soporte incluido",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="text-2xl">✓</span>
                <span className="font-medium">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer (según Landing.txt) */}
      <Footer />

      {/* Chatbot UI (solo frontend) */}
      <AdamiaChatWidget />
    </div>
  );
}

function FeatureCard({ icon, title, description, items, featured, badge }) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-gray-200 bg-white p-8 transition",
        "hover:-translate-y-1 hover:border-[var(--adamia-blue)] hover:shadow-[0_12px_32px_rgba(37,99,235,0.08)]",
        featured &&
          "border-2 border-[var(--adamia-blue)] shadow-[0_12px_32px_rgba(37,99,235,0.12)]",
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] shadow-[0_8px_16px_rgba(37,99,235,0.2)]">
        {icon}
      </div>

      {badge ? (
        <div className="mt-6 inline-flex rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 text-xs font-bold text-white">
          {badge}
        </div>
      ) : null}

      <h3 className="mt-6 text-2xl font-semibold">{title}</h3>
      <p className="mt-4 text-lg leading-relaxed text-[var(--adamia-text-secondary)]">
        {description}
      </p>

      <div className="mt-6 space-y-3">
        {items.map((it) => (
          <div key={it} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600/10">
              <Check className="h-3.5 w-3.5 text-[var(--adamia-blue)]" />
            </div>
            <span className="text-[var(--adamia-text-secondary)]">{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialCard({ initial, name, role, quote, meta }) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-8 transition hover:-translate-y-1 hover:border-[var(--adamia-blue)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] text-2xl font-bold text-white">
          {initial}
        </div>

        <div className="min-w-0">
          <div className="text-lg font-semibold leading-tight">{name}</div>
          <div className="mt-1 text-sm leading-snug text-[var(--adamia-text-secondary)]">
            {role}
          </div>
        </div>
      </div>

      <div className="mt-4 text-yellow-500">★★★★★</div>

      <p className="mt-4 leading-relaxed text-[var(--adamia-text-secondary)]">
        {quote}
      </p>

      <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--adamia-blue)]">
        <span>✓</span>
        <span>{meta}</span>
      </div>
    </div>
  );
}
