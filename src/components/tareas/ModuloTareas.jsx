"use client";

// Módulo Tareas (23/11/2026, conectado a la API). Pestañas: Tablero (tareas de todos los proyectos y sueltas), Proyectos,
// Checklists (plantillas que se repiten), Revisar (checklists enviados) y Cumplimiento (% por persona, bono, Excel).
// El módulo se activa por empresa (lo activa el dueño). Mismo marco que Nómina: encabezado, empresa, pestañas.
import { useState } from "react";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks, Plus } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { SelectorEmpresa, useEmpresaNomina } from "@/components/nomina/comun";
import { TareasProvider, errorDe, useTareas } from "./store";
import { botonPrimario } from "./comun";
import Tablero from "./Tablero";
import Proyectos from "./Proyectos";
import Checklists from "./Checklists";
import Revisar from "./Revisar";
import Cumplimiento from "./Cumplimiento";
import DialogTarea from "./DialogTarea";

const PESTANAS = [
  { clave: "tablero", texto: "Tablero", subtitulo: "Las tareas de tu equipo: quién tiene qué y cómo va. Arrastra para moverlas." },
  { clave: "proyectos", texto: "Proyectos", subtitulo: "Tareas agrupadas que se hacen una vez y tienen fin." },
  { clave: "checklists", texto: "Checklists", subtitulo: "Lo que se repite cada día o semana: preguntas con respuestas que valen, y su calificación." },
  { clave: "revisar", texto: "Revisar", subtitulo: "Checklists enviados: revisa cada respuesta, corrígela si hace falta y aprueba o regresa." },
  { clave: "cumplimiento", texto: "Cumplimiento", subtitulo: "Porcentaje de cada persona en el periodo, para bonos. Exporta a Excel." },
];
const get = (url) => axios.get(url).then((r) => r.data);

function Estado({ titulo, texto, children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="font-semibold text-[#080d36]">{titulo}</p>
      {texto ? <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{texto}</p> : null}
      {children ? <div className="mt-4 flex justify-center">{children}</div> : null}
    </div>
  );
}

function Contenido() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { idEmpresa, cargando, error, modulo, activarModulo, hoy } = useTareas();
  const vista = PESTANAS.find((p) => p.clave === params.get("vista")) ?? PESTANAS[0];
  const [tarea, setTarea] = useState(null);
  const [activando, setActivando] = useState(false);
  const desde = new Date(Date.parse(`${hoy}T12:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10);
  const porRevisar = useSWR(modulo.activo ? `/checador/tareas/envios?empresa=${idEmpresa}&desde=${desde}&hasta=${hoy}&estado=por_revisar` : null, get);
  const nPorRevisar = porRevisar.data?.envios?.length ?? 0;
  const ir = (clave) => router.replace(clave === "tablero" ? pathname : `${pathname}?vista=${clave}`, { scroll: false });

  if (error) {
    const codigo = error?.response?.data?.codigo;
    return <Estado titulo={codigo === "SIN_MIGRACION" ? "Falta preparar la base de datos" : "No se pudo cargar Tareas"} texto={errorDe(error, "Intenta de nuevo en un momento.")} />;
  }
  if (cargando || modulo.activo == null) return <p role="status" className="text-sm text-slate-500">Cargando tareas…</p>;
  if (!modulo.activo) {
    return (
      <Estado titulo="Tareas y Checklists no está activo en esta empresa"
        texto="Asigna tareas a tu equipo, crea checklists que se califican solos y mide su cumplimiento para dar bonos. La gente lo usa desde su app.">
        {modulo.puedeActivar
          ? <button type="button" className={botonPrimario} disabled={activando} onClick={async () => { setActivando(true); await activarModulo(); setActivando(false); }}>{activando ? "Activando…" : "Activar Tareas y Checklists"}</button>
          : <p className="text-sm font-semibold text-slate-600">Pídele al dueño de la cuenta que lo active.</p>}
      </Estado>
    );
  }
  return (
    <>
      <nav aria-label="Secciones de tareas" className="-mt-1 flex gap-1 overflow-x-auto border-b border-slate-200">
        {PESTANAS.map((p) => {
          const activa = p === vista;
          return (
            <button key={p.clave} type="button" onClick={() => ir(p.clave)} aria-current={activa ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13.5px] font-semibold transition-colors ${activa ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              {p.texto}
              {p.clave === "revisar" && nPorRevisar ? <span className="rounded-full bg-violet-600 px-1.5 text-[11px] font-bold text-white">{nPorRevisar}</span> : null}
            </button>
          );
        })}
      </nav>
      {vista.clave === "tablero" ? <Tablero alAbrir={setTarea} alNueva={() => setTarea({ nueva: true })} /> : null}
      {vista.clave === "proyectos" ? <Proyectos alAbrirTarea={setTarea} /> : null}
      {vista.clave === "checklists" ? <Checklists /> : null}
      {vista.clave === "revisar" ? <Revisar alCambiar={() => porRevisar.mutate()} /> : null}
      {vista.clave === "cumplimiento" ? <Cumplimiento /> : null}
      {tarea ? <DialogTarea key={tarea.id ?? "nueva"} tarea={tarea} alCerrar={() => setTarea(null)} /> : null}
    </>
  );
}

function Marco() {
  const params = useSearchParams();
  const empresa = useEmpresaNomina();
  const vista = PESTANAS.find((p) => p.clave === params.get("vista")) ?? PESTANAS[0];
  return (
    <div className="space-y-4 p-1">
      <EncabezadoPagina icono={ListChecks} titulo="Tareas" subtitulo={vista.subtitulo} acciones={<SelectorEmpresa {...empresa} />} />
      {empresa.idEmpresa ? (
        <TareasProvider key={empresa.idEmpresa} modo="panel" idEmpresa={empresa.idEmpresa}><Contenido /></TareasProvider>
      ) : <p role="status" className="text-sm text-slate-500">Cargando…</p>}
    </div>
  );
}

export default function ModuloTareas() {
  return <Marco />;
}
