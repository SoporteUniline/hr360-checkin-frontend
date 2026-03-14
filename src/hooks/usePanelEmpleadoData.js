import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

/**
 * Hook para obtener todos los datos completos de todos los empleados
 * para el Panel de Empleados
 * Relacionado con:
 * - Backend: modules/attendance/controllers/empleadoController.js (cargarTodosDatosCompletos)
 * - Frontend: src/app/panel/panel-empleado/page.jsx
 */
export default function usePanelEmpleadoData(
  idEmpresa,
  empresasUsuario = [],
  unidadNegocio = "",
) {
  let url = null;

  if (idEmpresa === "all") {
    /**
     * includeInactivos=1:
     * - Para que el Panel de Empleados muestre el mismo universo que el módulo "Empleados"
     *   (que por defecto no restringe a solo 'Activo' si el filtro de estado está vacío).
     *
     * Relación:
     * - Backend: `modules/attendance/controllers/empleadoController.js` (cargarTodosDatosCompletos)
     */
    const empresas = empresasUsuario.join(",");
    url = `/checador/empleados/panel-empleado/todos?empresas=${empresas}&includeInactivos=1${
      unidadNegocio ? `&sucursal=${encodeURIComponent(unidadNegocio)}` : ""
    }`;
  } else if (idEmpresa) {
    url = `/checador/empleados/panel-empleado/todos?empresa=${idEmpresa}&includeInactivos=1${
      unidadNegocio ? `&sucursal=${encodeURIComponent(unidadNegocio)}` : ""
    }`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}
