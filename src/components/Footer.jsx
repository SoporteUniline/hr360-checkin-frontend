import Link from "next/link";
import Image from "next/image";
import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-12 text-white">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/assets/adamia.png"
                alt="ADAMIA"
                width={180}
                height={60}
                className="h-12 w-auto"
              />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Plataforma empresarial de Recursos Humanos en la nube con control
              biométrico y reportes en tiempo real.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold">Contacto</h4>
            <div className="mt-4 space-y-3 text-sm text-white/80">
              <div className="flex items-start gap-3">
                <span className="text-lg">📧</span>
                <div>
                  <p className="font-medium text-white">Email</p>
                  <a
                    className="transition hover:text-white"
                    href="mailto:sistema@adamia.mx"
                  >
                    sistema@adamia.mx
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">📱</span>
                <div>
                  <p className="font-medium text-white">Teléfono</p>
                  <a
                    className="transition hover:text-white"
                    href="tel:+523173887959"
                  >
                    +52 317 128 8029
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">📍</span>
                <div>
                  <p className="font-medium text-white">Dirección</p>
                  <p>Autlán de Navarro, Jalisco, MX</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold">Enlaces</h4>
            <div className="mt-4 space-y-3 text-sm text-white/80">
              <Link className="block transition hover:text-white" href="/">
                → Inicio
              </Link>
              <Link
                className="block transition hover:text-white"
                href="/quienes-somos"
              >
                → Quiénes somos
              </Link>
              <a
                className="block transition hover:text-white"
                href="/contratar-plan"
                target="_blank"
                rel="noreferrer"
              >
                → Contratar
              </a>
              <Link className="block transition hover:text-white" href="/login">
                → Iniciar sesión
              </Link>
              <Link
                className="block transition hover:text-white"
                href="/aviso-privacidad"
              >
                → Ayuda
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/20 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-white/70 md:flex-row">
            <div>&copy; 2026 ADAMIA. Todos los derechos reservados.</div>
            <div>Hecho con ❤️ en México</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
