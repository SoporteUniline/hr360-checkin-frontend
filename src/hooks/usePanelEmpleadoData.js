import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

/**
 * Hook para obtener todos los datos completos de todos los empleados
 * para el Panel de Empleados
 * Relacionado con: 
 * - Backend: modules/attendance/controllers/empleadoController.js (cargarTodosDatosCompletos)
 * - Frontend: src/app/panel/panel-empleado/page.jsx
 */
export default function usePanelEmpleadoData(idEmpresa) {
  let url = null;

  if (idEmpresa) {
    url = `/checador/empleados/panel-empleado/todos?empresa=${idEmpresa}`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}

