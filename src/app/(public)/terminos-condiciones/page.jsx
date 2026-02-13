import React from "react";

export default function TerminosCondiciones() {
  return (
    <main className="bg-[var(--adamia-bg-light)] px-5 py-10 md:px-10 lg:px-20">
      <section className="mx-auto mt-8 w-full max-w-5xl rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm md:p-10">
        <header className="border-b border-[var(--adamia-blue)]/10 pb-6">
          <h1 className="text-3xl font-extrabold text-[var(--adamia-text-primary)]">
            Terminos y Condiciones de Uso
          </h1>
          <p className="mt-3 text-sm text-[var(--adamia-text-secondary)]">
            Ultima actualizacion: 13 de febrero de 2026
          </p>
          <p className="mt-4 text-[var(--adamia-text-secondary)]">
            Estos terminos regulan el acceso y uso de la plataforma ADAMIA. Al
            registrarte o utilizar nuestros servicios, aceptas cumplir con lo
            aqui establecido.
          </p>
        </header>

        <div className="mt-8 space-y-8">
          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              1. Alcance del servicio
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              ADAMIA ofrece herramientas digitales para apoyar procesos de
              reclutamiento, gestion de vacantes, publicacion de ofertas y
              administracion de informacion relacionada con talento humano.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              2. Registro y cuenta
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-[var(--adamia-text-secondary)]">
              <li>Debes proporcionar informacion veraz, completa y actualizada.</li>
              <li>Eres responsable del uso de tu cuenta y credenciales.</li>
              <li>
                ADAMIA puede solicitar validaciones adicionales para verificar la
                identidad de la empresa registrada.
              </li>
            </ul>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              3. Uso permitido y restricciones
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              El usuario se compromete a utilizar la plataforma de forma licita,
              etica y conforme a la normatividad aplicable. Queda prohibido:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-[var(--adamia-text-secondary)]">
              <li>Publicar informacion falsa, enganosa o discriminatoria.</li>
              <li>Suplantar identidades o manipular procesos de seleccion.</li>
              <li>
                Realizar actividades que afecten la disponibilidad, seguridad o
                integridad de la plataforma.
              </li>
            </ul>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              4. Contenido y propiedad intelectual
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              La marca ADAMIA, su diseno, logotipos, software, contenidos y
              elementos visuales son propiedad de sus titulares y estan
              protegidos por la legislacion aplicable. No se autoriza su uso sin
              permiso previo y por escrito.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              5. Suspension o cancelacion
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              ADAMIA puede suspender o cancelar cuentas que incumplan estos
              terminos, detecten actividad fraudulenta o representen un riesgo
              para otros usuarios o para la plataforma.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              6. Limitacion de responsabilidad
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              ADAMIA proporciona la plataforma tal cual, implementando medidas
              razonables de operacion y seguridad. No garantizamos
              disponibilidad ininterrumpida, y no nos hacemos responsables por
              danos indirectos derivados del uso inadecuado de la informacion
              publicada por terceros.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              7. Modificaciones a los terminos
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Podemos actualizar estos terminos para reflejar cambios legales,
              operativos o de producto. La version vigente sera la publicada en
              esta pagina.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-bold text-[var(--adamia-text-primary)]">
              8. Contacto
            </h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Para dudas relacionadas con estos terminos, puedes escribir a{" "}
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
