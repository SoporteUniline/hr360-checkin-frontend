import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useDepartamentosData(idEmpresa) {
  const { data, error, isLoading, mutate } = useSWR(
    idEmpresa ? `/checador/departamentos?id_empresa=${idEmpresa}` : null,
    fetcherWithToken,
  );

  return {
    departamentos: data?.departamentos || [],
    isLoading,
    isError: error,
    mutate,
  };
}
