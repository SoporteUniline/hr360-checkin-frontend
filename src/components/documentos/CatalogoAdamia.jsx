"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLANTILLAS_ADAMIA } from "@/lib/plantillasAdamia";

export default function CatalogoAdamia({ search = "", categoria = "todas" }) {
  const query = search.trim().toLocaleLowerCase("es-MX");
  const plantillas = PLANTILLAS_ADAMIA.filter((p) =>
    (categoria === "todas" || categoria === p.categoria) &&
    `${p.nombre} ${p.descripcion}`.toLocaleLowerCase("es-MX").includes(query),
  );
  return (
    <section aria-label="Plantillas ADAMIA" className="space-y-4">
      <p className="text-sm text-slate-500">Formatos base disponibles para todas las empresas. Al usarlos, se guarda una copia personalizable en tu empresa.</p>
      {plantillas.length ? plantillas.map((p) => (
        <article key={p.codigo} className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700">ADAMIA</span>
            <span className="text-slate-500">Recursos Humanos · v{p.version}</span>
          </div>
          <h2 className="text-base font-semibold text-slate-900">{p.nombre}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{p.descripcion}</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">Basado en la LFT. Completa las políticas y versiones de tu empresa antes de solicitar la firma.</p>
          <Button asChild className="mt-5 bg-blue-600 hover:bg-blue-700">
            <Link href="/panel/gestion-documental/plantillas/adamia/lectura-politicas">Ver y usar plantilla</Link>
          </Button>
        </article>
      )) : <p className="rounded-lg border border-slate-200 p-6 text-sm text-slate-500">No hay formatos ADAMIA que coincidan con los filtros.</p>}
    </section>
  );
}
