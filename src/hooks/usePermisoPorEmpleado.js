import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";
import useSWR from "swr";
import useEmpleadoSesion from "./useEmpleadoSesion";

export const usePermisosEmpleado = (page = 1, limit = 10) => {
  const session = useEmpleadoSesion();
  const idEmpleadoResuelto = session.id;
  const shouldFetch = Boolean(idEmpleadoResuelto);

  const {
    data,
    error,
    isLoading: isLoadingPermisos,
    mutate,
  } = useSWR(
    shouldFetch
      ? `/checador/solicitudes-permiso/empleado/${idEmpleadoResuelto}?page=${page}&limit=${limit}`
      : null,
    fetcherWithToken,
    {
      // Refresca automáticamente para reflejar cambios de estado (ej. Aprobado/Rechazado)
      refreshInterval: 15000,
      revalidateOnFocus: true,
      keepPreviousData: false,
    },
  );

  const normalizedData = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data?.results?.data)
    ? data.results.data
    : [];

  return {
    data: normalizedData,
    total: Number(data?.total || normalizedData.length || 0),
    error: session.error || error,
    isLoading: session.isLoading || (isLoadingPermisos && shouldFetch),
    mutate,
  };
};

export const usePermisosPorAutorizar = (page = 1, limit = 10) => {
  const { dataUser } = useAuth();
  const shouldFetch = Boolean(dataUser?.esEmpleado);

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch
      ? `/checador/solicitudes-permiso/por-autorizar?page=${page}&limit=${limit}`
      : null,
    fetcherWithToken,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
      keepPreviousData: false,
    },
  );

  const normalizedData = Array.isArray(data?.results) ? data.results : [];

  return {
    data: normalizedData,
    total: Number(data?.total || normalizedData.length || 0),
    error,
    isLoading,
    mutate,
  };
};
