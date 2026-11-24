"use client";

// Clima organizacional y NOM-035 (panel de RH y del dueño). Una dirección por vista:
//   /panel/clima                 Resultados (tablero)
//   /panel/clima/encuestas       Encuestas y plantillas
//   /panel/clima/encuestas/editor/<id>     Editar una plantilla de la empresa
//   /panel/clima/encuestas/lanzar/<id>     Destinatarios, fechas y canales de una encuesta
//   /panel/clima/nom035          Resultados NOM-035, Guía I confidencial y obligaciones
import Link from "next/link";
import useSWR from "swr";
import { HeartHandshake } from "lucide-react";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { SelectorEmpresa, useEmpresaNomina } from "@/components/nomina/comun";
import { Cargando, Vacio, errorDe, get, ruta } from "./ui";
import Tablero from "./Tablero";
import Encuestas from "./Encuestas";
import Editor from "./Editor";
import Lanzar from "./Lanzar";
import Nom035 from "./Nom035";

const PESTANAS = [
  {
    clave: "resultados",
    href: "/panel/clima",
    texto: "Resultados",
    subtitulo: "Cómo se siente tu gente: clima, eNPS y participación, siempre anónimo.",
  },
  {
    clave: "encuestas",
    href: "/panel/clima/encuestas",
    texto: "Encuestas y plantillas",
    subtitulo: "Plantillas profesionales gratis, tus encuestas y su avance.",
  },
  {
    clave: "nom035",
    href: "/panel/clima/nom035",
    texto: "NOM-035",
    subtitulo: "Factores de riesgo psicosocial con el cuestionario oficial de la STPS.",
  },
];

function vistaDe(segmentos) {
  const [a, b, c] = segmentos;
  if (a === "encuestas" && b === "editor" && c) return { pestana: "encuestas", vista: "editor", id: Number(c) };
  if (a === "encuestas" && b === "lanzar" && c) return { pestana: "encuestas", vista: "lanzar", id: Number(c) };
  if (a === "encuestas") return { pestana: "encuestas", vista: "encuestas" };
  if (a === "nom035") return { pestana: "nom035", vista: "nom035" };
  return { pestana: "resultados", vista: "resultados" };
}

export function useInicio(idEmpresa) {
  return useSWR(idEmpresa ? ruta("/inicio", idEmpresa) : null, get, { shouldRetryOnError: false });
}

export function useIa(idEmpresa) {
  return useSWR(idEmpresa ? ruta("/ia/estado", idEmpresa) : null, get, { shouldRetryOnError: false });
}

function Contenido({ v, idEmpresa }) {
  const inicio = useInicio(idEmpresa);
  if (inicio.error) {
    const sinMigracion = inicio.error?.response?.data?.codigo === "SIN_MIGRACION";
    return <Vacio titulo={sinMigracion ? "Falta preparar la base de datos" : "No se pudo cargar Clima"} texto={errorDe(inicio.error)} />;
  }
  if (!inicio.data) return <Cargando />;
  const props = { idEmpresa, inicio: inicio.data };
  if (v.vista === "encuestas") return <Encuestas {...props} />;
  if (v.vista === "editor") return <Editor key={v.id} id={v.id} {...props} />;
  if (v.vista === "lanzar") return <Lanzar key={v.id} id={v.id} {...props} />;
  if (v.vista === "nom035") return <Nom035 {...props} />;
  return <Tablero {...props} />;
}

export default function ModuloClima({ segmentos = [] }) {
  const v = vistaDe(segmentos);
  const empresa = useEmpresaNomina();
  const pestana = PESTANAS.find((p) => p.clave === v.pestana);
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-1">
      <EncabezadoPagina
        icono={HeartHandshake}
        titulo="Clima y NOM-035"
        subtitulo={pestana.subtitulo}
        acciones={<SelectorEmpresa {...empresa} />}
      />
      <nav aria-label="Secciones de clima" className="-mt-1 flex gap-1 overflow-x-auto border-b border-slate-200">
        {PESTANAS.map((p) => (
          <Link
            key={p.clave}
            href={p.href}
            aria-current={p.clave === v.pestana ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-[13.5px] font-semibold transition-colors ${
              p.clave === v.pestana ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {p.texto}
          </Link>
        ))}
      </nav>
      {empresa.idEmpresa ? <Contenido key={empresa.idEmpresa} v={v} idEmpresa={empresa.idEmpresa} /> : <Cargando />}
    </div>
  );
}
