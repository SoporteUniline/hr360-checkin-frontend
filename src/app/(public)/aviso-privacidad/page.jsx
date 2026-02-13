import React from "react";

export default function AvisoPrivacidad() {
  return (
    <main className="bg-[var(--adamia-bg-light)] px-5 py-10 md:px-10 lg:px-20">
      <section className="mx-auto mt-8 w-full max-w-5xl rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm md:p-10">
        <header className="border-b border-[var(--adamia-blue)]/10 pb-6">
          <h1 className="text-3xl font-extrabold text-[var(--adamia-text-primary)]">
            Aviso de Privacidad
          </h1>
          <p className="mt-3 text-sm text-[var(--adamia-text-secondary)]">
            Ultima actualizacion: 13 de febrero de 2026
          </p>
          <p className="mt-4 text-[var(--adamia-text-secondary)]">
            En ADAMIA valoramos y protegemos tus datos personales. Este aviso
            explica que informacion recabamos, para que la usamos y que derechos
            tienes sobre ella.
          </p>
        </header>

        <div className="mt-8 space-y-8">
          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              1. Datos personales que recabamos
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-[var(--adamia-text-secondary)]">
              <li>Datos de identificacion: nombre y razon social.</li>
              <li>Datos de contacto: correo electronico, telefono y direccion.</li>
              <li>
                Datos de cuenta: credenciales, preferencias y actividad dentro de
                la plataforma.
              </li>
              <li>
                Datos de soporte: informacion que compartes al solicitar ayuda.
              </li>
            </ul>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              2. Finalidades del tratamiento
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Tratamos tus datos para: crear y administrar cuentas, habilitar el
              uso de funcionalidades, brindar soporte, mejorar la experiencia de
              usuario, prevenir fraude y cumplir obligaciones legales.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              3. Transferencias de datos
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              ADAMIA no vende datos personales. Solo compartimos informacion
              cuando es necesario para operar el servicio (por ejemplo,
              proveedores tecnologicos bajo acuerdos de confidencialidad) o por
              requerimiento legal de autoridad competente.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              4. Conservacion y seguridad
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Conservamos los datos durante el tiempo necesario para cumplir las
              finalidades descritas y aplicamos medidas administrativas, tecnicas
              y organizativas razonables para proteger la informacion.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              5. Derechos ARCO y revocacion
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Puedes solicitar el acceso, rectificacion, cancelacion u oposicion
              (ARCO) de tus datos, asi como revocar tu consentimiento para
              ciertos tratamientos, escribiendo al correo de contacto.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              6. Cookies y tecnologias similares
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Utilizamos cookies y herramientas similares para mantener la sesion
              activa, recordar preferencias y analizar el uso de la plataforma.
              Puedes ajustar estas preferencias desde tu navegador.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              7. Cambios a este aviso
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Este aviso puede actualizarse por cambios legales o mejoras en
              nuestros procesos. La version vigente estara disponible en esta
              pagina.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              8. Contacto
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Para cualquier solicitud de privacidad, puedes escribir a{" "}
              <a
                href="mailto:soporte@adamia.mx"
                className="font-semibold text-[var(--adamia-blue)] underline"
              >
                soporte@adamia.mx
              </a>
              .
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
