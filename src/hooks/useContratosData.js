import useSWR from "swr";
import { contratosApi } from "@/lib/contratosApi";

/**
 * Hook de datos para Contratos.
 * - Relación: consumido por `src/app/panel/contratos/page.jsx`
 * - Devuelve: { data, isLoading, error, mutate }
 */
export default function useContratosData(filters) {
  const { idEmpresa, page, limit, search, tipoContrato, estatus, desde, hasta } = filters || {};

  const key = idEmpresa
    ? [
        "contratos",
        idEmpresa,
        page,
        limit,
        search || "",
        tipoContrato || "",
        estatus || "",
        desde || "",
        hasta || "",
      ]
    : null;

  const fetcher = async () => {
    const resp = await contratosApi.listar({
      empresa: idEmpresa,
      page,
      limit,
      search,
      tipo: tipoContrato,
      estatus,
      desde,
      hasta,
    });
    // Normalizar respuesta a { data, total, estadisticas }
    return {
      data: Array.isArray(resp?.data) ? resp.data : resp?.contratos || [],
      total: resp?.total ?? (Array.isArray(resp?.data) ? resp.data.length : 0),
      estadisticas: resp?.estadisticas || {
        total: resp?.total ?? 0,
        activos: resp?.activos ?? 0,
        porVencer: resp?.porVencer ?? 0,
        vencidos: resp?.vencidos ?? 0,
      },
    };
  };

  const { data, isLoading, error, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });

  return { data, isLoading, error, mutate };
}


