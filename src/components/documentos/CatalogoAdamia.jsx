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
  if (compact) return <section aria-label="Plantillas ADAMIA" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-5"><div><h2 className="text-sm font-semibold text-slate-900">Plantillas ADAMIA</h2><p className="mt-1 text-xs text-slate-600">21 formatos listos para completar: confidencialidad, equipo, constancias y más.</p></div><Button asChild variant="outline"><Link href="/panel/gestion-documental/plantillas?tab=adamia">Explorar catálogo</Link></Button></section>;
  return (
    <section aria-label="Plantillas ADAMIA" className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-sm leading-6 text-slate-500">Formatos base para todas las empresas. Elige uno, completa sus datos y genera el documento para tu colaborador.</p><span className="whitespace-nowrap text-xs text-slate-500">{plantillas.length} de {CATALOGO.length} plantillas</span></div>
      <div className="flex flex-col gap-3 sm:flex-row"><Input aria-label="Buscar en el catálogo ADAMIA" placeholder="Buscar plantilla: equipo, confidencialidad, constancia…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-lg" /><select aria-label="Tema de la plantilla" value={grupo} onChange={(e) => setGrupo(e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="todos">Todos los temas</option>{GRUPOS.map((g) => <option key={g}>{g}</option>)}</select></div>
      {plantillas.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plantillas.map((p) => (
        <article key={p.codigo} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700">ADAMIA</span><span className="text-slate-500">{p.grupo}</span></div>
          <h2 className="text-sm font-semibold leading-6 text-slate-900">{p.nombre}</h2>
          <p className="mb-5 mt-2 text-sm leading-6 text-slate-600">{p.descripcion}</p>
          <div className="mt-auto flex items-center justify-between gap-2"><Button asChild variant="outline" className="text-blue-700"><Link href={`${p.href}${empresa ? `${p.href.includes("?") ? "&" : "?"}empresa=${encodeURIComponent(empresa)}` : ""}`}>Ver y usar plantilla</Link></Button><span className="text-xs text-slate-400">v{p.version}</span></div>
        </article>
      ))}</div> : <p className="rounded-lg border border-slate-200 p-6 text-sm text-slate-500">No hay formatos que coincidan. Prueba otro nombre o tema.</p>}
    </section>
  );
}
