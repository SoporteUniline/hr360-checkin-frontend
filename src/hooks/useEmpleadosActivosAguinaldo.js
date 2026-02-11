import useSWR from "swr";
import { aguinaldosApi } from "@/lib/aguinaldosApi";

/**
 * Hook para empleados activos con salario_diario calculado (para aguinaldos)
 * - Relación: usado en `src/app/panel/aguinaldos/page.jsx`
 */
export default function useEmpleadosActivosAguinaldo({
  empresa,
  q,
  limit = 10,
}) {
  const key = ["empleados-aguinaldo", empresa ?? "all", q || "", limit];

  const fetcher = async () => {
    const resp = await aguinaldosApi.empleadosActivos({
      empresa: empresa ?? "all",
      q,
      limit,
    });
    return resp?.data || [];
  };

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });

  return { data, error, isLoading, mutate };
}
