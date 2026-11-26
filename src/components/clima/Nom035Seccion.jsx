"use client";

// Pestaña NOM-035 con tres vistas: resultados (la de siempre), expediente para inspección y buzón confidencial.
//   /panel/clima/nom035 · /panel/clima/nom035/expediente · /panel/clima/nom035/buzon
import Link from "next/link";
import { useEmpresaNomina } from "@/components/nomina/comun";
import Nom035 from "./Nom035";
import Nom035Expediente from "./Nom035Expediente";
import Buzon from "./Buzon";

const VISTAS = [
  { clave: "resultados", href: "/panel/clima/nom035", texto: "Resultados" },
  { clave: "expediente", href: "/panel/clima/nom035/expediente", texto: "Expediente para inspección" },
  { clave: "buzon", href: "/panel/clima/nom035/buzon", texto: "Buzón confidencial" },
];

export default function Nom035Seccion({ sub = "resultados", idEmpresa, inicio, extra }) {
  const empresa = useEmpresaNomina();
  const nombre = empresa.empresas.find((e) => e.id === Number(idEmpresa))?.nombre ?? null;
  return (
    <div className="space-y-4">
      <nav aria-label="Vistas de NOM-035" className="flex gap-2 overflow-x-auto pb-1">
        {VISTAS.map((v) => (
          <Link
            key={v.clave}
            href={v.href}
            aria-current={v.clave === sub ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-[13.5px] font-semibold ${
              v.clave === sub ? "border-brand bg-blue-50 text-brand" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {v.texto}
          </Link>
        ))}
      </nav>
      {sub === "expediente" ? (
        <Nom035Expediente idEmpresa={idEmpresa} />
      ) : sub === "buzon" ? (
        <Buzon idEmpresa={idEmpresa} empresa={nombre} />
      ) : (
        <Nom035 idEmpresa={idEmpresa} inicio={inicio} extra={extra} />
      )}
    </div>
  );
}
