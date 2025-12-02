import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useEmpleadosActivosData(
  idEmpresa,
  page,
  limit,
  filtroNombre,
  departamento,
  estado,
  fechaDesde
) {
  let url = null;

  if (idEmpresa) {
    url =
      `/checador/empleados/activos?empresa=${idEmpresa}` +
      (filtroNombre ? `&nombre=${encodeURIComponent(filtroNombre)}` : "") +
      (departamento ? `&departamento=${departamento}` : "") +
      (estado ? `&estado=${estado}` : "") +
      (fechaDesde ? `&fechaDesde=${fechaDesde}` : "") +
      `&page=${page}&limit=${limit}`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}
