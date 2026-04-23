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
) {
  let url = null;

  if (idEmpresa) {
    const params = new URLSearchParams({
      empresa: String(idEmpresa),
      fechaInicio,
      fechaFin,
      page: String(page),
      limit: String(limit),
    });

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

    url = `/checador/asistencias?${params.toString()}`;
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}
