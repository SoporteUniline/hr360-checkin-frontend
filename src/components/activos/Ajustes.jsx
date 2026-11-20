"use client";

// Ajustes del módulo (20/11/2026): categorías (por tipo), ubicaciones (compartidas por activos y
// uniformes) y paquetes/dotaciones. Antes eran 6 entradas del menú; se usan poco.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RAIZ_ACTIVOS } from "@/lib/activos/module.mjs";
import { useActivos } from "./ActivosProvider";
import Categories from "./Categories";
import Locations from "./Locations";
import { Kits } from "./Operations";
import FiltroTipo from "./FiltroTipo";

const SECCIONES = [
  ["categorias", "Categorías"],
  ["ubicaciones", "Ubicaciones"],
  ["paquetes", "Paquetes y dotaciones"],
];

export default function Ajustes({ seccion }) {
  const { company } = useActivos();
  const search = useSearchParams();
  const actual = SECCIONES.some(([s]) => s === seccion) ? seccion : "categorias";
  const enlace = (s) => {
    const p = new URLSearchParams({ empresa: company.id });
    if (s === "categorias") p.set("tipo", search.get("tipo") === "uniformes" ? "uniformes" : "activos");
    return `${RAIZ_ACTIVOS}/ajustes/${s}?${p.toString()}`;
  };
  return (
    <>
      <nav aria-label="Ajustes" className="mb-4 flex flex-wrap gap-2">
        {SECCIONES.map(([s, texto]) => (
          <Link
            key={s}
            href={enlace(s)}
            aria-current={actual === s ? "page" : undefined}
            className={`min-h-11 rounded-full border px-4 py-2.5 text-sm font-semibold ${actual === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {texto}
          </Link>
        ))}
      </nav>
      {actual === "categorias" && (<><FiltroTipo /><Categories type={search.get("tipo") === "uniformes" ? "uniform" : "asset"} /></>)}
      {actual === "ubicaciones" && <Locations />}
      {actual === "paquetes" && <Kits />}
    </>
  );
}
