"use client";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useEmpleadoSesion() {
  const { dataUser, isAuthChecked } = useAuth();
  const empresa = dataUser?.id_empresa || dataUser?.empresas_detalle?.[0]?.id_empresa || dataUser?.empresas?.[0];
  const correo = dataUser?.correo || dataUser?.email;
  const directo = Number(dataUser?.id_empleado) || null;
  const key = dataUser?.tipo_usuario === "Empleado" && !directo && empresa && correo
    ? `/checador/empleados/por-correo?empresa=${empresa}&correo=${encodeURIComponent(correo)}` : null;
  const { data, error, isLoading } = useSWR(key, fetcherWithToken, { shouldRetryOnError: false });
  const id = directo || Number(data?.id_empleado) || null;
  return { id, empresa, dataUser, isLoading: !isAuthChecked || isLoading,
    error: error || (isAuthChecked && dataUser && !id && !isLoading ? new Error("No se encontró el empleado asociado a tu cuenta.") : null) };
}
