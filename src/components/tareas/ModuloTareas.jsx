"use client";

// Módulo Tareas (PROTOTIPO con datos de ejemplo, 23/11/2026). Pestañas: Tablero (tareas de todos los proyectos y sueltas),
// Proyectos, Checklists (plantillas que se repiten), Revisar (checklists enviados) y Cumplimiento (% por persona, bono,
// Excel). Mismo marco que Nómina: encabezado, pestañas con subrayado y botón principal.
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks, Plus } from "lucide-react";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { TareasProvider, useTareas } from "./store";
import { AvisoPrototipo, botonPrimario } from "./comun";
import Tablero from "./Tablero";
import Proyectos from "./Proyectos";
import Checklists from "./Checklists";
import Revisar from "./Revisar";
import Cumplimiento from "./Cumplimiento";
import DialogTarea from "./DialogTarea";

const PESTANAS = [
  { clave: "tablero", texto: "Tablero", subtitulo: "Las tareas de tu equipo: quién tiene qué y cómo va. Arrastra para moverlas." },
  { clave: "proyectos", texto: "Proyectos", subtitulo: "Tareas agrupadas que se hacen una vez y tienen fin." },
  { clave: "checklists", texto: "Checklists", subtitulo: "Lo que se repite cada día o semana, con puntos que se califican." },
  { clave: "revisar", texto: "Revisar", subtitulo: "Checklists enviados: califica cada punto y aprueba o regresa." },
  { clave: "cumplimiento", texto: "Cumplimiento", subtitulo: "Porcentaje de cada persona en el periodo, para bonos. Exporta a Excel." },
];

function Contenido() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { envios } = useTareas();
  const vista = PESTANAS.find((p) => p.clave === params.get("vista")) ?? PESTANAS[0];
  const [tarea, setTarea] = useState(null);
  const porRevisar = envios.filter((e) => e.estado === "por_revisar").length;
  const ir = (clave) => router.replace(clave === "tablero" ? pathname : `${pathname}?vista=${clave}`, { scroll: false });

  return (
    <div className="space-y-4 p-1">
      <EncabezadoPagina icono={ListChecks} titulo="Tareas" subtitulo={vista.subtitulo}
        acciones={vista.clave === "tablero" ? <button type="button" className={botonPrimario} onClick={() => setTarea({ nueva: true })}><Plus className="size-4" /> Nueva tarea</button> : null} />
      <AvisoPrototipo />
      <nav aria-label="Secciones de tareas" className="-mt-1 flex gap-1 overflow-x-auto border-b border-slate-200">
        {PESTANAS.map((p) => {
          const activa = p === vista;
          return (
            <button key={p.clave} type="button" onClick={() => ir(p.clave)} aria-current={activa ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13.5px] font-semibold transition-colors ${activa ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              {p.texto}
              {p.clave === "revisar" && porRevisar ? <span className="rounded-full bg-violet-600 px-1.5 text-[11px] font-bold text-white">{porRevisar}</span> : null}
            </button>
          );
        })}
      </nav>
      {vista.clave === "tablero" ? <Tablero alAbrir={setTarea} /> : null}
      {vista.clave === "proyectos" ? <Proyectos alAbrirTarea={setTarea} /> : null}
      {vista.clave === "checklists" ? <Checklists /> : null}
      {vista.clave === "revisar" ? <Revisar /> : null}
      {vista.clave === "cumplimiento" ? <Cumplimiento /> : null}
      {tarea ? <DialogTarea key={tarea.id ?? "nueva"} tarea={tarea} alCerrar={() => setTarea(null)} /> : null}
    </div>
  );
}

export default function ModuloTareas() {
  return <TareasProvider><Contenido /></TareasProvider>;
}
