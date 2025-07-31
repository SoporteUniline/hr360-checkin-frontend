// src/hooks/useAsistenciaData.js
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useAsistenciaData(idEmpresa, fecha, page, limit) {
  const url = idEmpresa
    ? `/checador/reloj/asistencia?empresa=${idEmpresa}&${
        fecha ? `fecha=${fecha}&` : ""
      }page=${page}&limit=${limit}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}
