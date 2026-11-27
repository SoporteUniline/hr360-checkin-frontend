"use client";
// Inducción digital: piezas compartidas de las pantallas de RH (campos, chips de avance, barra, avatar, avisos de error).
// Reglas de texto y formato en src/lib/induccion/induccion.mjs.
import axios from "@/lib/axios";
import { TONO_CHIP, chipsAvance, colorAvatar, iniciales } from "@/lib/induccion/induccion.mjs";

export const get = (url) => axios.get(url).then((r) => r.data);
export const opcionesSwr = { revalidateOnFocus: false, shouldRetryOnError: false };
export const errorDe = (e, porDefecto = "No se pudo completar la acción. Intenta de nuevo.") => e?.response?.data?.error || porDefecto;
export const camposDe = (e) => e?.response?.data?.campos ?? null;

export const boton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60";
export const botonPrimario = `${boton} bg-[#2563EB] text-white hover:bg-[#1d4ed8]`;
export const botonSecundario = `${boton} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
export const tarjeta = "rounded-[14px] border border-slate-200 bg-white";
export const entrada = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 sm:text-sm aria-[invalid=true]:border-red-500";

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
export const ariaCampo = (id, error) => ({ id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined });

export function Avatar({ persona, id }) {
  return <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold ${colorAvatar(id)}`}>{iniciales(persona)}</span>;
}

export function ChipsAvance({ avance, sinAbrir }) {
  const { chips, porcentaje } = chipsAvance(avance);
  if (sinAbrir) {
    return (
      <div className="grid gap-1.5">
        <span className="w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[13px] font-semibold text-slate-600">Invitación enviada · sin abrir</span>
        <Barra porcentaje={0} />
      </div>
    );
  }
  return (
    <div className="grid gap-1.5">
      <ul className="flex flex-wrap gap-1.5" aria-label="Avance">
        {chips.map((c) => <li key={c.clave} className={`rounded-full px-2 py-0.5 text-[13px] ${TONO_CHIP[c.tono]}`}>{c.texto}</li>)}
      </ul>
      <Barra porcentaje={porcentaje} />
    </div>
  );
}

export function Barra({ porcentaje, etiqueta = "Avance" }) {
  const p = Math.max(0, Math.min(100, Number(porcentaje) || 0));
  return (
    <span role="progressbar" aria-label={etiqueta} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} className="block h-1.5 rounded-full bg-slate-200">
      <span className={`block h-1.5 rounded-full ${p >= 100 ? "bg-green-600" : "bg-[#2563EB]"}`} style={{ width: `${p}%` }} />
    </span>
  );
}

/** Aviso de error de carga (incluye «falta la migración» y «módulo apagado», con el texto del servidor). */
export function AvisoError({ error, porDefecto }) {
  if (!error) return null;
  return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorDe(error, porDefecto)}</p>;
}
