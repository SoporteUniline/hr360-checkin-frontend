import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useClockCheckData(
  idEmpresa,
  fecha,
  empleado,
  filtroNombre,
  page,
  limit,
  departamento,
  estado,
  desde,
  hasta,
  sortBy,
  sortOrder,
) {
  let url = null;

  if (idEmpresa) {
    if (empleado) {
      const params = new URLSearchParams({
        empresa: String(idEmpresa),
        fecha: String(fecha),
        empleado: String(empleado),
        page: String(page),
        limit: String(limit),
      });

      url = `/checador/reloj/asistencia-por-empleado?${params.toString()}`;
    } else {
      const params = new URLSearchParams({
        empresa: String(idEmpresa),
        page: String(page),
        limit: String(limit),
      });

      const hasRange = Boolean(desde || hasta);

      if (!hasRange && fecha) params.append("fecha", fecha);
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);
      if (filtroNombre) params.append("nombre", filtroNombre);
      if (departamento) params.append("departamento", departamento);
      if (estado) params.append("estado", estado);

      if (sortBy) params.append("sortBy", sortBy);
      if (sortOrder) params.append("sortOrder", sortOrder);

      url = `/checador/reloj/asistencia?${params.toString()}`;
    }
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}
