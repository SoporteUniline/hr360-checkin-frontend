import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";
import useSWR from "swr";

export const usePermisosEmpleado = (page = 1, limit = 10) => {
  const { dataUser } = useAuth();
  const correoSesion = String(dataUser?.correo || dataUser?.email || "").trim();
  const empresaSesion =
    dataUser?.id_empresa ||
    dataUser?.empresas_detalle?.[0]?.id_empresa ||
    dataUser?.empresas?.[0] ||
    null;

  const idEmpleadoSesion = Number(dataUser?.id_empleado || 0);

  // Fallback: cuando el token no trae id_empleado, resolverlo por correo + empresa.
  const { data: empleadoPorCorreo } = useSWR(
    !idEmpleadoSesion && correoSesion && empresaSesion
      ? `/checador/empleados/por-correo?empresa=${empresaSesion}&correo=${encodeURIComponent(correoSesion)}`
      : null,
    fetcherWithToken,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const idEmpleadoResuelto = idEmpleadoSesion || Number(empleadoPorCorreo?.id_empleado || 0);
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
      keepPreviousData: true,
    }
  );

  const normalizedData = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data?.results?.data)
      ? data.results.data
      : [];

  return {
    data: normalizedData,
    total: Number(data?.total || normalizedData.length || 0),
    error,
    isLoading: isLoadingPermisos && shouldFetch,
    mutate,
  };
};
