import Image from "next/image";
import { ShieldCheck } from "lucide-react";

/**
 * Contenedor compartido para pantallas de autenticación (/login y /recuperacion).
 * Mantiene la vista dividida en escritorio y centrada de forma nativa en móvil.
 */
export default function AuthSplitShell({
  nav,
  title,
  subtitle,
  securityText = "Conexión segura y cifrada",
  headerExtra = null,
  children,
}) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 min-h-screen min-h-[100dvh]">
      <div className="hidden md:block">
        <section className="relative min-h-screen flex flex-col justify-center items-center bg-[url(/assets/bg.jpg)] bg-cover bg-center">
          <div className="absolute w-full h-full bg-slate-900/70" />
          <Image
            alt="ADAMIA"
            src="/assets/logo.png"
            height={170}
            width={460}
            className="z-10 h-auto w-[260px] lg:w-[360px]"
          />
        </section>
      </div>
      <div className="flex flex-col min-h-screen min-h-[100dvh] bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {nav}
        <div className="flex flex-col justify-center items-center flex-1 px-5 py-8 sm:px-8">
          <div className="w-full max-w-sm sm:max-w-md mx-auto">
            <div className="md:hidden mb-6 flex justify-center">
              <Image
                alt="ADAMIA"
                src="/assets/adamia.png"
                height={54}
                width={170}
                className="h-11 w-auto object-contain"
                priority
              />
            </div>

            <div className="text-center mb-7">
              <h1 className="text-[var(--adamia-text-primary)] text-2xl sm:text-3xl font-bold tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
                  {subtitle}
                </p>
              )}
            </div>

            {headerExtra}

            <section className="bg-white">{children}</section>

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>{securityText}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

