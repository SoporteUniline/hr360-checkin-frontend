"use client";

// «Monitor de mi equipo»: GET /checador/mi-equipo/hoy (solo su equipo, solo lectura). El servidor decide quién es jefe
// con la sesión; `esJefe` también decide si se ve el menú. Solo se consulta con sesión de empleado.
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";

export const RUTA_MONITOR_EQUIPO = "/empleado/panel/monitor-equipo";

export default function useMonitorEquipo({ refrescar = false } = {}) {
  const { dataUser } = useAuth();
  const esEmpleado = dataUser?.tipo_usuario === "Empleado";
  const { data, error, isLoading, mutate } = useSWR(esEmpleado ? "/checador/mi-equipo/hoy" : null, fetcherWithToken, {
    revalidateOnFocus: refrescar,
    refreshInterval: refrescar ? 60000 : 0,
    shouldRetryOnError: false,
  });
  return { data, error, isLoading, mutate, esJefe: Boolean(data?.es_jefe) };
}
