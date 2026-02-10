"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Header/Menu de la landing con los mismos enlaces que el footer.
 * - Relación: `MarketingLanding.jsx` lo usa dentro del Hero.
 * - UX: sticky + blur para que el menú sea legible sobre el gradiente.
 */
export default function LandingHeader() {
  const links = [
    { label: "Inicio", href: "/" },
    { label: "Quiénes somos", href: "/quienes-somos" },
    {
      label: "Contratar",
      href: "https://planes.hr360.mx/contratar-plan",
      external: true,
    },
    { label: "Iniciar sesión", href: "/login" },
    { label: "Ayuda", href: "/aviso-privacidad" },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-white/15 bg-white/10 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <Image
              src="/assets/logo.png"
              alt="ADAMIA"
              width={140}
              height={40}
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/* Desktop menu */}
          <nav
            className="hidden items-center gap-6 md:flex"
            aria-label="Menú principal"
          >
            {links.map((l) =>
              l.external ? (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-white/90 transition hover:text-white"
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-sm font-semibold text-white/90 transition hover:text-white"
                >
                  {l.label}
                </Link>
              )
            )}

            <Button
              asChild
              className={cn(
                "h-10 rounded-xl bg-white px-4 text-sm font-semibold text-[var(--adamia-blue)]",
                "shadow-[0_10px_30px_rgba(0,0,0,0.14)] transition hover:-translate-y-0.5"
              )}
            >
              <a
                href="https://planes.hr360.mx/contratar-plan"
                target="_blank"
                rel="noreferrer"
              >
                Prueba gratis <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </nav>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 w-10 rounded-xl border-2 border-white/25 bg-white/15 p-0 text-white backdrop-blur hover:bg-white/25"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] sm:w-[360px]">
                <div className="flex items-center gap-3">
                  <Image
                    src="/assets/logo.png"
                    alt="ADAMIA"
                    width={140}
                    height={40}
                    className="h-9 w-auto"
                  />
                </div>

                <nav className="mt-8 grid gap-2" aria-label="Menú móvil">
                  {links.map((l) =>
                    l.external ? (
                      <a
                        key={l.label}
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl px-3 py-3 text-sm font-semibold text-[var(--adamia-text-primary)] hover:bg-gray-100"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        key={l.label}
                        href={l.href}
                        className="rounded-xl px-3 py-3 text-sm font-semibold text-[var(--adamia-text-primary)] hover:bg-gray-100"
                      >
                        {l.label}
                      </Link>
                    )
                  )}
                </nav>

                <div className="mt-6">
                  <Button asChild className="w-full rounded-xl">
                    <a
                      href="https://planes.hr360.mx/contratar-plan"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Comenzar prueba gratis
                    </a>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

