import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";
import useSWR from "swr";

export const usePermisosEmpleado = (page = 1, limit = 10) => {
  const { dataUser } = useAuth();

  const shouldFetch = Boolean(dataUser?.id_empleado);

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch
      ? `/checador/solicitudes-permiso/empleado/${dataUser.id_empleado}?page=${page}&limit=${limit}`
      : null,
    fetcherWithToken
  );

  return {
    data: data?.results || [],
    total: data?.total || 0,
    error,
    isLoading,
    mutate,
  };
};
