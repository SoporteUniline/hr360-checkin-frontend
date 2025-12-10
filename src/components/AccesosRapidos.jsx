"use client";

/**
 * Componente reutilizable de Accesos Rápidos
 * - Muestra 5 accesos rápidos: Reloj Checador, Empleados, Reportes, Permisos, Configuración
 * - Diseño responsivo que se adapta a diferentes tamaños de pantalla
 * - Relacionado con: src/app/panel/dashboard/page.jsx (implementación original)
 */

import Link from "next/link";
import { Clock, Users, BarChart3, FileCheck, Settings } from "lucide-react";

export default function AccesosRapidos() {
  return (
    <div className="mt-6 sm:mt-8 lg:mt-10">
      <div className="mb-3 sm:mb-4 flex items-center gap-2">
        <span className="text-base sm:text-lg font-semibold">Accesos Rápidos</span>
      </div>
      {/* Grid responsivo: 2 columnas en móvil, 3 en tablet, 5 en desktop, 6 en pantallas grandes */}
      {/* Ajustado para evitar que los elementos toquen los bordes en pantallas pequeñas */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        <Link
          href="/"
          className="group rounded-xl border bg-white p-3 sm:p-4 md:p-5 lg:p-6 text-center hover:shadow-sm transition"
        >
          <div className="mx-auto mb-2 sm:mb-3 grid size-10 sm:size-11 md:size-12 place-content-center rounded-full border border-sky-200 bg-sky-50">
            <Clock className="size-4 sm:size-5 md:size-6 text-sky-600" />
          </div>
          <div className="font-medium text-xs sm:text-sm md:text-base">Reloj Checador</div>
          <div className="text-[10px] sm:text-[11px] md:text-xs text-zinc-500 mt-0.5 sm:mt-1">
            Registros de entrada y salida
          </div>
        </Link>
        <Link
          href="/panel/empleados"
          className="group rounded-xl border bg-white p-3 sm:p-4 md:p-5 lg:p-6 text-center hover:shadow-sm transition"
        >
          <div className="mx-auto mb-2 sm:mb-3 grid size-10 sm:size-11 md:size-12 place-content-center rounded-full border border-violet-200 bg-violet-50">
            <Users className="size-4 sm:size-5 md:size-6 text-violet-600" />
          </div>
          <div className="font-medium text-xs sm:text-sm md:text-base">Empleados</div>
          <div className="text-[10px] sm:text-[11px] md:text-xs text-zinc-500 mt-0.5 sm:mt-1">
            Gestión de personal
          </div>
        </Link>
        <Link
          href="/panel/reporte-horas"
          className="group rounded-xl border bg-white p-3 sm:p-4 md:p-5 lg:p-6 text-center hover:shadow-sm transition"
        >
          <div className="mx-auto mb-2 sm:mb-3 grid size-10 sm:size-11 md:size-12 place-content-center rounded-full border border-indigo-200 bg-indigo-50">
            <BarChart3 className="size-4 sm:size-5 md:size-6 text-indigo-600" />
          </div>
          <div className="font-medium text-xs sm:text-sm md:text-base">Reportes</div>
          <div className="text-[10px] sm:text-[11px] md:text-xs text-zinc-500 mt-0.5 sm:mt-1">
            Análisis y estadísticas
          </div>
        </Link>
        <Link
          href="/panel/permisos"
          className="group rounded-xl border bg-white p-3 sm:p-4 md:p-5 lg:p-6 text-center hover:shadow-sm transition"
          title="Ir a Permisos"
        >
          <div className="mx-auto mb-2 sm:mb-3 grid size-10 sm:size-11 md:size-12 place-content-center rounded-full border border-rose-200 bg-rose-50">
            <FileCheck className="size-4 sm:size-5 md:size-6 text-rose-600" />
          </div>
          <div className="font-medium text-xs sm:text-sm md:text-base">Permisos</div>
          <div className="text-[10px] sm:text-[11px] md:text-xs text-zinc-500 mt-0.5 sm:mt-1">
            Solicitudes y ausencias
          </div>
        </Link>
        <Link
          href="/panel/cuenta"
          className="group rounded-xl border bg-white p-3 sm:p-4 md:p-5 lg:p-6 text-center hover:shadow-sm transition"
        >
          <div className="mx-auto mb-2 sm:mb-3 grid size-10 sm:size-11 md:size-12 place-content-center rounded-full border border-zinc-200 bg-zinc-50">
            <Settings className="size-4 sm:size-5 md:size-6 text-zinc-700" />
          </div>
          <div className="font-medium text-xs sm:text-sm md:text-base">Configuración</div>
          <div className="text-[10px] sm:text-[11px] md:text-xs text-zinc-500 mt-0.5 sm:mt-1">
            Ajustes del sistema
          </div>
        </Link>
      </div>
    </div>
  );
}

