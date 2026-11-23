"use client";

// Reclutamiento real (03/12/2026): los datos de la empresa (vacantes, candidatos, catálogos, WhatsApp y agenda) en
// una sola consulta SWR que comparten todas las pantallas del módulo. keepPreviousData evita parpadeos al revalidar.
import { useCallback, useMemo } from "react";
import useSWR, { mutate as mutarClave } from "swr";
import * as api from "@/lib/reclutamiento/api";
import { obtener, rutaPostulacion, rutaResumen } from "@/lib/reclutamiento/api";
import { aCuerpoEtapa, aDatos, aDetalle, erroresDeCampos, mensajeError } from "@/lib/reclutamiento/adaptador.mjs";

const OPCIONES = { revalidateOnFocus: true, keepPreviousData: true, dedupingInterval: 4000, shouldRetryOnError: false };

export default function useReclutamiento(empresa) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(rutaResumen(empresa), obtener, OPCIONES);
  const datos = useMemo(() => (data ? aDatos(data) : null), [data]);
  return { data: datos, error, isLoading, isValidating, reload: mutate };
}

// Expediente de una postulación (respuestas, notas, historial y, si llegó por WhatsApp, su entrevista y conversación).
export function usePostulacion(id, base) {
  const { data, error, isLoading, mutate } = useSWR(rutaPostulacion(id), obtener, OPCIONES);
  const detalle = useMemo(() => (data?.postulacion ? aDetalle(data.postulacion, base) : null), [data, base]);
  return { detail: detalle, error, isLoading, mutate };
}

// Acciones sobre una postulación fuera de la pantalla de Reclutamiento (chat de WhatsApp, 04/12/2026). Mismas rutas y
// reglas del servidor que RecruitmentModule; el expediente se actualiza con lo que responde el servidor.
// alCambiar(): después de cada escritura (p. ej. refrescar la conversación y la lista). Devuelven { ok, message, ... }.
export function useAccionesPostulacion(id, { alCambiar } = {}) {
  const guardar = useCallback((postulacion) => {
    if (postulacion?.id) mutarClave(rutaPostulacion(postulacion.id), { postulacion }, { revalidate: false });
  }, []);
  const hecho = useCallback(async (trabajo, porDefecto) => {
    try {
      const r = await trabajo();
      await alCambiar?.();
      return { ok: true, ...r };
    } catch (e) {
      return { ok: false, errors: erroresDeCampos(e), message: mensajeError(e, porDefecto), status: e?.response?.status, codigo: e?.response?.data?.codigo };
    }
  }, [alCambiar]);
  const changeStage = useCallback((candidateId, stage, opciones) => hecho(async () => {
    guardar(await api.cambiarEtapa(candidateId ?? id, aCuerpoEtapa(stage, opciones)));
    return {};
  }, "No se pudo cambiar la etapa."), [hecho, guardar, id]);
  const addNote = useCallback((candidateId, texto) => hecho(async () => {
    guardar(await api.agregarNota(candidateId ?? id, texto));
    return {};
  }, "No se guardó la nota."), [hecho, guardar, id]);
  const savePreparation = useCallback((candidateId, patch) => hecho(async () => {
    guardar(await api.guardarPreparacion(candidateId ?? id, patch));
    return {};
  }, "No se guardó la preparación del ingreso."), [hecho, guardar, id]);
  const hire = useCallback((candidateId, cuerpo) => hecho(async () => {
    const result = await api.contratar(candidateId ?? id, cuerpo);
    guardar(result.postulacion);
    return { result };
  }, "No se pudo completar la contratación."), [hecho, guardar, id]);
  return { changeStage, addNote, savePreparation, hire };
}
