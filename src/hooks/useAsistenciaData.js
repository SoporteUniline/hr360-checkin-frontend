// src/hooks/useAsistenciaData.js
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useAsistenciaData(
  idEmpresa,
  fechaInicio,
  fechaFin,
  page,
  limit
) {
  const url = idEmpresa
    ? `/checador/asistencias?empresa=${idEmpresa}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&page=${page}&limit=${limit}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  // console.log(data);

  return { data, error, isLoading, mutate };
}
