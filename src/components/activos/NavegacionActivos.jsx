"use client";

// Pestañas del módulo «Activos y uniformes»: Inicio · Inventario · Personas, y Ajustes (categorías, ubicaciones y
// paquetes) aparte porque se usan poco.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
import { RAIZ_ACTIVOS } from "@/lib/activos/module.mjs";
import { useActivos } from "./ActivosProvider";

const PESTANAS = [
  { label: "Inicio", path: "", activa: (s) => !s || ["revision", "solicitudes", "historial", "entregas", "resguardos"].includes(s) },
  { label: "Inventario", path: "/inventario", activa: (s) => s === "inventario" },
  { label: "Personas", path: "/personas", activa: (s) => ["personas", "entregar", "recibir"].includes(s) },
];

export default function NavegacionActivos() {
  const ctx = useActivos();
  const pathname = usePathname();
  const search = useSearchParams();
  if (!ctx) return null;
  const seccion = pathname.slice(RAIZ_ACTIVOS.length).split("/")[1] || "";
  const empresa = `empresa=${encodeURIComponent(ctx.company?.id ?? search.get("empresa") ?? "")}`;
  const pestana = (activa) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${
      activa ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
    }`;
  return (
    <nav aria-label="Activos y uniformes" className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
        {PESTANAS.map((p) => {
          const activa = p.activa(seccion);
          return (
            <Link key={p.label} href={`${RAIZ_ACTIVOS}${p.path}?${empresa}`} aria-current={activa ? "page" : undefined} className={pestana(activa)}>
              {p.label}
            </Link>
          );
        })}
      </div>
      <Link
        href={`${RAIZ_ACTIVOS}/ajustes/categorias?tipo=activos&${empresa}`}
        aria-current={seccion === "ajustes" ? "page" : undefined}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold ${
          seccion === "ajustes" ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <Settings size={16} aria-hidden="true" /> Ajustes
      </Link>
    </nav>
  );
}
