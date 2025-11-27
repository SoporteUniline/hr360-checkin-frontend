import { fetcherWithToken } from "@/lib/fetcher";
import useSWR from "swr";

export const useAdministrativeMinutes = (id_empresa, page = 1, limit = 10) => {
  const shouldFetch = Boolean(id_empresa);

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch
      ? `/checador/administrativeMinutes?id_empresa=${id_empresa}&page=${page}&limit=${limit}`
      : null,
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
