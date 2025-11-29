import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useTiposActa(idEmpresa, page, limit, nombreTipo) {
  let url = null;

  if (idEmpresa) {
    url =
      `/checador/tipos-actas?id_empresa=${idEmpresa}` +
      (nombreTipo ? `&nombre=${encodeURIComponent(nombreTipo)}` : "") +
      `&page=${page}&limit=${limit}`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return {
    data: data?.tipos_actas || [],
    total: data?.total || 0,
    error,
    isLoading,
    mutate,
  };
}
