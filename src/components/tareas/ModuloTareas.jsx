"use client";

// Módulos Tareas (Tablero, Proyectos) y Checklists (Checklists, Revisar, Cumplimiento): una dirección por vista y
// se activan juntos por empresa. Mismo marco que Nómina.
import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardCheck, ListChecks } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { SelectorEmpresa, useEmpresaNomina } from "@/components/nomina/comun";
import { TareasProvider, errorDe, useTareas } from "./store";
import Tablero from "./Tablero";
import Proyectos from "./Proyectos";
import Checklists from "./Checklists";
import Revisar from "./Revisar";
import Cumplimiento from "./Cumplimiento";
import DialogTarea from "./DialogTarea";
import ModuloInactivo from "@/components/modulos/ModuloInactivo";
import { refrescarModulos } from "@/components/modulos/useModulos";
import { modulo as catalogoModulo } from "@/lib/modulos/catalogo.mjs";

export const MODULOS = {
  tareas: {
    titulo: "Tareas", icono: ListChecks, etiqueta: "Secciones de tareas",
    pestanas: [
      { clave: "tablero", href: "/panel/tareas", texto: "Tablero", subtitulo: "Las tareas de tu equipo: quién tiene qué y cómo va. Arrastra para moverlas." },
      { clave: "proyectos", href: "/panel/tareas/proyectos", texto: "Proyectos", subtitulo: "Tareas agrupadas que se hacen una vez y tienen fin." },
    ],
  },
  checklists: {
    titulo: "Checklists", icono: ClipboardCheck, etiqueta: "Secciones de checklists",
    pestanas: [
      { clave: "checklists", href: "/panel/checklists", texto: "Checklists", subtitulo: "Lo que se repite cada día o semana: preguntas con respuestas que valen, y su calificación." },
      { clave: "revisar", href: "/panel/checklists/revisar", texto: "Revisar", subtitulo: "Checklists enviados: revisa cada respuesta, corrígela si hace falta y aprueba o regresa." },
      { clave: "cumplimiento", href: "/panel/checklists/cumplimiento", texto: "Cumplimiento", subtitulo: "Porcentaje de cada persona en el periodo, para bonos. Exporta a Excel." },
    ],
  },
};
// Direcciones viejas (/panel/tareas?vista=…) → la vista nueva.
const VISTA_VIEJA = Object.fromEntries(Object.values(MODULOS).flatMap((m) => m.pestanas.map((p) => [p.clave, p.href])));
const pestanaActual = (modulo, pathname) => [...modulo.pestanas].reverse().find((p) => pathname === p.href || pathname?.startsWith(`${p.href}/`)) ?? modulo.pestanas[0];
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

function Contenido({ clave }) {
  const pathname = usePathname();
  const config = MODULOS[clave];
  const { idEmpresa, cargando, error, modulo, activarModulo, hoy } = useTareas();
  const vista = pestanaActual(config, pathname);
  const [tarea, setTarea] = useState(null);
  const [activando, setActivando] = useState(false);
  const desde = new Date(Date.parse(`${hoy}T12:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10);
  const porRevisar = useSWR(modulo.activo && clave === "checklists" ? `/checador/tareas/envios?empresa=${idEmpresa}&desde=${desde}&hasta=${hoy}&estado=por_revisar` : null, get);
  const nPorRevisar = porRevisar.data?.envios?.length ?? 0;

  if (error) {
    const codigo = error?.response?.data?.codigo;
    return <Estado titulo={codigo === "SIN_MIGRACION" ? "Falta preparar la base de datos" : "No se pudo cargar Tareas"} texto={errorDe(error, "Intenta de nuevo en un momento.")} />;
  }
  if (cargando || modulo.activo == null) return <p role="status" className="text-sm text-slate-500">Cargando tareas…</p>;
  // Mismo aviso que cualquier módulo apagado (Módulos por empresa). Con derecho, RH lo activa aquí mismo;
  // sin derecho (su plan no lo incluye), Contratar.
  if (!modulo.activo) {
    return (
      <ModuloInactivo modulo={catalogoModulo("tareas")} sinDerecho={!modulo.puedeActivar} activando={activando}
        alActivar={async () => { setActivando(true); await activarModulo(); await refrescarModulos(); setActivando(false); }} />
    );
  }
  return (
    <>
      <nav aria-label={config.etiqueta} className="-mt-1 flex gap-1 overflow-x-auto border-b border-slate-200">
        {config.pestanas.map((p) => {
          const activa = p === vista;
          return (
            <Link key={p.clave} href={p.href} aria-current={activa ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13.5px] font-semibold transition-colors ${activa ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              {p.texto}
              {p.clave === "revisar" && nPorRevisar ? <span className="rounded-full bg-violet-600 px-1.5 text-[11px] font-bold text-white">{nPorRevisar}</span> : null}
            </Link>
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

function Marco({ clave }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const config = MODULOS[clave];
  const vista = pestanaActual(config, pathname);
  const empresa = useEmpresaNomina();
  const vieja = VISTA_VIEJA[params.get("vista")];
  useEffect(() => { if (vieja && vieja !== pathname) router.replace(vieja); }, [vieja, pathname, router]);
  if (vieja && vieja !== pathname) return <p role="status" className="p-6 text-sm text-slate-500">Cargando…</p>;
  return (
    <div className="space-y-4 p-1">
      <EncabezadoPagina icono={config.icono} titulo={config.titulo} subtitulo={vista.subtitulo} acciones={<SelectorEmpresa {...empresa} />} />
      {empresa.idEmpresa ? (
        <TareasProvider key={empresa.idEmpresa} modo="panel" idEmpresa={empresa.idEmpresa}><Contenido clave={clave} /></TareasProvider>
      ) : <p role="status" className="text-sm text-slate-500">Cargando…</p>}
    </div>
  );
}

// modulo: "tareas" (Tablero, Proyectos) o "checklists" (Checklists, Revisar, Cumplimiento).
export default function ModuloTareas({ modulo = "tareas" }) {
  return <Marco clave={modulo} />;
}
