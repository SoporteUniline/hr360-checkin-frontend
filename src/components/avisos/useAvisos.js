"use client";

// Avisos de la campana: GET /checador/avisos/proximos. El servidor decide el alcance con la sesión (RH/dueño: su
// empresa, validada; jefe: su equipo). Sin sondeo agresivo: al abrir la campana se pide de nuevo y, como mucho, cada
// 10 minutos; no se vuelve a pedir al regresar a la pestaña.
import useSWR from "swr";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { API, REFRESCO_MS } from "@/lib/avisos/avisos.mjs";

export const ROLES_RH = ["Recruiter", "User"];
const get = (url) => axios.get(url).then((r) => r.data);

export function useSesionAvisos() {
  const { dataUser } = useAuth();
  const tipo = dataUser?.tipo_usuario;
  return { dataUser, esRH: ROLES_RH.includes(tipo), esEmpleado: tipo === "Empleado" };
}

export function useAvisos({ activo, idEmpresa }) {
  const llave = activo ? `${API}/proximos${idEmpresa ? `?empresa=${idEmpresa}` : ""}` : null;
  return useSWR(llave, get, {
    refreshInterval: REFRESCO_MS,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000,
    shouldRetryOnError: false,
    keepPreviousData: true,
  });
}
