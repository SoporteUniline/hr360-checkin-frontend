"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock,
  FileCheck,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

const ACCESOS = [
  {
    href: "/panel/configuracion-checador",
    label: "Reloj Checador",
    icon: Clock,
  },
  {
    href: "/panel/empleados",
    label: "Empleados",
    icon: Users,
  },
  {
    href: "/panel/reporte-horas",
    label: "Reportes",
    icon: BarChart3,
  },
  {
    href: "/panel/permisos",
    label: "Permisos",
    icon: FileCheck,
  },
  {
    href: "/panel/cuenta",
    label: "Configuración",
    icon: Settings,
  },
];

export default function AccesosRapidos() {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="size-3.5 text-blue-500" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          Accesos rápidos
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ACCESOS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-14 items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <span className="grid size-8 shrink-0 place-content-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-white group-hover:text-blue-600">
              <Icon className="size-4" />
            </span>

            <span className="min-w-0 truncate">{label}</span>

            <ArrowRight className="ml-auto size-3.5 shrink-0 opacity-30 transition group-hover:translate-x-0.5 group-hover:opacity-60" />
          </Link>
        ))}
      </div>
    </section>
  );
}
