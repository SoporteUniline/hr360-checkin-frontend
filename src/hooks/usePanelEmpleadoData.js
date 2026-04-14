import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

/**
 * Hook para obtener la lista ligera de empleados para el sidebar del Panel de Empleados.
 * Solo trae id, nombre, puesto, departamento, unidad_negocio, empresa, estado.
 * El detalle de cada empleado se carga bajo demanda con usePanelEmpleadoDetalle.
 *
 * Relacionado con:
 * - Backend: empleadoController.js → cargarListaEmpleados
 * - Frontend: src/app/panel/panel-empleado/page.jsx
 */
export default function usePanelEmpleadoData(
  idEmpresa,
  empresasUsuario = [],
  unidadNegocio = "",
) {
  let url = null;

  if (idEmpresa === "all") {
    const empresas = empresasUsuario.join(",");
    if (empresas) {
      url = `/checador/empleados/panel-empleado/lista?empresas=${empresas}&includeInactivos=1${
        unidadNegocio ? `&sucursal=${encodeURIComponent(unidadNegocio)}` : ""
      }`;
    }
  } else if (idEmpresa) {
    url = `/checador/empleados/panel-empleado/lista?empresa=${idEmpresa}&includeInactivos=1${
      unidadNegocio ? `&sucursal=${encodeURIComponent(unidadNegocio)}` : ""
    }`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken, {
    shouldRetryOnError: false,
  });

  return { data, error, isLoading, mutate };
}
