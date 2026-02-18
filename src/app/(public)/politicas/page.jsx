const secciones = [
  {
    title: "Identidad y responsable",
    body: "Uniline Innovación en la Nube, S.A. de C.V. es responsable del tratamiento de datos personales de acuerdo con la LFPDPPP y normativa aplicable en México.",
  },
  {
    title: "Datos que recabamos",
    body: "Podemos recabar datos de identificación, contacto, laborales, fiscales, de uso de plataforma y, cuando aplique, datos sensibles como biométricos o geolocalización con consentimiento expreso.",
  },
  {
    title: "Finalidades del tratamiento",
    body: "Usamos la información para operar ADAMIA, gestionar asistencia y procesos de RH, brindar soporte, cumplir obligaciones legales/fiscales y mejorar el servicio.",
  },
  {
    title: "Transferencias de datos",
    body: "Podemos transferir datos a proveedores tecnológicos y de pago bajo contratos de confidencialidad y seguridad. No vendemos datos personales.",
  },
  {
    title: "Seguridad de la información",
    body: "Aplicamos medidas técnicas, administrativas y organizativas para proteger los datos contra acceso no autorizado, alteración, pérdida o destrucción.",
  },
  {
    title: "Derechos ARCO",
    body: "Puedes solicitar acceso, rectificación, cancelación u oposición escribiendo a privacidad@adamia.mx. Daremos seguimiento en los plazos legales aplicables.",
  },
  {
    title: "Cookies",
    body: "Utilizamos cookies esenciales y de rendimiento para mejorar la experiencia. Puedes gestionar tus preferencias desde el navegador y configuraciones de la plataforma.",
  },
  {
    title: "Cambios a esta política",
    body: "Podemos actualizar este documento por cambios legales o de servicio. Publicaremos la versión vigente en esta misma página.",
  },
];

export default function PoliticasPage() {
  return (
    <main className="bg-[var(--adamia-bg-light)] text-[var(--adamia-text-primary)]">
      {/* Encabezado legal con branding ADAMIA */}
      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-14 text-white">
        <div className="mx-auto w-full max-w-7xl px-6">
          <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold">
            🔒 POLÍTICAS LEGALES
          </span>
          <h1 className="mt-4 text-3xl font-black md:text-4xl">
            Políticas de Privacidad y Protección de Datos
          </h1>
          <p className="mt-3 max-w-3xl text-white/90">
            Tu privacidad y la seguridad de tu información son parte central de
            ADAMIA.
          </p>
          <p className="mt-2 text-xs text-white/80">
            Última actualización: febrero 2026
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto w-full max-w-7xl px-6">
          <article className="rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-black">Aviso de Privacidad Integral</h2>
            <p className="mt-3 text-[var(--adamia-text-secondary)]">
              Este aviso describe qué datos personales tratamos, por qué lo
              hacemos, cómo protegemos la información y cómo puedes ejercer tus
              derechos. Está alineado con la legislación mexicana vigente.
            </p>
          </article>

          <div className="mt-6 grid gap-4">
            {secciones.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-black text-[var(--adamia-blue)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[var(--adamia-text-secondary)]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>

          <article className="mt-6 rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-[var(--adamia-blue)]">
              Contacto del área de privacidad
            </h3>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Para solicitudes ARCO o consultas sobre tratamiento de datos:
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                Correo:{" "}
                <a className="font-semibold text-[var(--adamia-blue)]" href="mailto:privacidad@adamia.mx">
                  privacidad@adamia.mx
                </a>
              </li>
              <li>
                Soporte:{" "}
                <a className="font-semibold text-[var(--adamia-blue)]" href="mailto:soporte@adamia.mx">
                  soporte@adamia.mx
                </a>
              </li>
              <li>Teléfono: +52 317 388 7959</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
