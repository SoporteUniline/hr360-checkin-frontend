import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useClockCheckData(
  idEmpresa,
  fecha,
  empleado,
  filtroNombre,
  page,
  limit,
  departamento,
  estado
) {
  let url = null;

  if (idEmpresa) {
    if (idEmpresa) {
      if (empleado) {
        url = `/checador/reloj/asistencia-por-empleado?empresa=${idEmpresa}&fecha=${fecha}&empleado=${empleado}&page=${page}&limit=${limit}`;
      } else {
        url = `/checador/reloj/asistencia?empresa=${idEmpresa}${
          fecha ? `&fecha=${fecha}` : ""
        }${filtroNombre ? `&nombre=${encodeURIComponent(filtroNombre)}` : ""}${
          departamento ? `&departamento=${departamento}` : ""
        }${estado ? `&estado=${estado}` : ""}&page=${page}&limit=${limit}`;
      }
    }
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}
