import useSWR from "swr";
import { finiquitosApi } from "@/lib/finiquitosApi";

/**
 * Hook para empleados activos con salario_diario calculado (para finiquitos)
 * - Relación: usado en `src/app/panel/finiquitos-y-liquidaciones/page.jsx`
 */
export default function useEmpleadosActivosFiniquito({ empresa, q, limit = 8 }) {
  const key = empresa ? ["empleados-finiquito", empresa, q || "", limit] : null;
  const fetcher = async () => {
    const resp = await finiquitosApi.empleadosActivos({ empresa, q, limit });
    return resp?.data || [];
  };
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });
  return { data, error, isLoading, mutate };
}


