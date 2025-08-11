// src/hooks/useRelojChecadorData.js
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useClockCheckData(
  idEmpresa,
  fecha,
  empleado,
  page,
  limit
) {
  let url = null;

  if (idEmpresa) {
    if (empleado) {
      // Cuando hay empleado, usar el endpoint filtrado por empleado
      url = `/checador/reloj/asistencia-por-empleado?empresa=${idEmpresa}&fecha=${fecha}&empleado=${empleado}&page=${page}&limit=${limit}`;
    } else {
      // Cuando no hay empleado, usar el endpoint general
      url = `/checador/reloj/asistencia?empresa=${idEmpresa}${
        fecha ? `&fecha=${fecha}` : ""
      }&page=${page}&limit=${limit}`;
    }
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}
