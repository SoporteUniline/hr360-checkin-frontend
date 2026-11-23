"use client";

// Reclutamiento real (03/12/2026): los datos de la empresa (vacantes, candidatos, catálogos, WhatsApp y agenda) en
// una sola consulta SWR que comparten todas las pantallas del módulo. keepPreviousData evita parpadeos al revalidar.
import { useMemo } from "react";
import useSWR from "swr";
import { obtener, rutaPostulacion, rutaResumen } from "@/lib/reclutamiento/api";
import { aDatos, aDetalle } from "@/lib/reclutamiento/adaptador.mjs";

const OPCIONES = { revalidateOnFocus: true, keepPreviousData: true, dedupingInterval: 4000, shouldRetryOnError: false };

export default function useReclutamiento(empresa) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(rutaResumen(empresa), obtener, OPCIONES);
  const datos = useMemo(() => (data ? aDatos(data) : null), [data]);
  return { data: datos, error, isLoading, isValidating, reload: mutate };
}

// Expediente de una postulación (respuestas, notas e historial). Las de WhatsApp no tienen expediente aquí.
export function usePostulacion(id, base) {
  const { data, error, isLoading, mutate } = useSWR(rutaPostulacion(id), obtener, OPCIONES);
  const detalle = useMemo(() => (data?.postulacion ? aDetalle(data.postulacion, base) : null), [data, base]);
  return { detail: detalle, error, isLoading, mutate };
}
