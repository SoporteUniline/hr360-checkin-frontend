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
  // =========================
  // NUEVO: filtro por rango de fechas (desde/hasta)
  // Se usa en el panel "Registro de entradas y salidas".
  // Importante: se mantiene `fecha` para compatibilidad con pantallas que filtran por un solo día.
  // =========================
  desde,
  hasta,
) {
  let url = null;

  if (idEmpresa) {
    if (empleado) {
      url = `/checador/reloj/asistencia-por-empleado?empresa=${idEmpresa}&fecha=${fecha}&empleado=${empleado}&page=${page}&limit=${limit}`;
    } else {
      const hasRange = Boolean(desde || hasta);
      url = `/checador/reloj/asistencia?empresa=${idEmpresa}${
        !hasRange && fecha ? `&fecha=${fecha}` : ""
      }${desde ? `&desde=${desde}` : ""}${hasta ? `&hasta=${hasta}` : ""}${
        filtroNombre ? `&nombre=${encodeURIComponent(filtroNombre)}` : ""
      }${departamento ? `&departamento=${departamento}` : ""}${
        estado ? `&estado=${estado}` : ""
      }&page=${page}&limit=${limit}`;
    }
  }

  const { data, error, isLoading, mutate } = useSWR(url, fetcherWithToken);

  return { data, error, isLoading, mutate };
}
