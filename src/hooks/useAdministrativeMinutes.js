import { fetcherWithToken } from "@/lib/fetcher";
import useSWR from "swr";

export const useAdministrativeMinutes = (
  id_empresa,
  page = 1,
  limit = 10,
  filters = {}
) => {
  const shouldFetch = Boolean(id_empresa);

  const query = new URLSearchParams({
    id_empresa,
    page,
    limit,
    empleado: filters.empleado || "",
    folio: filters.folio || "",
    estatus: filters.estatus || "",
  }).toString();

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `/checador/administrativeMinutes?${query}` : null,
    fetcherWithToken
  );

  return {
    data: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    stats: data?.stats || {
      totalActas: 0,
      elaboradas: 0,
      cerradas: 0,
      graves: 0,
    },
    error,
    isLoading,
    mutate,
  };
};
