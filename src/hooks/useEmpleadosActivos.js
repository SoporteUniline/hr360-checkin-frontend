import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";

export default function useEmpleadosActivosData(
  idEmpresa,
  page = 1,
  limit = 10,
  filtroNombre = "",
  departamento = "",
  estado = "",
  fechaDesde = ""
) {
  const { dataUser } = useAuth();

  let empresa = null;

  if (idEmpresa) {
    empresa = idEmpresa;
  } else if (dataUser?.empresas?.length) {
    empresa = "all";
  }

  let url = null;

  if (empresa) {
    url =
      `/checador/empleados/activos?empresa=${empresa}` +
      (filtroNombre ? `&nombre=${encodeURIComponent(filtroNombre)}` : "") +
      (departamento ? `&departamento=${departamento}` : "") +
      (estado ? `&estado=${estado}` : "") +
      (fechaDesde ? `&fechaDesde=${fechaDesde}` : "") +
      `&page=${page}&limit=${limit}`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}
