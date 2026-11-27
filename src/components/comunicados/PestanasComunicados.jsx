"use client";
// Pestañas de Comunicados (27/11/2026): Muro | Administrar | Automáticos | Moderar el muro. Son ligas (cada vista tiene
// su dirección, igual que el submenú del menú lateral); la actual lleva aria-current="page".
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PESTANAS_PANEL, pestanaDe } from "@/lib/comunicados/comunicados.mjs";

export default function PestanasComunicados({ className = "" }) {
  const actual = pestanaDe(usePathname());
  return (
    <nav aria-label="Comunicados" className={`border-b border-slate-200 ${className}`} data-pestanas-comunicados>
      <ul className="-mb-px flex flex-wrap gap-x-1">
        {PESTANAS_PANEL.map((p) => {
          const activa = actual === p.clave;
          return (
            <li key={p.clave}>
              <Link href={p.ruta} aria-current={activa ? "page" : undefined} data-pestana={p.clave}
                className={`inline-flex min-h-11 items-center border-b-2 px-3 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${activa ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>
                {p.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
