import useSWR from "swr";
import { aguinaldosApi } from "@/lib/aguinaldosApi";

/**
 * Hook para empleados activos con salario_diario calculado (para aguinaldos)
 * - Relación: usado en `src/app/panel/aguinaldos/page.jsx`
 */
export default function useEmpleadosActivosAguinaldo({ empresa, q, limit = 8 }) {
  const key = empresa ? ["empleados-aguinaldo", empresa, q || "", limit] : null;
  const fetcher = async () => {
    const resp = await aguinaldosApi.empleadosActivos({ empresa, q, limit });
    return resp?.data || [];
  };
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });
  return { data, error, isLoading, mutate };
}

