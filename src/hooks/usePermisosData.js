import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

/**
 * Hook de datos para solicitudes de permiso.
 * - Se conecta al backend en `/checador/solicitudes-permiso`
 * - Acepta filtros, paginación y búsqueda
 * - Retorna { data, total, estadisticas }
 *
 * Relación: Consumido por `app/panel/permisos/page.jsx` para renderizar filtros, cards y tabla.
 */
export default function usePermisosData({
  idEmpresa,
  page,
  limit,
  empleado,
  idEmpleado,
  idTipoPermiso,
  estado,
  desde,
  hasta,
  search,
}) {
  let url = null;
  if (idEmpresa) {
    const params = new URLSearchParams();
    params.set("empresa", idEmpresa);
    params.set("page", page);
    params.set("limit", limit);
    if (empleado) params.set("empleado", empleado);
    if (idEmpleado) params.set("id_empleado", idEmpleado);
    if (idTipoPermiso) params.set("id_tipo_permiso", idTipoPermiso);
    if (estado) params.set("estado", estado);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    if (search) params.set("search", search);
    url = `/checador/solicitudes-permiso?${params.toString()}`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);
  return { data, error, isLoading, mutate };
}


