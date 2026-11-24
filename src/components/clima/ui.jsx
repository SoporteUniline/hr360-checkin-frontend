"use client";

// Piezas comunes de Clima y NOM-035: llamadas al API, botones, tarjetas, semáforo y estados.
import axios from "@/lib/axios";
import { NIVELES, ESTADOS } from "@/lib/clima/modelo.mjs";

export const BASE = "/checador/clima";
export const get = (url) => axios.get(url).then((r) => r.data);
export const ruta = (path, idEmpresa) => `${BASE}${path}${path.includes("?") ? "&" : "?"}empresa=${idEmpresa}`;
export const errorDe = (e, porDefecto = "No se pudo completar. Intenta de nuevo.") => e?.response?.data?.error || porDefecto;
export const codigoDe = (e) => e?.response?.data?.codigo || null;

const BOTON = [
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");
const VARIANTES = {
  primario: "bg-brand text-white hover:bg-blue-700 shadow-[0_6px_14px_rgba(37,99,235,0.25)]",
  secundario: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  ia: "border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  peligro: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  fantasma: "text-brand hover:bg-blue-50",
};

export function Boton({ variante = "secundario", className = "", children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`${BOTON} ${VARIANTES[variante]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Tarjeta({ titulo, accion, children, className = "", etiqueta }) {
  return (
    <section
      aria-label={etiqueta ?? (typeof titulo === "string" ? titulo : undefined)}
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${className}`}
    >
      {titulo || accion ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo ? <h2 className="text-[15px] font-bold text-slate-900">{titulo}</h2> : <span />}
          {accion}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ChipNivel({ nivel, largo = false }) {
  const n = NIVELES[nivel];
  if (!n) return <span className="text-slate-400">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${n.fondo} ${n.tinta}`}>
      <span className={`size-2 rounded-full ${n.punto}`} aria-hidden="true" />
      {largo ? n.largo : n.texto}
    </span>
  );
}

export function ChipEstado({ estado }) {
  const e = ESTADOS[estado] ?? ESTADOS.borrador;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${e.clase}`}>{e.texto}</span>;
}

export const ChipIA = ({ children = "Adamia AI" }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-800">
    ✦ {children}
  </span>
);

export function Vacio({ titulo, texto, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="font-semibold text-slate-900">{titulo}</p>
      {texto ? <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{texto}</p> : null}
      {children ? <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export const Cargando = ({ texto = "Cargando…" }) => (
  <p role="status" className="py-6 text-sm text-slate-500">
    {texto}
  </p>
);

export function Aviso({ tono = "info", children }) {
  const t = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    alerta: "border-amber-200 bg-amber-50 text-amber-900",
    ia: "border-violet-200 bg-violet-50 text-violet-900",
  }[tono];
  return (
    <div role="note" className={`rounded-xl border px-3 py-2 text-[13px] ${t}`}>
      {children}
    </div>
  );
}
