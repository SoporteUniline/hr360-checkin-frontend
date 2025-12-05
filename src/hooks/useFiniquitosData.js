import useSWR from "swr";
import { finiquitosApi } from "@/lib/finiquitosApi";

/**
 * Hook de datos para Finiquitos.
 * - Relación: consumido por `src/app/panel/finiquitos-y-liquidaciones/page.jsx`
 * - Devuelve: { data, isLoading, error, mutate }
 */
export default function useFiniquitosData(filters) {
  const { idEmpresa, page, limit, search, estatus, tipo } = filters || {};

  const key = idEmpresa
    ? ["finiquitos", idEmpresa, page, limit, search || "", estatus || "", tipo || ""]
    : null;

  const fetcher = async () => {
    const resp = await finiquitosApi.listar({
      empresa: idEmpresa,
      page,
      limit,
      search,
      estatus,
      tipo,
    });
    return {
      data: Array.isArray(resp?.data) ? resp.data : [],
      total: resp?.total ?? 0,
    };
  };

  const { data, isLoading, error, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });

  return { data, isLoading, error, mutate };
}


