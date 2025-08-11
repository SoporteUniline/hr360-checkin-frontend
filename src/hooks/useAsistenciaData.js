// src/hooks/useAsistenciaData.js
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useAsistenciaData(
  idEmpresa,
  fechaInicio,
  fechaFin,
  page,
  limit,
  debouncedFiltroEmpleado,
  filtroDepartamento,
  filtroTipoRegistro,
  filtroEstadoAsistencia
) {
  let url = null;
  if (idEmpresa) {
    const params = new URLSearchParams({
      empresa: idEmpresa,
      fechaInicio,
      fechaFin,
      page: page.toString(),
      limit: limit.toString(),
    });

    if (debouncedFiltroEmpleado)
      params.append("filtroEmpleado", debouncedFiltroEmpleado);
    if (filtroDepartamento)
      params.append("filtroDepartamento", filtroDepartamento);
    if (filtroTipoRegistro)
      params.append("filtroTipoRegistro", filtroTipoRegistro);
    if (filtroEstadoAsistencia)
      params.append("filtroEstadoAsistencia", filtroEstadoAsistencia);

    url = `/checador/asistencias?${params.toString()}`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}
