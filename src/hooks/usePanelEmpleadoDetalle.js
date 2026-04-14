import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

/**
 * Hook para obtener todos los datos de UN empleado, cargados bajo demanda.
 * Se activa solo cuando el usuario selecciona un empleado en el sidebar.
 *
 * Relacionado con:
 * - Backend: empleadoController.js → cargarDetalleEmpleado
 * - Frontend: src/app/panel/panel-empleado/page.jsx
 */
export default function usePanelEmpleadoDetalle(idEmpleado) {
  const url = idEmpleado
    ? `/checador/empleados/panel-empleado/${idEmpleado}/detalle`
    : null;

  const { data, error, isLoading } = useSWR(url, fetcherWithToken, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });

  return { datosEmpleado: data || null, error, isLoading };
}
