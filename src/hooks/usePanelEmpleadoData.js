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
    /**
     * includeInactivos=1:
     * - Para que el Panel de Empleados muestre el mismo universo que el módulo "Empleados"
     *   (que por defecto no restringe a solo 'Activo' si el filtro de estado está vacío).
     *
     * Relación:
     * - Backend: `modules/attendance/controllers/empleadoController.js` (cargarTodosDatosCompletos)
     */
    url = `/checador/empleados/panel-empleado/todos?empresa=${idEmpresa}&includeInactivos=1`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}

