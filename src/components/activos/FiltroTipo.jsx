"use client";

// Activos | Uniformes en Inventario y Categorías: el tipo vive en la URL (?tipo=) para que se pueda
// compartir el enlace y el botón «atrás» funcione.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const OPCIONES = [
  ["activos", "Activos"],
  ["uniformes", "Uniformes"],
];

export default function FiltroTipo() {
  const pathname = usePathname();
  const search = useSearchParams();
  const actual = search.get("tipo") === "uniformes" ? "uniformes" : "activos";
  const enlace = (tipo) => {
    const p = new URLSearchParams(search.toString());
    p.set("tipo", tipo);
    return `${pathname}?${p.toString()}`;
  };
  return (
    <div role="group" aria-label="Tipo de artículo" className="mb-4 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
      {OPCIONES.map(([tipo, texto]) => (
        <Link
          key={tipo}
          href={enlace(tipo)}
          aria-current={actual === tipo ? "true" : undefined}
          className={`min-h-11 px-5 py-2.5 text-sm font-semibold ${actual === tipo ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
        >
          {texto}
        </Link>
      ))}
    </div>
  );
}
