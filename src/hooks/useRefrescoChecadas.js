"use client";

// Recarga los datos cuando llega una checada: por SSE del reloj de la empresa y cuando la cola sin conexión
// sube checadas ('adamia-queue'). Lo comparten Asistencias y el Monitor para no abrir dos conexiones distintas.
import { useEffect, useRef } from "react";
import { useSnackbar } from "notistack";

const INTERVALO_AVISO_MS = 8000; // máx. un aviso cada 8 s para no saturar en horas pico de entrada

export default function useRefrescoChecadas(idEmpresa, mutate, { avisar = true } = {}) {
  // Ref: el EventSource no se recrea cuando cambia mutate.
  const mutateRef = useRef(mutate);
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  useEffect(() => {
    // Preparar el reloj ('perfil') no cambia datos y provocaría una segunda descarga completa del periodo.
    const refresh = (event) => {
      if (event?.detail?.motivo === "perfil") return;
      if (navigator.onLine && window.__adamiaOffline !== true) void mutateRef.current?.()?.catch?.(() => {});
    };
    window.addEventListener("adamia-queue", refresh);
    return () => window.removeEventListener("adamia-queue", refresh);
  }, []);

  const { enqueueSnackbar } = useSnackbar();
  const ultimoAviso = useRef(0);
  useEffect(() => {
    if (!idEmpresa) return undefined;
    const es = new EventSource(`${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/reloj/eventos-checada?id_empresa=${idEmpresa}`);
    es.addEventListener("checada", () => {
      mutateRef.current?.();
      const ahora = Date.now();
      if (avisar && ahora - ultimoAviso.current > INTERVALO_AVISO_MS) {
        ultimoAviso.current = ahora;
        enqueueSnackbar("Nueva checada recibida — registros actualizados", { variant: "success", autoHideDuration: 3500 });
      }
    });
    es.onerror = () => {};
    return () => es.close();
  }, [idEmpresa, avisar, enqueueSnackbar]);
}
