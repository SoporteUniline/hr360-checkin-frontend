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
  filtroEstadoAsistencia,
  soloPresentes,
  soloAusentes,
  horasExtra,
  sinGoceDeSueldo,
  diasFestivos,
  requiereAutorizacion,
  sortBy,
  sortOrder,
) {
  let url = null;

  if (idEmpresa) {
    const params = new URLSearchParams({
      empresa: String(idEmpresa),
      page: String(page),
      limit: String(limit),
    });

    if (fechaInicio) params.append("fechaInicio", fechaInicio);
    if (fechaFin) params.append("fechaFin", fechaFin);

    if (debouncedFiltroEmpleado) {
      params.append("filtroEmpleado", debouncedFiltroEmpleado);
    }

    if (Array.isArray(filtroDepartamento)) {
      if (filtroDepartamento.length > 0) {
        params.append("filtroDepartamento", JSON.stringify(filtroDepartamento));
      }
    } else if (filtroDepartamento) {
      params.append("filtroDepartamento", filtroDepartamento);
    }

    if (filtroTipoRegistro) {
      params.append("filtroTipoRegistro", filtroTipoRegistro);
    }

    if (filtroEstadoAsistencia) {
      params.append("filtroEstadoAsistencia", filtroEstadoAsistencia);
    }

    if (soloPresentes) params.append("soloPresentes", "1");
    if (soloAusentes) params.append("soloAusentes", "1");
    if (horasExtra) params.append("horasExtra", "1");
    if (sinGoceDeSueldo) params.append("sinGoceDeSueldo", "0");
    if (diasFestivos) params.append("diasFestivos", "1");
    if (requiereAutorizacion) params.append("requiereAutorizacion", "1");
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);

    url = `/checador/asistencias?${params.toString()}`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken, {
    keepPreviousData: false,
    revalidateOnFocus: false,
  });

  return { data, error, isLoading, mutate };
}
