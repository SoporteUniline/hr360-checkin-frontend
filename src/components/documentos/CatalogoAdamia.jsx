"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLANTILLAS_ADAMIA } from "@/lib/plantillasAdamia";
import { FORMATOS_RRHH } from "@/lib/documentos/formatosRRHH";

const CATALOGO = [...PLANTILLAS_ADAMIA.map((p) => ({ ...p, grupo: "Información y privacidad", href: "/panel/gestion-documental/plantillas/adamia/lectura-politicas" })), ...FORMATOS_RRHH.map((p) => ({ ...p, href: `/panel/gestion-documental/generar?formato=${p.codigo}` }))];
const GRUPOS = [...new Set(CATALOGO.map((p) => p.grupo))];
const normalizar = (value) => value.toLocaleLowerCase("es-MX").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function CatalogoAdamia({ compact = false, empresa }) {
  const [search, setSearch] = useState("");
  const [grupo, setGrupo] = useState("todos");
  const query = normalizar(search.trim());
  const plantillas = CATALOGO.filter((p) => (grupo === "todos" || grupo === p.grupo) && normalizar(`${p.nombre} ${p.descripcion} ${p.grupo}`).includes(query));
  const hrefPlantilla = (p) => `${p.href}${empresa ? `${p.href.includes("?") ? "&" : "?"}empresa=${encodeURIComponent(empresa)}` : ""}`;
  if (compact) return <section aria-label="Plantillas ADAMIA" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-5"><div><h2 className="text-sm font-semibold text-slate-900">Plantillas ADAMIA</h2><p className="mt-1 text-xs text-slate-600">21 formatos listos para completar: confidencialidad, equipo, constancias y más.</p></div><Button asChild variant="outline"><Link href="/panel/gestion-documental/plantillas?tab=adamia">Explorar catálogo</Link></Button></section>;
  return (
    <section aria-label="Plantillas ADAMIA" className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-sm leading-6 text-slate-500">Formatos base para todas las empresas. Elige uno, completa sus datos y genera el documento para tu colaborador.</p><span className="whitespace-nowrap text-xs text-slate-500">{plantillas.length} de {CATALOGO.length} plantillas</span></div>
      <div className="flex flex-col gap-3 sm:flex-row"><Input aria-label="Buscar en el catálogo ADAMIA" placeholder="Buscar plantilla: equipo, confidencialidad, constancia…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-lg" /><select aria-label="Tema de la plantilla" value={grupo} onChange={(e) => setGrupo(e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="todos">Todos los temas</option>{GRUPOS.map((g) => <option key={g}>{g}</option>)}</select></div>
      {plantillas.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-[34%] px-4 py-3">Plantilla</th>
                  <th className="w-[18%] px-4 py-3">Tema</th>
                  <th className="px-4 py-3">Uso principal</th>
                  <th className="w-20 px-4 py-3 text-center">Versión</th>
                  <th className="w-40 px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plantillas.map((p) => (
                  <tr key={p.codigo} className="align-middle hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">ADAMIA</span>
                        <span className="font-semibold leading-5 text-slate-900">{p.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-500">{p.grupo}</td>
                    <td className="px-4 py-3 leading-5 text-slate-600">{p.descripcion}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400">v{p.version}</td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="outline" className="h-8 px-3 text-xs font-semibold text-blue-700">
                        <Link href={hrefPlantilla(p)}>Usar</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <p className="rounded-lg border border-slate-200 p-6 text-sm text-slate-500">No hay formatos que coincidan. Prueba otro nombre o tema.</p>}
    </section>
  );
}
