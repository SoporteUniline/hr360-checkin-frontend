import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesColumn,
  Clock3,
  ContactRound,
  FileText,
  Filter,
  Info,
  ListChecks,
  PanelRight,
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

const imgs = {
  infoGeneral:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765490476/Captura_de_pantalla_2025-12-11_a_la_s_4.01.12_p.m._bxxc1g.png",
  permisos:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765490488/Captura_de_pantalla_2025-12-11_a_la_s_4.01.23_p.m._fvedin.png",
  asistencias:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765490500/Captura_de_pantalla_2025-12-11_a_la_s_4.01.35_p.m._l9di8j.png",
  entradas:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765490515/Captura_de_pantalla_2025-12-11_a_la_s_4.01.50_p.m._uzg7cu.png",
  contratos:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765490525/Captura_de_pantalla_2025-12-11_a_la_s_4.02.00_p.m._lnltaw.png",
  vacaciones1:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765490556/Captura_de_pantalla_2025-12-11_a_la_s_4.02.27_p.m._xoucgc.png",
  vacaciones2:
    "https://res.cloudinary.com/dstcnsu6a/image/upload/v1765490539/Captura_de_pantalla_2025-12-11_a_la_s_4.02.14_p.m._un9zmi.png",
};

export default function DashboardEmpleadosPage() {
  return (
    <main className="bg-white text-[var(--adamia-text-primary)]">
      <section className="bg-[var(--adamia-bg-light)] py-4">
        <div className="mx-auto w-full max-w-7xl px-6 text-sm text-[var(--adamia-text-secondary)]">
          <span>Inicio</span> <span className="mx-2">→</span>
          <span>Funcionalidades</span> <span className="mx-2">→</span>
          <span className="font-semibold text-[var(--adamia-text-primary)]">
            Dashboard de Empleados
          </span>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div className="mx-auto w-full max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-bold">
            <BadgeCheck className="h-4 w-4" />
            MODULO DE EMPLEADOS
          </div>

          <h1 className="mt-8 text-5xl font-black leading-tight md:text-6xl lg:text-7xl">
            El Panel de Analisis
            <br />
            <span className="text-cyan-200">Mas Completo</span>
          </h1>

          <p className="mx-auto mt-6 max-w-5xl text-xl text-white/90">
            Gestiona toda la informacion laboral de tus empleados desde un solo
            lugar, con una plataforma moderna, visual y poderosa que centraliza
            asistencias, permisos, contratos, vacaciones, entradas/salidas y
            datos generales.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-base font-semibold">
            <div className="inline-flex items-center gap-2">
              <ZapDot /> Tu equipo siempre informado
            </div>
            <div className="inline-flex items-center gap-2">
              <ChartNoAxesColumn className="h-5 w-5" /> Tu operacion bajo control
            </div>
          </div>

          <a
            href="https://planes.hr360.mx/contratar-plan"
            target="_blank"
            rel="noreferrer"
            className="mt-10 inline-flex items-center rounded-2xl bg-white px-10 py-5 text-xl font-black text-[var(--adamia-blue)] shadow-2xl transition hover:-translate-y-1"
          >
            Probar gratis 7 dias <ArrowRight className="ml-2 h-5 w-5" />
          </a>
        </div>
      </section>

      <FeatureSection
        number="01"
        title="Informacion General"
        icon={Info}
        image={imgs.infoGeneral}
        imageAlt="Informacion general del empleado"
        points={[
          "Porcentaje de asistencia actualizado en tiempo real",
          "Permisos tomados con desglose completo",
          "Dias de vacaciones acumulados y utilizados",
          "Contratos activos con estado y vigencia",
          "Datos personales, laborales y de contacto centralizados",
        ]}
        highlight="Disenado para que un gerente o supervisor conozca la situacion de cualquier trabajador en segundos."
      />

      <FeatureSection
        reverse
        number="02"
        title="Permisos"
        icon={ListChecks}
        image={imgs.permisos}
        imageAlt="Analisis de permisos"
        points={[
          "Visualiza todos los permisos solicitados por empleado",
          "Filtro por rangos de fechas para analisis especificos",
          "Diferenciacion clara por tipo de permiso",
          "Estados de aprobacion en tiempo real",
          "Dias calculados automaticamente sin errores",
        ]}
        highlight="Ideal para mantener una operacion organizada y transparente."
        background="bg-[var(--adamia-bg-light)]"
      />

      <section className="py-24">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-4 shadow-xl">
            <img src={imgs.asistencias} alt="Analisis de asistencias" className="w-full rounded-2xl" />
          </div>
          <div>
            <div className="mb-4 inline-flex items-center rounded-xl bg-[var(--adamia-blue)]/10 p-3">
              <ShieldCheck className="h-7 w-7 text-[var(--adamia-blue)]" />
            </div>
            <h2 className="text-5xl font-black">Asistencias</h2>
            <p className="mt-5 text-xl text-[var(--adamia-text-secondary)]">
              El modulo mas completo para analizar la puntualidad y asistencia del
              personal con nivel de detalle profesional.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                "Justificadas e injustificadas",
                "Registros sin checar",
                "Vacaciones registradas",
                "Dias festivos",
                "Dias de descanso",
                "Cierres automaticos",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-[var(--adamia-blue)]/15 bg-[var(--adamia-bg-light)] p-3 text-sm font-semibold"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border-l-4 border-[var(--adamia-blue)] bg-[var(--adamia-blue)]/5 p-5">
              <p className="font-semibold">Podras ver:</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--adamia-text-secondary)]">
                <li>• Porcentaje total de asistencia</li>
                <li>• Dias trabajados y dias con falta</li>
                <li>• Detalle de entrada, salida y horas trabajadas</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <FeatureSection
        reverse
        number="04"
        title="Entradas y Salidas"
        subtitle="(Reloj Checador)"
        icon={Clock3}
        image={imgs.entradas}
        imageAlt="Entradas y salidas"
        points={[
          "Entrada promedio por periodo",
          "Salida promedio por periodo",
          "Tiempo acumulado entre fechas seleccionadas",
          "Total de registros filtrado por dia, mes o ano",
        ]}
        highlight="Perfecto para empresas que requieren control de horarios con precision y estadisticas reales."
        background="bg-[var(--adamia-bg-light)]"
      />

      <FeatureSection
        number="05"
        title="Contratos"
        icon={ScrollText}
        image={imgs.contratos}
        imageAlt="Historial de contratos"
        points={[
          "Vista en lista para localizar contratos rapidamente",
          "Detalle completo: tipo, vigencia, salario y prestaciones",
          "Estados del contrato: activo, por vencer y vencido",
          "Informacion salarial clara y estructurada",
          "Jornada laboral y puesto asignado",
        ]}
        highlight="Facilita auditorias, renovaciones y administracion interna."
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-24 text-white">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-bold">
              <PanelRight className="h-4 w-4" /> FUNCION MAS VALORADA
            </div>
            <h2 className="mt-6 text-6xl font-black">Vacaciones</h2>
            <p className="mt-4 text-2xl text-cyan-100">
              La forma mas clara y bonita de visualizar vacaciones.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            <VacationCard
              title="Vista en Tabla"
              description="Todos los dias tomados con filtros por periodo."
              image={imgs.vacaciones1}
            />
            <VacationCard
              title="Selector de Mes"
              description="Seleccion rapida del mes que quieres revisar."
              image={imgs.vacaciones1}
            />
            <VacationCard
              title="Vista Calendario"
              description="Calendario interactivo por mes con dias sombreados."
              image={imgs.vacaciones2}
            />
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            {[
              { icon: CalendarDays, t: "Vista en tabla", s: "Con filtros por periodo" },
              { icon: BadgeCheck, t: "Dias sombreados", s: "Visibles con claridad" },
              { icon: ChartNoAxesColumn, t: "Resumen completo", s: "Totales, tomados y pendientes" },
            ].map((item) => (
              <article
                key={item.t}
                className="rounded-2xl border border-white/25 bg-white/10 p-6 text-center backdrop-blur"
              >
                <item.icon className="mx-auto h-8 w-8" />
                <p className="mt-3 font-bold">{item.t}</p>
                <p className="mt-1 text-sm text-cyan-100">{item.s}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 text-center">
            <div className="inline-block rounded-2xl border border-white/25 bg-white/15 px-8 py-4">
              <p className="text-xl font-bold">
                Perfecto para empleados, administradores y RH
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-5xl font-black leading-tight md:text-6xl">
            ADAMIA: la plataforma creada
            <br />
            para que tu empresa
            <br />
            <span className="text-[var(--adamia-blue)]">funcione mejor</span>
          </h2>
          <p className="mx-auto mt-8 max-w-3xl text-2xl text-[var(--adamia-text-secondary)]">
            Todo en un solo lugar. Claro. Moderno. Preciso.
            <br />
            Todo lo que Recursos Humanos necesita para trabajar sin fricciones.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="https://planes.hr360.mx/contratar-plan"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-12 py-5 text-2xl font-black text-white shadow-2xl transition hover:-translate-y-1"
            >
              Comenzar prueba gratis <ArrowRight className="ml-2 h-6 w-6" />
            </a>
            <a
              href="/funcionalidades"
              className="inline-flex items-center justify-center rounded-2xl bg-[var(--adamia-bg-light)] px-12 py-5 text-2xl font-bold text-[var(--adamia-text-primary)] transition hover:bg-gray-200"
            >
              Ver mas modulos 📚
            </a>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-8 text-lg text-[var(--adamia-text-secondary)]">
            {["7 dias gratis", "Sin tarjeta", "Setup en 5 min", "Soporte incluido"].map((item) => (
              <div key={item} className="inline-flex items-center gap-2 font-semibold">
                <CheckDot /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureSection({
  reverse,
  number,
  title,
  subtitle,
  icon: Icon,
  image,
  imageAlt,
  points,
  highlight,
  background,
}) {
  return (
    <section className={`${background || "bg-white"} py-24`}>
      <div className="mx-auto grid w-full max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        <div className={reverse ? "order-1 lg:order-2" : "order-1"}>
          <div className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-4 shadow-xl">
            <img src={image} alt={imageAlt} className="w-full rounded-2xl" />
          </div>
        </div>

        <div className={reverse ? "order-2 lg:order-1" : "order-2"}>
          <p className="text-6xl font-black text-[var(--adamia-blue)]/10">{number}</p>
          <div className="mt-2 inline-flex rounded-xl bg-[var(--adamia-blue)]/10 p-3">
            <Icon className="h-7 w-7 text-[var(--adamia-blue)]" />
          </div>
          <h2 className="mt-5 text-5xl font-black">
            {title}
            {subtitle ? <span className="mt-1 block text-3xl text-[var(--adamia-text-secondary)]">{subtitle}</span> : null}
          </h2>

          <div className="mt-6 space-y-3">
            {points.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckDot />
                <p className="text-lg text-[var(--adamia-text-secondary)]">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border-l-4 border-[var(--adamia-blue)] bg-[var(--adamia-blue)]/5 p-5">
            <p className="font-semibold text-[var(--adamia-text-primary)]">{highlight}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function VacationCard({ title, description, image }) {
  return (
    <article className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
      <img src={image} alt={title} className="w-full rounded-2xl border border-white/20" />
      <h3 className="mt-4 text-2xl font-black">{title}</h3>
      <p className="mt-2 text-cyan-100">{description}</p>
    </article>
  );
}

function CheckDot() {
  return (
    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--adamia-blue)]/15 text-[11px] font-black text-[var(--adamia-blue)]">
      ✓
    </span>
  );
}

function ZapDot() {
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15">⚡</span>;
}
