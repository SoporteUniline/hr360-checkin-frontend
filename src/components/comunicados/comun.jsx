"use client";
// Centro de comunicados: piezas compartidas del panel y de Mi espacio (estilos, campos accesibles, avisos, avatar).
// Reglas de texto y formato en src/lib/comunicados/comunicados.mjs.
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { useEmpresaNomina } from "@/components/nomina/comun";
import { errorDe, iniciales } from "@/lib/comunicados/comunicados.mjs";

export const get = (url) => axios.get(url).then((r) => r.data);
export const opcionesSwr = { revalidateOnFocus: false, shouldRetryOnError: false };

export const boton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
export const botonPrimario = `${boton} bg-[#2563EB] text-white hover:bg-[#1d4ed8]`;
export const botonSecundario = `${boton} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;
export const botonPeligro = `${boton} border border-red-200 bg-white text-red-700 hover:bg-red-50`;
export const botonTexto = "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60";
export const tarjeta = "rounded-[14px] border border-slate-200 bg-white";
export const entrada = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand aria-[invalid=true]:border-red-500";

/** Zona horaria de la empresa de la sesión (para «Hoy 9:00»). */
export function useZona() {
  const { dataUser } = useAuth();
  return dataUser?.zona_horaria || dataUser?.empresas_detalle?.[0]?.zona_horaria || "America/Mexico_City";
}

/** Empresa elegida en el panel (selector si tiene varias); sin lista, la de la sesión. El servidor valida que sea suya. */
export function useEmpresa() {
  const { dataUser } = useAuth();
  const e = useEmpresaNomina();
  return { ...e, idEmpresa: e.idEmpresa ?? (e.empresas.length ? null : Number(dataUser?.id_empresa) || null), listo: !e.empresas.length || Boolean(e.idEmpresa) };
}
export const conEmpresa = (url, empresa) => (empresa ? `${url}${url.includes("?") ? "&" : "?"}empresa=${empresa}` : url);

/** Etiqueta + control + error (accesible: aria-invalid y aria-describedby). */
export function Campo({ id, etiqueta, error, ayuda, children, className = "" }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">{etiqueta}</label>
      {children}
      {ayuda && !error ? <span id={`${id}-ayuda`} className="text-[13px] text-slate-500">{ayuda}</span> : null}
      {error ? <span id={`${id}-error`} className="text-[13px] text-red-700">{error}</span> : null}
    </div>
  );
}
export const ariaCampo = (id, error, ayuda) => ({ id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined });

export function Insignia({ etiqueta }) {
  if (!etiqueta) return null;
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[13px] font-semibold ${etiqueta.tono}`}>{etiqueta.texto}</span>;
}

export function Avatar({ nombre, grande = false }) {
  return <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-blue-50 font-bold text-blue-700 ${grande ? "size-11 text-[15px]" : "size-9 text-[13px]"}`}>{iniciales(nombre)}</span>;
}

/** Aviso de error de carga (incluye «falta la migración» y «módulo apagado», con el texto del servidor). */
export function AvisoError({ error, porDefecto, reintentar }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <span className="flex-1">{errorDe(error, porDefecto)}</span>
      {reintentar ? <button type="button" onClick={() => reintentar()} className="min-h-11 font-semibold text-red-800 underline">Reintentar</button> : null}
    </div>
  );
}

/** Mensaje de resultado de una acción: { tipo: "ok" | "error", texto }. */
export function Mensaje({ mensaje, className = "" }) {
  if (!mensaje) return null;
  const ok = mensaje.tipo === "ok";
  return (
    <p role={ok ? "status" : "alert"} className={`rounded-lg border px-3 py-2 text-sm ${ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"} ${className}`}>
      {mensaje.texto}
    </p>
  );
}

/** Interruptor accesible (checkbox con apariencia de switch) de 44 px de alto. */
export function Interruptor({ id, checked, onChange, etiqueta, descripcion, disabled = false }) {
  return (
    <label htmlFor={id} className={`flex min-h-11 cursor-pointer items-start gap-3 py-1 ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
      <input id={id} type="checkbox" className="peer sr-only" checked={Boolean(checked)} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden="true" className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-[#2563EB] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{etiqueta}</span>
        {descripcion ? <span className="block text-[13px] text-slate-600">{descripcion}</span> : null}
      </span>
    </label>
  );
}

/** Texto escrito por una persona: siempre como texto, con saltos de línea y palabras largas cortadas. */
export function TextoPlano({ children, className = "" }) {
  if (!children) return null;
  return <p className={`whitespace-pre-line break-words [overflow-wrap:anywhere] ${className}`}>{String(children)}</p>;
}
