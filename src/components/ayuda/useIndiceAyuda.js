"use client";
// Centro de ayuda · /ayuda/indice.json (estático, generado en el build) con SWR. Lo usan el buscador público, «Ayuda»
// dentro del sistema y el botón «?». No pasa por el backend: es un archivo del mismo sitio.
import useSWR from "swr";
import { rutaDeInstancia } from "@/lib/demo-base-path.mjs";

export const URL_INDICE = "/ayuda/indice.json";
export const urlContenido = (slug) => `/ayuda/${slug}/contenido.json`;

export async function leerJson(ruta) {
  const r = await fetch(rutaDeInstancia(ruta), { credentials: "omit", headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`No se pudo cargar la ayuda (${r.status}).`);
  return r.json();
}
const opciones = { revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 600000, shouldRetryOnError: false, keepPreviousData: true };

/** activo: false = no pedir todavía (p. ej. hasta que la persona use el buscador). */
export function useIndiceAyuda(activo = true) {
  const { data, error, isLoading, mutate } = useSWR(activo ? URL_INDICE : null, leerJson, opciones);
  return { indice: data ?? null, error, cargando: isLoading, reintentar: mutate };
}

export function useContenidoGuia(slug) {
  const { data, error, isLoading, mutate } = useSWR(slug ? urlContenido(slug) : null, leerJson, opciones);
  return { guia: data ?? null, error, cargando: isLoading, reintentar: mutate };
}
