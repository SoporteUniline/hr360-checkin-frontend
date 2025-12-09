import useSWR from "swr";
import { aguinaldosApi } from "@/lib/aguinaldosApi";

/**
 * Hook de datos para Aguinaldos
 * - Relación: consumido por `src/app/panel/aguinaldos/page.jsx`
 * - Devuelve: { data, isLoading, error, mutate }
 */
export default function useAguinaldosData(filters) {
  const { idEmpresa, page, limit, search, estatus, año_fiscal } = filters || {};

  const key = idEmpresa
    ? ["aguinaldos", idEmpresa, page, limit, search || "", estatus || "", año_fiscal || ""]
    : null;

  const fetcher = async () => {
    const resp = await aguinaldosApi.listar({
      empresa: idEmpresa,
      page,
      limit,
      search,
      estatus,
      año_fiscal,
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

