"use client";

// Piezas del expediente por etapas y del tablero de cumplimiento (28/11/2026). Reglas del dueño: legible para una persona
// de 60 años — letra de 16 px en escritorio y 17 px en el celular, títulos en 700 (nunca 800), texto secundario no más
// claro que #4B5563, botones de 48 px o más y el principal de 56 px, sin fondos degradados, páginas en vez de ventanas.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const TEXTO = "text-[17px] leading-relaxed sm:text-base";
export const SECUNDARIO = "text-[#4B5563]";
export const CAMPO = "min-h-12 w-full rounded-xl border border-[#9CA3AF] bg-white px-4 text-[17px] text-[#111827] placeholder:text-[#4B5563] outline-none focus-visible:border-[#2563EB] focus-visible:ring-[3px] focus-visible:ring-[#2563EB]/30 sm:text-base";
const BASE = "inline-flex items-center justify-center gap-2 rounded-xl px-5 text-[17px] font-bold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2563EB]/40 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base";
export const BOTON_PRINCIPAL = `${BASE} min-h-14 bg-[#2563EB] text-white hover:bg-[#1D4ED8]`;
export const BOTON = `${BASE} min-h-12 bg-[#2563EB] text-white hover:bg-[#1D4ED8]`;
export const BOTON_SECUNDARIO = `${BASE} min-h-12 border border-[#9CA3AF] bg-white text-[#111827] hover:bg-slate-50`;
export const BOTON_PELIGRO = `${BASE} min-h-12 border border-red-400 bg-white text-red-800 hover:bg-red-50`;

const TONOS = {
  verde: "bg-[#DCFCE7] text-[#14532D]",
  ambar: "bg-[#FEF3C7] text-[#78350F]",
  rojo: "bg-[#FEE2E2] text-[#7F1D1D]",
  gris: "bg-[#E5E7EB] text-[#1F2937]",
  azul: "bg-[#DBEAFE] text-[#1E3A8A]",
};
export function Etiqueta({ tono = "gris", children, ...resto }) {
  return <span {...resto} className={`inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-[17px] font-bold leading-6 sm:text-base ${TONOS[tono] ?? TONOS.gris}`}>{children}</span>;
}

export function Aviso({ tono = "ambar", titulo, children }) {
  const estilos = { ambar: "border-amber-400 bg-amber-50 text-amber-950", rojo: "border-red-400 bg-red-50 text-red-950", azul: "border-blue-300 bg-blue-50 text-[#111827]", verde: "border-emerald-400 bg-emerald-50 text-emerald-950" };
  return (
    <div role={tono === "rojo" ? "alert" : "status"} className={`grid gap-1 rounded-xl border p-4 ${TEXTO} ${estilos[tono]}`}>
      {titulo ? <p className="font-bold">{titulo}</p> : null}
      {children}
    </div>
  );
}

export function Seccion({ id, titulo, acciones, children, ...resto }) {
  return (
    <section aria-labelledby={`${id}-titulo`} id={id} className={`grid scroll-mt-24 gap-4 rounded-2xl border border-slate-300 bg-white p-4 sm:p-6 ${TEXTO} text-[#111827]`} {...resto}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-titulo`} className="text-[22px] font-bold leading-tight sm:text-2xl">{titulo}</h2>
        {acciones}
      </div>
      {children}
    </section>
  );
}

// Encabezado de página: regreso (opcional), título en 700 y subtítulo; sin degradados.
export function Encabezado({ regreso, textoRegreso, titulo, subtitulo, acciones }) {
  return (
    <header className="grid gap-3">
      {regreso ? (
        <Link href={regreso} className={`inline-flex min-h-12 w-fit items-center gap-2 font-bold text-[#1D4ED8] hover:underline ${TEXTO}`}>
          <ArrowLeft className="size-5" aria-hidden="true" /> {textoRegreso}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight text-[#111827] sm:text-[30px]">{titulo}</h1>
          {subtitulo ? <p className={`mt-1 ${TEXTO} ${SECUNDARIO}`}>{subtitulo}</p> : null}
        </div>
        {acciones ? <div className="flex flex-wrap gap-3">{acciones}</div> : null}
      </div>
    </header>
  );
}

// Barra de porcentaje de color sólido (sin degradado).
export function Barra({ porcentaje, tono }) {
  const color = { verde: "bg-[#16A34A]", ambar: "bg-[#D97706]", rojo: "bg-[#DC2626]" }[tono] ?? "bg-[#2563EB]";
  const p = Math.max(0, Math.min(100, Number(porcentaje) || 0));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-[#E5E7EB]" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`Cumplimiento ${p} %`}>
      <div className={`h-full ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }) {
  return <p role="status" className={`p-6 ${TEXTO} ${SECUNDARIO}`}>{texto}</p>;
}
