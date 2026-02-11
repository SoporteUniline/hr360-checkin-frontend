import { fetcherWithToken } from "@/lib/fetcher";
import useSWR from "swr";

export const useAdministrativeMinutes = (
  empresa = "all",
  page = 1,
  limit = 10,
  filters = {}
) => {
  const params = new URLSearchParams({
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 10,
    empleado: filters.empleado || "",
    folio: filters.folio || "",
    estatus: filters.estatus || "",
  });

  if (empresa !== "all") {
    params.append("id_empresa", empresa);
  }

  const { data, error, isLoading, mutate } = useSWR(
    `/checador/administrativeMinutes?${params.toString()}`,
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
