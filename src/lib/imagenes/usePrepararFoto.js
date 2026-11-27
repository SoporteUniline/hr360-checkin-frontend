"use client";
// (27/11/2026) Estado de React de la conversión de fotos (./aWeb.mjs): «preparando» mientras se convierte (para mostrar
// «Preparando foto…» y desactivar el botón de guardar) y el error con mensaje para la persona.
import { useCallback, useState } from "react";
import { ErrorFoto, MENSAJES, prepararFoto, prepararFotos } from "./aWeb.mjs";

export const TEXTO_PREPARANDO = "Preparando foto…";

export function usePrepararFoto(uso) {
  const [pendientes, setPendientes] = useState(0);
  const correr = useCallback(async (fn) => {
    setPendientes((n) => n + 1);
    try { return await fn(); } finally { setPendientes((n) => Math.max(0, n - 1)); }
  }, []);
  /** Una foto → { archivo, antes, despues, ... } o { error: texto }. */
  const preparar = useCallback((archivo, usoOtro = uso) => correr(async () => {
    try { return await prepararFoto(archivo, usoOtro); }
    catch (e) {
      if (!(e instanceof ErrorFoto)) console.error("[fotos] no se pudo preparar la foto", e);
      return { error: e instanceof ErrorFoto ? e.message : MENSAJES.noSeAbre };
    }
  }), [correr, uso]);
  /** Varias → { listas, errores } (cada error ya dice de qué foto es). */
  const prepararVarias = useCallback((archivos, usoOtro = uso) => correr(() => prepararFotos(archivos, usoOtro)), [correr, uso]);
  return { preparando: pendientes > 0, preparar, prepararVarias };
}
