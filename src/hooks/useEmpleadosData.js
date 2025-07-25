// src/hooks/useEmpleadosData.js
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useEmpleadosData(idEmpresa) {
  const url = idEmpresa ? `/checador/empleados?empresa=${idEmpresa}` : null;
  const { data, error, isLoading } = useSWR(url, fetcherWithToken);
  return { data, error, isLoading };
}
